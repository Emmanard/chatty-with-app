import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    // Groups are always isGroup: true
    isGroup: {
      type: Boolean,
      default: true,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    avatar: {
      type: String,
      default: ""
    },
    participantIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }],
    adminIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    lastMessageText: {
      type: String,
      default: ""
    },
    lastMessageSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    lastMessageAt: {
      type: Date,
      default: Date.now
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for optimizing queries
conversationSchema.index({ participantIds: 1, lastMessageAt: -1 });
conversationSchema.index({ createdBy: 1 });

// Virtual for participant count
conversationSchema.virtual('participantCount').get(function() {
  return this.participantIds.length;
});

// Method to check if user is admin
conversationSchema.methods.isAdmin = function(userId) {
  return this.adminIds.some(adminId => adminId.toString() === userId.toString());
};

// Method to check if user is participant
conversationSchema.methods.isParticipant = function(userId) {
  return this.participantIds.some(participantId => participantId.toString() === userId.toString());
};

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;