import { create } from 'zustand';
import { io } from 'socket.io-client';
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';

const BASE_URL = Constants.expoConfig?.extra?.BASE_URL;

interface AuthUser {
  _id: string;
  fullName: string;
  email: string;
  profilePic?: string;
  createdAt: string;
  isEmailVerified?: boolean;
}

interface AuthStore {
  authUser: AuthUser | null;
  onlineUsers: string[];
  socket: any;
  isOnline: boolean;
  netInfoUnsubscribe: (() => void) | null; // 🆕 Store unsubscribe function here
  setAuthUser: (user: AuthUser | null) => void;
  connectSocket: () => void;
  disconnectSocket: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  authUser: null,
  onlineUsers: [],
  socket: null,
  isOnline: true,
  netInfoUnsubscribe: null, // 🆕 Initialize to null

  setAuthUser: (user) => {
    set({ authUser: user });
    if (user) {
      get().connectSocket();
    } else {
      get().disconnectSocket();
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const SOCKET_URL = BASE_URL.replace('/api', '');

    const socket = io(SOCKET_URL, {
      query: { userId: authUser._id },
      transports: ['websocket'],
      autoConnect: true,
    });

    set({ socket });

    // Listen for socket connection events
    socket.on('connect', () => {
      console.log('✅ Socket connected');
      set({ isOnline: true });
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      set({ isOnline: false });
    });

    socket.on('connect_error', (error) => {
      console.log('⚠️ Socket connection error:', error);
      set({ isOnline: false });
    });

    socket.on('getOnlineUsers', (userIds: string[]) => {
      set({ onlineUsers: userIds });
    });

    // Listen for network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const networkOnline = state.isConnected && state.isInternetReachable;
      
      if (networkOnline && !socket.connected) {
        console.log('🔄 Network restored, reconnecting socket...');
        socket.connect();
      } else if (!networkOnline) {
        console.log('📡 Network lost');
        set({ isOnline: false });
      }
    });

    // 🆕 Store unsubscribe in the store instead of on socket
    set({ netInfoUnsubscribe: unsubscribe });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    const netInfoUnsubscribe = get().netInfoUnsubscribe; // 🆕 Get from store
    
    // 🆕 Clean up NetInfo listener
    if (netInfoUnsubscribe) {
      netInfoUnsubscribe();
      set({ netInfoUnsubscribe: null });
    }
    
    if (socket?.connected) {
      socket.disconnect();
    }
    set({ socket: null, onlineUsers: [], isOnline: false });
  },
}));