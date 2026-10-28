const express = require("express");
const router = express.Router();

// Translation API endpoint with MyMemory fallback
router.post("/", async (req, res) => {
  try {
    const { text, target, source = "en" } = req.body;

    if (!text || !target) {
      return res.status(400).json({ error: "Missing required text or target language" });
    }

    if (source === target) {
      return res.json({ translated: text });
    }

    const langPair = `${source === "auto" ? "en" : source}|${target}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;

    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data && data.responseData && data.responseData.translatedText) {
        return res.json({ translated: data.responseData.translatedText });
      }
    }

    // Fallback if external translation API fails
    return res.json({ translated: `[${target.toUpperCase()}] ${text}` });

  } catch (error) {
    console.error("Translation route error:", error);
    return res.status(500).json({
      error: "Translation service error",
      translated: req.body.text ? `[${(req.body.target || "").toUpperCase()}] ${req.body.text}` : ""
    });
  }
});

module.exports = router;
