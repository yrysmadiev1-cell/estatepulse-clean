const axios = require("axios");
const cheerio = require("cheerio");

const BASE = "https://kapital.kz";

function absUrl(href) {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return "https:" + href;
  if (href.startsWith("/")) return BASE + href;
  return BASE + "/" + href;
}

function normalizeSpaces(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}

function pickPublishedAtFromText(text) {
  // Matches: 28.02.2026 · 14:05
  const m = text.match(/(\d{2}\.\d{2}\.\d{4})\s*·\s*(\d{2}:\d{2})/);
  if (!m) return null;
  const [, d, t] = m;
  const [dd, mm, yyyy] = d.split(".").map(Number);
  const [HH, MM] = t.split(":").map(Number);
  // local time on site; store as UTC-ish Date object without TZ assumptions
  return new Date(Date.UTC(yyyy, mm - 1, dd, HH, MM, 0));
}

async function fetchHtml(url) {
  const resp = await axios.get(url, {
    timeout: 15000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145 Safari/537.36",
      "Accept-Language": "ru,en;q=0.9",
    },
  });
  return resp.data;
}

function extractArticleLinks($, section) {
  const links = new Set();
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href");
    const u = absUrl(href);
    if (!u) return;

    // Keep only Kapital article pages for this section
    // Examples:
    // https://kapital.kz/economic/145447/....html
    const re = new RegExp(`^https?:\\/\\/kapital\\.kz\\/${section}\\/\\d+\\/.*\\.html$`);
    if (re.test(u)) links.add(u);
  });
  return Array.from(links);
}

function extractMainText($) {
  // Try common containers first
  const candidates = [
    "article p",
    ".content p",
    ".text p",
    ".post-content p",
    ".entry-content p",
    "main p",
  ];

  let paragraphs = [];
  for (const sel of candidates) {
    const els = $(sel);
    if (els.length >= 3) {
      paragraphs = els
        .map((_, p) => normalizeSpaces($(p).text()))
        .get()
        .filter((t) => t && t.length > 20);
      if (paragraphs.length >= 3) break;
    }
  }

  // If still empty, fallback: take visible text near top, remove obvious noise
  if (paragraphs.length < 3) {
    let bodyText = normalizeSpaces($("body").text());
    // Cut at "Читайте также" / "Популярные материалы" if present
    bodyText = bodyText.split("Читайте также")[0];
    bodyText = bodyText.split("Популярные материалы")[0];
    // Remove currency noise roughly (optional)
    bodyText = bodyText.replace(/USD\s*\d+[.,]\d+₸/g, "");
    bodyText = bodyText.replace(/EUR\s*\d+[.,]\d+₸/g, "");
    bodyText = bodyText.replace(/RUB\s*\d+[.,]\d+₸/g, "");
    // Take only first N chars to avoid giant walls
    if (bodyText.length > 8000) bodyText = bodyText.slice(0, 8000);
    return bodyText;
  }

  return paragraphs.join("\n\n");
}

async function parseKapitalArticle(url) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const title = normalizeSpaces($("h1").first().text());
  const subtitle = normalizeSpaces($("h2").first().text());

  const pageText = normalizeSpaces($("body").text());
  const publishedAt = pickPublishedAtFromText(pageText);

  const rawText = extractMainText($);

  return {
    url,
    source: "kapital",
    sourceDomain: "kapital.kz",
    title: title || subtitle || "Kapital Article",
    publishedAt,
    rawText,
  };
}

async function collectKapitalLinksFromSection(sectionUrl, sectionKey, limit = 25) {
  const html = await fetchHtml(sectionUrl);
  const $ = cheerio.load(html);

  const links = extractArticleLinks($, sectionKey);
  // keep only first `limit`
  return links.slice(0, limit);
}

module.exports = {
  collectKapitalLinksFromSection,
  parseKapitalArticle,
};
