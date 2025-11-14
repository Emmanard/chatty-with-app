// types/group.ts

export interface User {
  _id: string;
  fullName: string;
  email: string;
  profilePic?: string;
}

export interface GroupMessage {
  _id: string;
  conversationId: string;
  senderId: string | User;
  text?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
  // Delivery tracking per user
  isDeliveredTo: Array<{
    userId: string;
    deliveredAt: string;
  }>;
  // Read receipts per user
  isSeenBy: Array<{
    userId: string;
    seenAt: string;
  }>;
  status:'sent' | 'delivered' | 'seen' | 'sending' | 'pending' | 'failed'; 
  deletedFor: string[];
    tempId?: string; 
  error?: string; 
  replyTo?: string;
  deliveryCount?: number;
  readCount?: number;
}

export interface Conversation {
  _id: string;
  isGroup: boolean;
  name: string;
  description: string;
  avatar: string;
  participantIds: User[];
  adminIds: string[];
  createdBy: string;
  lastMessageText: string;
  lastMessageSender?: User;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  participantCount: number;
  unreadCount?: number;
}

export interface GroupMessagesResponse {
  messages: GroupMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CreateGroupData {
  name: string;
  description?: string;
  participantIds: string[];
  avatar?: string;
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
  avatar?: string;
}

export interface SendGroupMessageData {
  text?: string;
  image?: string;
  replyTo?: string;
}