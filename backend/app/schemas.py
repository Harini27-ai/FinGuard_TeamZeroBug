from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field

class TransactionIn(BaseModel):
    account_id: str = "ACC-1001"
    amount: float = Field(gt=0)
    currency: str = "INR"
    merchant: str = "Online Merchant"
    device_id: str = "DEV-1"
    ip_address: str = "127.0.0.1"
    country: str = "IN"
    velocity_10m: int = Field(default=1, ge=0)
    device_change: bool = False
    location_distance_km: float = Field(default=0, ge=0)
    typing_deviation: float = Field(default=0, ge=0, le=1)
    mouse_deviation: float = Field(default=0, ge=0, le=1)

class TransactionOut(TransactionIn):
    id: int
    graph_score: float
    behavior_score: float
    velocity_score: float
    amount_score: float
    risk_score: float
    action: str
    reasons: list[str]
    created_at: datetime
    class Config:
        from_attributes = True

class DashboardOut(BaseModel):
    total: int
    high_risk: int
    step_up: int
    approved: int
    avg_risk: float
    high_risk_rate: float
    recent: list[dict[str, Any]]
