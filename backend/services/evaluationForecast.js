const axios = require("axios");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
}

function formatSignedPercent(value) {
  const normalized = round(value * 100, 1);
  return normalized > 0 ? `+${normalized}` : `${normalized}`;
}

function normalizeIndexBlock(block = {}) {
  return {
    normalizedIndex: round(
      toNumber(
        block.normalizedIndex ?? block.normalized_index ?? block.index ?? block.value ?? 0,
        0
      ),
      1
    ),
    count: Math.max(0, Math.round(toNumber(block.count, 0))),
    positiveCount: Math.max(0, Math.round(toNumber(block.positiveCount ?? block.positive_count, 0))),
    negativeCount: Math.max(0, Math.round(toNumber(block.negativeCount ?? block.negative_count, 0))),
    neutralCount: Math.max(0, Math.round(toNumber(block.neutralCount ?? block.neutral_count, 0))),
    avgImpactScore: round(toNumber(block.avgImpactScore ?? block.avg_impact_score, 0), 1),
  };
}

function normalizeNewsSnapshot(snapshot = {}) {
  const source = snapshot || {
    short_term: {},
    medium_term: {},
  };

  return {
    city: typeof source.city === "string" ? source.city.trim() : "",
    short_term: normalizeIndexBlock(
      source.short_term || source.shortTerm || source.week || source["7d"] || {}
    ),
    medium_term: normalizeIndexBlock(
      source.medium_term || source.mediumTerm || source.month || source["30d"] || {}
    ),
  };
}

function interpretSignal(indexValue) {
  if (indexValue > 10) return "позитивный";
  if (indexValue < -10) return "негативный";
  return "нейтральный";
}

function getCityBaseGrowth(city) {
  const growthByCity = {
    Алматы: 0.068,
    Астана: 0.062,
    Шымкент: 0.055,
  };

  return growthByCity[city] ?? 0.058;
}

function getConditionAdjustment(condition) {
  const map = {
    excellent: 0.011,
    good: 0.004,
    unknown: 0,
    needs_repair: -0.015,
  };

  return map[condition] ?? 0;
}

function getHouseTypeAdjustment(houseType) {
  const map = {
    monolith: 0.007,
    brick: 0.004,
    panel: -0.005,
    unknown: 0,
  };

  return map[houseType] ?? 0;
}

function getAgeAdjustment(houseAge) {
  const age = toNumber(houseAge, 0);

  if (age <= 5) return 0.009;
  if (age <= 15) return 0.003;
  if (age <= 25) return -0.004;
  return -0.01;
}

function getFloorAdjustment(floor, totalFloors) {
  const currentFloor = toNumber(floor, 0);
  const floors = Math.max(0, toNumber(totalFloors, 0));

  if (!currentFloor || !floors) return 0;

  const ratio = currentFloor / floors;

  if (ratio <= 0.1) return -0.004;
  if (ratio >= 0.9) return -0.003;
  if (ratio >= 0.35 && ratio <= 0.65) return 0.003;
  return 0;
}

function getCeilingAdjustment(ceilingHeight) {
  const parsedHeight = toNumber(ceilingHeight, 0);
  if (!parsedHeight) return 0;

  return clamp((parsedHeight - 2.7) * 0.01, -0.004, 0.006);
}

function getNewsMetrics(newsSnapshot) {
  const shortIndex = newsSnapshot.short_term.normalizedIndex;
  const mediumIndex = newsSnapshot.medium_term.normalizedIndex;
  const combinedIndex = round(shortIndex * 0.7 + mediumIndex * 0.3, 1);
  const adjustment = clamp((combinedIndex / 100) * 0.18, -0.03, 0.03);

  return {
    shortIndex,
    mediumIndex,
    combinedIndex,
    adjustment,
    direction: interpretSignal(combinedIndex),
    label:
      combinedIndex > 2
        ? "умеренно позитивный"
        : combinedIndex < -2
          ? "умеренно негативный"
          : "нейтральный",
  };
}

function getConfidence(newsSnapshot, combinedIndex) {
  const totalCount = newsSnapshot.short_term.count + newsSnapshot.medium_term.count;
  const volumeFactor = clamp(totalCount / 50, 0, 1);
  const signalFactor = clamp(Math.abs(combinedIndex) / 30, 0, 1);
  const shortSign = Math.sign(newsSnapshot.short_term.normalizedIndex);
  const mediumSign = Math.sign(newsSnapshot.medium_term.normalizedIndex);
  const consistencyBonus =
    shortSign === 0 || mediumSign === 0 || shortSign === mediumSign ? 0.05 : -0.04;

  return clamp(0.52 + volumeFactor * 0.14 + signalFactor * 0.1 + consistencyBonus, 0.4, 0.88);
}

