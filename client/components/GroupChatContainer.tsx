import React, { useRef, useEffect, useCallback } from 'react';
import * as reactNative from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGroupStore } from '../store/useGroupStore';
import { useAuthStore } from '../store/useAuthStore';
import { useGroupMessages } from '../hooks/useGroup';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import Message from './Message';
import { useSendGroupMessage } from '../hooks/useGroup';
import { useOfflineSyncGroup } from '../hooks/useGroup';

export default function GroupChatContainer() {
  const { selectedGroup } = useGroupStore();
  const { authUser } = useAuthStore();
  const colorScheme = reactNative.useColorScheme();
  const isDark = colorScheme === 'dark';

    const sendGroupMessageMutation = useSendGroupMessage(selectedGroup?._id || '');
  useOfflineSyncGroup();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGroupMessages(selectedGroup?._id || null);

  const flatListRef = useRef<reactNative.FlatList>(null);

  const messages = (data?.pages ?? [])
    .slice()
    .reverse()
    .flatMap((page) => page.messages)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  useEffect(() => {
    if (messages.length && flatListRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // mark seen
  useEffect(() => {
    if (!selectedGroup || !authUser) return;
    const subscription = reactNative.AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        const socket = useAuthStore.getState().socket;
        socket?.emit('mark_group_as_seen', { groupId: selectedGroup._id, userId: authUser._id });
      }
    });
    return () => subscription?.remove();
  }, [selectedGroup, authUser]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const keyExtractor = useCallback((item: any) => item._id, []);
  const getItemLayout = useCallback((_item: any, index: number) => ({ length: 100, offset: 100 * index, index }), []);

    const handleRetry = useCallback((message: any) => {
    sendGroupMessageMutation.mutate({
      text: message.text,
      image: message.image,
      tempId: message.tempId, // Reuse same tempId
    });
  }, [sendGroupMessageMutation]);

    const renderMessage = useCallback(
      ({ item }: any) => {
        if (!authUser || !selectedGroup) return null;

        const isOwn =
          typeof item.senderId === 'string'
            ? item.senderId === authUser._id
            : item.senderId._id === authUser._id;

        const sender =
          typeof item.senderId === 'string'
            ? selectedGroup.participantIds.find((p) => p._id === item.senderId)
            : item.senderId;

        const senderName = sender?.fullName || 'Unknown';
        const senderImage =
          sender?.profilePic ||
          'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg';

        return (
          <Message
            message={item}
            isOwn={isOwn}
            senderImage={senderImage}
            isGroup
            senderName={senderName}
            onRetry={handleRetry} // 🆕 Pass retry handler
          />
        );
      },
      [authUser, selectedGroup, handleRetry] // 🆕 Add handleRetry to deps
    );

  const ListHeaderComponent = useCallback(() => {
    if (isFetchingNextPage) {
      return (
        <reactNative.View style={styles.loadMoreContainer}>
          <reactNative.ActivityIndicator size="small" color={isDark ? '#0ea5e9' : '#3b82f6'} />
          <reactNative.Text style={[styles.loadMoreText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>Loading older messages...</reactNative.Text>
        </reactNative.View>
      );
    }
    if (!hasNextPage && messages.length > 0) {
      return (
        <reactNative.View style={styles.loadMoreContainer}>
          <reactNative.Text style={[styles.endText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>No more messages</reactNative.Text>
        </reactNative.View>
      );
    }
    return null;
  }, [isFetchingNextPage, hasNextPage, messages.length, isDark]);

  const ListEmptyComponent = useCallback(
    () => (
      <reactNative.View style={styles.emptyContainer}>
        <reactNative.Text style={[styles.emptyText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
          No messages yet. Start the conversation! 👋
        </reactNative.Text>
      </reactNative.View>
    ),
    [isDark]
  );

  const handleMessageSent = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  if (!authUser || !selectedGroup) return null;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
        <ChatHeader />
        <reactNative.View style={styles.loadingContainer}>
          <reactNative.ActivityIndicator size="large" color={isDark ? '#0ea5e9' : '#3b82f6'} />
        </reactNative.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: isDark ? '#121212' : '#fff' }]}
      edges={['top', 'left', 'right']}
    >
      <ChatHeader />

      <reactNative.KeyboardAvoidingView
        style={styles.container}
        behavior={reactNative.Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={reactNative.Platform.OS === 'ios' ? 100 : 0} // 👈 increase if still covered
      >
        <reactNative.FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={ListEmptyComponent}
          keyboardShouldPersistTaps="handled"
          maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: 10 }}
          windowSize={10}
          maxToRenderPerBatch={10}
          initialNumToRender={15}
          removeClippedSubviews={reactNative.Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
          onScrollBeginDrag={reactNative.Keyboard.dismiss}
        />

        {/* Fixed input bar */}
        <reactNative.View
  style={[
    styles.inputBar,
    {
      backgroundColor: isDark ? '#1c1c1c' : '#f9fafb',
      borderColor: isDark ? '#2a2a2a' : '#e5e7eb',
    },
  ]}
>
  <MessageInput onMessageSent={handleMessageSent} />
</reactNative.View>
      </reactNative.KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = reactNative.StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesContent: { padding: 16, paddingBottom: 8 },
  loadMoreContainer: { padding: 16, alignItems: 'center' },
  loadMoreText: { marginTop: 8, fontSize: 14 },
  endText: { fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  inputBar: {
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    paddingVertical: reactNative.Platform.OS === 'ios' ? 12 : 6,
    paddingHorizontal: 8,
  },
});
