import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import osmtogeojson from "osmtogeojson";

import "../components/style.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

function parseHexToRgb(hex) {
  const value = (hex || "").trim();
  const normalized = value.startsWith("#") ? value.slice(1) : value;
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    return { r, g, b };
  }
  if (normalized.length === 6) {
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

function rgbaFromCssVar(cssVarValue, alpha) {
  const rgb = parseHexToRgb(cssVarValue);
  if (!rgb) return undefined;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function getThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  const accent = styles.getPropertyValue("--color-accent");
  const danger = styles.getPropertyValue("--color-danger");
  const muted = styles.getPropertyValue("--color-text-muted");

  return {
    up: {
      stroke: accent.trim() || "#2563eb",
      fill: rgbaFromCssVar(accent, 0.18) || "rgba(37, 99, 235, 0.18)",
    },
    down: {
      stroke: danger.trim() || "#dc2626",
      fill: rgbaFromCssVar(danger, 0.14) || "rgba(220, 38, 38, 0.14)",
    },
    stable: {
      stroke: muted.trim() || "#64748b",
      fill: rgbaFromCssVar(muted, 0.12) || "rgba(100, 116, 139, 0.12)",
    },
  };
}

const EARTH_RADIUS_M = 6378137;

function degreesToRadians(deg) {
  return (deg * Math.PI) / 180;
}

function ringArea(coords) {
  let area = 0;
  const len = coords.length;
  if (len < 3) return 0;
  for (let i = 0; i < len; i += 1) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[(i + 1) % len];
    area += (degreesToRadians(lon2) - degreesToRadians(lon1)) *
      (2 + Math.sin(degreesToRadians(lat1)) + Math.sin(degreesToRadians(lat2)));
  }
  return (area * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2;
}

function polygonArea(rings) {
  if (!Array.isArray(rings) || rings.length === 0) return 0;
  let area = Math.abs(ringArea(rings[0]));
  for (let i = 1; i < rings.length; i += 1) {
    area -= Math.abs(ringArea(rings[i]));
  }
  return Math.max(0, area);
}

function geoJsonArea(geometry) {
  if (!geometry) return 0;
  if (geometry.type === "Polygon") {
    return polygonArea(geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.reduce((sum, rings) => sum + polygonArea(rings), 0);
  }
  return 0;
}

function featureAreaSqm(feature) {
  return geoJsonArea(feature?.geometry);
}

function sqmToHa(areaSqm) {
  return areaSqm / 10000;
}

const CITY_CONFIG = {
  "Астана": {
    center: [51.1282, 71.4304],
    zoom: 11,
    districts: [
      {
        id: "esil",
        name: "Есиль",
        areaHa: 39358,
        trend: "up",
        avgPricePerM2: 720000,
        polygon: [
          [51.145, 71.30],
          [51.145, 71.58],
          [51.03, 71.58],
          [51.03, 71.30],
        ],
      },
      {
        id: "saryarka",
        name: "Сарыарка",
        areaHa: 6775,
        trend: "stable",
        avgPricePerM2: 610000,
        polygon: [
          [51.17, 71.22],
          [51.17, 71.36],
          [51.055, 71.36],
          [51.055, 71.22],
        ],
      },
      {
        id: "baykonyr",
        name: "Байқоңыр",
        areaHa: 18129,
        trend: "down",
        avgPricePerM2: 590000,
        polygon: [
          [51.23, 71.20],
          [51.23, 71.46],
          [51.145, 71.46],
          [51.145, 71.20],
        ],
      },
      {
        id: "almaty",
        name: "Алматы",
        areaHa: 15471,
        trend: "up",
        avgPricePerM2: 660000,
        polygon: [
          [51.23, 71.46],
          [51.23, 71.62],
          [51.06, 71.62],
          [51.06, 71.40],
          [51.145, 71.40],
          [51.145, 71.46],
        ],
      },
    ],
  },
  "Алматы": {
    center: [43.2389, 76.8897],
    zoom: 11,
    districts: [],
  },
  "Шымкент": {
    center: [42.3155, 69.5869],
    zoom: 11,
    districts: [
      {
        id: "center",
        name: "Центр",
        trend: "stable",
        avgPricePerM2: 520000,
        polygon: [
          [42.34, 69.57],
          [42.34, 69.63],
          [42.30, 69.63],
          [42.30, 69.57],
        ],
      },
      {
        id: "north",
        name: "Северный сектор",
        trend: "up",
        avgPricePerM2: 540000,
        polygon: [
          [42.37, 69.55],
          [42.37, 69.65],
          [42.34, 69.65],
          [42.34, 69.55],
        ],
      },
      {
        id: "south",
        name: "Южный сектор",
        trend: "down",
        avgPricePerM2: 480000,
        polygon: [
          [42.30, 69.55],
          [42.30, 69.65],
          [42.27, 69.65],
          [42.27, 69.55],
        ],
      },
    ],
  },
};

const ALMATY_INDEX_BY_DISTRICT = {
  "Наурызбайский": 1309,
  "Алатауский": 3557,
  "Алмалинский": 7604,
  "Ауэзовский": 5565,
  "Жетысуский": 3252,
  "Бостандыкский": 5245,
  "Медеуский": 3957,
  "Турксибский": 2958,
};

const ALMATY_DISTRICT_NAMES = [
  "Алатауский район",
  "Алмалинский район",
  "Ауэзовский район",
  "Бостандыкский район",
  "Жетысуский район",
  "Медеуский район",
  "Наурызбайский район",
  "Турксибский район",
];

const ASTANA_DISTRICT_NAMES = [
  "Алматы район",
  "Байконур район",
  "Байқоңыр район",
  "Есиль район",
  "Есильский район",
  "Нура район",
  "Нұра аудан",
  "Сарайшык район",
  "Сарыарка район",
];

function normalizeDistrictName(name) {
  const raw = (name || "").trim();
  if (!raw) return null;
  const stripped = raw
    .replace(/^р-?н\s+/iu, "")
    .replace(/\s+р-?н$/iu, "")
    .replace(/\s+район\s*$/iu, "")
    .replace(/\s+аудан(ы)?\s*$/iu, "")
    .trim();
  return stripped || raw;
}

function trendFromIndex(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return "stable";
  if (v <= 2745) return "down";
  if (v <= 4181) return "stable";
  return "up";
}

function demoPriceFromIndex(index) {
  const v = Number(index);
  if (!Number.isFinite(v)) return 700000;
  const minI = 1309;
  const maxI = 7604;
  const t = Math.max(0, Math.min(1, (v - minI) / (maxI - minI)));
  return 450000 + t * 650000;
}

const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

const GEOJSON_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const CITY_DISTRICT_SOURCES = {
  Алматы: {
    bbox: {
      south: 43.05,
      west: 76.65,
      north: 43.40,
      east: 77.15,
    },
    districtNames: ALMATY_DISTRICT_NAMES,
    indexByDistrict: ALMATY_INDEX_BY_DISTRICT,
    cacheKey: "estatepulse:almatyDistrictsGeoJson:v3",
  },
  Астана: {
    bbox: {
      south: 51.00,
      west: 71.20,
      north: 51.30,
      east: 71.70,
    },
    districtNames: ASTANA_DISTRICT_NAMES,
    indexByDistrict: null,
    cacheKey: "estatepulse:astanaDistrictsGeoJson:v2",
  },
};

function loadGeoJsonFromCache(cacheKey) {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || !parsed?.geojson) return null;
    if (Date.now() - parsed.ts > GEOJSON_CACHE_TTL_MS) return null;
    if (parsed.geojson.type !== "FeatureCollection") return null;
    if (!Array.isArray(parsed.geojson.features) || parsed.geojson.features.length === 0) return null;
    return parsed.geojson;
  } catch {
    return null;
  }
}

