import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  getGroupConversations,
  createGroupConversation,
  getGroupById,
  updateGroup,
  addParticipants,
  removeParticipant,
  makeAdmin,
  leaveGroup,
  sendGroupMessage,
  getGroupMessages,
  deleteGroupMessageForMe,
  deleteGroupMessageForEveryone
} from "../controllers/group.controller.js";

const router = express.Router();

// ============================================
// GROUP CONVERSATION ROUTES
// ============================================

// Get all group conversations for logged-in user
router.get("/", protectRoute, getGroupConversations);

// Create a new group conversation
router.post("/", protectRoute, createGroupConversation);

// Get group by ID
router.get("/:groupId", protectRoute, getGroupById);

// Update group details (name, description, avatar)
router.put("/:groupId", protectRoute, updateGroup);

// Add participants to group
router.post("/:groupId/participants", protectRoute, addParticipants);

// Remove participant from group
router.delete("/:groupId/participants/:participantId", protectRoute, removeParticipant);

// Make user an admin
router.post("/:groupId/admins/:participantId", protectRoute, makeAdmin);

// Leave group
router.post("/:groupId/leave", protectRoute, leaveGroup);

// ============================================
// GROUP MESSAGE ROUTES
// ============================================

// Get messages for a group
router.get("/:groupId/messages", protectRoute, getGroupMessages);

// Send a message to group
router.post("/:groupId/messages", protectRoute, sendGroupMessage);

// Delete message for self
router.delete("/messages/:messageId/delete-for-me", protectRoute, deleteGroupMessageForMe);

// Delete message for everyone (only sender)
router.delete("/messages/:messageId/delete-for-everyone", protectRoute, deleteGroupMessageForEveryone);

export default router;