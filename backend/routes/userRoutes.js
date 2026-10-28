const express = require("express");
const router = express.Router();

const User = require("../models/User");

// Test User Route
router.get("/test", (req, res) => {
  res.send("User route is working");
});

// Get User Profile
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create User
router.post("/create", async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json({
      message: "User created successfully",
      user
    });
  } catch (error) {
    res.status(500).json({
      message: "User creation failed",
      error: error.message
    });
  }
});

// Update Subscription Plan
router.put("/update-plan/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { subscriptionPlan } = req.body;

    const validPlans = ["Free", "Bronze", "Silver", "Gold"];
    if (!validPlans.includes(subscriptionPlan)) {
      return res.status(400).json({ message: "Invalid subscription plan" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { subscriptionPlan },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      message: "Subscription plan updated successfully",
      user
    });
  } catch (error) {
    res.status(500).json({ message: "Plan update failed", error: error.message });
  }
});

// Register or Reset Device ID
router.put("/device/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { registeredDevice } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { registeredDevice: registeredDevice || null },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      message: registeredDevice ? `Device updated to ${registeredDevice}` : "Registered device reset",
      user
    });
  } catch (error) {
    res.status(500).json({ message: "Device update failed", error: error.message });
  }
});

// Set Subscription Expiry Date (For Testing & Expiry Enforcement)
router.put("/expiry/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { isExpired } = req.body;

    const subscriptionExpiry = isExpired
      ? new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const user = await User.findByIdAndUpdate(
      userId,
      { subscriptionExpiry },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      message: isExpired ? "Subscription set to EXPIRED" : "Subscription set to ACTIVE",
      user
    });
  } catch (error) {
    res.status(500).json({ message: "Expiry update failed", error: error.message });
  }
});

module.exports = router;