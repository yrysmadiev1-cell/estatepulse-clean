import React from "react";
import "./style.css";
import { Link } from "react-router-dom";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import MarketDashboard from "./MarketDashboard";

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

function Home({ cityName = null }) {
  const heroTitle = cityName ? `Рынок ${cityName}: дашборд` : "Дашборд рынка недвижимости";
  const heroLead = cityName
    ? `Ключевые индикаторы и динамика новостного индекса для ${cityName}.`
    : "Ключевые индикаторы и динамика новостного индекса по городам.";

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
              <Link to="/news" className="btn btn-primary">Открыть новости</Link>
            </div>
          </div>

          <div className="hero-feature">
            <p className="hero-feature-label">Новости</p>
            <p>
              Все новости и поиск по заголовку перенесены на отдельную страницу.
            </p>
            <Link to="/news" className="hero-link">Перейти к новостям →</Link>
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

        <MarketDashboard />

      </main>
      <SiteFooter />
    </div>
  );
}

export default Home;
