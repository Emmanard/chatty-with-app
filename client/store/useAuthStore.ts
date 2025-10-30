import { create } from 'zustand';
import { io } from 'socket.io-client';

const BASE_URL = 'https://chatty-with-app.onrender.com';

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
  setAuthUser: (user: AuthUser | null) => void;
  connectSocket: () => void;
  disconnectSocket: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  authUser: null,
  onlineUsers: [],
  socket: null,

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
    
    if (!authUser || get().socket?.connected) {
      return;
    }
    
    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
    });
    
    socket.connect();
    set({ socket: socket });

    socket.on('getOnlineUsers', (userIds) => {
      set({ onlineUsers: userIds });
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) {
      get().socket.disconnect();
    }
    set({ socket: null, onlineUsers: [] });
  },
}));