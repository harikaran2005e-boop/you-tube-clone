const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  subscriptionPlan: {
    type: String,
    enum: ["Free", "Bronze", "Silver", "Gold"],
    default: "Free"
  },

  billingCycle: {
    type: String,
    enum: ["monthly", "quarterly", "yearly"],
    default: "monthly"
  },

  subscriptionStartDate: {
    type: Date,
    default: Date.now
  },

  subscriptionExpiry: {
    type: Date,
    default: null
  },

  autoRenew: {
    type: Boolean,
    default: true
  },

  streamingQuality: {
    type: String,
    default: "480p SD"
  },

  watchTimeLimitMinutes: {
    type: Number,
    default: 30
  },

  adFree: {
    type: Boolean,
    default: false
  },

  hasExclusiveCourses: {
    type: Boolean,
    default: false
  },

  registeredDevice: {
    type: String,
    default: null
  },

  // Task 4 Security & Theme Persistence Fields
  themePreference: {
    type: String,
    enum: ["auto", "light", "dark"],
    default: "auto"
  },

  otpSecret: {
    type: String,
    default: null
  },

  otpExpiry: {
    type: Date,
    default: null
  },

  lastLoginIp: {
    type: String,
    default: null
  },

  lastLoginLocation: {
    type: String,
    default: null
  }
});

module.exports = mongoose.model("User", userSchema);