import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import Toast from 'react-native-toast-message';
import { useEffect } from 'react';

interface User {
  _id: string;
  fullName: string;
  email: string;
  profilePic?: string;
}

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  text?: string;
  image?: string;
  createdAt: string;
}

interface RecentConversation {
  _id: string;
  user: User;
  lastMessage: Message;
  unreadCount: number;
}

// ============================================
// GET USERS
// ============================================
export const useUsers = () => {
  const { authUser } = useAuthStore();

  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get<User[]>('/messages/users');
        console.log('✅ Users fetched:', res.data.length);
        return res.data;
      } catch (error: any) {
        console.error('❌ Failed to fetch users:', error.response?.status, error.response?.data);
        
        // Handle 404 - no users exist yet (return empty array, don't throw)
        if (error?.response?.status === 404) {
          console.log('ℹ️ No users found (404), returning empty array');
          return [];
        }
        
        // Handle 401 - session expired
        if (error?.response?.status === 401) {
          Toast.show({
            type: 'error',
            text1: 'Session expired',
            text2: 'Please log in again',
          });
          throw error;
        }
        
        // Handle other errors
        Toast.show({
          type: 'error',
          text1: 'Failed to load users',
          text2: error.response?.data?.message || 'Please try again',
        });
        
        throw error;
      }
    },
    enabled: !!authUser, // Safety net: Only fetch when authenticated
    staleTime: 1000 * 60 * 2, // 2 minutes - data stays fresh
    gcTime: 1000 * 60 * 10, // 10 minutes - keep in cache even when unused (renamed from cacheTime)
    retry: (failureCount, error: any) => {
      // Don't retry on 401 (auth error) or 404 (no users)
      if (error?.response?.status === 401 || error?.response?.status === 404) return false;
      return failureCount < 2;
    },
  });
};

// ============================================
// GET RECENT CONVERSATIONS
// ============================================
export const useConversations = () => {
  const { authUser } = useAuthStore();

  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get<RecentConversation[]>('/messages/conversations');
        return res.data;
      } catch (error: any) {
        console.error('❌ Failed to fetch conversations:', error.response?.status);
        
        if (error?.response?.status === 401) {
          Toast.show({
            type: 'error',
            text1: 'Session expired',
            text2: 'Please log in again',
          });
        }
        
        throw error;
      }
    },
    enabled: !!authUser, // Only fetch when authenticated
    staleTime: 1000 * 5, // 15 seconds
    refetchInterval: 1000 * 10, // Refetch every 30 seconds
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
  });
};

// ============================================
// GET MESSAGES
// ============================================
export const useMessages = (userId: string | null) => {
  const queryClient = useQueryClient();
  const { subscribeToMessages, unsubscribeFromMessages } = useChatStore();
  const { authUser } = useAuthStore();

  const query = useQuery({
    queryKey: ['messages', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      try {
        const res = await axiosInstance.get<Message[]>(`/messages/${userId}`);
        return res.data;
      } catch (error: any) {
        console.error('❌ Failed to fetch messages:', error.response?.status);
        
        if (error?.response?.status === 401) {
          Toast.show({
            type: 'error',
            text1: 'Session expired',
            text2: 'Please log in again',
          });
        }
        
        throw error;
      }
    },
    enabled: !!userId && !!authUser, // Only run if userId AND authUser exist
    staleTime: 1000 * 60 * 1, // 2 minutes
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
  });

  // Subscribe to real-time messages
  useEffect(() => {
    if (!userId || !authUser) return;

    const handleNewMessage = (newMessage: Message) => {
      const isMessageForThisConversation =
        newMessage.senderId === userId || newMessage.receiverId === userId;

      if (isMessageForThisConversation) {
        // Add message to cache
        queryClient.setQueryData(['messages', userId], (old: Message[] = []) => {
          // Prevent duplicates
          const exists = old.some((m) => m._id === newMessage._id);
          if (exists) return old;
          return [...old, newMessage];
        });

        // Update conversation list - v5 syntax
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    };

    subscribeToMessages(handleNewMessage);
    return () => unsubscribeFromMessages();
  }, [userId, authUser, queryClient, subscribeToMessages, unsubscribeFromMessages]);

  return query;
};

// ============================================
// SEND MESSAGE (with Optimistic Updates)
// ============================================
export const useSendMessage = (receiverId: string) => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthStore();

  return useMutation({
    mutationFn: async (messageData: { text?: string; image?: string }) => {
      const res = await axiosInstance.post<Message>(
        `/messages/send/${receiverId}`,
        messageData
      );
      return res.data;
    },
    // Optimistic update
    onMutate: async (newMessageData) => {
      if (!authUser) {
        console.error('❌ Cannot send message: No authenticated user');
        return;
      }

      // Cancel outgoing refetches - v5 syntax
      await queryClient.cancelQueries({ queryKey: ['messages', receiverId] });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData<Message[]>(['messages', receiverId]);

      // Optimistically update with temporary message
      const tempMessage: Message = {
        _id: `temp-${Date.now()}`,
        senderId: authUser._id, // Use actual user ID from auth store
        receiverId,
        text: newMessageData.text,
        image: newMessageData.image,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Message[]>(['messages', receiverId], (old = []) => [
        ...old,
        tempMessage,
      ]);

      return { previousMessages, tempMessage };
    },
    // On success, replace temp message with real one
    onSuccess: (serverMessage, variables, context) => {
      queryClient.setQueryData<Message[]>(['messages', receiverId], (old = []) => {
        return old.map((msg) =>
          msg._id === context?.tempMessage._id ? serverMessage : msg
        );
      });

      // Invalidate conversations to update last message - v5 syntax
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    // On error, revert to previous state
    onError: (error: any, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', receiverId], context.previousMessages);
      }
      
      const errorMessage = error.response?.data?.message || 'Failed to send message';
      console.error('❌ Send message error:', errorMessage);
      
      Toast.show({
        type: 'error',
        text1: errorMessage,
      });
    },
  });
};