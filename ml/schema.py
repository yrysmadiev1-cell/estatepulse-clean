"""One prediction contract shared by training, FastAPI and the UI metadata endpoint."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

NUMERIC_FEATURES = ['area', 'rooms', 'floor', 'total_floors', 'ceiling_height', 'year_built']
CATEGORIES = {
    'house_type': ['unknown', 'монолитный', 'кирпичный', 'панельный', 'иной'],
    'condition': ['unknown', 'свежий ремонт', 'не новый, но аккуратный ремонт', 'черновая отделка', 'требует ремонта', 'свободная планировка'],
    'district': ['unknown', 'Есильский р-н', 'Нура р-н', 'Алматы р-н', 'Сарыарка р-н', 'Сарайшык р-н', 'р-н Байконур'],
}
FEATURES = NUMERIC_FEATURES + list(CATEGORIES)
BOUNDS = {'area': (15, 300), 'rooms': (1, 13), 'floor': (1, 50), 'total_floors': (1, 50), 'ceiling_height': (2, 5), 'year_built': (1900, 2026)}

class PredictRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False, strict=True)
    city: Literal['Астана'] = 'Астана'
    area: float = Field(ge=15, le=300)
    rooms: int = Field(ge=1, le=13)
    floor: int = Field(ge=1, le=50)
    total_floors: int = Field(ge=1, le=50)
    ceiling_height: float = Field(ge=2, le=5)
    year_built: int = Field(ge=1900, le=2026)
    house_type: str = 'unknown'
    condition: str = 'unknown'
    district: str = 'unknown'

    @model_validator(mode='after')
    def check_property(self):
        if self.floor > self.total_floors:
            raise ValueError('Этаж не может превышать этажность дома')
        for field, choices in CATEGORIES.items():
            if getattr(self, field) not in choices:
                raise ValueError(f'Недопустимое значение поля {field}')
        return self
