import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ImageBackground, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useFrameworkReady } from '../hooks/useFrameworkReady';
import { useAuthStore } from '../store/useAuthStore';
import Toast from 'react-native-toast-message';

// Use require() instead of import for the background image
const backgroundImage = require('../assets/images/Image_fx.jpg');

export default function RootLayout() {
  useFrameworkReady();
  const { checkAuth, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    // Only check auth once when component mounts
    checkAuth();
  }, []); // Empty dependency array to run only once

  // Show loading screen while checking auth
  if (isCheckingAuth) {
    return (
      <ImageBackground source={backgroundImage} style={styles.background}>
        <View style={styles.overlay}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={backgroundImage} style={styles.background}>
      <View style={styles.overlay}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
        <Toast />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Semi-transparent dark overlay
  },
});