from fastapi import FastAPI
from pydantic import BaseModel
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
