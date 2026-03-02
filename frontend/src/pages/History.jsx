import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../components/style.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { useAuth } from "../context/AuthContext";

export default function History() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const formatPrice = (value) =>
    Number.isFinite(value) ? new Intl.NumberFormat("ru-RU").format(Math.round(value)) : "—";

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
  };

  useEffect(() => {
    if (!token) {
      setErr("Нужно войти в систему, чтобы видеть историю оценок.");
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

  return (
    <div className="page-shell">
      <SiteHeader actionLabel="На главную" actionTo="/" />
      <main className="container wide">
        <section className="glass-panel">
          <p className="eyebrow">Личный кабинет</p>
          <h1 className="post-title">История оценок</h1>

          {loading ? (
            <p className="hero-description">Загрузка...</p>
          ) : err ? (
            <p className="form-error">{err}</p>
          ) : items.length === 0 ? (
            <p className="hero-description">Пока нет сохранённых оценок.</p>
          ) : (
            <div className="table-scroll">
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
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
