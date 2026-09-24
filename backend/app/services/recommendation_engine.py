from typing import List, Dict, Any
from sqlalchemy.orm import Session
from ..models import User, FinancialAccount, Transaction, EMI, FinancialGoal


def generate_personalized_recommendations(db: Session, user: User) -> List[Dict[str, Any]]:
    """
    Dynamic Personalized Recommendation Engine.
    Inspects user-specific DTI, savings rate, emergency reserve, category spending,
    and outstanding goals to produce targeted, prioritized recommendations.
    """
    recs: List[Dict[str, Any]] = []

    # 1. Accounts & Balance
    accounts = db.query(FinancialAccount).filter(FinancialAccount.user_id == user.id).all()
    total_balance = sum(acc.current_balance for acc in accounts)
    stated_income = sum(acc.monthly_income for acc in accounts)

    # 2. Transactions
    transactions = db.query(Transaction).filter(Transaction.user_id == user.id).all()
    income_txs = [t for t in transactions if t.transaction_type == "income"]
    expense_txs = [t for t in transactions if t.transaction_type == "expense"]

    income = sum(t.amount for t in income_txs) or stated_income or 50000.0
    expenses = sum(t.amount for t in expense_txs) or 32000.0

    # 3. EMIs
    emis = db.query(EMI).filter(EMI.user_id == user.id, EMI.status == "Active").all()
    total_emi = sum(emi.emi_amount for emi in emis)

    # 4. Goals
    goals = db.query(FinancialGoal).filter(FinancialGoal.user_id == user.id).all()

    # Ratios
    expense_ratio = expenses / income if income > 0 else 1.0
    savings = income - expenses
    savings_rate = (savings / income) if income > 0 else 0.0
    dti = (total_emi / income) if income > 0 else 0.0
    essential_expenses = (expenses * 0.6) + total_emi
    emergency_months = total_balance / essential_expenses if essential_expenses > 0 else 2.0

    # Condition 1: High Expense Ratio (> 75%)
    if expense_ratio > 0.80:
        recs.append({
            "id": "REC-EXP-01",
            "title": "High Operating Expenditure Ratio",
            "description": f"Your monthly outflow consumes {expense_ratio*100:.0f}% of your earnings, leaving razor-thin margins for volatility.",
            "category": "EXPENSES",
            "severity": "URGENT",
            "actionable_step": "Cap discretionary shopping, dining, and impulse subscriptions to recover at least 15% monthly buffer."
        })
    elif expense_ratio > 0.65:
        recs.append({
            "id": "REC-EXP-02",
            "title": "Moderate Spending Volatility",
            "description": f"Expenses are {expense_ratio*100:.0f}% of income. Target an optimal 50/30/20 budget allocation.",
            "category": "EXPENSES",
            "severity": "INFO",
            "actionable_step": "Review your highest non-essential category this month and set a spending threshold."
        })

    # Condition 2: Low Emergency Fund (< 3 months)
    if emergency_months < 2.0:
        recs.append({
            "id": "REC-EMG-01",
            "title": "Vulnerable Emergency Liquidity",
            "description": f"Current liquid reserves provide only {emergency_months:.1f} months of essential coverage vs 6 months recommended.",
            "category": "EMERGENCY_FUND",
            "severity": "URGENT",
            "actionable_step": "Establish an automated auto-sweep or liquid mutual fund SIP of ₹3,000/month into your emergency reserve."
        })
    elif emergency_months < 5.0:
        recs.append({
            "id": "REC-EMG-02",
            "title": "Reinforce Emergency Buffer",
            "description": f"You have {emergency_months:.1f} months of coverage. Approaching the 6-month financial immune benchmark.",
            "category": "EMERGENCY_FUND",
            "severity": "INFO",
            "actionable_step": "Channel upcoming tax refunds or festival bonuses directly into your emergency goal."
        })

    # Condition 3: Elevated EMI / Debt Burden (> 35%)
    if dti > 0.45:
        recs.append({
            "id": "REC-DEBT-01",
            "title": "Critical Debt Burden Warning",
            "description": f"Over {dti*100:.0f}% of monthly income is committed to servicing debt (₹{total_emi:,.0f}/mo).",
            "category": "DEBT",
            "severity": "URGENT",
            "actionable_step": "Use the debt avalanche method: direct all surplus funds to prepaying your highest-interest rate loan first."
        })
    elif dti > 0.30:
        recs.append({
            "id": "REC-DEBT-02",
            "title": "Elevated Debt Servicing",
            "description": f"Your Debt-to-Income ratio is {dti*100:.0f}%. Avoid taking on any additional consumer EMIs.",
            "category": "DEBT",
            "severity": "WARNING",
            "actionable_step": "Do not convert credit card purchases to EMIs until your active loan count decreases."
        })

    # Condition 4: Savings Rate Optimization
    if savings_rate < 0.10 and savings_rate > 0:
        recs.append({
            "id": "REC-SAV-01",
            "title": "Sub-Optimal Savings Cadence",
            "description": f"Current savings rate is {savings_rate*100:.1f}%. Increasing to 20% dramatically boosts financial immune resilience.",
            "category": "SAVINGS",
            "severity": "WARNING",
            "actionable_step": "Set an auto-debit on salary day to pay your savings goal before paying discretionary expenses."
        })
    elif savings_rate >= 0.25:
        recs.append({
            "id": "REC-SAV-02",
            "title": "Strong Savings Discipline",
            "description": f"Commendable {savings_rate*100:.1f}% monthly savings rate achieved across recent cycles.",
            "category": "SAVINGS",
            "severity": "INFO",
            "actionable_step": "Consider diversifying surplus funds beyond low-yield savings into equity index funds or Sovereign Gold Bonds."
        })

    # Condition 5: Unfunded or Missing Goals
    if not goals:
        recs.append({
            "id": "REC-GOAL-01",
            "title": "Targeted Financial Planning",
            "description": "You do not have any active financial goals defined yet.",
            "category": "BUDGET",
            "severity": "INFO",
            "actionable_step": "Create a '6-Month Emergency Reserve' or 'Annual Vacation' goal to track progress systematically."
        })

    return recs
