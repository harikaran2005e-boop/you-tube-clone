"use strict";

/* =========================================================
   CONFIGURATION & BACKEND API URL
========================================================= */

const API_BASE_URL = "http://localhost:5000/api";

const CURRENT_USER = {
  username: "harikaran",
  location: "Tamil Nadu, India",
  profilePicture: "youtube.jpg"
};

const MAX_LENGTH = 1000;
const EDIT_LIMIT = 15 * 60 * 1000;
const FLOOD_LIMIT = 5;
const FLOOD_WINDOW = 60 * 1000;

/* =========================================================
   LANGUAGES
========================================================= */

const LANGUAGES = {
  en: "English",
  ta: "Tamil",
  te: "Telugu",
  hi: "Hindi",
  bn: "Bengali",
  ml: "Malayalam",
  kn: "Kannada",
  mr: "Marathi",
  gu: "Gujarati",
  pa: "Punjabi",
  ur: "Urdu",
  or: "Odia",
  ne: "Nepali",
  si: "Sinhala",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  "zh-CN": "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)",
  ar: "Arabic",
  tr: "Turkish",
  nl: "Dutch",
  pl: "Polish",
  uk: "Ukrainian",
  vi: "Vietnamese",
  th: "Thai",
  id: "Indonesian",
  ms: "Malay",
  fil: "Filipino",
  he: "Hebrew",
  fa: "Persian",
  ro: "Romanian",
  cs: "Czech",
  sv: "Swedish",
  da: "Danish",
  no: "Norwegian",
  fi: "Finnish",
  hu: "Hungarian",
  el: "Greek"
};

/* =========================================================
   MODERATION
========================================================= */

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

/* =========================================================
   STORAGE / STATE
========================================================= */

let comments = JSON.parse(localStorage.getItem("comments")) || [];
let reports = JSON.parse(localStorage.getItem("reports")) || [];
let moderationRecords = JSON.parse(localStorage.getItem("moderationRecords")) || [];
let postTimes = JSON.parse(localStorage.getItem("postTimes")) || [];
let translationCache = new Map();

/* =========================================================
   DOM ELEMENTS
========================================================= */

const input = document.getElementById("commentInput");
const commentLanguage = document.getElementById("commentLanguage");
const preferredLanguage = document.getElementById("preferredLanguage");
const postButton = document.getElementById("postCommentBtn");
const commentsContainer = document.getElementById("commentsContainer");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortComments");
const characterCount = document.getElementById("characterCount");
const message = document.getElementById("composerMessage");
const moderationElement = document.getElementById("moderationRecords");
const recordCount = document.getElementById("recordCount");
const videoSelect = document.getElementById("videoSelect");

/* =========================================================
   LANGUAGE SELECT SETUP
========================================================= */

function fillLanguages(select) {
  if (!select) return;
  select.innerHTML = "";

  Object.entries(LANGUAGES).forEach(([code, name]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = name;
    select.appendChild(option);
  });
}

fillLanguages(commentLanguage);
fillLanguages(preferredLanguage);

if (commentLanguage) commentLanguage.value = "en";
if (preferredLanguage) preferredLanguage.value = "en";

/* =========================================================
   EVENTS
========================================================= */

if (input) {
  input.addEventListener("input", () => {
    characterCount.textContent = `${input.value.length} / ${MAX_LENGTH}`;
  });
}

if (postButton) {
  postButton.addEventListener("click", () => {
    createComment(null, input.value, commentLanguage.value);
  });
}

if (searchInput) searchInput.addEventListener("input", renderComments);
if (sortSelect) sortSelect.addEventListener("change", renderComments);
if (preferredLanguage) preferredLanguage.addEventListener("change", renderComments);
if (videoSelect) videoSelect.addEventListener("change", fetchCommentsFromBackend);

/* =========================================================
   BACKEND SYNC FUNCTIONS
========================================================= */

