import Conversation from "../models/conversation.model.js";
import GroupMessage from "../models/groupMessage.model.js";
import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// ============================================
// GET ALL GROUP CONVERSATIONS FOR USER
// ============================================
export const getGroupConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participantIds: userId
    })
      .populate('participantIds', '-password')
      .populate('lastMessageSender', 'fullName profilePic')
      .sort({ lastMessageAt: -1 });

    // Calculate unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await GroupMessage.countDocuments({
          conversationId: conversation._id,
          senderId: { $ne: userId },
          'isSeenBy.userId': { $ne: userId }
        });

        return {
          ...conversation.toObject(),
          unreadCount
        };
      })
    );

    res.status(200).json(conversationsWithUnread);
  } catch (error) {
    console.error("Error in getGroupConversations:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============================================
// CREATE GROUP CONVERSATION
// ============================================
export const createGroupConversation = async (req, res) => {
  try {
    const { name, description, participantIds, avatar } = req.body;
    const creatorId = req.user._id;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Group name is required" });
    }

    if (!participantIds || participantIds.length < 2) {
      return res.status(400).json({ 
        error: "At least 2 participants are required (excluding yourself)" 
      });
    }

    // Handle avatar upload if provided
    let avatarUrl = "";
    if (avatar) {
      const uploadResponse = await cloudinary.uploader.upload(avatar);
      avatarUrl = uploadResponse.secure_url;
    }

    // Include creator in participants
    const allParticipants = [...new Set([creatorId.toString(), ...participantIds])];

    // Validate all participants exist
    const users = await User.find({ _id: { $in: allParticipants } });
    if (users.length !== allParticipants.length) {
      return res.status(400).json({ error: "Some participants do not exist" });
    }

    // Create group conversation
    const conversation = await Conversation.create({
      isGroup: true,
      name: name.trim(),
      description: description || "",
      avatar: avatarUrl,
      participantIds: allParticipants,
      adminIds: [creatorId],
      createdBy: creatorId
    });

    // Populate participants
    await conversation.populate('participantIds', '-password');

    // Notify all participants via socket
    allParticipants.forEach(participantId => {
      if (participantId !== creatorId.toString()) {
        const socketId = getReceiverSocketId(participantId);
        if (socketId) {
          io.to(socketId).emit("new_group_created", conversation);
        }
      }
    });

    console.log(`✅ Group created: ${conversation.name} (${conversation._id})`);
    res.status(201).json(conversation);
  } catch (error) {
    console.error("Error in createGroupConversation:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============================================
// GET GROUP CONVERSATION DETAILS
// ============================================
export const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(groupId)
      .populate('participantIds', '-password')
      .populate('adminIds', '-password')
      .populate('createdBy', '-password');

    if (!conversation) {
      return res.status(404).json({ error: "Group not found" });
    }

    // ✅ allow all participants (not only admins)
    const isParticipant = conversation.participantIds.some(
      (p) => p._id.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ error: "You are not a participant in this group" });
    }

    res.status(200).json(conversation);
  } catch (error) {
    console.error("Error in getGroupById:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};


// ============================================
// UPDATE GROUP CONVERSATION
// ============================================
export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, avatar } = req.body;
    const userId = req.user._id;

    const conversation = await Conversation.findById(groupId);

    if (!conversation) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is admin
    if (!conversation.isAdmin(userId)) {
      return res.status(403).json({ error: "Only admins can update group details" });
    }

    // Update fields
    if (name) conversation.name = name.trim();
    if (description !== undefined) conversation.description = description;

    // Handle avatar upload
    if (avatar) {
      const uploadResponse = await cloudinary.uploader.upload(avatar);
      conversation.avatar = uploadResponse.secure_url;
    }

    await conversation.save();
    await conversation.populate('participantIds', '-password');

    // Notify all participants
    conversation.participantIds.forEach(participant => {
      const socketId = getReceiverSocketId(participant._id.toString());
      if (socketId) {
        io.to(socketId).emit("group_updated", conversation);
      }
    });

    res.status(200).json(conversation);
  } catch (error) {
    console.error("Error in updateGroup:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============================================
// ADD PARTICIPANTS TO GROUP
// ============================================
export const addParticipants = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { participantIds } = req.body;
    const userId = req.user._id;

    if (!participantIds || participantIds.length === 0) {
      return res.status(400).json({ error: "Participant IDs are required" });
    }

    const conversation = await Conversation.findById(groupId);

    if (!conversation) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is admin
    if (!conversation.isAdmin(userId)) {
      return res.status(403).json({ error: "Only admins can add participants" });
    }

    // Filter out already existing participants
    const newParticipants = participantIds.filter(
      id => !conversation.participantIds.some(p => p.toString() === id)
    );

    if (newParticipants.length === 0) {
      return res.status(400).json({ error: "All users are already participants" });
    }

    // Validate new participants exist
    const users = await User.find({ _id: { $in: newParticipants } });
    if (users.length !== newParticipants.length) {
      return res.status(400).json({ error: "Some participants do not exist" });
    }

    // Add new participants
    conversation.participantIds.push(...newParticipants);
    await conversation.save();
    await conversation.populate('participantIds', '-password');

    // Notify all participants
    conversation.participantIds.forEach(participant => {
      const socketId = getReceiverSocketId(participant._id.toString());
      if (socketId) {
        io.to(socketId).emit("participants_added", {
          groupId: conversation._id,
          newParticipants,
          conversation
        });
      }
    });

    res.status(200).json(conversation);
  } catch (error) {
    console.error("Error in addParticipants:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
// ============================================
// REMOVE PARTICIPANT FROM GROUP
// ============================================
export const removeParticipant = async (req, res) => {
  try {
    const { groupId, participantId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(groupId);

    if (!conversation) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is admin or removing themselves
    const isSelfRemoval = participantId === userId.toString();
    if (!isSelfRemoval && !conversation.isAdmin(userId)) {
      return res.status(403).json({ error: "Only admins can remove participants" });
    }

    // Check if participant exists
    if (!conversation.isParticipant(participantId)) {
      return res.status(400).json({ error: "User is not a participant" });
    }

    // Remove participant
    conversation.participantIds = conversation.participantIds.filter(
      id => id.toString() !== participantId
    );

    // Also remove from admins if applicable
    conversation.adminIds = conversation.adminIds.filter(
      id => id.toString() !== participantId
    );

    // If no participants left, delete the group
    if (conversation.participantIds.length === 0) {
      await Conversation.findByIdAndDelete(groupId);
      return res.status(200).json({ message: "Group deleted as no participants remain" });
    }

    await conversation.save();
    await conversation.populate('participantIds', '-password');

    // Notify remaining participants
    conversation.participantIds.forEach(participant => {
      const socketId = getReceiverSocketId(participant._id.toString());
      if (socketId) {
        io.to(socketId).emit("participant_removed", {
          groupId: conversation._id,
          removedParticipantId: participantId,
          conversation
        });
      }
    });

    // Notify the removed participant
    const removedSocketId = getReceiverSocketId(participantId);
    if (removedSocketId) {
      io.to(removedSocketId).emit("removed_from_group", {
        groupId: conversation._id
      });
    }

    res.status(200).json({ message: "Participant removed successfully", conversation });
  } catch (error) {
    console.error("Error in removeParticipant:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============================================
// MAKE USER ADMIN
// ============================================
export const makeAdmin = async (req, res) => {
  try {
    const { groupId, participantId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(groupId);

    if (!conversation) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is admin
    if (!conversation.isAdmin(userId)) {
      return res.status(403).json({ error: "Only admins can make other users admin" });
    }

    // Check if participant exists
    if (!conversation.isParticipant(participantId)) {
      return res.status(400).json({ error: "User is not a participant" });
    }

    // Check if already admin
    if (conversation.isAdmin(participantId)) {
      return res.status(400).json({ error: "User is already an admin" });
    }

    // Add to admins
    conversation.adminIds.push(participantId);
    await conversation.save();
    await conversation.populate('participantIds', '-password');

    // Notify all participants
    conversation.participantIds.forEach(participant => {
      const socketId = getReceiverSocketId(participant._id.toString());
      if (socketId) {
        io.to(socketId).emit("new_admin_added", {
          groupId: conversation._id,
          newAdminId: participantId,
          conversation
        });
      }
    });

    res.status(200).json(conversation);
  } catch (error) {
    console.error("Error in makeAdmin:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============================================
// LEAVE GROUP
// ============================================
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(groupId);

    if (!conversation) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is participant
    if (!conversation.isParticipant(userId)) {
      return res.status(400).json({ error: "You are not a participant" });
    }

    // Remove user from participants and admins
    conversation.participantIds = conversation.participantIds.filter(
      id => id.toString() !== userId.toString()
    );
    conversation.adminIds = conversation.adminIds.filter(
      id => id.toString() !== userId.toString()
    );

    // If no participants left, delete the group
    if (conversation.participantIds.length === 0) {
      await Conversation.findByIdAndDelete(groupId);
      return res.status(200).json({ message: "Group deleted as no participants remain" });
    }

    await conversation.save();

    // Notify remaining participants
    conversation.participantIds.forEach(participant => {
      const socketId = getReceiverSocketId(participant.toString());
      if (socketId) {
        io.to(socketId).emit("participant_left", {
          groupId: conversation._id,
          leftParticipantId: userId.toString()
        });
      }
    });

    res.status(200).json({ message: "Successfully left the group" });
  } catch (error) {
    console.error("Error in leaveGroup:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============================================
// SEND GROUP MESSAGE
// ============================================
export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image, replyTo } = req.body;
    const { groupId } = req.params;
    const senderId = req.user._id;

    // Get group
    const conversation = await Conversation.findById(groupId);
    
    if (!conversation) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if sender is participant
    if (!conversation.isParticipant(senderId)) {
      return res.status(403).json({ error: "You are not a participant in this group" });
    }

    // Handle image upload
    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Create message
    const messageData = {
      conversationId: groupId,
      senderId,
      text,
      image: imageUrl,
      isDeliveredTo: [],
      isSeenBy: [],
      status: 'sent'
    };

    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    const newMessage = await GroupMessage.create(messageData);

    // Populate sender info
    await newMessage.populate('senderId', 'fullName profilePic');
    if (replyTo) {
      await newMessage.populate('replyTo');
    }

    // Update conversation's last message
    conversation.lastMessageText = text || "📷 Image";
    conversation.lastMessageSender = senderId;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Handle delivery for all participants
    const recipientIds = conversation.participantIds
      .filter(id => id.toString() !== senderId.toString());

    const onlineRecipients = [];

    recipientIds.forEach(recipientId => {
      const socketId = getReceiverSocketId(recipientId.toString());
      if (socketId) {
        onlineRecipients.push(recipientId.toString());
        // Emit to online recipient
        io.to(socketId).emit("new_group_message", newMessage);
      }
    });

    // Mark as delivered to online users
    if (onlineRecipients.length > 0) {
      const deliveryEntries = onlineRecipients.map(userId => ({
        userId,
        deliveredAt: new Date()
      }));

      newMessage.isDeliveredTo.push(...deliveryEntries);
      newMessage.status = 'delivered';
      await newMessage.save();

      // Notify sender about delivery
      const senderSocketId = getReceiverSocketId(senderId.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit("group_message_delivered", {
          messageId: newMessage._id.toString(),
          groupId: conversation._id.toString(),
          deliveredTo: onlineRecipients,
          deliveredAt: new Date()
        });
      }

      console.log(`✅ Group message delivered to ${onlineRecipients.length}/${recipientIds.length} users`);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendGroupMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============================================
// GET GROUP MESSAGES
// ============================================
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const myId = req.user._id;
    
    // Check if group exists and user is participant
    const conversation = await Conversation.findById(groupId);
    
    if (!conversation) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!conversation.isParticipant(myId)) {
      return res.status(403).json({ error: "You are not a participant in this group" });
    }

    // Pagination parameters
    const limit = parseInt(req.query.limit) || 50;
    const cursor = req.query.cursor;

    // Build the query
    const query = {
      conversationId: groupId,
      deletedFor: { $ne: myId }
    };

    if (cursor) {
      const cursorMessage = await GroupMessage.findById(cursor);
      if (cursorMessage) {
        query.createdAt = { $lt: cursorMessage.createdAt };
      }
    }

    // Fetch messages
    const messages = await GroupMessage.find(query)
      .populate('senderId', 'fullName profilePic')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = messages.length > limit;
    
    if (hasMore) {
      messages.pop();
    }

    const nextCursor = hasMore && messages.length > 0 
      ? messages[messages.length - 1]._id.toString() 
      : null;

    const reversedMessages = messages.reverse();

    res.status(200).json({
      messages: reversedMessages,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.log("Error in getGroupMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ============================================
// DELETE GROUP MESSAGE
// ============================================
export const deleteGroupMessageForMe = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await GroupMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user is part of the group
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !conversation.isParticipant(userId)) {
      return res.status(403).json({ error: "You are not authorized to delete this message" });
    }

    // Add user to deletedFor array
    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error in deleteGroupMessageForMe:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteGroupMessageForEveryone = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await GroupMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Only sender can delete for everyone
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Only the sender can delete this message for everyone" });
    }

    // Check time limit (1 hour)
    const hoursSinceSent = (Date.now() - message.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceSent > 1) {
      return res.status(400).json({ error: "Can only delete messages within 1 hour of sending" });
    }

    await GroupMessage.findByIdAndDelete(messageId);

    // Notify all participants
    const conversation = await Conversation.findById(message.conversationId);
    if (conversation) {
      conversation.participantIds.forEach(participantId => {
        const socketId = getReceiverSocketId(participantId.toString());
        if (socketId) {
          io.to(socketId).emit("group_message_deleted", {
            messageId: message._id.toString(),
            groupId: conversation._id.toString()
          });
        }
      });
    }

    res.status(200).json({ message: "Message deleted for everyone" });
  } catch (error) {
    console.error("Error in deleteGroupMessageForEveryone:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};