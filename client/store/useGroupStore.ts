// store/useGroupStore.ts
import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import { Conversation, GroupMessage } from '../types/group';

interface GroupStore {
  selectedGroup: Conversation | null;
  typingUsersInGroup: Record<string, string[]>; // groupId -> array of userIds typing
  setSelectedGroup: (group: Conversation | null) => void;
  subscribeToGroupMessages: (onNewMessage: (message: GroupMessage) => void) => void;
  unsubscribeFromGroupMessages: () => void;
  setGroupTyping: (groupId: string, userId: string, isTyping: boolean) => void;
  subscribeToGroupTyping: () => void;
  unsubscribeFromGroupTyping: () => void;
  emitGroupTyping: (groupId: string) => void;
  emitStopGroupTyping: (groupId: string) => void;
  
  // Receipt methods
  subscribeToGroupReceipts: (
    onDelivered: (data: any) => void,
    onSeen: (data: any) => void
  ) => void;
  unsubscribeFromGroupReceipts: () => void;
  markGroupAsSeen: (groupId: string, userId: string) => void;
  
  // Group management events
  subscribeToGroupEvents: () => void;
  unsubscribeFromGroupEvents: () => void;
}

export const useGroupStore = create<GroupStore>((set, get) => ({
  selectedGroup: null,
  typingUsersInGroup: {},

  setSelectedGroup: (group) => {
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;
    
    // Mark previous group messages as seen when switching
    const previousGroup = get().selectedGroup;
    if (previousGroup && authUser && socket) {
      socket.emit('mark_group_as_seen', {
        groupId: previousGroup._id,
        userId: authUser._id,
      });
    }

    set({ selectedGroup: group });

    // Mark new group messages as seen
    if (group && authUser && socket) {
      socket.emit('mark_group_as_seen', {
        groupId: group._id,
        userId: authUser._id,
      });
    }
  },

  setGroupTyping: (groupId, userId, isTyping) => {
    set((state) => {
      const currentTypers = state.typingUsersInGroup[groupId] || [];
      
      if (isTyping) {
        // Add user if not already typing
        if (!currentTypers.includes(userId)) {
          return {
            typingUsersInGroup: {
              ...state.typingUsersInGroup,
              [groupId]: [...currentTypers, userId],
            },
          };
        }
      } else {
        // Remove user from typing
        return {
          typingUsersInGroup: {
            ...state.typingUsersInGroup,
            [groupId]: currentTypers.filter(id => id !== userId),
          },
        };
      }
      
      return state;
    });

    // Auto-clear typing after 3 seconds
    if (isTyping) {
      setTimeout(() => {
        set((state) => {
          const currentTypers = state.typingUsersInGroup[groupId] || [];
          return {
            typingUsersInGroup: {
              ...state.typingUsersInGroup,
              [groupId]: currentTypers.filter(id => id !== userId),
            },
          };
        });
      }, 3000);
    }
  },

  subscribeToGroupMessages: (onNewMessage) => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on('new_group_message', (newMessage: GroupMessage) => {
      onNewMessage(newMessage);
      
      // Auto-mark as seen if group is open
      const selectedGroup = get().selectedGroup;
      const authUser = useAuthStore.getState().authUser;
      
      if (selectedGroup && authUser && newMessage.conversationId === selectedGroup._id) {
        socket.emit('mark_group_as_seen', {
          groupId: selectedGroup._id,
          userId: authUser._id,
        });
      }
    });
  },

  unsubscribeFromGroupMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off('new_group_message');
    }
  },

  subscribeToGroupTyping: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on('user_typing', ({ conversationId, userId, isTyping, isGroup }: any) => {
      if (isGroup) {
        get().setGroupTyping(conversationId, userId, isTyping);
      }
    });
  },

  unsubscribeFromGroupTyping: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off('user_typing');
    }
  },

  emitGroupTyping: (groupId: string) => {
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;
    if (!socket || !authUser) return;

    socket.emit('typing', {
      conversationId: groupId,
      userId: authUser._id,
      isGroup: true,
    });
  },

  emitStopGroupTyping: (groupId: string) => {
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;
    if (!socket || !authUser) return;

    socket.emit('stop_typing', {
      conversationId: groupId,
      userId: authUser._id,
      isGroup: true,
    });
  },

  // Receipt subscriptions
  subscribeToGroupReceipts: (onDelivered, onSeen) => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on('group_message_delivered', onDelivered);
    socket.on('group_messages_seen', onSeen);
  },

  unsubscribeFromGroupReceipts: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off('group_message_delivered');
      socket.off('group_messages_seen');
    }
  },

  markGroupAsSeen: (groupId: string, userId: string) => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.emit('mark_group_as_seen', {
      groupId,
      userId,
    });
  },

  // Group management events
  subscribeToGroupEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on('new_group_created', (conversation: Conversation) => {
      console.log('New group created:', conversation.name);
      // Can show notification or update UI
    });

    socket.on('group_updated', (conversation: Conversation) => {
      console.log('Group updated:', conversation.name);
      // Update selected group if it's the one being updated
      const selectedGroup = get().selectedGroup;
      if (selectedGroup && selectedGroup._id === conversation._id) {
        set({ selectedGroup: conversation });
      }
    });

    socket.on('participants_added', ({ groupId, newParticipants }: any) => {
      console.log('Participants added to group:', groupId);
    });

    socket.on('participant_removed', ({ groupId, removedParticipantId }: any) => {
      console.log('Participant removed from group:', groupId);
    });

    socket.on('participant_left', ({ groupId, leftParticipantId }: any) => {
      console.log('Participant left group:', groupId);
    });

    socket.on('removed_from_group', ({ groupId }: any) => {
      console.log('You were removed from group:', groupId);
      // Clear selected group if it's the one user was removed from
      const selectedGroup = get().selectedGroup;
      if (selectedGroup && selectedGroup._id === groupId) {
        set({ selectedGroup: null });
      }
    });

    socket.on('new_admin_added', ({ groupId, newAdminId }: any) => {
      console.log('New admin added to group:', groupId);
    });

    socket.on('group_message_deleted', ({ messageId, groupId }: any) => {
      console.log('Message deleted in group:', groupId);
    });
  },

  unsubscribeFromGroupEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off('new_group_created');
      socket.off('group_updated');
      socket.off('participants_added');
      socket.off('participant_removed');
      socket.off('participant_left');
      socket.off('removed_from_group');
      socket.off('new_admin_added');
      socket.off('group_message_deleted');
    }
  },
}));