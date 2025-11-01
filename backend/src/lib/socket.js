import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173",
        "http://127.0.0.1:5500",  // Live Server
      "http://localhost:5500"

    ]  
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// Store online users
const userSocketMap = {}; // {userId: socketId}

// Store typing states per conversation
const typingUsers = {}; // {conversationId: {userId: timeout}}

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  
  if (userId && userId !== 'undefined') {
    userSocketMap[userId] = socket.id;
    
    // ============================================
    // AUTO-MARK UNDELIVERED MESSAGES AS DELIVERED
    // ============================================
    markUndeliveredMessagesAsDelivered(userId);
  }
  
  // Emit online users to all clients
  const onlineUsers = Object.keys(userSocketMap);
  io.emit("getOnlineUsers", onlineUsers);

  // ============================================
  // TYPING INDICATOR EVENTS
  // ============================================
  
  // User starts typing
  socket.on("typing", ({ conversationId, userId: typingUserId }) => {
    console.log(`👤 User ${typingUserId} is typing in conversation ${conversationId}`);
    
    // Clear existing timeout if any
    if (typingUsers[conversationId]?.[typingUserId]) {
      clearTimeout(typingUsers[conversationId][typingUserId]);
    }

    // Initialize conversation tracking if needed
    if (!typingUsers[conversationId]) {
      typingUsers[conversationId] = {};
    }

    // Set auto-clear timeout (3 seconds of inactivity)
    typingUsers[conversationId][typingUserId] = setTimeout(() => {
      delete typingUsers[conversationId][typingUserId];
      
      // Notify other user that typing stopped
      const otherUserId = conversationId.replace(typingUserId, '').replace('_', '');
      const otherUserSocketId = getReceiverSocketId(otherUserId);
      
      if (otherUserSocketId) {
        io.to(otherUserSocketId).emit("user_typing", {
          conversationId,
          userId: typingUserId,
          isTyping: false,
        });
      }
    }, 3000);

    // Notify the other user in the conversation
    const participantIds = conversationId.split('_');
    const otherUserId = participantIds.find(id => id !== typingUserId);
    
    if (otherUserId) {
      const otherUserSocketId = getReceiverSocketId(otherUserId);
      
      if (otherUserSocketId) {
        io.to(otherUserSocketId).emit("user_typing", {
          conversationId,
          userId: typingUserId,
          isTyping: true,
        });
      }
    }
  });

  // User stops typing
  socket.on("stop_typing", ({ conversationId, userId: typingUserId }) => {
    console.log(`👤 User ${typingUserId} stopped typing in conversation ${conversationId}`);
    
    // Clear timeout
    if (typingUsers[conversationId]?.[typingUserId]) {
      clearTimeout(typingUsers[conversationId][typingUserId]);
      delete typingUsers[conversationId][typingUserId];
    }

    // Notify the other user
    const participantIds = conversationId.split('_');
    const otherUserId = participantIds.find(id => id !== typingUserId);
    
    if (otherUserId) {
      const otherUserSocketId = getReceiverSocketId(otherUserId);
      
      if (otherUserSocketId) {
        io.to(otherUserSocketId).emit("user_typing", {
          conversationId,
          userId: typingUserId,
          isTyping: false,
        });
      }
    }
  });

  // ============================================
  // DELIVERY & READ RECEIPT EVENTS
  // ============================================

  // Mark messages as seen when user opens/views conversation
  socket.on("mark_as_seen", async ({ conversationId, userId: viewerId }) => {
    try {
      console.log(`👁️ User ${viewerId} viewed conversation ${conversationId}`);
      
      // Extract the other user's ID from conversationId
      const participantIds = conversationId.split('_');
      const senderId = participantIds.find(id => id !== viewerId);
      
      if (!senderId) return;

      // Find all unread messages from the sender
      const unreadMessages = await Message.find({
        senderId: senderId,
        receiverId: viewerId,
        isSeenBy: { $ne: viewerId }
      });

      if (unreadMessages.length === 0) return;

      // Mark all as seen
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

      // Notify the sender that messages were seen
      const senderSocketId = getReceiverSocketId(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messages_seen", {
          conversationId,
          messageIds: unreadMessages.map(m => m._id.toString()),
          seenBy: viewerId,
          seenAt: new Date()
        });
      }

      console.log(`✅ Marked ${unreadMessages.length} messages as seen`);
    } catch (error) {
      console.error("Error marking messages as seen:", error);
    }
  });

  // Manual mark as delivered (if needed for offline scenarios)
  socket.on("mark_as_delivered", async ({ messageIds, userId: receiverId }) => {
    try {
      await Message.updateMany(
        {
          _id: { $in: messageIds },
          isDeliveredTo: { $ne: receiverId }
        },
        {
          $addToSet: { isDeliveredTo: receiverId },
          $set: { status: 'delivered' }
        }
      );

      // Notify sender(s)
      const messages = await Message.find({ _id: { $in: messageIds } });
      messages.forEach(msg => {
        const senderSocketId = getReceiverSocketId(msg.senderId.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit("message_delivered", {
            messageId: msg._id.toString(),
            deliveredTo: receiverId,
            deliveredAt: new Date()
          });
        }
      });
    } catch (error) {
      console.error("Error marking messages as delivered:", error);
    }
  });

  // ============================================
  // DISCONNECT
  // ============================================
  socket.on("disconnect", () => {
    if (userId) {
      delete userSocketMap[userId];
      
      // Clear all typing states for this user
      Object.keys(typingUsers).forEach(conversationId => {
        if (typingUsers[conversationId][userId]) {
          clearTimeout(typingUsers[conversationId][userId]);
          delete typingUsers[conversationId][userId];
          
          // Notify others that user stopped typing
          const participantIds = conversationId.split('_');
          const otherUserId = participantIds.find(id => id !== userId);
          
          if (otherUserId) {
            const otherUserSocketId = getReceiverSocketId(otherUserId);
            if (otherUserSocketId) {
              io.to(otherUserSocketId).emit("user_typing", {
                conversationId,
                userId,
                isTyping: false,
              });
            }
          }
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
 * Auto-mark undelivered messages as delivered when user comes online
 */
async function markUndeliveredMessagesAsDelivered(userId) {
  try {
    // Find all messages sent TO this user that haven't been delivered yet
    const undeliveredMessages = await Message.find({
      receiverId: userId,
      isDeliveredTo: { $ne: userId }
    });

    if (undeliveredMessages.length === 0) return;

    // Mark them as delivered
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

    // Notify each sender
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

    console.log(`📬 Auto-delivered ${undeliveredMessages.length} messages to user ${userId}`);
  } catch (error) {
    console.error("Error auto-marking messages as delivered:", error);
  }
}

export { io, app, server };