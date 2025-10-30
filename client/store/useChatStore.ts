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
  typingUsers: Record<string, boolean>; // userId -> isTyping
  setSelectedUser: (user: User | null) => void;
  subscribeToMessages: (onNewMessage: (message: Message) => void) => void;
  unsubscribeFromMessages: () => void;
  setTyping: (userId: string, isTyping: boolean) => void;
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
}));
