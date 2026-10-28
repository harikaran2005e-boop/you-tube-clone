import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Tv,
  Subtitles,
  RotateCcw,
  RotateCw,
  FastForward,
  CheckCircle2,
  Clock,
  Sparkles,
  HelpCircle,
  X,
  Check,
  ChevronRight,
  Settings,
  ShieldAlert
} from "lucide-react";

const SPEED_OPTIONS = [0.5, 1, 1.25, 1.5, 2];
const QUALITY_OPTIONS = ["1080p Full HD", "720p HD", "480p", "360p"];

// Sample subtitle tracks
const SUBTITLE_TRACKS = [
  { id: "off", label: "Off" },
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" }
];

const SAMPLE_CAPTIONS = {
  en: [
    { start: 0, end: 5, text: "Welcome to our Custom HTML5 Video Player demo!" },
    { start: 5, end: 12, text: "Explore playback speeds, subtitle choices, and timeline hover previews." },
    { start: 12, end: 20, text: "Watch progress is automatically saved to your account in real-time." },
    { start: 20, end: 35, text: "Press '?' on your keyboard to view all custom hotkeys & shortcuts." }
  ],
  es: [
    { start: 0, end: 5, text: "¡Bienvenido a nuestra demostración del reproductor de video HTML5!" },
    { start: 5, end: 12, text: "Explore velocidades de reproducción, subtítulos y vistas previas." },
    { start: 12, end: 20, text: "El progreso de visualización se guarda automáticamente." }
  ],
  fr: [
    { start: 0, end: 5, text: "Bienvenue dans notre lecteur vidéo HTML5 personnalisé !" },
    { start: 5, end: 12, text: "Découvrez les options de vitesse et de sous-titres." }
  ]
};

