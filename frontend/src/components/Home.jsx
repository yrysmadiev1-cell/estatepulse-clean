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

const PROJECT_FACTS = [
  { label: "География оценки", value: "Астана", caption: "Квартиры в построенных домах" },
  { label: "Данные модели", value: "Январь 2026", caption: "Снимок цен объявлений" },
  { label: "Параметры квартиры", value: "9 признаков", caption: "Включая район и год постройки" },
  { label: "История", value: "Личный кабинет", caption: "Сохранение расчётов после входа" },
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
  const heroTitle = cityName ? `Рынок ${cityName}: ключевые сюжеты` : "Оцените квартиру. Изучите рынок.";
  const heroLead = cityName
    ? `Публикации о недвижимости: ${cityName}. Материалы добавляет администратор проекта.`
    : "Дипломный проект: оценка стоимости квартир в Астане с помощью машинного обучения и лента материалов о недвижимости Казахстана.";
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
      .catch((err) => { if (mounted) setError(err.message); })
      .finally(() => { if (mounted) setLoading(false); });
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
        ? "Публикаций пока нет. Вы можете перейти к оценке квартиры."
        : "В выбранной категории пока нет материалов. Попробуйте другую категорию или уточните поиск.");



  return (
    <div className="page-shell">
      <SiteHeader actionLabel="Опубликовать материал" actionTo="/posts/new" />

      <main className="container wide main-grid">
        <section className="hero-panel glass-panel">
          <div className="hero-copy">
            <p className="eyebrow">
              Дипломный проект {cityName ? `· ${cityName}` : "· EstatePulse"}
            </p>
            <h1>{heroTitle}</h1>
            <p className="hero-description">{heroLead}</p>

            {cityName && <span className="hero-city-chip">Городской обзор: {cityName}</span>}

            <div className="hero-actions">
              <Link to="/evaluate" className="btn btn-primary">Оценить квартиру</Link>
              {isAdmin && (
                <Link to="/posts/new" className="btn btn-primary">Опубликовать материал</Link>
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
          {PROJECT_FACTS.map((metric) => (
            <article key={metric.label} className="pulse-card glass-panel">
              <p className="pulse-label">{metric.label}</p>
              <p className="pulse-value">{metric.value}</p>
              <small>{metric.caption}</small>
            </article>
          ))}
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
          {loading && <p role="status">Загружаем публикации…</p>}
          {error && <p role="alert" className="form-error">Не удалось загрузить публикации: {error}</p>}
          {!loading && !error && stories.length === 0 && (
            <p className="empty-state glass-panel">
              {emptyStateMessage}
            </p>
          )}

          {stories.map((post, index) => {
            const postId = post.id ?? post._id ?? index;
            const segment = post.category || "Аналитика";
            return (
              <article key={postId} className="post-card glass-panel">
                <div className="post-card__eyebrow">
                  <span>{segment}</span>
                  {post.city && <span className="post-card__city">{post.city}</span>}
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
