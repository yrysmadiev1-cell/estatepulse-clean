from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import re
from typing import List, Optional
import joblib
import pandas as pd

app = FastAPI()

pipeline = joblib.load("../model/price_pipeline.joblib")

class PredictRequest(BaseModel):
    area: float
    rooms: int
    floor: int
    total_floors: int
    ceiling_height: float
    house_age: int
    house_type: str
    condition: str

@app.post("/predict")
def predict(req: PredictRequest):
    df = pd.DataFrame([req.dict()])
    price = float(pipeline.predict(df)[0])
    return {"predicted_price": price}


# ===== NLP (MVP, heuristic) =====

class NLPRequest(BaseModel):
    title: str
    text: str
    url: Optional[str] = None
    source: Optional[str] = None
    published_at: Optional[str] = None


class NumberFact(BaseModel):
    kind: str                 # percent/money/rate/other
    value: float
    unit: str
    raw: str


class Impact(BaseModel):
    direction: str            # up/down/neutral
    score: int                # 0..100
    horizon: str              # short/medium/long
    explanation: str
    stated_impact_percent: Optional[float] = None


class NLPResponse(BaseModel):
    category: str
    city: Optional[str] = None
    tags: List[str] = []
    summary: str
    entities: List[str] = []
    numbers: List[NumberFact] = []
    impact: Impact


CITY_MAP = {
    "алматы": "Алматы",
    "астана": "Астана",
    "нур-султан": "Астана",
    "шымкент": "Шымкент",
}

# простые словари для routing + impact
KW_REAL_ESTATE = [
    "недвиж", "квартира", "жиль", "жк ", "жк.", "ипотек", "аренд", "застрой",
    "квадратн", "м2", "кв.м", "вторич", "первич", "новостро", "долев"
]
KW_FINANCE = ["банк", "ставк", "кредит", "депозит", "тенге", "kzt", "валют", "курс", "облигац", "акци"]
KW_MACRO = ["инфляц", "ввп", "внешн", "экономик", "бюджет", "нефть", "нацбанк", "базов", "регулятор"]

TAG_RULES = {
    "ипотек": "ипотека",
    "базов": "базовая_ставка",
    "ставк": "ставки",
    "инфляц": "инфляция",
    "курс": "курс",
    "тенге": "тенге",
    "метро": "метро",
    "строит": "строительство",
    "аренд": "аренда",
    "застрой": "застройщики",
    "льгот": "госпрограммы",
}

POS_WORDS = ["рост", "увелич", "повыш", "улучш", "поддерж", "снижен налог", "льгот", "запуск"]
NEG_WORDS = ["паден", "сниж", "ухудш", "кризис", "дефицит", "подорож", "повышен ставк", "огранич"]


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()


def detect_city(text: str) -> Optional[str]:
    t = text.lower()
    for k, v in CITY_MAP.items():
        if k in t:
            return v
    return None


def classify_category(text: str) -> str:
    t = text.lower()
    score_re = sum(1 for w in KW_REAL_ESTATE if w in t)
    score_fin = sum(1 for w in KW_FINANCE if w in t)
    score_mac = sum(1 for w in KW_MACRO if w in t)
    # приоритет: real_estate если явно много “жилья/ипотеки”
    if score_re >= 2 and score_re >= score_fin and score_re >= score_mac:
        return "real_estate"
    if score_fin >= 2 and score_fin >= score_mac:
        return "finance"
    if score_mac >= 2:
        return "macro"
    return "other"


def extract_tags(text: str) -> List[str]:
    t = text.lower()
    tags = set()
    for k, tag in TAG_RULES.items():
        if k in t:
            tags.add(tag)
    return sorted(tags)


