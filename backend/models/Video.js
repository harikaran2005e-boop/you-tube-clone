const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },

  thumbnail: {
    type: String,
    default: ""
  },

  fileSize: {
    type: String,
    required: true
  },

  videoUrl: {
    type: String,
    required: true
  },

  isDownloadable: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model("Video", videoSchema);