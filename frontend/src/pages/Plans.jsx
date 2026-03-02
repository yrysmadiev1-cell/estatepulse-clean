import React from "react";
import { Link } from "react-router-dom";
import "../components/style.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

const PLANS = [
  {
    id: "plus",
    title: "Plus",
    price: "3 990 ₸/мес",
    bullets: [
      "До 50 сохранённых оценок в истории",
      "Расширенная детализация отчёта по объекту",
      "Экспорт отчёта в PDF (демо)",
      "Поддержка по email",
    ],
  },
  {
    id: "business",
    title: "Business",
    price: "9 990 ₸/мес",
    bullets: [
      "До 300 сохранённых оценок в истории",
      "Экспорт отчётов + пакетная выгрузка (демо)",
      "Приоритетная обработка запросов",
      "Доступ для команды (до 3 пользователей — демо)",
    ],
  },
  {
    id: "pro",
    title: "Pro",
    price: "19 990 ₸/мес",
    bullets: [
      "Безлимитная история оценок (демо)",
      "API-доступ для интеграций (демо)",
      "Расширенная аналитика по районам (демо)",
      "Приоритетная поддержка",
    ],
  },
];

export default function Plans() {
  return (
    <div className="page-shell">
      <SiteHeader actionLabel={null} actionTo={null} />
      <main className="container wide">
        <section className="glass-panel">
          <p className="eyebrow">Подписка</p>
          <h1 className="post-title">Планы</h1>
          <p className="hero-description" style={{ marginTop: 0 }}>
            Сейчас у всех пользователей активна подписка <strong>Base</strong>. Здесь можно посмотреть варианты
            планов.
          </p>

          <div className="plans-grid">
            <div className="plans-card">
              <div className="plans-card__head">
                <div>
                  <h2 className="section-title" style={{ marginBottom: 6 }}>
                    Base
                  </h2>
                  <p className="profile-label" style={{ margin: 0 }}>
                    Бесплатно
                  </p>
                </div>
                <span className="badge">Текущий</span>
              </div>
              <ul className="plans-list">
                <li>Сохранение оценок в истории (ограниченно)</li>
                <li>Доступ к карте и трендам (демо)</li>
                <li>Базовый отчёт по объекту</li>
              </ul>
            </div>

            {PLANS.map((p) => (
              <div key={p.id} className="plans-card">
                <div className="plans-card__head">
                  <div>
                    <h2 className="section-title" style={{ marginBottom: 6 }}>
                      {p.title}
                    </h2>
                    <p className="profile-label" style={{ margin: 0 }}>
                      {p.price}
                    </p>
                  </div>
                  <span className="badge badge-city">План</span>
                </div>
                <ul className="plans-list">
                  {p.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <div className="plans-actions">
                  <button type="button" className="btn btn-secondary" disabled>
                    Подключить (скоро)
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="plans-actions" style={{ marginTop: 18 }}>
            <Link to="/profile" className="btn btn-primary">
              Вернуться в профиль
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
