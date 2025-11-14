// hooks/useGroup.tsx
import { useQuery, useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { v4 as uuid } from 'uuid';
import { axiosInstance } from '../lib/axios';
import { getGroupPendingMessages, addToGroupQueue, removeFromGroupQueue } from '../lib/offlineQueue';
import { useGroupStore } from '../store/useGroupStore';
import { useAuthStore } from '../store/useAuthStore';
import Toast from 'react-native-toast-message';
import { useEffect } from 'react';
import {
  Conversation,
  GroupMessage,
  GroupMessagesResponse,
  CreateGroupData,
  UpdateGroupData,
  SendGroupMessageData,
} from '../types/group';

// ============================================
// GET ALL GROUPS
// ============================================
export const useGroups = () => {
  const { authUser } = useAuthStore();

  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get<Conversation[]>('/groups');
        return res.data;
      } catch (error: any) {
        if (error?.response?.status === 401) {
          Toast.show({
            type: 'error',
            text1: 'Session expired',
            text2: 'Please log in again',
          });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Failed to load groups',
            text2: error.response?.data?.message || 'Please try again',
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

// ============================================
// GET GROUP BY ID
// ============================================
export const useGroup = (groupId: string | null) => {
  const { authUser } = useAuthStore();

  return useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      if (!groupId) return null;
      const res = await axiosInstance.get<Conversation>(`/groups/${groupId}`);
      return res.data;
    },
    enabled: !!groupId && !!authUser,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
};

// ============================================
// GET GROUP MESSAGES (with infinite scroll)
// ============================================
export const useGroupMessages = (groupId: string | null) => {
  const queryClient = useQueryClient();
  const { 
    subscribeToGroupMessages, 
    unsubscribeFromGroupMessages,
    subscribeToGroupReceipts,
    unsubscribeFromGroupReceipts,
    markGroupAsSeen
  } = useGroupStore();
  const { authUser } = useAuthStore();

  const query = useInfiniteQuery<
    GroupMessagesResponse,
    Error,
    InfiniteData<GroupMessagesResponse>,
    (string | null)[],
    string | null | undefined
  >({
    queryKey: ['groupMessages', groupId],
    queryFn: async ({ pageParam }): Promise<GroupMessagesResponse> => {
      if (!groupId) {
        return { messages: [], nextCursor: null, hasMore: false };
      }

      try {
        const params: { limit: number; cursor?: string | null } = { limit: 30 };
        if (pageParam) params.cursor = pageParam;

        const res = await axiosInstance.get<GroupMessagesResponse>(
          `/groups/${groupId}/messages`, 
          { params }
        );
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
    enabled: !!groupId && !!authUser,
    staleTime: 1000 * 60 * 2,
    initialPageParam: null as string | null | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : null,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
  });

  useEffect(() => {
    if (!groupId || !authUser) return;

    const handleNewGroupMessage = (newMessage: GroupMessage) => {
      // Add message to cache
      queryClient.setQueryData(['groupMessages', groupId], (oldData: any) => {
        if (!oldData) return oldData;

        const newPages = [...oldData.pages];
        const firstPage = { ...newPages[0] };
        const exists = firstPage.messages.some((m: GroupMessage) => m._id === newMessage._id);

        if (!exists) {
          firstPage.messages = [...firstPage.messages, newMessage];
          newPages[0] = firstPage;
        }

        return { ...oldData, pages: newPages };
      });

      // Invalidate groups list to update unread count and last message
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    };

    // Handle delivery receipts
    const handleDelivered = ({ messageId, groupId: msgGroupId, deliveredTo }: any) => {
      if (msgGroupId !== groupId) return;

      queryClient.setQueryData(['groupMessages', groupId], (oldData: any) => {
        if (!oldData) return oldData;

        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((msg: GroupMessage) =>
            msg._id === messageId
              ? {
                  ...msg,
                  status: 'delivered',
                  isDeliveredTo: [
                    ...msg.isDeliveredTo,
                    ...deliveredTo.map((userId: string) => ({
                      userId,
                      deliveredAt: new Date().toISOString(),
                    })),
                  ],
                }
              : msg
          ),
        }));

        return { ...oldData, pages: newPages };
      });
    };

    // Handle seen receipts
    const handleSeen = ({ messageIds, groupId: msgGroupId, seenBy }: any) => {
      if (msgGroupId !== groupId) return;

      queryClient.setQueryData(['groupMessages', groupId], (oldData: any) => {
        if (!oldData) return oldData;

        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((msg: GroupMessage) =>
            messageIds.includes(msg._id)
              ? {
                  ...msg,
                  status: 'seen',
                  isSeenBy: [
                    ...msg.isSeenBy,
                    { userId: seenBy, seenAt: new Date().toISOString() },
                  ],
                }
              : msg
          ),
        }));

        return { ...oldData, pages: newPages };
      });

      queryClient.invalidateQueries({ queryKey: ['groups'] });
    };

    subscribeToGroupMessages(handleNewGroupMessage);
    subscribeToGroupReceipts(handleDelivered, handleSeen);

    // Mark messages as seen when opening group
    if (authUser) {
      markGroupAsSeen(groupId, authUser._id);
    }

    return () => {
      unsubscribeFromGroupMessages();
      unsubscribeFromGroupReceipts();
    };
  }, [groupId, authUser, queryClient, subscribeToGroupMessages, unsubscribeFromGroupMessages, subscribeToGroupReceipts, unsubscribeFromGroupReceipts, markGroupAsSeen]);

  return query;
};