export default function CustomVideoPlayer({
  video,
  userId = "6aaa685bc7a8e4a210c6d15f",
  playlist = [],
  onNextVideo,
  completionThreshold = 90
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const timelineRef = useRef(null);

  // Core Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);

  // Player Modes
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);

  // Quality & Subtitles
  const [quality, setQuality] = useState("1080p Full HD");
  const [selectedSubtitles, setSelectedSubtitles] = useState("off");
  const [currentCaptionText, setCurrentCaptionText] = useState("");

  // UI Popovers & Menus
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Auto-hiding Controls
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimer = useRef(null);

  // Hover Preview Tooltip
  const [hoverPosition, setHoverPosition] = useState(null); // { time, percent, x }

  // Watch Progress & Completion
  const [isCompleted, setIsCompleted] = useState(false);
  const [watchPercentage, setWatchPercentage] = useState(0);
  const [resumeNotification, setResumeNotification] = useState("");
  const progressSaveTimer = useRef(null);

  // Autoplay Countdown
  const [autoplayCount, setAutoplayCount] = useState(null); // 5 to 0
  const autoplayTimerRef = useRef(null);

  // Center Click Animation Feedback
  const [centerAnim, setCenterAnim] = useState(null); // 'play' | 'pause' | 'seek-fw' | 'seek-bw'

  // Format seconds to MM:SS or HH:MM:SS
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return "00:00";
    const hrs = Math.floor(timeInSeconds / 3600);
    const mins = Math.floor((timeInSeconds % 3600) / 60);
    const secs = Math.floor(timeInSeconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Broadcast global play event to prevent multiple videos playing simultaneously
  const notifyGlobalPlay = () => {
    const event = new CustomEvent("global-video-play", {
      detail: { videoId: video?.id || video?._id }
    });
    window.dispatchEvent(event);
  };

  // Listen to other video play events
  useEffect(() => {
    const handleGlobalPlay = (e) => {
      const activeId = video?.id || video?._id;
      if (e.detail && e.detail.videoId !== activeId && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };
    window.addEventListener("global-video-play", handleGlobalPlay);
    return () => window.removeEventListener("global-video-play", handleGlobalPlay);
  }, [video]);

  // Load Saved Watch Position & Resume Playback
  useEffect(() => {
    if (!video || !userId) return;

    const vId = video.id || video._id;

    // Reset states
    setIsPlaying(false);
    setCurrentTime(0);
    setWatchPercentage(0);
    setIsCompleted(false);
    setAutoplayCount(null);

    // Fetch progress from backend
    fetch(`http://localhost:5000/api/videos/progress/${userId}/${vId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.progress && data.progress.lastPosition > 2) {
          const savedPos = data.progress.lastPosition;
          const pct = data.progress.watchPercentage || 0;
          if (videoRef.current) {
            videoRef.current.currentTime = savedPos;
            setCurrentTime(savedPos);
          }
          setIsCompleted(data.progress.isCompleted || false);
          setWatchPercentage(pct);
          setResumeNotification(`Resumed from ${formatTime(savedPos)}`);
          setTimeout(() => setResumeNotification(""), 4000);
        }
      })
      .catch((err) => {
        console.warn("Backend watch progress fetch error, checking localStorage:", err);
        const localData = localStorage.getItem(`progress_${userId}_${vId}`);
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            if (parsed.lastPosition > 2 && videoRef.current) {
              videoRef.current.currentTime = parsed.lastPosition;
              setCurrentTime(parsed.lastPosition);
              setResumeNotification(`Resumed from ${formatTime(parsed.lastPosition)}`);
              setTimeout(() => setResumeNotification(""), 4000);
            }
          } catch (e) {}
        }
      });
  }, [video, userId]);

  // Periodic Auto-save Watch Progress
  useEffect(() => {
    if (!isPlaying || !video) return;

    progressSaveTimer.current = setInterval(() => {
      saveProgressNow();
    }, 4000);

    return () => {
      if (progressSaveTimer.current) clearInterval(progressSaveTimer.current);
    };
  }, [isPlaying, currentTime, duration, video, userId]);

  const saveProgressNow = () => {
    if (!video || !duration || duration <= 0) return;
    const vId = video.id || video._id;
    const pos = videoRef.current ? videoRef.current.currentTime : currentTime;
    const pct = Math.min(100, Math.round((pos / duration) * 100));
    const completed = pct >= completionThreshold;

    setWatchPercentage(pct);
    if (completed && !isCompleted) {
      setIsCompleted(true);
    }

    // Save to localStorage
    localStorage.setItem(
      `progress_${userId}_${vId}`,
      JSON.stringify({ lastPosition: pos, duration, watchPercentage: pct, isCompleted: completed })
    );

    // Save to Backend API
    fetch("http://localhost:5000/api/videos/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        videoId: vId,
        lastPosition: pos,
        duration,
        watchPercentage: pct,
        completionThreshold
      })
    }).catch((err) => console.error("Watch progress sync error:", err));
  };

  // Video Event Handlers
  const handlePlay = () => {
    setIsPlaying(true);
    notifyGlobalPlay();
  };

  const handlePause = () => {
    setIsPlaying(false);
    saveProgressNow();
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    setCurrentTime(current);
    setDuration(dur);

    // Update Buffered Progress
    if (videoRef.current.buffered.length > 0) {
      try {
        const bufferedEndVal = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
        setBufferedEnd(bufferedEndVal);
      } catch (e) {}
    }

    // Calculate percentage & completion
    if (dur > 0) {
      const pct = Math.round((current / dur) * 100);
      setWatchPercentage(pct);
      if (pct >= completionThreshold && !isCompleted) {
        setIsCompleted(true);
      }
    }

    // Subtitle Captions Engine
    if (selectedSubtitles !== "off" && SAMPLE_CAPTIONS[selectedSubtitles]) {
      const activeCaption = SAMPLE_CAPTIONS[selectedSubtitles].find(
        (c) => current >= c.start && current <= c.end
      );
      setCurrentCaptionText(activeCaption ? activeCaption.text : "");
    } else {
      setCurrentCaptionText("");
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    saveProgressNow();
    setIsCompleted(true);

    // Trigger Autoplay Countdown for Next Video
    if (onNextVideo) {
      setAutoplayCount(5);
    }
  };

  // Autoplay Countdown Timer Effect
  useEffect(() => {
    if (autoplayCount === null) return;

    if (autoplayCount > 0) {
      autoplayTimerRef.current = setTimeout(() => {
        setAutoplayCount((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (autoplayCount === 0) {
      setAutoplayCount(null);
      if (onNextVideo) onNextVideo();
    }

    return () => {
      if (autoplayTimerRef.current) clearTimeout(autoplayTimerRef.current);
    };
  }, [autoplayCount, onNextVideo]);

  // Toggle Play / Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      triggerCenterAnim("play");
    } else {
      videoRef.current.pause();
      triggerCenterAnim("pause");
    }
  };

  const triggerCenterAnim = (type) => {
    setCenterAnim(type);
    setTimeout(() => setCenterAnim(null), 700);
  };

  // Seek Operations
  const seekBy = (seconds) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    triggerCenterAnim(seconds > 0 ? "seek-fw" : "seek-bw");
  };

  // Volume Slider & Mute
  const handleVolumeChange = (newVal) => {
    setVolume(newVal);
    if (videoRef.current) {
      videoRef.current.volume = newVal;
      videoRef.current.muted = newVal === 0;
    }
    setIsMuted(newVal === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
    if (!nextMute && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  // Change Playback Speed
  const handleSetSpeed = (spd) => {
    setPlaybackSpeed(spd);
    if (videoRef.current) {
      videoRef.current.playbackRate = spd;
    }
    setShowSpeedMenu(false);
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  };

  // Toggle Picture-in-Picture
  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else {
        await videoRef.current.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch (err) {
      console.error("PiP error:", err);
    }
  };

  // Timeline Click / Drag Seek
  const handleTimelineClick = (e) => {
    if (!timelineRef.current || !videoRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = clickX / rect.width;
    const targetTime = percent * (videoRef.current.duration || 0);
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  // Timeline Hover Timestamp Preview
  const handleTimelineMouseMove = (e) => {
    if (!timelineRef.current || !duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const mouseX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = mouseX / rect.width;
    const hoverTime = percent * duration;
    setHoverPosition({ time: hoverTime, percent: percent * 100, x: mouseX });
  };

  const handleTimelineMouseLeave = () => {
    setHoverPosition(null);
  };

  // Auto-hiding Controls on Mouse Inactivity
  const handleMouseMovePlayer = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;

      switch (e.code) {
        case "Space":
        case "KeyK":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBy(e.shiftKey ? -30 : -10);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekBy(e.shiftKey ? 30 : 10);
          break;
        case "ArrowUp":
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case "KeyM":
          e.preventDefault();
          toggleMute();
          break;
        case "KeyF":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "KeyT":
          e.preventDefault();
          setIsTheaterMode((prev) => !prev);
          break;
        case "KeyP":
          e.preventDefault();
          togglePiP();
          break;
        case "KeyC":
          e.preventDefault();
          setSelectedSubtitles((prev) => (prev === "off" ? "en" : "off"));
          break;
        case "KeyN":
          e.preventDefault();
          if (onNextVideo) onNextVideo();
          break;
        case "Slash":
          if (e.shiftKey) { // '?' key
            e.preventDefault();
            setShowShortcutsModal((prev) => !prev);
          }
          break;
        case "Period":
          if (e.shiftKey) { // '>' key
            e.preventDefault();
            const nextIndex = (SPEED_OPTIONS.indexOf(playbackSpeed) + 1) % SPEED_OPTIONS.length;
            handleSetSpeed(SPEED_OPTIONS[nextIndex]);
          }
          break;
        case "Comma":
          if (e.shiftKey) { // '<' key
            e.preventDefault();
            const prevIndex = (SPEED_OPTIONS.indexOf(playbackSpeed) - 1 + SPEED_OPTIONS.length) % SPEED_OPTIONS.length;
            handleSetSpeed(SPEED_OPTIONS[prevIndex]);
          }
          break;
        case "KeyS":
          e.preventDefault();
          const nextSpdIndex = (SPEED_OPTIONS.indexOf(playbackSpeed) + 1) % SPEED_OPTIONS.length;
          handleSetSpeed(SPEED_OPTIONS[nextSpdIndex]);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, volume, playbackSpeed, isMuted, duration, video]);

  const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;
  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const remainingTime = Math.max(0, duration - currentTime);

  return (
    <div
      className={`custom-player-wrapper ${isTheaterMode ? "theater-mode" : ""}`}
      ref={containerRef}
      onMouseMove={handleMouseMovePlayer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      style={{
        position: "relative",
        borderRadius: isFullscreen || isTheaterMode ? "0" : "20px",
        overflow: "hidden",
        background: "#030712",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        margin: isTheaterMode ? "0 -20px 24px -20px" : "0 0 24px 0",
        transition: "all 0.3s ease"
      }}
    >
      {/* Resume Progress Notification Toast */}
      {resumeNotification && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            zIndex: 40,
            background: "rgba(153, 0, 0, 0.9)",
            color: "#ffffff",
            padding: "8px 16px",
            borderRadius: "30px",
            fontSize: "12px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backdropFilter: "blur(8px)",
            animation: "fadeIn 0.3s ease"
          }}
        >
          <Clock size={16} /> {resumeNotification}
        </div>
      )}

      {/* Completion Status Badge */}
      {isCompleted && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            zIndex: 40,
            background: "rgba(16, 185, 129, 0.9)",
            color: "#ffffff",
            padding: "6px 14px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backdropFilter: "blur(8px)"
          }}
        >
          <CheckCircle2 size={14} /> COMPLETED ({watchPercentage}%)
        </div>
      )}

      {/* Video Title Overlay (Top Left when controls visible) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "20px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)",
          color: "#ffffff",
          zIndex: 30,
          opacity: showControls || !isPlaying ? 1 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: "none"
        }}
      >
        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
          {video?.title || "Video Player"}
        </h3>
        <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#9ca3af", display: "flex", gap: "12px", alignItems: "center" }}>
          <span>Quality: {quality}</span>
          <span>•</span>
          <span>Watch Progress: {watchPercentage}%</span>
        </p>
      </div>

      {/* HTML5 Video Element (Default Controls Hidden) */}
      <video
        ref={videoRef}
        src={video?.videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4"}
        controls={false}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={handleEnded}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        style={{
          width: "100%",
          maxHeight: isTheaterMode ? "75vh" : "540px",
          minHeight: "360px",
          objectFit: "contain",
          display: "block",
          cursor: "pointer"
        }}
      />

      {/* Subtitles & Captions Rendering Overlay */}
      {currentCaptionText && (
        <div
          style={{
            position: "absolute",
            bottom: showControls ? "90px" : "30px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 35,
            background: "rgba(0, 0, 0, 0.85)",
            color: "#ffffff",
            padding: "8px 18px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "600",
            textAlign: "center",
            maxWidth: "80%",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.1)",
            transition: "bottom 0.3s ease"
          }}
        >
          {currentCaptionText}
        </div>
      )}

      {/* Loading / Buffering Overlay Spinner */}
      {isBuffering && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 35,
            pointerEvents: "none"
          }}
        >
          <div
            style={{
              width: "54px",
              height: "54px",
              border: "4px solid rgba(255, 255, 255, 0.2)",
              borderTopColor: "#990000",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }}
          />
        </div>
      )}

      {/* Central Play/Pause Action Icon Feedback */}
      {centerAnim && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) scale(1.2)",
            zIndex: 38,
            background: "rgba(0,0,0,0.7)",
            padding: "20px",
            borderRadius: "50%",
            color: "#ffffff",
            pointerEvents: "none",
            animation: "pulseAnim 0.6s ease-out forwards"
          }}
        >
          {centerAnim === "play" && <Play size={40} fill="#ffffff" />}
          {centerAnim === "pause" && <Pause size={40} fill="#ffffff" />}
          {centerAnim === "seek-fw" && <RotateCw size={40} />}
          {centerAnim === "seek-bw" && <RotateCcw size={40} />}
        </div>
      )}

      {/* Autoplay Countdown Overlay for Next Video */}
      {autoplayCount !== null && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 45,
            background: "rgba(3, 7, 18, 0.92)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justify: "center",
            color: "#ffffff",
            padding: "24px"
          }}
        >
          <Sparkles size={44} color="#ff6b6b" style={{ marginBottom: "16px" }} />
          <h3 style={{ margin: "0 0 8px 0", fontSize: "1.4rem" }}>Up Next in {autoplayCount}s</h3>
          <p style={{ color: "#9ca3af", fontSize: "14px", margin: "0 0 24px 0" }}>Auto-playing next video in queue...</p>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => {
                setAutoplayCount(null);
                if (onNextVideo) onNextVideo();
              }}
              style={{
                background: "#990000",
                color: "#ffffff",
                border: "none",
                padding: "10px 24px",
                borderRadius: "12px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              Play Now <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setAutoplayCount(null)}
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.2)",
                padding: "10px 20px",
                borderRadius: "12px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      {showShortcutsModal && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div
            style={{
              background: "#111827",
              border: "1px solid #374151",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "500px",
              width: "100%",
              color: "#ffffff"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <HelpCircle size={20} color="#ff6b6b" /> Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcutsModal(false)}
                style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
              <div><kbd style={{ background: "#374151", padding: "2px 6px", borderRadius: "4px" }}>Space</kbd> / <kbd style={{ background: "#374151", padding: "2px 6px", borderRadius: "4px" }}>k</kbd>: Play / Pause</div>
              <div><kbd style={{ background: "#374151", padding: "2px 6px", borderRadius: "4px" }}>←</kbd> / <kbd style={{ background: "#374151", padding: "2px 6px", borderRadius: "4px" }}>→</kbd>: Seek ±10s</div>
              <div><kbd style={{ background: "#374151", padding: "2px 6px", borderRadius: "4px" }}>Shift + ←/→</kbd>: Seek ±30s</div>
              <div><kbd style={{ background: "#374151", padding: "2px 6px", borderRadius: "4px" }}>↑</kbd> / <kbd style={{ background: "#374151", padding: "2px 6px", borderRadius: "4px" }}>↓</kbd>: Volume ±10%</div>
              <div><kbd style={{ background: "#374151", padding: "2px 6px", borderRadius: "4px" }}>m</kbd>: Toggle Mute</div>
              <div><kbd style={{ background: "#374151", padding: "2px 6px", borderRadius: "4px" }}>f</kbd>: Toggle Fullscreen</div>
              <div><kbd style={{ background: "#374151", padding: "2px 6px", borderRadius: "4px" }}>t</kbd>: Theater Mode</div>
              <div><kbd style={{ background: "#374151", padding: "2px 6px", borderRadius: "4px" }}>p</kbd>: Picture-in-Picture</div>
              <div><kbd style={{ background: "#374151", padding: "2px 6px", borderRadius: "4px" }}>c</kbd>: Toggle Subtitles</div>
              <div><kbd style={{ background: "#374151", padding: "2px 6px", borderRadius: "4px" }}>Shift + &gt;/&lt;</kbd>: Speed ±</div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM PLAYER CONTROLS BAR */}
      <div
        className="custom-player-controls"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          background: "linear-gradient(to top, rgba(3, 7, 18, 0.95), rgba(3, 7, 18, 0.6) 70%, transparent)",
          padding: "16px 20px 12px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          opacity: showControls || !isPlaying ? 1 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: showControls || !isPlaying ? "auto" : "none"
        }}
      >
        {/* TIMELINE PROGRESS BAR CONTAINER */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={handleTimelineMouseLeave}
          style={{
            position: "relative",
            width: "100%",
            height: "8px",
            background: "rgba(255, 255, 255, 0.2)",
            borderRadius: "4px",
            cursor: "pointer",
            transition: "height 0.15s ease"
          }}
        >
          {/* Buffering Progress Bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: `${bufferedPercent}%`,
              background: "rgba(255, 255, 255, 0.35)",
              borderRadius: "4px",
              pointerEvents: "none"
            }}
          />

          {/* Playback Progress Bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: `${currentPercent}%`,
              background: "linear-gradient(90deg, #dc2626, #990000)",
              borderRadius: "4px",
              pointerEvents: "none"
            }}
          />

          {/* Draggable Progress Handle Dot */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: `${currentPercent}%`,
              transform: "translate(-50%, -50%)",
              width: "14px",
              height: "14px",
              background: "#ffffff",
              borderRadius: "50%",
              boxShadow: "0 0 8px rgba(153, 0, 0, 0.8)",
              pointerEvents: "none"
            }}
          />

          {/* Hover Preview Tooltip */}
          {hoverPosition && (
            <div
              style={{
                position: "absolute",
                bottom: "16px",
                left: `${hoverPosition.percent}%`,
                transform: "translateX(-50%)",
                background: "rgba(17, 24, 39, 0.95)",
                color: "#ffffff",
                padding: "6px 10px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: "700",
                boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.1)",
                pointerEvents: "none",
                whiteSpace: "nowrap",
                zIndex: 35
              }}
            >
              {formatTime(hoverPosition.time)}
            </div>
          )}
        </div>

        {/* BOTTOM CONTROLS BUTTONS BAR */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#ffffff"
          }}
        >
          {/* Left Controls: Play/Pause, Seek 10s, Volume, Timers */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              style={{
                background: "none",
                border: "none",
                color: "#ffffff",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center"
              }}
            >
              {isPlaying ? <Pause size={22} fill="#ffffff" /> : <Play size={22} fill="#ffffff" />}
            </button>

            {/* Skip -10s & Skip +10s */}
            <button
              onClick={() => seekBy(-10)}
              title="Seek Backward 10s (←)"
              style={{ background: "none", border: "none", color: "#d1d5db", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={() => seekBy(10)}
              title="Seek Forward 10s (→)"
              style={{ background: "none", border: "none", color: "#d1d5db", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
            >
              <RotateCw size={18} />
            </button>

            {/* Volume Control with Draggable Slider */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }} className="volume-group">
              <button
                onClick={toggleMute}
                title="Mute / Unmute (m)"
                style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={20} color="#ff6b6b" />
                ) : volume < 0.5 ? (
                  <Volume1 size={20} />
                ) : (
                  <Volume2 size={20} />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                style={{
                  width: "70px",
                  height: "4px",
                  accentColor: "#dc2626",
                  cursor: "pointer"
                }}
              />
            </div>

            {/* Time Stats Display: Current / Total (Remaining) */}
            <div style={{ fontSize: "12px", fontFamily: "monospace", color: "#e5e7eb", display: "flex", gap: "6px" }}>
              <span>{formatTime(currentTime)}</span>
              <span style={{ color: "#6b7280" }}>/</span>
              <span>{formatTime(duration)}</span>
              <span style={{ color: "#9ca3af", fontSize: "11px" }}>(-{formatTime(remainingTime)})</span>
            </div>
          </div>

          {/* Right Controls: Speed, Quality, Captions, PiP, Theater, Fullscreen, Shortcuts */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
            {/* Playback Speed Popover Menu */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => {
                  setShowSpeedMenu((prev) => !prev);
                  setShowQualityMenu(false);
                  setShowSubtitleMenu(false);
                }}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                {playbackSpeed}×
              </button>

              {showSpeedMenu && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "34px",
                    right: 0,
                    background: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    padding: "6px 0",
                    minWidth: "90px",
                    zIndex: 40,
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)"
                  }}
                >
                  <div style={{ fontSize: "10px", color: "#9ca3af", padding: "4px 12px", fontWeight: "700" }}>SPEED</div>
                  {SPEED_OPTIONS.map((spd) => (
                    <button
                      key={spd}
                      onClick={() => handleSetSpeed(spd)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: playbackSpeed === spd ? "#990000" : "transparent",
                        color: "#ffffff",
                        border: "none",
                        padding: "6px 12px",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                      }}
                    >
                      {spd}× {playbackSpeed === spd && <Check size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality Info Popover */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => {
                  setShowQualityMenu((prev) => !prev);
                  setShowSpeedMenu(false);
                  setShowSubtitleMenu(false);
                }}
                title="Video Quality"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                {quality.split(" ")[0]}
              </button>

              {showQualityMenu && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "34px",
                    right: 0,
                    background: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    padding: "6px 0",
                    minWidth: "120px",
                    zIndex: 40,
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)"
                  }}
                >
                  <div style={{ fontSize: "10px", color: "#9ca3af", padding: "4px 12px", fontWeight: "700" }}>QUALITY</div>
                  {QUALITY_OPTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setQuality(q);
                        setShowQualityMenu(false);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: quality === q ? "#990000" : "transparent",
                        color: "#ffffff",
                        border: "none",
                        padding: "6px 12px",
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subtitles & Captions Menu */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => {
                  setShowSubtitleMenu((prev) => !prev);
                  setShowSpeedMenu(false);
                  setShowQualityMenu(false);
                }}
                title="Subtitles / Captions (c)"
                style={{
                  background: selectedSubtitles !== "off" ? "#990000" : "none",
                  border: "none",
                  color: "#ffffff",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <Subtitles size={18} />
              </button>

              {showSubtitleMenu && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "34px",
                    right: 0,
                    background: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    padding: "6px 0",
                    minWidth: "110px",
                    zIndex: 40,
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)"
                  }}
                >
                  <div style={{ fontSize: "10px", color: "#9ca3af", padding: "4px 12px", fontWeight: "700" }}>SUBTITLES</div>
                  {SUBTITLE_TRACKS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedSubtitles(t.id);
                        setShowSubtitleMenu(false);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: selectedSubtitles === t.id ? "#990000" : "transparent",
                        color: "#ffffff",
                        border: "none",
                        padding: "6px 12px",
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Picture-in-Picture (PiP) */}
            <button
              onClick={togglePiP}
              title="Picture-in-Picture (p)"
              style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
            >
              <PictureInPicture2 size={18} />
            </button>

            {/* Theater Mode Toggle */}
            <button
              onClick={() => setIsTheaterMode((prev) => !prev)}
              title="Theater Mode (t)"
              style={{ background: "none", border: "none", color: isTheaterMode ? "#ff6b6b" : "#ffffff", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
            >
              <Tv size={18} />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              title="Fullscreen (f)"
              style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>

            {/* Keyboard Shortcuts Cheat Sheet Button */}
            <button
              onClick={() => setShowShortcutsModal(true)}
              title="Keyboard Shortcuts (?)"
              style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
            >
              <HelpCircle size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
