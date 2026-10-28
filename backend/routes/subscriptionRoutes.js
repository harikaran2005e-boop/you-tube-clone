const express = require("express");
const router = express.Router();
const crypto = require("crypto");
let Razorpay;
try {
  Razorpay = require("razorpay");
} catch (e) {
  Razorpay = null;
}

const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { sendSubscriptionConfirmationEmail } = require("../utils/emailService");

// Pricing Matrix (Amounts in INR)
const PLAN_PRICING = {
  Free: { monthly: 0, quarterly: 0, yearly: 0 },
  Bronze: { monthly: 199, quarterly: 499, yearly: 1799 },
  Silver: { monthly: 499, quarterly: 1299, yearly: 4499 },
  Gold: { monthly: 999, quarterly: 2599, yearly: 8999 }
};

// Feature Specifications per Plan
const PLAN_SPECS = {
  Free: {
    name: "Free",
    dailyDownloadLimit: 1,
    streamingQuality: "480p SD",
    watchTimeLimitMinutes: 30,
    adFree: false,
    hasExclusiveCourses: false,
    priorityStreaming: false
  },
  Bronze: {
    name: "Bronze",
    dailyDownloadLimit: 5,
    streamingQuality: "720p HD",
    watchTimeLimitMinutes: 240, // 4 hours
    adFree: false,
    hasExclusiveCourses: false,
    priorityStreaming: false
  },
  Silver: {
    name: "Silver",
    dailyDownloadLimit: 10,
    streamingQuality: "1080p Full HD",
    watchTimeLimitMinutes: 720, // 12 hours
    adFree: true,
    hasExclusiveCourses: true,
    priorityStreaming: true
  },
  Gold: {
    name: "Gold",
    dailyDownloadLimit: 20,
    streamingQuality: "4K Ultra HD",
    watchTimeLimitMinutes: 99999, // Unlimited
    adFree: true,
    hasExclusiveCourses: true,
    priorityStreaming: true
  }
};

// ==========================================
// 1. GET Plan Definitions & Pricing Matrix
// ==========================================
router.get("/plans", (req, res) => {
  res.status(200).json({
    pricing: PLAN_PRICING,
    specs: PLAN_SPECS
  });
});

// ==========================================
// 2. GET User Subscription Status & Auto-Expiry Check
// ==========================================
router.get("/status/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Auto-Downgrade check if subscription has expired
    let wasDowngraded = false;
    if (user.subscriptionPlan !== "Free" && user.subscriptionExpiry && new Date() > new Date(user.subscriptionExpiry)) {
      user.subscriptionPlan = "Free";
      user.billingCycle = "monthly";
      user.streamingQuality = PLAN_SPECS.Free.streamingQuality;
      user.watchTimeLimitMinutes = PLAN_SPECS.Free.watchTimeLimitMinutes;
      user.adFree = PLAN_SPECS.Free.adFree;
      user.hasExclusiveCourses = PLAN_SPECS.Free.hasExclusiveCourses;
      user.subscriptionExpiry = null;
      await user.save();
      wasDowngraded = true;
    }

    // Calculate remaining time
    let remainingDays = 0;
    let remainingHours = 0;
    if (user.subscriptionExpiry && user.subscriptionPlan !== "Free") {
      const diffMs = new Date(user.subscriptionExpiry) - new Date();
      if (diffMs > 0) {
        remainingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        remainingHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      }
    }

    res.status(200).json({
      user,
      planSpecs: PLAN_SPECS[user.subscriptionPlan] || PLAN_SPECS.Free,
      wasDowngraded,
      remainingDays,
      remainingHours,
      isExpired: user.subscriptionPlan !== "Free" && user.subscriptionExpiry && new Date() > new Date(user.subscriptionExpiry)
    });
  } catch (error) {
    console.error("Fetch subscription status error:", error);
    res.status(500).json({ message: "Failed to fetch subscription status", error: error.message });
  }
});

