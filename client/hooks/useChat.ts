import { useQuery, useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
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
  const { subscribeToMessages, unsubscribeFromMessages } = useChatStore();
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

    subscribeToMessages(handleNewMessage);
    return () => unsubscribeFromMessages();
  }, [userId, authUser, queryClient, subscribeToMessages, unsubscribeFromMessages]);

  return query;
};

export const useSendMessage = (receiverId: string) => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthStore();

  return useMutation({
    mutationFn: async (messageData: { text?: string; image?: string }) => {
      const res = await axiosInstance.post<Message>(`/messages/send/${receiverId}`, messageData);
      return res.data;
    },
    onMutate: async (newMessageData) => {
      if (!authUser) return;

      await queryClient.cancelQueries({ queryKey: ['messages', receiverId] });
      const previousData = queryClient.getQueryData(['messages', receiverId]);

      const tempMessage: Message = {
        _id: `temp-${Date.now()}`,
        senderId: authUser._id,
        receiverId,
        text: newMessageData.text,
        image: newMessageData.image,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData(['messages', receiverId], (oldData: any) => {
        if (!oldData) return oldData;

        const newPages = [...oldData.pages];
        const firstPage = { ...newPages[0] };
        firstPage.messages = [...firstPage.messages, tempMessage];
        newPages[0] = firstPage;

        return { ...oldData, pages: newPages };
      });

      return { previousData, tempMessage };
    },
    onSuccess: (serverMessage, variables, context) => {
      queryClient.setQueryData(['messages', receiverId], (oldData: any) => {
        if (!oldData) return oldData;

        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((msg: Message) =>
            msg._id === context?.tempMessage._id ? serverMessage : msg
          ),
        }));

        return { ...oldData, pages: newPages };
      });

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: any, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['messages', receiverId], context.previousData);
      }

      Toast.show({
        type: 'error',
        text1: error.response?.data?.message || 'Failed to send message',
      });
    },
  });
};