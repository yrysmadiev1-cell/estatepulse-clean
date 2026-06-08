import React from "react";

const formatPrice = (value) =>
  Number.isFinite(Number(value)) ? new Intl.NumberFormat("ru-RU").format(Math.round(Number(value))) : "—";

const formatPercent = (value) => {
  if (!Number.isFinite(Number(value))) return "—";
  const normalized = Math.round(Number(value) * 10) / 10;
  return normalized > 0 ? `+${normalized}%` : `${normalized}%`;
};

const formatSignedIndex = (value) => {
  if (!Number.isFinite(Number(value))) return "—";
  const normalized = Math.round(Number(value) * 10) / 10;
  return normalized > 0 ? `+${normalized}` : `${normalized}`;
};

export default function EvaluationForecast({ forecast }) {
  if (!forecast) return null;

  const yearly = Array.isArray(forecast.yearly)
    ? [...forecast.yearly].sort((a, b) => Number(a.year) - Number(b.year))
    : [];
  const newsSnapshot = forecast.news_snapshot || {};
  const newsSignal = forecast.news_signal || {};
  const drivers = Array.isArray(forecast.drivers) ? forecast.drivers : [];
  const risks = Array.isArray(forecast.risks) ? forecast.risks : [];
  const confidence = Number.isFinite(Number(forecast.confidence))
    ? Math.round(Number(forecast.confidence) * 100)
    : null;

  return (
    <section className="forecast-panel">
      <div className="forecast-header">
        <div>
          <p className="eyebrow">Прогноз</p>
          <h2 className="section-title">Горизонт 1-3 года</h2>
          <p className="form-lead">
            {forecast.summary || "Прогноз рассчитан на основе цены объекта и новостного фона."}
          </p>
        </div>
        <div className="article-pills">
          <span className="badge">Модель: {forecast.model || "rules-based"}</span>
          <span className="badge badge-city">
            Уверенность: {confidence == null ? "—" : `${confidence}%`}
          </span>
          {forecast.confidence_label && <span className="badge">{forecast.confidence_label}</span>}
        </div>
      </div>

      <div className="forecast-news">
        <span className="badge">Город: {newsSnapshot.city || newsSignal.city || "—"}</span>
        <span className="badge">
          7 дней: {formatSignedIndex(newsSnapshot.short_term?.normalizedIndex ?? newsSignal.short_term_index)}
        </span>
        <span className="badge">
          30 дней: {formatSignedIndex(newsSnapshot.medium_term?.normalizedIndex ?? newsSignal.medium_term_index)}
        </span>
        <span className="badge badge-city">Сигнал: {newsSignal.label || "—"}</span>
      </div>

      <div className="forecast-grid">
        {yearly.map((item) => (
          <article key={item.year} className="forecast-card">
            <p className="forecast-card__eyebrow">Год {item.year}</p>
            <strong className="forecast-card__price">{formatPrice(item.base_price)} ₸</strong>
            <p className="forecast-card__range">
              Диапазон: {formatPrice(item.conservative_price)} - {formatPrice(item.optimistic_price)} ₸
            </p>
            <p className="forecast-card__meta">
              Рост базового сценария: {formatPercent(item.growth_percent)}
            </p>
            <p className="forecast-card__meta">Цена за м²: {formatPrice(item.base_price_per_m2)} ₸</p>
          </article>
        ))}
      </div>

      {(drivers.length > 0 || risks.length > 0) && (
        <div className="forecast-notes-grid">
          {drivers.length > 0 && (
            <div className="forecast-list-card">
              <h3 className="section-title">Драйверы</h3>
              <ul>
                {drivers.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {risks.length > 0 && (
            <div className="forecast-list-card">
              <h3 className="section-title">Риски</h3>
              <ul>
                {risks.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {forecast.outlook && <p className="forecast-outlook">{forecast.outlook}</p>}
    </section>
  );
}