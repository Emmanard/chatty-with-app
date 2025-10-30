import { useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Platform,
  ToastAndroid,
  Alert,
} from "react-native";
import Toast from "react-native-toast-message";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
} from "@tanstack/react-query";
import { useFrameworkReady } from "../hooks/useFrameworkReady";
import { useCheckAuth } from "../hooks/useAuth";

export default function RootLayout() {
  const [queryClient] = useState(() => {
    const queryCache = new QueryCache({
      onError: (error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : "Something went wrong while fetching data.";

        if (Platform.OS === "android") {
          ToastAndroid.show(message, ToastAndroid.SHORT);
        } else {
          Alert.alert("Error", message);
        }
      },
    });

    return new QueryClient({
      queryCache,
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 2,
         cacheTime: 1000 * 60 * 5,
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
  // Now we can use React Query hooks because we're inside QueryClientProvider
  const { isLoading: isCheckingAuth } = useCheckAuth();

  if (isCheckingAuth) {
    return (
      <View style={styles.container}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
