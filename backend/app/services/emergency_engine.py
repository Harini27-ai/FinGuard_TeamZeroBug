from typing import Dict, Any
from sqlalchemy.orm import Session
from ..models import User, FinancialAccount, Transaction, EMI, FinancialGoal


def calculate_emergency_fund(db: Session, user: User) -> Dict[str, Any]:
    """
    Emergency Fund Predictor.
    Computes liquid savings, essential monthly run-rate (rent, bills, groceries, emi),
    months of coverage, target (6 months), gap, and savings timeline.
    """
    # 1. Total liquid balance across accounts
    accounts = db.query(FinancialAccount).filter(
        FinancialAccount.user_id == user.id,
        FinancialAccount.account_status == "Active"
    ).all()
    liquid_balance = sum(acc.current_balance for acc in accounts)

    # 2. Check if user has an explicit Emergency Fund Goal
    ef_goals = db.query(FinancialGoal).filter(
        FinancialGoal.user_id == user.id,
        FinancialGoal.goal_type == "Emergency fund"
    ).all()
    dedicated_goal_balance = sum(g.current_amount for g in ef_goals)

    # Effective current fund
    current_fund = max(liquid_balance, dedicated_goal_balance)

    # 3. Monthly essential expenses
    transactions = db.query(Transaction).filter(Transaction.user_id == user.id).all()
    expense_txs = [t for t in transactions if t.transaction_type == "expense"]

    essential_categories = {"Rent", "Bills", "Food", "Healthcare", "EMI", "Education"}
    essential_tx_amount = sum(t.amount for t in expense_txs if t.category in essential_categories)

    # Active EMIs
    active_emis = db.query(EMI).filter(EMI.user_id == user.id, EMI.status == "Active").all()
    total_monthly_emi = sum(emi.emi_amount for emi in active_emis)

    # Monthly essential expenses estimation
    if essential_tx_amount > 0:
        essential_monthly_expenses = essential_tx_amount
    else:
        # If no categorized transactions, estimate essential expenses as 60% of typical living cost + EMIs
        stated_income = sum(acc.monthly_income for acc in accounts) or 50000.0
        essential_monthly_expenses = (stated_income * 0.45) + total_monthly_emi

    essential_monthly_expenses = max(10000.0, essential_monthly_expenses)

    # 4. Coverage in months
    coverage_months = round(current_fund / essential_monthly_expenses, 1)
    recommended_target_months = 6.0
    target_amount = round(essential_monthly_expenses * recommended_target_months, 2)
    gap_amount = round(max(0.0, target_amount - current_fund), 2)

    # Recommended monthly savings to reach target within 12 months
    monthly_saving_recommendation = round(gap_amount / 12.0, 2) if gap_amount > 0 else 0.0

    if coverage_months >= 6.0:
        status_rating = "Excellent"
    elif coverage_months >= 3.0:
        status_rating = "Adequate"
    elif coverage_months >= 1.0:
        status_rating = "Vulnerable"
    else:
        status_rating = "Critical"

    return {
        "current_fund": round(current_fund, 2),
        "essential_monthly_expenses": round(essential_monthly_expenses, 2),
        "coverage_months": coverage_months,
        "recommended_target_months": recommended_target_months,
        "target_amount": target_amount,
        "gap_amount": gap_amount,
        "monthly_saving_recommendation": monthly_saving_recommendation,
        "status_rating": status_rating
    }
