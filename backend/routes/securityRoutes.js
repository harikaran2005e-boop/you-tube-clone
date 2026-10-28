const express = require("express");
const router = express.Router();

const User = require("../models/User");
const LoginHistory = require("../models/LoginHistory");
const TrustedDevice = require("../models/TrustedDevice");
const { sendOtpEmail } = require("../utils/emailService");

/**
 * Calculates current time in IST (UTC+5:30) and evaluates theme mode.
 * 05:00 AM to 12:00 PM IST => Light Theme
 * 12:00 PM to 05:00 AM IST => Dark Theme
 */
function getIstTimeAndTheme(userPreference = "auto", customTimeStr = null) {
  let now;
  if (customTimeStr) {
    if (typeof customTimeStr === "string" && customTimeStr.includes(":") && !customTimeStr.includes("T")) {
      const todayIso = new Date().toISOString().split("T")[0];
      now = new Date(`${todayIso}T${customTimeStr.length === 5 ? customTimeStr + ":00" : customTimeStr}+05:30`);
    } else {
      now = new Date(customTimeStr);
    }
  } else {
    now = new Date();
  }

  // Use Intl.DateTimeFormat with Asia/Kolkata timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "numeric",
    minute: "numeric",
    second: "numeric"
  });

  const parts = formatter.formatToParts(now);
  let hour = 0;
  let minutes = 0;

  for (const part of parts) {
    if (part.type === "hour") hour = parseInt(part.value, 10);
    if (part.type === "minute") minutes = parseInt(part.value, 10);
  }

  if (hour === 24) hour = 0;

  // Rule: 05:00 AM (05:00) to 11:59 AM (11:59) IST -> Light Mode
  // 12:00 PM (12:00) to 04:59 AM (04:59) IST -> Dark Mode
  const isLightWindow = hour >= 5 && hour < 12;

  let resolvedTheme = "dark";
  if (userPreference === "light") {
    resolvedTheme = "light";
  } else if (userPreference === "dark") {
    resolvedTheme = "dark";
  } else {
    // Auto IST Detection
    resolvedTheme = isLightWindow ? "light" : "dark";
  }

  const timeStringIST = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).format(now) + " IST";

  return {
    hour,
    minutes,
    timeStringIST,
    isLightWindow,
    resolvedTheme
  };
}

