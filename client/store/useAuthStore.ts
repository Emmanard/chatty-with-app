import { create } from 'zustand';
import { axiosInstance } from '../lib/axios';
import Toast from 'react-native-toast-message';
import { io } from 'socket.io-client';
import { router } from 'expo-router';

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
  isSigningUp: boolean;
  isLoggingIn: boolean;
  isUpdatingProfile: boolean;
  isCheckingAuth: boolean;
  isVerifyingOTP: boolean;
  isResendingOTP: boolean;
  onlineUsers: string[];
  socket: any;
  checkAuth: () => Promise<void>;
  signup: (data: { fullName: string; email: string; password: string }) => Promise<void>;
  login: (data: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { profilePic: string }) => Promise<void>;
  verifyOTP: (data: { email: string; otp: string }) => Promise<boolean>;
  resendOTP: (email: string) => Promise<boolean>;
  connectSocket: () => void;
  disconnectSocket: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  isVerifyingOTP: false,
  isResendingOTP: false,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get('/auth/check');
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post('/auth/signup', data);
      
      Toast.show({ 
        type: 'success', 
        text1: 'Account created!',
        text2: 'Please check your email for verification code'
      });
      
      router.push({
        pathname: '/(auth)/otp',
        params: { email: data.email }
      });
      
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.response?.data?.message || 'Signup failed' });
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post('/auth/login', data);
      
      if (res.data.requiresEmailVerification) {
        Toast.show({ 
          type: 'info', 
          text1: 'Email verification required',
          text2: 'Please check your email for verification code'
        });
        router.push({
          pathname: '/(auth)/otp',
          params: { email: data.email }
        });
      } else {
        set({ authUser: res.data });
        Toast.show({ type: 'success', text1: 'Logged in successfully' });
        get().connectSocket();
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.response?.data?.message || 'Login failed' });
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post('/auth/logout');
      set({ authUser: null });
      Toast.show({ type: 'success', text1: 'Logged out successfully' });
      get().disconnectSocket();
      router.replace('/(auth)/login');
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.response?.data?.message || 'Logout failed' });
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put('/auth/update-profile', data);
      set({ authUser: res.data });
      Toast.show({ type: 'success', text1: 'Profile updated successfully' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.response?.data?.message || 'Update failed' });
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  verifyOTP: async (data) => {
    set({ isVerifyingOTP: true });
    try {
      const res = await axiosInstance.post('/auth/verify-otp', data);
      set({ authUser: res.data });
      Toast.show({ type: 'success', text1: 'Email verified successfully' });
      get().connectSocket();
      router.replace('/(tabs)');
      return true;
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.response?.data?.message || 'Invalid OTP' });
      return false;
    } finally {
      set({ isVerifyingOTP: false });
    }
  },

  resendOTP: async (email) => {
    set({ isResendingOTP: true });
    try {
      await axiosInstance.post('/auth/resend-otp', { email });
      Toast.show({ type: 'success', text1: 'OTP sent successfully' });
      return true;
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.response?.data?.message || 'Failed to resend OTP' });
      return false;
    } finally {
      set({ isResendingOTP: false });
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