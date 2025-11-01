import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { ArrowLeft, Users } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { useGroupStore } from '../store/useGroupStore';

export default function ChatHeader() {
  const { selectedUser, setSelectedUser, typingUsers, subscribeToTyping, unsubscribeFromTyping } = useChatStore();
  const { selectedGroup, setSelectedGroup, typingUsersInGroup } = useGroupStore();
  const { onlineUsers, authUser } = useAuthStore();

  // Determine mode
  const isGroup = !!selectedGroup;

  // Subscribe/unsubscribe to typing events safely
  useEffect(() => {
    subscribeToTyping?.();
    return () => unsubscribeFromTyping?.();
  }, [subscribeToTyping, unsubscribeFromTyping]);

  // Guard: nothing selected
  if (!selectedUser && !selectedGroup) return null;

  // Display info
  const displayName = isGroup ? selectedGroup?.name : selectedUser?.fullName || '';
  const displayImage = isGroup ? selectedGroup?.avatar : selectedUser?.profilePic;

  // Online status (1:1 only)
  const isUserOnline = !isGroup && selectedUser?._id
    ? onlineUsers.includes(String(selectedUser._id))
    : false;

  // Typing text
  let typingText = '';
  if (isGroup && selectedGroup) {
    const typingUserIds = typingUsersInGroup[selectedGroup._id] || [];
    const othersTyping = typingUserIds.filter(id => id !== authUser?._id);

    if (othersTyping.length > 0) {
      if (othersTyping.length === 1) {
        const user = selectedGroup.participantIds.find(p => p._id === othersTyping[0]);
        typingText = `${user?.fullName || 'Someone'} is typing...`;
      } else if (othersTyping.length === 2) {
        const user1 = selectedGroup.participantIds.find(p => p._id === othersTyping[0]);
        const user2 = selectedGroup.participantIds.find(p => p._id === othersTyping[1]);
        typingText = `${user1?.fullName || 'Someone'} and ${user2?.fullName || 'Someone'} are typing...`;
      } else {
        typingText = `${othersTyping.length} people are typing...`;
      }
    }
  } else if (selectedUser?._id && typingUsers[selectedUser._id]) {
    typingText = 'typing...';
  }

  const subtitle = isGroup 
    ? `${selectedGroup?.participantCount || 0} members`
    : isUserOnline ? 'Online' : 'Offline';

  const handleBack = () => {
    if (isGroup) setSelectedGroup?.(null);
    else setSelectedUser?.(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.userInfo}>
          {displayImage ? (
            <Image source={{ uri: displayImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              {isGroup ? <Users size={20} color="#3b82f6" /> : <Text style={styles.avatarText}>{displayName.charAt(0)?.toUpperCase()}</Text>}
            </View>
          )}
          <View>
            <Text style={styles.userName}>{displayName}</Text>
            {typingText ? (
              <Text style={styles.typingText}>{typingText}</Text>
            ) : (
              <Text style={[styles.userStatus, !isGroup && isUserOnline && styles.onlineStatus]}>{subtitle}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '600', color: '#3b82f6' },
  userName: { fontSize: 16, fontWeight: '500', color: '#111827', marginBottom: 2 },
  userStatus: { fontSize: 14, color: '#6b7280' },
  onlineStatus: { color: '#10b981' },
  typingText: { fontSize: 14, color: '#3b82f6', fontStyle: 'italic' },
  closeButton: { padding: 4 },
});
