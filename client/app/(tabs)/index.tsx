import React, { useState } from "react";
import { 
  View, StyleSheet, TouchableOpacity, Modal, Text, Image, FlatList, useColorScheme 
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

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Colors depending on theme
  const colors = {
    background: isDark ? "#121212" : "#f1f1f1",
    headerBg: isDark ? "#1f1f1f" : "#fff",
    headerBorder: isDark ? "#272727" : "#e5e7eb",
    toggleBg: isDark ? "#272727" : "#f3f4f6",
    toggleActive: "#3b82f6",
    toggleText: isDark ? "#3b82f6" : "#3b82f6",
    text: isDark ? "#f9fafb" : "#111827",
    subText: isDark ? "#9ca3af" : "#6b7280",
    modalBg: isDark ? "#1f1f1f" : "#fff",
    unreadBadge: "#3b82f6",
    emptyIcon: isDark ? "#6b7280" : "#d1d5db",
  };

  const formatLastMessageTime = (timestamp: string | number | Date): string => {
    if (!timestamp) return '';
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return "now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  if (selectedUser) return <ChatContainer />;
  if (selectedGroup) return <GroupChatContainer />;

  const renderConversationItem = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.conversationItem, { borderBottomColor: colors.headerBorder }]}
      onPress={() => {
        setSelectedGroup(null);
        setSelectedUser(item.user);
      }}
    >
      <View style={styles.conversationAvatarContainer}>
        <Image
          source={{ uri: item.user.profilePic || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg' }}
          style={styles.conversationAvatar}
        />
        {onlineUsers.includes(item.user._id) && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.conversationName, { color: colors.text }]} numberOfLines={1}>
            {item.user.fullName}
          </Text>
          <Text style={[styles.conversationTime, { color: colors.subText }]}>
            {formatLastMessageTime(item.lastMessage?.createdAt)}
          </Text>
        </View>

        <View style={styles.conversationLastMessage}>
          <Text style={[styles.lastMessageText, { color: colors.subText }]} numberOfLines={1}>
            {item.lastMessage?.text || "Photo"}
          </Text>
          {item.unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.unreadBadge }]}>
              <Text style={styles.unreadCount}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderGroupItem = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.conversationItem, { borderBottomColor: colors.headerBorder }]}
      onPress={() => {
        setSelectedUser(null);
        setSelectedGroup(item);
      }}
    >
      <View style={styles.conversationAvatarContainer}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.conversationAvatar} />
        ) : (
          <View style={[styles.groupAvatarPlaceholder, { backgroundColor: colors.toggleBg }]}>
            <Users size={24} color={colors.toggleActive} />
          </View>
        )}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.conversationName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.conversationTime, { color: colors.subText }]}>{formatLastMessageTime(item.lastMessageAt)}</Text>
        </View>

        <View style={styles.conversationLastMessage}>
          <Text style={[styles.lastMessageText, { color: colors.subText }]} numberOfLines={1}>
            {item.lastMessageText || "No messages yet"}
          </Text>
          {item.unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.unreadBadge }]}>
              <Text style={styles.unreadCount}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.participantCount, { color: colors.subText }]}>
          {item.participantCount} {item.participantCount === 1 ? 'member' : 'members'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={[styles.toggleButton, !showGroups && { backgroundColor: colors.toggleActive }]}
              onPress={() => setShowGroups(false)}
            >
              <MessageCircle size={18} color={!showGroups ? "#fff" : colors.toggleActive} />
              <Text style={[styles.toggleText, !showGroups && { color: "#fff" }]}>Chats</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleButton, showGroups && { backgroundColor: colors.toggleActive }]}
              onPress={() => setShowGroups(true)}
            >
              <Users size={18} color={showGroups ? "#fff" : colors.toggleActive} />
              <Text style={[styles.toggleText, showGroups && { color: "#fff" }]}>Groups</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.toggleActive }]}
            onPress={() => showGroups ? setCreateGroupVisible(true) : setAddPeopleVisible(true)}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Modals */}
        <Modal
          animationType="slide"
          transparent
          visible={addPeopleVisible}
          onRequestClose={() => setAddPeopleVisible(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.3)" }]}>
            <View style={[styles.sidebarContainer, { backgroundColor: colors.modalBg }]}>
              <Sidebar 
                onUserSelect={() => setAddPeopleVisible(false)}
                onClose={() => setAddPeopleVisible(false)}
              />
            </View>
          </View>
        </Modal>

        <Modal
          animationType="slide"
          transparent
          visible={createGroupVisible}
          onRequestClose={() => setCreateGroupVisible(false)}
        >
          <CreateGroupModal onClose={() => setCreateGroupVisible(false)} />
        </Modal>

        {/* Content */}
        {!showGroups ? (
          recentConversations.length > 0 ? (
            <FlatList
              data={recentConversations}
              keyExtractor={(item) => item._id}
              renderItem={renderConversationItem}
            />
          ) : (
            <NoChatSelected />
          )
        ) : groups.length > 0 ? (
          <FlatList
            data={groups}
            keyExtractor={(item) => item._id}
            renderItem={renderGroupItem}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Users size={64} color={colors.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No groups yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.subText }]}>
              Create a group to start chatting with multiple people
            </Text>
            <TouchableOpacity
              style={[styles.createGroupButton, { backgroundColor: colors.toggleActive }]}
              onPress={() => setCreateGroupVisible(true)}
            >
              <Plus size={20} color="#fff" />
              <Text style={styles.createGroupButtonText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerLeft: { flexDirection: "row", gap: 8 },
  toggleButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  toggleText: { fontSize: 14, fontWeight: "500" },
  addButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1 },
  sidebarContainer: { flex: 1, marginTop: 60, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  conversationItem: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  conversationAvatarContainer: { position: "relative", marginRight: 12 },
  conversationAvatar: { width: 50, height: 50, borderRadius: 25 },
  groupAvatarPlaceholder: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  onlineIndicator: { position: "absolute", bottom: 2, right: 2, width: 12, height: 12, backgroundColor: "#10b981", borderRadius: 6, borderWidth: 2, borderColor: "white" },
  conversationContent: { flex: 1 },
  conversationHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  conversationName: { fontSize: 16, fontWeight: "500", flex: 1 },
  conversationTime: { fontSize: 12, marginLeft: 8 },
  conversationLastMessage: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lastMessageText: { fontSize: 14, flex: 1 },
  participantCount: { fontSize: 12, marginTop: 2 },
  unreadBadge: { borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, marginLeft: 8 },
  unreadCount: { color: "#fff", fontSize: 12, fontWeight: "600" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: "600", marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: "center" },
  createGroupButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginTop: 24, gap: 8 },
  createGroupButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