def extract_numbers(text: str) -> List[NumberFact]:
    facts: List[NumberFact] = []
    t = text

    # проценты: 12.5% или 12 %
    for m in re.finditer(r"(\d+(?:[.,]\d+)?)\s*%", t):
        val = float(m.group(1).replace(",", "."))
        facts.append(NumberFact(kind="percent", value=val, unit="%", raw=m.group(0)))

    # ставка: "16,75%" часто уже попадёт в percent, но добавим heuristic "ставк"
    # деньги: "12 млрд тенге", "500 млн тг", "1 200 000 тг"
    money_patterns = [
        (r"(\d+(?:[ \u00A0]\d{3})*(?:[.,]\d+)?)\s*(?:тг|тенге|₸)", "KZT"),
        (r"(\d+(?:[.,]\d+)?)\s*(?:млрд)\s*(?:тг|тенге|₸)?", "KZT_bln"),
        (r"(\d+(?:[.,]\d+)?)\s*(?:млн)\s*(?:тг|тенге|₸)?", "KZT_mln"),
    ]
    for pat, unit in money_patterns:
        for m in re.finditer(pat, t, flags=re.IGNORECASE):
            raw = m.group(0)
            num = m.group(1).replace("\u00A0", " ").replace(" ", "").replace(",", ".")
            try:
                val = float(num)
                facts.append(NumberFact(kind="money", value=val, unit=unit, raw=raw))
            except:
                pass

    # ограничим количество
    return facts[:20]


def simple_summary(title: str, text: str, max_sentences: int = 5) -> str:
    # очень простой extractive summary: берём первые N “нормальных” предложений
    clean = _norm(text)
    # режем по . ! ?  (грубо, но работает для MVP)
    sents = re.split(r"(?<=[\.\!\?])\s+", clean)
    good = []
    for s in sents:
        s = _norm(s)
        if len(s) < 40:
            continue
        good.append(s)
        if len(good) >= max_sentences:
            break
    if not good:
        good = [clean[:500]] if clean else []
    # добавим заголовок в начало как контекст
    out = f"{_norm(title)}.\n\n" + "\n\n".join(good)
    return out[:1200]


def compute_impact(category: str, tags: List[str], text: str) -> Impact:
    t = text.lower()

    direction = "neutral"
    score = 35
    horizon = "medium"
    explanation = "Нейтральный новостной фон."

    # базовые правила
    if "базовая_ставка" in tags or "ставки" in tags:
        # рост ставок обычно давит на рынок жилья (ипотека)
        if "повыш" in t or "увелич" in t:
            direction = "down"
            score = 80
            horizon = "short"
            explanation = "Рост ставок обычно снижает доступность ипотеки и спрос на жильё."
        elif "сниж" in t:
            direction = "up"
            score = 70
            horizon = "short"
            explanation = "Снижение ставок может удешевить ипотеку и поддержать спрос на жильё."

    if "инфляция" in tags:
        # инфляция часто ведёт к удорожанию стройки/номинальному росту цен
        if "ускор" in t or "рост" in t:
            direction = "up"
            score = max(score, 65)
            horizon = "medium"
            explanation = "Рост инфляции повышает издержки и может поддерживать номинальный рост цен."
        elif "замедл" in t or "сниж" in t:
            direction = "neutral"
            score = min(score, 55)
            horizon = "medium"
            explanation = "Замедление инфляции снижает давление издержек, эффект для жилья умеренный."

    if "метро" in tags or "строительство" in tags:
        # инфраструктура чаще позитивна локально, эффект средне/долгосрочный
        direction = "up"
        score = max(score, 75)
        horizon = "long"
        explanation = "Инфраструктурные проекты повышают привлекательность районов, эффект чаще долгосрочный."

    if category == "real_estate":
        score = max(score, 55)

    # подкрутка по лексике
    pos_hits = sum(1 for w in POS_WORDS if w in t)
    neg_hits = sum(1 for w in NEG_WORDS if w in t)
    score = int(max(0, min(100, score + 5 * (pos_hits - neg_hits))))

    # если direction neutral, но score высокий — скорректируем
    if direction == "neutral" and score >= 70:
        direction = "up" if pos_hits >= neg_hits else "down"

    return Impact(direction=direction, score=score, horizon=horizon, explanation=explanation)


@app.post("/nlp/analyze-article", response_model=NLPResponse)
def nlp_analyze_article(req: NLPRequest):
    title = _norm(req.title)
    text = _norm(req.text)

    city = detect_city(title + " " + text)
    category = classify_category(title + " " + text)
    tags = extract_tags(title + " " + text)
    numbers = extract_numbers(text)
    summary = simple_summary(title, text, max_sentences=5)
    impact = compute_impact(category, tags, title + " " + text)

    resp = NLPResponse(
        category=category,
        city=city,
        tags=tags,
        summary=summary,
        entities=[],
        numbers=numbers,
        impact=impact,
    )

    # Explicit UTF-8 charset helps some clients (e.g., Windows PowerShell) decode Cyrillic correctly.
    return JSONResponse(content=resp.model_dump(), media_type="application/json; charset=utf-8")
