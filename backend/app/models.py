from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, Integer, String, Boolean, JSON
from .db import Base

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(String(64), index=True)
    amount = Column(Float)
    currency = Column(String(8), default="INR")
    merchant = Column(String(200))
    device_id = Column(String(100))
    ip_address = Column(String(100))
    country = Column(String(8))
    velocity_10m = Column(Integer, default=0)
    device_change = Column(Boolean, default=False)
    location_distance_km = Column(Float, default=0)
    typing_deviation = Column(Float, default=0)
    mouse_deviation = Column(Float, default=0)
    graph_score = Column(Float, default=0)
    behavior_score = Column(Float, default=0)
    velocity_score = Column(Float, default=0)
    amount_score = Column(Float, default=0)
    risk_score = Column(Float, default=0)
    action = Column(String(30), default="APPROVE")
    reasons = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
