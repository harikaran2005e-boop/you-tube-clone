const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  plan: {
    type: String,
    enum: ["Free", "Bronze", "Silver", "Gold"],
    required: true
  },
  billingCycle: {
    type: String,
    enum: ["monthly", "quarterly", "yearly"],
    default: "monthly"
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: "INR"
  },
  razorpayOrderId: {
    type: String,
    default: ""
  },
  razorpayPaymentId: {
    type: String,
    default: ""
  },
  razorpaySignature: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ["Success", "Failed", "Cancelled", "Pending"],
    default: "Pending"
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    default: null
  },
  paymentMethod: {
    type: String,
    default: "Razorpay Test Payment"
  },
  failureReason: {
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Transaction", transactionSchema);
