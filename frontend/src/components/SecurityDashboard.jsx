import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Laptop,
  Smartphone,
  Globe,
  Clock,
  Sun,
  Moon,
  KeyRound,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Lock,
  CheckCircle2,
  XCircle,
  MapPin,
  Check,
  X,
  Sparkles
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const API_BASE = `${API_BASE_URL}/security`;

export default function SecurityDashboard({
  userId = "6aaa685bc7a8e4a210c6d15f",
  theme = "light",
  onThemeAutoChange
}) {
  const [themePreference, setThemePreference] = useState("auto");
  const [istTimeInfo, setIstTimeInfo] = useState(null);
  const [loginHistory, setLoginHistory] = useState([]);
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCodeInput, setOtpCodeInput] = useState("");
  const [simulatedOtp, setSimulatedOtp] = useState("");
  const [currentHistoryId, setCurrentHistoryId] = useState(null);
  const [trustDeviceChecked, setTrustDeviceChecked] = useState(true);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  useEffect(() => {
    fetchSecurityOverview();
    fetchLoginHistory();
    fetchTrustedDevices();
  }, [userId]);

  // 1. Initial Security & Theme Check
  const fetchSecurityOverview = async (simulatedTime = null) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          browser: "Chrome 128.0",
          ipAddress: "103.21.124.89",
          city: "Chennai",
          state: "Tamil Nadu",
          country: "India",
          simulatedTime
        })
      });

      const data = await res.json();

      if (res.ok) {
        setIstTimeInfo(data.timeInfo);

        if (onThemeAutoChange && data.theme) {
          onThemeAutoChange(data.theme);
        }

        if (data.requiresOtp) {
          setSimulatedOtp(data.otpCode || "123456");
          setCurrentHistoryId(data.historyId);
          setShowOtpModal(true);
          setMessage(`⚠️ Security Alert: New Device/Location detected! Verification OTP sent.`);
        }
      }
    } catch (err) {
      console.error("Security fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Login History
  const fetchLoginHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/history/${userId}`);
      const data = await res.json();
      if (res.ok && data.history) {
        setLoginHistory(data.history);
      }
    } catch (err) {
      console.error("Fetch history error:", err);
    }
  };

  // 3. Fetch Trusted Devices
  const fetchTrustedDevices = async () => {
    try {
      const res = await fetch(`${API_BASE}/trusted-devices/${userId}`);
      const data = await res.json();
      if (res.ok && data.devices) {
        setTrustedDevices(data.devices);
      }
    } catch (err) {
      console.error("Fetch trusted devices error:", err);
    }
  };

  // 4. Verify OTP Code
  const handleVerifyOtp = async () => {
    if (!otpCodeInput || otpCodeInput.length < 6) {
      setMessage("Please enter the complete 6-digit OTP code.");
      return;
    }

    try {
      setVerifyingOtp(true);
      const res = await fetch(`${API_BASE}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          otpCode: otpCodeInput,
          trustDevice: trustDeviceChecked,
          historyId: currentHistoryId
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage("🎉 Security OTP verified! Access granted and device trusted.");
        setShowOtpModal(false);
        setOtpCodeInput("");
        fetchLoginHistory();
        fetchTrustedDevices();

        if (onThemeAutoChange && data.theme) {
          onThemeAutoChange(data.theme);
        }
      } else {
        setMessage(`❌ Verification Failed: ${data.message}`);
        fetchLoginHistory();
      }
    } catch (err) {
      setMessage("Error during OTP verification.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // 5. Update Theme Preference
  const handleUpdateThemePref = async (pref) => {
    try {
      setThemePreference(pref);
      const res = await fetch(`${API_BASE}/theme/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themePreference: pref })
      });
      const data = await res.json();

      if (res.ok && data.theme) {
        setMessage(`Theme preference saved to '${pref}'. Active theme: ${data.theme.toUpperCase()}`);
        if (onThemeAutoChange) {
          onThemeAutoChange(data.theme);
        }
        setIstTimeInfo(data.timeInfo);
      }
    } catch (err) {
      setMessage("Failed to update theme preference");
    }
  };

  // 6. Revoke Trusted Device
  const handleRevokeDevice = async (deviceId) => {
    try {
      const res = await fetch(`${API_BASE}/trusted-devices/${deviceId}`, {
        method: "DELETE"
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(`Device trust revoked!`);
        fetchTrustedDevices();
        fetchLoginHistory();
      }
    } catch (err) {
      setMessage("Failed to revoke device");
    }
  };

  // 7. Security Simulation Test Handler
  const handleSimulateScenario = async (scenario) => {
    try {
      setMessage(`Simulating security test: ${scenario.toUpperCase()}...`);
      const res = await fetch(`${API_BASE}/simulate-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, scenario })
      });

      const data = await res.json();

      if (res.ok) {
        setIstTimeInfo(data.timeInfo);

        if (data.requiresOtp) {
          setSimulatedOtp(data.otpCode || "654321");
          setCurrentHistoryId(data.historyId);
          setShowOtpModal(true);
          setMessage(`🚨 Security Test Triggered: New Device/Location! Auto OTP generated.`);
        } else {
          setMessage(`✅ Login Authorized: Recognized / Trusted Device. Theme: ${data.theme.toUpperCase()}`);
          if (onThemeAutoChange && data.theme) {
            onThemeAutoChange(data.theme);
          }
        }
        fetchLoginHistory();
      }
    } catch (err) {
      setMessage("Simulation failed");
    }
  };

  return (
    <div className={`security-container fade-in ${theme === "dark" ? "dark-theme" : ""}`}>

      {/* Header Banner */}
      <div className="sec-header-banner">
        <div>
          <span className="banner-pill" style={{ background: "#990000", color: "#fff" }}>
            TASK 4 SECURITY AUDIT & IST TIME THEME
          </span>
          <h2 className="sec-header-title">Personalized Theme & Account Security</h2>
          <p className="sec-header-desc">
            Automatic time-based theme adaptation (IST), comprehensive IP/Device audit logging, and 2FA OTP verification for new devices.
          </p>
        </div>
        <div className="sec-header-badge">
          <ShieldCheck size={42} color="#ffffff" />
        </div>
      </div>

      {/* Toast Notification */}
      {message && (
        <div className="sub-notification-toast">
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="sub-toast-close">
            <X size={14} />
          </button>
        </div>
      )}

      {/* SECTION 1: TIME-BASED AUTOMATIC THEME ADAPTATION CARD */}
      <div className="sec-card">
        <div className="sec-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Clock size={22} color={theme === "dark" ? "#ff6b6b" : "#990000"} />
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Time-Based Theme Adaptation (IST)</h3>
              <p style={{ margin: 0, fontSize: "11px", color: theme === "dark" ? "#94a3b8" : "#64748b" }}>
                Auto-enables Light Theme between 5:00 AM & 12:00 PM IST; Dark Theme during all other times.
              </p>
            </div>
          </div>
          <span className="ist-time-pill">
            <Clock size={12} /> {istTimeInfo?.timeStringIST || "05:30 PM IST"}
          </span>
        </div>

        <div className="theme-status-grid">
          <div className="theme-status-box">
            <span className="box-label">IST Time Window Check</span>
            <strong className="box-val">
              {istTimeInfo?.isLightWindow ? "Morning Window (5 AM - 12 PM)" : "Evening/Night Window (12 PM - 5 AM)"}
            </strong>
          </div>
          <div className="theme-status-box">
            <span className="box-label">Resolved Active Theme</span>
            <strong className="box-val" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {theme === "light" ? <Sun size={16} color="#eab308" /> : <Moon size={16} color="#3b82f6" />}
              {theme.toUpperCase()} MODE
            </strong>
          </div>
          <div className="theme-status-box">
            <span className="box-label">Theme Persistence Mode</span>
            <strong className="box-val">{themePreference.toUpperCase()}</strong>
          </div>
        </div>

        {/* Theme Preference Selection Buttons */}
        <div className="theme-pref-controls">
          <span style={{ fontSize: "12px", fontWeight: "700" }}>Manual Override & Preference:</span>
          <button
            onClick={() => handleUpdateThemePref("auto")}
            className={`pref-btn ${themePreference === "auto" ? "active" : ""}`}
          >
            <Sparkles size={14} /> Auto IST Detection
          </button>
          <button
            onClick={() => handleUpdateThemePref("light")}
            className={`pref-btn ${themePreference === "light" ? "active" : ""}`}
          >
            <Sun size={14} /> Force Light Mode
          </button>
          <button
            onClick={() => handleUpdateThemePref("dark")}
            className={`pref-btn ${themePreference === "dark" ? "active" : ""}`}
          >
            <Moon size={14} /> Force Dark Mode
          </button>
        </div>
      </div>

      {/* SECTION 2: INTERACTIVE SECURITY TEST SUITE */}
      <div className="sec-card">
        <h3 className="section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertTriangle size={20} color={theme === "dark" ? "#ff6b6b" : "#990000"} /> Security Risk Simulation Suite
        </h3>
        <p className="section-subtext">Click any scenario button to simulate real-time login security evaluation:</p>

        <div className="test-suite-grid">
          <button onClick={() => handleSimulateScenario("new_browser")} className="sim-test-btn sim-orange">
            <Laptop size={16} /> Simulate New Browser (Firefox on Mac)
          </button>
          <button onClick={() => handleSimulateScenario("new_location")} className="sim-test-btn sim-red">
            <Globe size={16} /> Simulate New IP & City (Mumbai, 185.220.101.4)
          </button>
          <button onClick={() => handleSimulateScenario("morning_ist")} className="sim-test-btn sim-yellow">
            <Sun size={16} /> Simulate Morning Login (8:30 AM IST to Light Mode)
          </button>
          <button onClick={() => handleSimulateScenario("evening_ist")} className="sim-test-btn sim-purple">
            <Moon size={16} /> Simulate Evening Login (8:30 PM IST to Dark Mode)
          </button>
        </div>
      </div>

      {/* OTP VERIFICATION MODAL */}
      {showOtpModal && (
        <div className="modal-backdrop fade-in">
          <div className="otp-modal-container">
            <div className="otp-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <KeyRound size={26} color="#ffffff" />
                <div>
                  <h3 style={{ margin: 0, color: "#ffffff", fontSize: "1.2rem" }}>New Device OTP Verification</h3>
                  <p style={{ margin: 0, color: "#fca5a5", fontSize: "11px" }}>Unrecognized IP / Browser Detected</p>
                </div>
              </div>
              <button onClick={() => setShowOtpModal(false)} className="modal-close-icon">
                <X size={20} />
              </button>
            </div>

            <div className="otp-body">
              <p style={{ fontSize: "13px", color: theme === "dark" ? "#cbd5e1" : "#475569", margin: "0 0 16px 0" }}>
                A 6-digit verification code has been dispatched to your email address. Enter the code below to authorize your session:
              </p>

              {/* Demo Helper Pill */}
              <div className="otp-demo-helper">
                <span>Demo Security OTP Code:</span>
                <strong style={{ fontSize: "1.1rem", color: "#990000", letterSpacing: "2px" }}>{simulatedOtp}</strong>
                <button
                  onClick={() => setOtpCodeInput(simulatedOtp)}
                  className="auto-fill-btn"
                >
                  Auto-Fill OTP
                </button>
              </div>

              <div className="otp-input-wrapper">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCodeInput}
                  onChange={(e) => setOtpCodeInput(e.target.value)}
                  placeholder="Enter 6-Digit OTP"
                  className="otp-pin-input"
                />
              </div>

              <div className="trust-checkbox-row">
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px" }}>
                  <input
                    type="checkbox"
                    checked={trustDeviceChecked}
                    onChange={(e) => setTrustDeviceChecked(e.target.checked)}
                  />
                  <strong>Remember and trust this device for 30 days</strong>
                </label>
              </div>

              <button
                disabled={verifyingOtp}
                onClick={handleVerifyOtp}
                className="otp-verify-submit-btn"
              >
                {verifyingOtp ? "Verifying OTP Code..." : "Verify OTP & Grant Access"}
              </button>
            </div>

            <div className="otp-footer">
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Didn't receive the email code? Check spam folder or resend.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: TRUSTED DEVICES LIST */}
      <div className="sec-card">
        <h3 className="section-title">Trusted Devices & Remembered Sessions ({trustedDevices.length})</h3>
        <p className="section-subtext">Recognized devices that bypass repetitive OTP verification codes:</p>

        {trustedDevices.length === 0 ? (
          <p style={{ fontSize: "12px", color: "#94a3b8" }}>No trusted devices registered yet.</p>
        ) : (
          <div className="trusted-devices-grid">
            {trustedDevices.map((dev) => (
              <div key={dev._id} className="trusted-device-card">
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div className="device-icon-box">
                    <Laptop size={22} color={theme === "dark" ? "#ff6b6b" : "#990000"} />
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 2px 0", fontSize: "13px", fontWeight: "700" }}>{dev.deviceName}</h4>
                    <p style={{ margin: 0, fontSize: "11px", color: theme === "dark" ? "#94a3b8" : "#64748b" }}>
                      IP: {dev.ipAddress} • {dev.location}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="trust-expires-pill">
                    <ShieldCheck size={12} /> Trusted until {new Date(dev.expiresAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleRevokeDevice(dev._id)}
                    className="revoke-btn"
                    title="Revoke Device Trust"
                  >
                    <Trash2 size={14} /> Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4: LOGIN AUDIT HISTORY TABLE */}
      <div className="sec-card">
        <h3 className="section-title">Detailed Login Audit History ({loginHistory.length})</h3>
        <p className="section-subtext">Comprehensive security audit logs including public IP, browser version, OS, location, and risk flags:</p>

        {loginHistory.length === 0 ? (
          <p style={{ fontSize: "12px", color: "#94a3b8" }}>No login history records logged yet.</p>
        ) : (
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Device & OS</th>
                  <th>Browser</th>
                  <th>IP Address</th>
                  <th>Location</th>
                  <th>Risk Assessment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((log) => (
                  <tr key={log._id}>
                    <td>{new Date(log.loginTimestamp).toLocaleString()}</td>
                    <td><strong>{log.deviceModel || log.deviceType}</strong> ({log.os})</td>
                    <td>{log.browser}</td>
                    <td><code>{log.ipAddress}</code></td>
                    <td><MapPin size={12} style={{ display: "inline", marginRight: "4px" }} />{log.locationString}</td>
                    <td>
                      {log.riskFlags && log.riskFlags.length > 0 ? (
                        log.riskFlags.map((flag) => (
                          <span key={flag} className="risk-flag-pill">
                            {flag}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "11px", color: "#22c55e", fontWeight: "600" }}>Recognized</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill status-${log.status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
