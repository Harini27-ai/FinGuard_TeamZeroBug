from abc import ABC, abstractmethod
from typing import Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session
from ..models import User, FinancialAccount, Transaction, EMI


class StressPredictorBase(ABC):
    @abstractmethod
    def predict(self, db: Session, user: User) -> Dict[str, Any]:
        """Predicts financial stress metrics for the user."""
        pass


class RuleBasedStressPredictor(StressPredictorBase):
    """
    Modular financial stress prediction engine.
    Analyzes cash-flow velocity, debt-to-income leverage, emergency liquidity deficit,
    and end-of-month cash depletion risk.
    """

    def predict(self, db: Session, user: User) -> Dict[str, Any]:
        # Fetch user financial records
        accounts = db.query(FinancialAccount).filter(FinancialAccount.user_id == user.id).all()
        total_balance = sum(acc.current_balance for acc in accounts)
        stated_income = sum(acc.monthly_income for acc in accounts)

        transactions = db.query(Transaction).filter(Transaction.user_id == user.id).all()
        income_txs = [t for t in transactions if t.transaction_type == "income"]
        expense_txs = [t for t in transactions if t.transaction_type == "expense"]

        monthly_income = sum(t.amount for t in income_txs) or stated_income or 50000.0
        monthly_expenses = sum(t.amount for t in expense_txs) or 32000.0

        emis = db.query(EMI).filter(EMI.user_id == user.id, EMI.status == "Active").all()
        total_emi = sum(emi.emi_amount for emi in emis)

        # Baseline metrics
        expense_ratio = monthly_expenses / monthly_income if monthly_income > 0 else 1.0
        dti = total_emi / monthly_income if monthly_income > 0 else 0.0
        essential_expenses = (monthly_expenses * 0.6) + total_emi
        emergency_months = total_balance / essential_expenses if essential_expenses > 0 else 2.0

        # Calculate Stress Factors (Score: 0 to 100%)
        # Base stress from expense ratio (up to 35%)
        # Base stress from DTI (up to 30%)
        # Base stress from low emergency coverage (up to 25%)
        # Base stress from high discretionary spend (up to 10%)
        stress_pts = 0.0
        risk_factors: List[str] = []
        actions: List[str] = []

        # 1. Expense Ratio Impact
        if expense_ratio > 0.85:
            stress_pts += 32.0
            risk_factors.append(f"Expenses consume {expense_ratio*100:.0f}% of total monthly earnings.")
            actions.append("Cap discretionary eating out and online shopping to preserve liquidity.")
        elif expense_ratio > 0.70:
            stress_pts += 20.0
            risk_factors.append(f"Elevated expense-to-income ratio ({expense_ratio*100:.0f}%).")
            actions.append("Audit recurring subscriptions and utilities for 10% reduction.")
        elif expense_ratio > 0.50:
            stress_pts += 10.0
        else:
            stress_pts += 4.0

        # 2. EMI Burden Impact
        if dti > 0.50:
            stress_pts += 30.0
            risk_factors.append(f"Heavy EMI commitments ({dti*100:.0f}% DTI) severely limit liquidity.")
            actions.append("Avoid any new credit obligations and prioritize prepaying highest-interest loans.")
        elif dti > 0.35:
            stress_pts += 18.0
            risk_factors.append(f"Moderate-to-high EMI burden ({dti*100:.0f}% of income).")
            actions.append("Refinance or consolidate high-interest credit lines if possible.")
        elif dti > 0.15:
            stress_pts += 8.0
        else:
            stress_pts += 2.0

        # 3. Emergency Coverage Impact
        if emergency_months < 1.0:
            stress_pts += 25.0
            risk_factors.append(f"Critically thin emergency buffer ({emergency_months:.1f} months vs 6 months required).")
            actions.append("Divert next incoming bonus or savings directly to an emergency liquid reserve.")
        elif emergency_months < 3.0:
            stress_pts += 15.0
            risk_factors.append(f"Sub-optimal emergency reserve ({emergency_months:.1f} months coverage).")
            actions.append("Build emergency buffer to at least 3 months of essential overhead.")
        elif emergency_months < 6.0:
            stress_pts += 6.0
        else:
            stress_pts += 1.0

        # 4. Cash Flow & Balance Buffer
        monthly_net = monthly_income - monthly_expenses
        if monthly_net < 0:
            stress_pts += 12.0
            risk_factors.append(f"Net monthly deficit of ₹{abs(monthly_net):,.0f} depleting savings.")
        elif total_balance < total_emi * 1.5:
            stress_pts += 8.0
            risk_factors.append(f"Account balance (₹{total_balance:,.0f}) is tight relative to upcoming EMIs (₹{total_emi:,.0f}).")
            actions.append("Ensure balance remains at least 1.5x of monthly EMI before the 5th of next month.")

        final_stress_score = round(min(100.0, max(5.0, stress_pts)), 1)

        # Categorize
        if final_stress_score >= 70:
            risk_category = "SEVERE"
            projected_period = "Immediate (Next 7–14 days)"
        elif final_stress_score >= 50:
            risk_category = "HIGH"
            projected_period = "End of current billing cycle (Day 24–28)"
        elif final_stress_score >= 30:
            risk_category = "MEDIUM"
            projected_period = "Next 30–45 days"
        else:
            risk_category = "LOW"
            projected_period = "Low foreseeable risk in the next 90 days"

        if not risk_factors:
            risk_factors = ["Cash flow is stable with no acute leverage vulnerabilities."]
        if not actions:
            actions = ["Maintain disciplined budget allocations and continue monthly savings."]

        return {
            "stress_score": final_stress_score,
            "risk_category": risk_category,
            "projected_stress_period": projected_period,
            "major_risk_factors": risk_factors,
            "recommended_actions": actions,
            "model_type": "FinGuard Hybrid Rule-ML Stress Engine v1.0"
        }


# Default engine instance (can be swapped with an ML-trained instance)
default_stress_engine = RuleBasedStressPredictor()


def predict_financial_stress(db: Session, user: User) -> Dict[str, Any]:
    return default_stress_engine.predict(db, user)
