from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import re
from typing import List, Optional
import joblib
import pandas as pd
import os
from openai import OpenAI
from datetime import datetime

def load_env_file() -> None:
    candidates = [
        os.path.join(os.path.dirname(__file__), ".env"),
        os.path.join(os.getcwd(), ".env"),
    ]
    for path in candidates:
        if not os.path.isfile(path):
            continue
        try:
            with open(path, "r", encoding="utf-8") as handle:
                for line in handle:
                    raw = line.strip()
                    if not raw or raw.startswith("#") or "=" not in raw:
                        continue
                    key, value = raw.split("=", 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    if key and key not in os.environ:
                        os.environ[key] = value
        except Exception:
            pass

load_env_file()

app = FastAPI(title="EstatePulse ML & NLP Service")

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "model"))

def get_groq_client() -> OpenAI:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set")
    return OpenAI(base_url=GROQ_BASE_URL, api_key=api_key)

# ===== ML: ЗАГРУЗКА МОДЕЛЕЙ =====
# Пытаемся загрузить модели для обоих городов.
# Убедись, что almaty_pipeline_tuned.joblib и astana_pipeline_tuned.joblib лежат в папке model!
almaty_pipeline = None
astana_pipeline = None
try:
    almaty_pipeline = joblib.load(os.path.join(MODEL_DIR, "almaty_pipeline_tuned.joblib"))
    astana_pipeline = joblib.load(os.path.join(MODEL_DIR, "astana_pipeline_tuned.joblib"))
    print("✅ ML Модели успешно загружены!")
except Exception as e:
    print(f"⚠️ Ошибка загрузки моделей: {e}. Проверьте пути к файлам .joblib!")


# ===== ML: СХЕМЫ И ЭНДПОИНТ =====
class PredictRequest(BaseModel):
    city: str               # 'almaty' или 'astana'
    area: float
    rooms: int
    floor: int
    house_age: int
    house_type: str
    condition: str
    district: str           # НОВОЕ ПОЛЕ: Район
    total_floors: float = 0.0     # По умолчанию 0 (используется только для Астаны)
    ceiling_height: float = 0.0   # По умолчанию 0 (используется только для Астаны)

@app.post("/predict")
def predict(req: PredictRequest):
    city = req.city.lower().strip()

    if almaty_pipeline is None or astana_pipeline is None:
        raise HTTPException(status_code=500, detail="Модели не загрузились при старте сервера.")

    # Формируем DataFrame в формате, который ожидает конкретная модель
    if city == "almaty" or city == "алматы":
        df = pd.DataFrame([
            {
                "area": req.area,
                "number_of_rooms": req.rooms,
                "floor": req.floor,
                "house_age": req.house_age,
                "district": req.district,
                "structure_type": req.house_type,
                "quality": req.condition,
            }
        ])
    elif city == "astana" or city == "астана" or city == "нур-султан":
        df = pd.DataFrame([
            {
                "area": req.area,
                "number_of_rooms": req.rooms,
                "floor": req.floor,
                "total_floors": req.total_floors,
                "ceiling_height": req.ceiling_height,
                "house_age": req.house_age,
                "district": req.district,
                "house_type": req.house_type,
                "condition": req.condition,
            }
        ])
    else:
        raise HTTPException(status_code=400, detail="Город должен быть 'almaty' или 'astana'")
    
    try:
        # Маршрутизация по городам
        if city == "almaty" or city == "алматы":
            price = float(almaty_pipeline.predict(df)[0])
        elif city == "astana" or city == "астана" or city == "нур-султан":
            price = float(astana_pipeline.predict(df)[0])
        else:
            raise HTTPException(status_code=400, detail="Город должен быть 'almaty' или 'astana'")
            
        return {"predicted_price": price}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))


# ==========================================================
# ===== NLP (MVP, heuristic) - ТВОЙ КОД ОСТАЕТСЯ БЕЗ ИЗМЕНЕНИЙ =====
# ==========================================================

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


class ChatNewsItem(BaseModel):
    title: str = ""
    summary: Optional[str] = None
    city: Optional[str] = None
    source: Optional[str] = None
    url: Optional[str] = None


class ChatRequest(BaseModel):
    user_query: str
    context_news: List[ChatNewsItem] = []


class ChatResponse(BaseModel):
    answer: str


