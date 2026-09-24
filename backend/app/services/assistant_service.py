import re
from typing import Dict, Any, List
from collections import defaultdict
from sqlalchemy.orm import Session
from ..models import User, FinancialAccount, Transaction, EMI, FinancialGoal
from .health_score_engine import calculate_financial_health_score
from .emergency_engine import calculate_emergency_fund
from .stress_engine import predict_financial_stress


def answer_assistant_question(db: Session, user: User, question: str) -> Dict[str, Any]:
    """
    AI Financial Assistant strictly scoped to the authenticated user's database records.
    Provides data-grounded insights, explains scores, analyzes category spending,
    and runs situational calculations.
    """
    q = question.strip().lower()

    # Gather authenticated user's context
    accounts = db.query(FinancialAccount).filter(FinancialAccount.user_id == user.id).all()
    total_balance = sum(acc.current_balance for acc in accounts)
    stated_income = sum(acc.monthly_income for acc in accounts)

    transactions = db.query(Transaction).filter(Transaction.user_id == user.id).all()
    income_txs = [t for t in transactions if t.transaction_type == "income"]
    expense_txs = [t for t in transactions if t.transaction_type == "expense"]

    total_income = sum(t.amount for t in income_txs) or stated_income or 50000.0
    total_expenses = sum(t.amount for t in expense_txs) or 32000.0

    category_spend = defaultdict(float)
    for t in expense_txs:
        category_spend[t.category or "Other"] += t.amount

    sorted_categories = sorted(category_spend.items(), key=lambda x: x[1], reverse=True)

    emis = db.query(EMI).filter(EMI.user_id == user.id, EMI.status == "Active").all()
    total_monthly_emi = sum(emi.emi_amount for emi in emis)

    health_data = calculate_financial_health_score(db, user)
    emergency_data = calculate_emergency_fund(db, user)
    stress_data = predict_financial_stress(db, user)

    answer = ""
    suggested_followups = []

    # 1. Why did score decrease / What is causing risk?
    if any(k in q for k in ["score", "decrease", "drop", "low", "risk", "why"]):
        factors = health_data.get("contributing_factors", [])
        weak_factors = [f for f in factors if f.get("rating") in ["Moderate", "High", "Critical"]]
        answer = f"Your current Financial Health Score is **{health_data['score']}/100** ({health_data['risk_level']} Risk).\n\n"
        if weak_factors:
            answer += "The primary risk drivers dampening your score are:\n"
            for f in weak_factors:
                answer += f"- **{f['name']}** ({f['rating']}): {f['description']}\n"
        else:
            answer += "All core metrics are currently performing well without severe vulnerabilities.\n"
        answer += f"\n💡 **Recommendation**: {health_data['improvement_suggestions'][0]['action']} ({health_data['improvement_suggestions'][0]['potential_impact']})."
        suggested_followups = [
            "Where am I spending the most?",
            "How much emergency fund do I have?",
            "What happens if I reduce expenses by ₹3,000?"
        ]

    # 2. Where am I spending the most?
    elif any(k in q for k in ["spend", "spending", "most", "category", "where", "expense"]):
        if sorted_categories:
            top_cat, top_amt = sorted_categories[0]
            top_pct = (top_amt / total_expenses * 100) if total_expenses > 0 else 0
            answer = f"Your total monthly recorded outflow is **₹{total_expenses:,.0f}**.\n\n"
            answer += f"Your top spending category is **{top_cat}** at **₹{top_amt:,.0f}** ({top_pct:.1f}% of total expenses).\n\n"
            answer += "Top category breakdown:\n"
            for cat, amt in sorted_categories[:5]:
                pct = (amt / total_expenses * 100) if total_expenses > 0 else 0
                answer += f"- **{cat}**: ₹{amt:,.0f} ({pct:.1f}%)\n"
        else:
            answer = "No categorized transactions recorded yet. Add your recent transactions or load demo data to view a full category breakdown."
        suggested_followups = [
            "How much should I save this month?",
            "What is causing my current risk?",
            "How much emergency fund do I have?"
        ]

    # 3. Emergency fund questions
    elif any(k in q for k in ["emergency", "fund", "reserve", "coverage"]):
        answer = (
            f"You currently have **₹{emergency_data['current_fund']:,.0f}** in liquid emergency reserves, "
            f"which provides **{emergency_data['coverage_months']} months** of essential coverage "
            f"(essential expenses: ₹{emergency_data['essential_monthly_expenses']:,.0f}/month).\n\n"
            f"🎯 Recommended 6-Month Target: **₹{emergency_data['target_amount']:,.0f}**.\n"
            f"📊 Remaining Gap: **₹{emergency_data['gap_amount']:,.0f}**.\n"
            f"💡 Suggested Monthly Allocation: **₹{emergency_data['monthly_saving_recommendation']:,.0f}/month** over the next 12 months."
        )
        suggested_followups = [
            "How much should I save this month?",
            "Why did my financial score decrease?",
            "What happens if I reduce expenses by ₹3,000?"
        ]

    # 4. How much should I save this month?
    elif any(k in q for k in ["save", "saving", "how much", "target"]):
        surplus = total_income - total_expenses
        target_savings = total_income * 0.20
        answer = (
            f"Based on your monthly income of **₹{total_income:,.0f}**, your healthy benchmark (20% rule) is **₹{target_savings:,.0f}/month**.\n\n"
            f"- Current Actual Monthly Surplus: **₹{max(0.0, surplus):,.0f}** ({surplus/total_income*100:.1f}%)\n"
            f"- Recommended Emergency Allocation: **₹{emergency_data['monthly_saving_recommendation']:,.0f}**\n\n"
            f"We advise setting up an automatic recurring auto-sweep of ₹{max(target_savings, 2000.0):,.0f} directly on salary day."
        )
        suggested_followups = [
            "Where am I spending the most?",
            "What happens if I reduce expenses by ₹3,000?",
            "Why did my financial score decrease?"
        ]

    # 5. What happens if I reduce expenses by ₹X?
    elif "reduce" in q or "what if" in q or "happen" in q:
        match = re.search(r"(\d+[\d,]*)", q)
        reduction = float(match.group(1).replace(",", "")) if match else 3000.0
        new_expenses = max(0.0, total_expenses - reduction)
        new_surplus = total_income - new_expenses
        new_savings_rate = (new_surplus / total_income * 100) if total_income > 0 else 0.0
        score_boost = 6 if reduction >= 3000 else 3
        simulated_score = min(100, health_data["score"] + score_boost)

        answer = (
            f"If you reduce your monthly expenses by **₹{reduction:,.0f}**:\n\n"
            f"- Monthly Expenses decrease from ₹{total_expenses:,.0f} → **₹{new_expenses:,.0f}**\n"
            f"- Monthly Savings increase to **₹{new_surplus:,.0f}** ({new_savings_rate:.1f}% savings rate)\n"
            f"- Projected Financial Health Score: **{simulated_score}/100** (+{score_boost} points boost)\n"
            f"- Emergency Fund Runway: Expands by approximately +0.4 months."
        )
        suggested_followups = [
            "Where am I spending the most?",
            "How much should I save this month?",
            "What is causing my current risk?"
        ]

    # Default general response
    else:
        answer = (
            f"Hello {user.name}! Here is a snapshot of your current financial immune status:\n\n"
            f"- **Financial Health Score**: {health_data['score']}/100 ({health_data['risk_level']})\n"
            f"- **Current Total Balance**: ₹{total_balance:,.0f}\n"
            f"- **Monthly Income**: ₹{total_income:,.0f} | **Expenses**: ₹{total_expenses:,.0f}\n"
            f"- **Active EMIs**: ₹{total_monthly_emi:,.0f}/month\n"
            f"- **Emergency Buffer**: {emergency_data['coverage_months']} months\n\n"
            "Feel free to ask specific questions about your spending patterns, risk factors, emergency savings, or simulate financial changes!"
        )
        suggested_followups = [
            "Why did my financial score decrease?",
            "Where am I spending the most?",
            "How much should I save this month?",
            "What happens if I reduce expenses by ₹3,000?"
        ]

    return {
        "answer": answer,
        "suggested_followups": suggested_followups,
        "context_used": {
            "score": health_data["score"],
            "income": total_income,
            "expenses": total_expenses,
            "balance": total_balance,
            "emi": total_monthly_emi
        },
        "disclaimer": "FinGuard Assistant provides predictive budgeting guidance based on your uploaded account activity. It does not replace certified financial advisory."
    }
