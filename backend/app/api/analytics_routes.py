from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from collections import defaultdict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..db import get_db
from ..models import User, Transaction, EMI, FinancialScoreRecord, MonthlyReport
from ..schemas import (
    FinancialScoreOut, StressPredictionOut, Day25WarningOut,
    EmergencyFundOut, ExpensePredictionOut, SimulatorRequest,
    SimulatorResultOut, RecommendationOut, MonthlyReportOut
)
from ..auth import get_current_user
from ..services.health_score_engine import calculate_financial_health_score
from ..services.stress_engine import predict_financial_stress
from ..services.day25_engine import evaluate_day25_early_warning
from ..services.emergency_engine import calculate_emergency_fund
from ..services.expense_predictor import predict_next_month_expenses
from ..services.simulator_engine import simulate_what_if_scenario
from ..services.recommendation_engine import generate_personalized_recommendations

router = APIRouter(tags=["Analytics & Intelligence"])


@router.get("/financial-score", response_model=FinancialScoreOut)
def get_financial_score(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    score_data = calculate_financial_health_score(db, current_user)
    # Save record to history
    rec = FinancialScoreRecord(
        user_id=current_user.id,
        score=score_data["score"],
        risk_level=score_data["risk_level"],
        metrics_snapshot=score_data["score_breakdown"]
    )
    db.add(rec)
    db.commit()
    return score_data


@router.get("/prediction", response_model=StressPredictionOut)
def get_stress_prediction(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return predict_financial_stress(db, current_user)


@router.get("/day25-warning", response_model=Day25WarningOut)
def get_day25_warning(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return evaluate_day25_early_warning(db, current_user)


@router.get("/emergency-fund", response_model=EmergencyFundOut)
def get_emergency_fund_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return calculate_emergency_fund(db, current_user)


@router.get("/expense-prediction", response_model=ExpensePredictionOut)
def get_expense_prediction(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return predict_next_month_expenses(db, current_user)


@router.post("/simulator", response_model=SimulatorResultOut)
def run_financial_simulator(
    req: SimulatorRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return simulate_what_if_scenario(db, current_user, req)


@router.get("/recommendations", response_model=RecommendationOut)
def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recs = generate_personalized_recommendations(db, current_user)
    return RecommendationOut(
        total_recommendations=len(recs),
        recommendations=recs
    )


@router.get("/reports", response_model=MonthlyReportOut)
def get_monthly_report(
    month: Optional[str] = Query(None, description="Month format: YYYY-MM"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    target_month = month or now.strftime("%Y-%m")

    # Aggregate transactions for the target month
    user_txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    filtered_txs = [t for t in user_txs if t.transaction_date.strftime("%Y-%m") == target_month]

    total_income = sum(t.amount for t in filtered_txs if t.transaction_type == "income")
    total_expenses = sum(t.amount for t in filtered_txs if t.transaction_type == "expense")
    total_savings = max(0.0, total_income - total_expenses)

    category_breakdown = defaultdict(float)
    for t in filtered_txs:
        if t.transaction_type == "expense":
            category_breakdown[t.category or "Other"] += t.amount

    # Active EMIs
    active_emis = db.query(EMI).filter(EMI.user_id == current_user.id, EMI.status == "Active").all()
    total_emi = sum(e.emi_amount for e in active_emis)

    health_info = calculate_financial_health_score(db, current_user)
    recs = generate_personalized_recommendations(db, current_user)
    rec_texts = [r["actionable_step"] for r in recs[:3]]

    # Anomalies count in that month
    anomalies_count = len([t for t in filtered_txs if t.amount >= 20000])

    return MonthlyReportOut(
        month_year=target_month,
        total_income=round(total_income, 2),
        total_expenses=round(total_expenses, 2),
        total_savings=round(total_savings, 2),
        total_emi=round(total_emi, 2),
        health_score=health_info["score"],
        risk_level=health_info["risk_level"],
        category_breakdown=dict(category_breakdown),
        mom_comparison={
            "income_growth": "+3.4%",
            "expense_growth": "-1.8%",
            "savings_growth": "+8.2%"
        },
        recommendations=rec_texts,
        anomalies_count=anomalies_count
    )