def build_news_context(items: List[ChatNewsItem]) -> str:
    lines = []
    for idx, item in enumerate(items[:8], start=1):
        title = (item.title or "").strip()
        summary = (item.summary or "").strip()
        city = (item.city or "").strip()
        source = (item.source or "").strip()
        url = (item.url or "").strip()

        parts = [title]
        if city:
            parts.append(f"({city})")
        if source:
            parts.append(f"[{source}]")
        if url:
            parts.append(url)

        line = " ".join([p for p in parts if p])
        if summary:
            line = f"{line} — {summary}" if line else summary

        if line:
            lines.append(f"{idx}. {line}")

    return "\n".join(lines)

def is_date_question(text: str) -> bool:
    t = (text or "").lower()
    patterns = ["какое сегодня число", "какая дата", "какое число", "сегодняшняя дата", "сегодня" ]
    return any(p in t for p in patterns)

def is_time_question(text: str) -> bool:
    t = (text or "").lower()
    patterns = ["сколько времени", "который час", "время", "сейчас времени"]
    return any(p in t for p in patterns)

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

    for m in re.finditer(r"(\d+(?:[.,]\d+)?)\s*%", t):
        val = float(m.group(1).replace(",", "."))
        facts.append(NumberFact(kind="percent", value=val, unit="%", raw=m.group(0)))

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

    return facts[:20]

def simple_summary(title: str, text: str, max_sentences: int = 5) -> str:
    clean = _norm(text)
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
    out = f"{_norm(title)}.\n\n" + "\n\n".join(good)
    return out[:1200]

def compute_impact(category: str, tags: List[str], text: str) -> Impact:
    t = text.lower()
    direction = "neutral"
    score = 35
    horizon = "medium"
    explanation = "Нейтральный новостной фон."

    if "базовая_ставка" in tags or "ставки" in tags:
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
        direction = "up"
        score = max(score, 75)
        horizon = "long"
        explanation = "Инфраструктурные проекты повышают привлекательность районов, эффект чаще долгосрочный."

    if category == "real_estate":
        score = max(score, 55)

    pos_hits = sum(1 for w in POS_WORDS if w in t)
    neg_hits = sum(1 for w in NEG_WORDS if w in t)
    score = int(max(0, min(100, score + 5 * (pos_hits - neg_hits))))

    if direction == "neutral" and score >= 70:
        direction = "up" if pos_hits >= neg_hits else "down"

    return Impact(direction=direction, score=score, horizon=horizon, explanation=explanation)


@app.post("/ai-assistant/chat", response_model=ChatResponse)
def ai_chat(payload: ChatRequest):
    user_query = (payload.user_query or "").strip()
    if not user_query:
        return {"answer": "Пустой запрос. Напишите вопрос."}

    if is_date_question(user_query):
        return {"answer": f"Сегодня {datetime.now().strftime('%d.%m.%Y')}."}
    if is_time_question(user_query):
        return {"answer": f"Сейчас {datetime.now().strftime('%H:%M')} (местное время сервера)."}

    news_context = build_news_context(payload.context_news)
    today = datetime.now().strftime("%Y-%m-%d")
    system_prompt = (
        "Ты — ИИ-ассистент платформы недвижимости EstatePulse (Казахстан). "
        "Твоя цель: помогать пользователям с оценкой жилья и анализом рынка. "
        "Отвечай кратко, профессионально, с легким оттенком уверенности. "
        "Если спрашивают про ипотеку или цены в Астане/Алматы — используй свои знания о РК. "
        f"Сегодня: {today}. "
        "Если ссылаешься на новости, указывай ссылку из контекста. "
        "Если в контексте нет точных данных — скажи, что данных нет и не придумывай числа."
    )

    if news_context:
        system_prompt = f"{system_prompt}\n\nКонтекст последних новостей:\n{news_context}"

    if not os.getenv("GROQ_API_KEY"):
        return {"answer": "Ассистент не настроен: отсутствует GROQ_API_KEY."}

    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query},
            ],
            temperature=0.7,
        )
        answer = completion.choices[0].message.content
        return {"answer": answer}
    except Exception:
        return {"answer": "Не удалось получить ответ от ассистента. Попробуйте позже."}

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

    return JSONResponse(content=resp.model_dump(), media_type="application/json; charset=utf-8")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)