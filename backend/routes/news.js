const express = require("express");
const NewsArticle = require("../models/NewsArticle");

const router = express.Router();

// POST /api/news/ingest
// Saves raw article into news_articles (no NLP yet)
router.post("/ingest", async (req, res, next) => {
  try {
    const { url, source, sourceDomain, title, publishedAt, rawText, rawHtml } = req.body;

    if (!url || !source || !title || !rawText) {
      return res.status(400).json({
        error: "Missing required fields: url, source, title, rawText",
      });
    }

    // Upsert by url to avoid duplicates
    const doc = await NewsArticle.findOneAndUpdate(
      { url },
      {
        $setOnInsert: {
          url,
          source,
          sourceDomain,
          title,
          publishedAt: publishedAt ? new Date(publishedAt) : undefined,
          rawText,
          rawHtml,
          status: "raw",
        },
      },
      { new: true, upsert: true }
    );

    return res.status(201).json({
      ok: true,
      id: doc._id,
      status: doc.status,
      createdAt: doc.createdAt,
    });
  } catch (err) {
    // Duplicate key error (url unique) or other mongo errors
    return next(err);
  }
});

module.exports = router;
