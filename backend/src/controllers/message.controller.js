import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getRecentConversations = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    
    // Get all messages where the user is either sender or receiver, sorted by most recent
    const messages = await Message.find({
      $or: [
        { senderId: loggedInUserId },
        { receiverId: loggedInUserId }
      ]
    }).sort({ createdAt: -1 });
    
    // Group messages by conversation partner
    const conversationsMap = new Map();
    
    for (const message of messages) {
      const partnerId = message.senderId.toString() === loggedInUserId.toString() 
        ? message.receiverId.toString() 
        : message.senderId.toString();
      
      if (!conversationsMap.has(partnerId)) {
        conversationsMap.set(partnerId, {
          partnerId,
          lastMessage: message,
          unreadCount: 0
        });
      }
    }
    
    // Calculate unread message counts (messages received but not seen)
    for (const [partnerId, conversation] of conversationsMap) {
      const unreadCount = await Message.countDocuments({
        senderId: partnerId,
        receiverId: loggedInUserId,
        isSeenBy: { $ne: loggedInUserId } // Updated to use isSeenBy
      });
      conversation.unreadCount = unreadCount;
    }
    
    // Get user details for each conversation partner
    const partnerIds = Array.from(conversationsMap.keys());
    const partners = await User.find({ 
      _id: { $in: partnerIds } 
    }).select("-password");
    
    // Format the response to match frontend expectations
    const recentConversations = partners.map(partner => {
      const conversation = conversationsMap.get(partner._id.toString());
      return {
        _id: partner._id,
        user: partner,
        lastMessage: conversation.lastMessage,
        unreadCount: conversation.unreadCount
      };
    });
    
    // Sort by last message time (most recent first)
    recentConversations.sort((a, b) => 
      new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
    );
    
    res.status(200).json(recentConversations);
  } catch (error) {
    console.error("Error in getRecentConversations: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    
    // Pagination parameters
    const limit = parseInt(req.query.limit) || 50;
    const cursor = req.query.cursor;

    // Build the query
    const query = {
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    };

    if (cursor) {
      const cursorMessage = await Message.findById(cursor);
      if (cursorMessage) {
        query.createdAt = { $lt: cursorMessage.createdAt };
      }
    }

    // Fetch messages with limit + 1 to check if there are more
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    // Check if there are more messages
    const hasMore = messages.length > limit;
    
    if (hasMore) {
      messages.pop();
    }

    // Get the next cursor
    const nextCursor = hasMore && messages.length > 0 
      ? messages[messages.length - 1]._id.toString() 
      : null;

    // Reverse messages to show oldest first in the UI
    const reversedMessages = messages.reverse();

    res.status(200).json({
      messages: reversedMessages,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // ============================================
    // CREATE MESSAGE WITH DELIVERY TRACKING
    // ============================================
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      isDeliveredTo: [], // Will be populated if receiver is online
      isSeenBy: [],
      status: 'sent'
    });

    await newMessage.save();

    // ============================================
    // CHECK IF RECEIVER IS ONLINE
    // ============================================
    const receiverSocketId = getReceiverSocketId(receiverId);
    
    if (receiverSocketId) {
      // Receiver is online - mark as delivered immediately
      newMessage.isDeliveredTo.push(receiverId);
      newMessage.status = 'delivered';
      await newMessage.save();

      // Emit to receiver
      io.to(receiverSocketId).emit("newMessage", newMessage);

      // Notify sender that message was delivered
      io.to(getReceiverSocketId(senderId.toString())).emit("message_delivered", {
        messageId: newMessage._id.toString(),
        deliveredTo: receiverId,
        deliveredAt: new Date()
      });

      console.log(`✅ Message delivered immediately to online user ${receiverId}`);
    } else {
      console.log(`📭 Receiver ${receiverId} is offline - message will be delivered when they come online`);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};