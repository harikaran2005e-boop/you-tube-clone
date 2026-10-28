
const dns = require("node:dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();


const connectDB = require("./config/db");
const downloadRoutes = require("./routes/downloadRoutes");
const userRoutes = require("./routes/userRoutes");
const videoRoutes = require("./routes/videoRoutes");
const commentRoutes = require("./routes/commentRoutes");
const translateRoutes = require("./routes/translateRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");

const User = require("./models/User");
const Video = require("./models/Video");
const Comment = require("./models/Comment");
const Meeting = require("./models/Meeting");

connectDB().then(async () => {
  // Ensure default demo user and video exist if collection is empty
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.create({
        _id: new mongoose.Types.ObjectId("6aaa685bc7a8e4a210c6d15f"),
        name: "Hari Karan",
        email: "harikaran@example.com",
        subscriptionPlan: "Free"
      });
      console.log("Default user created");
    }

    const videoCount = await Video.countDocuments();
    if (videoCount === 0) {
      await Video.create({
        _id: new mongoose.Types.ObjectId("6aaa688fc7a8e4a210c6d160"),
        title: "Download Test Video",
        fileSize: "100 MB",
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        isDownloadable: true
      });
      console.log("Default video created");
    }

    // Seed default demo comments if none active
    const activeCommentCount = await Comment.countDocuments({ deleted: false });
    if (activeCommentCount === 0) {
      await Comment.create([
        {
          videoId: new mongoose.Types.ObjectId("6aaa688fc7a8e4a210c6d160"),
          username: "alex_dev",
          location: "San Francisco, USA",
          text: "The high-speed video downloader and playback streaming are working seamlessly! Great job on the implementation.",
          likes: 8,
          language: "en"
        },
        {
          videoId: new mongoose.Types.ObjectId("6aaa688fc7a8e4a210c6d160"),
          username: "sophia_tech",
          location: "London, UK",
          text: "The live multilingual translation tool translates comments instantly in 40+ languages. Really impressive!",
          likes: 5,
          language: "en"
        },
        {
          videoId: null,
          username: "harikaran",
          location: "Tamil Nadu, India",
          text: "Welcome to the Community Discussion platform! You can post discussions, reply with nested threads, translate, or report comments.",
          likes: 12,
          language: "en"
        }
      ]);
      console.log("Default active discussion comments seeded");
    }

    // Seed demo meeting rooms for instant 1-click joining
    const demo101 = await Meeting.findOne({ roomId: "call-demo101" });
    if (!demo101) {
      await Meeting.create({
        roomId: "call-demo101",
        title: "Team Demo Room",
        hostId: "6aaa685bc7a8e4a210c6d15f",
        maxParticipants: 10,
        participants: [
          { userId: "user-201", name: "Alex Rivers", isHost: false, isCoHost: false, isMuted: false, isCameraOff: false, isHandRaised: false },
          { userId: "user-202", name: "Sophia Chen", isHost: false, isCoHost: true, isMuted: true, isCameraOff: false, isHandRaised: true }
        ]
      });
      console.log("Default demo room call-demo101 created");
    }

    const design99 = await Meeting.findOne({ roomId: "call-design99" });
    if (!design99) {
      await Meeting.create({
        roomId: "call-design99",
        title: "Design Review Room",
        hostId: "6aaa685bc7a8e4a210c6d15f",
        maxParticipants: 10,
        participants: [
          { userId: "user-301", name: "Elena Rostova", isHost: false, isCoHost: false, isMuted: false, isCameraOff: false, isHandRaised: false }
        ]
      });
      console.log("Default demo room call-design99 created");
    }
  } catch (err) {
    console.error("Auto seed warning:", err.message);
  }
});

const app = express();

app.use(cors());
app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.send("Video Download & Commenting Management Backend is Running");
});

// Temporary test route
app.get("/test-user-route", (req, res) => {
  res.send("Server test route is working");
});

// Download routes
app.use("/api/downloads", downloadRoutes);

// User routes
app.use("/api/users", userRoutes);

// Video routes
app.use("/api/videos", videoRoutes);

// Comment routes
app.use("/api/comments", commentRoutes);

// Translation route
app.use("/api/translate", translateRoutes);

// Subscription management routes
app.use("/api/subscription", subscriptionRoutes);

// Security, Device Audit & OTP routes
const securityRoutes = require("./routes/securityRoutes");
app.use("/api/security", securityRoutes);

const meetingRoutes = require("./routes/meetingRoutes");
app.use("/api/meetings", meetingRoutes);

// Serve production frontend build if dist folder exists
const path = require("path");
const fs = require("fs");
const frontendDist = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/vanilla")) {
      return next();
    }
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// Serve Vanilla JS implementation under /vanilla route
const vanillaDist = path.join(__dirname, "../Vanilla");
if (fs.existsSync(vanillaDist)) {
  app.use("/vanilla", express.static(vanillaDist));
}

// Render dynamic PORT binding (defaults to 5000 locally)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});