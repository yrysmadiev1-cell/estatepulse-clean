import React, { useState } from "react";
import "../components/style.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { useAuth } from "../context/AuthContext";

export default function Evaluate() {
  const { token } = useAuth();
  const [form, setForm] = useState({
    area: 65,
    rooms: 2,
    floor: 5,
    total_floors: 9,
    ceiling_height: 2.7,
    house_age: 15,
    house_type: "unknown",
    condition: "unknown",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const numeric = new Set(["area", "rooms", "floor", "total_floors", "ceiling_height", "house_age"]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: numeric.has(name) ? Number(value) : value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const resp = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || "Ошибка API");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <SiteHeader actionLabel="На главную" actionTo="/" />
      <main className="container narrow">
        <section className="form-panel glass-panel">
          <p className="eyebrow">Оценка недвижимости</p>
          <h1 className="post-title">Рассчитайте стоимость</h1>
          <p className="form-lead">Заполните параметры объекта, чтобы получить ориентировочную цену.</p>

          <form onSubmit={onSubmit} className="form-stack">
            <div className="form-group">
              <label htmlFor="eval-area">Площадь (м²)</label>
              <input
                id="eval-area"
                name="area"
                type="number"
                step="0.1"
                value={form.area}
                onChange={onChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="eval-rooms">Комнаты</label>
              <input
                id="eval-rooms"
                name="rooms"
                type="number"
                value={form.rooms}
                onChange={onChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="eval-floor">Этаж</label>
              <input
                id="eval-floor"
                name="floor"
                type="number"
                value={form.floor}
                onChange={onChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="eval-total-floors">Этажность</label>
              <input
                id="eval-total-floors"
                name="total_floors"
                type="number"
                value={form.total_floors}
                onChange={onChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="eval-ceiling">Высота потолков</label>
              <input
                id="eval-ceiling"
                name="ceiling_height"
                type="number"
                step="0.01"
                value={form.ceiling_height}
                onChange={onChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="eval-age">Возраст дома (лет)</label>
              <input
                id="eval-age"
                name="house_age"
                type="number"
                value={form.house_age}
                onChange={onChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="eval-type">Тип дома</label>
              <select
                id="eval-type"
                name="house_type"
                value={form.house_type}
                onChange={onChange}
                className="form-control"
              >
                <option value="unknown">unknown</option>
                <option value="panel">panel</option>
                <option value="brick">brick</option>
                <option value="monolith">monolith</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="eval-condition">Состояние</label>
              <select
                id="eval-condition"
                name="condition"
                value={form.condition}
                onChange={onChange}
                className="form-control"
              >
                <option value="unknown">unknown</option>
                <option value="good">good</option>
                <option value="excellent">excellent</option>
                <option value="needs_repair">needs_repair</option>
              </select>
            </div>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Считаю..." : "Оценить"}
            </button>
          </form>
        </section>

        {result && (
          <section className="glass-panel" style={{ marginTop: 20 }}>
            <div>
              <strong>Цена:</strong> {Math.round(result.predicted_price).toLocaleString()} ₸
            </div>
            <div>
              <strong>Цена за м²:</strong>{" "}
              {Math.round(result.predicted_price / form.area).toLocaleString()} ₸
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
