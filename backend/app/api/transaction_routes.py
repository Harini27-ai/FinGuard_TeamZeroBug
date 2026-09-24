from typing import List, Optional
from datetime import datetime, timezone
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_
from ..db import get_db
from ..models import User, Transaction, FinancialAccount
from ..schemas import (
    TransactionCreate, TransactionUpdate, TransactionOut,
    TransactionSummaryOut, CategoryBreakdownItem
)
from ..auth import get_current_user, get_optional_current_user
from ..services.anomaly_engine import scan_and_record_anomalies

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    tx_in: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    t_date = tx_in.transaction_date or now

    # Derive or link account
    account_code = tx_in.account_id or "ACC-1001"
    account_ref_id = tx_in.account_ref_id

    if account_ref_id:
        acc = db.query(FinancialAccount).filter(
            FinancialAccount.id == account_ref_id,
            FinancialAccount.user_id == current_user.id
        ).first()
        if acc:
            account_code = f"ACC-{acc.bank_name[:4].upper()}-{acc.last4}"
            # Adjust account balance dynamically
            if tx_in.transaction_type == "income":
                acc.current_balance += tx_in.amount
            elif tx_in.transaction_type == "expense":
                acc.current_balance = max(0.0, acc.current_balance - tx_in.amount)

    tx = Transaction(
        user_id=current_user.id,
        account_ref_id=account_ref_id,
        account_id=account_code,
        transaction_type=tx_in.transaction_type,
        category=tx_in.category,
        amount=tx_in.amount,
        description=tx_in.description,
        transaction_date=t_date,
        merchant=tx_in.merchant or "Merchant",
        currency=tx_in.currency,
        device_id="DEV-MOBILE",
        ip_address="127.0.0.1",
        country="IN",
        velocity_10m=1,
        risk_score=0.08 if tx_in.amount < 15000 else 0.45,
        action="APPROVE" if tx_in.amount < 15000 else "STEP_UP",
        reasons=["Normal transaction"] if tx_in.amount < 15000 else ["Elevated amount verification"],
        created_at=now
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    # Trigger anomaly detection for expenses
    if tx.transaction_type == "expense":
        scan_and_record_anomalies(db, current_user, tx)

    return tx


@router.get("", response_model=List[TransactionOut])
def get_transactions(
    category: Optional[str] = Query(None, description="Filter by category"),
    transaction_type: Optional[str] = Query(None, description="income, expense, transfer"),
    search: Optional[str] = Query(None, description="Search description or merchant"),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Transaction)

    # If authenticated, scope strictly to current_user
    if current_user:
        query = query.filter(Transaction.user_id == current_user.id)

    if category:
        query = query.filter(Transaction.category == category)
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (Transaction.description.ilike(search_fmt)) |
            (Transaction.merchant.ilike(search_fmt)) |
            (Transaction.category.ilike(search_fmt))
        )
    if date_from:
        query = query.filter(Transaction.transaction_date >= date_from)
    if date_to:
        query = query.filter(Transaction.transaction_date <= date_to)

    return query.order_by(desc(Transaction.transaction_date), desc(Transaction.created_at)).offset(offset).limit(limit).all()


@router.get("/summary", response_model=TransactionSummaryOut)
def get_transaction_summary(
    month: Optional[str] = Query(None, description="YYYY-MM"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    txs = query.all()

    total_income = 0.0
    total_expenses = 0.0
    category_map = defaultdict(lambda: {"amount": 0.0, "count": 0})

    for t in txs:
        if t.transaction_type == "income":
            total_income += t.amount
        elif t.transaction_type == "expense":
            total_expenses += t.amount
            cat = t.category or "Other"
            category_map[cat]["amount"] += t.amount
            category_map[cat]["count"] += 1

    net_savings = max(0.0, total_income - total_expenses)
    savings_rate = round((net_savings / total_income * 100), 1) if total_income > 0 else 0.0

    category_breakdown: List[CategoryBreakdownItem] = []
    for cat, data in category_map.items():
        pct = round((data["amount"] / total_expenses * 100), 1) if total_expenses > 0 else 0.0
        category_breakdown.append(CategoryBreakdownItem(
            category=cat,
            amount=round(data["amount"], 2),
            percentage=pct,
            count=data["count"]
        ))

    category_breakdown.sort(key=lambda x: x.amount, reverse=True)

    return TransactionSummaryOut(
        total_income=round(total_income, 2),
        total_expenses=round(total_expenses, 2),
        net_savings=round(net_savings, 2),
        savings_rate=savings_rate,
        transaction_count=len(txs),
        category_breakdown=category_breakdown
    )


@router.get("/{transaction_id}", response_model=TransactionOut)
def get_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    return tx


@router.put("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: int,
    tx_in: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    update_data = tx_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(tx, field, val)

    db.commit()
    db.refresh(tx)
    return tx


@router.delete("/{transaction_id}", status_code=status.HTTP_200_OK)
def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    db.delete(tx)
    db.commit()
    return {"status": "success", "message": "Transaction deleted successfully."}
