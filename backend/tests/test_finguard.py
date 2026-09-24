import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.db import Base, get_db

# Use an in-memory SQLite database with StaticPool so all connections share the same memory DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_auth_registration_and_login():
    # 1. Register User A
    reg_payload = {
        "name": "Arun Kumar",
        "email": "arun@example.com",
        "phone": "+91 9988776655",
        "password": "SecurePassword123!"
    }
    r = client.post("/api/auth/register", json=reg_payload)
    assert r.status_code == 201
    auth_data = r.json()
    assert "access_token" in auth_data
    assert auth_data["user"]["email"] == "arun@example.com"
    token = auth_data["access_token"]

    # 2. Prevent duplicate email registration
    r_dup = client.post("/api/auth/register", json=reg_payload)
    assert r_dup.status_code == 400

    # 3. Login with credentials
    login_payload = {
        "email": "arun@example.com",
        "password": "SecurePassword123!"
    }
    r_login = client.post("/api/auth/login", json=login_payload)
    assert r_login.status_code == 200
    assert "access_token" in r_login.json()

    # 4. Fail login with wrong password
    r_bad = client.post("/api/auth/login", json={"email": "arun@example.com", "password": "WrongPassword"})
    assert r_bad.status_code == 401

    # 5. Access protected /api/auth/me
    headers = {"Authorization": f"Bearer {token}"}
    r_me = client.get("/api/auth/me", headers=headers)
    assert r_me.status_code == 200
    assert r_me.json()["name"] == "Arun Kumar"

    # 6. Reject unauthenticated access
    r_unauth = client.get("/api/auth/me")
    assert r_unauth.status_code == 401


def test_user_data_isolation():
    """
    CRITICAL: User A must NEVER be able to access User B's accounts, transactions,
    EMIs, goals, or alerts.
    """
    # Register User A
    r_a = client.post("/api/auth/register", json={
        "name": "User Alpha", "email": "alpha@example.com", "password": "Password123!"
    })
    token_a = r_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Register User B
    r_b = client.post("/api/auth/register", json={
        "name": "User Beta", "email": "beta@example.com", "password": "Password123!"
    })
    token_b = r_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates an account
    acc_res = client.post("/api/accounts", headers=headers_a, json={
        "bank_name": "HDFC Bank",
        "account_nickname": "Alpha Private Savings",
        "account_type": "Savings",
        "last4": "9999",
        "current_balance": 150000.0,
        "monthly_income": 80000.0
    })
    assert acc_res.status_code == 201
    account_a_id = acc_res.json()["id"]

    # User B lists accounts -> MUST NOT see User A's account
    b_accounts = client.get("/api/accounts", headers=headers_b).json()
    assert len(b_accounts) == 0

    # User B tries to fetch User A's account by ID -> MUST return 404
    b_get_a = client.get(f"/api/accounts/{account_a_id}", headers=headers_b)
    assert b_get_a.status_code == 404

    # User B tries to delete User A's account -> MUST return 404
    b_del_a = client.delete(f"/api/accounts/{account_a_id}", headers=headers_b)
    assert b_del_a.status_code == 404

    # User A creates an EMI
    emi_res = client.post("/api/emi", headers=headers_a, json={
        "lender": "SBI", "loan_name": "Home Loan", "principal_amount": 2500000.0,
        "outstanding_amount": 2000000.0, "emi_amount": 22000.0, "interest_rate": 8.5,
        "due_date": 10, "remaining_tenure": 120
    })
    assert emi_res.status_code == 201
    emi_a_id = emi_res.json()["id"]

    # User B attempts to access User A's EMI -> 404
    assert client.get(f"/api/emi/{emi_a_id}", headers=headers_b).status_code == 404
    assert len(client.get("/api/emi", headers=headers_b).json()) == 0


def test_transactions_and_monthly_summary():
    r = client.post("/api/auth/register", json={
        "name": "Priya Patel", "email": "priya@example.com", "password": "Password123!"
    })
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    # Add Income transaction
    r_inc = client.post("/api/transactions", headers=headers, json={
        "transaction_type": "income",
        "category": "Salary",
        "amount": 70000.0,
        "description": "Monthly Salary",
        "merchant": "Global Corp"
    })
    assert r_inc.status_code == 201

    # Add Expense transactions
    r_exp1 = client.post("/api/transactions", headers=headers, json={
        "transaction_type": "expense",
        "category": "Rent",
        "amount": 20000.0,
        "description": "Apartment Rent",
        "merchant": "Landlord"
    })
    assert r_exp1.status_code == 201

    r_exp2 = client.post("/api/transactions", headers=headers, json={
        "transaction_type": "expense",
        "category": "Food",
        "amount": 6500.0,
        "description": "Groceries",
        "merchant": "BigBasket"
    })
    assert r_exp2.status_code == 201

    # Summary
    summary = client.get("/api/transactions/summary", headers=headers).json()
    assert summary["total_income"] == 70000.0
    assert summary["total_expenses"] == 26500.0
    assert summary["net_savings"] == 43500.0
    assert len(summary["category_breakdown"]) == 2