// Core Login Processor Function
async function processLoginAttempt(params, res) {
  try {
    const {
      userId,
      ipAddress = "103.21.124.89",
      browser = "Chrome 128.0",
      os = "Windows 11",
      deviceType = "Desktop",
      deviceModel = "Standard Desktop PC",
      city = "Chennai",
      state = "Tamil Nadu",
      country = "India",
      simulatedTime = null
    } = params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const locationString = `${city}, ${state}, ${country}`;
    const deviceFingerprint = `${browser}_${os}_${deviceType}`;

    // 1. Evaluate IST Time & Theme
    const prefToUse = params.overridePreference || user.themePreference || "auto";
    const timeInfo = getIstTimeAndTheme(prefToUse, simulatedTime);

    // 2. Check Active Trusted Devices
    const trustedDevice = await TrustedDevice.findOne({
      userId: user._id,
      deviceFingerprint,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    });

    // 3. Evaluate Risk Flags
    const riskFlags = [];

    if (!trustedDevice) {
      const previousLogins = await LoginHistory.find({ userId: user._id });

      const hasUsedBrowser = previousLogins.some((h) => h.browser === browser);
      const hasUsedIp = previousLogins.some((h) => h.ipAddress === ipAddress);
      const hasUsedLocation = previousLogins.some((h) => h.city === city && h.state === state);

      if (!hasUsedBrowser && previousLogins.length > 0) riskFlags.push("NEW_BROWSER");
      if (!hasUsedIp && previousLogins.length > 0) riskFlags.push("NEW_IP");
      if (!hasUsedLocation && previousLogins.length > 0) riskFlags.push("NEW_LOCATION");
    }

    const requiresOtp = riskFlags.length > 0 && !trustedDevice;

    if (requiresOtp) {
      // Generate 6-Digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.otpSecret = otpCode;
      user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      // Trigger OTP Email
      const emailRes = await sendOtpEmail({
        userEmail: user.email,
        userName: user.name,
        otpCode,
        location: locationString,
        browser: `${browser} (${os})`
      });

      const historyRecord = await LoginHistory.create({
        userId: user._id,
        ipAddress,
        browser,
        os,
        deviceType,
        deviceModel,
        city,
        state,
        country,
        locationString,
        status: "OTP Required",
        riskFlags,
        requiresOtp: true,
        otpVerified: false
      });

      return res.status(200).json({
        requiresOtp: true,
        message: "New device or location detected! A 6-digit verification code was sent to your email.",
        otpCode: emailRes.otpCode || otpCode,
        riskFlags,
        theme: timeInfo.resolvedTheme,
        timeInfo,
        historyId: historyRecord._id
      });
    }

    // Direct Login Authorized
    user.lastLoginIp = ipAddress;
    user.lastLoginLocation = locationString;
    await user.save();

    const historyRecord = await LoginHistory.create({
      userId: user._id,
      ipAddress,
      browser,
      os,
      deviceType,
      deviceModel,
      city,
      state,
      country,
      locationString,
      status: "Success",
      riskFlags: [],
      requiresOtp: false,
      otpVerified: true
    });

    res.status(200).json({
      requiresOtp: false,
      message: "Login successful! Time-based theme applied.",
      theme: timeInfo.resolvedTheme,
      timeInfo,
      user,
      historyRecord
    });
  } catch (error) {
    console.error("Login process error:", error);
    res.status(500).json({ message: "Login security check failed", error: error.message });
  }
}

// ==========================================
// 1. POST Process Login & Device Audit Risk Check
// ==========================================
router.post("/login", async (req, res) => {
  return processLoginAttempt(req.body, res);
});

// ==========================================
// 8. POST Simulate Security Test Scenario
// ==========================================
router.post("/simulate-login", async (req, res) => {
  try {
    const { userId, scenario, simulatedTime = null } = req.body;

    let payload = {
      userId,
      simulatedTime,
      browser: "Chrome 128.0",
      ipAddress: "103.21.124.89",
      city: "Chennai",
      state: "Tamil Nadu",
      country: "India"
    };

    if (scenario === "new_browser") {
      payload.browser = `Firefox ${Math.floor(120 + Math.random() * 20)}.0`;
      payload.ipAddress = "103.21.124.89";
    } else if (scenario === "new_location") {
      const randSub = Math.floor(10 + Math.random() * 240);
      payload.browser = "Chrome 128.0";
      payload.ipAddress = `185.220.${randSub}.${Math.floor(1 + Math.random() * 250)}`;
      payload.city = `Mumbai-${randSub}`;
      payload.state = "Maharashtra";
    } else if (scenario === "morning_ist") {
      payload.simulatedTime = "2026-09-18T08:30:00+05:30"; // 8:30 AM IST
    } else if (scenario === "evening_ist") {
      payload.simulatedTime = "2026-09-18T20:30:00+05:30"; // 8:30 PM IST
    }

    return processLoginAttempt(payload, res);
  } catch (error) {
    res.status(500).json({ message: "Simulation failed", error: error.message });
  }
});

