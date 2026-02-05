import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

export default function Profile() {
  const { user, token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const resp = await fetch("/api/evaluations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.message || "Ошибка загрузки истории");
        setItems(Array.isArray(data) ? data : data.value || []);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const hasHistory = useMemo(() => items.length > 0, [items.length]);

  return (
    <div className="page-shell">
      <SiteHeader actionLabel="Оценить объект" actionTo="/evaluate" />
      <main className="container wide">
        <section className="glass-panel">
          <p className="eyebrow">Личный кабинет</p>
          <h1 className="post-title">Профиль</h1>

          {!token ? (
            <div className="profile-empty">
              <p className="hero-description">
                Войдите в аккаунт, чтобы сохранять оценки и видеть историю.
              </p>
              <div className="history-actions">
                <Link to="/login" className="btn btn-primary">
                  Войти
                </Link>
                <Link to="/register" className="btn btn-secondary">
                  Регистрация
                </Link>
              </div>
            </div>
          ) : (
            <div className="profile-grid">
              <div>
                <h2 className="section-title">Данные аккаунта</h2>
                <div className="profile-card">
                  <div>
                    <p className="profile-label">Имя</p>
                    <p className="profile-value">{user?.name || "—"}</p>
                  </div>
                  <div>
                    <p className="profile-label">Email</p>
                    <p className="profile-value">{user?.email || "—"}</p>
                  </div>
                  <div className="article-pills">
                    <span className="badge">Авторизован</span>
                    {user?.role === "admin" && <span className="badge badge-city">Админ</span>}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="section-title">История оценок</h2>
                {loading ? (
                  <div className="profile-card">Загрузка...</div>
                ) : err ? (
                  <div className="profile-card form-error">{err}</div>
                ) : !hasHistory ? (
                  <div className="profile-card">Пока нет сохранённых оценок.</div>
                ) : (
                  <div className="profile-card">
                    <div style={{ overflowX: "auto" }}>
                      <table className="history-table">
                        <thead>
                          <tr>
                            <th>Дата</th>
                            <th>Параметры</th>
                            <th>Цена</th>
                            <th>Цена за м²</th>
                            <th>Действие</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((x) => (
                            <tr key={x._id || `${x.createdAt}-${x.predicted_price}`}>
                              <td>{formatDate(x.createdAt)}</td>
                              <td>
                                <div className="history-meta">
                                  <span>
                                    {x.input?.area} м², {x.input?.rooms} комн, этаж {x.input?.floor}/
                                    {x.input?.total_floors}
                                  </span>
                                  <div className="article-pills">
                                    <span className="badge">{x.input?.house_type || "unknown"}</span>
                                    <span className="badge badge-city">{x.input?.condition || "unknown"}</span>
                                  </div>
                                </div>
                              </td>
                              <td>{formatPrice(x.predicted_price)} ₸</td>
                              <td>{formatPrice(x.price_per_m2)} ₸</td>
                              <td>
                                <Link to={`/history/${x._id}`} className="btn btn-secondary">
                                  Открыть оценку
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