async function fetchCommentsFromBackend() {
  try {
    const selectedVideo = videoSelect ? videoSelect.value : "";
    const url = selectedVideo
      ? `${API_BASE_URL}/comments?videoId=${selectedVideo}`
      : `${API_BASE_URL}/comments`;

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.comments)) {
        comments = data.comments;
        save();
      }
    }
  } catch (err) {
    console.warn("Backend offline or unreachable, using local storage", err);
  }
  fetchModerationFromBackend();
  renderComments();
}

async function fetchModerationFromBackend() {
  try {
    const res = await fetch(`${API_BASE_URL}/comments/moderation`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.records)) {
        moderationRecords = data.records;
        save();
      }
    }
  } catch (err) {
    console.warn("Backend moderation fetch failed", err);
  }
  renderModeration();
}

/* =========================================================
   SAVE LOCAL BACKUP
========================================================= */

function save() {
  localStorage.setItem("comments", JSON.stringify(comments));
  localStorage.setItem("reports", JSON.stringify(reports));
  localStorage.setItem("moderationRecords", JSON.stringify(moderationRecords));
  localStorage.setItem("postTimes", JSON.stringify(postTimes));
}

/* =========================================================
   MESSAGE
========================================================= */

function showMessage(text, error = false) {
  if (!message) return;
  message.textContent = text;
  message.style.color = error ? "#b42318" : "#067647";

  setTimeout(() => {
    if (message.textContent === text) {
      message.textContent = "";
    }
  }, 4000);
}

/* =========================================================
   ID GENERATOR & UTILS
========================================================= */

