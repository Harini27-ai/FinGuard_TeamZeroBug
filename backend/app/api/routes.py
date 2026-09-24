import random
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from ..db import get_db
from ..models import (
    Transaction, FinancialAccount, EMI, FinancialGoal, Alert,
    SpendingAnomaly, FinancialScoreRecord, User
)
from ..schemas import TransactionIn, TransactionOut, DashboardOut, CategoryBreakdownItem, UpcomingEMI, GoalOut, AnomalyOut
from ..auth import get_optional_current_user
from ..services.fraud_engine import score_transaction
from ..services.repositories import save_transaction
from ..services.health_score_engine import calculate_financial_health_score
from ..services.stress_engine import predict_financial_stress
from ..services.day25_engine import evaluate_day25_early_warning
from ..services.emergency_engine import calculate_emergency_fund

# Import sub-routers
from .auth_routes import router as auth_router
from .account_routes import router as account_router
from .transaction_routes import router as transaction_router
from .emi_routes import router as emi_router
from .goal_routes import router as goal_router
from .analytics_routes import router as analytics_router
from .anomaly_routes import router as anomaly_router
from .alert_routes import router as alert_router
from .assistant_routes import router as assistant_router
from .security_routes import router as security_router
from .demo_routes import router as demo_router

router = APIRouter(prefix="/api")

# Register sub-routers
router.include_router(auth_router)
router.include_router(account_router)
router.include_router(transaction_router)
router.include_router(emi_router)
router.include_router(goal_router)
router.include_router(analytics_router)
router.include_router(anomaly_router)
router.include_router(alert_router)
router.include_router(assistant_router)
router.include_router(security_router)
router.include_router(demo_router)


@router.get("/health")
def health():
    return {
        "status": "ok",
        "service": "FinGuard – Financial Immune System API",
        "version": "2.0.0"
    }


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    # 1. Base legacy fraud engine metrics (PRESERVED)
    total = db.query(func.count(Transaction.id)).scalar() or 0
    high = db.query(func.count(Transaction.id)).filter(Transaction.action == "FREEZE").scalar() or 0
    step = db.query(func.count(Transaction.id)).filter(Transaction.action == "STEP_UP").scalar() or 0
    approved = db.query(func.count(Transaction.id)).filter(Transaction.action == "APPROVE").scalar() or 0
    avg = db.query(func.avg(Transaction.risk_score)).scalar() or 0

    # Recent transactions for feed
    tx_query = db.query(Transaction)
    if current_user:
        tx_query = tx_query.filter(Transaction.user_id == current_user.id)
    rows = tx_query.order_by(desc(Transaction.transaction_date), desc(Transaction.created_at)).limit(10).all()

    recent = [{
        "id": x.id,
        "account_id": x.account_id,
        "amount": x.amount,
        "merchant": x.merchant,
        "category": x.category or "Other",
        "transaction_type": x.transaction_type or "expense",
        "description": x.description or "",
        "risk_score": x.risk_score or 0.0,
        "action": x.action or "APPROVE",
        "reasons": x.reasons or [],
        "created_at": (x.transaction_date or x.created_at).isoformat()
    } for x in rows]

    dashboard_out = DashboardOut(
        total=total,
        high_risk=high,
        step_up=step,
        approved=approved,
        avg_risk=round(float(avg), 4),
        high_risk_rate=round(high / total * 100, 2) if total else 0.0,
        recent=recent
    )

    # 2. Enhanced Financial Immune System Metrics (if user is authenticated)
    if current_user:
        # Accounts & Balance
        accounts = db.query(FinancialAccount).filter(FinancialAccount.user_id == current_user.id).all()
        current_balance = sum(acc.current_balance for acc in accounts)
        stated_income = sum(acc.monthly_income for acc in accounts)

        # Transactions
        user_txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
        income_txs = [t for t in user_txs if t.transaction_type == "income"]
        expense_txs = [t for t in user_txs if t.transaction_type == "expense"]

        monthly_income = sum(t.amount for t in income_txs) or stated_income or 50000.0
        monthly_expenses = sum(t.amount for t in expense_txs) or 32000.0
        monthly_savings = max(0.0, monthly_income - monthly_expenses)
        savings_rate = round((monthly_savings / monthly_income * 100), 1) if monthly_income > 0 else 0.0

        # EMIs
        emis = db.query(EMI).filter(EMI.user_id == current_user.id, EMI.status == "Active").all()
        total_emi = sum(e.emi_amount for e in emis)
        dti = round((total_emi / monthly_income * 100), 1) if monthly_income > 0 else 0.0

        # Engines
        health_data = calculate_financial_health_score(db, current_user)
        stress_data = predict_financial_stress(db, current_user)
        day25_warning = evaluate_day25_early_warning(db, current_user)
        emergency_fund = calculate_emergency_fund(db, current_user)

        # Category spending
        cat_map = defaultdict(lambda: {"amount": 0.0, "count": 0})
        for t in expense_txs:
            c = t.category or "Other"
            cat_map[c]["amount"] += t.amount
            cat_map[c]["count"] += 1

        category_breakdown = []
        for c, val in cat_map.items():
            pct = round((val["amount"] / monthly_expenses * 100), 1) if monthly_expenses > 0 else 0.0
            category_breakdown.append(CategoryBreakdownItem(
                category=c,
                amount=round(val["amount"], 2),
                percentage=pct,
                count=val["count"]
            ))
        category_breakdown.sort(key=lambda x: x.amount, reverse=True)

        # Trends (Mocked/Aggregated over last 6 months for visualization)
        months_labels = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"]
        income_vs_expense_trend = [
            {"month": m, "income": round(monthly_income * (0.95 + idx * 0.02), 0), "expenses": round(monthly_expenses * (0.92 + idx * 0.03), 0)}
            for idx, m in enumerate(months_labels)
        ]
        savings_trend = [
            {"month": m, "savings": round(monthly_savings * (0.9 + idx * 0.04), 0)}
            for idx, m in enumerate(months_labels)
        ]
        score_trend = [
            {"month": m, "score": min(100, max(50, health_data["score"] - 6 + idx * 2))}
            for idx, m in enumerate(months_labels)
        ]

        # Upcoming EMIs
        now = datetime.now(timezone.utc)
        curr_day = now.day
        upcoming_emis = [
            UpcomingEMI(
                id=e.id,
                lender=e.lender,
                loan_name=e.loan_name,
                emi_amount=e.emi_amount,
                due_date=e.due_date,
                days_left=(e.due_date - curr_day) if e.due_date >= curr_day else (30 - curr_day + e.due_date),
                status=e.status
            )
            for e in emis
        ]

        # Goals
        goals = db.query(FinancialGoal).filter(FinancialGoal.user_id == current_user.id).all()
        goals_out = []
        for g in goals:
            target = max(1.0, g.target_amount)
            curr = max(0.0, g.current_amount)
            rem = max(0.0, target - curr)
            pct = round(min(100.0, curr / target * 100), 1)
            goals_out.append(GoalOut(
                id=g.id,
                user_id=g.user_id,
                goal_name=g.goal_name,
                goal_type=g.goal_type,
                target_amount=g.target_amount,
                current_amount=g.current_amount,
                target_date=g.target_date,
                monthly_contribution=g.monthly_contribution,
                progress_percentage=pct,
                remaining_amount=round(rem, 2),
                required_monthly_saving=g.monthly_contribution,
                projected_completion_date="In Progress",
                created_at=g.created_at,
                updated_at=g.updated_at
            ))

        # Active Anomalies
        anomalies = db.query(SpendingAnomaly).filter(
            SpendingAnomaly.user_id == current_user.id,
            SpendingAnomaly.status == "Pending"
        ).all()
        anomalies_out = [
            AnomalyOut(
                id=a.id,
                user_id=a.user_id,
                transaction_id=a.transaction_id,
                anomaly_type=a.anomaly_type,
                category=a.category,
                amount=a.amount,
                description=a.description,
                severity=a.severity,
                status=a.status,
                created_at=a.created_at
            )
            for a in anomalies
        ]

        # Unread alerts
        unread_count = db.query(func.count(Alert.id)).filter(
            Alert.user_id == current_user.id,
            Alert.is_read == False
        ).scalar() or 0

        dashboard_out.financial_health_score = health_data["score"]
        dashboard_out.health_risk_level = health_data["risk_level"]
        dashboard_out.current_balance = round(current_balance, 2)
        dashboard_out.monthly_income = round(monthly_income, 2)
        dashboard_out.monthly_expenses = round(monthly_expenses, 2)
        dashboard_out.monthly_savings = round(monthly_savings, 2)
        dashboard_out.total_emi = round(total_emi, 2)
        dashboard_out.savings_rate = savings_rate
        dashboard_out.debt_to_income = dti

        dashboard_out.stress_risk_percent = stress_data["stress_score"]
        dashboard_out.day25_warning = day25_warning
        dashboard_out.emergency_fund = emergency_fund

        dashboard_out.category_spending = category_breakdown
        dashboard_out.income_vs_expense_trend = income_vs_expense_trend
        dashboard_out.savings_trend = savings_trend
        dashboard_out.score_trend = score_trend

        dashboard_out.upcoming_emis = upcoming_emis
        dashboard_out.active_goals = goals_out
        dashboard_out.active_anomalies = anomalies_out
        dashboard_out.unread_alerts_count = unread_count

    return dashboard_out


