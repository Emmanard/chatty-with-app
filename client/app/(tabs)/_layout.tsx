import React from "react";
import { Tabs, Redirect } from "expo-router";
import { MessageSquare, Settings, User } from "lucide-react-native";
import { useAuthStore } from "../../store/useAuthStore";
import { useColorScheme } from "react-native";

export default function TabLayout() {
  const { authUser } = useAuthStore();
  const isDark = useColorScheme() === "dark";

  if (!authUser) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: {
          backgroundColor: isDark ? "#121212" : "#fff",
          borderTopWidth: 1,
          borderTopColor: isDark ? "#333" : "#e5e7eb",
        },
        
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Chat",
          tabBarIcon: ({ size, color }) => <MessageSquare size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ size, color }) => <Settings size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