function id() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function normalize(text) {
  return String(text || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   PROFANITY & MODERATION CHECKS
========================================================= */

function hasBadWord(text) {
  const value = normalize(text);
  return BAD_WORDS.some(word => {
    return new RegExp(`(^|\\s)${escapeRegExp(word)}($|\\s|[.,!?])`, "i").test(value);
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    words.forEach(word => { counts[word] = (counts[word] || 0) + 1; });
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

function duplicate(text, parentId) {
  const value = normalize(text);
  return comments.some(comment =>
    !comment.deleted &&
    comment.parentId === parentId &&
    normalize(comment.text) === value
  );
}

function cleanPostTimes() {
  const now = Date.now();
  postTimes = postTimes.filter(time => now - time < FLOOD_WINDOW);
  save();
}

function flooding() {
  cleanPostTimes();
  return postTimes.length >= FLOOD_LIMIT;
}

function captcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const answer = prompt(`CAPTCHA\n\nWhat is ${a} + ${b} ?`);
  return answer !== null && Number(answer.trim()) === a + b;
}

function validate(text, parentId, ignoreDuplicate = false) {
  const value = String(text).trim();
  if (!value) return "Comment cannot be empty.";
  if (value.length > MAX_LENGTH) return "Comment cannot exceed 1000 characters.";
  if (hasBadWord(value)) return "Comment blocked: abusive words detected.";
  if (isSpam(value)) return "Comment blocked: spam detected.";
  if (hasMaliciousLink(value)) return "Comment blocked: malicious link detected.";
  if (repeatedSymbols(value)) return "Comment blocked: repeated symbols or emojis detected.";
  if (!ignoreDuplicate && duplicate(value, parentId)) return "Duplicate comment blocked.";
  if (flooding()) return "CAPTCHA_REQUIRED";
  return null;
}

/* =========================================================
   CREATE COMMENT / REPLY (WITH BACKEND API)
========================================================= */

async function createComment(parentId, text, language) {
  let error = validate(text, parentId);

  if (error === "CAPTCHA_REQUIRED") {
    if (!captcha()) {
      addModeration("Blocked", "CAPTCHA verification failed.");
      showMessage("CAPTCHA failed.", true);
      return;
    }
    postTimes = [];
  }

  if (error && error !== "CAPTCHA_REQUIRED") {
    addModeration("Blocked", error);
    showMessage(error, true);
    return;
  }

  const selectedVideo = videoSelect ? videoSelect.value : null;

  try {
    const res = await fetch(`${API_BASE_URL}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentId: parentId || null,
        text: String(text).trim(),
        language: language,
        username: CURRENT_USER.username,
        profilePicture: CURRENT_USER.profilePicture,
        location: CURRENT_USER.location,
        videoId: selectedVideo || null
      })
    });

    const data = await res.json();
    if (!res.ok) {
      showMessage(data.message || "Failed to post comment", true);
      fetchModerationFromBackend();
      return;
    }

    if (input) input.value = "";
    if (characterCount) characterCount.textContent = `0 / ${MAX_LENGTH}`;

    showMessage(parentId ? "Reply posted successfully." : "Comment posted successfully.");
    postTimes.push(Date.now());
    save();

    await fetchCommentsFromBackend();
  } catch (err) {
    console.error("Backend error, falling back to local creation:", err);
    // Offline fallback
    const now = new Date().toISOString();
    const comment = {
      id: id(),
      parentId: parentId || null,
      username: CURRENT_USER.username,
      profilePicture: CURRENT_USER.profilePicture,
      location: CURRENT_USER.location,
      text: String(text).trim(),
      language: language,
      createdAt: now,
      updatedAt: null,
      version: 1,
      likes: 0,
      dislikes: 0,
      deleted: false,
      history: [{ action: "Created", text: String(text).trim(), timestamp: now }]
    };
    comments.push(comment);
    postTimes.push(Date.now());
    save();
    if (input) input.value = "";
    showMessage(parentId ? "Reply posted successfully." : "Comment posted successfully.");
    renderComments();
  }
}

/* =========================================================
   TRANSLATION SERVICE
========================================================= */

async function translateText(text, target) {
  if (!text) return "";
  if (!target) return text;

  const key = `${target}:${text}`;
  if (translationCache.has(key)) {
    return translationCache.get(key);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, target, source: "auto" })
    });
    const data = await response.json();
    if (response.ok && data.translated) {
      translationCache.set(key, data.translated);
      return data.translated;
    }
  } catch (e) {
    console.warn("Backend translation failed:", e);
  }

  // Local fallback
  return `[${target.toUpperCase()}] ${text}`;
}

async function loadTranslation(comment, box) {
  if (!box || !preferredLanguage) return;
  const target = preferredLanguage.value;

  if (comment.language === target) {
    box.textContent = comment.text;
    return;
  }

  box.textContent = "Translating...";
  try {
    box.textContent = await translateText(comment.text, target);
  } catch {
    box.textContent = "Translation failed. Please try again.";
    box.classList.add("translation-error");
  }
}

/* =========================================================
   SORTING & FILTERS
========================================================= */

function getComments() {
  let list = comments.filter(comment => comment.parentId === null);
  const query = searchInput ? normalize(searchInput.value) : "";

  if (query) {
    list = list.filter(comment =>
      normalize(comment.text).includes(query) ||
      normalize(comment.username).includes(query) ||
      normalize(comment.location).includes(query)
    );
  }

  const sortVal = sortSelect ? sortSelect.value : "newest";

  switch (sortVal) {
    case "oldest":
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case "liked":
      list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      break;
    case "relevant":
      list.sort((a, b) => relevance(b) - relevance(a));
      break;
    default:
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return list;
}

function relevance(comment) {
  const query = searchInput ? normalize(searchInput.value) : "";
  if (!query) return comment.likes || 0;

  let score = (comment.likes || 0) * 2;
  query.split(/\s+/).forEach(word => {
    if (normalize(comment.text).includes(word)) {
      score += 5;
    }
  });
  return score;
}

function date(value) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function canEdit(comment) {
  return (
    comment.username === CURRENT_USER.username &&
    !comment.deleted &&
    Date.now() - new Date(comment.createdAt).getTime() <= EDIT_LIMIT
  );
}

/* =========================================================
   RENDER COMMENTS
========================================================= */

async function renderComments() {
  if (!commentsContainer) return;

  const list = getComments();

  if (!list.length) {
    commentsContainer.innerHTML = `<section class="card">No comments found.</section>`;
    renderModeration();
    return;
  }

  commentsContainer.innerHTML = "";

  for (const comment of list) {
    const element = await createCommentElement(comment);
    commentsContainer.appendChild(element);
  }

  renderModeration();
}

async function createCommentElement(comment) {
  const article = document.createElement("article");
  article.className = "card comment";

  article.innerHTML = `
    <div class="comment-header">
      <img class="comment-avatar" src="${escapeAttr(comment.profilePicture)}" alt="Profile" onerror="this.src='youtube.jpg'">
      <div class="comment-user">
        <strong>@${escapeHtml(comment.username)}</strong>
        <div class="comment-meta">
          📍 ${escapeHtml(comment.location)} • ${escapeHtml(date(comment.createdAt))}
        </div>
      </div>
      ${comment.updatedAt ? `<span class="edited">Edited</span>` : ""}
    </div>

    <div class="comment-content">
      ${comment.deleted ? `<p class="deleted-comment">[Deleted comment]</p>` : `<p>${mentions(comment.text)}</p>`}
      ${comment.deleted ? "" : `<div class="translation"></div>`}
    </div>

    ${comment.deleted ? "" : `
      <div class="comment-actions">
        <button class="like">👍 Like ${comment.likes || 0}</button>
        <button class="dislike">👎 Dislike ${comment.dislikes || 0}</button>
        <button class="reply">Reply</button>
        <button class="translate">Translate</button>
        <button class="report">Report</button>
        <button class="history">History</button>
        ${canEdit(comment) ? `<button class="edit">Edit</button>` : ""}
        ${comment.username === CURRENT_USER.username ? `<button class="delete-button delete">Delete</button>` : ""}
      </div>

      <div class="reply-box">
        <textarea maxlength="${MAX_LENGTH}" placeholder="Write a reply..."></textarea>
        <button class="post-reply">Post Reply</button>
      </div>

      <div class="report-box">
        <select class="reason">
          <option value="spam">Spam</option>
          <option value="harassment">Harassment</option>
          <option value="offensive">Offensive content</option>
        </select>
        <button class="submit-report">Submit Report</button>
      </div>

      <div class="history-box"></div>
    `}

    <div class="replies"></div>
  `;

  const translation = article.querySelector(".translation");
  if (translation) {
    await loadTranslation(comment, translation);
  }

  attachEvents(article, comment);
  renderHistory(comment, article.querySelector(".history-box"));
  await renderReplies(comment.id, article.querySelector(".replies"));

  return article;
}

/* =========================================================
   ATTACH EVENTS FOR ACTIONS
========================================================= */

function attachEvents(article, comment) {
  article.querySelector(".like")?.addEventListener("click", async () => {
    try {
      await fetch(`${API_BASE_URL}/comments/${comment.id}/like`, { method: "POST" });
      await fetchCommentsFromBackend();
    } catch {
      comment.likes = (comment.likes || 0) + 1;
      save();
      renderComments();
    }
  });

  article.querySelector(".dislike")?.addEventListener("click", async () => {
    try {
      await fetch(`${API_BASE_URL}/comments/${comment.id}/dislike`, { method: "POST" });
      await fetchCommentsFromBackend();
    } catch {
      comment.dislikes = (comment.dislikes || 0) + 1;
      save();
      renderComments();
    }
  });

  article.querySelector(".reply")?.addEventListener("click", () => {
    article.querySelector(".reply-box")?.classList.toggle("show");
  });

  article.querySelector(".translate")?.addEventListener("click", () => {
    article.querySelector(".translation")?.classList.toggle("show");
  });

  article.querySelector(".report")?.addEventListener("click", () => {
    article.querySelector(".report-box")?.classList.toggle("show");
  });

  article.querySelector(".history")?.addEventListener("click", () => {
    article.querySelector(".history-box")?.classList.toggle("show");
  });

  article.querySelector(".edit")?.addEventListener("click", () => edit(comment));
  article.querySelector(".delete")?.addEventListener("click", () => removeComment(comment));

  article.querySelector(".post-reply")?.addEventListener("click", () => {
    const replyInput = article.querySelector(".reply-box textarea");
    if (replyInput) {
      createComment(comment.id, replyInput.value, commentLanguage ? commentLanguage.value : "en");
    }
  });

  article.querySelector(".submit-report")?.addEventListener("click", () => {
    const reason = article.querySelector(".reason").value;
    report(comment, reason);
  });
}

/* =========================================================
   REPLIES RENDER
========================================================= */

async function renderReplies(parentId, container) {
  if (!container) return;

  const replies = comments
    .filter(comment => String(comment.parentId) === String(parentId))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  for (const reply of replies) {
    const div = document.createElement("div");
    div.className = "reply";

    div.innerHTML = `
      <div>
        <img class="reply-avatar" src="${escapeAttr(reply.profilePicture)}" alt="Profile" onerror="this.src='youtube.jpg'">
        <strong>@${escapeHtml(reply.username)}</strong>
      </div>

      <div class="reply-meta">
        📍 ${escapeHtml(reply.location)} • ${escapeHtml(date(reply.createdAt))}
        ${reply.updatedAt ? " • Edited" : ""}
      </div>

      ${reply.deleted ? `<p class="deleted-comment">[Deleted comment]</p>` : `
        <p>${mentions(reply.text)}</p>
        <div class="reply-actions">
          <button class="r-like">👍 ${reply.likes || 0}</button>
          <button class="r-dislike">👎 ${reply.dislikes || 0}</button>
          <button class="r-translate">Translate</button>
          <button class="r-report">Report</button>
          ${canEdit(reply) ? `<button class="r-edit">Edit</button>` : ""}
          ${reply.username === CURRENT_USER.username ? `<button class="r-delete delete-button">Delete</button>` : ""}
        </div>

        <div class="reply-translation"></div>

        <div class="reply-report-box report-box">
          <select class="r-reason">
            <option value="spam">Spam</option>
            <option value="harassment">Harassment</option>
            <option value="offensive">Offensive content</option>
          </select>
          <button class="r-submit">Submit Report</button>
        </div>
      `}
    `;

    const translation = div.querySelector(".reply-translation");
    if (translation) {
      await loadTranslation(reply, translation);
    }

    div.querySelector(".r-like")?.addEventListener("click", async () => {
      try {
        await fetch(`${API_BASE_URL}/comments/${reply.id}/like`, { method: "POST" });
        await fetchCommentsFromBackend();
      } catch {
        reply.likes = (reply.likes || 0) + 1;
        save();
        renderComments();
      }
    });

    div.querySelector(".r-dislike")?.addEventListener("click", async () => {
      try {
        await fetch(`${API_BASE_URL}/comments/${reply.id}/dislike`, { method: "POST" });
        await fetchCommentsFromBackend();
      } catch {
        reply.dislikes = (reply.dislikes || 0) + 1;
        save();
        renderComments();
      }
    });

    div.querySelector(".r-translate")?.addEventListener("click", () => {
      translation?.classList.toggle("show");
    });

    div.querySelector(".r-edit")?.addEventListener("click", () => edit(reply));
    div.querySelector(".r-delete")?.addEventListener("click", () => removeComment(reply));

    div.querySelector(".r-report")?.addEventListener("click", () => {
      div.querySelector(".reply-report-box")?.classList.toggle("show");
    });

    div.querySelector(".r-submit")?.addEventListener("click", () => {
      report(reply, div.querySelector(".r-reason").value);
    });

    container.appendChild(div);
  }
}

/* =========================================================
   EDIT
========================================================= */

async function edit(comment) {
  if (!canEdit(comment)) {
    showMessage("The 15 minute edit limit has expired.", true);
    return;
  }

  const oldText = comment.text;
  const newText = prompt("Edit your comment:", oldText);

  if (newText === null || !newText.trim()) return;

  const error = validate(newText, comment.parentId, true);
  if (error && error !== "CAPTCHA_REQUIRED") {
    addModeration("Blocked", `Edit blocked: ${error}`);
    showMessage(error, true);
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/comments/${comment.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText.trim() })
    });
    if (res.ok) {
      showMessage("Comment edited successfully.");
      await fetchCommentsFromBackend();
      return;
    }
  } catch (err) {
    console.warn("Backend edit failed, applying locally:", err);
  }

  // Fallback
  comment.history = Array.isArray(comment.history) ? comment.history : [];
  comment.history.push({
    action: "Edited",
    text: newText.trim(),
    timestamp: new Date().toISOString()
  });
  comment.text = newText.trim();
  comment.updatedAt = new Date().toISOString();
  comment.version = (comment.version || 1) + 1;
  addModeration("Edited", `Comment ${comment.id} was edited.`);
  save();
  renderComments();
}

/* =========================================================
   DELETE
========================================================= */

async function removeComment(comment) {
  if (comment.username !== CURRENT_USER.username) return;

  if (!confirm("Are you sure you want to delete this comment?")) return;

  try {
    const res = await fetch(`${API_BASE_URL}/comments/${comment.id}`, { method: "DELETE" });
    if (res.ok) {
      showMessage("Comment deleted successfully.");
      await fetchCommentsFromBackend();
      return;
    }
  } catch (err) {
    console.warn("Backend delete failed, applying locally:", err);
  }

  const hasReplies = comments.some(item => String(item.parentId) === String(comment.id));
  if (hasReplies) {
    comment.deleted = true;
    comment.history = Array.isArray(comment.history) ? comment.history : [];
    comment.history.push({
      action: "Deleted",
      text: comment.text,
      timestamp: new Date().toISOString()
    });
    comment.text = "[Deleted comment]";
    comment.updatedAt = new Date().toISOString();
  } else {
    comments = comments.filter(item => String(item.id) !== String(comment.id));
  }

  addModeration("Deleted", `Comment ${comment.id} was deleted.`);
  save();
  renderComments();
}

/* =========================================================
   REPORT
========================================================= */

async function report(comment, reason) {
  try {
    const res = await fetch(`${API_BASE_URL}/comments/${comment.id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: CURRENT_USER.username, reason })
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.message || "Failed to submit report.", true);
      return;
    }
    showMessage("Comment flagged for administrator review.");
    fetchModerationFromBackend();
    return;
  } catch (err) {
    console.warn("Backend report failed, applying locally:", err);
  }

  // Fallback
  reports.push({
    id: id(),
    commentId: comment.id,
    username: CURRENT_USER.username,
    reason,
    status: "Flagged for administrator review",
    createdAt: new Date().toISOString()
  });
  addModeration("Report", `${reason} — Flagged for administrator review.`);
  save();
  showMessage("Comment flagged for administrator review.");
  renderModeration();
}

/* =========================================================
   MODERATION
========================================================= */

function addModeration(type, description) {
  moderationRecords.push({
    id: id(),
    type,
    description,
    createdAt: new Date().toISOString()
  });
  save();
  renderModeration();
}

function renderModeration() {
  if (!moderationElement) return;

  if (recordCount) recordCount.textContent = moderationRecords.length;

  if (!moderationRecords.length) {
    moderationElement.textContent = "No moderation records.";
    return;
  }

  moderationElement.innerHTML = moderationRecords
    .slice()
    .reverse()
    .map(record => `
      <div class="moderation-record">
        <strong>${escapeHtml(record.type)}</strong> • ${escapeHtml(record.description)}
        <div class="record-time">${escapeHtml(date(record.createdAt))}</div>
      </div>
    `)
    .join("");
}

/* =========================================================
   HISTORY & MENTIONS & ESCAPING
========================================================= */

function renderHistory(comment, box) {
  if (!box) return;
  const history = Array.isArray(comment.history) ? comment.history : [];

  if (!history.length) {
    box.textContent = "No history available.";
    return;
  }

  box.innerHTML = history
    .map(item => `
      <div class="history-item">
        <strong>${escapeHtml(item.action)}</strong> • ${escapeHtml(date(item.timestamp))}
        ${item.action === "Edited" ? `<br>${escapeHtml(item.text)}` : ""}
      </div>
    `)
    .join("");
}

function mentions(text) {
  return escapeHtml(text).replace(/@([a-zA-Z0-9_]+)/g, '<span class="mention">@$1</span>');
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

/* =========================================================
   INITIALIZATION
========================================================= */

cleanPostTimes();
fetchCommentsFromBackend();