// ============================================
// CREATE GROUP
// ============================================
export const useCreateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupData: CreateGroupData) => {
      const res = await axiosInstance.post<Conversation>('/groups', groupData);
      return res.data;
    },
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      Toast.show({
        type: 'success',
        text1: 'Group created',
        text2: `${newGroup.name} has been created successfully`,
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to create group',
        text2: error.response?.data?.error || 'Please try again',
      });
    },
  });
};

// ============================================
// SEND GROUP MESSAGE
// ============================================
export const useSendGroupMessage = (groupId: string) => {
  const queryClient = useQueryClient();
  const { authUser, isOnline } = useAuthStore();

  return useMutation({
    mutationFn: async (messageData: SendGroupMessageData & { tempId?: string }) => {
      if (!isOnline) throw new Error('offline');

      const res = await axiosInstance.post<GroupMessage>(
        `/groups/${groupId}/messages`,
        { text: messageData.text, image: messageData.image }
      );

      return res.data;
    },

    onMutate: async (newMessageData) => {
      if (!authUser) return;

      await queryClient.cancelQueries({ queryKey: ['groupMessages', groupId] });
      const previousData = queryClient.getQueryData(['groupMessages', groupId]);

      // ✅ Use uuid safely
      const tempMessage: GroupMessage = {
        _id: `temp-${Date.now()}`,
        conversationId: groupId,
        senderId: authUser._id,
        text: newMessageData.text,
        image: newMessageData.image,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: isOnline ? 'sending' : 'pending',
        isDeliveredTo: [],
        isSeenBy: [],
        deletedFor: [],
        tempId: newMessageData.tempId || uuid(),
      };

      if (!isOnline) await addToGroupQueue(tempMessage);

      queryClient.setQueryData(['groupMessages', groupId], (oldData: any) => {
        if (!oldData) {
          return {
            pages: [{ messages: [tempMessage], nextCursor: null, hasMore: false }],
            pageParams: [null],
          };
        }

        const newPages = [...oldData.pages];
        const firstPage = { ...newPages[0] };
        const exists = firstPage.messages.some(
          (m: GroupMessage) => m.tempId === tempMessage.tempId || m._id === tempMessage._id
        );

        if (!exists) firstPage.messages = [...firstPage.messages, tempMessage];
        newPages[0] = firstPage;

        return { ...oldData, pages: newPages };
      });

      return { previousData, tempMessage };
    },

    onSuccess: async (serverMessage, variables, context) => {
      if (context?.tempMessage?.tempId) await removeFromGroupQueue(context.tempMessage.tempId);

      queryClient.setQueryData(['groupMessages', groupId], (oldData: any) => {
        if (!oldData) return oldData;

        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((msg: GroupMessage) =>
            msg.tempId === context?.tempMessage?.tempId || msg._id === context?.tempMessage?._id
              ? { ...serverMessage, tempId: context?.tempMessage?.tempId }
              : msg
          ),
        }));

        return { ...oldData, pages: newPages };
      });

      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },

    onError: async (error: any, variables, context) => {
      queryClient.setQueryData(['groupMessages', groupId], (oldData: any) => {
        if (!oldData) return oldData;

        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((msg: GroupMessage) =>
            msg.tempId === context?.tempMessage?.tempId
              ? {
                  ...msg,
                  status: error.message === 'offline' ? 'pending' : 'failed',
                  error: error.message,
                }
              : msg
          ),
        }));

        return { ...oldData, pages: newPages };
      });

      if (error.message !== 'offline') {
        Toast.show({
          type: 'error',
          text1: error.response?.data?.error || 'Failed to send message',
        });
      }
    },
  });
};

