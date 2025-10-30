import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, X } from 'lucide-react-native';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUsers } from '../hooks/useChat';

export default function Sidebar({ 
  onUserSelect, 
  onClose 
}: { 
  onUserSelect?: () => void; 
  onClose?: () => void;
}) {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { data: users = [], isLoading: isUsersLoading } = useUsers();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  const handleClose = () => {
    console.log("Sidebar close button pressed");
    onClose?.();
  };

  if (isUsersLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Users size={24} color="#374151" />
            <Text style={styles.headerTitle}>Contacts</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerContent}>
            <Users size={24} color="#374151" />
            <Text style={styles.headerTitle}>Contacts</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setShowOnlineOnly(!showOnlineOnly)}
          >
            <View style={[styles.checkbox, showOnlineOnly && styles.checkboxChecked]}>
              {showOnlineOnly && <View style={styles.checkboxInner} />}
            </View>
            <Text style={styles.checkboxLabel}>Show online only</Text>
          </TouchableOpacity>
          <Text style={styles.onlineCount}>({onlineUsers.length - 1} online)</Text>
        </View>
      </View>

      <ScrollView style={styles.usersList}>
        {filteredUsers.map((user) => (
          <TouchableOpacity
            key={user._id}
            style={[
              styles.userItem,
              selectedUser?._id === user._id && styles.userItemSelected,
            ]}
            onPress={() => {
              setSelectedUser(user);
              onUserSelect?.();
            }}
          >
            <View style={styles.userAvatarContainer}>
              <Image
                source={{
                  uri: user.profilePic || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg',
                }}
                style={styles.userAvatar}
              />
              {onlineUsers.includes(user._id) && <View style={styles.onlineIndicator} />}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.fullName}</Text>
              <Text style={styles.userStatus}>
                {onlineUsers.includes(user._id) ? 'Online' : 'Offline'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        {filteredUsers.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No online users</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: 'white',
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkboxInner: {
    width: 8,
    height: 8,
    backgroundColor: 'white',
    borderRadius: 1,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },
  onlineCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  usersList: {
    flex: 1,
    paddingVertical: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  userItemSelected: {
    backgroundColor: '#f3f4f6',
  },
  userAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    backgroundColor: '#10b981',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  userStatus: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
});