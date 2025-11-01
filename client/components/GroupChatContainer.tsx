import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Text,
  AppState,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGroupStore } from '../store/useGroupStore';
import { useAuthStore } from '../store/useAuthStore';
import { useGroupMessages } from '../hooks/useGroup';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import Message from './Message';

export default function GroupChatContainer() {
  const { selectedGroup } = useGroupStore();
  const { authUser } = useAuthStore();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useGroupMessages(
    selectedGroup?._id || null
  );

  const flatListRef = useRef<FlatList>(null);

  const messages = (data?.pages ?? [])
    .slice()
    .reverse()
    .flatMap((page) => page.messages)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length && flatListRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // Mark group as seen when app comes to foreground
  useEffect(() => {
    if (!selectedGroup || !authUser) return;
    const subscription = AppState.addEventListener('change', (nextAppState) => {
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
        sender?.profilePic || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg';

      return <Message message={item} isOwn={isOwn} senderImage={senderImage} isGroup senderName={senderName} />;
    },
    [authUser, selectedGroup]
  );

  const ListHeaderComponent = useCallback(() => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.loadMoreContainer}>
          <ActivityIndicator size="small" color={isDark ? '#0ea5e9' : '#3b82f6'} />
          <Text style={[styles.loadMoreText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>Loading older messages...</Text>
        </View>
      );
    }
    if (!hasNextPage && messages.length > 0) {
      return (
        <View style={styles.loadMoreContainer}>
          <Text style={[styles.endText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>No more messages</Text>
        </View>
      );
    }
    return null;
  }, [isFetchingNextPage, hasNextPage, messages.length, isDark]);

  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
          No messages yet. Start the conversation! 👋
        </Text>
      </View>
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#0ea5e9' : '#3b82f6'} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#121212' : '#fff' }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ChatHeader />
        <FlatList
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
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
        />
        <MessageInput onMessageSent={handleMessageSent} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesContent: { padding: 16 },
  loadMoreContainer: { padding: 16, alignItems: 'center' },
  loadMoreText: { marginTop: 8, fontSize: 14 },
  endText: { fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 16, textAlign: 'center' },
});
