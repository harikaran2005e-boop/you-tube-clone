import { useEffect, useState } from "react";
import "./App.css";
import CommentSystem from "./components/CommentSystem";
import SubscriptionDashboard from "./components/SubscriptionDashboard";
import SecurityDashboard from "./components/SecurityDashboard";
import CustomVideoPlayer from "./components/CustomVideoPlayer";
import VideoCallingDashboard from "./components/VideoCallingDashboard";
import {
  BarChart3,
  Award,
  Shield,
  ShieldAlert,
  Crown,
  Video,
  Laptop,
  Layers,
  Download,
  Globe,
  Settings,
  AlertCircle,
  CheckCircle2,
  Check,
  MessageSquare,
  Bell,
  Clock,
  Sun,
  Moon,
  Radio
} from "lucide-react";

function App() {
  const [plan, setPlan] = useState("Free");
  const [used, setUsed] = useState(0);
  const [downloads, setDownloads] = useState([]);
  const [message, setMessage] = useState("");
  const [userProfile, setUserProfile] = useState(null);

  // Theme State
  const [theme, setTheme] = useState("light");

  // Active Menu Tab State
  const [activeTab, setActiveTab] = useState("videos");

  // Testing & Edge Case Controls
  const [isExpired, setIsExpired] = useState(false);
  const [simulatedDeviceId, setSimulatedDeviceId] = useState("Standard Browser");

  const userId = "6aaa685bc7a8e4a210c6d15f";

  const handleSetTheme = (nextTheme) => {
    setTheme(nextTheme);
    document.body.classList.toggle("dark-theme", nextTheme === "dark");
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    handleSetTheme(nextTheme);
  };

  const limits = {
    Free: 1,
    Bronze: 5,
    Silver: 10,
    Gold: 20,
  };

  const planDetails = [
    { name: "Free", limit: "1 Download / Day", price: "Included", Icon: BarChart3 },
    { name: "Bronze", limit: "5 Downloads / Day", price: "$5 / Mo", Icon: Award },
    { name: "Silver", limit: "10 Downloads / Day", price: "$15 / Mo", Icon: Shield },
    { name: "Gold", limit: "20 Downloads / Day", price: "$30 / Mo", Icon: Crown },
  ];

  const videos = [
    {
      id: "6aaa688fc7a8e4a210c6d160",
      title: "Download Test Video",
      size: "100 MB",
      Icon: Video,
    },
    {
      id: "6aaa688fc7a8e4a210c6d161",
      title: "Advanced React & Node Tutorial",
      size: "250 MB",
      Icon: Laptop,
    },
    {
      id: "6aaa688fc7a8e4a210c6d162",
      title: "System Architecture Deep Dive",
      size: "450 MB",
      Icon: Layers,
    }
  ];

  // Selected Video State
  const [selectedVideo, setSelectedVideo] = useState(videos[0]);

  const remaining = Math.max(limits[plan] - used, 0);

  // Fetch Download History, Profile & IST Security Theme
  useEffect(() => {
    fetchHistoryAndProfile();
    initSecurityIstTheme();
  }, []);

  const initSecurityIstTheme = () => {
    fetch("http://localhost:5000/api/security/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, browser: "Standard Browser", ipAddress: "103.21.124.89" })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.theme) {
          handleSetTheme(data.theme);
        }
      })
      .catch((err) => console.error("IST Theme init error:", err));
  };

  const fetchHistoryAndProfile = () => {
    // 1. Fetch User Profile
    fetch(`http://localhost:5000/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUserProfile(data.user);
          if (data.user.subscriptionPlan) {
            setPlan(data.user.subscriptionPlan);
          }
          if (data.user.subscriptionExpiry) {
            setIsExpired(new Date() > new Date(data.user.subscriptionExpiry));
          }
        }
      })
      .catch((err) => console.error("Profile error:", err));

    // 2. Fetch Download History
    fetch(`http://localhost:5000/api/downloads/history/${userId}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.downloads) {
          setDownloads(data.downloads);

          const today = new Date().toDateString();

          const todayCompletedNonDupes = data.downloads.filter(
            (item) =>
              item.status === "Completed" &&
              !item.isDuplicate &&
              new Date(item.downloadDate).toDateString() === today
          );

          setUsed(todayCompletedNonDupes.length);
        }
      })
      .catch((error) => {
        console.error("History error:", error);
        setMessage("Unable to load download history");
      });
  };

  // Change Subscription Plan
  async function changePlan(newPlan) {
    try {
      setMessage(`Updating subscription plan to ${newPlan}...`);

      const response = await fetch(
        `http://localhost:5000/api/users/update-plan/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionPlan: newPlan }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Plan update failed");
        return;
      }

      setPlan(newPlan);
      if (userProfile) {
        setUserProfile({ ...userProfile, subscriptionPlan: newPlan });
      }
      fetchHistoryAndProfile();
      setMessage(`Subscription plan successfully updated to ${newPlan}`);
    } catch (error) {
      console.error("Plan update error:", error);
      setMessage("Failed to connect to backend");
    }
  }

  // Toggle Expiry for Testing
  async function toggleExpiry() {
    try {
      const nextState = !isExpired;
      const res = await fetch(`http://localhost:5000/api/users/expiry/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isExpired: nextState })
      });
      const data = await res.json();
      if (res.ok) {
        setIsExpired(nextState);
        setMessage(data.message);
      }
    } catch (err) {
      setMessage("Failed to update subscription expiry");
    }
  }

  // Reset Registered Device for Testing
  async function resetDevice() {
    try {
      const res = await fetch(`http://localhost:5000/api/users/device/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registeredDevice: null })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Device registration reset. Next download will register current device.");
        fetchHistoryAndProfile();
      }
    } catch (err) {
      setMessage("Failed to reset device");
    }
  }

  // Download Video
  async function downloadVideo(video) {
    try {
      setMessage(`Verifying subscription & download permission for "${video.title}"...`);

      const response = await fetch(
        "http://localhost:5000/api/downloads/download",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userId,
            videoId: video.id,
            deviceId: simulatedDeviceId
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(`Download Rejected: ${data.message}`);
        return;
      }

      if (data.isDuplicate) {
        setMessage(`${data.message} | Remaining Quota: ${data.remainingQuota}`);
      } else {
        setMessage(`${data.message} | Remaining Quota: ${data.remainingQuota}`);
      }

      if (data.videoUrl) {
        window.open(data.videoUrl, "_blank");
      }

      fetchHistoryAndProfile();
    } catch (error) {
      console.error("Download error:", error);
      setMessage("Backend connection failed");
    }
  }

  // Handle Video Selection
  function selectVideoCard(video) {
    setSelectedVideo(video);
    setMessage(`Selected video: "${video.title}"`);
  }

  // Handle Next Video in Queue (Task 5 Autoplay)
  function handleNextVideo() {
    const currentIndex = videos.findIndex((v) => v.id === selectedVideo?.id);
    const nextIndex = (currentIndex + 1) % videos.length;
    setSelectedVideo(videos[nextIndex]);
    setMessage(`Auto-playing next video: "${videos[nextIndex].title}"`);
  }

  return (
    <div className={`app fade-in ${theme === "dark" ? "dark-theme" : ""}`}>

      {/* Top Navigation / Brand Header */}
      <div className="brand-header">
        <div>
          <h1 className="brand-subtitle">VIDEO DOWNLOAD & COMMENTING PLATFORM</h1>
          <h2 className="user-greeting">Hi, <span className="user-name">hari</span></h2>
        </div>

        <div className="header-right">
          <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle Theme">
            {theme === "dark" ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} color="#990000" />}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <span className="user-plan-badge">Active Plan: {plan}</span>
          <a
            href="#notifications"
            onClick={(e) => { e.preventDefault(); setMessage("System Status: Download Manager & Multilingual Comments Active."); }}
            className="notification-btn"
            aria-label="Notifications"
          >
            <Bell size={20} color={theme === "dark" ? "#ffffff" : "#990000"} />
            <span className="notification-dot"></span>
          </a>
        </div>
      </div>

      {/* Top Navigation Menu Bar */}
      <div className="top-nav-menu">
        <button
          onClick={() => setActiveTab("call")}
          className={`nav-tab-btn ${activeTab === "call" ? "active" : ""}`}
        >
          <Radio size={16} /> Video Calling
        </button>

        <button
          onClick={() => setActiveTab("player")}
          className={`nav-tab-btn ${activeTab === "player" ? "active" : ""}`}
        >
          <Video size={16} /> Video Player
        </button>

        <button
          onClick={() => setActiveTab("videos")}
          className={`nav-tab-btn ${activeTab === "videos" ? "active" : ""}`}
        >
          <Video size={16} /> Videos Library
        </button>

        <button
          onClick={() => setActiveTab("plans")}
          className={`nav-tab-btn ${activeTab === "plans" ? "active" : ""}`}
        >
          <Award size={16} /> Subscription & Quota
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`nav-tab-btn ${activeTab === "security" ? "active" : ""}`}
        >
          <ShieldAlert size={16} /> Security & Devices
        </button>

        <button
          onClick={() => setActiveTab("comments")}
          className={`nav-tab-btn ${activeTab === "comments" ? "active" : ""}`}
        >
          <MessageSquare size={16} /> Community Discussion
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`nav-tab-btn ${activeTab === "history" ? "active" : ""}`}
        >
          <Download size={16} /> My Downloads ({downloads.length})
        </button>

        <button
          onClick={() => setActiveTab("all")}
          className={`nav-tab-btn ${activeTab === "all" ? "active" : ""}`}
        >
          <Layers size={16} /> Full Overview
        </button>
      </div>

      {/* Notification Toast Message */}
      {message && <div className="message">{message}</div>}

      {/* PAGE SECTION -1: REAL-TIME VIDEO CALLING CONFERENCING */}
      {(activeTab === "call" || activeTab === "all") && (
        <div className="fade-in" style={{ marginBottom: "32px" }}>
          <VideoCallingDashboard
            userId={userId}
            userName={userProfile?.name || "Hari Karan"}
            theme={theme}
          />
        </div>
      )}

      {/* PAGE SECTION 0: VIDEO PLAYER */}
      {(activeTab === "player" || activeTab === "videos" || activeTab === "all") && (
        <div className="fade-in" style={{ marginBottom: "32px" }}>
          <h3 className="section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Video size={20} style={{ color: theme === "dark" ? "#ff6b6b" : "#990000" }} /> Video Player
          </h3>
          <p className="section-subtext" style={{ marginBottom: "16px" }}>
            Full custom controls, volume slider, timeline hover previews, watch progress auto-save, hotkeys, and auto-resume.
          </p>

          <CustomVideoPlayer
            video={selectedVideo}
            userId={userId}
            playlist={videos}
            onNextVideo={handleNextVideo}
            completionThreshold={90}
          />
        </div>
      )}

      {/* PAGE SECTION 1: VIDEOS LIBRARY */}
      {(activeTab === "videos" || activeTab === "all") && (
        <div className="fade-in" style={{ marginBottom: "32px" }}>
          {/* Top Highlights — Feature Banners Grid */}
          <div className="banner-carousel">
            <div className="banner-card banner-red-primary">
              <div className="blur-overlay blur-top-right"></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="banner-pill">SUBSCRIBE & DOWNLOAD</span>
                <Download size={22} color="#ffffff" />
              </div>
              <div>
                <h3 className="banner-title">High-Speed Video Downloads</h3>
                <p className="banner-desc">Enforce daily subscription quotas with instant video access & audit logging.</p>
              </div>
            </div>

            <div className="banner-card banner-red-dark">
              <div className="blur-overlay blur-bottom-left"></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="banner-pill">MULTILINGUAL</span>
                <Globe size={22} color="#ffffff" />
              </div>
              <div>
                <h3 className="banner-title">AI Translation in 40+ Languages</h3>
                <p className="banner-desc">Translate comments, filter profanity, and post nested replies in real-time.</p>
              </div>
            </div>

            <div className="banner-card banner-red-deep">
              <div className="blur-overlay blur-top-right"></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="banner-pill">SECURITY</span>
                <Shield size={22} color="#ffffff" />
              </div>
              <div>
                <h3 className="banner-title">Device Binding & Audit Logs</h3>
                <p className="banner-desc">Track IP address, device fingerprints, and 15-minute duplicate download grace windows.</p>
              </div>
            </div>
          </div>

          {/* Selected Video Banner */}
          {selectedVideo && (
            <div className="selected-video-banner">
              <div style={{ width: "60px", height: "60px", borderRadius: "16px", background: theme === "dark" ? "#2a1215" : "#ffffff", border: theme === "dark" ? "1px solid #5c1d24" : "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <selectedVideo.Icon size={32} color={theme === "dark" ? "#ff6b6b" : "#990000"} />
              </div>
              <div style={{ flex: 1 }}>
                <span className="banner-pill" style={{ background: theme === "dark" ? "#dc2626" : "#990000", color: "#ffffff", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <Check size={12} /> SELECTED VIDEO
                </span>
                <h3 style={{ margin: "6px 0 2px 0", fontSize: "1.1rem" }}>{selectedVideo.title}</h3>
                <p style={{ margin: 0, fontSize: "12px", color: theme === "dark" ? "#ff6b6b" : "#990000" }}>File Size: {selectedVideo.size} | Comments & Download Ready</p>
              </div>
              <button
                onClick={() => downloadVideo(selectedVideo)}
                disabled={remaining <= 0}
                className="video-action-btn"
                style={{ background: theme === "dark" ? "#dc2626" : "#990000", width: "auto", display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                {remaining <= 0 ? "Limit Reached" : <><Download size={16} /> Download Selected Video</>}
              </button>
            </div>
          )}

          {/* Available Videos Library */}
          <h3 className="section-title">Available Videos Library</h3>
          <p className="section-subtext">Click on any video card to select it for downloading or viewing comments:</p>

          <div className="video-grid">
            {videos.map((video) => {
              const isSelected = selectedVideo?.id === video.id;
              const VideoIcon = video.Icon;
              return (
                <div
                  className={`video-card ${isSelected ? "selected-video-card" : ""}`}
                  key={video.id}
                  onClick={() => selectVideoCard(video)}
                >
                  <div className="video-card-thumb">
                    <VideoIcon size={44} color={theme === "dark" ? "#ff6b6b" : "#990000"} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 className="video-card-title">{video.title}</h4>
                    <p className="video-card-meta">File Size: {video.size}</p>
                  </div>

                  <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectVideoCard(video);
                        downloadVideo(video);
                      }}
                      disabled={remaining <= 0}
                      className="video-action-btn"
                      style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                    >
                      {remaining <= 0 ? "Limit Reached" : <><Download size={14} /> Download</>}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectVideoCard(video);
                      }}
                      style={{ background: isSelected ? (theme === "dark" ? "#dc2626" : "#990000") : (theme === "dark" ? "#0b0f19" : "#ffffff"), color: isSelected ? "#ffffff" : (theme === "dark" ? "#ffffff" : "#000000"), border: isSelected ? "none" : (theme === "dark" ? "1px solid #273549" : "1px solid #cbd5e1"), padding: "8px 12px", fontSize: "11px", borderRadius: "14px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px", cursor: "pointer" }}
                    >
                      {isSelected ? <><Check size={12} /> Selected</> : <><MessageSquare size={12} /> Select</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PAGE SECTION 2: SUBSCRIPTION PLANS & MEMBERSHIP MANAGEMENT */}
      {(activeTab === "plans" || activeTab === "all") && (
        <div className="fade-in" style={{ marginBottom: "32px" }}>
          <SubscriptionDashboard
            userId={userId}
            theme={theme}
            onPlanChange={(newPlan) => {
              setPlan(newPlan);
              fetchHistoryAndProfile();
            }}
          />

          {/* Task 1 Device Audit & Expiry Simulation Controls */}
          <div className="quota-summary-card" style={{ marginTop: "24px" }}>
            <h3 className="quota-summary-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Settings size={20} style={{ color: theme === "dark" ? "#ff6b6b" : "#990000" }} /> Task 1 Security & Device Binding Controls
            </h3>
            <div className="quota-info-grid">
              <div><strong>Active Plan:</strong> {plan}</div>
              <div><strong>Daily Limit:</strong> {limits[plan]} Downloads/Day</div>
              <div><strong>Downloads Used Today:</strong> {used}</div>
              <div><strong>Remaining Quota Today:</strong> {remaining}</div>
              <div>
                <strong>Subscription Status:</strong>{" "}
                {isExpired ? (
                  <span style={{ color: theme === "dark" ? "#ff6b6b" : "#990000", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <AlertCircle size={14} /> Expired
                  </span>
                ) : (
                  <span style={{ color: theme === "dark" ? "#ff6b6b" : "#990000", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <CheckCircle2 size={14} /> Active
                  </span>
                )}
              </div>
              <div><strong>Registered Device:</strong> {userProfile?.registeredDevice || "Standard Browser"}</div>
            </div>

            {/* Device Controls */}
            <div style={{ marginTop: "14px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={toggleExpiry} style={{ background: theme === "dark" ? "#dc2626" : "#990000", color: "#ffffff", padding: "8px 14px", fontSize: "11px", borderRadius: "12px", border: "none", fontWeight: "700", cursor: "pointer" }}>
                {isExpired ? "Activate Subscription" : "Simulate Expired"}
              </button>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <label style={{ fontSize: "11px", fontWeight: "600" }}>Device Test:</label>
                <select
                  value={simulatedDeviceId}
                  onChange={(e) => setSimulatedDeviceId(e.target.value)}
                  style={{ fontSize: "11px", padding: "6px 10px", borderRadius: "12px", border: theme === "dark" ? "1px solid #273549" : "1px solid #cbd5e1" }}
                >
                  <option value="Standard Browser">Device 1 (Standard Browser)</option>
                  <option value="Unauthorized Device XYZ">Device 2 (Unauthorized Device XYZ)</option>
                </select>
              </div>

              <button onClick={resetDevice} style={{ background: theme === "dark" ? "#161e2e" : "#ffffff", color: theme === "dark" ? "#ffffff" : "#000000", border: theme === "dark" ? "1px solid #273549" : "1px solid #cbd5e1", padding: "8px 14px", fontSize: "11px", borderRadius: "12px", fontWeight: "700", cursor: "pointer" }}>
                Reset Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAGE SECTION 3: COMMUNITY DISCUSSION */}
      {(activeTab === "comments" || activeTab === "all") && (
        <div className="fade-in" style={{ marginBottom: "32px" }}>
          <CommentSystem
            currentVideoId={selectedVideo?.id}
            currentVideoTitle={selectedVideo?.title}
          />
        </div>
      )}

      {/* PAGE SECTION 4: DEDICATED DOWNLOADS PROFILE SECTION */}
      {(activeTab === "history" || activeTab === "all") && (
        <div className="fade-in" style={{ marginBottom: "32px" }}>
          <div className="activity-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 className="section-title" style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                  <Download size={22} color={theme === "dark" ? "#ff6b6b" : "#990000"} /> Dedicated Downloads Section (Profile)
                </h3>
                <p className="section-subtext" style={{ margin: "4px 0 0 0" }}>
                  Audited download history showing video thumbnails, file sizes, quota tracking, and subscription tiers:
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <span className="banner-pill" style={{ background: theme === "dark" ? "#dc2626" : "#990000", color: "#fff", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Award size={14} /> Daily Quota: {remaining} / {limits[plan]} Left
                </span>
              </div>
            </div>

            {/* Edge Case Simulation Buttons */}
            <div style={{ background: theme === "dark" ? "#1e293b" : "#f8fafc", padding: "12px 16px", borderRadius: "14px", border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0", marginBottom: "20px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", fontWeight: "700" }}>Test Edge Cases:</span>
              <button
                onClick={async () => {
                  try {
                    setMessage("Simulating simultaneous parallel download block across multiple devices...");
                    const res = await fetch("http://localhost:5000/api/downloads/download", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId, videoId: selectedVideo?.id, simulateConcurrent: true })
                    });
                    const data = await res.json();
                    setMessage(res.ok ? data.message : `[Expected Block 429]: ${data.message}`);
                  } catch (e) {
                    setMessage("Error testing simultaneous download");
                  }
                }}
                style={{ background: "#dc2626", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "10px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
              >
                Simulate Simultaneous Stream Block (429)
              </button>

              <button
                onClick={() => {
                  downloadVideo(selectedVideo);
                  setTimeout(() => {
                    setMessage("15-Min Grace Window: Re-downloading same video within 15 minutes preserves daily quota.");
                    downloadVideo(selectedVideo);
                  }, 800);
                }}
                style={{ background: "#2563eb", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "10px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
              >
                Test 15-Min Duplicate Grace Window
              </button>
            </div>

            {downloads.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#94a3b8" }}>No video downloads recorded yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {downloads.map((item) => (
                  <div
                    key={item._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px",
                      borderRadius: "16px",
                      background: theme === "dark" ? "#1e293b" : "#ffffff",
                      border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      flexWrap: "wrap",
                      gap: "14px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: "260px" }}>
                      {/* Video Thumbnail */}
                      <div
                        style={{
                          width: "90px",
                          height: "60px",
                          borderRadius: "10px",
                          overflow: "hidden",
                          position: "relative",
                          background: "#0f172a",
                          flexShrink: 0
                        }}
                      >
                        <img
                          src="youtube.jpg"
                          alt="Thumbnail"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            bottom: "3px",
                            right: "3px",
                            background: "rgba(0,0,0,0.8)",
                            color: "#fff",
                            fontSize: "9px",
                            padding: "1px 4px",
                            borderRadius: "4px",
                            fontWeight: "700"
                          }}
                        >
                          {item.fileSize || "100 MB"}
                        </span>
                      </div>

                      {/* Video Details */}
                      <div>
                        <h4 style={{ fontSize: "14px", fontWeight: "800", margin: "0 0 4px 0" }}>
                          {item.videoId?.title || "Download Test Video"}
                        </h4>
                        <p style={{ fontSize: "12px", color: theme === "dark" ? "#94a3b8" : "#64748b", margin: "0 0 4px 0" }}>
                          Downloaded on: {new Date(item.downloadDate).toLocaleString()}
                        </p>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", fontSize: "11px", color: theme === "dark" ? "#cbd5e1" : "#475569" }}>
                          <span>Plan: <strong>{item.subscriptionPlan}</strong></span>
                          <span>•</span>
                          <span>Quota Left at Download: <strong>{item.remainingQuotaAtDownload ?? "Active"}</strong></span>
                          <span>•</span>
                          <span>IP: <code>{item.ipAddress || "127.0.0.1"}</code></span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill & Action */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span
                        style={{
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "11px",
                          fontWeight: "800",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          background: item.isDuplicate ? "#eff6ff" : (item.status === "Completed" ? "#ecfdf5" : "#fef2f2"),
                          color: item.isDuplicate ? "#1d4ed8" : (item.status === "Completed" ? "#047857" : "#b91c1c"),
                          border: item.isDuplicate ? "1px solid #bfdbfe" : (item.status === "Completed" ? "1px solid #a7f3d0" : "1px solid #fecaca")
                        }}
                      >
                        {item.isDuplicate ? <CheckCircle2 size={12} /> : (item.status === "Completed" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />)}
                        {item.isDuplicate ? "Resumed (Grace Window)" : item.status}
                      </span>

                      {/* Simulate Interrupted Status */}
                      <button
                        onClick={async () => {
                          const newStatus = item.status === "Failed" ? "Completed" : "Failed";
                          await fetch(`http://localhost:5000/api/downloads/status/${item._id}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: newStatus })
                          });
                          fetchHistoryAndProfile();
                          setMessage(`Download status updated to "${newStatus}" for edge case demonstration.`);
                        }}
                        style={{
                          background: "transparent",
                          border: theme === "dark" ? "1px solid #475569" : "1px solid #cbd5e1",
                          color: theme === "dark" ? "#cbd5e1" : "#475569",
                          padding: "6px 10px",
                          borderRadius: "10px",
                          fontSize: "11px",
                          fontWeight: "600",
                          cursor: "pointer"
                        }}
                      >
                        {item.status === "Failed" ? "Mark Completed" : "Simulate Interrupted"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAGE SECTION 5: SECURITY & DEVICES DASHBOARD */}
      {(activeTab === "security" || activeTab === "all") && (
        <div className="fade-in" style={{ marginBottom: "32px" }}>
          <SecurityDashboard
            userId={userId}
            theme={theme}
            onThemeAutoChange={handleSetTheme}
          />
        </div>
      )}

    </div>
  );
}

export default App;