function buildYearlyForecast(basePrice, area, annualGrowthRate) {
  const conservativeGrowth = clamp(annualGrowthRate - 0.025, -0.08, 0.22);
  const optimisticGrowth = clamp(annualGrowthRate + 0.025, -0.08, 0.22);
  const safeArea = Math.max(1, toNumber(area, 1));

  return [1, 2, 3].map((year) => {
    const baseFactor = (1 + annualGrowthRate) ** year;
    const conservativeFactor = (1 + conservativeGrowth) ** year;
    const optimisticFactor = (1 + optimisticGrowth) ** year;

    return {
      year,
      growth_percent: round((baseFactor - 1) * 100, 1),
      conservative_growth_percent: round((conservativeFactor - 1) * 100, 1),
      optimistic_growth_percent: round((optimisticFactor - 1) * 100, 1),
      base_price: round(basePrice * baseFactor),
      conservative_price: round(basePrice * conservativeFactor),
      optimistic_price: round(basePrice * optimisticFactor),
      base_price_per_m2: round((basePrice * baseFactor) / safeArea),
      conservative_price_per_m2: round((basePrice * conservativeFactor) / safeArea),
      optimistic_price_per_m2: round((basePrice * optimisticFactor) / safeArea),
    };
  });
}

function buildFallbackNarrative({
  city,
  district,
  condition,
  houseType,
  houseAge,
  newsMetrics,
  confidence,
  annualGrowthRate,
}) {
  const drivers = [
    `Городовая база для ${city}: ${formatSignedPercent(getCityBaseGrowth(city))} в год`,
    `Объект в районе ${district || "не указан"} учитывается через параметры модели`,
    `Состояние: ${condition || "unknown"}; тип дома: ${houseType || "unknown"}`,
  ];

  if (Number.isFinite(toNumber(houseAge, NaN))) {
    drivers.push(`Возраст дома: ${round(toNumber(houseAge, 0), 0)} лет`);
  }

  if (newsMetrics.shortIndex || newsMetrics.mediumIndex) {
    drivers.push(
      `Новостной фон: 7 дней ${newsMetrics.shortIndex}, 30 дней ${newsMetrics.mediumIndex} (${newsMetrics.label})`
    );
  }

  const risks = [];
  if (newsMetrics.direction === "негативный") {
    risks.push("Негативный новостной фон может сдерживать рост цены.");
  }
  if (condition === "needs_repair") {
    risks.push("Состояние требует ремонта, поэтому сценарий может быть слабее рынка.");
  }
  if (toNumber(houseAge, 0) > 25) {
    risks.push("Старый фонд обычно растет медленнее ликвидных новостроек.");
  }

  if (risks.length === 0) {
    risks.push("На итог влияют локальный спрос, новостной фон и качество объекта.");
  }

  return {
    summary: `Прогноз на 1-3 года: ${annualGrowthRate >= 0 ? "рост" : "снижение"} цены с ожидаемым темпом ${round(
      annualGrowthRate * 100,
      1
    )}% в год.`,
    drivers,
    risks,
    outlook:
      confidence >= 0.72
        ? "высокая уверенность в базовом сценарии"
        : confidence >= 0.58
          ? "умеренная уверенность в базовом сценарии"
          : "сценарий нужно трактовать осторожно",
    source: "rules",
  };
}

