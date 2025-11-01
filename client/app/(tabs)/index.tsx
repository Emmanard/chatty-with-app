import React, { useState } from "react";
import { 
  View, StyleSheet, TouchableOpacity, Modal, Text, ScrollView, Image 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, MessageCircle, Users } from "lucide-react-native";

import { useChatStore } from "../../store/useChatStore";
import { useGroupStore } from "../../store/useGroupStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useConversations } from "../../hooks/useChat";
import { useGroups } from "../../hooks/useGroup";

import Sidebar from "../../components/Sidebar";
import NoChatSelected from "../../components/NoChatSelected";
import ChatContainer from "../../components/ChatContainer";
import GroupChatContainer from "../../components/GroupChatContainer";
import CreateGroupModal from "../../components/CreateGroupModal";

export default function HomeScreen() {
  const selectedUser = useChatStore((state) => state.selectedUser);
  const setSelectedUser = useChatStore((state) => state.setSelectedUser);
  const selectedGroup = useGroupStore((state) => state.selectedGroup);
  const setSelectedGroup = useGroupStore((state) => state.setSelectedGroup);
  const onlineUsers = useAuthStore((state) => state.onlineUsers);

  const [addPeopleVisible, setAddPeopleVisible] = useState(false);
  const [createGroupVisible, setCreateGroupVisible] = useState(false);
  const [showGroups, setShowGroups] = useState(false);

  const { data: recentConversations = [] } = useConversations();
  const { data: groups = [] } = useGroups();

  const formatLastMessageTime = (timestamp?: string | number | Date): string => {
    if (!timestamp) return '';
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const renderUnreadBadge = (count?: number) => {
    const unread = count ?? 0;
    if (unread <= 0) return null;
    return (
      <View style={styles.unreadBadge}>
        <Text style={styles.unreadCount}>{unread > 99 ? '99+' : unread}</Text>
      </View>
    );
  };

  const renderConversationItem = (conversation: any) => {
    const lastMessage = conversation.lastMessage;
    return (
      <TouchableOpacity
        key={conversation._id}
        style={styles.conversationItem}
        onPress={() => {
          setSelectedGroup(null);
          setSelectedUser(conversation.user);
        }}
      >
        <View style={styles.conversationAvatarContainer}>
          <Image
            source={{ uri: conversation.user.profilePic || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg' }}
            style={styles.conversationAvatar}
          />
          {onlineUsers.includes(conversation.user._id) && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>{conversation.user.fullName}</Text>
            <Text style={styles.conversationTime}>{formatLastMessageTime(lastMessage?.createdAt)}</Text>
          </View>

          <View style={styles.conversationLastMessage}>
            <Text style={styles.lastMessageText} numberOfLines={1}>
              {lastMessage?.text || (lastMessage?.image ? 'Photo' : '')}
            </Text>
            {renderUnreadBadge(conversation.unreadCount)}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroupItem = (group: any) => {
    return (
      <TouchableOpacity
        key={group._id}
        style={styles.conversationItem}
        onPress={() => {
          setSelectedUser(null);
          setSelectedGroup(group);
        }}
      >
        <View style={styles.conversationAvatarContainer}>
          {group.avatar ? (
            <Image source={{ uri: group.avatar }} style={styles.conversationAvatar} />
          ) : (
            <View style={styles.groupAvatarPlaceholder}>
              <Users size={24} color="#3b82f6" />
            </View>
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>{group.name}</Text>
            <Text style={styles.conversationTime}>{formatLastMessageTime(group.lastMessageAt)}</Text>
          </View>

          <View style={styles.conversationLastMessage}>
            <Text style={styles.lastMessageText} numberOfLines={1}>
              {group.lastMessageText || "No messages yet"}
            </Text>
            {renderUnreadBadge(group.unreadCount)}
          </View>

          <Text style={styles.participantCount}>
            {group.participantCount} {group.participantCount === 1 ? 'member' : 'members'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (selectedUser) return <ChatContainer />;
  if (selectedGroup) return <GroupChatContainer />;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={[styles.toggleButton, !showGroups && styles.toggleButtonActive]}
              onPress={() => setShowGroups(false)}
            >
              <MessageCircle size={18} color={!showGroups ? "#fff" : "#3b82f6"} />
              <Text style={[styles.toggleText, !showGroups && styles.toggleTextActive]}>Chats</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleButton, showGroups && styles.toggleButtonActive]}
              onPress={() => setShowGroups(true)}
            >
              <Users size={18} color={showGroups ? "#fff" : "#3b82f6"} />
              <Text style={[styles.toggleText, showGroups && styles.toggleTextActive]}>Groups</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => showGroups ? setCreateGroupVisible(true) : setAddPeopleVisible(true)}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Modals */}
        <Modal animationType="slide" transparent visible={addPeopleVisible} onRequestClose={() => setAddPeopleVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.sidebarContainer}>
              <Sidebar onUserSelect={() => setAddPeopleVisible(false)} onClose={() => setAddPeopleVisible(false)} />
            </View>
          </View>
        </Modal>

        <Modal animationType="slide" transparent visible={createGroupVisible} onRequestClose={() => setCreateGroupVisible(false)}>
          <CreateGroupModal onClose={() => setCreateGroupVisible(false)} />
        </Modal>

        {/* Content */}
        {!showGroups ? (
          recentConversations.length > 0 ? (
            <ScrollView style={styles.conversationsList} showsVerticalScrollIndicator={false}>
              {recentConversations.map(renderConversationItem)}
            </ScrollView>
          ) : <NoChatSelected />
        ) : (
          groups.length > 0 ? (
            <ScrollView style={styles.conversationsList} showsVerticalScrollIndicator={false}>
              {groups.map(renderGroupItem)}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <Users size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No groups yet</Text>
              <Text style={styles.emptySubtitle}>Create a group to start chatting with multiple people</Text>
              <TouchableOpacity style={styles.createGroupButton} onPress={() => setCreateGroupVisible(true)}>
                <Plus size={20} color="#fff" />
                <Text style={styles.createGroupButtonText}>Create Group</Text>
              </TouchableOpacity>
            </View>
          )
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f1f1" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  headerLeft: { flexDirection: "row", gap: 8 },
  toggleButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f3f4f6", gap: 6 },
  toggleButtonActive: { backgroundColor: "#3b82f6" },
  toggleText: { fontSize: 14, fontWeight: "500", color: "#3b82f6" },
  toggleTextActive: { color: "#fff" },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#3b82f6", alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  sidebarContainer: { flex: 1, backgroundColor: "#fff", marginTop: 60, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  conversationsList: { flex: 1 },
  conversationItem: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  conversationAvatarContainer: { position: "relative", marginRight: 12 },
  conversationAvatar: { width: 50, height: 50, borderRadius: 25 },
  groupAvatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#e0f2fe", alignItems: "center", justifyContent: "center" },
  onlineIndicator: { position: "absolute", bottom: 2, right: 2, width: 12, height: 12, backgroundColor: "#10b981", borderRadius: 6, borderWidth: 2, borderColor: "white" },
  conversationContent: { flex: 1 },
  conversationHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  conversationName: { fontSize: 16, fontWeight: "500", color: "#111827", flex: 1 },
  conversationTime: { fontSize: 12, color: "#6b7280", marginLeft: 8 },
  conversationLastMessage: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lastMessageText: { fontSize: 14, color: "#6b7280", flex: 1 },
  participantCount: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  unreadBadge: { backgroundColor: "#3b82f6", borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, marginLeft: 8 },
  unreadCount: { color: "#fff", fontSize: 12, fontWeight: "600" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: "600", color: "#111827", marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: "#6b7280", marginTop: 8, textAlign: "center" },
  createGroupButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#3b82f6", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginTop: 24, gap: 8 },
  createGroupButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
