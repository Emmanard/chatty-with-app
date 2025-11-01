import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';

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
  isDeliveredTo?: string[];
  isSeenBy?: string[];
  status?: 'sent' | 'delivered' | 'seen';
}

interface ChatStore {
  selectedUser: User | null;
  typingUsers: Record<string, boolean>;
  setSelectedUser: (user: User | null) => void;
  subscribeToMessages: (onNewMessage: (message: Message) => void) => void;
  unsubscribeFromMessages: () => void;
  setTyping: (userId: string, isTyping: boolean) => void;
  subscribeToTyping: () => void;
  unsubscribeFromTyping: () => void;
  emitTyping: (receiverId: string) => void;
  emitStopTyping: (receiverId: string) => void;
  
  // NEW: Receipt methods
  subscribeToReceipts: (
    onDelivered: (data: any) => void,
    onSeen: (data: any) => void
  ) => void;
  unsubscribeFromReceipts: () => void;
  markAsSeen: (conversationId: string, userId: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  selectedUser: null,
  typingUsers: {},

  setSelectedUser: (user) => {
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;
    
    // Mark previous conversation messages as seen when switching
    const previousUser = get().selectedUser;
    if (previousUser && authUser && socket) {
      const conversationId = [authUser._id, previousUser._id].sort().join('_');
      socket.emit('mark_as_seen', {
        conversationId,
        userId: authUser._id,
      });
    }

    set({ selectedUser: user });

    // Mark new conversation messages as seen
    if (user && authUser && socket) {
      const conversationId = [authUser._id, user._id].sort().join('_');
      socket.emit('mark_as_seen', {
        conversationId,
        userId: authUser._id,
      });
    }
  },

  setTyping: (userId, isTyping) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [userId]: isTyping,
      },
    }));

    if (isTyping) {
      setTimeout(() => {
        set((state) => ({
          typingUsers: {
            ...state.typingUsers,
            [userId]: false,
          },
        }));
      }, 3000);
    }
  },

  subscribeToMessages: (onNewMessage) => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on('newMessage', (newMessage: Message) => {
      onNewMessage(newMessage);
      
      // Auto-mark as seen if conversation is open
      const selectedUser = get().selectedUser;
      const authUser = useAuthStore.getState().authUser;
      
      if (selectedUser && authUser && 
          (newMessage.senderId === selectedUser._id || newMessage.receiverId === selectedUser._id)) {
        const conversationId = [authUser._id, selectedUser._id].sort().join('_');
        socket.emit('mark_as_seen', {
          conversationId,
          userId: authUser._id,
        });
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off('newMessage');
    }
  },

  subscribeToTyping: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on('user_typing', ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      get().setTyping(userId, isTyping);
    });
  },

  unsubscribeFromTyping: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off('user_typing');
    }
  },

  emitTyping: (receiverId: string) => {
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;
    if (!socket || !authUser) return;

    const conversationId = [authUser._id, receiverId].sort().join('_');
    socket.emit('typing', {
      conversationId,
      userId: authUser._id,
    });
  },

  emitStopTyping: (receiverId: string) => {
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;
    if (!socket || !authUser) return;

    const conversationId = [authUser._id, receiverId].sort().join('_');
    socket.emit('stop_typing', {
      conversationId,
      userId: authUser._id,
    });
  },

  // NEW: Receipt subscriptions
  subscribeToReceipts: (onDelivered, onSeen) => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on('message_delivered', onDelivered);
    socket.on('messages_seen', onSeen);
  },

  unsubscribeFromReceipts: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off('message_delivered');
      socket.off('messages_seen');
    }
  },

  markAsSeen: (conversationId: string, userId: string) => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.emit('mark_as_seen', {
      conversationId,
      userId,
    });
  },
}));