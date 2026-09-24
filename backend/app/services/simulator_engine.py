from typing import Dict, Any, List
from sqlalchemy.orm import Session
from ..models import User, FinancialAccount, Transaction, EMI
from ..schemas import SimulatorRequest


def simulate_what_if_scenario(db: Session, user: User, req: SimulatorRequest) -> Dict[str, Any]:
    """
    What-If Financial Simulator.
    Simulates financial parameter adjustments purely in-memory WITHOUT mutating the database.
    """
    # 1. Gather baseline parameters
    accounts = db.query(FinancialAccount).filter(FinancialAccount.user_id == user.id).all()
    base_balance = sum(acc.current_balance for acc in accounts)
    stated_income = sum(acc.monthly_income for acc in accounts)

    transactions = db.query(Transaction).filter(Transaction.user_id == user.id).all()
    income_txs = [t for t in transactions if t.transaction_type == "income"]
    expense_txs = [t for t in transactions if t.transaction_type == "expense"]

    base_income = sum(t.amount for t in income_txs) or stated_income or 50000.0
    base_expenses = sum(t.amount for t in expense_txs) or 32000.0

    emis = db.query(EMI).filter(EMI.user_id == user.id, EMI.status == "Active").all()
    base_emi = sum(emi.emi_amount for emi in emis)

    # Baseline calculations
    base_savings = max(0.0, base_income - base_expenses)
    base_savings_rate = round((base_savings / base_income * 100), 1) if base_income > 0 else 0.0
    base_dti = round((base_emi / base_income * 100), 1) if base_income > 0 else 0.0
    base_essential = (base_expenses * 0.6) + base_emi
    base_coverage = round((base_balance / base_essential), 1) if base_essential > 0 else 2.5

    # Simulated modifications
    sim_income = max(1000.0, base_income + req.salary_change)
    sim_expenses = max(1000.0, base_expenses + req.expense_change)
    sim_emi = max(0.0, base_emi + req.new_emi_amount + req.emi_change)
    sim_balance = max(0.0, base_balance + req.additional_savings - req.one_time_expense)

    sim_savings = sim_income - sim_expenses - (req.new_emi_amount + req.emi_change)
    sim_savings_rate = round((sim_savings / sim_income * 100), 1) if sim_income > 0 else 0.0
    sim_dti = round((sim_emi / sim_income * 100), 1) if sim_income > 0 else 0.0
    sim_essential = (sim_expenses * 0.6) + sim_emi
    sim_coverage = round((sim_balance / sim_essential), 1) if sim_essential > 0 else 1.0

    # Score calculation helper
    def compute_score(inc: float, exp: float, emi_amt: float, bal: float) -> int:
        pts = 0.0
        # Income stability
        pts += 15.0 if inc >= 30000 else 10.0
        # Expense ratio
        er = exp / inc if inc > 0 else 1.0
        if er <= 0.50:
            pts += 20.0
        elif er <= 0.70:
            pts += 15.0
        elif er <= 0.85:
            pts += 10.0
        else:
            pts += 4.0
        # Savings rate
        sr = (inc - exp) / inc if inc > 0 else 0.0
        if sr >= 0.30:
            pts += 20.0
        elif sr >= 0.20:
            pts += 16.0
        elif sr >= 0.10:
            pts += 11.0
        elif sr > 0:
            pts += 6.0
        else:
            pts += 0.0
        # DTI
        cur_dti = emi_amt / inc if inc > 0 else 0.0
        if cur_dti == 0:
            pts += 15.0
        elif cur_dti <= 0.25:
            pts += 13.0
        elif cur_dti <= 0.40:
            pts += 9.0
        elif cur_dti <= 0.55:
            pts += 4.0
        else:
            pts += 0.0
        # Emergency coverage
        ess = (exp * 0.6) + emi_amt
        cov = bal / ess if ess > 0 else 1.0
        if cov >= 6.0:
            pts += 15.0
        elif cov >= 3.0:
            pts += 12.0
        elif cov >= 1.0:
            pts += 7.0
        else:
            pts += 2.0
        # Volatility & Cashflow buffer
        pts += 9.0 if (inc - exp - emi_amt) > 0 else 3.0
        return int(min(100, max(10, round(pts))))

    base_score = compute_score(base_income, base_expenses, base_emi, base_balance)
    sim_score = compute_score(sim_income, sim_expenses, sim_emi, sim_balance)

    def get_risk_label(s: int) -> str:
        return "LOW" if s >= 80 else ("MEDIUM" if s >= 60 else ("HIGH" if s >= 40 else "CRITICAL"))

    # Stress risk calculation
    base_stress = round(max(5.0, min(100.0, (100 - base_score) * 0.95 + base_dti * 0.3)), 1)
    sim_stress = round(max(5.0, min(100.0, (100 - sim_score) * 0.95 + sim_dti * 0.3)), 1)

    score_delta = sim_score - base_score
    savings_delta = round(sim_savings - base_savings, 2)
    coverage_delta = round(sim_coverage - base_coverage, 1)

    # Narrative insights
    insights: List[str] = []
    if score_delta > 0:
        insights.append(f"Simulation shows an improvement of +{score_delta} points to your Financial Health Score.")
    elif score_delta < 0:
        insights.append(f"Caution: This scenario reduces your Financial Health Score by {abs(score_delta)} points.")
    else:
        insights.append("Neutral impact on overall Financial Health Score.")

    if req.new_emi_amount > 0:
        insights.append(f"A new EMI of ₹{req.new_emi_amount:,.0f}/month raises your Debt-to-Income ratio to {sim_dti}%.")

    if savings_delta < 0:
        insights.append(f"Monthly surplus contracts by ₹{abs(savings_delta):,.0f} under this configuration.")
    elif savings_delta > 0:
        insights.append(f"Monthly cash flow strengthens with an extra ₹{savings_delta:,.0f} in savings capacity.")

    if sim_coverage < 3.0:
        insights.append(f"Warning: Emergency coverage shrinks to {sim_coverage} months (below recommended 3-month floor).")

    return {
        "baseline": {
            "health_score": base_score,
            "risk_level": get_risk_label(base_score),
            "monthly_income": round(base_income, 2),
            "monthly_expenses": round(base_expenses, 2),
            "monthly_savings": round(base_savings, 2),
            "savings_rate": base_savings_rate,
            "total_emi": round(base_emi, 2),
            "debt_to_income_ratio": base_dti,
            "emergency_coverage_months": base_coverage,
            "stress_risk_percent": base_stress
        },
        "simulated": {
            "health_score": sim_score,
            "risk_level": get_risk_label(sim_score),
            "monthly_income": round(sim_income, 2),
            "monthly_expenses": round(sim_expenses, 2),
            "monthly_savings": round(sim_savings, 2),
            "savings_rate": sim_savings_rate,
            "total_emi": round(sim_emi, 2),
            "debt_to_income_ratio": sim_dti,
            "emergency_coverage_months": sim_coverage,
            "stress_risk_percent": sim_stress
        },
        "score_delta": score_delta,
        "savings_delta": savings_delta,
        "coverage_delta": coverage_delta,
        "insights": insights
    }
