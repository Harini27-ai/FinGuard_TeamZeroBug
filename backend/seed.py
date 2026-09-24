from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.db import Base, init_db
from app.models import Transaction, User
from app.auth import hash_password
from app.services.demo_service import seed_demo_data_for_user

def seed():
    init_db()
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
    )
    Session = sessionmaker(bind=engine)
    db = Session()

    # 1. Seed legacy fraud engine demo transactions if empty
    if not db.query(Transaction).filter(Transaction.user_id == None).count():
        demo = [
            dict(account_id="ACC-1001", amount=850, merchant="Food Delivery", risk_score=0.08, action="APPROVE", behavior_score=0.04, graph_score=0, velocity_score=0.10, amount_score=0.01, reasons=["No major anomaly detected"]),
            dict(account_id="ACC-1002", amount=42000, merchant="Electronics", risk_score=0.49, action="STEP_UP", behavior_score=0.50, graph_score=0.20, velocity_score=0.30, amount_score=0.42, reasons=["New device detected", "Unusually large transaction amount"]),
            dict(account_id="ACC-1003", amount=92000, merchant="Unknown Crypto Exchange", risk_score=0.91, action="FREEZE", behavior_score=0.85, graph_score=0.65, velocity_score=0.80, amount_score=0.92, reasons=["New device detected", "Unusual location distance detected", "High transaction velocity"]),
            dict(account_id="ACC-1004", amount=1400, merchant="Retail Store", risk_score=0.11, action="APPROVE", behavior_score=0.05, graph_score=0, velocity_score=0.10, amount_score=0.01, reasons=["No major anomaly detected"])
        ]
        for x in demo:
            db.add(Transaction(
                **x, currency="INR", device_id="DEV-1", ip_address="10.0.0.1",
                country="IN", velocity_10m=1, device_change=False, location_distance_km=0,
                typing_deviation=0.1, mouse_deviation=0.1, category="Other", transaction_type="expense"
            ))
        db.commit()

    # 2. Seed standard demo evaluator user
    demo_email = "demo@finguard.ai"
    user = db.query(User).filter(User.email == demo_email).first()
    if not user:
        user = User(
            name="Rahul Sharma",
            email=demo_email,
            phone="+91 98765 43210",
            password_hash=hash_password("DemoPassword123!")
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    seed_demo_data_for_user(db, user)
    db.close()
    print("Seed complete! Demo user: demo@finguard.ai / DemoPassword123!")

if __name__ == "__main__":
    seed()
