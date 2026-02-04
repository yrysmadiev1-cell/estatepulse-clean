import React, { useEffect, useState } from "react";
import "./style.css";
import { getPosts } from "../utils/api";
import { Link } from "react-router-dom";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { CATEGORIES } from "../constants/categories";
import { useAuth } from "../context/AuthContext";
import { useSearch } from "../hooks/useSearch";

const TAGS = ["Все сегменты", ...CATEGORIES];

const MARKET_METRICS = [
  {
    label: "Средняя цена м² по РК",
    value: "640 000 тг",
    change: "+1.8%",
    caption: "за последний месяц",
    trend: "up",
  },
  {
    label: "Астана • бизнес-класс",
    value: "980 000 тг",
    change: "+3.2%",
    caption: "рост спроса на центр",
    trend: "up",
  },
  {
    label: "Ставка по ипотеке 7-20-25",
    value: "11.75%",
    change: "-0.15 п.п.",
    caption: "программа субсидирования",
    trend: "down",
  },
  {
    label: "Ввод новостроек",
    value: "+420 тыс. м²",
    change: "+5% г/г",
    caption: "ноябрь 2025",
    trend: "up",
  },
];

const TICKER_HEADLINES = [
  "Программа 7-20-25 поддерживает спрос на жильё в Астане",
  "Алматы утверждает новые ПДП с акцентом на смешанные кварталы",
  "Нацбанк сохранил базовую ставку: девелоперы пересматривают прайс-листы",
  "Шымкент расширяет индустриальные парки рядом с новыми магистралями",
];

const TREND = [
  { label: "+3.2%", direction: "up" },
  { label: "-1.1%", direction: "down" },
  { label: "+0.8%", direction: "up" },
  { label: "+5.4%", direction: "up" },
];

