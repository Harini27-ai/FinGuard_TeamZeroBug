import random
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from ..db import get_db
from ..models import Transaction
from ..schemas import TransactionIn, TransactionOut, DashboardOut
from ..services.fraud_engine import score_transaction
from ..services.repositories import save_transaction

router = APIRouter(prefix="/api")

@router.get("/health")
def health():
    return {"status":"ok","service":"FinGuard API"}

@router.get("/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db)):
    total = db.query(func.count(Transaction.id)).scalar() or 0
    high = db.query(func.count(Transaction.id)).filter(Transaction.action=="FREEZE").scalar() or 0
    step = db.query(func.count(Transaction.id)).filter(Transaction.action=="STEP_UP").scalar() or 0
    approved = db.query(func.count(Transaction.id)).filter(Transaction.action=="APPROVE").scalar() or 0
    avg = db.query(func.avg(Transaction.risk_score)).scalar() or 0
    rows = db.query(Transaction).order_by(desc(Transaction.created_at)).limit(10).all()
    recent = [{
        "id":x.id,"account_id":x.account_id,"amount":x.amount,"merchant":x.merchant,
        "risk_score":x.risk_score,"action":x.action,"reasons":x.reasons,
        "created_at":x.created_at.isoformat()
    } for x in rows]
    return DashboardOut(
        total=total, high_risk=high, step_up=step, approved=approved,
        avg_risk=round(float(avg),4),
        high_risk_rate=round(high/total*100,2) if total else 0,
        recent=recent
    )

@router.get("/transactions", response_model=list[TransactionOut])
def transactions(limit:int=Query(20,ge=1,le=100), db:Session=Depends(get_db)):
    return db.query(Transaction).order_by(desc(Transaction.created_at)).limit(limit).all()

@router.post("/transactions/score", response_model=TransactionOut)
def score(data:TransactionIn, db:Session=Depends(get_db)):
    from ..main import graph_service
    result = score_transaction(data, lambda: graph_service.relationship_score(
        data.account_id, data.device_id, data.ip_address))
    graph_service.upsert_transaction(data.account_id,data.device_id,data.ip_address,data.amount)
    return save_transaction(db,data,result)

@router.post("/transactions/simulate", response_model=TransactionOut)
def simulate(db:Session=Depends(get_db)):
    suspicious = random.random() < .35
    data = TransactionIn(
        account_id=f"ACC-{random.randint(1001,1010)}",
        amount=random.choice([1200,3500,8500,24000,72000]) if suspicious else random.choice([250,450,900,1800]),
        merchant=random.choice(["Retail Store","Food Delivery","Travel","Unknown Crypto Exchange","Electronics"]),
        device_id=f"DEV-{random.randint(1,8)}",
        ip_address=f"10.0.0.{random.randint(2,30)}",
        velocity_10m=random.randint(5,9) if suspicious else random.randint(0,3),
        device_change=suspicious and random.random()<.8,
        location_distance_km=random.randint(300,700) if suspicious else random.randint(0,50),
        typing_deviation=random.uniform(.55,.9) if suspicious else random.uniform(.05,.3),
        mouse_deviation=random.uniform(.55,.9) if suspicious else random.uniform(.05,.3)
    )
    from ..main import graph_service
    result=score_transaction(data, lambda: graph_service.relationship_score(
        data.account_id,data.device_id,data.ip_address))
    graph_service.upsert_transaction(data.account_id,data.device_id,data.ip_address,data.amount)
    return save_transaction(db,data,result)
