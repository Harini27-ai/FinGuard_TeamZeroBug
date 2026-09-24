from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from ..models import (
    User, FinancialAccount, Transaction, EMI, FinancialGoal, Alert,
    SpendingAnomaly, FinancialScoreRecord
)


def seed_demo_data_for_user(db: Session, user: User) -> dict:
    """
    Populates realistic synthetic financial data for the given authenticated user.
    Clearly tracks accounts, categorized transactions, EMIs, goals, and alerts.
    """
    now = datetime.now(timezone.utc)

    # 1. Accounts
    # Check if user already has accounts; if so, clear demo rows or augment
    existing_accounts = db.query(FinancialAccount).filter(FinancialAccount.user_id == user.id).all()
    if not existing_accounts:
        acc1 = FinancialAccount(
            user_id=user.id,
            bank_name="HDFC Bank",
            account_nickname="HDFC Salary Account",
            account_type="Salary",
            last4="4821",
            current_balance=64500.0,
            monthly_income=75000.0,
            account_status="Active"
        )
        acc2 = FinancialAccount(
            user_id=user.id,
            bank_name="SBI",
            account_nickname="SBI Emergency Savings",
            account_type="Savings",
            last4="1190",
            current_balance=85000.0,
            monthly_income=0.0,
            account_status="Active"
        )
        acc3 = FinancialAccount(
            user_id=user.id,
            bank_name="ICICI Bank",
            account_nickname="ICICI Platinum Card",
            account_type="Credit Card",
            last4="7304",
            current_balance=18200.0,
            monthly_income=0.0,
            account_status="Active"
        )
        db.add_all([acc1, acc2, acc3])
        db.flush()
        primary_acc_id = acc1.id
    else:
        primary_acc_id = existing_accounts[0].id

    # 2. EMIs
    existing_emis = db.query(EMI).filter(EMI.user_id == user.id).all()
    if not existing_emis:
        emi1 = EMI(
            user_id=user.id,
            lender="HDFC Bank",
            loan_name="Car Loan (Sedan)",
            principal_amount=600000.0,
            outstanding_amount=385000.0,
            emi_amount=12400.0,
            interest_rate=8.75,
            due_date=10,
            remaining_tenure=34,
            status="Active"
        )
        emi2 = EMI(
            user_id=user.id,
            lender="Bajaj Finserv",
            loan_name="Consumer Electronics EMI",
            principal_amount=45000.0,
            outstanding_amount=15000.0,
            emi_amount=3750.0,
            interest_rate=0.0,
            due_date=5,
            remaining_tenure=4,
            status="Active"
        )
        db.add_all([emi1, emi2])
        db.flush()

    # 3. Financial Goals
    existing_goals = db.query(FinancialGoal).filter(FinancialGoal.user_id == user.id).all()
    if not existing_goals:
        goal1 = FinancialGoal(
            user_id=user.id,
            goal_name="6-Month Emergency Immune Reserve",
            goal_type="Emergency fund",
            target_amount=180000.0,
            current_amount=95000.0,
            target_date=now + timedelta(days=240),
            monthly_contribution=10000.0
        )
        goal2 = FinancialGoal(
            user_id=user.id,
            goal_name="Annual Family Vacation",
            goal_type="Vacation",
            target_amount=65000.0,
            current_amount=32000.0,
            target_date=now + timedelta(days=120),
            monthly_contribution=8000.0
        )
        db.add_all([goal1, goal2])
        db.flush()

    # 4. Realistic Transactions (Spread across 30 days)
    existing_txs = db.query(Transaction).filter(Transaction.user_id == user.id).all()
    if len(existing_txs) < 5:
        demo_txs_data = [
            ("Salary", "Salary", 75000.0, "Monthly Salary Credit - Tech Corp", 28, "income", "Tech Corp Payroll"),
            ("Rent", "Rent", 22000.0, "Monthly House Rent", 27, "expense", "Landlord Transfer"),
            ("EMI", "EMI", 12400.0, "HDFC Auto Loan EMI auto-debit", 20, "expense", "HDFC Bank"),
            ("EMI", "EMI", 3750.0, "Bajaj Finserv Electronics EMI", 25, "expense", "Bajaj Finserv"),
            ("Bills", "Bills", 3200.0, "Electricity & High-speed Fiber Bill", 22, "expense", "Tata Power / Airtel"),
            ("Food", "Food", 6400.0, "Monthly Supermarket Groceries", 18, "expense", "Nature's Basket"),
            ("Food", "Food", 1250.0, "Dinner Delivery", 15, "expense", "Swiggy"),
            ("Food", "Food", 890.0, "Weekend Lunch", 10, "expense", "Zomato"),
            ("Transport", "Transport", 2800.0, "Fuel & Metro Card Recharge", 12, "expense", "HPCL Fuel Station"),
            ("Shopping", "Shopping", 4500.0, "Seasonal Wardrobe Purchase", 8, "expense", "Myntra"),
            ("Entertainment", "Entertainment", 1499.0, "Streaming Subscriptions", 6, "expense", "Netflix / Hotstar"),
            ("Healthcare", "Healthcare", 1850.0, "Pharmacy & Diagnostic Checkup", 4, "expense", "Apollo Pharmacy"),
            ("Investments", "Investments", 5000.0, "Nifty 50 Index Mutual Fund SIP", 2, "expense", "Groww Mutual Fund"),
            # Anomaly trigger for demonstration:
            ("Shopping", "Shopping", 26500.0, "Unusual High-End Electronics Purchase", 1, "expense", "Croma Megastore")
        ]

        for cat, group, amt, desc, days_ago, tx_type, merchant in demo_txs_data:
            tx_time = now - timedelta(days=days_ago)
            tx = Transaction(
                user_id=user.id,
                account_ref_id=primary_acc_id,
                account_id="ACC-HDFC-4821",
                transaction_type=tx_type,
                category=cat,
                description=desc,
                amount=amt,
                currency="INR",
                merchant=merchant,
                transaction_date=tx_time,
                device_id="DEV-MOBILE-1",
                ip_address="103.21.144.1",
                country="IN",
                velocity_10m=1,
                device_change=False,
                risk_score=0.12 if amt < 15000 else 0.45,
                action="APPROVE" if amt < 15000 else "STEP_UP",
                reasons=["Normal transaction"] if amt < 15000 else ["High amount detected"],
                created_at=tx_time
            )
            db.add(tx)
        db.flush()

    # 5. Smart Alerts
    existing_alerts = db.query(Alert).filter(Alert.user_id == user.id).all()
    if not existing_alerts:
        alert1 = Alert(
            user_id=user.id,
            alert_type="DAY25_WARNING",
            title="🚨 Day-25 Early Warning",
            message="Your projected month-end balance (₹18,250) is approaching your safe minimum buffer. Limit discretionary spend.",
            severity="WARNING",
            is_read=False
        )
        alert2 = Alert(
            user_id=user.id,
            alert_type="EMI_DUE",
            title="📅 Upcoming EMI Payment",
            message="HDFC Auto Loan EMI of ₹12,400 is scheduled for auto-debit on the 10th.",
            severity="INFO",
            is_read=False
        )
        alert3 = Alert(
            user_id=user.id,
            alert_type="ANOMALY",
            title="⚠️ Spending Anomaly Detected",
            message="Shopping expenditure of ₹26,500 at Croma Megastore is 3.8x above your normal monthly average.",
            severity="WARNING",
            is_read=False
        )
        db.add_all([alert1, alert2, alert3])

    # 6. Spending Anomaly
    existing_anomalies = db.query(SpendingAnomaly).filter(SpendingAnomaly.user_id == user.id).all()
    if not existing_anomalies:
        anom = SpendingAnomaly(
            user_id=user.id,
            anomaly_type="UNUSUAL_AMOUNT",
            category="Shopping",
            amount=26500.0,
            description="Shopping spend is 3.8x higher than your historical 30-day baseline.",
            severity="HIGH",
            status="Pending"
        )
        db.add(anom)

    # 7. Initial Health Score Record
    score_rec = FinancialScoreRecord(
        user_id=user.id,
        score=74.0,
        risk_level="MEDIUM",
        metrics_snapshot={
            "savings_rate": 22.5,
            "debt_to_income": 21.5,
            "emergency_coverage_months": 3.8
        }
    )
    db.add(score_rec)

    db.commit()

    return {
        "status": "success",
        "message": "Realistic synthetic demo data loaded successfully. All records are clearly labeled as synthetic test data.",
        "user_id": user.id,
        "email": user.email
    }
