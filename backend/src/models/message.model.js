import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    isDeliveredTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: []
    }],
    isSeenBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: []
    }],
    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'sent'
    }
  },
  { timestamps: true }
);

// Existing indexes for optimizing common queries
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 });

// Index for unread messages queries
messageSchema.index({ receiverId: 1, isSeenBy: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;