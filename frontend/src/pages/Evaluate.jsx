import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../components/style.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { useAuth } from "../context/AuthContext";
import { getModelMetadata, evaluateProperty } from "../utils/api";

const labels = { area: "Площадь (м²)", rooms: "Комнаты", floor: "Этаж", total_floors: "Этажность", ceiling_height: "Высота потолков (м)", year_built: "Год постройки", district: "Район Астаны", house_type: "Тип дома", condition: "Состояние" };
const initialForm = { city: "Астана", area: 65, rooms: 2, floor: 5, total_floors: 9, ceiling_height: 2.7, year_built: 2015, district: "unknown", house_type: "unknown", condition: "unknown" };
const price = value => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);

export default function Evaluate() {
  const { token } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [metadata, setMetadata] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setError("");
    getModelMetadata().then(data => { if (active) setMetadata(data); }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [retry]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setResult(null);
  }

  async function onSubmit(e) {
    e.preventDefault();
    const input = { ...form };
    for (const key of Object.keys(metadata.bounds)) input[key] = Number(input[key]);
    if (input.floor > input.total_floors) { setError("Этаж не может превышать этажность дома"); return; }
    setLoading(true); setError(""); setResult(null);
    try { setResult(await evaluateProperty(input, token)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="page-shell">
      <SiteHeader actionLabel="На главную" actionTo="/" />
      <main className="container narrow">
        <section className="form-panel glass-panel">
          <p className="eyebrow">EstatePulse · Астана</p>
          <h1 className="post-title">Оценка квартиры</h1>
          <p className="form-lead">Ориентировочная цена объявления по данным января 2026 года. Модель предназначена для построенных домов в Астане.</p>
          {!metadata && !error && <p role="status">Загружаем параметры модели…</p>}
          {error && <p role="alert" className="form-error">{error}</p>}
          {!metadata && error && <button className="btn btn-secondary" onClick={() => setRetry(x => x + 1)}>Повторить</button>}
          {metadata && <form onSubmit={onSubmit} className="form-stack">
            <fieldset disabled={loading} className="evaluation-fields">
              {Object.entries(metadata.bounds).map(([name, [min, max]]) => <div className="form-group" key={name}>
                <label htmlFor={`eval-${name}`}>{labels[name]}</label>
                <input id={`eval-${name}`} name={name} type="number" required min={min} max={max} step={name === "area" ? "0.1" : name === "ceiling_height" ? "0.01" : "1"} value={form[name]} onChange={onChange} className="form-control" />
              </div>)}
              {Object.entries(metadata.categories).map(([name, options]) => <div className="form-group" key={name}>
                <label htmlFor={`eval-${name}`}>{labels[name]}</label>
                <select id={`eval-${name}`} name={name} value={form[name]} onChange={onChange} className="form-control">
                  {options.map(value => <option key={value} value={value}>{value === "unknown" ? "Не указано" : value}</option>)}
                </select>
              </div>)}
              <button type="submit" className="btn btn-primary">{loading ? "Считаем…" : "Оценить квартиру"}</button>
            </fieldset>
          </form>}
        </section>
        {result && <section className="glass-panel evaluation-result" aria-live="polite">
          <p className="eyebrow">Ориентировочная стоимость</p>
          <h2>{price(result.predicted_price)} ₸</h2>
          <p>{price(result.price_per_m2)} ₸ за м²</p>
          <p>Это оценка цены предложения, а не подтверждённой сделки. Она не учитывает изменения рынка после января 2026 года.</p>
          {result.saved ? <Link to={`/history/${result.evaluation_id}`}>Открыть сохранённую оценку</Link> : <p><Link to="/login">Войдите</Link> и повторите расчёт, чтобы сохранить его в истории.</p>}
        </section>}
      </main>
      <SiteFooter />
    </div>
  );
}
