const mongoose = require("mongoose");

const loginHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  ipAddress: {
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
  deviceType: {
    type: String,
    enum: ["Desktop", "Mobile", "Tablet"],
    default: "Desktop"
  },
  deviceModel: {
    type: String,
    default: "Standard Desktop PC"
  },
  city: {
    type: String,
    default: "Chennai"
  },
  state: {
    type: String,
    default: "Tamil Nadu"
  },
  country: {
    type: String,
    default: "India"
  },
  locationString: {
    type: String,
    default: "Chennai, Tamil Nadu, India"
  },
  loginTimestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ["Success", "OTP Required", "OTP Verified", "OTP Failed", "Blocked"],
    default: "Success"
  },
  riskFlags: [
    {
      type: String
    }
  ],
  requiresOtp: {
    type: Boolean,
    default: false
  },
  otpVerified: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model("LoginHistory", loginHistorySchema);
