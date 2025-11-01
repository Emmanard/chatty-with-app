import React, { useState } from "react";
import { StyleSheet, View, ActivityIndicator, Platform, ToastAndroid, Alert, useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";

import { useFrameworkReady } from "../hooks/useFrameworkReady";
import { useCheckAuth } from "../hooks/useAuth";

export default function RootLayout() {
  const [queryClient] = useState(() => {
    const queryCache = new QueryCache({
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : "Something went wrong while fetching data.";
        if (Platform.OS === "android") ToastAndroid.show(message, ToastAndroid.SHORT);
        else Alert.alert("Error", message);
      },
    });

    return new QueryClient({
      queryCache,
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 2,
          gcTime: 1000 * 60 * 3,
          retry: 2,
          refetchOnWindowFocus: false,
          placeholderData: (prev: unknown) => prev,
        },
      },
    });
  });

  useFrameworkReady();

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

function AppContent() {
  const { isLoading: isCheckingAuth } = useCheckAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const backgroundColor = isDark ? "#121212" : "#f9fafb";
  const indicatorColor = isDark ? "#0ea5e9" : "#3b82f6";

  if (isCheckingAuth) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <ActivityIndicator size="large" color={indicatorColor} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={backgroundColor} />
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
