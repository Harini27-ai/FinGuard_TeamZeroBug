from typing import Dict, Any
from datetime import datetime, timezone
import calendar
from sqlalchemy.orm import Session
from ..models import User, FinancialAccount, Transaction, EMI


def evaluate_day25_early_warning(db: Session, user: User) -> Dict[str, Any]:
    """
    Day-25 Early Warning Engine.
    Simulates the end-of-month cash depletion trajectory.
    Detects if the user is in danger of running below safe liquidity before the next salary cycle.
    """
    now = datetime.now(timezone.utc)
    current_day = now.day
    _, days_in_month = calendar.monthrange(now.year, now.month)
    days_left = max(1, days_in_month - current_day)

    # 1. User accounts and balance
    accounts = db.query(FinancialAccount).filter(FinancialAccount.user_id == user.id).all()
    total_balance = sum(acc.current_balance for acc in accounts)
    stated_monthly_income = sum(acc.monthly_income for acc in accounts) or 50000.0

    # 2. Transactions & spending burn rate
    transactions = db.query(Transaction).filter(Transaction.user_id == user.id).all()
    expense_txs = [t for t in transactions if t.transaction_type == "expense"]
    total_expense = sum(t.amount for t in expense_txs) or 30000.0

    # Average daily spend so far
    daily_burn_rate = total_expense / max(1, current_day)
    projected_remaining_spend = daily_burn_rate * days_left

    # 3. Upcoming EMIs in the remainder of this month
    active_emis = db.query(EMI).filter(EMI.user_id == user.id, EMI.status == "Active").all()
    upcoming_emis_this_month = [
        emi for emi in active_emis if emi.due_date >= current_day
    ]
    upcoming_emi_sum = sum(emi.emi_amount for emi in upcoming_emis_this_month)

    # 4. Projected month-end balance
    projected_balance = total_balance - (projected_remaining_spend * 0.7) - upcoming_emi_sum
    safe_buffer = stated_monthly_income * 0.15  # Recommended safety cushion (15% of salary)

    # Warning logic
    is_triggered = False
    warning_level = "SAFE"
    warning_message = "Your month-end liquidity trajectory is safe and within your healthy buffer."
    affected_metric = "Projected Month-End Balance"
    recommended_action = "Maintain normal spending discipline until next salary cycle."

    if projected_balance < 0:
        is_triggered = True
        warning_level = "CRITICAL"
        warning_message = (
            f"🚨 Critical Early Warning: Projected month-end cash deficit of ₹{abs(projected_balance):,.0f}. "
            f"Upcoming commitments (EMIs ₹{upcoming_emi_sum:,.0f}) exceed available liquidity."
        )
        affected_metric = "Severe Cash Deficit Risk"
        deficit_reduction = round(abs(projected_balance) + safe_buffer, -2)
        recommended_action = f"Freeze discretionary spend immediately. Conserve at least ₹{deficit_reduction:,.0f} to avoid overdraft or bounced payments."
    elif projected_balance < safe_buffer:
        is_triggered = True
        warning_level = "WARNING"
        shortfall = safe_buffer - projected_balance
        warning_message = (
            f"⚠️ Early Warning: Your projected month-end balance (₹{projected_balance:,.0f}) "
            f"falls below your minimum safe cushion (₹{safe_buffer:,.0f})."
        )
        affected_metric = "Low Buffer Margin"
        cut_amount = round(min(shortfall, 5000.0), -2)
        recommended_action = f"Reduce discretionary dining, entertainment, and shopping by ₹{max(1000.0, cut_amount):,.0f} over the next {days_left} days."
    elif upcoming_emi_sum > total_balance * 0.6:
        is_triggered = True
        warning_level = "INFO"
        warning_message = f"Upcoming EMI payment of ₹{upcoming_emi_sum:,.0f} will consume more than 60% of your remaining liquid balance."
        affected_metric = "Upcoming EMI Liquidity Concentration"
        recommended_action = "Postpone non-essential shopping until after EMI auto-debit clears."

    return {
        "is_triggered": is_triggered,
        "warning_level": warning_level,
        "warning_message": warning_message,
        "affected_metric": affected_metric,
        "projected_balance": round(projected_balance, 2),
        "safe_buffer": round(safe_buffer, 2),
        "recommended_action": recommended_action,
        "days_to_salary": days_left
    }
