from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User, EMI, FinancialAccount
from ..schemas import EMICreate, EMIUpdate, EMIOut, EMISummaryOut, UpcomingEMI
from ..auth import get_current_user

router = APIRouter(prefix="/emi", tags=["EMI & Debt Tracker"])


@router.post("", response_model=EMIOut, status_code=status.HTTP_201_CREATED)
def create_emi(
    emi_in: EMICreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    emi = EMI(
        user_id=current_user.id,
        lender=emi_in.lender.strip(),
        loan_name=emi_in.loan_name.strip(),
        principal_amount=emi_in.principal_amount,
        outstanding_amount=emi_in.outstanding_amount,
        emi_amount=emi_in.emi_amount,
        interest_rate=emi_in.interest_rate,
        due_date=emi_in.due_date,
        remaining_tenure=emi_in.remaining_tenure,
        status=emi_in.status
    )
    db.add(emi)
    db.commit()
    db.refresh(emi)
    return emi


@router.get("", response_model=List[EMIOut])
def get_emis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(EMI).filter(EMI.user_id == current_user.id).all()


@router.get("/summary", response_model=EMISummaryOut)
def get_emi_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    emis = db.query(EMI).filter(
        EMI.user_id == current_user.id,
        EMI.status == "Active"
    ).all()

    accounts = db.query(FinancialAccount).filter(FinancialAccount.user_id == current_user.id).all()
    total_balance = sum(acc.current_balance for acc in accounts)
    total_income = sum(acc.monthly_income for acc in accounts) or 50000.0

    total_monthly_emi = sum(e.emi_amount for e in emis)
    total_outstanding = sum(e.outstanding_amount for e in emis)

    dti = round((total_monthly_emi / total_income * 100), 1) if total_income > 0 else 0.0

    if dti > 50.0:
        emi_burden_level = "Critical"
    elif dti > 35.0:
        emi_burden_level = "High"
    elif dti > 20.0:
        emi_burden_level = "Moderate"
    else:
        emi_burden_level = "Low"

    # Upcoming EMIs in next 30 days
    now = datetime.now(timezone.utc)
    current_day = now.day

    upcoming_list: List[UpcomingEMI] = []
    warnings: List[str] = []

    for e in emis:
        if e.due_date >= current_day:
            days_left = e.due_date - current_day
        else:
            days_left = (30 - current_day) + e.due_date

        upcoming_list.append(UpcomingEMI(
            id=e.id,
            lender=e.lender,
            loan_name=e.loan_name,
            emi_amount=e.emi_amount,
            due_date=e.due_date,
            days_left=days_left,
            status=e.status
        ))

        # Check due soon warning (< 5 days)
        if 0 <= days_left <= 5:
            warnings.append(f"{e.loan_name} (₹{e.emi_amount:,.0f}) is due in {days_left} days ({e.lender}).")

    upcoming_list.sort(key=lambda x: x.days_left)

    # Burden warnings
    if dti > 40.0:
        warnings.append(f"High EMI Burden: Debt payments consume {dti}% of monthly income.")

    # Insufficient balance check
    if total_monthly_emi > total_balance:
        warnings.append(f"Insufficient Liquid Balance: Total EMI obligations (₹{total_monthly_emi:,.0f}) exceed your current balance (₹{total_balance:,.0f}).")

    return EMISummaryOut(
        total_monthly_emi=round(total_monthly_emi, 2),
        total_outstanding=round(total_outstanding, 2),
        active_loans_count=len(emis),
        debt_to_income_ratio=dti,
        emi_burden_level=emi_burden_level,
        upcoming_emis=upcoming_list,
        warnings=warnings
    )


@router.get("/{emi_id}", response_model=EMIOut)
def get_emi(
    emi_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    emi = db.query(EMI).filter(
        EMI.id == emi_id,
        EMI.user_id == current_user.id
    ).first()
    if not emi:
        raise HTTPException(status_code=404, detail="EMI not found.")
    return emi


@router.put("/{emi_id}", response_model=EMIOut)
def update_emi(
    emi_id: int,
    emi_in: EMIUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    emi = db.query(EMI).filter(
        EMI.id == emi_id,
        EMI.user_id == current_user.id
    ).first()
    if not emi:
        raise HTTPException(status_code=404, detail="EMI not found.")

    update_data = emi_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(emi, field, val)

    db.commit()
    db.refresh(emi)
    return emi


@router.delete("/{emi_id}", status_code=status.HTTP_200_OK)
def delete_emi(
    emi_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    emi = db.query(EMI).filter(
        EMI.id == emi_id,
        EMI.user_id == current_user.id
    ).first()
    if not emi:
        raise HTTPException(status_code=404, detail="EMI not found.")

    db.delete(emi)
    db.commit()
    return {"status": "success", "message": "EMI deleted successfully."}
