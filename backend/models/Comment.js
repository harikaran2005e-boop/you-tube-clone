const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      default: null
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    parentId: {
      type: String,
      default: null
    },
    username: {
      type: String,
      required: true,
      default: "harikaran"
    },
    profilePicture: {
      type: String,
      default: "youtube.jpg"
    },
    location: {
      type: String,
      default: "Tamil Nadu, India"
    },
    text: {
      type: String,
      required: true
    },
    language: {
      type: String,
      default: "en"
    },
    version: {
      type: Number,
      default: 1
    },
    likes: {
      type: Number,
      default: 0
    },
    dislikes: {
      type: Number,
      default: 0
    },
    deleted: {
      type: Boolean,
      default: false
    },
    history: [
      {
        action: String,
        text: String,
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);
