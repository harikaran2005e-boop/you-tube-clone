const mongoose = require("mongoose");

const downloadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Video",
    required: true
  },

  downloadDate: {
    type: Date,
    default: Date.now
  },

  status: {
    type: String,
    enum: ["Started", "Completed", "Failed"],
    default: "Completed"
  },

  fileSize: {
    type: String,
    default: ""
  },

  subscriptionPlan: {
    type: String,
    enum: ["Free", "Bronze", "Silver", "Gold"],
    required: true
  },

  ipAddress: {
    type: String,
    default: ""
  },

  device: {
    type: String,
    default: ""
  },

  browser: {
    type: String,
    default: ""
  },

  isDuplicate: {
    type: Boolean,
    default: false
  },

  remainingQuotaAtDownload: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model("Download", downloadSchema);