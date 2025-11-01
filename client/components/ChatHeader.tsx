import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';

export default function ChatHeader() {
  const { selectedUser, setSelectedUser, typingUsers, subscribeToTyping, unsubscribeFromTyping } = useChatStore();
  const { onlineUsers } = useAuthStore();

  const isUserOnline = !!selectedUser?._id && onlineUsers.includes(String(selectedUser._id));
  const isTyping = selectedUser?._id ? typingUsers[selectedUser._id] : false;

  // Subscribe to typing events
  useEffect(() => {
    subscribeToTyping();
    return () => unsubscribeFromTyping();
  }, [subscribeToTyping, unsubscribeFromTyping]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.userInfo}>
          <Image
            source={{
              uri:
                selectedUser?.profilePic ||
                'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg',
            }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.userName}>{selectedUser?.fullName}</Text>
            {isTyping ? (
              <Text style={styles.typingText}>typing...</Text>
            ) : (
              <Text style={[styles.userStatus, isUserOnline && styles.onlineStatus]}>
                {isUserOnline ? 'Online' : 'Offline'}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedUser(null)}>
          <ArrowLeft size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  onlineStatus: {
    color: '#10b981',
  },
  typingText: {
    fontSize: 14,
    color: '#3b82f6',
    fontStyle: 'italic',
  },
  closeButton: {
    padding: 4,
  },
});