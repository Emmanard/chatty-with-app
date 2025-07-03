import { create } from 'zustand';
import Toast from 'react-native-toast-message';
import { axiosInstance } from '../lib/axios';
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

interface RecentConversation {
  _id: string;
  user: User;
  lastMessage: Message;
  unreadCount: number;
}

interface ChatStore {
  messages: Message[];
  users: User[];
  selectedUser: User | null;
  recentConversations: RecentConversation[];
  isUsersLoading: boolean;
  isMessagesLoading: boolean;
  getUsers: () => Promise<void>;
  getMessages: (userId: string) => Promise<void>;
  getRecentConversations: () => Promise<void>;
  sendMessage: (messageData: { text?: string; image?: string }) => Promise<void>;
  subscribeToMessages: () => void;
  unsubscribeFromMessages: () => void;
  setSelectedUser: (selectedUser: User | null) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  recentConversations: [],
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get('/messages/users');
      set({ users: res.data });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.response?.data?.message || 'Failed to load users' });
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getRecentConversations: async () => {
    try {
      const res = await axiosInstance.get('/messages/conversations');
      set({ recentConversations: res.data });
    } catch (error: any) {
      // Recent conversations endpoint not available
    }
  },

  getMessages: async (userId: string) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.response?.data?.message || 'Failed to load messages' });
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData: { text?: string; image?: string }) => {
    const { selectedUser, messages, recentConversations } = get();
    if (!selectedUser) return;

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      const newMessage: Message = res.data;

      set({ messages: [...messages, newMessage] });

      const updatedConversations = recentConversations.filter(
        conv => conv.user._id !== selectedUser._id
      );

      const newConversation: RecentConversation = {
        _id: selectedUser._id,
        user: selectedUser,
        lastMessage: newMessage,
        unreadCount: 0,
      };

      set({ recentConversations: [newConversation, ...updatedConversations] });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.response?.data?.message || 'Failed to send message' });
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, recentConversations } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on('newMessage', (newMessage: Message) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      const isMessageSentToSelectedUser = newMessage.receiverId === selectedUser._id;

      if (isMessageSentFromSelectedUser || isMessageSentToSelectedUser) {
        set({
          messages: [...get().messages, newMessage],
        });
      }

      if (isMessageSentFromSelectedUser) {
        const senderId = newMessage.senderId;
        const sender = get().users.find(user => user._id === senderId);

        if (sender) {
          const updatedConversations = recentConversations.filter(
            conv => conv.user._id !== senderId
          );

          const newConversation: RecentConversation = {
            _id: senderId,
            user: sender,
            lastMessage: newMessage,
            unreadCount: selectedUser._id === senderId ? 0 : 1,
          };

          set({ recentConversations: [newConversation, ...updatedConversations] });
        }
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off('newMessage');
    }
  },

  setSelectedUser: (selectedUser: User | null) => {
    set({ selectedUser });

    if (selectedUser) {
      const { recentConversations } = get();
      const updatedConversations = recentConversations.map(conv =>
        conv.user._id === selectedUser._id
          ? { ...conv, unreadCount: 0 }
          : conv
      );
      set({ recentConversations: updatedConversations });
    }
  },
}));