// ==========================================
// 2. POST Verify OTP & Remember Trusted Device
// ==========================================
router.post("/verify-otp", async (req, res) => {
  try {
    const {
      userId,
      otpCode,
      trustDevice = true,
      ipAddress = "103.21.124.89",
      browser = "Chrome 128.0",
      os = "Windows 11",
      deviceType = "Desktop",
      city = "Chennai",
      state = "Tamil Nadu",
      country = "India",
      historyId = null,
      simulatedTime = null
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.otpSecret || !user.otpExpiry) {
      return res.status(400).json({ message: "No active OTP request found. Please request a new code." });
    }

    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({ message: "OTP verification code expired. Please request a new code." });
    }

    if (user.otpSecret !== otpCode.trim()) {
      if (historyId) {
        await LoginHistory.findByIdAndUpdate(historyId, { status: "OTP Failed" });
      }
      return res.status(400).json({ message: "Invalid OTP verification code. Please check and try again." });
    }

    // OTP Verified Successfully!
    user.otpSecret = null;
    user.otpExpiry = null;
    user.lastLoginIp = ipAddress;
    user.lastLoginLocation = `${city}, ${state}, ${country}`;
    await user.save();

    if (historyId) {
      await LoginHistory.findByIdAndUpdate(historyId, {
        status: "OTP Verified",
        otpVerified: true
      });
    }

    // Create Trusted Device Record if user checked "Remember Device"
    let trustedDeviceRecord = null;
    if (trustDevice) {
      const deviceFingerprint = `${browser}_${os}_${deviceType}`;
      const deviceName = `${browser} on ${os}`;

      trustedDeviceRecord = await TrustedDevice.findOneAndUpdate(
        { userId: user._id, deviceFingerprint },
        {
          userId: user._id,
          deviceFingerprint,
          deviceName,
          browser,
          os,
          ipAddress,
          location: `${city}, ${state}, ${country}`,
          trustedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Days
          isRevoked: false
        },
        { upsert: true, new: true }
      );
    }

    const timeInfo = getIstTimeAndTheme(user.themePreference, simulatedTime);

    res.status(200).json({
      success: true,
      message: "Security OTP verified successfully! Trusted device created.",
      user,
      theme: timeInfo.resolvedTheme,
      timeInfo,
      trustedDevice: trustedDeviceRecord
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "OTP verification failed", error: error.message });
  }
});

// ==========================================
// 3. POST Resend Security OTP
// ==========================================
router.post("/send-otp", async (req, res) => {
  try {
    const { userId, browser = "Chrome", location = "Chennai" } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpSecret = otpCode;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const emailRes = await sendOtpEmail({
      userEmail: user.email,
      userName: user.name,
      otpCode,
      location,
      browser
    });

    res.status(200).json({
      message: "New 6-digit OTP code sent to your registered email.",
      otpCode: emailRes.otpCode || otpCode
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to resend OTP", error: error.message });
  }
});

// ==========================================
// 4. PUT Update User Theme Preference
// ==========================================
router.put("/theme/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { themePreference } = req.body; // auto, light, dark

    if (!["auto", "light", "dark"].includes(themePreference)) {
      return res.status(400).json({ message: "Invalid theme preference" });
    }

    const user = await User.findByIdAndUpdate(userId, { themePreference }, { new: true });
    const timeInfo = getIstTimeAndTheme(themePreference);

    res.status(200).json({
      message: `Theme preference updated to '${themePreference}'`,
      user,
      theme: timeInfo.resolvedTheme,
      timeInfo
    });
  } catch (error) {
    res.status(500).json({ message: "Theme preference update failed", error: error.message });
  }
});

// ==========================================
// 5. GET Login History Audit Logs
// ==========================================
router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await LoginHistory.find({ userId }).sort({ loginTimestamp: -1 });

    res.status(200).json({
      message: "Login audit history fetched successfully",
      history
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch login history", error: error.message });
  }
});

// ==========================================
// 6. GET Trusted Devices List
// ==========================================
router.get("/trusted-devices/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const devices = await TrustedDevice.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    }).sort({ trustedAt: -1 });

    res.status(200).json({
      message: "Trusted devices fetched successfully",
      devices
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch trusted devices", error: error.message });
  }
});

// ==========================================
// 7. DELETE / Revoke Trusted Device
// ==========================================
router.delete("/trusted-devices/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await TrustedDevice.findByIdAndUpdate(
      deviceId,
      { isRevoked: true },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ message: "Trusted device record not found" });
    }

    res.status(200).json({
      message: `Device trust revoked for '${device.deviceName}'`,
      device
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to revoke trusted device", error: error.message });
  }
});

module.exports = router;

