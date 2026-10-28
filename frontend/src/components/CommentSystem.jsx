import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Globe,
  Film,
  Send,
  ShieldAlert,
  User,
  MapPin,
  Languages,
  ThumbsUp,
  ThumbsDown,
  CornerDownRight,
  Flag,
  Clock,
  Edit3,
  Trash2
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const LANGUAGES = {
  en: "English",
  ta: "Tamil",
  te: "Telugu",
  hi: "Hindi",
  bn: "Bengali",
  ml: "Malayalam",
  kn: "Kannada",
  mr: "Marathi",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  "zh-CN": "Chinese (Simplified)"
};

export default function CommentSystem({ currentVideoId, currentVideoTitle }) {
  const [comments, setComments] = useState([]);
  const [moderationRecords, setModerationRecords] = useState([]);
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("en");
  const [preferredLang, setPreferredLang] = useState("en");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [replyTextMap, setReplyTextMap] = useState({});
  const [activeReplyBox, setActiveReplyBox] = useState(null);
  const [activeReportBox, setActiveReportBox] = useState(null);
  const [activeHistoryBox, setActiveHistoryBox] = useState(null);
  const [translations, setTranslations] = useState({});
  const [message, setMessage] = useState("");
  const [isErrorMsg, setIsErrorMsg] = useState(false);

  // Scope State: 'all' (all platform discussions) | 'video' (only current video)
  const [scope, setScope] = useState("all");

  // CAPTCHA Challenge State for Comment Flooding Rate-Limiting
  const [showCaptchaModal, setShowCaptchaModal] = useState(false);
  const [captchaChallenge, setCaptchaChallenge] = useState({ q: "8 + 5", a: "13" });
  const [captchaInput, setCaptchaInput] = useState("");
  const [pendingPost, setPendingPost] = useState(null);

  const currentUser = "harikaran";

  const showMsg = (msg, error = false) => {
    setMessage(msg);
    setIsErrorMsg(error);
    setTimeout(() => setMessage(""), 4000);
  };

  const fetchComments = async (overrideVid = undefined) => {
    try {
      const vid = overrideVid !== undefined ? overrideVid : (scope === "video" ? currentVideoId : "all");
      const url = vid && vid !== "all"
        ? `${API_BASE_URL}/comments?videoId=${vid}`
        : `${API_BASE_URL}/comments?videoId=all`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.comments) {
        setComments(data.comments);
      }
    } catch (err) {
      console.error("fetchComments error:", err);
      showMsg("Failed to connect to comment server", true);
    }
  };

  const fetchModeration = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/comments/moderation`);
      const data = await res.json();
      if (data && data.records) {
        setModerationRecords(data.records);
      }
    } catch (err) {
      console.error("fetchModeration error:", err);
    }
  };

  useEffect(() => {
    fetchComments();
    fetchModeration();
  }, [currentVideoId, scope]);

  const generateCaptcha = () => {
    const num1 = Math.floor(2 + Math.random() * 8);
    const num2 = Math.floor(2 + Math.random() * 9);
    setCaptchaChallenge({ q: `${num1} + ${num2}`, a: String(num1 + num2) });
    setCaptchaInput("");
  };

  const handlePost = async (parentId = null, commentText = text, captchaToken = null) => {
    if (!commentText.trim()) {
      showMsg("Comment cannot be empty", true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: currentVideoId || null,
          parentId,
          text: commentText.trim(),
          language,
          username: currentUser,
          captchaToken
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 && data.requiresCaptcha) {
          generateCaptcha();
          setPendingPost({ parentId, commentText });
          setShowCaptchaModal(true);
          showMsg("Comment flood rate limit! Please solve the CAPTCHA to post.", true);
          return;
        }
        showMsg(data.message || "Failed to post comment", true);
        fetchModeration();
        return;
      }

      showMsg(parentId ? "Reply posted successfully!" : "Comment posted successfully!");
      if (!parentId) setText("");
      else {
        setReplyTextMap(prev => ({ ...prev, [parentId]: "" }));
        setActiveReplyBox(null);
      }
      fetchComments();
      fetchModeration();
    } catch (err) {
      showMsg("Error connecting to server", true);
    }
  };

  const handleVerifyCaptchaAndPost = () => {
    if (captchaInput.trim() !== captchaChallenge.a) {
      showMsg("Incorrect CAPTCHA answer. Try again.", true);
      generateCaptcha();
      return;
    }
    setShowCaptchaModal(false);
    if (pendingPost) {
      handlePost(pendingPost.parentId, pendingPost.commentText, "VALID_CAPTCHA");
      setPendingPost(null);
    }
  };

  const handleMentionUser = (username) => {
    setText(prev => `${prev ? prev + " " : ""}@${username} `);
    showMsg(`Mentioned @${username} in comment box`);
  };

  const handleLike = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/comments/${id}/like`, { method: "POST" });
      fetchComments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDislike = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/comments/${id}/dislike`, { method: "POST" });
      fetchComments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = async (comment) => {
    const newText = prompt("Edit comment:", comment.text);
    if (!newText || !newText.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/comments/${comment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.message || "Edit failed", true);
        fetchModeration();
        return;
      }
      showMsg("Comment edited successfully!");
      fetchComments();
    } catch (err) {
      showMsg("Edit request failed", true);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/comments/${id}`, { method: "DELETE" });
      if (res.ok) {
        showMsg("Comment deleted.");
        fetchComments();
        fetchModeration();
      }
    } catch (err) {
      showMsg("Delete request failed", true);
    }
  };

  const handleReport = async (id, reason) => {
    try {
      const res = await fetch(`${API_BASE_URL}/comments/${id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser, reason })
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg(data.message || "Report failed", true);
        return;
      }
      showMsg("Comment flagged for admin review.");
      setActiveReportBox(null);
      fetchModeration();
    } catch (err) {
      showMsg("Report error", true);
    }
  };

  const handleTranslate = async (comment) => {
    const target = preferredLang;
    const key = `${comment.id}_${target}`;
    if (translations[key]) return;

    try {
      const res = await fetch(`${API_BASE_URL}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: comment.text, target })
      });
      const data = await res.json();
      setTranslations(prev => ({
        ...prev,
        [key]: data.translated || `[${target.toUpperCase()}] ${comment.text}`
      }));
    } catch (err) {
      setTranslations(prev => ({ ...prev, [key]: "Translation failed" }));
    }
  };

  // Filter & Sort Root Comments
  const rootComments = comments
    .filter(c => c.parentId === null)
    .filter(c => {
      if (scope === "video" && currentVideoId) {
        return c.videoId === currentVideoId;
      }
      return true;
    })
    .filter(c =>
      !search ||
      c.text.toLowerCase().includes(search.toLowerCase()) ||
      c.username.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sort === "liked") return (b.likes || 0) - (a.likes || 0);
      if (sort === "relevant") {
        const aReplies = comments.filter(c => String(c.parentId) === String(a.id)).length;
        const bReplies = comments.filter(c => String(c.parentId) === String(b.id)).length;
        const aScore = (a.likes || 0) * 2 - (a.dislikes || 0) + aReplies * 3;
        const bScore = (b.likes || 0) * 2 - (b.dislikes || 0) + bReplies * 3;
        return bScore - aScore;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const videoCommentsCount = comments.filter(c => c.videoId === currentVideoId).length;

  return (
    <div className="comment-system-wrapper">
      <div className="cs-header">
        <div>
          <h3 className="cs-title">
            <MessageSquare size={22} style={{ color: "#990000" }} /> Multilingual Comments & Discussion Board
          </h3>
          <p className="cs-subtitle">Share feedback, reply to members, and translate discussions live</p>
        </div>
        <span className="cs-video-pill" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          {currentVideoTitle ? (
            <>
              <Film size={14} /> {currentVideoTitle}
            </>
          ) : (
            <>
              <Globe size={14} /> Global Video Discussion
            </>
          )}
        </span>
      </div>

      {/* Scope Filter Tabs */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={() => setScope("all")}
          style={{
            background: scope === "all" ? "#990000" : "#ffffff",
            color: scope === "all" ? "#ffffff" : "#475569",
            border: scope === "all" ? "1px solid #990000" : "1.5px solid #cbd5e1",
            padding: "8px 16px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: "700",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <Globe size={14} /> All Community Discussions ({comments.length})
        </button>

        {currentVideoTitle && (
          <button
            onClick={() => setScope("video")}
            style={{
              background: scope === "video" ? "#990000" : "#ffffff",
              color: scope === "video" ? "#ffffff" : "#475569",
              border: scope === "video" ? "1px solid #990000" : "1.5px solid #cbd5e1",
              padding: "8px 16px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Film size={14} /> This Video Only ({videoCommentsCount})
          </button>
        )}
      </div>

      {message && (
        <div className={`cs-message ${isErrorMsg ? "error" : "success"}`}>
          {message}
        </div>
      )}

      {/* Rate Limit CAPTCHA Verification Modal */}
      {showCaptchaModal && (
        <div className="modal-backdrop fade-in" style={{ zIndex: 100 }}>
          <div className="cs-card" style={{ maxWidth: "400px", margin: "auto", padding: "24px", textAlign: "center", borderTop: "4px solid #990000" }}>
            <h4 style={{ color: "#990000", margin: "0 0 10px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <ShieldAlert size={20} /> Human Verification Required
            </h4>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px 0" }}>
              Frequent commenting detected! Please solve this quick math puzzle to verify you are human:
            </p>
            <div style={{ background: "#fef2f2", padding: "12px", borderRadius: "10px", fontSize: "18px", fontWeight: "800", color: "#990000", letterSpacing: "2px", marginBottom: "16px" }}>
              {captchaChallenge.q} = ?
            </div>
            <input
              type="text"
              placeholder="Your answer"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              className="cs-input"
              style={{ textAlign: "center", fontSize: "16px", marginBottom: "14px" }}
              autoFocus
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={handleVerifyCaptchaAndPost} className="cs-btn cs-btn-primary" style={{ flex: 1 }}>
                Verify & Post Comment
              </button>
              <button onClick={() => setShowCaptchaModal(false)} className="cs-btn" style={{ background: "#e2e8f0" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="cs-card cs-composer">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          placeholder="Write your comment here... Mention other users with @username"
          rows={3}
        />
        <div className="cs-composer-footer">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="cs-select"
          >
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <option key={code} value={code}>
                Language: {name}
              </option>
            ))}
          </select>

          <span className="cs-counter">{text.length} / 1000</span>

          <button onClick={() => handlePost(null, text)} className="cs-btn cs-btn-primary">
            <Send size={14} /> Post Comment
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="cs-card cs-filters">
        <input
          type="search"
          placeholder="Search comments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="cs-input"
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="cs-select">
          <option value="newest">Sort: Newest</option>
          <option value="oldest">Sort: Oldest</option>
          <option value="liked">Sort: Most Liked</option>
          <option value="relevant">Sort: Most Relevant</option>
        </select>
        <select
          value={preferredLang}
          onChange={(e) => setPreferredLang(e.target.value)}
          className="cs-select"
        >
          {Object.entries(LANGUAGES).map(([code, name]) => (
            <option key={code} value={code}>
              Translate to: {name}
            </option>
          ))}
        </select>
      </div>

      {/* Comments List */}
      <div className="cs-list">
        {rootComments.length === 0 ? (
          <div className="cs-card cs-empty">No comments posted yet.</div>
        ) : (
          rootComments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              comments={comments}
              currentUser={currentUser}
              preferredLang={preferredLang}
              translations={translations}
              activeReplyBox={activeReplyBox}
              setActiveReplyBox={setActiveReplyBox}
              activeReportBox={activeReportBox}
              setActiveReportBox={setActiveReportBox}
              activeHistoryBox={activeHistoryBox}
              setActiveHistoryBox={setActiveHistoryBox}
              replyTextMap={replyTextMap}
              setReplyTextMap={setReplyTextMap}
              onPost={handlePost}
              onLike={handleLike}
              onDislike={handleDislike}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReport={handleReport}
              onTranslate={handleTranslate}
              onMention={handleMentionUser}
            />
          ))
        )}
      </div>

      {/* Moderation Records */}
      <div className="cs-card cs-moderation">
        <h4 className="cs-mod-title">
          <ShieldAlert size={18} style={{ color: "#dc2626" }} /> System Moderation Log ({moderationRecords.length})
        </h4>
        {moderationRecords.length === 0 ? (
          <p className="cs-empty-small">No moderation records logged.</p>
        ) : (
          <div className="cs-mod-list">
            {moderationRecords.slice(0, 5).map((rec, idx) => (
              <div key={rec.id || idx} className="cs-mod-item">
                <span className="cs-mod-type">[{rec.type}]</span> {rec.description} —{" "}
                <small className="cs-mod-time">{new Date(rec.createdAt).toLocaleTimeString()}</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  comments,
  currentUser,
  preferredLang,
  translations,
  activeReplyBox,
  setActiveReplyBox,
  activeReportBox,
  setActiveReportBox,
  activeHistoryBox,
  setActiveHistoryBox,
  replyTextMap,
  setReplyTextMap,
  onPost,
  onLike,
  onDislike,
  onEdit,
  onDelete,
  onReport,
  onTranslate,
  onMention
}) {
  const childReplies = comments.filter(c => String(c.parentId) === String(comment.id));
  const translationKey = `${comment.id}_${preferredLang}`;

  // 15-Minute Edit & Delete Window Calculation
  const elapsedMinutes = (Date.now() - new Date(comment.createdAt).getTime()) / (1000 * 60);
  const canModify = elapsedMinutes <= 15;

  const renderCommentText = (rawText) => {
    if (!rawText) return "";
    const parts = rawText.split(/(@[\w.-]+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={idx}
            className="cs-mention-pill"
            style={{
              color: "#990000",
              background: "rgba(153, 0, 0, 0.1)",
              padding: "1px 6px",
              borderRadius: "6px",
              fontWeight: "700",
              display: "inline-block",
              margin: "0 2px"
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="cs-card cs-comment-card">
      <div className="cs-comment-header">
        <div className="cs-avatar">
          <User size={20} />
        </div>
        <div className="cs-user-info">
          <strong className="cs-username">@{comment.username}</strong>
          <span className="cs-meta">
            <MapPin size={12} /> {comment.location} • {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {comment.updatedAt && <span className="cs-badge">Edited</span>}
      </div>

      <div className="cs-comment-body">
        {comment.deleted ? (
          <p className="cs-deleted">[Deleted comment]</p>
        ) : (
          <p className="cs-text">{renderCommentText(comment.text)}</p>
        )}

        {translations[translationKey] && (
          <div className="cs-translation-box" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Languages size={16} /> <span><strong>Translated:</strong> {translations[translationKey]}</span>
          </div>
        )}
      </div>

      {!comment.deleted && (
        <div className="cs-actions">
          <button onClick={() => onLike(comment.id)} className="cs-action-btn cs-like-btn">
            <ThumbsUp size={13} /> {comment.likes || 0}
          </button>
          <button onClick={() => onDislike(comment.id)} className="cs-action-btn cs-dislike-btn">
            <ThumbsDown size={13} /> {comment.dislikes || 0}
          </button>
          <button onClick={() => setActiveReplyBox(activeReplyBox === comment.id ? null : comment.id)} className="cs-action-btn">
            <CornerDownRight size={13} /> Reply
          </button>
          <button onClick={() => onMention(comment.username)} className="cs-action-btn" title={`Mention @${comment.username}`}>
            <span style={{ fontWeight: "800", color: "#990000" }}>@</span> Mention
          </button>
          <button onClick={() => onTranslate(comment)} className="cs-action-btn">
            <Languages size={13} /> Translate
          </button>
          <button onClick={() => setActiveReportBox(activeReportBox === comment.id ? null : comment.id)} className="cs-action-btn">
            <Flag size={13} /> Report
          </button>
          <button onClick={() => setActiveHistoryBox(activeHistoryBox === comment.id ? null : comment.id)} className="cs-action-btn">
            <Clock size={13} /> History
          </button>
          {comment.username === currentUser && (
            <button
              onClick={() => canModify ? onEdit(comment) : alert("Edit window expired (15-minute time limit exceeded).")}
              className={`cs-action-btn cs-edit-btn ${!canModify ? "cs-action-disabled" : ""}`}
              title={canModify ? "Edit within 15 mins" : "Edit window expired (15m limit)"}
              style={{ opacity: canModify ? 1 : 0.5, cursor: canModify ? "pointer" : "not-allowed" }}
            >
              <Edit3 size={13} /> {canModify ? "Edit" : "Edit (Expired)"}
            </button>
          )}
          {comment.username === currentUser && (
            <button
              onClick={() => canModify ? onDelete(comment.id) : alert("Delete window expired (15-minute time limit exceeded).")}
              className={`cs-action-btn cs-danger-btn ${!canModify ? "cs-action-disabled" : ""}`}
              title={canModify ? "Delete within 15 mins" : "Delete window expired (15m limit)"}
              style={{ opacity: canModify ? 1 : 0.5, cursor: canModify ? "pointer" : "not-allowed" }}
            >
              <Trash2 size={13} /> {canModify ? "Delete" : "Delete (Expired)"}
            </button>
          )}
        </div>
      )}

      {/* Reply Input Box */}
      {activeReplyBox === comment.id && (
        <div className="cs-inline-box">
          <textarea
            placeholder="Write a reply..."
            value={replyTextMap[comment.id] || ""}
            onChange={(e) => setReplyTextMap({ ...replyTextMap, [comment.id]: e.target.value })}
            className="cs-textarea-sm"
          />
          <button
            className="cs-btn cs-btn-primary cs-btn-sm"
            onClick={() => onPost(comment.id, replyTextMap[comment.id])}
          >
            <Send size={12} /> Post Reply
          </button>
        </div>
      )}

      {/* Report Box */}
      {activeReportBox === comment.id && (
        <div className="cs-inline-box">
          <select id={`report-reason-${comment.id}`} className="cs-select" style={{ marginBottom: "8px" }}>
            <option value="spam">Spam</option>
            <option value="harassment">Harassment</option>
            <option value="offensive">Offensive Content</option>
          </select>
          <button
            className="cs-btn cs-btn-danger-sm"
            onClick={() => {
              const el = document.getElementById(`report-reason-${comment.id}`);
              onReport(comment.id, el ? el.value : "spam");
            }}
          >
            <Flag size={12} /> Submit Report
          </button>
        </div>
      )}

      {/* History Box */}
      {activeHistoryBox === comment.id && (
        <div className="cs-inline-box cs-history-box">
          <h5 style={{ margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "6px" }}>
            <Clock size={14} /> Edit & Action History:
          </h5>
          {comment.history && comment.history.length > 0 ? (
            comment.history.map((h, i) => (
              <div key={i} className="cs-history-item">
                <strong>{h.action}</strong> • {new Date(h.timestamp).toLocaleString()}
                {h.text && <div style={{ fontStyle: "italic", marginTop: "2px" }}>"{h.text}"</div>}
              </div>
            ))
          ) : (
            <p>No history entries.</p>
          )}
        </div>
      )}

      {/* Nested Replies */}
      {childReplies.length > 0 && (
        <div className="cs-replies-container">
          {childReplies.map(reply => (
            <div key={reply.id} className="cs-reply-item">
              <div className="cs-reply-header">
                <strong>@{reply.username}</strong>
                <span className="cs-meta">• {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="cs-text">{reply.deleted ? "[Deleted reply]" : reply.text}</p>
              {!reply.deleted && (
                <div className="cs-actions cs-actions-sm">
                  <button onClick={() => onLike(reply.id)} className="cs-action-btn cs-like-btn">
                    <ThumbsUp size={12} /> {reply.likes || 0}
                  </button>
                  <button onClick={() => onDislike(reply.id)} className="cs-action-btn cs-dislike-btn">
                    <ThumbsDown size={12} /> {reply.dislikes || 0}
                  </button>
                  {reply.username === currentUser && (
                    <button onClick={() => onDelete(reply.id)} className="cs-action-btn cs-danger-btn">
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