function saveGeoJsonToCache(cacheKey, geojson) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), geojson }));
  } catch {
    // ignore
  }
}

function buildDistrictQuery(districtNames, bbox) {
  const unique = Array.from(new Set(districtNames)).filter(Boolean);
  const lines = unique.map(
    (name) => `  relation["boundary"="administrative"]["name"="${name}"](${bbox});`
  );
  return `
[out:json][timeout:25];
(
${lines.join("\n")}
);
out body;
>;
out skel qt;
`.trim();
}

async function fetchOverpassJson(query) {
  let lastError = null;
  for (const url of OVERPASS_URLS) {
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: new URLSearchParams({ data: query }).toString(),
      });

      if (!resp.ok) {
        lastError = new Error(`Overpass error: HTTP ${resp.status}`);
        continue;
      }

      return await resp.json();
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error("Overpass request failed");
}

async function fetchOverpassJsonViaBackend(cityName) {
  const resp = await fetch(`/api/map/districts?city=${encodeURIComponent(cityName)}`, {
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) {
    throw new Error(`Backend map proxy error: HTTP ${resp.status}`);
  }
  return resp.json();
}

function buildDistrictFeatureCollection(geojson, source) {
  const allowed = source?.districtNames
    ? new Set(source.districtNames.map((name) => normalizeDistrictName(name)).filter(Boolean))
    : null;
  const byName = new Map();
  (geojson?.features || [])
    .filter((f) => f?.geometry)
    .forEach((f) => {
      const name = f.properties?.name;
      const normalized = normalizeDistrictName(name);
      if (allowed && normalized && !allowed.has(normalized)) return;
      const index = source.indexByDistrict && normalized
        ? source.indexByDistrict[normalized]
        : undefined;
      const trend = trendFromIndex(index);
      const avgPricePerM2 = demoPriceFromIndex(index);
      const areaSqm = featureAreaSqm(f);
      const areaHa = Number.isFinite(areaSqm)
        ? Math.round(sqmToHa(areaSqm) * 100) / 100
        : undefined;

      const feature = {
        ...f,
        properties: {
          ...f.properties,
          districtName: normalized || name || "Район",
          index,
          trend,
          avgPricePerM2,
          areaHa,
        },
      };

      const key = feature.properties?.districtName;
      if (!key) return;
      const prev = byName.get(key);
      if (!prev || (feature.properties?.areaHa || 0) > (prev.properties?.areaHa || 0)) {
        byName.set(key, feature);
      }
    });

  const features = Array.from(byName.values());
  if (!features.length) {
    throw new Error("No district geometries returned");
  }

  return { type: "FeatureCollection", features };
}

async function fetchCityDistrictsGeoJson(cityName) {
  const source = CITY_DISTRICT_SOURCES[cityName];
  if (!source) throw new Error(`No district source for ${cityName}`);

  const cached = loadGeoJsonFromCache(source.cacheKey);
  if (cached) return cached;

  const bbox = `${source.bbox.south},${source.bbox.west},${source.bbox.north},${source.bbox.east}`;
  const query = buildDistrictQuery(source.districtNames, bbox);

  let overpassJson;
  try {
    overpassJson = await fetchOverpassJson(query);
  } catch (err) {
    overpassJson = await fetchOverpassJsonViaBackend(cityName);
  }

  const geojson = osmtogeojson(overpassJson);
  const fc = buildDistrictFeatureCollection(geojson, source);
  saveGeoJsonToCache(source.cacheKey, fc);
  return fc;
}

function getCityFromSearch(search) {
  const params = new URLSearchParams(search || "");
  const raw = params.get("city") ?? params.get("");
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  const match = Object.keys(CITY_CONFIG).find((name) => name.toLowerCase() === normalized);
  return match || null;
}

const RK_OVERVIEW_VIEW = {
  center: [47.8, 67.6],
  zoom: 5,
};

const HEATMAP_CITIES = ["Алматы", "Астана", "Шымкент"];

function directionFromNormalizedIndex(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return "stable";
  if (v > 10) return "up";
  if (v < -10) return "down";
  return "stable";
}

function clamp(min, value, max) {
  return Math.max(min, Math.min(max, value));
}

function cityRadiusFromIndex(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return 10;
  return clamp(10, 10 + Math.abs(v) * 1.2, 38);
}

function formatSigned(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return "—";
  const rounded = Math.round(v * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}`;
}

function formatMoney(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("ru-RU").format(Math.round(v));
}

function trendLabel(trend) {
  if (trend === "up") return { text: "Цены растут", arrow: "↑" };
  if (trend === "down") return { text: "Цены падают", arrow: "↓" };
  return { text: "Цены стабильны", arrow: "→" };
}

export default function MapPage() {
  const location = useLocation();
  const cityParam = useMemo(() => getCityFromSearch(location.search), [location.search]);
  const isOverview = !cityParam;
  const city = cityParam || "Астана";
  const [days, setDays] = useState(7);
  const [heatRows, setHeatRows] = useState([]);
  const [heatError, setHeatError] = useState(null);
  const mapRootRef = useRef(null);
  const mapRef = useRef(null);
  const districtLayerRef = useRef(null);
  const heatLayerRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setHeatError(null);
        const resp = await fetch(`/api/news/heatmap?days=${encodeURIComponent(days)}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }

        const data = await resp.json();
        const rows = Array.isArray(data?.rows) ? data.rows : [];
        setHeatRows(rows);
      } catch (e) {
        if (e?.name === "AbortError") return;
        setHeatRows([]);
        setHeatError("Не удалось загрузить индекс по городам");
      }
    })();

    return () => controller.abort();
  }, [days]);

  useEffect(() => {
    if (!mapRootRef.current) return;

    const config = CITY_CONFIG[city] || CITY_CONFIG["Астана"];

    if (!mapRef.current) {
      mapRef.current = L.map(mapRootRef.current, {
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(mapRef.current);

      districtLayerRef.current = L.layerGroup().addTo(mapRef.current);
      heatLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    const map = mapRef.current;
    if (isOverview) {
      map.setView(RK_OVERVIEW_VIEW.center, RK_OVERVIEW_VIEW.zoom);
    } else {
      map.setView(config.center, config.zoom);
    }

    if (districtLayerRef.current) {
      districtLayerRef.current.clearLayers();
    }

    const theme = getThemeColors();

    const bindTooltipAndHover = (layer, props) => {
      const trend = props?.trend || "stable";
      const label = trendLabel(trend);
      const areaLine = Number.isFinite(Number(props?.areaHa))
        ? `<div style="margin-top:6px;color: rgba(15, 23, 42, 0.72);">Площадь: <strong>${formatMoney(props.areaHa)} га</strong></div>`
        : "";
      const indexLine = Number.isFinite(Number(props?.index))
        ? `<div style="margin-top:6px;color: rgba(15, 23, 42, 0.72);">Индекс: <strong>${formatMoney(props.index)}</strong></div>`
        : "";

      const html = `
        <div style="min-width: 220px">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;">
            <strong>${props?.districtName || props?.name || "Район"}</strong>
            <span style="font-weight:700;">${label.arrow}</span>
          </div>
          <div style="margin-top:6px;color: rgba(15, 23, 42, 0.72);">${label.text}</div>
          ${areaLine}
          ${indexLine}
          <div style="margin-top:10px;">
            <span style="color: rgba(15, 23, 42, 0.72);">Средняя цена:</span>
            <strong> ${formatMoney(props?.avgPricePerM2)} ₸/м²</strong>
          </div>
        </div>
      `;

      layer.bindTooltip(html, {
        sticky: true,
        direction: "top",
        opacity: 1,
      });

      layer.on("mouseover", (e) => {
        e.target.setStyle?.({ weight: 3 });
      });
      layer.on("mouseout", (e) => {
        e.target.setStyle?.({ weight: 2 });
      });
    };

    const renderPolygons = (districts) => {
      districts.forEach((d) => {
        const palette = theme[d.trend] || theme.stable;
        const polygon = L.polygon(d.polygon, {
          color: palette.stroke,
          weight: 2,
          fillColor: palette.fill,
          fillOpacity: 1,
        });

        bindTooltipAndHover(polygon, {
          ...d,
          districtName: d.name,
        });
        polygon.addTo(districtLayerRef.current);
      });
    };

    const renderGeoJson = (featureCollection) => {
      const layer = L.geoJSON(featureCollection, {
        style: (feature) => {
          const trend = feature?.properties?.trend || "stable";
          const palette = theme[trend] || theme.stable;
          return {
            color: palette.stroke,
            weight: 2,
            fillColor: palette.fill,
            fillOpacity: 1,
          };
        },
        onEachFeature: (feature, featureLayer) => {
          bindTooltipAndHover(featureLayer, feature?.properties || {});
        },
      });
      layer.addTo(districtLayerRef.current);
    };

    (async () => {
      if (isOverview) return;
      if (city === "Алматы" || city === "Астана") {
        try {
          const geo = await fetchCityDistrictsGeoJson(city);
          renderGeoJson(geo);
        } catch (e) {
          const fallbackDistricts = city === "Алматы"
            ? [
                {
                  id: "almaty-demo-1",
                  name: "Алмалинский",
                  index: ALMATY_INDEX_BY_DISTRICT["Алмалинский"],
                  trend: trendFromIndex(ALMATY_INDEX_BY_DISTRICT["Алмалинский"]),
                  avgPricePerM2: demoPriceFromIndex(ALMATY_INDEX_BY_DISTRICT["Алмалинский"]),
                  polygon: [
                    [43.27, 76.90],
                    [43.27, 76.96],
                    [43.23, 76.96],
                    [43.23, 76.90],
                  ],
                },
              ]
            : config.districts;

          if (fallbackDistricts?.length) {
            renderPolygons(fallbackDistricts);
          }
          console.warn("Не удалось загрузить границы районов из OSM/Overpass:", e);
        }
        return;
      }

      renderPolygons(config.districts);
    })();

    return () => {};
  }, [city, isOverview]);

  useEffect(() => {
    if (!mapRef.current || !heatLayerRef.current) return;

    heatLayerRef.current.clearLayers();

    const theme = getThemeColors();
    const rowsByCity = new Map(
      (Array.isArray(heatRows) ? heatRows : []).map((row) => [row?.city, row])
    );

    const citiesToDraw = isOverview ? HEATMAP_CITIES : [city];

    citiesToDraw.forEach((name) => {
      const center = CITY_CONFIG[name]?.center;
      if (!center) return;

      const row = rowsByCity.get(name) || {
        city: name,
        normalizedIndex: 0,
        count: 0,
        positiveCount: 0,
        negativeCount: 0,
      };

      const dir = directionFromNormalizedIndex(row?.normalizedIndex);
      const palette = theme[dir] || theme.stable;
      const radius = cityRadiusFromIndex(row?.normalizedIndex);

      const marker = L.circleMarker(center, {
        radius,
        color: palette.stroke,
        weight: 2,
        fillColor: palette.fill,
        fillOpacity: 1,
      });

      const html = `
        <div style="min-width: 220px">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;">
            <strong>${row?.city || name}</strong>
            <span style="font-weight:700;">${dir === "up" ? "↑" : dir === "down" ? "↓" : "→"}</span>
          </div>
          <div style="margin-top:6px;color: rgba(15, 23, 42, 0.72);">
            Индекс (${days} дн.): <strong>${formatSigned(row?.normalizedIndex)}</strong>
          </div>
          <div style="margin-top:6px;color: rgba(15, 23, 42, 0.72);">
            Публикаций: <strong>${formatMoney(row?.count)}</strong>
          </div>
          <div style="margin-top:6px;color: rgba(15, 23, 42, 0.72);">
            Позитивных: <strong>${formatMoney(row?.positiveCount)}</strong> · Негативных: <strong>${formatMoney(
        row?.negativeCount
      )}</strong>
          </div>
        </div>
      `;

      marker.bindTooltip(html, {
        sticky: true,
        direction: "top",
        opacity: 1,
      });

      marker.addTo(heatLayerRef.current);
    });
  }, [city, days, heatRows, isOverview]);

  return (
    <div className="page-shell">
      <SiteHeader actionLabel={null} actionTo={null} />
      <main className="container wide">
        <section className="glass-panel">
          <p className="eyebrow">Карта недвижимости</p>
          <h1 className="post-title" style={{ marginBottom: 10 }}>
            {isOverview ? "РК: индекс новостей по городам" : `${city}: обзор районов`}
          </h1>
          <p className="hero-description" style={{ marginTop: 0 }}>
            {isOverview
              ? "Круги показывают влияние новостей на рынок (индекс по городам). Наведите курсор на круг, чтобы увидеть детали."
              : "Демо-данные (пока «с воздуха»): наведите курсор на район, чтобы увидеть тренд и среднюю цену."}
          </p>

          <div className="filters-controls" style={{ marginTop: 18 }}>
            <label className="filter-hint" htmlFor="heat-days">
              Период индекса:
            </label>
            <select
              id="heat-days"
              className="filters-select"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>7 дней</option>
              <option value={30}>30 дней</option>
            </select>
            {heatError ? <span className="filter-hint">{heatError}</span> : null}
          </div>

          <div className="map-shell">
            <div ref={mapRootRef} className="map-root" />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