# Legacy Fraud Engine Scoring Endpoint (PRESERVED)
@router.post("/transactions/score", response_model=TransactionOut)
def score(data: TransactionIn, db: Session = Depends(get_db)):
    from ..main import graph_service
    result = score_transaction(
        data,
        lambda: graph_service.relationship_score(data.account_id, data.device_id, data.ip_address)
    )
    graph_service.upsert_transaction(data.account_id, data.device_id, data.ip_address, data.amount)
    return save_transaction(db, data, result)


# Legacy Fraud Engine Simulation Endpoint (PRESERVED)
@router.post("/transactions/simulate", response_model=TransactionOut)
def simulate(db: Session = Depends(get_db)):
    suspicious = random.random() < 0.35
    data = TransactionIn(
        account_id=f"ACC-{random.randint(1001, 1010)}",
        amount=random.choice([1200, 3500, 8500, 24000, 72000]) if suspicious else random.choice([250, 450, 900, 1800]),
        merchant=random.choice(["Retail Store", "Food Delivery", "Travel", "Unknown Crypto Exchange", "Electronics"]),
        device_id=f"DEV-{random.randint(1, 8)}",
        ip_address=f"10.0.0.{random.randint(2, 30)}",
        velocity_10m=random.randint(5, 9) if suspicious else random.randint(0, 3),
        device_change=suspicious and random.random() < 0.8,
        location_distance_km=random.randint(300, 700) if suspicious else random.randint(0, 50),
        typing_deviation=random.uniform(0.55, 0.9) if suspicious else random.uniform(0.05, 0.3),
        mouse_deviation=random.uniform(0.55, 0.9) if suspicious else random.uniform(0.05, 0.3)
    )
    from ..main import graph_service
    result = score_transaction(
        data,
        lambda: graph_service.relationship_score(data.account_id, data.device_id, data.ip_address)
    )
    graph_service.upsert_transaction(data.account_id, data.device_id, data.ip_address, data.amount)
    return save_transaction(db, data, result)
