from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.db import Base
from app.models import Transaction

def seed():
    engine=create_engine(settings.database_url,connect_args={"check_same_thread":False} if settings.database_url.startswith("sqlite") else {})
    Base.metadata.create_all(engine)
    Session=sessionmaker(bind=engine)
    db=Session()
    if db.query(Transaction).count():
        db.close(); return
    demo=[
        dict(account_id="ACC-1001",amount=850,merchant="Food Delivery",risk_score=.08,action="APPROVE",behavior_score=.04,graph_score=0,velocity_score=.10,amount_score=.01,reasons=["No major anomaly detected"]),
        dict(account_id="ACC-1002",amount=42000,merchant="Electronics",risk_score=.49,action="STEP_UP",behavior_score=.50,graph_score=.20,velocity_score=.30,amount_score=.42,reasons=["New device detected","Unusually large transaction amount"]),
        dict(account_id="ACC-1003",amount=92000,merchant="Unknown Crypto Exchange",risk_score=.91,action="FREEZE",behavior_score=.85,graph_score=.65,velocity_score=.80,amount_score=.92,reasons=["New device detected","Unusual location distance detected","High transaction velocity"]),
        dict(account_id="ACC-1004",amount=1400,merchant="Retail Store",risk_score=.11,action="APPROVE",behavior_score=.05,graph_score=0,velocity_score=.10,amount_score=.01,reasons=["No major anomaly detected"])
    ]
    for x in demo:
        db.add(Transaction(**x,currency="INR",device_id="DEV-1",ip_address="10.0.0.1",
            country="IN",velocity_10m=1,device_change=False,location_distance_km=0,
            typing_deviation=.1,mouse_deviation=.1))
    db.commit(); db.close()

if __name__=="__main__": seed()
