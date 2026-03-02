const mongoose = require("mongoose");

const newsArticleSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, unique: true, index: true },
    source: { type: String, required: true }, // e.g. "kapital", "tengrinews"
    sourceDomain: { type: String }, // e.g. "kapital.kz"
    title: { type: String, required: true },
    publishedAt: { type: Date },

    rawText: { type: String, required: true }, // full text for internal analysis
    rawHtml: { type: String }, // optional, can skip now

    status: {
      type: String,
      enum: ["raw", "processed", "error"],
      default: "raw",
      index: true,
    },

    // placeholders for NLP results (later)
    nlp: {
      category: { type: String }, // real_estate/finance/macro/other
      city: { type: String }, // Алматы/Астана/...
      tags: [{ type: String }],
      summary: { type: String },

      impact: {
        direction: { type: String }, // up/down/neutral
        score: { type: Number }, // 0..100
        horizon: { type: String }, // short/medium/long
        explanation: { type: String },
        statedImpactPercent: { type: Number }, // optional
      },

      entities: [{ type: String }],
      numbers: [
        {
          kind: { type: String }, // percent/money/rate/date/other
          value: { type: Number },
          unit: { type: String }, // "%", "KZT", ...
          raw: { type: String }, // original snippet
        },
      ],
    },

    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" }, // link to generated post (later)
  },
  { timestamps: true }
);

module.exports = mongoose.model("NewsArticle", newsArticleSchema, "news_articles");
