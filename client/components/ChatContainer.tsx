import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Text,
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

  // Flatten pages so oldest messages are first, newest last.
// We reverse pages because pages[0] is the most-recent page returned by react-query.
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

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderMessage = ({ item }: any) => (
    <Message
      message={item}
      isOwn={item.senderId === authUser._id}
      senderImage={
        item.senderId === authUser._id
          ? authUser.profilePic
          : selectedUser.profilePic
      }
    />
  );

  const ListHeaderComponent = () => {
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
  };

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No messages yet. Say hi! 👋</Text>
    </View>
  );

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
  keyExtractor={(item) => item._id}
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
 
  windowSize={5}               
  maxToRenderPerBatch={20}      
  removeClippedSubviews={true}  
/>

        <MessageInput
          onMessageSent={() => {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
        />
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