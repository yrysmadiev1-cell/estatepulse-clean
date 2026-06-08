const router = require("express").Router();
const axios = require("axios");

const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

const GEOJSON_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map();

const CITY_DISTRICT_SOURCES = {
  "Алматы": {
    districtNames: [
      "Алатауский район",
      "Алмалинский район",
      "Ауэзовский район",
      "Бостандыкский район",
      "Жетысуский район",
      "Медеуский район",
      "Наурызбайский район",
      "Турксибский район",
    ],
  },
  "Астана": {
    districtNames: [
      "Алматы район",
      "Байконур район",
      "Байқоңыр район",
      "Есиль район",
      "Есильский район",
      "Нура район",
      "Нұра аудан",
      "Сарайшык район",
      "Сарыарка район",
    ],
  },
};

function buildDistrictQuery(cityName, districtNames) {
  const unique = Array.from(new Set(districtNames)).filter(Boolean);
  const nameFilter = unique.length
    ? `["name"~"${unique.join("|")}"]`
    : "";
  return `
[out:json][timeout:25];
{{geocodeArea:${cityName}}}->.searchArea;
(
  relation["boundary"="administrative"]["admin_level"~"(6|7|8)"]${nameFilter}(area.searchArea);
  relation["boundary"="administrative"]["name"~"район|аудан",i](area.searchArea);
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
      const resp = await axios.post(
        url,
        new URLSearchParams({ data: query }).toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" } }
      );
      if (resp.status >= 200 && resp.status < 300) {
        return resp.data;
      }
      lastError = new Error(`Overpass error: HTTP ${resp.status}`);
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error("Overpass request failed");
}

router.get("/districts", async (req, res) => {
  try {
    const city = typeof req.query.city === "string" ? req.query.city.trim() : "";
    const source = CITY_DISTRICT_SOURCES[city];
    if (!source) {
      return res.status(400).json({ message: "Неизвестный город" });
    }

    const cached = cache.get(city);
    if (cached && Date.now() - cached.ts < GEOJSON_CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    const query = buildDistrictQuery(city, source.districtNames);
    const overpassJson = await fetchOverpassJson(query);

    cache.set(city, { ts: Date.now(), data: overpassJson });
    return res.json(overpassJson);
  } catch (err) {
    return res.status(502).json({ message: "Overpass proxy error" });
  }
});

module.exports = router;
