import json
import os
import sys

import pandas as pd
from catboost import CatBoostClassifier


def load_payload() -> dict:
    raw = sys.stdin.read()
    if not raw.strip():
        return {}
    return json.loads(raw)


def resolve_model_path(payload: dict) -> str:
    model_path = payload.get("modelPath") or os.getenv("TOXICITY_MODEL_PATH")
    if model_path:
        return model_path
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "notebooks", "toxicity_model_tuned.cbm")


def clamp_threshold(value: object, default: float = 0.5) -> float:
    try:
        num = float(value)
    except (TypeError, ValueError):
        return default
    return max(0.0, min(1.0, num))


def main() -> int:
    payload = load_payload()
    text = str(payload.get("text") or "").strip()
    if not text:
        print(json.dumps({"toxic": False, "score": 0.0}))
        return 0

    model_path = resolve_model_path(payload)
    threshold = clamp_threshold(payload.get("threshold") or os.getenv("TOXICITY_THRESHOLD"), 0.5)

    model = CatBoostClassifier()
    model.load_model(model_path)

    df = pd.DataFrame({"text": [text]})
    proba = float(model.predict_proba(df)[0][1])
    toxic = proba >= threshold

    print(json.dumps({"toxic": toxic, "score": proba, "threshold": threshold}))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