def test_financial_health_score_and_prediction():
    r = client.post("/api/auth/register", json={
        "name": "Karthik", "email": "karthik@example.com", "password": "Password123!"
    })
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    # Seed demo data for quick realistic metrics
    client.post("/api/demo/seed", headers=headers)

    # 1. Financial Health Score
    r_score = client.get("/api/financial-score", headers=headers)
    assert r_score.status_code == 200
    score_data = r_score.json()
    assert 0 <= score_data["score"] <= 100
    assert score_data["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert len(score_data["contributing_factors"]) > 0
    assert len(score_data["improvement_suggestions"]) > 0

    # 2. Stress Prediction
    r_pred = client.get("/api/prediction", headers=headers)
    assert r_pred.status_code == 200
    pred_data = r_pred.json()
    assert 0 <= pred_data["stress_score"] <= 100
    assert pred_data["risk_category"] in ["LOW", "MEDIUM", "HIGH", "SEVERE"]
    assert len(pred_data["major_risk_factors"]) > 0

    # 3. Day 25 Early Warning
    r_d25 = client.get("/api/day25-warning", headers=headers)
    assert r_d25.status_code == 200
    d25_data = r_d25.json()
    assert "projected_balance" in d25_data
    assert "safe_buffer" in d25_data

    # 4. Emergency Fund
    r_emg = client.get("/api/emergency-fund", headers=headers)
    assert r_emg.status_code == 200
    assert "coverage_months" in r_emg.json()


def test_what_if_simulator_non_destructive():
    r = client.post("/api/auth/register", json={
        "name": "Sim User", "email": "sim@example.com", "password": "Password123!"
    })
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    client.post("/api/demo/seed", headers=headers)

    # Run simulator with salary decrease
    sim_payload = {
        "salary_change": -10000.0,
        "expense_change": 5000.0,
        "new_emi_amount": 4000.0
    }
    r_sim = client.post("/api/simulator", headers=headers, json=sim_payload)
    assert r_sim.status_code == 200
    res = r_sim.json()
    assert "baseline" in res
    assert "simulated" in res
    assert res["score_delta"] != 0 or res["savings_delta"] != 0
    assert len(res["insights"]) > 0

    # Verify database was NOT mutated
    accounts = client.get("/api/accounts", headers=headers).json()
    assert len(accounts) > 0  # Still intact


def test_ai_assistant_scoped():
    r = client.post("/api/auth/register", json={
        "name": "Assistant User", "email": "assistant@example.com", "password": "Password123!"
    })
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    client.post("/api/demo/seed", headers=headers)

    r_chat = client.post("/api/assistant/chat", headers=headers, json={
        "question": "Where am I spending the most?"
    })
    assert r_chat.status_code == 200
    chat_data = r_chat.json()
    assert "answer" in chat_data
    assert len(chat_data["suggested_followups"]) > 0
    assert "disclaimer" in chat_data


def test_legacy_fraud_routes_preserved():
    # 1. /api/transactions/simulate
    r_sim = client.post("/api/transactions/simulate")
    assert r_sim.status_code == 200
    tx_sim = r_sim.json()
    assert "risk_score" in tx_sim
    assert "action" in tx_sim

    # 2. /api/transactions/score
    score_payload = {
        "account_id": "ACC-1001",
        "amount": 82000,
        "currency": "INR",
        "merchant": "Unknown Crypto Exchange",
        "device_id": "DEV-99",
        "ip_address": "185.91.22.7",
        "country": "IN",
        "velocity_10m": 7,
        "device_change": True,
        "location_distance_km": 420,
        "typing_deviation": 0.68,
        "mouse_deviation": 0.55
    }
    r_score = client.post("/api/transactions/score", json=score_payload)
    assert r_score.status_code == 200
    tx_scored = r_score.json()
    assert tx_scored["risk_score"] > 0
    assert tx_scored["action"] in ["APPROVE", "STEP_UP", "FREEZE"]

    # 3. Unauthenticated /api/dashboard returns legacy fields
    r_dash = client.get("/api/dashboard")
    assert r_dash.status_code == 200
    dash_data = r_dash.json()
    assert "total" in dash_data
    assert "high_risk" in dash_data
    assert "step_up" in dash_data
    assert "approved" in dash_data
    assert "avg_risk" in dash_data
    assert "recent" in dash_data
