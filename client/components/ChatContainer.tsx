import React, { useRef, useEffect, useCallback, useState } from 'react';
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
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { useMessages } from '../hooks/useChat';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import Message from './Message';

export default function ChatContainer() {
  const { selectedUser } = useChatStore();
  const { authUser } = useAuthStore();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(selectedUser?._id || null);

  const flatListRef = useRef<FlatList>(null);

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
    const subscription = AppState.addEventListener('change', (nextAppState) => {
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

  const renderMessage = useCallback(
    ({ item }: any) => (
      <Message
        message={item}
        isOwn={item.senderId === authUser?._id}
        senderImage={item.senderId === authUser?._id ? authUser?.profilePic : selectedUser?.profilePic}
      />
    ),
    [authUser?._id, authUser?.profilePic, selectedUser?.profilePic]
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
          No messages yet. Say hi! 👋
        </Text>
      </View>
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#0ea5e9' : '#3b82f6'} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#121212' : '#fff' }]} edges={['top', 'left', 'right']}>
      <ChatHeader />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ flex: 1 }}>
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
            onScrollBeginDrag={Keyboard.dismiss}
          />

          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: isDark ? '#1c1c1c' : '#f9fafb',
                borderColor: isDark ? '#2a2a2a' : '#e5e7eb',
              },
            ]}
          >
            <MessageInput onMessageSent={handleMessageSent} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    paddingHorizontal: 8,
  },
});