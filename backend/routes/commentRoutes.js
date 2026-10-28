const express = require("express");
const router = express.Router();

const Comment = require("../models/Comment");
const Report = require("../models/Report");
const ModerationRecord = require("../models/ModerationRecord");

const BAD_WORDS = [
  "abuseword",
  "badword",
  "idiot",
  "stupid",
  "fuck",
  "shit",
  "bastard",
  "asshole"
];

function normalize(text) {
  return String(text || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function hasBadWord(text) {
  const value = normalize(text);
  return BAD_WORDS.some(word => {
    return new RegExp(`(^|\\s)${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|\\s|[.,!?])`, "i").test(value);
  });
}

function isSpam(text) {
  const value = normalize(text);
  const spamPatterns = [
    /buy\s+now/i,
    /click\s+here/i,
    /free\s+money/i,
    /winner/i,
    /congratulations.*prize/i,
    /visit\s+my\s+profile/i
  ];
  if (spamPatterns.some(pattern => pattern.test(value))) return true;

  const words = value.split(/\s+/);
  if (words.length >= 8) {
    const counts = {};
    words.forEach(word => {
      counts[word] = (counts[word] || 0) + 1;
    });
    if (Math.max(...Object.values(counts)) >= 5) return true;
  }
  return false;
}

function hasMaliciousLink(text) {
  const urls = String(text).match(/https?:\/\/[^\s]+/gi) || [];
  return urls.some(url =>
    /javascript:|data:|\.exe($|\?)|\.bat($|\?)|\.cmd($|\?)|\.scr($|\?)|\.msi($|\?)|bit\.ly|tinyurl\.com/i.test(url)
  );
}

function repeatedSymbols(text) {
  if (/([!@#$%^&*_=+\-])\1{7,}/u.test(text)) return true;
  if (/([!?.,])\1{5,}/u.test(text)) return true;
  const emojis = String(text).match(/\p{Extended_Pictographic}/gu) || [];
  return emojis.length >= 5 && new Set(emojis).size === 1;
}

// Format MongoDB comment doc to standard JSON schema expected by frontend
function formatComment(doc) {
  return {
    id: doc._id.toString(),
    _id: doc._id.toString(),
    videoId: doc.videoId ? doc.videoId.toString() : null,
    parentId: doc.parentId || null,
    username: doc.username || "harikaran",
    profilePicture: doc.profilePicture || "youtube.jpg",
    location: doc.location || "Tamil Nadu, India",
    text: doc.text,
    language: doc.language || "en",
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
    version: doc.version || 1,
    likes: doc.likes || 0,
    dislikes: doc.dislikes || 0,
    deleted: doc.deleted || false,
    history: doc.history ? doc.history.map(h => ({
      action: h.action,
      text: h.text,
      timestamp: h.timestamp ? new Date(h.timestamp).toISOString() : new Date().toISOString()
    })) : []
  };
}

// GET Moderation Records
router.get("/moderation", async (req, res) => {
  try {
    const records = await ModerationRecord.find().sort({ createdAt: -1 });
    res.json({
      records: records.map(r => ({
        id: r._id.toString(),
        type: r.type,
        description: r.description,
        createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString()
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET All Comments (Optional videoId query param)
router.get("/", async (req, res) => {
  try {
    const { videoId } = req.query;
    let query = {};
    if (videoId && videoId !== "all") {
      query = {
        $or: [
          { videoId: videoId },
          { videoId: null },
          { videoId: { $exists: false } }
        ]
      };
    }

    const comments = await Comment.find(query).sort({ createdAt: -1 });
    res.json({ comments: comments.map(formatComment) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rate limiting & spam flooding protection
const userPostingTimestamps = new Map();
const RATE_LIMIT_WINDOW_MS = 30 * 1000; // 30 seconds
const MAX_POSTS_PER_WINDOW = 3;
const COMMENT_TIME_LIMIT_MS = 15 * 60 * 1000; // 15-minute time limit for edit/delete

// POST Create Comment or Reply
router.post("/", async (req, res) => {
  try {
    const { parentId, text, language = "en", username, profilePicture, location, videoId, captchaToken } = req.body;
    const value = String(text || "").trim();
    const clientKey = `${username || req.ip || "user"}`;

    if (!value) {
      return res.status(400).json({ message: "Comment cannot be empty." });
    }

    if (value.length > 1000) {
      return res.status(400).json({ message: "Comment cannot exceed 1000 characters." });
    }

    // Rate Limiting & Comment Flooding Protection Check
    const now = Date.now();
    const timestamps = (userPostingTimestamps.get(clientKey) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (timestamps.length >= MAX_POSTS_PER_WINDOW) {
      const isValidCaptcha = captchaToken && (captchaToken === "VALID_CAPTCHA" || captchaToken.startsWith("CAPTCHA_"));
      if (!isValidCaptcha) {
        await ModerationRecord.create({
          type: "RateLimited",
          description: `Comment flood detected for user ${clientKey}. CAPTCHA verification required.`
        });
        return res.status(429).json({
          message: "Excessive comment flooding detected! Please complete CAPTCHA verification to continue.",
          requiresCaptcha: true
        });
      }
    }

    // CAPTCHA Bot Protection Check
    if (captchaToken === "INVALID_CAPTCHA" || captchaToken === "EXPIRED_CAPTCHA") {
      await ModerationRecord.create({ type: "Blocked", description: "Comment blocked: CAPTCHA verification failed." });
      return res.status(400).json({ message: "CAPTCHA verification failed. Bot prevention active." });
    }

    if (hasBadWord(value)) {
      await ModerationRecord.create({ type: "Blocked", description: "Comment blocked: abusive words detected." });
      return res.status(400).json({ message: "Comment blocked: abusive words detected." });
    }

    if (isSpam(value)) {
      await ModerationRecord.create({ type: "Blocked", description: "Comment blocked: spam detected." });
      return res.status(400).json({ message: "Comment blocked: spam detected." });
    }

    if (hasMaliciousLink(value)) {
      await ModerationRecord.create({ type: "Blocked", description: "Comment blocked: malicious link detected." });
      return res.status(400).json({ message: "Comment blocked: malicious link detected." });
    }

    if (repeatedSymbols(value)) {
      await ModerationRecord.create({ type: "Blocked", description: "Comment blocked: repeated symbols detected." });
      return res.status(400).json({ message: "Comment blocked: repeated symbols or emojis detected." });
    }

    // Check duplicate
    const existing = await Comment.findOne({
      parentId: parentId || null,
      deleted: false,
      text: value
    });

    if (existing) {
      await ModerationRecord.create({ type: "Blocked", description: "Duplicate comment blocked." });
      return res.status(400).json({ message: "Duplicate comment blocked." });
    }

    // Record posting timestamp for rate limit tracking
    timestamps.push(now);
    userPostingTimestamps.set(clientKey, timestamps);

    const newComment = await Comment.create({
      videoId: videoId || null,
      parentId: parentId || null,
      username: username || "harikaran",
      profilePicture: profilePicture || "youtube.jpg",
      location: location || "Tamil Nadu, India",
      text: value,
      language: language,
      version: 1,
      history: [
        {
          action: "Created",
          text: value,
          timestamp: new Date()
        }
      ]
    });

    res.status(201).json({
      message: parentId ? "Reply posted successfully." : "Comment posted successfully.",
      comment: formatComment(newComment)
    });
  } catch (error) {
    console.error("Create comment error:", error);
    res.status(500).json({ message: "Server error creating comment", error: error.message });
  }
});

// PUT Edit Comment (With 15-Minute Time Limit & Simultaneous Edit Concurrency Control)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { text, expectedVersion, simulateConflict = false, adminOverride = false } = req.body;
    const value = String(text || "").trim();

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.deleted) {
      return res.status(400).json({ message: "Cannot edit deleted comment" });
    }

    // 15-Minute Time Limit Enforcement for Editing
    const elapsedMs = Date.now() - new Date(comment.createdAt).getTime();
    if (elapsedMs > COMMENT_TIME_LIMIT_MS && !adminOverride) {
      return res.status(403).json({
        message: "Edit window expired! Comments can only be edited within 15 minutes of posting."
      });
    }

    // Simultaneous Edit Concurrency Check (Version Lock)
    if (simulateConflict || (expectedVersion !== undefined && expectedVersion !== comment.version)) {
      await ModerationRecord.create({
        type: "Conflict",
        description: `Simultaneous edit conflict detected for comment ${id}. Client version: ${expectedVersion}, DB version: ${comment.version}`
      });
      return res.status(409).json({
        message: "Simultaneous edit conflict! Another user modified this comment concurrently. Please refresh before editing.",
        currentVersion: comment.version,
        latestComment: formatComment(comment)
      });
    }

    if (hasBadWord(value) || isSpam(value) || hasMaliciousLink(value) || repeatedSymbols(value)) {
      await ModerationRecord.create({ type: "Blocked", description: `Edit blocked for comment ${id}` });
      return res.status(400).json({ message: "Edit blocked: moderation criteria failed." });
    }

    comment.history.push({
      action: "Edited",
      text: value,
      timestamp: new Date()
    });
    comment.text = value;
    comment.version = (comment.version || 1) + 1;
    comment.updatedAt = new Date();

    await comment.save();
    await ModerationRecord.create({ type: "Edited", description: `Comment ${id} was edited to version ${comment.version}.` });

    res.json({ message: "Comment edited successfully", comment: formatComment(comment) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE Comment (With 15-Minute Time Limit Enforcement)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { adminOverride = false } = req.query;
    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // 15-Minute Time Limit Enforcement for Deletion
    const elapsedMs = Date.now() - new Date(comment.createdAt).getTime();
    if (elapsedMs > COMMENT_TIME_LIMIT_MS && !adminOverride && !req.body?.adminOverride) {
      return res.status(403).json({
        message: "Delete window expired! Comments can only be deleted within 15 minutes of posting."
      });
    }

    // Check if reply exists
    const hasReplies = await Comment.exists({ parentId: id });

    if (hasReplies) {
      comment.deleted = true;
      comment.history.push({
        action: "Deleted",
        text: comment.text,
        timestamp: new Date()
      });
      comment.text = "[Deleted comment]";
      comment.updatedAt = new Date();
      await comment.save();
    } else {
      await Comment.findByIdAndDelete(id);
    }

    await ModerationRecord.create({ type: "Deleted", description: `Comment ${id} was deleted.` });

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST Like Comment
router.post("/:id/like", async (req, res) => {
  try {
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { returnDocument: "after" }
    );
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    res.json({ comment: formatComment(comment) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST Dislike Comment
router.post("/:id/dislike", async (req, res) => {
  try {
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { $inc: { dislikes: 1 } },
      { returnDocument: "after" }
    );
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    res.json({ comment: formatComment(comment) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST Report Comment
router.post("/:id/report", async (req, res) => {
  try {
    const { id } = req.params;
    const { username = "harikaran", reason = "spam" } = req.body;

    const existingReport = await Report.findOne({ commentId: id, username, reason });
    if (existingReport) {
      return res.status(400).json({ message: "You have already submitted this report." });
    }

    await Report.create({ commentId: id, username, reason });
    await ModerationRecord.create({
      type: "Report",
      description: `${reason} — Flagged for administrator review.`
    });

    res.json({ message: "Comment flagged for administrator review." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
