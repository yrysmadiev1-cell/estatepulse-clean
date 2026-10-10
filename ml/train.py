"""Run from the repository root: python -m ml.train."""
import argparse
import hashlib
import json
from pathlib import Path
import platform
import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import ExtraTreesRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from ml.schema import BOUNDS, CATEGORIES, FEATURES, NUMERIC_FEATURES

ROOT = Path(__file__).resolve().parent
SEED = 42

def prepare_data(raw):
    df = raw.copy()
    # Approximate Astana bounding box; this is not an administrative boundary.
    df = df[df.latitude.between(50.9, 51.35) & df.longitude.between(71.1, 71.8)].copy()
    df = df.drop_duplicates('listing_id', keep='last')
    df = df[df.price_local.between(1_000_000, 300_000_000)].copy()
    for col in NUMERIC_FEATURES:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        lo, hi = BOUNDS[col]
        if col in ['area', 'rooms', 'year_built']:
            df = df[df[col].between(lo, hi)].copy()
        else:
            # Bad optional measurements become missing, imputed on train only.
            df.loc[~df[col].between(lo, hi), col] = np.nan
    df = df[~(df.floor > df.total_floors)].copy()
    for col, choices in CATEGORIES.items():
        df[col] = df[col].fillna('unknown').astype(str).str.strip()
        df.loc[~df[col].isin(choices), col] = 'unknown'
    # Keep apartments in the same named complex out of other evaluation partitions.
    complex_name = raw.loc[df.index, 'residential_complex_name'].fillna('').astype(str).str.strip().str.casefold()
    address = df.address.fillna('').astype(str).str.strip().str.casefold()
    fallback = df.district.astype(str) + ':' + address
    fallback = fallback.where(address.ne(''), 'listing:' + df.listing_id.astype(str))
    groups = ('complex:' + complex_name).where(complex_name.ne(''), 'address:' + fallback)
    return df.reset_index(drop=True), groups.reset_index(drop=True)

def split_indices(df, groups):
    trainval, test = next(GroupShuffleSplit(n_splits=1, test_size=.2, random_state=SEED).split(df, groups=groups))
    train_rel, val_rel = next(GroupShuffleSplit(n_splits=1, test_size=.2, random_state=SEED + 1).split(df.iloc[trainval], groups=groups.iloc[trainval]))
    return trainval[train_rel], trainval[val_rel], test

def build_pipeline(estimator):
    preprocessor = ColumnTransformer([
        ('numeric', SimpleImputer(strategy='median'), NUMERIC_FEATURES),
        ('categorical', OneHotEncoder(handle_unknown='ignore', sparse_output=False), list(CATEGORIES)),
    ])
    return Pipeline([('preprocessor', preprocessor), ('model', estimator)])

def metrics(y, predicted):
    return {'mae_kzt': float(mean_absolute_error(y, predicted)),
            'rmse_kzt': float(np.sqrt(mean_squared_error(y, predicted))),
            'r2': float(r2_score(y, predicted))}

def train(data_path=ROOT / 'data/dataset1.csv', model_dir=ROOT / 'model', report_dir=ROOT / 'reports', trees=200):
    data_path, model_dir, report_dir = map(Path, [data_path, model_dir, report_dir])
    raw = pd.read_csv(data_path)
    df, groups = prepare_data(raw)
    train_idx, val_idx, test_idx = split_indices(df, groups)
    X, y = df[FEATURES], df.price_local
    estimators = {
        'median_baseline': DummyRegressor(strategy='median'),
        'random_forest': RandomForestRegressor(n_estimators=trees, max_depth=18, min_samples_leaf=2, random_state=SEED, n_jobs=-1),
        'extra_trees': ExtraTreesRegressor(n_estimators=trees, max_depth=18, min_samples_leaf=2, random_state=SEED, n_jobs=-1),
    }
    fitted, validation = {}, {}
    for name, estimator in estimators.items():
        pipe = build_pipeline(estimator)
        pipe.fit(X.iloc[train_idx], y.iloc[train_idx])
        validation[name] = metrics(y.iloc[val_idx], pipe.predict(X.iloc[val_idx]))
        fitted[name] = pipe
        print(name, validation[name], flush=True)
    winner = min(validation, key=lambda name: validation[name]['mae_kzt'])
    # Selection uses validation only. Refit on train+validation, then evaluate test once.
    trainval = np.concatenate([train_idx, val_idx])
    final = fitted[winner].fit(X.iloc[trainval], y.iloc[trainval])
    prediction = final.predict(X.iloc[test_idx])
    baseline = DummyRegressor(strategy='median').fit(X.iloc[trainval], y.iloc[trainval])
    dataset_sha = hashlib.sha256(data_path.read_bytes()).hexdigest()
    version = f'astana-v2-{dataset_sha[:10]}-{winner}-n{trees}'
    report = {
        'model_version': version, 'selected_model': winner, 'dataset_sha256': dataset_sha,
        'city': 'Астана', 'currency': 'KZT', 'target': 'listing asking price, not transaction price',
        'data_period': {'from': str(raw.parsed_at.min()), 'to': str(raw.parsed_at.max())},
        'rows': {'raw': len(raw), 'clean': len(df), 'train': len(train_idx), 'validation': len(val_idx), 'test': len(test_idx)},
        'split': 'GroupShuffleSplit: residential complex; fallback district + address. 20% test groups, then 20% validation groups.',
        'seed': SEED, 'features': FEATURES, 'validation': validation,
        'test': metrics(y.iloc[test_idx], prediction),
        'test_baseline': metrics(y.iloc[test_idx], baseline.predict(X.iloc[test_idx])),
        'versions': {'python': platform.python_version(), 'pandas': pd.__version__, 'numpy': np.__version__, 'scikit-learn': sklearn.__version__},
        'limitations': ['January 2026 snapshot, no time-forward validation', 'Approximate Astana bounding box',
            'Group labels are heuristic, not verified building identifiers', 'Asking prices, not completed sales',
            'No forecast of future prices or news signals', 'Completed buildings only (year_built <= 2026)'],
    }
    model_dir.mkdir(parents=True, exist_ok=True)
    report_dir.mkdir(parents=True, exist_ok=True)
    # The deployed artifact is exactly the evaluated model; do not refit on test.
    joblib.dump({'pipeline': final, 'metadata': report}, model_dir / 'price_pipeline.joblib', compress=3)
    (report_dir / 'metrics.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    errors = pd.DataFrame({'actual_kzt': y.iloc[test_idx].to_numpy(), 'predicted_kzt': prediction})
    errors['absolute_error_kzt'] = abs(errors.actual_kzt - errors.predicted_kzt)
    # Aggregated diagnostics only, no listing identifiers in the report.
    errors['price_band'] = pd.cut(errors.actual_kzt, [0, 30e6, 60e6, 100e6, float('inf')], labels=['<30m', '30-60m', '60-100m', '>100m'])
    errors.groupby('price_band', observed=True).agg(count=('absolute_error_kzt', 'size'), mae_kzt=('absolute_error_kzt', 'mean')).to_csv(report_dir / 'error_by_price_band.csv')
    print(json.dumps({'selected_model': winner, 'test': report['test'], 'rows': report['rows']}, indent=2), flush=True)
    return report

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, default=ROOT / 'data/dataset1.csv')
    parser.add_argument('--model-dir', type=Path, default=ROOT / 'model')
    parser.add_argument('--report-dir', type=Path, default=ROOT / 'reports')
    parser.add_argument('--trees', type=int, default=200)
    args = parser.parse_args()
    train(args.data, args.model_dir, args.report_dir, args.trees)
