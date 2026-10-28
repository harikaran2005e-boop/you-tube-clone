const mongoose = require("mongoose");

const watchProgressSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  videoId: {
    type: String,
    required: true,
    index: true
  },
  lastPosition: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number,
    default: 0
  },
  watchPercentage: {
    type: Number,
    default: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completionThreshold: {
    type: Number,
    default: 90
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Compound index for quick lookups
watchProgressSchema.index({ userId: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model("WatchProgress", watchProgressSchema);
