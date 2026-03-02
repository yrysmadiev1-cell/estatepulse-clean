import React, { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const CITIES = ["Алматы", "Астана", "Шымкент"];

export default function MarketDashboard() {
  const [city, setCity] = useState("Алматы");
  const [days, setDays] = useState(30);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/news/trend?city=${encodeURIComponent(city)}&days=${days}`);
        const data = await res.json();
        if (!cancelled) setSeries(data.series || []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setSeries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [city, days]);

  const chartData = useMemo(() => {
    const labels = series.map((x) => x.date);
    const values = series.map((x) => x.normalizedIndex);

    return {
      labels,
      datasets: [
        {
          label: `News Index (${city})`,
          data: values,
          tension: 0.25,
          borderWidth: 2,
          pointRadius: 2,
        },
      ],
    };
  }, [series, city]);

  const options = useMemo(
    () => ({
      responsive: true,
      plugins: { legend: { display: true } },
      scales: {
        y: {
          title: { display: true, text: "Normalized Index (-100..100)" },
        },
        x: {
          title: { display: true, text: "Date" },
        },
      },
    }),
    []
  );

  return (
    <section className="glass-panel" style={{ padding: 24 }}>
      <header style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p className="eyebrow">Дашборд</p>
          <h2 style={{ margin: "8px 0 0" }}>Тренд News Index</h2>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <select className="form-control filters-select" value={city} onChange={(e) => setCity(e.target.value)}>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select className="form-control filters-select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>7 дней</option>
            <option value={30}>30 дней</option>
            <option value={60}>60 дней</option>
          </select>

          {loading && <span className="filter-hint">Загрузка…</span>}
        </div>
      </header>

      <div style={{ marginTop: 16 }}>
        {series.length === 0 ? (
          <div className="filter-hint">Недостаточно данных для графика.</div>
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>
    </section>
  );
}
