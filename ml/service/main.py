"""Run from repository root: python -m uvicorn ml.service.main:app --port 8000."""
from contextlib import asynccontextmanager
from pathlib import Path
import math
import os
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from ml.schema import BOUNDS, CATEGORIES, FEATURES, PredictRequest

DEFAULT_MODEL = Path(__file__).resolve().parents[1] / 'model/price_pipeline.joblib'

def create_app(model_path=None):
    path = Path(model_path or os.getenv('MODEL_PATH', DEFAULT_MODEL))

    @asynccontextmanager
    async def lifespan(app):
        if not path.is_file():
            raise RuntimeError('Model missing. Run: python -m ml.train (from repository root).')
        # Only load artifacts you trained/trust: joblib uses pickle internally.
        artifact = joblib.load(path)
        if not isinstance(artifact, dict) or 'metadata' not in artifact or artifact['metadata'].get('features') != FEATURES:
            raise RuntimeError('Incompatible model. Retrain with: python -m ml.train')
        app.state.pipeline = artifact['pipeline']
        app.state.metadata = artifact['metadata']
        yield
        app.state.pipeline = None

    app = FastAPI(title='EstatePulse — Astana apartment valuation', version='2.0.0', lifespan=lifespan)

    @app.get('/health')
    def health():
        return {'status': 'ok', 'model_version': app.state.metadata['model_version']}

    @app.get('/metadata')
    def metadata():
        return {'city': 'Астана', 'currency': 'KZT', 'categories': CATEGORIES, 'bounds': BOUNDS,
                'model_version': app.state.metadata['model_version'], 'data_period': app.state.metadata['data_period'],
                'test_metrics': app.state.metadata['test']}

    @app.post('/predict')
    def predict(req: PredictRequest):
        values = req.model_dump()
        price = float(app.state.pipeline.predict(pd.DataFrame([{key: values[key] for key in FEATURES}]))[0])
        if not math.isfinite(price) or price <= 0:
            raise HTTPException(500, 'Model returned an invalid price')
        return {'predicted_price': price, 'price_per_m2': price / req.area, 'currency': 'KZT',
                'model_version': app.state.metadata['model_version'], 'input': values}
    return app

app = create_app()
