import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  useColorScheme,
} from 'react-native';
import { LogOut } from 'lucide-react-native';
import { useLogout } from '../../hooks/useAuth';

export default function SettingsScreen() {
  const logoutMutation = useLogout();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: () => logoutMutation.mutate() 
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? '#1f1f1f' : '#f9fafb' },
      ]}
    >
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            { color: isDark ? '#f9fafb' : '#111827' },
          ]}
        >
          Settings
        </Text>
        <TouchableOpacity
          style={[
            styles.logoutButton,
            { backgroundColor: logoutMutation.isPending ? '#b91c1c' : '#ef4444' },
          ]}
          onPress={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut size={18} color="#fff" />
          <Text style={styles.logoutText}>
            {logoutMutation.isPending ? 'Logging out...' : 'Log Out'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 32,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
