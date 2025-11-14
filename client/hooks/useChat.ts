import { v4 as uuid } from 'uuid';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { getDMPendingMessages, addToDMQueue, removeFromDMQueue } from '../lib/offlineQueue';
import { axiosInstance } from '../lib/axios';
import Toast from 'react-native-toast-message';


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
  // NEW: Receipt fields
  isDeliveredTo?: string[];
  isSeenBy?: string[];
  status?:'sent' | 'delivered' | 'seen' | 'sending' | 'pending' | 'failed'; 
  tempId?: string; 
  error?: string;
}

interface RecentConversation {
  _id: string;
  user: User;
  lastMessage: Message;
  unreadCount: number;
}

interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const useUsers = () => {
  const { authUser } = useAuthStore();

  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get<User[]>('/messages/users');
        return res.data;
      } catch (error: any) {
        if (error?.response?.status === 404) return [];
        if (error?.response?.status === 401) {
          Toast.show({
            type: 'error',
            text1: 'Session expired',
            text2: 'Please log in again',
          });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Failed to load users',
            text2: error.response?.data?.message || 'Please try again',
          });
        }
        throw error;
      }
    },
    enabled: !!authUser,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401 || error?.response?.status === 404) return false;
      return failureCount < 2;
    },
  });
};

export const useConversations = () => {
  const { authUser } = useAuthStore();

  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get<RecentConversation[]>('/messages/conversations');
        return res.data;
      } catch (error: any) {
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
    enabled: !!authUser,
    staleTime: 1000 * 5,
    refetchInterval: 1000 * 10,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
  });
};

export const useMessages = (userId: string | null) => {
  const queryClient = useQueryClient();
  const { 
    subscribeToMessages, 
    unsubscribeFromMessages,
    subscribeToReceipts,
    unsubscribeFromReceipts,
    markAsSeen
  } = useChatStore();
  const { authUser } = useAuthStore();

  const query = useInfiniteQuery<
    MessagesResponse,
    Error,
    InfiniteData<MessagesResponse>,
    (string | null)[],
    string | null | undefined
  >({
    queryKey: ['messages', userId],
    queryFn: async ({ pageParam }): Promise<MessagesResponse> => {
      if (!userId) {
        return { messages: [], nextCursor: null, hasMore: false };
      }

      try {
        const params: { limit: number; cursor?: string | null } = { limit: 30 };
        if (pageParam) params.cursor = pageParam;

        const res = await axiosInstance.get<MessagesResponse>(`/messages/${userId}`, { params });
        return res.data;
      } catch (error: any) {
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
    enabled: !!userId && !!authUser,
    staleTime: 1000 * 60 * 2,
    initialPageParam: null as string | null | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : null,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
  });

  useEffect(() => {
    if (!userId || !authUser) return;

    const handleNewMessage = (newMessage: Message) => {
      const isMessageForThisConversation =
        newMessage.senderId === userId || newMessage.receiverId === userId;

      if (isMessageForThisConversation) {
        queryClient.setQueryData(['messages', userId], (oldData: any) => {
          if (!oldData) return oldData;

          const newPages = [...oldData.pages];
          const firstPage = { ...newPages[0] };
          const exists = firstPage.messages.some((m: Message) => m._id === newMessage._id);

          if (!exists) {
            firstPage.messages = [...firstPage.messages, newMessage];
            newPages[0] = firstPage;
          }

          return { ...oldData, pages: newPages };
        });

        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    };

    // NEW: Handle delivery receipts
    const handleDelivered = ({ messageId, deliveredTo }: any) => {
      queryClient.setQueryData(['messages', userId], (oldData: any) => {
        if (!oldData) return oldData;

        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((msg: Message) =>
            msg._id === messageId
              ? { ...msg, status: 'delivered', isDeliveredTo: [deliveredTo] }
              : msg
          ),
        }));

        return { ...oldData, pages: newPages };
      });
    };

    // NEW: Handle seen receipts
    const handleSeen = ({ messageIds }: any) => {
      queryClient.setQueryData(['messages', userId], (oldData: any) => {
        if (!oldData) return oldData;

        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((msg: Message) =>
            messageIds.includes(msg._id)
              ? { ...msg, status: 'seen', isSeenBy: [userId] }
              : msg
          ),
        }));

        return { ...oldData, pages: newPages };
      });

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    subscribeToMessages(handleNewMessage);
    subscribeToReceipts(handleDelivered, handleSeen);

    // Mark messages as seen when opening conversation
    const conversationId = [authUser._id, userId].sort().join('_');
    markAsSeen(conversationId, authUser._id);

    return () => {
      unsubscribeFromMessages();
      unsubscribeFromReceipts();
    };
  }, [userId, authUser, queryClient, subscribeToMessages, unsubscribeFromMessages, subscribeToReceipts, unsubscribeFromReceipts, markAsSeen]);

  return query;
};

