import React, { useEffect, useMemo, useState } from "react";
import "../components/style.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import EvaluationForecast from "../components/EvaluationForecast";
import { useAuth } from "../context/AuthContext";
import { useUi } from "../context/UiContext";
import { DISTRICTS_BY_CITY } from "../constants/cities";

const CITY_OPTIONS = ["Алматы", "Астана", "Шымкент"];
const ML_CITY_OPTIONS = ["Алматы", "Астана"];

function getDefaultDistrict(cityName) {
  const options = DISTRICTS_BY_CITY[cityName] || [];
  return options[0]?.value || "unknown";
}

async function fetchNewsIndex(cityName, days) {
  const resp = await fetch(`/api/news/index?city=${encodeURIComponent(cityName)}&days=${days}`);
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || data?.message || "Ошибка индекса");
  return data;
}

async function fetchForecastNewsSnapshot(cityName) {
  const [marketIndex7, marketIndex30] = await Promise.all([
    fetchNewsIndex(cityName, 7),
    fetchNewsIndex(cityName, 30),
  ]);

  return {
    city: cityName,
    short_term: marketIndex7,
    medium_term: marketIndex30,
  };
}

export default function Evaluate() {
  const { token } = useAuth();
  const { t } = useUi();
  const [city, setCity] = useState("Алматы");
  const [indexCity, setIndexCity] = useState("Алматы");
  const [form, setForm] = useState({
    district: getDefaultDistrict("Алматы"),
    area: 65,
    rooms: 2,
    floor: 5,
    total_floors: 9,
    ceiling_height: 2.7,
    house_age: 15,
    house_type: "unknown",
    condition: "unknown",
  });

  const [marketIndex7, setMarketIndex7] = useState(null);
  const [marketIndex30, setMarketIndex30] = useState(null);
  const [loadingIndex, setLoadingIndex] = useState(false);
  const [indexError, setIndexError] = useState("");

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const numeric = new Set(["area", "rooms", "floor", "total_floors", "ceiling_height", "house_age"]);

  const cityForIndex = useMemo(() => indexCity || "Алматы", [indexCity]);
  const districtOptions = useMemo(
    () => DISTRICTS_BY_CITY[city] || [],
    [city]
  );

  useEffect(() => {
    if (!districtOptions.length) return;
    const isValid = districtOptions.some((option) => option.value === form.district);
    if (!isValid) {
      setForm((prev) => ({ ...prev, district: districtOptions[0].value }));
    }
  }, [districtOptions, form.district]);

  useEffect(() => {
    setIndexCity(city);
  }, [city]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingIndex(true);
      setIndexError("");
      try {
        const [idx7, idx30] = await Promise.all([
          fetchNewsIndex(cityForIndex, 7),
          fetchNewsIndex(cityForIndex, 30),
        ]);
        if (cancelled) return;
        setMarketIndex7(idx7);
        setMarketIndex30(idx30);
      } catch (e) {
        if (cancelled) return;
        setIndexError(e?.message || "Ошибка индекса");
        setMarketIndex7(null);
        setMarketIndex30(null);
      } finally {
        if (!cancelled) setLoadingIndex(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [cityForIndex]);

  function interpretIndex(value) {
    if (value > 10) return "позитивный";
    if (value < -10) return "негативный";
    return "нейтральный";
  }

  function formatSigned(value) {
    if (typeof value !== "number") return "0";
    const n = Math.round(value * 10) / 10;
    return n > 0 ? `+${n}` : `${n}`;
  }

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
      let newsSnapshot = null;
      try {
        newsSnapshot = await fetchForecastNewsSnapshot(city);
      } catch (newsErr) {
        newsSnapshot = null;
      }

      const resp = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...form,
          city,
          newsSnapshot,
        }),
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
      <SiteHeader actionLabel={t("common.home")} actionTo="/" />
      <main className="container narrow">
        <section className="glass-panel" style={{ marginBottom: 20 }}>
          <p className="eyebrow">{t("evaluate.newsEyebrow")}</p>
          <h2 style={{ marginTop: 8 }}>{t("evaluate.newsTitle")}</h2>

          <div className="form-group" style={{ marginTop: 14 }}>
            <label htmlFor="index-city">{t("evaluate.cityLabel")}</label>
            <select
              id="index-city"
              value={indexCity}
              onChange={(e) => setIndexCity(e.target.value)}
              className="form-control"
            >
              {CITY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {loadingIndex && <p className="form-lead">{t("evaluate.loadingIndex")}</p>}
          {indexError && <p className="form-error">{indexError}</p>}

          {!loadingIndex && !indexError && (marketIndex7 || marketIndex30) && (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {marketIndex7 && (
                <div>
                  <strong>Новостной фон (7 дней):</strong> {formatSigned(marketIndex7.normalizedIndex)}
                  {" "}({interpretIndex(marketIndex7.normalizedIndex)})
                  <div style={{ color: "var(--color-text-muted)" }}>
                    Позитивных: {marketIndex7.positiveCount}, Негативных: {marketIndex7.negativeCount}, Нейтральных: {marketIndex7.neutralCount} · Всего: {marketIndex7.count} · Avg impact: {marketIndex7.avgImpactScore}
                  </div>
                </div>
              )}

              {marketIndex30 && (
                <div>
                  <strong>Новостной фон (30 дней):</strong> {formatSigned(marketIndex30.normalizedIndex)}
                  {" "}({interpretIndex(marketIndex30.normalizedIndex)})
                  <div style={{ color: "var(--color-text-muted)" }}>
                    Позитивных: {marketIndex30.positiveCount}, Негативных: {marketIndex30.negativeCount}, Нейтральных: {marketIndex30.neutralCount} · Всего: {marketIndex30.count} · Avg impact: {marketIndex30.avgImpactScore}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="form-panel glass-panel">
          <p className="eyebrow">{t("evaluate.objectEyebrow")}</p>
          <h1 className="post-title">{t("evaluate.objectTitle")}</h1>
          <p className="form-lead">{t("evaluate.objectLead")}</p>

          <form onSubmit={onSubmit} className="form-stack">
            <div className="form-group">
              <label htmlFor="eval-city">Город</label>
              <select
                id="eval-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="form-control"
              >
                {ML_CITY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="eval-district">Район</label>
              {districtOptions.length ? (
                <select
                  id="eval-district"
                  name="district"
                  value={form.district}
                  onChange={onChange}
                  className="form-control"
                  required
                >
                  {districtOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="eval-district"
                  name="district"
                  type="text"
                  value={form.district}
                  onChange={onChange}
                  className="form-control"
                  placeholder="Например: Алматы р-н"
                  required
                />
              )}
            </div>

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
              {loading ? t("common.loading") : t("nav.evaluate")}
            </button>
          </form>
        </section>

        {result && (
          <section className="glass-panel" style={{ marginTop: 20 }}>
            <div>
              <strong>{t("evaluate.resultPrice")}:</strong> {Math.round(result.predicted_price).toLocaleString()} ₸
            </div>
            <div>
              <strong>{t("evaluate.resultPricePerM2")}:</strong>{" "}
              {Math.round(result.predicted_price / form.area).toLocaleString()} ₸
            </div>

            <EvaluationForecast forecast={result.forecast} />
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
