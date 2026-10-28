const mongoose = require("mongoose");

const trustedDeviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  deviceFingerprint: {
    type: String,
    required: true
  },
  deviceName: {
    type: String,
    required: true
  },
  browser: {
    type: String,
    default: "Standard Browser"
  },
  os: {
    type: String,
    default: "Windows OS"
  },
  ipAddress: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: "Chennai, Tamil Nadu, India"
  },
  trustedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 Days default
  },
  isRevoked: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model("TrustedDevice", trustedDeviceSchema);
