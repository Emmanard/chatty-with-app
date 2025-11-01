import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js"; 
import GroupMessage from "../models/groupMessage.model.js"; 
import Conversation from "../models/conversation.model.js"; 

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"]  
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// Store online users
const userSocketMap = {}; // {userId: socketId}

// Store typing states per conversation (supports both 1:1 and groups)
const typingUsers = {}; // {conversationId: {userId: timeout}}

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  
  if (userId && userId !== 'undefined') {
    userSocketMap[userId] = socket.id;
    
    // Auto-mark undelivered messages as delivered (1:1 - EXISTING)
    markUndeliveredMessagesAsDelivered(userId);
    
    // Auto-mark undelivered GROUP messages as delivered (NEW)
    markUndeliveredGroupMessagesAsDelivered(userId);
  }
  
  // Emit online users to all clients
  const onlineUsers = Object.keys(userSocketMap);
  io.emit("getOnlineUsers", onlineUsers);

// ============================================
// TYPING INDICATORS (Works for BOTH 1:1 and Groups)
// ============================================

socket.on("typing", async ({ conversationId, userId: typingUserId, isGroup }) => {
  console.log(`👤 User ${typingUserId} is typing in ${isGroup ? 'group' : '1:1'} ${conversationId}`);

  try {
    // Clear existing timeout if any
    if (typingUsers[conversationId]?.[typingUserId]) {
      clearTimeout(typingUsers[conversationId][typingUserId]);
    }

    if (!typingUsers[conversationId]) {
      typingUsers[conversationId] = {};
    }

    // ✅ Create an async wrapper for the timeout logic
    typingUsers[conversationId][typingUserId] = setTimeout(async () => {
      delete typingUsers[conversationId][typingUserId];

      // Notify others that typing stopped
      try {
        if (isGroup) {
          const conversation = await Conversation.findById(conversationId);
          if (conversation) {
            const otherParticipants = conversation.participantIds.filter(
              id => id.toString() !== typingUserId
            );
            for (const participantId of otherParticipants) {
              const socketId = getReceiverSocketId(participantId.toString());
              if (socketId) {
                io.to(socketId).emit("user_typing", {
                  conversationId,
                  userId: typingUserId,
                  isTyping: false,
                  isGroup: true
                });
              }
            }
          }
        } else {
          // 1:1 chat
          const otherUserId = conversationId.replace(typingUserId, "").replace("_", "");
          const otherUserSocketId = getReceiverSocketId(otherUserId);
          if (otherUserSocketId) {
            io.to(otherUserSocketId).emit("user_typing", {
              conversationId,
              userId: typingUserId,
              isTyping: false,
              isGroup: false
            });
          }
        }
      } catch (err) {
        console.error("Error inside typing timeout:", err);
      }
    }, 3000);

    // Notify participants immediately (user started typing)
    if (isGroup) {
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        const otherParticipants = conversation.participantIds.filter(
          id => id.toString() !== typingUserId
        );
        for (const participantId of otherParticipants) {
          const socketId = getReceiverSocketId(participantId.toString());
          if (socketId) {
            io.to(socketId).emit("user_typing", {
              conversationId,
              userId: typingUserId,
              isTyping: true,
              isGroup: true
            });
          }
        }
      }
    } else {
      // 1:1 chat
      const participantIds = conversationId.split("_");
      const otherUserId = participantIds.find(id => id !== typingUserId);
      if (otherUserId) {
        const socketId = getReceiverSocketId(otherUserId);
        if (socketId) {
          io.to(socketId).emit("user_typing", {
            conversationId,
            userId: typingUserId,
            isTyping: true,
            isGroup: false
          });
        }
      }
    }
  } catch (error) {
    console.error("Error in typing event:", error);
  }
});


// ============================================
// STOP TYPING
// ============================================

