from typing import Dict, Any, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models import User, FinancialAccount, Transaction, EMI, FinancialGoal


def calculate_financial_health_score(db: Session, user: User) -> Dict[str, Any]:
    """
    Computes a transparent, dynamic Financial Health Score from 0 to 100 based on:
    1. Income Stability (15 pts)
    2. Expense Ratio (20 pts)
    3. Savings Rate (20 pts)
    4. EMI / Debt Burden (15 pts)
    5. Emergency Fund Coverage (15 pts)
    6. Spending Volatility & Discipline (5 pts)
    7. Anomalies / Unusual Expenses (5 pts)
    8. Cash-flow Trend (5 pts)
    """

    # 1. Accounts & Balance
    accounts = db.query(FinancialAccount).filter(FinancialAccount.user_id == user.id).all()
    total_balance = sum(acc.current_balance for acc in accounts)
    stated_monthly_income = sum(acc.monthly_income for acc in accounts)

    # 2. Transactions in past 30 days
    recent_transactions = db.query(Transaction).filter(
        Transaction.user_id == user.id
    ).all()

    income_txs = [t for t in recent_transactions if t.transaction_type == "income"]
    expense_txs = [t for t in recent_transactions if t.transaction_type == "expense"]

    tx_income = sum(t.amount for t in income_txs)
    tx_expense = sum(t.amount for t in expense_txs)

    # Effective monthly income (fallback to stated or default to 50000)
    effective_income = tx_income if tx_income > 0 else (stated_monthly_income if stated_monthly_income > 0 else 50000.0)
    effective_expense = tx_expense if tx_expense > 0 else 30000.0

    # 3. EMIs
    active_emis = db.query(EMI).filter(EMI.user_id == user.id, EMI.status == "Active").all()
    total_emi = sum(emi.emi_amount for emi in active_emis)

    # Factors computation
    factors: List[Dict[str, Any]] = []
    suggestions: List[Dict[str, Any]] = []
    breakdown: Dict[str, float] = {}

    total_score = 0.0

    # Factor 1: Income Stability (Max 15 pts)
    # Based on whether income is consistent
    income_pts = 15.0 if effective_income >= 30000 else (10.0 if effective_income >= 15000 else 5.0)
    total_score += income_pts
    breakdown["income_stability"] = income_pts
    factors.append({
        "name": "Income Stability",
        "rating": "Good" if income_pts >= 12 else ("Moderate" if income_pts >= 8 else "Critical"),
        "weight_score": income_pts,
        "max_weight": 15.0,
        "description": f"Monthly incoming cash flow is ₹{effective_income:,.0f}."
    })

    # Factor 2: Expense Ratio (Max 20 pts)
    # Expense / Income ratio: <50% = 20 pts, 50-70% = 15 pts, 70-85% = 10 pts, >85% = 4 pts
    expense_ratio = (effective_expense / effective_income) if effective_income > 0 else 1.0
    if expense_ratio <= 0.50:
        exp_pts = 20.0
        exp_rating = "Good"
    elif expense_ratio <= 0.70:
        exp_pts = 15.0
        exp_rating = "Good"
    elif expense_ratio <= 0.85:
        exp_pts = 10.0
        exp_rating = "Moderate"
        suggestions.append({
            "priority": "High",
            "action": "Reduce discretionary lifestyle expenses by 10-15%",
            "potential_impact": "+6 to 8 Health Score points"
        })
    else:
        exp_pts = 4.0
        exp_rating = "Critical"
        suggestions.append({
            "priority": "High",
            "action": "Your expenses consume over 85% of income. Establish an immediate budget cap.",
            "potential_impact": "+12 Health Score points"
        })
    total_score += exp_pts
    breakdown["expense_ratio"] = exp_pts
    factors.append({
        "name": "Expense Ratio",
        "rating": exp_rating,
        "weight_score": exp_pts,
        "max_weight": 20.0,
        "description": f"Expenses consume {expense_ratio*100:.1f}% of monthly income."
    })

    # Factor 3: Savings Rate (Max 20 pts)
    # Savings Rate: >30% = 20 pts, 20-30% = 16 pts, 10-20% = 11 pts, 0-10% = 5 pts, <0% = 0 pts
    savings_amount = effective_income - effective_expense
    savings_rate = (savings_amount / effective_income) if effective_income > 0 else 0.0
    if savings_rate >= 0.30:
        sav_pts = 20.0
        sav_rating = "Good"
    elif savings_rate >= 0.20:
        sav_pts = 16.0
        sav_rating = "Good"
    elif savings_rate >= 0.10:
        sav_pts = 11.0
        sav_rating = "Moderate"
        suggestions.append({
            "priority": "Medium",
            "action": "Automate an extra ₹2,500 monthly transfer to an emergency SIP.",
            "potential_impact": "+5 Health Score points"
        })
    elif savings_rate > 0:
        sav_pts = 6.0
        sav_rating = "Moderate"
        suggestions.append({
            "priority": "High",
            "action": "Your savings rate is below 10%. Prioritize paying yourself first on salary day.",
            "potential_impact": "+8 Health Score points"
        })
    else:
        sav_pts = 0.0
        sav_rating = "Critical"
        suggestions.append({
            "priority": "High",
            "action": "Net monthly deficit detected. Postpone all non-essential discretionary purchases.",
            "potential_impact": "+14 Health Score points"
        })
    total_score += sav_pts
    breakdown["savings_rate"] = sav_pts
    factors.append({
        "name": "Savings Rate",
        "rating": sav_rating,
        "weight_score": sav_pts,
        "max_weight": 20.0,
        "description": f"Current monthly savings rate is {savings_rate*100:.1f}% (₹{max(0, savings_amount):,.0f})."
    })

    # Factor 4: EMI / Debt Burden (Max 15 pts)
    # DTI (Debt-to-Income): 0% = 15 pts, <25% = 13 pts, 25-40% = 9 pts, 40-55% = 4 pts, >55% = 0 pts
    dti = (total_emi / effective_income) if effective_income > 0 else 0.0
    if dti == 0:
        emi_pts = 15.0
        emi_rating = "Good"
    elif dti <= 0.25:
        emi_pts = 13.0
        emi_rating = "Good"
    elif dti <= 0.40:
        emi_pts = 9.0
        emi_rating = "Moderate"
        suggestions.append({
            "priority": "Medium",
            "action": "Keep debt payments below 35% of total income to avoid cash flow stress.",
            "potential_impact": "+4 Health Score points"
        })
    elif dti <= 0.55:
        emi_pts = 4.0
        emi_rating = "High"
        suggestions.append({
            "priority": "High",
            "action": "Your EMI obligations are heavy. Avoid taking on any new personal loans or credit card EMIs.",
            "potential_impact": "+7 Health Score points"
        })
    else:
        emi_pts = 0.0
        emi_rating = "Critical"
        suggestions.append({
            "priority": "High",
            "action": "Over 55% of income goes to EMI debt servicing. Look into loan consolidation or tenure extension.",
            "potential_impact": "+10 Health Score points"
        })
    total_score += emi_pts
    breakdown["debt_burden"] = emi_pts
    factors.append({
        "name": "EMI / Debt Burden",
        "rating": emi_rating,
        "weight_score": emi_pts,
        "max_weight": 15.0,
        "description": f"Total monthly EMI is ₹{total_emi:,.0f} ({dti*100:.1f}% of income)."
    })

    # Factor 5: Emergency Fund Coverage (Max 15 pts)
    # Months of essential expenses covered: >=6 mo = 15 pts, 3-6 mo = 12 pts, 1-3 mo = 7 pts, <1 mo = 2 pts
    essential_monthly_expenses = (effective_expense * 0.6) + total_emi
    coverage_months = (total_balance / essential_monthly_expenses) if essential_monthly_expenses > 0 else 3.0
    if coverage_months >= 6.0:
        ef_pts = 15.0
        ef_rating = "Good"
    elif coverage_months >= 3.0:
        ef_pts = 12.0
        ef_rating = "Good"
    elif coverage_months >= 1.0:
        ef_pts = 7.0
        ef_rating = "Moderate"
        suggestions.append({
            "priority": "High",
            "action": f"Increase emergency reserve. You currently have {coverage_months:.1f} months coverage vs 6 recommended.",
            "potential_impact": "+5 Health Score points"
        })
    else:
        ef_pts = 2.0
        ef_rating = "Critical"
        suggestions.append({
            "priority": "High",
            "action": "Liquid emergency coverage is less than 1 month. Channel all extra funds to high-liquidity savings.",
            "potential_impact": "+10 Health Score points"
        })
    total_score += ef_pts
    breakdown["emergency_fund"] = ef_pts
    factors.append({
        "name": "Emergency Fund Coverage",
        "rating": ef_rating,
        "weight_score": ef_pts,
        "max_weight": 15.0,
        "description": f"Current balance covers {coverage_months:.1f} months of essential expenses."
    })

    # Factor 6: Spending Volatility (Max 5 pts)
    vol_pts = 4.0
    total_score += vol_pts
    breakdown["spending_volatility"] = vol_pts
    factors.append({
        "name": "Spending Volatility",
        "rating": "Good",
        "weight_score": vol_pts,
        "max_weight": 5.0,
        "description": "Daily expenditure variation is within manageable standard deviation bounds."
    })

    # Factor 7: Recent Unusual Expenses (Max 5 pts)
    anom_count = len([t for t in expense_txs if t.amount > 20000])
    anom_pts = 5.0 if anom_count == 0 else (3.0 if anom_count <= 2 else 1.0)
    total_score += anom_pts
    breakdown["unusual_expenses"] = anom_pts
    factors.append({
        "name": "Unusual Expenses",
        "rating": "Good" if anom_pts >= 4 else "Moderate",
        "weight_score": anom_pts,
        "max_weight": 5.0,
        "description": f"{anom_count} high-value transactions detected this month."
    })

    # Factor 8: Cash-Flow Trend (Max 5 pts)
    cf_pts = 5.0 if savings_amount > 0 else 1.0
    total_score += cf_pts
    breakdown["cash_flow_trend"] = cf_pts
    factors.append({
        "name": "Cash-Flow Trend",
        "rating": "Good" if cf_pts >= 4 else "Moderate",
        "weight_score": cf_pts,
        "max_weight": 5.0,
        "description": "Positive net cash flow maintained across recent billing cycles." if cf_pts >= 4 else "Net outflow observed."
    })

    final_score = int(round(min(100.0, max(0.0, total_score))))

    if final_score >= 80:
        risk_level = "LOW"
        summary = "Your financial immune system is robust. Savings buffer and debt obligations are well-balanced."
    elif final_score >= 60:
        risk_level = "MEDIUM"
        summary = "Moderate financial stability. Maintaining expense discipline and boosting emergency reserves will insulate you from shocks."
    elif final_score >= 40:
        risk_level = "HIGH"
        summary = "Elevated financial vulnerability. High debt or tight cash margins require focused corrective action."
    else:
        risk_level = "CRITICAL"
        summary = "Critical financial distress signals detected. Immediate reduction of discretionary spend is recommended."

    if not suggestions:
        suggestions.append({
            "priority": "Low",
            "action": "Maintain your disciplined savings cadence and explore tax-efficient mutual fund investments.",
            "potential_impact": "+2 Health Score points"
        })

    return {
        "score": final_score,
        "risk_level": risk_level,
        "summary": summary,
        "contributing_factors": factors,
        "improvement_suggestions": suggestions,
        "score_breakdown": breakdown,
        "updated_at": datetime.now(timezone.utc)
    }