// ==========================================
// 3. POST Create Razorpay Payment Order
// ==========================================
router.post("/create-order", async (req, res) => {
  try {
    const { userId, plan, billingCycle = "monthly" } = req.body;

    if (!PLAN_PRICING[plan]) {
      return res.status(400).json({ message: "Invalid plan selected" });
    }

    const priceINR = PLAN_PRICING[plan][billingCycle];
    if (priceINR === undefined) {
      return res.status(400).json({ message: "Invalid billing cycle selected" });
    }

    const amountPaisa = priceINR * 100; // Razorpay requires amount in smallest currency sub-unit (paisa)
    const receiptId = `rcpt_${Date.now().toString().slice(-8)}`;

    let orderId = `order_${Math.random().toString(36).substring(2, 12)}`;

    // Try initializing actual Razorpay client if credentials exist in .env
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (Razorpay && keyId && keySecret && !keyId.includes("TEST_KEY")) {
      try {
        const razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const order = await razorpayInstance.orders.create({
          amount: amountPaisa,
          currency: "INR",
          receipt: receiptId,
          notes: { userId, plan, billingCycle }
        });
        orderId = order.id;
      } catch (rzErr) {
        console.warn("Razorpay API order warning, falling back to simulated order:", rzErr.message);
      }
    }

    res.status(200).json({
      success: true,
      orderId,
      amount: amountPaisa,
      currency: "INR",
      plan,
      billingCycle,
      keyId: keyId || "rzp_test_Streamflix2026Key"
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Failed to create payment order", error: error.message });
  }
});

// ==========================================
// 4. POST Verify Payment & Activate Plan
// ==========================================
router.post("/verify-payment", async (req, res) => {
  try {
    const {
      userId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      plan,
      billingCycle = "monthly",
      simulateResult = "success",
      failureReason = ""
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const amountINR = PLAN_PRICING[plan]?.[billingCycle] || 0;
    const amountPaisa = amountINR * 100;
    const formattedInvoiceNum = `INV-2026-${Math.floor(100000 + Math.random() * 900000)}`;

    // Handle Explicit Simulation Scenarios (Failed, Cancelled, Duplicate, Interrupted)
    if (simulateResult === "failed" || simulateResult === "network_error") {
      const failedTransaction = await Transaction.create({
        userId: user._id,
        invoiceNumber: formattedInvoiceNum,
        plan,
        billingCycle,
        amount: amountPaisa,
        currency: "INR",
        razorpayOrderId: razorpayOrderId || `order_fail_${Date.now()}`,
        razorpayPaymentId: razorpayPaymentId || `pay_fail_${Date.now()}`,
        status: "Failed",
        failureReason: failureReason || "Transaction failed due to card authorization refusal or network interruption",
        startDate: new Date()
      });

      return res.status(400).json({
        success: false,
        message: "Payment failed or declined. Subscription status remains unchanged.",
        transaction: failedTransaction
      });
    }

    if (simulateResult === "cancelled") {
      const cancelledTransaction = await Transaction.create({
        userId: user._id,
        invoiceNumber: formattedInvoiceNum,
        plan,
        billingCycle,
        amount: amountPaisa,
        currency: "INR",
        razorpayOrderId: razorpayOrderId || `order_cnc_${Date.now()}`,
        razorpayPaymentId: "",
        status: "Cancelled",
        failureReason: "Payment process closed by user before completion",
        startDate: new Date()
      });

      return res.status(200).json({
        success: false,
        message: "Payment was cancelled by user. No charges were processed.",
        transaction: cancelledTransaction
      });
    }

    if (simulateResult === "duplicate") {
      // Check if duplicate transaction already exists
      const existingSuccess = await Transaction.findOne({
        userId: user._id,
        razorpayPaymentId: razorpayPaymentId,
        status: "Success"
      });

      if (existingSuccess) {
        return res.status(400).json({
          success: false,
          message: "Duplicate payment attempt detected! This transaction has already been verified.",
          transaction: existingSuccess
        });
      }
    }

    // Verify HMAC-SHA256 signature if real Razorpay Key Secret exists
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keySecret && razorpaySignature && !keySecret.includes("TEST_SECRET")) {
      const body = razorpayOrderId + "|" + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature !== razorpaySignature) {
        await Transaction.create({
          userId: user._id,
          invoiceNumber: formattedInvoiceNum,
          plan,
          billingCycle,
          amount: amountPaisa,
          currency: "INR",
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          status: "Failed",
          failureReason: "HMAC Signature verification failed. Tampered payload detected."
        });

        return res.status(400).json({
          success: false,
          message: "Payment signature verification failed. Transaction rejected."
        });
      }
    }

    // SUCCESSFUL PAYMENT PROCESSING
    const startDate = new Date();
    let expiryDate = new Date();

    if (billingCycle === "yearly") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else if (billingCycle === "quarterly") {
      expiryDate.setMonth(expiryDate.getMonth() + 3);
    } else {
      // monthly
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    const payId = razorpayPaymentId || `pay_test_${Math.random().toString(36).substring(2, 10)}`;
    const ordId = razorpayOrderId || `order_test_${Math.random().toString(36).substring(2, 10)}`;

    // Create Successful Transaction Record
    const transaction = await Transaction.create({
      userId: user._id,
      invoiceNumber: formattedInvoiceNum,
      plan,
      billingCycle,
      amount: amountPaisa,
      currency: "INR",
      razorpayOrderId: ordId,
      razorpayPaymentId: payId,
      razorpaySignature: razorpaySignature || "test_sig_verified",
      status: "Success",
      startDate,
      expiryDate,
      paymentMethod: "Razorpay Test Gateway"
    });

    // Update User Document & Premium Features
    const spec = PLAN_SPECS[plan] || PLAN_SPECS.Free;
    user.subscriptionPlan = plan;
    user.billingCycle = billingCycle;
    user.subscriptionStartDate = startDate;
    user.subscriptionExpiry = expiryDate;
    user.autoRenew = true;
    user.streamingQuality = spec.streamingQuality;
    user.watchTimeLimitMinutes = spec.watchTimeLimitMinutes;
    user.adFree = spec.adFree;
    user.hasExclusiveCourses = spec.hasExclusiveCourses;

    await user.save();

    // Dispatch Automated Email Receipt & Invoice
    await sendSubscriptionConfirmationEmail({
      userEmail: user.email,
      userName: user.name,
      invoiceNumber: formattedInvoiceNum,
      plan,
      billingCycle,
      amount: amountPaisa,
      currency: "INR",
      paymentId: payId,
      orderId: ordId,
      startDate,
      expiryDate,
      paymentStatus: "Success"
    });

    res.status(200).json({
      success: true,
      message: `Subscription successfully updated to ${plan} (${billingCycle})! Confirmation email dispatched.`,
      user,
      transaction
    });

  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ message: "Payment verification failed", error: error.message });
  }
});

