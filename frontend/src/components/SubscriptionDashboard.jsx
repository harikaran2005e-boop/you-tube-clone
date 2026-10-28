import React, { useState, useEffect } from "react";
import {
  Crown,
  Shield,
  Award,
  BarChart3,
  Check,
  X,
  CreditCard,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Zap,
  RefreshCw,
  Sparkles,
  Download,
  Film,
  Lock,
  ArrowUpRight
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const API_BASE = `${API_BASE_URL}/subscription`;

export default function SubscriptionDashboard({ userId = "6aaa685bc7a8e4a210c6d15f", theme = "light", onPlanChange }) {
  const [billingCycle, setBillingCycle] = useState("monthly"); // monthly, quarterly, yearly
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Razorpay Modal state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPlanForPurchase, setSelectedPlanForPurchase] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
    fetchBillingHistory();
  }, [userId]);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/status/${userId}`);
      const data = await res.json();
      if (res.ok) {
        setSubscriptionStatus(data);
        if (data.wasDowngraded) {
          setMessage("Notice: Your previous subscription expired and was automatically downgraded to the Free plan.");
        }
        if (onPlanChange && data.user) {
          onPlanChange(data.user.subscriptionPlan);
        }
      }
    } catch (err) {
      console.error("Fetch subscription error:", err);
      setMessage("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/history/${userId}`);
      const data = await res.json();
      if (res.ok && data.transactions) {
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error("Fetch history error:", err);
    }
  };

  // Plan Pricing Data
  const pricingData = {
    Free: { monthly: 0, quarterly: 0, yearly: 0 },
    Bronze: { monthly: 199, quarterly: 499, yearly: 1799 },
    Silver: { monthly: 499, quarterly: 1299, yearly: 4499 },
    Gold: { monthly: 999, quarterly: 2599, yearly: 8999 }
  };

  // 1. Initiate Razorpay Order
  const handleInitiatePurchase = async (planName) => {
    if (planName === "Free") {
      // Downgrade to free immediately
      handleCancelSubscription(true);
      return;
    }

    try {
      setMessage(`Initiating Razorpay order for ${planName} (${billingCycle})...`);
      const res = await fetch(`${API_BASE}/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plan: planName, billingCycle })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSelectedPlanForPurchase(planName);
        setCurrentOrder(data);
        setShowCheckoutModal(true);
        setMessage(`Order created: ${data.orderId}. Choose a payment simulation scenario below.`);
      } else {
        setMessage(data.message || "Order creation failed");
      }
    } catch (err) {
      setMessage("Network error during order creation");
    }
  };

  // 2. Process / Verify Razorpay Payment (Simulated & SDK test mode)
  const handleVerifyPayment = async (simulateResult = "success") => {
    if (!currentOrder) return;
    setProcessingPayment(true);

    const testPaymentId = `pay_${Math.random().toString(36).substring(2, 12)}`;
    const testSignature = `sig_${Math.random().toString(36).substring(2, 12)}`;

    try {
      const res = await fetch(`${API_BASE}/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          razorpayOrderId: currentOrder.orderId,
          razorpayPaymentId: testPaymentId,
          razorpaySignature: testSignature,
          plan: selectedPlanForPurchase,
          billingCycle,
          simulateResult
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage(`🎉 ${data.message}`);
        setShowCheckoutModal(false);
        fetchSubscriptionData();
        fetchBillingHistory();
      } else {
        setMessage(`⚠️ Payment Status: ${data.message}`);
        fetchBillingHistory();
        if (simulateResult === "cancelled" || simulateResult === "failed") {
          setShowCheckoutModal(false);
        }
      }
    } catch (err) {
      setMessage("Verification error occurred");
    } finally {
      setProcessingPayment(false);
    }
  };

  // 3. Cancel Subscription / Auto-Renew
  const handleCancelSubscription = async (immediate = false) => {
    try {
      const res = await fetch(`${API_BASE}/cancel-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, immediateDowngrade: immediate })
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
        fetchSubscriptionData();
        fetchBillingHistory();
      }
    } catch (err) {
      setMessage("Cancellation failed");
    }
  };

  const getPlanIcon = (name) => {
    switch (name) {
      case "Free": return <BarChart3 size={24} className="plan-icon free-icon" />;
      case "Bronze": return <Award size={24} className="plan-icon bronze-icon" />;
      case "Silver": return <Shield size={24} className="plan-icon silver-icon" />;
      case "Gold": return <Crown size={24} className="plan-icon gold-icon" />;
      default: return <Sparkles size={24} />;
    }
  };

  const activePlan = subscriptionStatus?.user?.subscriptionPlan || "Free";
  const userExpiry = subscriptionStatus?.user?.subscriptionExpiry;

  return (
    <div className={`subscription-container fade-in ${theme === "dark" ? "dark-theme" : ""}`}>

      {/* Top Banner & Header */}
      <div className="sub-header-banner">
        <div style={{ zIndex: 2 }}>
          <span className="banner-pill" style={{ background: "#990000", color: "#fff" }}>
            RAZORPAY TEST INTEGRATION
          </span>
          <h2 className="sub-header-title">Membership & Subscription Management</h2>
          <p className="sub-header-desc">
            Compare plans, manage recurring billing cycles, upgrade quality tiers, and view complete payment receipts.
          </p>
        </div>
        <div className="sub-header-badge-box">
          <div className="active-badge-card">
            <span className="badge-subtitle">CURRENT PLAN</span>
            <div className="badge-title-row">
              {getPlanIcon(activePlan)}
              <span className="badge-plan-name">{activePlan}</span>
            </div>
            {activePlan !== "Free" && userExpiry && (
              <p className="badge-expiry">
                <Clock size={12} /> {subscriptionStatus?.remainingDays || 0}d {subscriptionStatus?.remainingHours || 0}h remaining
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Alert / Notification Bar */}
      {message && (
        <div className="sub-notification-toast">
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="sub-toast-close">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Current Active Plan Status Card */}
      {subscriptionStatus && (
        <div className="active-status-details-card">
          <div className="status-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div className="status-indicator-dot active-dot"></div>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Subscription Active Overview</h3>
            </div>
            <span className="cycle-badge">{subscriptionStatus.user?.billingCycle?.toUpperCase()} BILLING</span>
          </div>

          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Active Plan</span>
              <strong className="status-val">{subscriptionStatus.user?.subscriptionPlan}</strong>
            </div>
            <div className="status-item">
              <span className="status-label">Streaming Quality</span>
              <strong className="status-val">{subscriptionStatus.user?.streamingQuality || "480p SD"}</strong>
            </div>
            <div className="status-item">
              <span className="status-label">Daily Download Quota</span>
              <strong className="status-val">{subscriptionStatus.planSpecs?.dailyDownloadLimit} Downloads/Day</strong>
            </div>
            <div className="status-item">
              <span className="status-label">Ad-Free Experience</span>
              <strong className="status-val">{subscriptionStatus.user?.adFree ? "Yes (Ad-Free)" : "Ad-Supported"}</strong>
            </div>
            <div className="status-item">
              <span className="status-label">Daily Watch Time</span>
              <strong className="status-val">
                {subscriptionStatus.user?.watchTimeLimitMinutes >= 99999 ? "Unlimited" : `${subscriptionStatus.user?.watchTimeLimitMinutes / 60} Hours/Day`}
              </strong>
            </div>
            <div className="status-item">
              <span className="status-label">Expiration Date</span>
              <strong className="status-val">
                {userExpiry ? new Date(userExpiry).toLocaleDateString() : "No Expiry (Free)"}
              </strong>
            </div>
            <div className="status-item">
              <span className="status-label">Next Renewal Date</span>
              <strong className="status-val">
                {subscriptionStatus.user?.autoRenew && userExpiry ? new Date(userExpiry).toLocaleDateString() : "Auto-Renew Disabled"}
              </strong>
            </div>
          </div>

          {activePlan !== "Free" && (
            <div className="status-card-footer">
              <button
                onClick={() => handleCancelSubscription(false)}
                className="sub-action-btn btn-secondary"
              >
                {subscriptionStatus.user?.autoRenew ? "Disable Auto-Renewal" : "Auto-Renew Off"}
              </button>
              <button
                onClick={() => handleCancelSubscription(true)}
                className="sub-action-btn btn-danger"
              >
                Cancel Subscription & Downgrade to Free
              </button>
            </div>
          )}
        </div>
      )}

      {/* BILLING CYCLE SELECTOR TOGGLE */}
      <div className="billing-cycle-toggle-wrapper">
        <h3 className="section-title" style={{ textAlign: "center", marginBottom: "8px" }}>Select Billing Validity Period</h3>
        <p className="section-subtext" style={{ textAlign: "center", marginBottom: "20px" }}>
          Choose your preferred billing cycle to unlock discount savings up to 25%:
        </p>

        <div className="cycle-toggle-bar">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`cycle-btn ${billingCycle === "monthly" ? "active" : ""}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("quarterly")}
            className={`cycle-btn ${billingCycle === "quarterly" ? "active" : ""}`}
          >
            Quarterly <span className="discount-pill">Save 15%</span>
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`cycle-btn ${billingCycle === "yearly" ? "active" : ""}`}
          >
            Yearly <span className="discount-pill yearly-pill">Save 25%</span>
          </button>
        </div>
      </div>

      {/* PLAN COMPARISON MATRIX CARDS (4 PLANS) */}
      <div className="plans-comparison-grid">

        {/* 1. FREE PLAN */}
        <div className={`plan-card ${activePlan === "Free" ? "current-plan-border" : ""}`}>
          <div className="plan-card-header">
            {getPlanIcon("Free")}
            <h3 className="plan-card-name">Free</h3>
            <p className="plan-card-sub">Basic Access for Casual Viewers</p>
          </div>
          <div className="plan-card-price">
            <span className="price-val">₹0</span>
            <span className="price-period">/ {billingCycle}</span>
          </div>
          <ul className="plan-feature-list">
            <li><Check size={16} className="check-icon" /> 1 Video Download / Day</li>
            <li><Check size={16} className="check-icon" /> 480p Standard Quality</li>
            <li><Check size={16} className="check-icon" /> 30 Mins Daily Watch Limit</li>
            <li className="disabled-feat"><X size={16} className="cross-icon" /> Ad-Supported Playback</li>
            <li className="disabled-feat"><X size={16} className="cross-icon" /> No Premium Courses</li>
            <li className="disabled-feat"><X size={16} className="cross-icon" /> Standard Speed</li>
          </ul>
          <button
            disabled={activePlan === "Free"}
            onClick={() => handleInitiatePurchase("Free")}
            className={`plan-select-btn ${activePlan === "Free" ? "btn-disabled" : ""}`}
          >
            {activePlan === "Free" ? "Current Plan" : "Downgrade to Free"}
          </button>
        </div>

        {/* 2. BRONZE PLAN */}
        <div className={`plan-card ${activePlan === "Bronze" ? "current-plan-border" : ""}`}>
          <div className="plan-card-header">
            {getPlanIcon("Bronze")}
            <h3 className="plan-card-name">Bronze</h3>
            <p className="plan-card-sub">Enhanced Downloads & HD Video</p>
          </div>
          <div className="plan-card-price">
            <span className="price-val">₹{pricingData.Bronze[billingCycle]}</span>
            <span className="price-period">/ {billingCycle}</span>
          </div>
          <ul className="plan-feature-list">
            <li><Check size={16} className="check-icon" /> 5 Video Downloads / Day</li>
            <li><Check size={16} className="check-icon" /> 720p HD Streaming</li>
            <li><Check size={16} className="check-icon" /> 4 Hours Daily Watch Limit</li>
            <li><Check size={16} className="check-icon" /> 1 Exclusive Course / Mo</li>
            <li className="disabled-feat"><X size={16} className="cross-icon" /> Ad-Supported Playback</li>
            <li className="disabled-feat"><X size={16} className="cross-icon" /> Standard Priority</li>
          </ul>
          <button
            disabled={activePlan === "Bronze"}
            onClick={() => handleInitiatePurchase("Bronze")}
            className={`plan-select-btn ${activePlan === "Bronze" ? "btn-disabled" : ""}`}
          >
            {activePlan === "Bronze" ? "Current Plan" : `Upgrade to Bronze`}
          </button>
        </div>

        {/* 3. SILVER PLAN */}
        <div className={`plan-card featured-plan ${activePlan === "Silver" ? "current-plan-border" : ""}`}>
          <div className="featured-badge">MOST POPULAR</div>
          <div className="plan-card-header">
            {getPlanIcon("Silver")}
            <h3 className="plan-card-name">Silver</h3>
            <p className="plan-card-sub">Full HD, Ad-Free & Priority Access</p>
          </div>
          <div className="plan-card-price">
            <span className="price-val">₹{pricingData.Silver[billingCycle]}</span>
            <span className="price-period">/ {billingCycle}</span>
          </div>
          <ul className="plan-feature-list">
            <li><Check size={16} className="check-icon" /> 10 Video Downloads / Day</li>
            <li><Check size={16} className="check-icon" /> 1080p Full HD Streaming</li>
            <li><Check size={16} className="check-icon" /> 12 Hours Daily Watch Limit</li>
            <li><Check size={16} className="check-icon" /> 100% Ad-Free Viewing</li>
            <li><Check size={16} className="check-icon" /> 5 Exclusive Courses</li>
            <li><Check size={16} className="check-icon" /> Fast Speed & Priority</li>
          </ul>
          <button
            disabled={activePlan === "Silver"}
            onClick={() => handleInitiatePurchase("Silver")}
            className={`plan-select-btn featured-btn ${activePlan === "Silver" ? "btn-disabled" : ""}`}
          >
            {activePlan === "Silver" ? "Current Plan" : `Upgrade to Silver`}
          </button>
        </div>

        {/* 4. GOLD PLAN */}
        <div className={`plan-card gold-tier-card ${activePlan === "Gold" ? "current-plan-border" : ""}`}>
          <div className="gold-badge">VIP UNLIMITED</div>
          <div className="plan-card-header">
            {getPlanIcon("Gold")}
            <h3 className="plan-card-name">Gold</h3>
            <p className="plan-card-sub">4K Ultra HD & Unlimited Access</p>
          </div>
          <div className="plan-card-price">
            <span className="price-val">₹{pricingData.Gold[billingCycle]}</span>
            <span className="price-period">/ {billingCycle}</span>
          </div>
          <ul className="plan-feature-list">
            <li><Check size={16} className="check-icon" /> 20 Video Downloads / Day</li>
            <li><Check size={16} className="check-icon" /> 4K Ultra HD + HDR</li>
            <li><Check size={16} className="check-icon" /> Unlimited Watch Time</li>
            <li><Check size={16} className="check-icon" /> 100% Ad-Free VIP Experience</li>
            <li><Check size={16} className="check-icon" /> All Exclusive Premium Courses</li>
            <li><Check size={16} className="check-icon" /> Ultra-Fast Priority Content</li>
          </ul>
          <button
            disabled={activePlan === "Gold"}
            onClick={() => handleInitiatePurchase("Gold")}
            className={`plan-select-btn gold-btn ${activePlan === "Gold" ? "btn-disabled" : ""}`}
          >
            {activePlan === "Gold" ? "Current Plan" : `Upgrade to Gold`}
          </button>
        </div>

      </div>

      {/* COMPREHENSIVE FEATURE COMPARISON MATRIX TABLE */}
      <div style={{ marginTop: "32px", background: theme === "dark" ? "#1e293b" : "#ffffff", borderRadius: "20px", padding: "24px", border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0", boxShadow: "0 4px 15px rgba(0,0,0,0.04)", overflowX: "auto" }}>
        <h3 className="section-title" style={{ marginBottom: "6px" }}>Detailed Membership Plans Feature Comparison</h3>
        <p className="section-subtext" style={{ marginBottom: "20px" }}>Compare specifications, streaming quality, daily watch time limits, and download quotas side-by-side:</p>

        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: theme === "dark" ? "2px solid #334155" : "2px solid #e2e8f0" }}>
              <th style={{ padding: "12px 14px", fontWeight: "700" }}>Feature / Benefit</th>
              <th style={{ padding: "12px 14px", fontWeight: "700", color: "#64748b" }}>Free</th>
              <th style={{ padding: "12px 14px", fontWeight: "700", color: "#cd7f32" }}>Bronze</th>
              <th style={{ padding: "12px 14px", fontWeight: "700", color: "#94a3b8" }}>Silver</th>
              <th style={{ padding: "12px 14px", fontWeight: "700", color: "#eab308" }}>Gold VIP</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: theme === "dark" ? "1px solid #334155" : "1px solid #f1f5f9" }}>
              <td style={{ padding: "12px 14px", fontWeight: "600" }}>Monthly Price</td>
              <td style={{ padding: "12px 14px" }}>₹0</td>
              <td style={{ padding: "12px 14px" }}>₹199 / mo</td>
              <td style={{ padding: "12px 14px" }}>₹499 / mo</td>
              <td style={{ padding: "12px 14px", fontWeight: "700" }}>₹999 / mo</td>
            </tr>
            <tr style={{ borderBottom: theme === "dark" ? "1px solid #334155" : "1px solid #f1f5f9" }}>
              <td style={{ padding: "12px 14px", fontWeight: "600" }}>Daily Video Download Limit</td>
              <td style={{ padding: "12px 14px" }}>1 Download / day</td>
              <td style={{ padding: "12px 14px" }}>5 Downloads / day</td>
              <td style={{ padding: "12px 14px" }}>10 Downloads / day</td>
              <td style={{ padding: "12px 14px", fontWeight: "700", color: "#10b981" }}>20 Downloads / day</td>
            </tr>
            <tr style={{ borderBottom: theme === "dark" ? "1px solid #334155" : "1px solid #f1f5f9" }}>
              <td style={{ padding: "12px 14px", fontWeight: "600" }}>Maximum Streaming Quality</td>
              <td style={{ padding: "12px 14px" }}>480p SD</td>
              <td style={{ padding: "12px 14px" }}>720p HD</td>
              <td style={{ padding: "12px 14px" }}>1080p Full HD</td>
              <td style={{ padding: "12px 14px", fontWeight: "700", color: "#eab308" }}>4K Ultra HD + HDR</td>
            </tr>
            <tr style={{ borderBottom: theme === "dark" ? "1px solid #334155" : "1px solid #f1f5f9" }}>
              <td style={{ padding: "12px 14px", fontWeight: "600" }}>Daily Watch Time Allowance</td>
              <td style={{ padding: "12px 14px" }}>30 Minutes / day</td>
              <td style={{ padding: "12px 14px" }}>4 Hours / day</td>
              <td style={{ padding: "12px 14px" }}>12 Hours / day</td>
              <td style={{ padding: "12px 14px", fontWeight: "700", color: "#10b981" }}>Unlimited 24/7</td>
            </tr>
            <tr style={{ borderBottom: theme === "dark" ? "1px solid #334155" : "1px solid #f1f5f9" }}>
              <td style={{ padding: "12px 14px", fontWeight: "600" }}>Ad-Free Experience</td>
              <td style={{ padding: "12px 14px", color: "#ef4444" }}>Standard Ads</td>
              <td style={{ padding: "12px 14px", color: "#ef4444" }}>Standard Ads</td>
              <td style={{ padding: "12px 14px", color: "#10b981", fontWeight: "700" }}>100% Ad-Free</td>
              <td style={{ padding: "12px 14px", color: "#10b981", fontWeight: "700" }}>100% Ad-Free VIP</td>
            </tr>
            <tr style={{ borderBottom: theme === "dark" ? "1px solid #334155" : "1px solid #f1f5f9" }}>
              <td style={{ padding: "12px 14px", fontWeight: "600" }}>Exclusive Premium Courses</td>
              <td style={{ padding: "12px 14px", color: "#ef4444" }}>None</td>
              <td style={{ padding: "12px 14px" }}>1 Course / month</td>
              <td style={{ padding: "12px 14px" }}>5 Courses / month</td>
              <td style={{ padding: "12px 14px", color: "#10b981", fontWeight: "700" }}>All Unlimited Access</td>
            </tr>
            <tr style={{ borderBottom: theme === "dark" ? "1px solid #334155" : "1px solid #f1f5f9" }}>
              <td style={{ padding: "12px 14px", fontWeight: "600" }}>Priority Streaming & Bandwidth</td>
              <td style={{ padding: "12px 14px" }}>Standard</td>
              <td style={{ padding: "12px 14px" }}>Standard</td>
              <td style={{ padding: "12px 14px", color: "#10b981" }}>High Priority</td>
              <td style={{ padding: "12px 14px", color: "#eab308", fontWeight: "700" }}>Ultra-Fast VIP Dedicated</td>
            </tr>
            <tr>
              <td style={{ padding: "12px 14px", fontWeight: "600" }}>Auto-Renewal & Cancel Anytime</td>
              <td style={{ padding: "12px 14px" }}>N/A</td>
              <td style={{ padding: "12px 14px", color: "#10b981" }}>Yes</td>
              <td style={{ padding: "12px 14px", color: "#10b981" }}>Yes</td>
              <td style={{ padding: "12px 14px", color: "#10b981" }}>Yes</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* RAZORPAY TEST PAYMENT CHECKOUT MODAL */}
      {showCheckoutModal && currentOrder && (
        <div className="modal-backdrop fade-in">
          <div className="razorpay-modal-container">
            <div className="razorpay-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CreditCard size={24} color="#ffffff" />
                <div>
                  <h3 style={{ margin: 0, color: "#ffffff", fontSize: "1.1rem" }}>Razorpay Test Checkout</h3>
                  <p style={{ margin: 0, color: "#fca5a5", fontSize: "11px" }}>Secure Test Payment Integration</p>
                </div>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="modal-close-icon">
                <X size={20} />
              </button>
            </div>

            <div className="razorpay-body">
              <div className="order-summary-box">
                <div className="summary-row">
                  <span>Selected Plan:</span>
                  <strong>{selectedPlanForPurchase} Plan</strong>
                </div>
                <div className="summary-row">
                  <span>Billing Cycle:</span>
                  <strong>{billingCycle.toUpperCase()}</strong>
                </div>
                <div className="summary-row">
                  <span>Razorpay Order ID:</span>
                  <code style={{ fontSize: "11px" }}>{currentOrder.orderId}</code>
                </div>
                <div className="summary-row total-amount-row">
                  <span>Total Payable Amount:</span>
                  <strong className="amount-highlight">₹{(currentOrder.amount / 100).toFixed(2)} INR</strong>
                </div>
              </div>

              <div style={{ margin: "20px 0 10px 0" }}>
                <p style={{ fontSize: "12px", fontWeight: "700", marginBottom: "10px" }}>
                  Test Payment Simulation Controls:
                </p>

                <div className="simulation-buttons-grid">
                  <button
                    disabled={processingPayment}
                    onClick={() => handleVerifyPayment("success")}
                    className="sim-btn sim-success"
                  >
                    <CheckCircle2 size={16} /> Process Successful Payment
                  </button>

                  <button
                    disabled={processingPayment}
                    onClick={() => handleVerifyPayment("failed")}
                    className="sim-btn sim-failed"
                  >
                    <XCircle size={16} /> Simulate Payment Failure / Bank Decline
                  </button>

                  <button
                    disabled={processingPayment}
                    onClick={() => handleVerifyPayment("cancelled")}
                    className="sim-btn sim-cancel"
                  >
                    <AlertTriangle size={16} /> Simulate User Cancellation
                  </button>

                  <button
                    disabled={processingPayment}
                    onClick={() => handleVerifyPayment("duplicate")}
                    className="sim-btn sim-dup"
                  >
                    <RefreshCw size={16} /> Test Duplicate Payment Prevention
                  </button>
                </div>
              </div>
            </div>

            <div className="razorpay-footer">
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Razorpay Test Mode • Signature Verification Enabled • Auto PDF Invoice
              </span>
            </div>
          </div>
        </div>
      )}

      {/* BILLING HISTORY & INVOICES TABLE */}
      <div className="billing-history-section">
        <h3 className="section-title">Billing & Transaction History ({transactions.length})</h3>
        <p className="section-subtext">View all processed subscription transactions, order receipts, and invoice documents:</p>

        {transactions.length === 0 ? (
          <div className="empty-history-box">
            <FileText size={32} color="#94a3b8" />
            <p>No transactions found for this account yet.</p>
          </div>
        ) : (
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Plan & Cycle</th>
                  <th>Amount</th>
                  <th>Payment ID</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id}>
                    <td><strong style={{ color: "#990000" }}>{tx.invoiceNumber}</strong></td>
                    <td>{tx.plan} Plan ({tx.billingCycle})</td>
                    <td>₹{(tx.amount / 100).toFixed(2)}</td>
                    <td><code style={{ fontSize: "11px" }}>{tx.razorpayPaymentId || "N/A"}</code></td>
                    <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-pill status-${tx.status.toLowerCase()}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedInvoice(tx)}
                        className="view-invoice-btn"
                      >
                        <FileText size={12} /> View Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INVOICE MODAL VIEWER */}
      {selectedInvoice && (
        <div className="modal-backdrop fade-in">
          <div className="invoice-modal-container">
            <div className="invoice-header">
              <div>
                <h2 style={{ margin: 0, color: "#990000", fontSize: "1.3rem" }}>TAX INVOICE / RECEIPT</h2>
                <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>Invoice ID: {selectedInvoice.invoiceNumber}</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="modal-close-icon" style={{ color: "#000" }}>
                <X size={20} />
              </button>
            </div>

            <div className="invoice-modal-body">
              <div className="invoice-grid-details">
                <div>
                  <label>Billed To:</label>
                  <p><strong>Hari Karan</strong> (harikaran@example.com)</p>
                </div>
                <div>
                  <label>Transaction Status:</label>
                  <p>
                    <span className={`status-pill status-${selectedInvoice.status.toLowerCase()}`}>
                      {selectedInvoice.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label>Razorpay Order ID:</label>
                  <p><code>{selectedInvoice.razorpayOrderId}</code></p>
                </div>
                <div>
                  <label>Razorpay Payment ID:</label>
                  <p><code>{selectedInvoice.razorpayPaymentId || "N/A"}</code></p>
                </div>
                <div>
                  <label>Subscription Period:</label>
                  <p>
                    {new Date(selectedInvoice.startDate).toLocaleDateString()} to{" "}
                    {selectedInvoice.expiryDate ? new Date(selectedInvoice.expiryDate).toLocaleDateString() : "N/A"}
                  </p>
                </div>
                <div>
                  <label>Payment Method:</label>
                  <p>{selectedInvoice.paymentMethod}</p>
                </div>
              </div>

              <table className="invoice-item-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Billing Period</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>{selectedInvoice.plan} Membership Plan</strong></td>
                    <td>{selectedInvoice.billingCycle?.toUpperCase()}</td>
                    <td style={{ textAlign: "right" }}>₹{(selectedInvoice.amount / 100).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="invoice-total-bar">
                <span>Total Paid:</span>
                <strong>₹{(selectedInvoice.amount / 100).toFixed(2)} INR</strong>
              </div>

              <div style={{ marginTop: "20px", fontSize: "11px", color: "#64748b", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
                <p style={{ margin: 0 }}>Support Contact: support@streamflix.com | Official Tax Invoice</p>
              </div>
            </div>

            <div className="invoice-modal-footer">
              <button onClick={() => window.print()} className="sub-action-btn btn-primary" style={{ background: "#990000" }}>
                Print / Save Invoice PDF
              </button>
              <button onClick={() => setSelectedInvoice(null)} className="sub-action-btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
