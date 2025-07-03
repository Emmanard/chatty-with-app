import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Modal, Text, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useChatStore } from "../../store/useChatStore";
import Sidebar from "../../components/Sidebar";
import NoChatSelected from "../../components/NoChatSelected";
import ChatContainer from "../../components/ChatContainer";
import { Plus, MessageCircle } from "lucide-react-native";
import { useAuthStore } from "../../store/useAuthStore";

export default function HomeScreen() {
  const { selectedUser, setSelectedUser, recentConversations, getRecentConversations } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [addPeopleVisible, setAddPeopleVisible] = useState(false);

  useEffect(() => {
    getRecentConversations();
  }, [getRecentConversations]);

  const formatLastMessageTime = (timestamp: string | number | Date): string => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Header with Add People button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity
            style={styles.addPeopleButton}
            onPress={() => setAddPeopleVisible(true)}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.addPeopleText}>Add People</Text>
          </TouchableOpacity>
        </View>

        {/* Add People Modal */}
<Modal
  animationType="slide"
  transparent={true}
  visible={addPeopleVisible}
  onRequestClose={() => setAddPeopleVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.sidebarContainer}>
      <Sidebar 
        onUserSelect={() => setAddPeopleVisible(false)} 
        onClose={() => {
          console.log("Closing sidebar...");
          setAddPeopleVisible(false);
        }}
      />
    </View>
  </View>
</Modal>

        {/* Main Content */}
        {selectedUser ? (
          <ChatContainer />
        ) : recentConversations.length > 0 ? (
          <View style={styles.conversationsContainer}>
            <ScrollView style={styles.conversationsList} showsVerticalScrollIndicator={false}>
              {recentConversations.map((conversation) => (
                <TouchableOpacity
                  key={conversation._id}
                  style={styles.conversationItem}
                  onPress={() => setSelectedUser(conversation.user)}
                >
                  <View style={styles.conversationAvatarContainer}>
                    <Image
                      source={{
                        uri: conversation.user.profilePic || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg',
                      }}
                      style={styles.conversationAvatar}
                    />
                    {onlineUsers.includes(conversation.user._id) && (
                      <View style={styles.onlineIndicator} />
                    )}
                  </View>
                  
                  <View style={styles.conversationContent}>
                    <View style={styles.conversationHeader}>
                      <Text style={styles.conversationName} numberOfLines={1}>
                        {conversation.user.fullName}
                      </Text>
                      <Text style={styles.conversationTime}>
                        {formatLastMessageTime(conversation.lastMessage.createdAt)}
                      </Text>
                    </View>
                    
                    <View style={styles.conversationLastMessage}>
                      {conversation.lastMessage.image && !conversation.lastMessage.text ? (
                        <View style={styles.imageMessageIndicator}>
                          <MessageCircle size={14} color="#6b7280" />
                          <Text style={styles.lastMessageText}>Photo</Text>
                        </View>
                      ) : (
                        <Text style={styles.lastMessageText} numberOfLines={1}>
                          {conversation.lastMessage.text || "Photo"}
                        </Text>
                      )}
                      {conversation.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadCount}>
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <NoChatSelected />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f1f1f1" 
  },
  header: {
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
  },
  addPeopleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addPeopleText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  sidebarContainer: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: 60,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  conversationsContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  conversationAvatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  conversationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    backgroundColor: "#10b981",
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "white",
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
    flex: 1,
  },
  conversationTime: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 8,
  },
  conversationLastMessage: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  imageMessageIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  lastMessageText: {
    fontSize: 14,
    color: "#6b7280",
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadCount: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});