import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as reactNative from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { useMessages } from '../hooks/useChat';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import Message from './Message';
import { useSendMessage } from '../hooks/useChat';
import { useOfflineSyncDM } from '../hooks/useChat';


export default function ChatContainer() {
  const { selectedUser } = useChatStore();
  const { authUser } = useAuthStore();
  const colorScheme = reactNative.useColorScheme();
  const isDark = colorScheme === 'dark';

    const sendMessageMutation = useSendMessage(selectedUser?._id || '');
  useOfflineSyncDM();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMessages(selectedUser?._id || null);

  const flatListRef = useRef<reactNative.FlatList>(null);

  const messages = (data?.pages ?? [])
    .slice()
    .reverse()
    .flatMap((page) => page.messages)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // Mark seen on app focus
  useEffect(() => {
    const subscription = reactNative.AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && selectedUser && authUser) {
        const conversationId = [authUser._id, selectedUser._id].sort().join('_');
        const socket = useAuthStore.getState().socket;
        socket?.emit('mark_as_seen', { conversationId, userId: authUser._id });
      }
    });
    return () => subscription?.remove();
  }, [selectedUser, authUser]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const keyExtractor = useCallback((item: any) => item._id, []);
  const getItemLayout = useCallback((_item: any, index: number) => ({ length: 100, offset: 100 * index, index }), []);

const handleRetry = useCallback((message: any) => {
    sendMessageMutation.mutate({
      text: message.text,
      image: message.image,
      tempId: message.tempId, // Reuse same tempId
    });
  }, [sendMessageMutation]);


  const renderMessage = useCallback(
    ({ item }: any) => (
      <Message
        message={item}
        isOwn={item.senderId === authUser?._id}
        senderImage={item.senderId === authUser?._id ? authUser?.profilePic : selectedUser?.profilePic}
        onRetry={handleRetry} // 🆕 Pass retry handler
      />
    ),
    [authUser?._id, authUser?.profilePic, selectedUser?.profilePic, handleRetry] 
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
          No messages yet. Say hi! 👋
        </reactNative.Text>
      </reactNative.View>
    ),
    [isDark]
  );

  const handleMessageSent = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  if (!authUser || !selectedUser) return null;

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#121212' : '#fff' }]} edges={['top', 'left', 'right']}>
      <ChatHeader />

      <reactNative.KeyboardAvoidingView
        style={{ flex: 1 }}
        keyboardVerticalOffset={reactNative.Platform.OS === 'ios' ? 90 : 0}
        behavior={reactNative.Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <reactNative.View style={{ flex: 1 }}>
          <reactNative.FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            contentContainerStyle={[styles.messagesContent, { paddingBottom: 8 }]}
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
        </reactNative.View>
      </reactNative.KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = reactNative.StyleSheet.create({
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesContent: { padding: 16 },
  loadMoreContainer: { padding: 16, alignItems: 'center' },
  loadMoreText: { marginTop: 8, fontSize: 14 },
  endText: { fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  inputBar: {
    borderTopWidth: 1,
    paddingVertical: reactNative.Platform.OS === 'ios' ? 12 : 6,
    paddingHorizontal: 8,
  },
});