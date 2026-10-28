const express = require("express");
const router = express.Router();

const Video = require("../models/Video");
const WatchProgress = require("../models/WatchProgress");

// Get All Videos
router.get("/", async (req, res) => {
  try {
    const videos = await Video.find();
    res.status(200).json({
      message: "Videos fetched successfully",
      videos
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch videos",
      error: error.message
    });
  }
});

// Create Video
router.post("/create", async (req, res) => {
  try {
    const video = await Video.create(req.body);

    res.status(201).json({
      message: "Video created successfully",
      video
    });

  } catch (error) {
    res.status(500).json({
      message: "Video creation failed",
      error: error.message
    });
  }
});

// Save or Update Watch Progress (Task 5)
router.post("/progress", async (req, res) => {
  try {
    const { userId, videoId, lastPosition, duration, watchPercentage, completionThreshold = 90 } = req.body;

    if (!userId || !videoId) {
      return res.status(400).json({ message: "userId and videoId are required" });
    }

    const calcPercentage = duration > 0 ? Math.min(100, Math.round((lastPosition / duration) * 100)) : (watchPercentage || 0);
    const isCompleted = calcPercentage >= completionThreshold;

    const progress = await WatchProgress.findOneAndUpdate(
      { userId, videoId },
      {
        lastPosition,
        duration,
        watchPercentage: calcPercentage,
        isCompleted,
        completionThreshold,
        lastUpdated: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      message: "Watch progress saved successfully",
      progress
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to save watch progress",
      error: error.message
    });
  }
});

// Get Watch Progress for specific user & video
router.get("/progress/:userId/:videoId", async (req, res) => {
  try {
    const { userId, videoId } = req.params;
    const progress = await WatchProgress.findOne({ userId, videoId });

    res.status(200).json({
      message: "Watch progress fetched",
      progress: progress || { lastPosition: 0, watchPercentage: 0, isCompleted: false }
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch watch progress",
      error: error.message
    });
  }
});

// Get all Watch Progress records for user
router.get("/progress/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const progressList = await WatchProgress.find({ userId });

    res.status(200).json({
      message: "All watch progress records fetched",
      progressList
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch user watch progress list",
      error: error.message
    });
  }
});

module.exports = router;