import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../components/style.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { useAuth } from "../context/AuthContext";
import { useUi } from "../context/UiContext";

const formatPrice = (value) =>
  Number.isFinite(value) ? new Intl.NumberFormat("ru-RU").format(Math.round(value)) : "—";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
};

export default function Profile() {
  const { user, token } = useAuth();
  const { t } = useUi();
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
      <SiteHeader actionLabel={null} actionTo={null} />
      <main className="container wide">
        <section className="glass-panel">
          <p className="eyebrow">{t("profile.eyebrow")}</p>
          <h1 className="post-title">{t("profile.title")}</h1>

          {!token ? (
            <div className="profile-empty">
              <p className="hero-description">
                {t("profile.authDescription")}
              </p>
              <div className="history-actions">
                <Link to="/login" className="btn btn-primary">
                  {t("profile.login")}
                </Link>
                <Link to="/register" className="btn btn-secondary">
                  {t("profile.register")}
                </Link>
              </div>
            </div>
          ) : (
            <div className="profile-grid">
              <div>
                <h2 className="section-title">{t("profile.accountData")}</h2>
                <div className="profile-card">
                  <div>
                    <p className="profile-label">{t("profile.name")}</p>
                    <p className="profile-value">{user?.name || "—"}</p>
                  </div>
                  <div>
                    <p className="profile-label">{t("profile.email")}</p>
                    <p className="profile-value">{user?.email || "—"}</p>
                  </div>

                  <div>
                    <p className="profile-label">{t("profile.subscription")}</p>
                    <p className="profile-value">{t("profile.plan")}</p>
                    <div className="history-actions" style={{ marginTop: 10 }}>
                      <Link to="/plans" className="btn btn-secondary">
                        {t("profile.plans")}
                      </Link>
                    </div>
                  </div>

                  <div className="article-pills">
                    <span className="badge">{t("profile.authorized")}</span>
                    {user?.role === "admin" && <span className="badge badge-city">{t("profile.adminBadge")}</span>}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="section-title">{t("profile.historyTitle")}</h2>
                {loading ? (
                  <div className="profile-card">{t("profile.loading")}</div>
                ) : err ? (
                  <div className="profile-card form-error">{err}</div>
                ) : !hasHistory ? (
                  <div className="profile-card">{t("profile.noHistory")}</div>
                ) : (
                  <div className="profile-card">
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
                                  {t("profile.openEvaluation")}
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