socket.on("stop_typing", async ({ conversationId, userId: typingUserId, isGroup }) => {
  console.log(`👤 User ${typingUserId} stopped typing in ${isGroup ? 'group' : '1:1'} ${conversationId}`);

  try {
    if (typingUsers[conversationId]?.[typingUserId]) {
      clearTimeout(typingUsers[conversationId][typingUserId]);
      delete typingUsers[conversationId][typingUserId];
    }

    // Notify participants
    if (isGroup) {
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        const otherParticipants = conversation.participantIds.filter(
          id => id.toString() !== typingUserId
        );
        for (const participantId of otherParticipants) {
          const socketId = getReceiverSocketId(participantId.toString());
          if (socketId) {
            io.to(socketId).emit("user_typing", {
              conversationId,
              userId: typingUserId,
              isTyping: false,
              isGroup: true
            });
          }
        }
      }
    } else {
      const participantIds = conversationId.split("_");
      const otherUserId = participantIds.find(id => id !== typingUserId);
      if (otherUserId) {
        const socketId = getReceiverSocketId(otherUserId);
        if (socketId) {
          io.to(socketId).emit("user_typing", {
            conversationId,
            userId: typingUserId,
            isTyping: false,
            isGroup: false
          });
        }
      }
    }
  } catch (error) {
    console.error("Error in stop_typing event:", error);
  }
});


  // ============================================
  // GROUP READ RECEIPTS (NEW)
  // ============================================

  socket.on("mark_group_as_seen", async ({ groupId, userId: viewerId }) => {
    try {
      console.log(`👁️ User ${viewerId} viewed group ${groupId}`);
      
      const conversation = await Conversation.findById(groupId);
      if (!conversation) return;

      // Find unread messages in this group
      const unreadMessages = await GroupMessage.find({
        conversationId: groupId,
        senderId: { $ne: viewerId },
        'isSeenBy.userId': { $ne: viewerId }
      });

      if (unreadMessages.length === 0) return;

      // Mark as seen
      const seenEntry = {
        userId: viewerId,
        seenAt: new Date()
      };

      await GroupMessage.updateMany(
        {
          conversationId: groupId,
          senderId: { $ne: viewerId },
          'isSeenBy.userId': { $ne: viewerId }
        },
        {
          $push: { isSeenBy: seenEntry },
          $set: { status: 'seen' }
        }
      );

      // Notify senders
      const senderIds = [...new Set(unreadMessages.map(m => m.senderId.toString()))];

      senderIds.forEach(senderId => {
        const senderSocketId = getReceiverSocketId(senderId);
        if (senderSocketId) {
          const senderMessages = unreadMessages
            .filter(m => m.senderId.toString() === senderId)
            .map(m => m._id.toString());

          io.to(senderSocketId).emit("group_messages_seen", {
            groupId,
            messageIds: senderMessages,
            seenBy: viewerId,
            seenAt: new Date()
          });
        }
      });

      console.log(`✅ Marked ${unreadMessages.length} group messages as seen`);
    } catch (error) {
      console.error("Error marking group messages as seen:", error);
    }
  });

  // ============================================
  // 1:1 READ RECEIPTS (EXISTING - UNCHANGED)
  // ============================================

  socket.on("mark_as_seen", async ({ conversationId, userId: viewerId }) => {
    try {
      console.log(`👁️ User ${viewerId} viewed 1:1 conversation ${conversationId}`);
      
      const participantIds = conversationId.split('_');
      const senderId = participantIds.find(id => id !== viewerId);
      
      if (!senderId) return;

      const unreadMessages = await Message.find({
        senderId: senderId,
        receiverId: viewerId,
        isSeenBy: { $ne: viewerId }
      });

      if (unreadMessages.length === 0) return;

      await Message.updateMany(
        {
          senderId: senderId,
          receiverId: viewerId,
          isSeenBy: { $ne: viewerId }
        },
        {
          $addToSet: { isSeenBy: viewerId },
          $set: { status: 'seen' }
        }
      );

      const senderSocketId = getReceiverSocketId(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messages_seen", {
          conversationId,
          messageIds: unreadMessages.map(m => m._id.toString()),
          seenBy: viewerId,
          seenAt: new Date()
        });
      }

      console.log(`✅ Marked ${unreadMessages.length} 1:1 messages as seen`);
    } catch (error) {
      console.error("Error marking 1:1 messages as seen:", error);
    }
  });

  // ============================================
  // DISCONNECT
  // ============================================
  socket.on("disconnect", () => {
    if (userId) {
      delete userSocketMap[userId];
      
      // Clear typing states
      Object.keys(typingUsers).forEach(conversationId => {
        if (typingUsers[conversationId][userId]) {
          clearTimeout(typingUsers[conversationId][userId]);
          delete typingUsers[conversationId][userId];
        }
      });
    }
    
    const onlineUsers = Object.keys(userSocketMap);
    io.emit("getOnlineUsers", onlineUsers);
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Auto-mark undelivered 1:1 messages as delivered (EXISTING - UNCHANGED)
 */
async function markUndeliveredMessagesAsDelivered(userId) {
  try {
    const undeliveredMessages = await Message.find({
      receiverId: userId,
      isDeliveredTo: { $ne: userId }
    });

    if (undeliveredMessages.length === 0) return;

    await Message.updateMany(
      {
        receiverId: userId,
        isDeliveredTo: { $ne: userId }
      },
      {
        $addToSet: { isDeliveredTo: userId },
        $set: { status: 'delivered' }
      }
    );

    undeliveredMessages.forEach(msg => {
      const senderSocketId = getReceiverSocketId(msg.senderId.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit("message_delivered", {
          messageId: msg._id.toString(),
          deliveredTo: userId,
          deliveredAt: new Date()
        });
      }
    });

    console.log(`📬 Auto-delivered ${undeliveredMessages.length} 1:1 messages to user ${userId}`);
  } catch (error) {
    console.error("Error auto-marking 1:1 messages as delivered:", error);
  }
}

/**
 * Auto-mark undelivered GROUP messages as delivered (NEW)
 */
async function markUndeliveredGroupMessagesAsDelivered(userId) {
  try {
    // Find all groups user is in
    const conversations = await Conversation.find({
      participantIds: userId
    });

    const conversationIds = conversations.map(c => c._id);

    // Find undelivered group messages
    const undeliveredMessages = await GroupMessage.find({
      conversationId: { $in: conversationIds },
      senderId: { $ne: userId },
      'isDeliveredTo.userId': { $ne: userId }
    });

    if (undeliveredMessages.length === 0) return;

    const deliveryEntry = {
      userId,
      deliveredAt: new Date()
    };

    await GroupMessage.updateMany(
      {
        conversationId: { $in: conversationIds },
        senderId: { $ne: userId },
        'isDeliveredTo.userId': { $ne: userId }
      },
      {
        $push: { isDeliveredTo: deliveryEntry }
      }
    );

    // Update status
    for (const message of undeliveredMessages) {
      if (message.status === 'sent') {
        message.status = 'delivered';
        await message.save();
      }
    }

    // Notify senders
    const senderIds = [...new Set(undeliveredMessages.map(m => m.senderId.toString()))];

    senderIds.forEach(senderId => {
      const senderSocketId = getReceiverSocketId(senderId);
      if (senderSocketId) {
        const senderMessages = undeliveredMessages
          .filter(m => m.senderId.toString() === senderId)
          .map(m => ({
            messageId: m._id.toString(),
            groupId: m.conversationId.toString()
          }));

        io.to(senderSocketId).emit("group_messages_delivered", {
          messages: senderMessages,
          deliveredTo: userId,
          deliveredAt: new Date()
        });
      }
    });

    console.log(`📬 Auto-delivered ${undeliveredMessages.length} group messages to user ${userId}`);
  } catch (error) {
    console.error("Error auto-marking group messages as delivered:", error);
  }
}

export { io, app, server };