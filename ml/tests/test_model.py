import joblib
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sklearn.dummy import DummyRegressor
from ml.schema import FEATURES, PredictRequest
from ml.service.main import create_app
from ml.train import ROOT, build_pipeline, prepare_data, split_indices

VALID = dict(city='Астана', area=65, rooms=2, floor=5, total_floors=9, ceiling_height=2.7,
             year_built=2015, district='Есильский р-н', house_type='кирпичный', condition='свежий ремонт')

@pytest.mark.parametrize('update', [dict(area=0), dict(area=-10), dict(area=301), dict(area=float('nan')),
    dict(floor=10), dict(rooms=1.5), dict(rooms=True), dict(year_built=2030), dict(city='Алматы'),
    dict(house_type='brick'), dict(condition='excellent'), dict(district='invalid'), dict(unexpected=1)])
def test_bad_inputs_rejected(update):
    with pytest.raises(ValidationError): PredictRequest(**(VALID | update))

def test_imputation_uses_training_only():
    train = pd.DataFrame([VALID | {'ceiling_height': 2.5}, VALID | {'ceiling_height': 3.0}])
    pipe = build_pipeline(DummyRegressor()).fit(train[FEATURES], [20e6, 30e6])
    test = pd.DataFrame([VALID | {'ceiling_height': np.nan}])
    transformed = pipe.named_steps['preprocessor'].transform(test[FEATURES])
    assert transformed[0, 4] == 2.75
    assert 'кирпичный' in pipe.named_steps['preprocessor'].named_transformers_['categorical'].categories_[0]

def test_real_dataset_groups_do_not_overlap():
    df, groups = prepare_data(pd.read_csv(ROOT / 'data/dataset1.csv'))
    tr, val, te = split_indices(df, groups)
    sets = [set(groups.iloc[idx]) for idx in (tr, val, te)]
    assert not (sets[0] & sets[1] or sets[0] & sets[2] or sets[1] & sets[2])
    assert len(tr) + len(val) + len(te) == len(df)
    assert df.year_built.max() <= 2026
    assert df.latitude.between(50.9, 51.35).all()
    assert df.longitude.between(71.1, 71.8).all()

@pytest.fixture
def client(tmp_path):
    pipe = build_pipeline(DummyRegressor(strategy='constant', constant=32_500_000))
    pipe.fit(pd.DataFrame([VALID])[FEATURES], [32_500_000])
    path = tmp_path / 'model.joblib'
    joblib.dump({'pipeline': pipe, 'metadata': {'features': FEATURES, 'model_version': 'test-v2', 'data_period': {}, 'test': {}}}, path)
    with TestClient(create_app(path)) as c: yield c

def test_prediction_and_contract(client):
    metadata = client.get('/metadata').json()
    assert 'кирпичный' in metadata['categories']['house_type']
    response = client.post('/predict', json=VALID)
    assert response.status_code == 200
    assert response.json()['price_per_m2'] == 500_000
    assert response.json()['input']['district'] == VALID['district']
    assert client.get('/health').json()['status'] == 'ok'

def test_invalid_floor_returns_422(client):
    assert client.post('/predict', json=VALID | {'floor': 20}).status_code == 422

def test_missing_model_gives_training_instruction(tmp_path):
    with pytest.raises(RuntimeError, match='python -m ml.train'):
        with TestClient(create_app(tmp_path / 'missing.joblib')): pass
