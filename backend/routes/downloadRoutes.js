const express = require("express");
const router = express.Router();

const Download = require("../models/Download");
const User = require("../models/User");
const Video = require("../models/Video");

// In-memory tracker for active simultaneous downloads
const activeDownloadsMap = new Map();

// ==========================================
// Download Video Route
// ==========================================
router.post("/download", async (req, res) => {
  try {
    const { userId, videoId, deviceId, simulateConcurrent = false } = req.body;
    const clientDevice = deviceId || req.headers["user-agent"] || "Standard Browser";

    // 1. Verify User
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // 2. Check Subscription Expiry
    if (user.subscriptionExpiry && new Date() > new Date(user.subscriptionExpiry)) {
      return res.status(403).json({
        message: "Subscription expired. Please renew your plan to download videos."
      });
    }

    // 3. Registered Device Verification (Checked BEFORE duplicate & quota checks)
    if (!user.registeredDevice) {
      user.registeredDevice = clientDevice;
      await user.save();
    } else if (user.registeredDevice !== clientDevice) {
      return res.status(403).json({
        message: "Download rejected: Unauthorized device for this account."
      });
    }

    // 4. Simultaneous Active Download Check (Explicit Simulation)
    if (simulateConcurrent) {
      return res.status(429).json({
        message: "Simultaneous download blocked! Parallel download streams are restricted for your plan."
      });
    }

    // Verify Video Accessibility
    const video = await Video.findById(videoId);
    if (!video || !video.isDownloadable) {
      return res.status(403).json({
        message: "Video is not available for download"
      });
    }

    // Download limits per plan
    const limits = {
      Free: 1,
      Bronze: 5,
      Silver: 10,
      Gold: 20
    };

    const limit = limits[user.subscriptionPlan] || 1;

    // Start of today (00:00:00 local / IST)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Count today's completed non-duplicate downloads
    const todayDownloads = await Download.countDocuments({
      userId: user._id,
      downloadDate: { $gte: startOfDay },
      status: "Completed",
      isDuplicate: { $ne: true }
    });

    // 4. Check Duplicate Download Grace Window (Last 15 minutes)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentDownload = await Download.findOne({
      userId: user._id,
      videoId: video._id,
      status: "Completed",
      downloadDate: { $gte: fifteenMinsAgo }
    }).sort({ downloadDate: -1 });

    // If duplicate download within 15 mins window, allow re-download without decrementing quota
    if (recentDownload) {
      const remainingQuota = Math.max(limit - todayDownloads, 0);
      const duplicateRecord = await Download.create({
        userId: user._id,
        videoId: video._id,
        status: "Completed",
        fileSize: video.fileSize,
        subscriptionPlan: user.subscriptionPlan,
        ipAddress: req.ip || "127.0.0.1",
        device: clientDevice,
        browser: req.headers["user-agent"] || "Browser",
        isDuplicate: true,
        remainingQuotaAtDownload: remainingQuota
      });

      return res.status(200).json({
        message: "Duplicate download detected within 15 mins window. Re-downloading without burning quota.",
        download: duplicateRecord,
        remainingQuota,
        videoUrl: video.videoUrl,
        isDuplicate: true
      });
    }

    // 5. Simultaneous Active Download Check
    const userActiveCount = activeDownloadsMap.get(userId.toString()) || 0;
    if (simulateConcurrent || userActiveCount >= 1) {
      return res.status(429).json({
        message: "Simultaneous download blocked! Parallel download streams are restricted for your plan."
      });
    }

    // 7. Check Daily Download Quota Limit
    if (todayDownloads >= limit) {
      return res.status(403).json({
        message: "Daily download limit reached for your plan",
        remainingQuota: 0
      });
    }

    // Set concurrent active lock
    activeDownloadsMap.set(userId.toString(), userActiveCount + 1);

    // Calculate remaining quota after this download
    const remainingQuota = limit - todayDownloads - 1;

    // Create Audit Download Record
    const download = await Download.create({
      userId: user._id,
      videoId: video._id,
      status: "Completed",
      fileSize: video.fileSize,
      subscriptionPlan: user.subscriptionPlan,
      ipAddress: req.ip || "127.0.0.1",
      device: clientDevice,
      browser: req.headers["user-agent"] || "Browser",
      isDuplicate: false,
      remainingQuotaAtDownload: remainingQuota
    });

    // Release lock after short delay (simulating download stream start)
    setTimeout(() => {
      const current = activeDownloadsMap.get(userId.toString()) || 1;
      activeDownloadsMap.set(userId.toString(), Math.max(current - 1, 0));
    }, 3000);

    res.status(201).json({
      message: "Video download authorized successfully",
      download,
      remainingQuota,
      videoUrl: video.videoUrl,
      isDuplicate: false
    });

  } catch (error) {
    console.error("Download route error:", error);
    res.status(500).json({
      message: "Download failed",
      error: error.message
    });
  }
});

// Update Download Status (Completed / Failed)
router.post("/status/:downloadId", async (req, res) => {
  try {
    const { downloadId } = req.params;
    const { status } = req.body;

    if (!["Completed", "Failed", "Started"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const download = await Download.findByIdAndUpdate(
      downloadId,
      { status },
      { new: true }
    );

    if (!download) {
      return res.status(404).json({ message: "Download record not found" });
    }

    res.status(200).json({
      message: "Download status updated",
      download
    });
  } catch (error) {
    res.status(500).json({ message: "Status update failed", error: error.message });
  }
});

// Get User Download History
router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const downloads = await Download.find({ userId })
      .populate("videoId")
      .sort({ downloadDate: -1 });

    res.status(200).json({
      message: "Download history fetched successfully",
      downloads
    });

  } catch (error) {
    console.error("Fetch history error:", error);
    res.status(500).json({
      message: "Failed to fetch download history",
      error: error.message
    });
  }
});

module.exports = router;