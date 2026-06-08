import importlib
import sys
from pathlib import Path

import joblib
import pytest
from fastapi.testclient import TestClient

SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(SERVICE_DIR))


class DummyPipeline:
    def __init__(self, prediction):
        self.prediction = prediction
        self.last_frame = None

    def predict(self, frame):
        self.last_frame = frame.copy()
        return [self.prediction]


@pytest.fixture()
def service(monkeypatch):
    almaty_pipeline = DummyPipeline(25000000)
    astana_pipeline = DummyPipeline(31000000)

    def fake_load(path):
      path_text = str(path).lower()
      if "almaty" in path_text:
          return almaty_pipeline
      if "astana" in path_text:
          return astana_pipeline
      raise AssertionError(f"Unexpected model path: {path}")

    monkeypatch.setattr(joblib, "load", fake_load)
    sys.modules.pop("main", None)
    main = importlib.import_module("main")
    main.almaty_pipeline = almaty_pipeline
    main.astana_pipeline = astana_pipeline
    client = TestClient(main.app)
    return main, client, almaty_pipeline, astana_pipeline


def test_predict_returns_price_for_almaty(service):
    _, client, almaty_pipeline, _ = service

    response = client.post(
        "/predict",
        json={
            "city": "almaty",
            "area": 68.5,
            "rooms": 2,
            "floor": 5,
            "house_age": 12,
            "house_type": "brick",
            "condition": "good",
            "district": "Медеуский",
            "total_floors": 0,
            "ceiling_height": 0,
        },
    )

    assert response.status_code == 200
    assert response.json()["predicted_price"] == 25000000
    assert list(almaty_pipeline.last_frame.columns) == [
        "area",
        "number_of_rooms",
        "floor",
        "house_age",
        "district",
        "structure_type",
        "quality",
    ]
    assert almaty_pipeline.last_frame.iloc[0]["district"] == "Медеуский"


def test_predict_rejects_unknown_city(service):
    _, client, _, _ = service

    response = client.post(
        "/predict",
        json={
            "city": "karaganda",
            "area": 68.5,
            "rooms": 2,
            "floor": 5,
            "house_age": 12,
            "house_type": "brick",
            "condition": "good",
            "district": "Медеуский",
            "total_floors": 0,
            "ceiling_height": 0,
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Город должен быть 'almaty' или 'astana'"


def test_nlp_analysis_extracts_city_tags_numbers_and_impact(service):
    _, client, _, _ = service

    response = client.post(
        "/nlp/analyze-article",
        json={
            "title": "В Алматы подорожали квартиры и ипотека",
            "text": (
                "В Алматы на рынке квартир и ипотеки зафиксирован рост на 12%. "
                "Строительство новых ЖК и метро привлекло 5 млрд тг инвестиций."
            ),
            "source": "Kapital",
            "url": "https://example.com/news",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["city"] == "Алматы"
    assert payload["category"] == "real_estate"
    assert "ипотека" in payload["tags"]
    assert any(item["kind"] == "percent" and item["value"] == 12.0 for item in payload["numbers"])
    assert any(item["kind"] == "money" for item in payload["numbers"])
    assert payload["impact"]["direction"] == "up"
    assert payload["impact"]["score"] >= 75