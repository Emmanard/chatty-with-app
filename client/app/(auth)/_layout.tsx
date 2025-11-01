import React from "react";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

export default function AuthLayout() {
  const isDark = useColorScheme() === "dark";

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: isDark ? "#121212" : "#f9fafb" }, // background for stack screens
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="otp" />
    </Stack>
  );
}