// ============================================
// UPDATE GROUP
// ============================================
export const useUpdateGroup = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updateData: UpdateGroupData) => {
      const res = await axiosInstance.put<Conversation>(`/groups/${groupId}`, updateData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      Toast.show({
        type: 'success',
        text1: 'Group updated',
        text2: 'Group details have been updated',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to update group',
        text2: error.response?.data?.error || 'Please try again',
      });
    },
  });
};

// ============================================
// ADD PARTICIPANTS
// ============================================
export const useAddParticipants = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (participantIds: string[]) => {
      const res = await axiosInstance.post<Conversation>(
        `/groups/${groupId}/participants`,
        { participantIds }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      Toast.show({
        type: 'success',
        text1: 'Participants added',
        text2: 'New members have been added to the group',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to add participants',
        text2: error.response?.data?.error || 'Please try again',
      });
    },
  });
};

// ============================================
// REMOVE PARTICIPANT
// ============================================
export const useRemoveParticipant = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (participantId: string) => {
      const res = await axiosInstance.delete(
        `/groups/${groupId}/participants/${participantId}`
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      Toast.show({
        type: 'success',
        text1: 'Participant removed',
        text2: 'Member has been removed from the group',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to remove participant',
        text2: error.response?.data?.error || 'Please try again',
      });
    },
  });
};

// ============================================
// LEAVE GROUP
// ============================================
export const useLeaveGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const res = await axiosInstance.post(`/groups/${groupId}/leave`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      Toast.show({
        type: 'success',
        text1: 'Left group',
        text2: 'You have left the group',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to leave group',
        text2: error.response?.data?.error || 'Please try again',
      });
    },
  });
};

export const useOfflineSyncGroup = () => {
  const queryClient = useQueryClient();
  const { isOnline, authUser } = useAuthStore();

  useEffect(() => {
    if (!isOnline || !authUser) return;

    const syncPendingMessages = async () => {
      const pending = await getGroupPendingMessages();
      console.log(`📤 Syncing ${pending.length} pending group messages...`);

      for (const message of pending) {
        // Ensure tempId exists
        if (!message.tempId) message.tempId = uuid();

        try {
          // Optimistic UI: mark as sending
          queryClient.setQueryData(['groupMessages', message.conversationId], (oldData: any) => {
            if (!oldData) return oldData;

            const newPages = oldData.pages.map((page: any) => ({
              ...page,
              messages: page.messages.map((msg: GroupMessage) =>
                msg.tempId === message.tempId ? { ...msg, status: 'sending' } : msg
              ),
            }));

            return { ...oldData, pages: newPages };
          });

          // Send message to server
          const res = await axiosInstance.post<GroupMessage>(
            `/groups/${message.conversationId}/messages`,
            { text: message.text, image: message.image }
          );

          // Replace temp message with server message in cache
          queryClient.setQueryData(['groupMessages', message.conversationId], (oldData: any) => {
            if (!oldData) return oldData;

            const newPages = oldData.pages.map((page: any) => ({
              ...page,
              messages: page.messages.map((msg: GroupMessage) =>
                msg.tempId === message.tempId ? { ...res.data, tempId: message.tempId } : msg
              ),
            }));

            return { ...oldData, pages: newPages };
          });

          // Remove from offline queue
          await removeFromGroupQueue(message.tempId);
          console.log('✅ Synced group message:', message.tempId);

        } catch (error: any) {
          console.error('❌ Failed to sync group message:', message.tempId, error);

          // Mark message as failed
          queryClient.setQueryData(['groupMessages', message.conversationId], (oldData: any) => {
            if (!oldData) return oldData;

            const newPages = oldData.pages.map((page: any) => ({
              ...page,
              messages: page.messages.map((msg: GroupMessage) =>
                msg.tempId === message.tempId ? { ...msg, status: 'failed', error: error.message } : msg
              ),
            }));

            return { ...oldData, pages: newPages };
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['groups'] });
    };

    syncPendingMessages();
  }, [isOnline, authUser, queryClient]);
};