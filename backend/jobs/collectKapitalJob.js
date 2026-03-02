const axios = require("axios");
const mongoose = require("mongoose");
const NewsArticle = require("../models/NewsArticle");
const {
  collectKapitalLinksFromSection,
  parseKapitalArticle,
} = require("../services/scrapers/kapital");

const NLP_BASE = process.env.NLP_URL || "http://127.0.0.1:8000";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getPostModel() {
  try {
    return mongoose.model("Post");
  } catch {
    return null;
  }
}

async function analyzeWithNLP(article) {
  const resp = await axios.post(
    `${NLP_BASE}/nlp/analyze-article`,
    {
      title: article.title,
      text: article.rawText,
      url: article.url,
      source: article.source,
      published_at: article.publishedAt ? article.publishedAt.toISOString() : null,
    },
    { timeout: 20000 }
  );
  return resp.data;
}

function buildAutoPostPayload(article, nlp, newsArticleId) {
  const categoryMap = {
    real_estate: "Недвижимость",
    finance: "Финансы",
    macro: "Экономика",
    other: "Аналитика",
  };

  const postCategory = categoryMap[nlp.category] || "Аналитика";
  const city = nlp.city && ["Алматы", "Астана", "Шымкент"].includes(nlp.city) ? nlp.city : "Алматы";

  const impactDirection = nlp.impact?.direction ?? "neutral";
  const impactScore = Number.isFinite(nlp.impact?.score) ? nlp.impact.score : 0;
  const impactHorizon = nlp.impact?.horizon ?? "medium";

  const impactLine = `Влияние: ${impactDirection} | Score: ${impactScore}/100 | Горизонт: ${impactHorizon}`;
  const explainLine = nlp.impact?.explanation ? `Почему: ${nlp.impact.explanation}` : "";

  const content =
`${nlp.summary}

${impactLine}
${explainLine}

Источник: ${article.url}`.trim();

  return {
    title: article.title,
    description: (nlp.summary || "").split("\n").slice(0, 2).join(" ").slice(0, 220),
    content,
    date: new Date().toISOString().split("T")[0],
    category: postCategory,
    city,
    author: { id: "system", name: "EstatePulse AI", email: "system@estatepulse" },

    // new fields
    isAuto: true,
    sourceUrl: article.url,
    sourceName: "Kapital.kz",
    tags: nlp.tags || [],
    impactScore,
    impactDirection,
    impactHorizon,
    newsArticleId,
  };
}

async function upsertAutoPost(Post, article, nlp, newsArticleDoc, stats) {
  if (!Post) return null;

  const payload = buildAutoPostPayload(article, nlp, newsArticleDoc._id);

  let upserted = null;

  // If we already have postId, update that exact post (helps avoid duplicates from older runs).
  if (newsArticleDoc.postId) {
    upserted = await Post.findByIdAndUpdate(newsArticleDoc.postId, { $set: payload }, { new: true });
  }

  // Otherwise, upsert by sourceUrl.
  if (!upserted) {
    upserted = await Post.findOneAndUpdate(
      { sourceUrl: article.url },
      { $set: payload },
      { new: true, upsert: true }
    );
  }

  await NewsArticle.updateOne(
    { _id: newsArticleDoc._id },
    { $set: { postId: upserted._id } }
  );

  stats.postsCreated += 1;
  return upserted;
}

function normalizeExistingArticleDoc(doc) {
  return {
    url: doc.url,
    source: doc.source || "kapital",
    sourceDomain: doc.sourceDomain || "kapital.kz",
    title: doc.title || "Kapital Article",
    publishedAt: doc.publishedAt || null,
    rawText: doc.rawText || "",
  };
}

