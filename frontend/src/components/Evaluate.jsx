import React, { useMemo, useState } from "react";
import "./style.css";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { CITIES } from "../constants/cities";

const MAP_LABELS = {
  Алматы: {
    title: "Карта Алматы",
    subtitle: "Сейчас отображается демо-слой (без расчёта) для Алматы.",
  },
  Астана: {
    title: "Карта Астаны",
    subtitle: "Сейчас отображается демо-слой (без расчёта) для Астаны.",
  },
};

function Evaluate() {
  const [city, setCity] = useState("Алматы");

  const view = useMemo(() => MAP_LABELS[city] || MAP_LABELS["Алматы"], [city]);

  return (
    <div className="page-shell">
      <SiteHeader actionLabel="На главную" actionTo="/" />

      <main className="container wide">
        <section className="glass-panel eval-header">
          <div>
            <p className="eyebrow">Оценка недвижимости</p>
            <h1>Демо-карта города</h1>
            <p className="hero-description">
              Пока доступна только визуализация: выберите город, чтобы увидеть соответствующую карту.
            </p>
          </div>
          <div className="eval-controls">
            <label htmlFor="eval-city" className="form-label">Город</label>
            <select
              id="eval-city"
              className="form-control"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {CITIES.filter((item) => ["Алматы", "Астана"].includes(item.name)).map((item) => (
                <option key={item.slug} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="glass-panel eval-map">
          <div className="eval-map__header">
            <h2>{view.title}</h2>
            <p className="text-muted">{view.subtitle}</p>
          </div>
          <div className="map-placeholder" role="img" aria-label={view.title}>
            <svg viewBox="0 0 640 360" aria-hidden="true">
              <defs>
                <linearGradient id="mapGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#c7d2fe" />
                  <stop offset="100%" stopColor="#93c5fd" />
                </linearGradient>
              </defs>
              <rect x="16" y="16" width="608" height="328" rx="20" fill="url(#mapGradient)" />
              <path
                d="M120 250 C 160 180, 240 140, 320 160 C 380 175, 450 130, 520 150"
                stroke="#1e3a8a"
                strokeWidth="4"
                fill="none"
                opacity="0.6"
              />
              <circle cx="200" cy="200" r="10" fill="#2563eb" />
              <circle cx="420" cy="190" r="8" fill="#1d4ed8" />
              <circle cx="520" cy="230" r="6" fill="#1e40af" />
              <text x="320" y="190" textAnchor="middle" fill="#1e293b" fontSize="20" fontWeight="600">
                {city}
              </text>
              <text x="320" y="230" textAnchor="middle" fill="#334155" fontSize="14">
                Демонстрационная карта
              </text>
            </svg>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export default Evaluate;
