from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..db import get_db
from ..models import User, SpendingAnomaly
from ..schemas import AnomalyOut, AnomalyStatusUpdate
from ..auth import get_current_user

router = APIRouter(prefix="/anomalies", tags=["Spending Anomalies"])


@router.get("", response_model=List[AnomalyOut])
def get_anomalies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(SpendingAnomaly).filter(
        SpendingAnomaly.user_id == current_user.id
    ).order_by(desc(SpendingAnomaly.created_at)).all()


@router.put("/{anomaly_id}/status", response_model=AnomalyOut)
def update_anomaly_status(
    anomaly_id: int,
    status_update: AnomalyStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    anom = db.query(SpendingAnomaly).filter(
        SpendingAnomaly.id == anomaly_id,
        SpendingAnomaly.user_id == current_user.id
    ).first()
    if not anom:
        raise HTTPException(status_code=404, detail="Spending anomaly record not found.")

    anom.status = status_update.status
    db.commit()
    db.refresh(anom)
    return anom