async function processExistingIfNeeded(doc, Post, stats) {
  // If already processed, keep Post in sync (no re-NLP), then skip heavy work.
  if (doc.status === "processed" && doc.nlp) {
    if (Post) {
      const article = normalizeExistingArticleDoc(doc);
      await upsertAutoPost(Post, article, doc.nlp, doc, stats);
    }
    stats.skipped += 1;
    return;
  }

  const article = normalizeExistingArticleDoc(doc);
  if (!article.rawText || article.rawText.length < 200) {
    stats.errors += 1;
    await NewsArticle.updateOne({ _id: doc._id }, { $set: { status: "error" } });
    stats.skipped += 1;
    return;
  }

  try {
    const nlp = await analyzeWithNLP(article);

    await NewsArticle.updateOne(
      { _id: doc._id },
      {
        $set: {
          status: "processed",
          nlp: {
            category: nlp.category,
            city: nlp.city || null,
            tags: nlp.tags || [],
            summary: nlp.summary || "",
            entities: nlp.entities || [],
            numbers: nlp.numbers || [],
            impact: nlp.impact
              ? {
                direction: nlp.impact.direction,
                score: nlp.impact.score,
                horizon: nlp.impact.horizon,
                explanation: nlp.impact.explanation,
                statedImpactPercent: nlp.impact.stated_impact_percent ?? null,
              }
              : null,
          },
        },
      }
    );

    stats.processed += 1;

    if (Post) {
      await upsertAutoPost(Post, article, nlp, doc, stats);
    }

    stats.skipped += 1;
  } catch (e) {
    stats.errors += 1;
    await NewsArticle.updateOne({ _id: doc._id }, { $set: { status: "error" } });
    stats.skipped += 1;
  }
}

/**
 * Runs the Kapital collection + NLP + Post generation job.
 * options:
 *  - perSection: number of links to take from each section
 *  - delayMs: polite delay between article fetches
 *  - maxNew: max number of NEW articles to process per run
 */
async function runCollectKapitalJob(options = {}) {
  const perSection = Number(options.perSection ?? 15);
  const delayMs = Number(options.delayMs ?? 300);
  const maxNew = Number(options.maxNew ?? 20);

  const sections = [
    { url: "https://kapital.kz/economic", key: "economic" },
    { url: "https://kapital.kz/finance", key: "finance" },
    { url: "https://kapital.kz/news", key: "news" },
  ];

  const stats = {
    ok: true,
    source: "kapital",
    found: 0,
    inserted: 0,
    skipped: 0,
    processed: 0,
    postsCreated: 0,
    errors: 0,
  };

  // 1) Collect links
  const allLinks = [];
  for (const s of sections) {
    const links = await collectKapitalLinksFromSection(s.url, s.key, perSection);
    allLinks.push(...links);
  }
  const uniqueLinks = Array.from(new Set(allLinks));
  stats.found = uniqueLinks.length;

  const Post = getPostModel();

  // 2) Process URLs, inserting new ones up to maxNew
  for (const url of uniqueLinks) {
    if (stats.inserted >= maxNew) break;

    const existing = await NewsArticle.findOne({ url }).select(
      "_id url title source sourceDomain publishedAt rawText status nlp postId"
    );

    if (existing) {
      await processExistingIfNeeded(existing, Post, stats);
      await sleep(delayMs);
      continue;
    }

    try {
      const article = await parseKapitalArticle(url);
      if (!article.rawText || article.rawText.length < 200) {
        stats.errors += 1;
        await sleep(delayMs);
        continue;
      }

      const doc = await NewsArticle.create({
        url: article.url,
        source: article.source,
        sourceDomain: article.sourceDomain,
        title: article.title,
        publishedAt: article.publishedAt || null,
        rawText: article.rawText,
        status: "raw",
      });
      stats.inserted += 1;

      // NLP
      const nlp = await analyzeWithNLP(article);

      await NewsArticle.updateOne(
        { _id: doc._id },
        {
          $set: {
            status: "processed",
            nlp: {
              category: nlp.category,
              city: nlp.city || null,
              tags: nlp.tags || [],
              summary: nlp.summary || "",
              entities: nlp.entities || [],
              numbers: nlp.numbers || [],
              impact: nlp.impact
                ? {
                  direction: nlp.impact.direction,
                  score: nlp.impact.score,
                  horizon: nlp.impact.horizon,
                  explanation: nlp.impact.explanation,
                  statedImpactPercent: nlp.impact.stated_impact_percent ?? null,
                }
                : null,
            },
          },
        }
      );
      stats.processed += 1;

      // Post generation
      if (Post) {
        await upsertAutoPost(Post, article, nlp, doc, stats);
      }
    } catch (e) {
      stats.errors += 1;
    }

    await sleep(delayMs);
  }

  return stats;
}

module.exports = { runCollectKapitalJob };
