import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from '../store/useAuthStore';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';

// =======================
// INTERFACES
// =======================
interface AuthUser {
  _id: string;
  fullName: string;
  email: string;
  profilePic?: string;
  createdAt: string;
  isEmailVerified?: boolean;
}

interface SignupData {
  fullName: string;
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface UpdateProfileData {
  profilePic: string;
}

// =======================
// HELPER - error message extractor
// =======================
const getErrorMessage = (error: any, fallback: string) => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.status === 401) return 'You are not logged in. Please log in to continue.';
  if (error?.response?.status === 403) return 'You do not have permission to perform this action.';
  if (error?.message) return error.message;
  return fallback;
};

// =======================
// CHECK AUTH
// =======================
export const useCheckAuth = () => {
  const { setAuthUser } = useAuthStore();

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get<AuthUser>('/auth/check');
        return res.data;
      } catch (error: any) {
        // 401 means not authenticated - this is expected when logged out
        if (error?.response?.status === 401) {
          console.log('No active session');
          return null;
        }
        
        // Other errors should be logged
        const message = getErrorMessage(error, 'Failed to verify authentication.');
        console.error('Auth check failed:', message);
        throw error;
      }
    },
    retry: false, // Don't retry auth checks
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// =======================
// SIGNUP
// =======================
export const useSignup = () => {
  const { setAuthUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SignupData) => {
      const res = await axiosInstance.post<AuthUser>('/auth/signup', data);
      return res.data;
    },
    onSuccess: (data) => {
      // Set auth state
      setAuthUser(data);
      queryClient.setQueryData(['auth', 'me'], data);
      
      // Show success message
      Toast.show({ 
        type: 'success', 
        text1: 'Account created successfully' 
      });
      
      // Navigate to main app
      router.replace('/(tabs)');
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: getErrorMessage(error, 'Signup failed'),
      });
    },
  });
};

// =======================
// LOGIN
// =======================
export const useLogin = () => {
  const { setAuthUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LoginData) => {
      const res = await axiosInstance.post<AuthUser>('/auth/login', data);
      return res.data;
    },
    onSuccess: (data) => {
      // Set auth state FIRST
      setAuthUser(data);
      queryClient.setQueryData(['auth', 'me'], data);
      
      // Invalidate users query to refetch with new auth
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      // Show success message
      Toast.show({ 
        type: 'success', 
        text1: 'Logged in successfully' 
      });
      
      // Navigate to main app
      router.replace('/(tabs)');
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: getErrorMessage(error, 'Login failed'),
      });
    },
  });
};

// =======================
// LOGOUT
// =======================
export const useLogout = () => {
  const { setAuthUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await axiosInstance.post('/auth/logout');
    },
    onSuccess: () => {
      // Clear auth state FIRST
      setAuthUser(null);
      
      // Clear all queries
      queryClient.clear();
      
      // Show success message
      Toast.show({ 
        type: 'success', 
        text1: 'Logged out successfully' 
      });
      
      // Navigate to login
      router.replace('/(auth)/login');
    },
    onError: (error: any) => {
      // Even if logout fails on server, clear local state
      setAuthUser(null);
      queryClient.clear();
      
      Toast.show({
        type: 'error',
        text1: getErrorMessage(error, 'Logout failed'),
      });
      
      // Still navigate to login
      router.replace('/(auth)/login');
    },
  });
};

// =======================
// UPDATE PROFILE
// =======================
export const useUpdateProfile = () => {
  const { setAuthUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const res = await axiosInstance.put<AuthUser>('/auth/update-profile', data);
      return res.data;
    },
    onSuccess: (data) => {
      // Update auth state
      setAuthUser(data);
      queryClient.setQueryData(['auth', 'me'], data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      Toast.show({ 
        type: 'success', 
        text1: 'Profile updated successfully' 
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: getErrorMessage(error, 'Profile update failed'),
      });
    },
  });
};