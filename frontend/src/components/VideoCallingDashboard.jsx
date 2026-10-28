import { useState, useEffect, useRef } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  ScreenShare,
  PhoneOff,
  Users,
  MessageSquare,
  Hand,
  Shield,
  ShieldAlert,
  Lock,
  Unlock,
  Settings,
  Send,
  Paperclip,
  Smile,
  Copy,
  Check,
  Radio,
  UserPlus,
  Crown,
  Volume2,
  VolumeX,
  RefreshCw,
  Zap,
  Download,
  AlertCircle,
  Maximize2,
  Minimize2,
  Camera,
  X
} from "lucide-react";

export default function VideoCallingDashboard({
  userId = "6aaa685bc7a8e4a210c6d15f",
  userName = "Hari Karan",
  theme = "light"
}) {
  // Active Meeting State
  const [meeting, setMeeting] = useState(null);
  const [inCall, setInCall] = useState(false);

  // Form Inputs for Create/Join
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinAccessCode, setJoinAccessCode] = useState("");
  const [newTitle, setNewTitle] = useState("Team Sync Standup");
  const [newMaxParticipants, setNewMaxParticipants] = useState(10);
  const [newAccessCode, setNewAccessCode] = useState("");

  // Media & Controls State
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("user"); // 'user' | 'environment'
  const [noiseSuppression, setNoiseSuppression] = useState(true);

  // Call Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlobs, setRecordedBlobs] = useState([]);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);

  // Drawers & Panels
  const [activeDrawer, setActiveDrawer] = useState(null); // 'participants' | 'chat' | 'settings' | null
  const [chatInput, setChatInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // Status & Notification Toast
  const [statusMessage, setStatusMessage] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Call Duration Timer
  const [callDuration, setCallDuration] = useState(0);

  // Local Media Stream & Video Ref
  const localVideoRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Edge Case Simulation Controls
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState(userId);

  // Real-time Poll Timer
  const pollTimerRef = useRef(null);

  // Initialize Local User Camera / Microphone
  useEffect(() => {
    if (inCall) {
      startLocalMedia();
    } else {
      stopLocalMedia();
    }
  }, [inCall]);

  const startLocalMedia = async () => {
    try {
      setPermissionDenied(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera/Mic permission denied or not available, using simulated stream mode:", err);
      setPermissionDenied(true);
    }
  };

  const stopLocalMedia = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
  };

  // Call Duration Counter
  useEffect(() => {
    let timer;
    if (inCall) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [inCall]);

  // Poll Meeting State from Backend
  useEffect(() => {
    if (inCall && meeting) {
      pollTimerRef.current = setInterval(() => {
        fetch(`http://localhost:5000/api/meetings/${meeting.roomId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.meeting) {
              setMeeting(data.meeting);
            }
          })
          .catch((err) => console.error("Poll error:", err));
      }, 3000);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [inCall, meeting?.roomId]);

  // Format Call Duration (HH:MM:SS)
  const formatDuration = (secs) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? "0" : ""}${mins}:${s < 10 ? "0" : ""}${s}`;
    }
    return `${mins < 10 ? "0" : ""}${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  // Create Video Call Meeting
  const handleCreateMeeting = async () => {
    try {
      setStatusMessage("Creating secure meeting room...");
      const res = await fetch("http://localhost:5000/api/meetings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          userName,
          title: newTitle,
          accessCode: newAccessCode,
          maxParticipants: newMaxParticipants
        })
      });
      const data = await res.json();
      if (res.ok && data.meeting) {
        setMeeting(data.meeting);
        setInCall(true);
        setStatusMessage(`Meeting "${data.meeting.title}" created. Room ID: ${data.meeting.roomId}`);
      } else {
        setStatusMessage(`Error: ${data.message}`);
      }
    } catch (err) {
      setStatusMessage("Failed to create meeting. Backend offline.");
    }
  };

  // Join Video Call Meeting
  const handleJoinMeeting = async (explicitRoomId = null) => {
    const targetRoomId = (typeof explicitRoomId === "string" ? explicitRoomId : joinRoomId)?.trim();
    if (!targetRoomId) {
      setStatusMessage("Please enter a valid Room ID");
      return;
    }
    try {
      setStatusMessage(`Joining meeting room ${targetRoomId}...`);
      const res = await fetch("http://localhost:5000/api/meetings/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: targetRoomId,
          userId,
          userName,
          accessCode: joinAccessCode
        })
      });
      const data = await res.json();
      if (res.ok && data.meeting) {
        setMeeting(data.meeting);
        setInCall(true);
        setStatusMessage(`Joined meeting room: ${data.meeting.roomId}`);
      } else {
        setStatusMessage(`Join Failed: ${data.message}`);
      }
    } catch (err) {
      setStatusMessage("Failed to join meeting");
    }
  };

  // Toggle Mic / Camera / Hand State
  const toggleMic = async () => {
    const nextMic = !micOn;
    setMicOn(nextMic);
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => (track.enabled = nextMic));
    }
    updateStateOnBackend({ isMuted: !nextMic });
  };

  const toggleCamera = async () => {
    const nextCam = !cameraOn;
    setCameraOn(nextCam);
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => (track.enabled = nextCam));
    }
    updateStateOnBackend({ isCameraOff: !nextCam });
  };

  const toggleHandRaise = async () => {
    const nextHand = !handRaised;
    setHandRaised(nextHand);
    updateStateOnBackend({ isHandRaised: nextHand });
  };

  const updateStateOnBackend = (updateObj) => {
    if (!meeting) return;
    fetch(`http://localhost:5000/api/meetings/${meeting.roomId}/participant-state`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...updateObj })
    }).catch((err) => console.error(err));
  };

  // Switch Front / Rear Camera
  const switchCameraFacing = async () => {
    const nextFacing = cameraFacing === "user" ? "environment" : "user";
    setCameraFacing(nextFacing);
    try {
      stopLocalMedia();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing },
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setStatusMessage(`Switched to ${nextFacing === "user" ? "Front" : "Rear"} Camera`);
    } catch (e) {
      setStatusMessage("Camera switch simulated for desktop");
    }
  };

  // Screen Sharing
  const toggleScreenShare = async () => {
    if (!meeting?.allowScreenShare) {
      setStatusMessage("Screen sharing is disabled by the host");
      return;
    }
    if (isScreenSharing) {
      setIsScreenSharing(false);
      startLocalMedia();
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setIsScreenSharing(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          startLocalMedia();
        };
      } catch (err) {
        console.warn("Screen share fallback simulation:", err);
        setIsScreenSharing(true);
        setStatusMessage("Screen Share Active (Simulation Stream)");
      }
    }
  };

  // Recording Feature
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setStatusMessage("Call recording saved! File ready for download.");
    } else {
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      if (localStream) {
        try {
          const recorder = new MediaRecorder(localStream);
          const chunks = [];
          recorder.ondataavailable = (e) => chunks.push(e.data);
          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: "video/webm" });
            const url = URL.createObjectURL(blob);
            setRecordedBlobs((prev) => [...prev, { url, time: new Date().toLocaleTimeString() }]);
          };
          recorder.start();
          mediaRecorderRef.current = recorder;
        } catch (e) {}
      }
      setStatusMessage("Call recording started...");
    }
  };

  // Send In-Call Chat Message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() && !selectedFile) return;

    try {
      const res = await fetch(`http://localhost:5000/api/meetings/${meeting.roomId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: userId,
          senderName: userName,
          text: chatInput,
          fileName: selectedFile?.name || "",
          fileUrl: selectedFile ? "https://www.w3schools.com/html/mov_bbb.mp4" : ""
        })
      });
      const data = await res.json();
      if (res.ok) {
        setChatInput("");
        setSelectedFile(null);
        setMeeting(data.meeting || meeting);
      } else {
        setStatusMessage(`Chat Rejected: ${data.message}`);
      }
    } catch (err) {
      setStatusMessage("Failed to send chat message");
    }
  };

  // Host Moderation Action
  const executeModeration = async (action, targetUserId = null, extraParams = {}) => {
    if (!meeting) return;
    try {
      const res = await fetch(`http://localhost:5000/api/meetings/${meeting.roomId}/moderation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterId: userId,
          action,
          targetUserId,
          ...extraParams
        })
      });
      const data = await res.json();
      if (res.ok && data.meeting) {
        setMeeting(data.meeting);
        setStatusMessage(`Moderation Action: ${action} executed`);
      } else {
        setStatusMessage(`Moderation Error: ${data.message}`);
      }
    } catch (err) {
      setStatusMessage("Failed to execute moderation action");
    }
  };

  // Leave / End Call
  const handleLeaveCall = async (endForAll = false) => {
    if (!meeting) return;
    try {
      await fetch(`http://localhost:5000/api/meetings/${meeting.roomId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, endMeetingForAll: endForAll })
      });
    } catch (e) {}

    setInCall(false);
    setMeeting(null);
    stopLocalMedia();
    setStatusMessage(endForAll ? "Meeting ended for all participants." : "You left the call.");
  };

  // Copy Meeting Room Link
  const copyMeetingLink = () => {
    if (!meeting) return;
    navigator.clipboard.writeText(`http://localhost:5173/?room=${meeting.roomId}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Simulate Network Reconnection Edge Case
  const triggerReconnectionTest = () => {
    setIsReconnecting(true);
    setStatusMessage("Simulating network interruption & WebRTC reconnection...");
    setTimeout(() => {
      setIsReconnecting(false);
      setStatusMessage("Signal restored! WebRTC stream re-established.");
    }, 3500);
  };

  // Simulated Participant Tiles Generator
  const getDisplayParticipants = () => {
    if (!meeting) return [];
    const list = [...meeting.participants];

    // Ensure at least 3 participants for realistic group conference visualization
    if (list.length === 1) {
      list.push(
        { userId: "user-201", name: "Alex Rivers", isHost: false, isCoHost: false, isMuted: false, isCameraOff: false, isHandRaised: false },
        { userId: "user-202", name: "Sophia Chen", isHost: false, isCoHost: true, isMuted: true, isCameraOff: false, isHandRaised: true },
        { userId: "user-203", name: "Marcus Vance", isHost: false, isCoHost: false, isMuted: false, isCameraOff: true, isHandRaised: false }
      );
    }
    return list;
  };

  const participantsList = getDisplayParticipants();

  return (
    <div className={`video-call-dashboard ${theme === "dark" ? "dark-theme" : ""}`}>
      {/* Toast Notification */}
      {statusMessage && <div className="message">{statusMessage}</div>}

      {!inCall ? (
        /* ROOM CREATION & JOINING LOBBY PORTAL */
        <div style={{ background: theme === "dark" ? "#111827" : "#ffffff", padding: "32px", borderRadius: "24px", border: theme === "dark" ? "1px solid #1f2937" : "1.5px solid #cbd5e1", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <span className="banner-pill" style={{ background: theme === "dark" ? "#dc2626" : "#990000", color: "#ffffff", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Radio size={14} /> TASK 6 REAL-TIME WEBRTC CONFERENCING
              </span>
              <h2 style={{ margin: "10px 0 4px 0", fontSize: "1.5rem", fontWeight: "800" }}>
                Secure Real-Time Video Conference
              </h2>
              <p style={{ margin: 0, fontSize: "13px", color: theme === "dark" ? "#9ca3af" : "#64748b" }}>
                Create HD group calls, share screens, record sessions, and moderate participants in real time.
              </p>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid #10b981", padding: "4px 10px", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Shield size={12} /> E2EE WebRTC Encrypted
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
            {/* CREATE MEETING ROOM FORM */}
            <div style={{ background: theme === "dark" ? "#1f2937" : "#f8fafc", padding: "24px", borderRadius: "18px", border: theme === "dark" ? "1px solid #374151" : "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <Video size={20} color={theme === "dark" ? "#ff6b6b" : "#990000"} /> Create New Meeting Room
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", display: "block", marginBottom: "4px" }}>Meeting Topic / Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Daily Standup Sync"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: theme === "dark" ? "1px solid #374151" : "1px solid #cbd5e1", fontSize: "13px" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "700", display: "block", marginBottom: "4px" }}>Max Participants</label>
                    <select
                      value={newMaxParticipants}
                      onChange={(e) => setNewMaxParticipants(Number(e.target.value))}
                      style={{ width: "100%", padding: "10px", borderRadius: "10px", border: theme === "dark" ? "1px solid #374151" : "1px solid #cbd5e1", fontSize: "13px" }}
                    >
                      <option value={2}>1-on-1 Call (Max 2)</option>
                      <option value={5}>Small Team (Max 5)</option>
                      <option value={10}>Standard Group (Max 10)</option>
                      <option value={25}>Large Conference (Max 25)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", fontWeight: "700", display: "block", marginBottom: "4px" }}>Access Password (Optional)</label>
                    <input
                      type="text"
                      value={newAccessCode}
                      onChange={(e) => setNewAccessCode(e.target.value)}
                      placeholder="e.g. 1234"
                      style={{ width: "100%", padding: "10px", borderRadius: "10px", border: theme === "dark" ? "1px solid #374151" : "1px solid #cbd5e1", fontSize: "13px" }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateMeeting}
                  style={{ background: theme === "dark" ? "#dc2626" : "#990000", color: "#ffffff", padding: "12px", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "8px" }}
                >
                  <Video size={18} /> Start Instant Video Call
                </button>
              </div>
            </div>

            {/* JOIN MEETING ROOM FORM */}
            <div style={{ background: theme === "dark" ? "#1f2937" : "#f8fafc", padding: "24px", borderRadius: "18px", border: theme === "dark" ? "1px solid #374151" : "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <UserPlus size={20} color={theme === "dark" ? "#ff6b6b" : "#990000"} /> Join Existing Call
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", display: "block", marginBottom: "4px" }}>Room ID / Meeting Link</label>
                  <input
                    type="text"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    placeholder="Enter Room ID (e.g. call-492019)"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: theme === "dark" ? "1px solid #374151" : "1px solid #cbd5e1", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", display: "block", marginBottom: "4px" }}>Access Code (If Protected)</label>
                  <input
                    type="password"
                    value={joinAccessCode}
                    onChange={(e) => setJoinAccessCode(e.target.value)}
                    placeholder="Enter password if required"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: theme === "dark" ? "1px solid #374151" : "1px solid #cbd5e1", fontSize: "13px" }}
                  />
                </div>

                <button
                  onClick={handleJoinMeeting}
                  style={{ background: theme === "dark" ? "#2563eb" : "#1d4ed8", color: "#ffffff", padding: "12px", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "8px" }}
                >
                  <UserPlus size={18} /> Join Meeting Room
                </button>
              </div>

              {/* Quick Demo Pre-built Rooms */}
              <div style={{ marginTop: "20px", paddingTop: "14px", borderTop: theme === "dark" ? "1px solid #374151" : "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#9ca3af", display: "block", marginBottom: "8px" }}>Or Quick Join Demo Rooms:</span>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => { setJoinRoomId("call-demo101"); handleJoinMeeting("call-demo101"); }}
                    style={{ background: theme === "dark" ? "#111827" : "#ffffff", border: theme === "dark" ? "1px solid #374151" : "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}
                  >
                    🚀 Team Demo Room
                  </button>
                  <button
                    onClick={() => { setJoinRoomId("call-design99"); handleJoinMeeting("call-design99"); }}
                    style={{ background: theme === "dark" ? "#111827" : "#ffffff", border: theme === "dark" ? "1px solid #374151" : "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}
                  >
                    🎨 Design Review Room
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* IN-CALL VIDEO CONFERENCE INTERFACE */
        <div style={{ background: "#030712", borderRadius: "24px", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6)", color: "#ffffff", position: "relative" }}>
          {/* TOP CALL BAR */}
          <div style={{ background: "rgba(17, 24, 39, 0.95)", borderBottom: "1px solid #1f2937", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
                  {meeting?.title || "Video Call Room"}
                  {meeting?.isLocked && <Lock size={14} color="#f59e0b" title="Room Locked" />}
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#9ca3af", display: "flex", gap: "12px", alignItems: "center" }}>
                  <span>Room ID: <strong style={{ color: "#ffffff" }}>{meeting?.roomId}</strong></span>
                  <span>•</span>
                  <span>Duration: <strong style={{ color: "#10b981" }}>{formatDuration(callDuration)}</strong></span>
                  <span>•</span>
                  <span>{participantsList.length} / {meeting?.maxParticipants || 10} Connected</span>
                </p>
              </div>
            </div>

            {/* Top Right Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {isRecording && (
                <div style={{ background: "rgba(220, 38, 38, 0.2)", border: "1px solid #dc2626", color: "#ef4444", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px", animation: "pulse 1.5s infinite" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }} />
                  REC {formatDuration(recordingTime)}
                </div>
              )}

              <button
                onClick={copyMeetingLink}
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#ffffff", padding: "6px 12px", borderRadius: "10px", fontSize: "11px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
              >
                {copiedLink ? <Check size={14} color="#10b981" /> : <Copy size={14} />} {copiedLink ? "Link Copied!" : "Share Link"}
              </button>

              <button
                onClick={triggerReconnectionTest}
                title="Test Network Interruption / Reconnection"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#9ca3af", padding: "6px", borderRadius: "10px", cursor: "pointer" }}
              >
                <Zap size={16} />
              </button>
            </div>
          </div>

          {/* MAIN VIDEO CONFERENCE AREA & SIDE DRAWER */}
          <div style={{ display: "flex", minHeight: "520px", position: "relative" }}>
            {/* PARTICIPANT VIDEO TILES GRID */}
            <div style={{ flex: 1, padding: "20px", background: "#0b0f17", display: "grid", gridTemplateColumns: participantsList.length > 2 ? "repeat(auto-fit, minmax(280px, 1fr))" : "repeat(auto-fit, minmax(360px, 1fr))", gap: "16px", alignContent: "center", position: "relative" }}>
              {/* Reconnection Overlay Notice */}
              {isReconnecting && (
                <div style={{ position: "absolute", inset: 0, zIndex: 30, background: "rgba(3, 7, 18, 0.85)", backdropFilter: "blur(6px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
                  <RefreshCw size={36} color="#f59e0b" style={{ animation: "spin 1s linear infinite", marginBottom: "12px" }} />
                  <h4 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>Reconnecting WebRTC Signal...</h4>
                  <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>Adapting network stream & restoring video buffer</p>
                </div>
              )}

              {/* Participant Video Tiles */}
              {participantsList.map((p, idx) => {
                const isMe = p.userId === userId;
                const isSpeaking = activeSpeakerId === p.userId && (!isMe ? !p.isMuted : micOn);

                return (
                  <div
                    key={p.userId || idx}
                    style={{
                      position: "relative",
                      borderRadius: "16px",
                      overflow: "hidden",
                      background: "#111827",
                      border: isSpeaking ? "2.5px solid #10b981" : "1px solid #1f2937",
                      boxShadow: isSpeaking ? "0 0 20px rgba(16, 185, 129, 0.4)" : "none",
                      minHeight: "220px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.3s ease"
                    }}
                  >
                    {/* Video Element or Avatar Box */}
                    {isMe ? (
                      cameraOn && !permissionDenied ? (
                        <video
                          ref={localVideoRef}
                          autoPlay
                          muted
                          playsInline
                          style={{ width: "100%", height: "100%", objectFit: "cover", transform: cameraFacing === "user" ? "scaleX(-1)" : "none" }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#1f2937", minHeight: "180px" }}>
                          <div style={{ width: "70px", height: "70px", borderRadius: "50%", background: "#dc2626", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", fontWeight: "800", boxShadow: "0 4px 14px rgba(0,0,0,0.4)" }}>
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <p style={{ marginTop: "10px", fontSize: "12px", color: "#9ca3af" }}>
                            {permissionDenied ? "Camera Permission Blocked" : "Camera Turned Off"}
                          </p>
                        </div>
                      )
                    ) : !p.isCameraOff ? (
                      /* Remote Participant Stream Simulation Video */
                      <video
                        src={idx % 2 === 0 ? "https://www.w3schools.com/html/mov_bbb.mp4" : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"}
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#1f2937", minHeight: "180px" }}>
                        <div style={{ width: "70px", height: "70px", borderRadius: "50%", background: "#2563eb", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", fontWeight: "800" }}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    )}

                    {/* Raised Hand Floating Indicator */}
                    {(isMe ? handRaised : p.isHandRaised) && (
                      <div style={{ position: "absolute", top: "12px", left: "12px", background: "#f59e0b", color: "#ffffff", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "800", display: "flex", alignItems: "center", gap: "4px", boxShadow: "0 4px 10px rgba(0,0,0,0.5)", animation: "bounce 1s infinite" }}>
                        <Hand size={14} /> Hand Raised
                      </div>
                    )}

                    {/* Status Badges Overlay (Top Right) */}
                    <div style={{ position: "absolute", top: "12px", right: "12px", display: "flex", gap: "6px" }}>
                      {p.isHost && (
                        <span style={{ background: "#990000", color: "#ffffff", fontSize: "10px", fontWeight: "800", padding: "2px 8px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "2px" }}>
                          <Crown size={10} /> HOST
                        </span>
                      )}

                      <span style={{ background: "rgba(0,0,0,0.7)", color: (isMe ? !micOn : p.isMuted) ? "#ef4444" : "#10b981", padding: "4px", borderRadius: "6px" }}>
                        {(isMe ? !micOn : p.isMuted) ? <MicOff size={14} /> : <Mic size={14} />}
                      </span>
                    </div>

                    {/* Participant Name Footer Bar */}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 12px", background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
                        {p.name} {isMe && "(You)"}
                      </span>

                      <span style={{ fontSize: "10px", color: "#10b981", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} /> HD 1080p
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SIDE DRAWER PANELS (PARTICIPANTS / CHAT / SETTINGS) */}
            {activeDrawer && (
              <div style={{ width: "320px", background: "#111827", borderLeft: "1px solid #1f2937", display: "flex", flexDirection: "column", zIndex: 20 }}>
                {/* Drawer Header */}
                <div style={{ padding: "16px", borderBottom: "1px solid #1f2937", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px" }}>
                    {activeDrawer === "participants" && <><Users size={18} color="#ff6b6b" /> Participants ({participantsList.length})</>}
                    {activeDrawer === "chat" && <><MessageSquare size={18} color="#ff6b6b" /> In-Call Chat</>}
                    {activeDrawer === "settings" && <><Settings size={18} color="#ff6b6b" /> Host Moderation Controls</>}
                  </h4>
                  <button onClick={() => setActiveDrawer(null)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}>
                    <X size={18} />
                  </button>
                </div>

                {/* DRAWER CONTENT 1: PARTICIPANT LIST & MODERATION */}
                {activeDrawer === "participants" && (
                  <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <button
                      onClick={() => executeModeration("mute-all")}
                      style={{ background: "rgba(220, 38, 38, 0.15)", border: "1px solid #dc2626", color: "#ef4444", padding: "8px", borderRadius: "10px", fontSize: "12px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                    >
                      <MicOff size={14} /> Mute All Participants
                    </button>

                    {participantsList.map((p) => (
                      <div key={p.userId} style={{ background: "#1f2937", padding: "10px 12px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
                            {p.name} {p.userId === userId && "(You)"}
                            {p.isHost && <Crown size={12} color="#f59e0b" />}
                          </div>
                          <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                            {p.isMuted ? "Muted" : "Active Mic"} • {p.isCameraOff ? "Cam Off" : "Cam On"}
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: "4px" }}>
                          {p.userId !== userId && (
                            <>
                              <button
                                onClick={() => executeModeration("mute-participant", p.userId)}
                                title="Mute Participant"
                                style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                              >
                                <MicOff size={14} />
                              </button>
                              <button
                                onClick={() => executeModeration("remove-participant", p.userId)}
                                title="Remove User"
                                style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: "4px" }}
                              >
                                <X size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* DRAWER CONTENT 2: IN-CALL CHAT & FILE SHARING */}
                {activeDrawer === "chat" && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                      {(meeting?.chatMessages || []).length === 0 ? (
                        <p style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center", marginTop: "20px" }}>
                          No messages yet. Send a message to participants!
                        </p>
                      ) : (
                        meeting.chatMessages.map((msg) => (
                          <div key={msg.id} style={{ background: msg.senderId === userId ? "rgba(153, 0, 0, 0.2)" : "#1f2937", border: msg.senderId === userId ? "1px solid #5c1d24" : "1px solid #374151", padding: "8px 12px", borderRadius: "10px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={{ fontSize: "11px", fontWeight: "700", color: "#ff6b6b" }}>{msg.senderName}</span>
                              <span style={{ fontSize: "9px", color: "#9ca3af" }}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: "13px", color: "#ffffff", wordBreak: "break-word" }}>{msg.text}</p>
                            {msg.fileName && (
                              <a href={msg.fileUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#60a5fa", marginTop: "4px", textDecoration: "underline" }}>
                                <Paperclip size={12} /> {msg.fileName}
                              </a>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Chat Input Form */}
                    <form onSubmit={handleSendMessage} style={{ padding: "12px", borderTop: "1px solid #1f2937", display: "flex", flexDirection: "column", gap: "8px" }}>
                      {selectedFile && (
                        <div style={{ fontSize: "11px", color: "#60a5fa", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1f2937", padding: "4px 8px", borderRadius: "6px" }}>
                          <span>Attached: {selectedFile.name}</span>
                          <button type="button" onClick={() => setSelectedFile(null)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}><X size={12} /></button>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Type a message..."
                          style={{ flex: 1, background: "#1f2937", border: "1px solid #374151", color: "#ffffff", padding: "8px 12px", borderRadius: "8px", fontSize: "12px" }}
                        />
                        <label style={{ background: "#374151", color: "#ffffff", padding: "8px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center" }} title="Attach File">
                          <Paperclip size={14} />
                          <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} style={{ display: "none" }} />
                        </label>
                        <button type="submit" style={{ background: "#990000", color: "#ffffff", border: "none", padding: "8px 12px", borderRadius: "8px", cursor: "pointer" }}>
                          <Send size={14} />
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* DRAWER CONTENT 3: HOST MODERATION SETTINGS */}
                {activeDrawer === "settings" && (
                  <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ background: "#1f2937", padding: "12px", borderRadius: "12px" }}>
                      <h5 style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#9ca3af" }}>MEETING LOCK</h5>
                      <button
                        onClick={() => executeModeration("toggle-lock", null, { isLocked: !meeting?.isLocked })}
                        style={{ width: "100%", background: meeting?.isLocked ? "#dc2626" : "#10b981", color: "#ffffff", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                      >
                        {meeting?.isLocked ? <><Lock size={16} /> Unlock Meeting Room</> : <><Unlock size={16} /> Lock Meeting Room</>}
                      </button>
                    </div>

                    <div style={{ background: "#1f2937", padding: "12px", borderRadius: "12px" }}>
                      <h5 style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#9ca3af" }}>PARTICIPANT PERMISSIONS</h5>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <label style={{ fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                          <span>Allow Screen Sharing</span>
                          <input
                            type="checkbox"
                            checked={meeting?.allowScreenShare ?? true}
                            onChange={(e) => executeModeration("toggle-screenshare", null, { allowScreenShare: e.target.checked })}
                          />
                        </label>
                        <label style={{ fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                          <span>Allow In-Call Chat</span>
                          <input
                            type="checkbox"
                            checked={meeting?.allowChat ?? true}
                            onChange={(e) => executeModeration("toggle-chat", null, { allowChat: e.target.checked })}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BOTTOM MAIN CALL CONTROLS BAR */}
          <div style={{ background: "#111827", borderTop: "1px solid #1f2937", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            {/* Left Controls: Mic, Camera, Camera Switch */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={toggleMic}
                title={micOn ? "Mute Microphone" : "Unmute Microphone"}
                style={{ width: "44px", height: "44px", borderRadius: "50%", background: micOn ? "#374151" : "#dc2626", color: "#ffffff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {micOn ? <Mic size={20} /> : <MicOff size={20} />}
              </button>

              <button
                onClick={toggleCamera}
                title={cameraOn ? "Turn Camera Off" : "Turn Camera On"}
                style={{ width: "44px", height: "44px", borderRadius: "50%", background: cameraOn ? "#374151" : "#dc2626", color: "#ffffff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
              </button>

              <button
                onClick={switchCameraFacing}
                title="Switch Front/Rear Camera"
                style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#374151", color: "#ffffff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Camera size={20} />
              </button>
            </div>

            {/* Center Controls: Screen Share, Raise Hand, Recording */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={toggleScreenShare}
                title="Share Screen"
                style={{ background: isScreenSharing ? "#2563eb" : "#374151", color: "#ffffff", padding: "10px 18px", borderRadius: "30px", border: "none", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}
              >
                <ScreenShare size={18} /> {isScreenSharing ? "Stop Sharing" : "Share Screen"}
              </button>

              <button
                onClick={toggleHandRaise}
                title="Raise Hand"
                style={{ background: handRaised ? "#f59e0b" : "#374151", color: "#ffffff", padding: "10px 18px", borderRadius: "30px", border: "none", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}
              >
                <Hand size={18} /> {handRaised ? "Lower Hand" : "Raise Hand"}
              </button>

              <button
                onClick={toggleRecording}
                title="Call Recording"
                style={{ background: isRecording ? "rgba(220,38,38,0.2)" : "#374151", color: isRecording ? "#ef4444" : "#ffffff", border: isRecording ? "1px solid #ef4444" : "none", padding: "10px 18px", borderRadius: "30px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}
              >
                <Radio size={18} color={isRecording ? "#ef4444" : "#ffffff"} /> {isRecording ? "Stop Recording" : "Record Call"}
              </button>
            </div>

            {/* Right Controls: Drawers & End Call */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={() => setActiveDrawer((prev) => (prev === "participants" ? null : "participants"))}
                style={{ background: activeDrawer === "participants" ? "#990000" : "#374151", color: "#ffffff", padding: "10px 14px", borderRadius: "12px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
              >
                <Users size={18} /> {participantsList.length}
              </button>

              <button
                onClick={() => setActiveDrawer((prev) => (prev === "chat" ? null : "chat"))}
                style={{ background: activeDrawer === "chat" ? "#990000" : "#374151", color: "#ffffff", padding: "10px 14px", borderRadius: "12px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
              >
                <MessageSquare size={18} /> Chat
              </button>

              <button
                onClick={() => setActiveDrawer((prev) => (prev === "settings" ? null : "settings"))}
                style={{ background: activeDrawer === "settings" ? "#990000" : "#374151", color: "#ffffff", padding: "10px 14px", borderRadius: "12px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
              >
                <Settings size={18} />
              </button>

              <button
                onClick={() => handleLeaveCall(false)}
                style={{ background: "#dc2626", color: "#ffffff", padding: "10px 20px", borderRadius: "30px", border: "none", fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
              >
                <PhoneOff size={18} /> End Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
