import mongoose from "mongoose";
const groupMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true
    },
    senderId: {
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
    // Delivery tracking per user
    isDeliveredTo: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      deliveredAt: {
        type: Date,
        default: Date.now
      }
    }],
    // Read receipts per user
    isSeenBy: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      seenAt: {
        type: Date,
        default: Date.now
      }
    }],
    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'sent'
    },
    // For deleted messages
    deletedFor: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    // For message replies
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupMessage"
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for optimizing queries
groupMessageSchema.index({ conversationId: 1, createdAt: -1 });
groupMessageSchema.index({ senderId: 1, createdAt: -1 });

// Virtual for delivery count
groupMessageSchema.virtual('deliveryCount').get(function() {
  return this.isDeliveredTo.length;
});

// Virtual for read count
groupMessageSchema.virtual('readCount').get(function() {
  return this.isSeenBy.length;
});

// Method to check if delivered to specific user
groupMessageSchema.methods.isDeliveredToUser = function(userId) {
  return this.isDeliveredTo.some(d => d.userId.toString() === userId.toString());
};

// Method to check if seen by specific user
groupMessageSchema.methods.isSeenByUser = function(userId) {
  return this.isSeenBy.some(s => s.userId.toString() === userId.toString());
};

const GroupMessage = mongoose.model("GroupMessage", groupMessageSchema);

export default GroupMessage;