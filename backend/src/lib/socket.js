import { Server } from "socket.io";
import http from "http";
import express from "express";

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

// Store typing states per conversation
const typingUsers = {}; // {conversationId: {userId: timeout}}

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  
  if (userId && userId !== 'undefined') {
    userSocketMap[userId] = socket.id;
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
    // For 1:1 chat, conversationId format: "userId1_userId2"
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

export { io, app, server };