export const useSendMessage = (receiverId: string) => {
  const queryClient = useQueryClient();
  const { authUser, isOnline } = useAuthStore();

  return useMutation({
    mutationFn: async (messageData: { text?: string; image?: string; tempId?: string }) => {
      if (!isOnline) throw new Error('offline');

      const res = await axiosInstance.post<Message>(`/messages/send/${receiverId}`, {
        text: messageData.text,
        image: messageData.image,
      });

      return res.data;
    },

    onMutate: async (newMessageData) => {
       console.log('🔎 DM onMutate:', { isOnline, newMessageData });
      if (!authUser) return;

      await queryClient.cancelQueries({ queryKey: ['messages', receiverId] });
      const previousData = queryClient.getQueryData(['messages', receiverId]);

      // ✅ Use uuid safely here
      const tempMessage: Message = {
        _id: `temp-${Date.now()}`,
        senderId: authUser._id,
        receiverId,
        text: newMessageData.text,
        image: newMessageData.image,
        createdAt: new Date().toISOString(),
        status: isOnline ? 'sending' : 'pending',
        tempId: newMessageData.tempId || uuid(), // <- safe uuid
      };

      if (!isOnline) await addToDMQueue(tempMessage);

      queryClient.setQueryData(['messages', receiverId], (oldData: any) => {
        if (!oldData) {
          return { pages: [{ messages: [tempMessage], nextCursor: null, hasMore: false }], pageParams: [null] };
        }

        const newPages = [...oldData.pages];
        const firstPage = { ...newPages[0] };
        const exists = firstPage.messages.some((m: Message) => m.tempId === tempMessage.tempId || m._id === tempMessage._id);

        if (!exists) firstPage.messages = [...firstPage.messages, tempMessage];
        newPages[0] = firstPage;

        return { ...oldData, pages: newPages };
      });

      return { previousData, tempMessage };
    },

    onSuccess: async (serverMessage, variables, context) => {
      if (context?.tempMessage?.tempId) await removeFromDMQueue(context.tempMessage.tempId);

      queryClient.setQueryData(['messages', receiverId], (oldData: any) => {
        if (!oldData) return oldData;

        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((msg: Message) =>
            msg.tempId === context?.tempMessage?.tempId || msg._id === context?.tempMessage?._id
              ? { ...serverMessage, tempId: context?.tempMessage?.tempId }
              : msg
          ),
        }));

        return { ...oldData, pages: newPages };
      });

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },

    onError: async (error: any, variables, context) => {
      queryClient.setQueryData(['messages', receiverId], (oldData: any) => {
        if (!oldData) return oldData;

        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((msg: Message) =>
            msg.tempId === context?.tempMessage?.tempId
              ? { ...msg, status: error.message === 'offline' ? 'pending' : 'failed', error: error.message }
              : msg
          ),
        }));

        return { ...oldData, pages: newPages };
      });

      if (error.message !== 'offline') {
        Toast.show({ type: 'error', text1: error.response?.data?.message || 'Failed to send message' });
      }
    },
  });
};


export const useOfflineSyncDM = () => {
  const queryClient = useQueryClient();
  const { isOnline, authUser } = useAuthStore();

  useEffect(() => {
    if (!isOnline || !authUser) return;

    const syncPendingMessages = async () => {
      const pending = await getDMPendingMessages();
      console.log(`📤 Syncing ${pending.length} pending DM messages...`);

      for (const message of pending) {
        // Ensure tempId exists
        if (!message.tempId) message.tempId = uuid();

        try {
          // Optimistic UI: mark as sending
          queryClient.setQueryData(['messages', message.receiverId], (oldData: any) => {
            if (!oldData) return oldData;

            const newPages = oldData.pages.map((page: any) => ({
              ...page,
              messages: page.messages.map((msg: Message) =>
                msg.tempId === message.tempId ? { ...msg, status: 'sending' } : msg
              ),
            }));

            return { ...oldData, pages: newPages };
          });

          // Send message to server
          const res = await axiosInstance.post<Message>(
            `/messages/send/${message.receiverId}`,
            { text: message.text, image: message.image }
          );

          // Replace temp message with server message
          queryClient.setQueryData(['messages', message.receiverId], (oldData: any) => {
            if (!oldData) return oldData;

            const newPages = oldData.pages.map((page: any) => ({
              ...page,
              messages: page.messages.map((msg: Message) =>
                msg.tempId === message.tempId ? { ...res.data, tempId: message.tempId } : msg
              ),
            }));

            return { ...oldData, pages: newPages };
          });

          // Remove from offline queue
          await removeFromDMQueue(message.tempId);
          console.log('✅ Synced DM message:', message.tempId);

        } catch (error: any) {
          console.error('❌ Failed to sync DM message:', message.tempId, error);

          // Mark as failed in UI
          queryClient.setQueryData(['messages', message.receiverId], (oldData: any) => {
            if (!oldData) return oldData;

            const newPages = oldData.pages.map((page: any) => ({
              ...page,
              messages: page.messages.map((msg: Message) =>
                msg.tempId === message.tempId
                  ? { ...msg, status: 'failed', error: error.message }
                  : msg
              ),
            }));

            return { ...oldData, pages: newPages };
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    syncPendingMessages();
  }, [isOnline, authUser, queryClient]);
};