function Home({ cityName = null }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTag, setActiveTag] = useState(TAGS[0]);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { query, handleChange, filterByTitle } = useSearch();
  const trimmedQuery = query.trim();
  const isSearching = Boolean(trimmedQuery);
  const heroTitle = cityName ? `Рынок ${cityName}: ключевые сюжеты` : "Новости, которые влияют на цену квадратного метра";
  const heroLead = cityName
    ? `Фокусируемся на проектах и сделках ${cityName}. Только локальные инсайты, которые помогают корректировать планы продаж.`
    : "Аналитика о новостройках, ипотеке и инвестиционных сделках. Собираем ключевые события, чтобы девелоперы, инвесторы и покупатели видели картину рынка без шума.";
  const heroFallbackText = isSearching
    ? `По запросу "${trimmedQuery}" пока нет материалов.`
    : cityName
      ? `Как только появится первый материал про ${cityName}, он сразу попадёт в фокус.`
      : "Как только появится первый материал, он сразу попадёт в фокус.";

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    getPosts(cityName ? { city: cityName } : undefined)
      .then((data) => {
        if (mounted) {
          setPosts(data || []);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [cityName]);

  const formatDate = (value) => {
    if (!value) return "Дата уточняется";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const filteredByCategory = activeTag === TAGS[0]
    ? posts
    : (posts || []).filter((post) => post.category === activeTag);

  const filteredPosts = filterByTitle(filteredByCategory);
  const heroPost = filteredPosts[0];
  const heroId = heroPost ? heroPost.id ?? heroPost._id : null;
  const stories = isSearching ? filteredPosts : heroPost ? filteredPosts.slice(1) : filteredPosts;
  const emptyStateMessage = isSearching
    ? `По запросу "${trimmedQuery}" ничего не найдено. Попробуйте другое слово или очистите поиск.`
    : cityName
      ? (posts.length === 0
        ? `В ${cityName} пока нет публикаций. Добавьте первый материал.`
        : `В этой категории пока нет материалов для ${cityName}. Попробуйте другой фильтр.`)
      : (posts.length === 0
        ? "Материалы ещё загружаются, возвращайтесь чуть позже."
        : "В выбранной категории пока нет материалов. Попробуйте другую категорию или уточните поиск.");

  if (loading) return <main className="container narrow">Загрузка...</main>;
  if (error) return <main className="container narrow">Ошибка: {error}</main>;

  return (
    <div className="page-shell">
      <SiteHeader actionLabel="Опубликовать прогноз" actionTo="/posts/new" />

      <main className="container wide main-grid">
        <section className="hero-panel glass-panel">
          <div className="hero-copy">
            <p className="eyebrow">
              Обновление {cityName ? `// ${cityName}` : "// Казахстан"} · {formatDate(new Date().toISOString())}
            </p>
            <h1>{heroTitle}</h1>
            <p className="hero-description">{heroLead}</p>

            {cityName && <span className="hero-city-chip">Городской обзор: {cityName}</span>}

            <div className="hero-metrics">
              <div>
                <span>Алматы</span>
                <strong>+3.6%</strong>
                <small>м/м к октябрю</small>
              </div>
              <div>
                <span>Астана • средний чек</span>
                <strong>78 млн тг</strong>
                <small>готовые проекты</small>
              </div>
              <div>
                <span>Ипотека 7-20-25</span>
                <strong>11.75%</strong>
                <small>средневзвешенная</small>
              </div>
            </div>

            <div className="hero-actions">
              <button type="button" className="btn btn-secondary ghost-btn">Подписаться на дайджест</button>
              {isAdmin && (
                <Link to="/posts/new" className="btn btn-primary">Опубликовать прогноз</Link>
              )}
            </div>
          </div>

          <div className="hero-feature">
            <p className="hero-feature-label">Фокус выпуска</p>
            {heroPost ? (
              <>
                <span className="hero-feature-date">{formatDate(heroPost.date)}</span>
                <h3>{heroPost.title}</h3>
                <p>{heroPost.description}</p>
                {heroId && (
                  <Link to={`/posts/${heroId}`} className="hero-link">
                    Читать разбор →
                  </Link>
                )}
              </>
            ) : (
              <p>{heroFallbackText}</p>
            )}
          </div>
        </section>

        <section className="market-snapshot">
          {MARKET_METRICS.map((metric) => (
            <article key={metric.label} className="pulse-card glass-panel">
              <p className="pulse-label">{metric.label}</p>
              <p className="pulse-value">{metric.value}</p>
              <span className={`pulse-change ${metric.trend}`}>{metric.change}</span>
              <small>{metric.caption}</small>
            </article>
          ))}
        </section>

        <section className="insights-ticker glass-panel">
          <span className="ticker-label">Лента дня</span>
          <div className="ticker-track">
            {TICKER_HEADLINES.map((headline) => (
              <p key={headline}>{headline}</p>
            ))}
          </div>
        </section>

        <section className="search-panel glass-panel">
          <header>
            <div>
              <p className="eyebrow">Поиск по заголовку</p>
              <h2>Найдите нужный материал</h2>
            </div>
            <span className="filter-hint">Введите ключевые слова из заголовка статьи</span>
          </header>
          <label className="search-label" htmlFor="post-search">Поиск</label>
          <div className="search-control">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15.5 14h-.79l-.28-.27a6 6 0 1 0-.7.7l.27.28v.79l4.5 4.5 1.49-1.49zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
            </svg>
            <input
              id="post-search"
              type="search"
              value={query}
              onChange={handleChange}
              placeholder="Например, рост цен на бизнес-класс"
            />
          </div>
        </section>

        <section className="filters-panel glass-panel">
          <header>
            <div>
              <p className="eyebrow">Фильтры выпуска</p>
              <h2>{cityName ? `Сегменты ${cityName}` : "Сегменты рынка"}</h2>
            </div>
            <span className="filter-hint">Выберите направление, чтобы сфокусироваться на нужных новостях</span>
          </header>
          <div className="tag-list">
            {TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`tag-chip ${activeTag === tag ? "active" : ""}`}
                onClick={() => setActiveTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </section>

        <section className="posts-grid">
          {stories.length === 0 && (
            <p className="empty-state glass-panel">
              {emptyStateMessage}
            </p>
          )}

          {stories.map((post, index) => {
            const postId = post.id ?? post._id ?? index;
            const segment = post.category || "Аналитика";
            const trend = TREND[index % TREND.length];
            return (
              <article key={postId} className="post-card glass-panel">
                <div className="post-card__eyebrow">
                  <span>{segment}</span>
                  {post.city && <span className="post-card__city">{post.city}</span>}
                  <span className={`trend-flag ${trend.direction}`}>{trend.label}</span>
                </div>
                <Link to={`/posts/${postId}`} className="post-card__body">
                  <h3>{post.title}</h3>
                  <p>{post.description}</p>
                </Link>
                <footer className="post-card__footer">
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                  <span className="post-card__cta">Читать →</span>
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

export default Home;
