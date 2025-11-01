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
}

export const useChatStore = create<ChatStore>((set, get) => ({
  selectedUser: null,
  typingUsers: {},

  setSelectedUser: (user) => {
    set({ selectedUser: user });
  },

  setTyping: (userId, isTyping) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [userId]: isTyping,
      },
    }));

    // Auto-clear typing after 3 seconds
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

    // Create conversationId (sorted alphabetically)
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

    // Create conversationId (sorted alphabetically)
    const conversationId = [authUser._id, receiverId].sort().join('_');

    socket.emit('stop_typing', {
      conversationId,
      userId: authUser._id,
    });
  },
}));