// ==========================================
// 5. POST Cancel / Renew Subscription
// ==========================================
router.post("/cancel-subscription", async (req, res) => {
  try {
    const { userId, immediateDowngrade = false } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (immediateDowngrade) {
      user.subscriptionPlan = "Free";
      user.billingCycle = "monthly";
      user.subscriptionExpiry = null;
      user.autoRenew = false;
      user.streamingQuality = PLAN_SPECS.Free.streamingQuality;
      user.watchTimeLimitMinutes = PLAN_SPECS.Free.watchTimeLimitMinutes;
      user.adFree = PLAN_SPECS.Free.adFree;
      user.hasExclusiveCourses = PLAN_SPECS.Free.hasExclusiveCourses;
      await user.save();

      return res.status(200).json({
        message: "Subscription immediately cancelled. Account downgraded to Free plan.",
        user
      });
    } else {
      user.autoRenew = false;
      await user.save();

      return res.status(200).json({
        message: "Auto-renewal turned off. Your subscription remains active until expiry date.",
        user
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Cancellation failed", error: error.message });
  }
});

// ==========================================
// 6. GET Billing & Transaction History
// ==========================================
router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      message: "Billing history fetched successfully",
      transactions
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch billing history", error: error.message });
  }
});

// ==========================================
// 7. GET Invoice Details
// ==========================================
router.get("/invoice/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;
    const transaction = await Transaction.findById(transactionId).populate("userId", "name email");

    if (!transaction) {
      return res.status(404).json({ message: "Invoice / Transaction not found" });
    }

    res.status(200).json({ transaction });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch invoice", error: error.message });
  }
});

module.exports = router;
