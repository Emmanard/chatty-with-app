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
  
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(selectedUser?._id || null);

  const flatListRef = useRef<FlatList>(null);

  // Flatten pages so oldest messages are first, newest last
  const messages = (data?.pages ?? [])
    .slice()               
    .reverse()              
    .flatMap((page) => page.messages)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // App state monitoring - mark messages as seen when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && selectedUser && authUser) {
        const conversationId = [authUser._id, selectedUser._id].sort().join('_');
        const socket = useAuthStore.getState().socket;
        if (socket) {
          socket.emit('mark_as_seen', {
            conversationId,
            userId: authUser._id,
          });
        }
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [selectedUser, authUser]);

  // ✅ PERFORMANCE FIX: Memoize callbacks
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const keyExtractor = useCallback((item: any) => item._id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 100, // Approximate height of message
      offset: 100 * index,
      index,
    }),
    []
  );

  const renderMessage = useCallback(
    ({ item }: any) => (
      <Message
        message={item}
        isOwn={item.senderId === authUser?._id}
        senderImage={
          item.senderId === authUser?._id
            ? authUser?.profilePic
            : selectedUser?.profilePic
        }
      />
    ),
    [authUser?._id, authUser?.profilePic, selectedUser?.profilePic]
  );

  const ListHeaderComponent = useCallback(() => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.loadMoreContainer}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadMoreText}>Loading older messages...</Text>
        </View>
      );
    }

    if (!hasNextPage && messages.length > 0) {
      return (
        <View style={styles.loadMoreContainer}>
          <Text style={styles.endText}>No more messages</Text>
        </View>
      );
    }

    return null;
  }, [isFetchingNextPage, hasNextPage, messages.length]);

  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No messages yet. Say hi! 👋</Text>
      </View>
    ),
    []
  );

  const handleMessageSent = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  if (!authUser || !selectedUser) {
    return null;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ChatHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ChatHeader />
        <FlatList
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
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          // ✅ CRITICAL PERFORMANCE OPTIMIZATIONS
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
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  loadMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
  },
  endText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center',
  },
});