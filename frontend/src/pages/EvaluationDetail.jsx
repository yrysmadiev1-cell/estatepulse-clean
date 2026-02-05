import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "../components/style.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { useAuth } from "../context/AuthContext";

const formatPrice = (value) =>
  Number.isFinite(value) ? new Intl.NumberFormat("ru-RU").format(Math.round(value)) : "—";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
};

export default function EvaluationDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!token) {
      setErr("Нужно войти в систему, чтобы видеть оценку.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const resp = await fetch(`/api/evaluations/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.message || "Ошибка загрузки оценки");
        setItem(data);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  return (
    <div className="page-shell">
      <SiteHeader actionLabel="Вернуться в профиль" actionTo="/profile" />
      <main className="container narrow">
        <section className="glass-panel">
          <div className="article-meta">
            <div>
              <p className="eyebrow">Оценка недвижимости</p>
              <h1 className="post-title">Детали оценки</h1>
            </div>
            <div className="article-pills">
              <span className="badge">{item?.input?.house_type || "unknown"}</span>
              <span className="badge badge-city">{item?.input?.condition || "unknown"}</span>
            </div>
          </div>

          {loading ? (
            <p className="hero-description">Загрузка...</p>
          ) : err ? (
            <p className="form-error">{err}</p>
          ) : !item ? (
            <p className="hero-description">Оценка не найдена.</p>
          ) : (
            <>
              <p className="hero-description">Дата: {formatDate(item.createdAt)}</p>
              <div className="article-stats">
                <div>
                  <p className="form-lead">Цена</p>
                  <strong>{formatPrice(item.predicted_price)} ₸</strong>
                </div>
                <div>
                  <p className="form-lead">Цена за м²</p>
                  <strong>{formatPrice(item.price_per_m2)} ₸</strong>
                </div>
              </div>

              <div className="profile-card" style={{ marginTop: 20 }}>
                <h2 className="section-title">Параметры объекта</h2>
                <div className="detail-grid">
                  <div>
                    <span className="profile-label">Площадь</span>
                    <span className="profile-value">{item.input?.area} м²</span>
                  </div>
                  <div>
                    <span className="profile-label">Комнат</span>
                    <span className="profile-value">{item.input?.rooms}</span>
                  </div>
                  <div>
                    <span className="profile-label">Этаж</span>
                    <span className="profile-value">{item.input?.floor}</span>
                  </div>
                  <div>
                    <span className="profile-label">Этажность</span>
                    <span className="profile-value">{item.input?.total_floors}</span>
                  </div>
                  <div>
                    <span className="profile-label">Высота потолков</span>
                    <span className="profile-value">{item.input?.ceiling_height}</span>
                  </div>
                  <div>
                    <span className="profile-label">Возраст дома</span>
                    <span className="profile-value">{item.input?.house_age} лет</span>
                  </div>
                </div>
                <div className="history-actions" style={{ marginTop: 16 }}>
                  <Link to="/profile" className="btn btn-secondary">
                    Назад
                  </Link>
                  <Link to="/evaluate" className="btn btn-primary">
                    Оценить ещё
                  </Link>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
