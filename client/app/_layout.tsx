import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '../hooks/useFrameworkReady';
import { useAuthStore } from '../store/useAuthStore';
import Toast from 'react-native-toast-message';

export default function RootLayout() {
  useFrameworkReady();
  const { checkAuth, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    // Only check auth once when component mounts
    checkAuth();
  }, []); // Empty dependency array to run only once

  // Optional: You can add a loading screen while checking auth
  // if (isCheckingAuth) {
  //   return (
  //     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
  //       <ActivityIndicator size="large" />
  //     </View>
  //   );
  // }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
      <Toast />
    </>
  );
}