function extractJsonContent(content) {
  const trimmed = String(content || "").trim();
  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function normalizeNarrative(parsed, fallback) {
  if (!parsed || typeof parsed !== "object") return fallback;

  const summary = typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : fallback.summary;
  const drivers = Array.isArray(parsed.drivers) && parsed.drivers.length
    ? parsed.drivers.map((item) => String(item).trim()).filter(Boolean)
    : fallback.drivers;
  const risks = Array.isArray(parsed.risks) && parsed.risks.length
    ? parsed.risks.map((item) => String(item).trim()).filter(Boolean)
    : fallback.risks;

  return {
    summary,
    drivers: drivers.length ? drivers : fallback.drivers,
    risks: risks.length ? risks : fallback.risks,
    outlook: typeof parsed.outlook === "string" && parsed.outlook.trim() ? parsed.outlook.trim() : fallback.outlook,
    source: "groq",
  };
}

async function generateNarrative(input, forecast, newsMetrics, confidence) {
  const fallback = buildFallbackNarrative({
    city: input.city,
    district: input.district,
    condition: input.condition,
    houseType: input.house_type,
    houseAge: input.house_age,
    newsMetrics,
    confidence,
    annualGrowthRate: forecast.annual_growth_rate_fraction,
  });

  if (process.env.NODE_ENV === "test" || !process.env.GROQ_API_KEY) {
    return fallback;
  }

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 360,
        messages: [
          {
            role: "system",
            content:
              "Ты аналитик рынка недвижимости Казахстана. Отвечай только JSON без Markdown. Поля: summary (string), drivers (string[]), risks (string[]), outlook (string). Не выдумывай факты вне входных данных.",
          },
          {
            role: "user",
            content: JSON.stringify({
              city: input.city,
              district: input.district,
              property: {
                area: input.area,
                rooms: input.rooms,
                floor: input.floor,
                total_floors: input.total_floors,
                ceiling_height: input.ceiling_height,
                house_age: input.house_age,
                house_type: input.house_type,
                condition: input.condition,
              },
              price: {
                current_price: forecast.base_price,
                annual_growth_rate_percent: round(forecast.annual_growth_rate_fraction * 100, 1),
                yearly: forecast.yearly,
              },
              news: {
                city: newsMetrics.city,
                short_term: newsMetrics.short_term,
                medium_term: newsMetrics.medium_term,
                combined_index: newsMetrics.combinedIndex,
                direction: newsMetrics.direction,
                label: newsMetrics.label,
              },
              confidence: round(confidence, 2),
            }),
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(extractJsonContent(content));
    return normalizeNarrative(parsed, fallback);
  } catch (error) {
    return fallback;
  }
}

async function buildEvaluationForecast(input) {
  const newsSnapshot = normalizeNewsSnapshot(input.newsSnapshot || input.news_snapshot || {});
  const city = typeof input.city === "string" ? input.city.trim() : "";
  const district = typeof input.district === "string" ? input.district.trim() : "";

  const cityBaseGrowth = getCityBaseGrowth(city);
  const conditionAdjustment = getConditionAdjustment(input.condition);
  const houseTypeAdjustment = getHouseTypeAdjustment(input.house_type);
  const ageAdjustment = getAgeAdjustment(input.house_age);
  const floorAdjustment = getFloorAdjustment(input.floor, input.total_floors);
  const ceilingAdjustment = getCeilingAdjustment(input.ceiling_height);
  const newsMetrics = getNewsMetrics(newsSnapshot);
  const annualGrowthRateFraction = clamp(
    cityBaseGrowth + conditionAdjustment + houseTypeAdjustment + ageAdjustment + floorAdjustment + ceilingAdjustment + newsMetrics.adjustment,
    -0.06,
    0.16
  );

  const yearly = buildYearlyForecast(input.predicted_price, input.area, annualGrowthRateFraction);
  const confidence = getConfidence(newsSnapshot, newsMetrics.combinedIndex);
  const narrative = await generateNarrative(
    {
      city,
      district,
      area: input.area,
      rooms: input.rooms,
      floor: input.floor,
      total_floors: input.total_floors,
      ceiling_height: input.ceiling_height,
      house_age: input.house_age,
      house_type: input.house_type,
      condition: input.condition,
    },
    {
      base_price: round(input.predicted_price),
      annual_growth_rate_fraction: annualGrowthRateFraction,
      yearly,
    },
    {
      city: newsSnapshot.city || city,
      short_term: newsSnapshot.short_term,
      medium_term: newsSnapshot.medium_term,
      combinedIndex: newsMetrics.combinedIndex,
      direction: newsMetrics.direction,
      label: newsMetrics.label,
    },
    confidence
  );

  return {
    model: narrative.source === "groq" ? GROQ_MODEL : "rules-based",
    generated_at: new Date().toISOString(),
    confidence: round(confidence, 2),
    confidence_label:
      confidence >= 0.72 ? "высокая" : confidence >= 0.58 ? "средняя" : "низкая",
    city_baseline_growth_percent: round(cityBaseGrowth * 100, 1),
    annual_growth_rate_percent: round(annualGrowthRateFraction * 100, 1),
    annual_growth_rate_fraction: annualGrowthRateFraction,
    adjustment_breakdown: {
      condition_percent: round(conditionAdjustment * 100, 1),
      house_type_percent: round(houseTypeAdjustment * 100, 1),
      age_percent: round(ageAdjustment * 100, 1),
      floor_percent: round(floorAdjustment * 100, 1),
      ceiling_percent: round(ceilingAdjustment * 100, 1),
      news_percent: round(newsMetrics.adjustment * 100, 1),
    },
    news_snapshot: newsSnapshot,
    news_signal: {
      city: newsSnapshot.city || city,
      short_term_index: newsMetrics.shortIndex,
      medium_term_index: newsMetrics.mediumIndex,
      combined_index: newsMetrics.combinedIndex,
      direction: newsMetrics.direction,
      label: newsMetrics.label,
      adjustment_percent: round(newsMetrics.adjustment * 100, 1),
    },
    yearly,
    summary: narrative.summary,
    drivers: narrative.drivers,
    risks: narrative.risks,
    outlook: narrative.outlook,
    source: narrative.source,
  };
}

module.exports = {
  buildEvaluationForecast,
  normalizeNewsSnapshot,
};