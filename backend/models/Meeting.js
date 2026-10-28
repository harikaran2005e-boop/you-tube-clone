const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  isHost: { type: Boolean, default: false },
  isCoHost: { type: Boolean, default: false },
  isMuted: { type: Boolean, default: false },
  isCameraOff: { type: Boolean, default: false },
  isHandRaised: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now }
});

const chatMessageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  text: { type: String, default: "" },
  fileName: { type: String, default: "" },
  fileUrl: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now }
});

const meetingSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    default: "Real-Time Video Conference"
  },
  hostId: {
    type: String,
    required: true
  },
  accessCode: {
    type: String,
    default: ""
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  maxParticipants: {
    type: Number,
    default: 10
  },
  allowScreenShare: {
    type: Boolean,
    default: true
  },
  allowChat: {
    type: Boolean,
    default: true
  },
  participants: [participantSchema],
  chatMessages: [chatMessageSchema],
  status: {
    type: String,
    enum: ["active", "ended"],
    default: "active"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Meeting", meetingSchema);
