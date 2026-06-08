import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../components/style.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import LoadingScreen from "../components/LoadingScreen";
import { getPosts } from "../utils/api";
import { useSearch } from "../hooks/useSearch";
import { useUi } from "../context/UiContext";

function formatDate(value) {
  if (!value) return "Дата уточняется";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function News() {
  const { t } = useUi();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { query, handleChange, filterByTitle } = useSearch();
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [days, setDays] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [onlyAI, setOnlyAI] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const trimmed = query.trim();

    const params = {
      ...(trimmed ? { q: trimmed } : null),
      ...(city ? { city } : null),
      ...(category ? { category } : null),
      ...(sourceName ? { sourceName } : null),
      ...(days ? { days: Number(days) } : null),
      ...(onlyAI ? { isAuto: true } : null),
    };

    const t = setTimeout(() => {
      getPosts(params)
        .then((data) => {
          if (!cancelled) setPosts(data || []);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, city, category, days, sourceName, onlyAI]);

  const filtered = useMemo(() => filterByTitle(posts || []), [filterByTitle, posts]);
  const trimmedQuery = query.trim();
  const isSearching = Boolean(trimmedQuery);

  const emptyStateMessage = isSearching
    ? t("news.emptySearch", { query: trimmedQuery })
    : t("news.emptyDefault");

  if (loading) {
    return <LoadingScreen actionLabel={t("common.home")} actionTo="/" container="wide" />;
  }

  if (error) {
    return <main className="container narrow">Ошибка: {error}</main>;
  }

  return (
    <div className="page-shell">
      <SiteHeader actionLabel="" actionTo="" />

      <main className="container wide main-grid">
        <section className="search-panel glass-panel">
          <header>
            <div>
              <p className="eyebrow">{t("news.eyebrow")}</p>
              <h1>{t("news.title")}</h1>
            </div>
            <span className="filter-hint">{t("news.searchHint")}</span>
          </header>

          <label className="search-label" htmlFor="news-search">{t("news.searchLabel")}</label>
          <div className="search-control">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15.5 14h-.79l-.28-.27a6 6 0 1 0-.7.7l.27.28v.79l4.5 4.5 1.49-1.49zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
            </svg>
            <input
              id="news-search"
              type="search"
              value={query}
              onChange={handleChange}
              placeholder={t("news.searchPlaceholder")}
            />
          </div>
        </section>

        <section className="filters-panel glass-panel">
          <header>
            <div>
              <p className="eyebrow">{t("news.filtersEyebrow")}</p>
              <h2>{t("news.filtersTitle")}</h2>
            </div>
            <span className="filter-hint">{t("news.filtersHint")}</span>
          </header>

          <div className="filters-controls">
            <label className="filters-toggle">
              <input type="checkbox" checked={onlyAI} onChange={(e) => setOnlyAI(e.target.checked)} />
              {t("news.onlyAi")}
            </label>

            <select className="form-control filters-select" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">{t("news.allCities")}</option>
              <option value="Алматы">Алматы</option>
              <option value="Астана">Астана</option>
              <option value="Шымкент">Шымкент</option>
            </select>

            <select
              className="form-control filters-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{t("news.allCategories")}</option>
              <option value="Экономика">Экономика</option>
              <option value="Финансы">Финансы</option>
              <option value="Недвижимость">Недвижимость</option>
              <option value="Аналитика">Аналитика</option>
            </select>

            <select className="form-control filters-select" value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="">{t("news.allPeriods")}</option>
              <option value="7">За 7 дней</option>
              <option value="30">За 30 дней</option>
              <option value="90">За 90 дней</option>
            </select>

            <select
              className="form-control filters-select"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
            >
              <option value="">{t("news.allSources")}</option>
              <option value="Kapital.kz">Kapital.kz</option>
            </select>

            <button
              type="button"
              className="btn btn-secondary ghost-btn"
              onClick={() => {
                setCity("");
                setCategory("");
                setDays("");
                setSourceName("");
                setOnlyAI(false);
              }}
            >
              {t("news.reset")}
            </button>
          </div>
        </section>

        <section className="posts-grid">
          {filtered.length === 0 && <p className="empty-state glass-panel">{emptyStateMessage}</p>}

          {filtered.map((post, index) => {
            const postId = post.id ?? post._id ?? index;
            const segment = post.category || t("news.allCategories");
            const impactDirection =
              post.impactDirection === "up" || post.impactDirection === "down" || post.impactDirection === "neutral"
                ? post.impactDirection
                : "neutral";
            const impactArrow = impactDirection === "up" ? "↑" : impactDirection === "down" ? "↓" : "—";
            const impactScore = Number.isFinite(post.impactScore) ? Math.round(post.impactScore) : null;
            const showImpact = Boolean(post.isAuto) && impactScore !== null;
            const impactLabel = impactScore === null ? null : `${impactArrow} ${impactScore}/100`;

            return (
              <article key={postId} className="post-card glass-panel">
                <div className="post-card__eyebrow">
                  <div className="post-card__meta">
                    <span>{segment}</span>
                    {post.city && <span className="post-card__city">{post.city}</span>}
                    {post.isAuto && <span className="post-card__city post-card__ai">AI</span>}
                  </div>
                  {showImpact && <span className={`trend-flag ${impactDirection}`}>{impactLabel}</span>}
                </div>

                <Link to={`/posts/${postId}`} className="post-card__body">
                  <h3>{post.title}</h3>
                  <p>{post.description}</p>

                  {Array.isArray(post.tags) && post.tags.length > 0 && (
                    <div className="post-tags">
                      {post.tags.slice(0, 6).map((t) => (
                        <span key={t} className="post-tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>

                <footer className="post-card__footer">
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                  <span className="post-card__cta">{t("news.readMore")}</span>
                </footer>
              </article>
            );
          })}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
