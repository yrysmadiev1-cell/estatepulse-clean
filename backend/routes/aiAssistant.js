const express = require("express");
const axios = require("axios");
const NewsArticle = require("../models/NewsArticle");

const router = express.Router();
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

router.post("/chat", async (req, res) => {
  try {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const city = typeof req.body?.city === "string" ? req.body.city.trim() : "";

    if (!message) {
      return res.status(400).json({ message: "Введите сообщение" });
    }

    const query = {};
    if (city) {
      query["nlp.city"] = city;
    }

    const articles = await NewsArticle.find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(8)
      .lean();

    const context_news = articles.map((item) => ({
      title: item?.title || "",
      summary: item?.nlp?.summary || "",
      city: item?.nlp?.city || "",
      source: item?.source || "",
      url: item?.url || "",
    }));

    const mlResp = await axios.post(`${ML_SERVICE_URL}/ai-assistant/chat`, {
      user_query: message,
      context_news,
    });

    return res.json({ answer: mlResp.data?.answer || "" });
  } catch (err) {
    return res.json({
      answer: "Ассистент временно недоступен. Попробуйте позже.",
    });
  }
});

module.exports = router;
