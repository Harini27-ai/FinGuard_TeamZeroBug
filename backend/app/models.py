from datetime import datetime, timezone
from sqlalchemy import (
    Column, DateTime, Float, Integer, String, Boolean, JSON, ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship
from .db import Base


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    accounts = relationship("FinancialAccount", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    emis = relationship("EMI", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("FinancialGoal", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")
    anomalies = relationship("SpendingAnomaly", back_populates="user", cascade="all, delete-orphan")
    scores = relationship("FinancialScoreRecord", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("MonthlyReport", back_populates="user", cascade="all, delete-orphan")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    refresh_token = Column(String(500), index=True, nullable=True)
    ip_address = Column(String(100), nullable=True)
    user_agent = Column(String(255), nullable=True)
    is_revoked = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="sessions")


class FinancialAccount(Base):
    __tablename__ = "financial_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    bank_name = Column(String(100), nullable=False)
    account_nickname = Column(String(100), nullable=False)
    account_type = Column(String(50), default="Savings")  # Savings, Current, Salary, Credit Card, Investment
    last4 = Column(String(4), nullable=False)
    current_balance = Column(Float, default=0.0)
    monthly_income = Column(Float, default=0.0)
    account_status = Column(String(30), default="Active")  # Active, Inactive, Frozen
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account_ref")


class Transaction(Base):
    __tablename__ = "transactions"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # User association (nullable for backward compatibility with existing fraud engine demo rows)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    account_ref_id = Column(Integer, ForeignKey("financial_accounts.id", ondelete="SET NULL"), nullable=True, index=True)

    # Personal finance fields
    transaction_type = Column(String(20), default="expense")  # income, expense, transfer
    category = Column(String(50), default="Other")            # Food, Transport, Shopping, Bills, Rent, EMI, Education, Healthcare, Entertainment, Investments, Salary, Other
    description = Column(String(255), default="")
    transaction_date = Column(DateTime(timezone=True), default=utc_now)

    # Legacy & Fraud engine fields (PRESERVED 100%)
    account_id = Column(String(64), index=True, default="ACC-1001")
    amount = Column(Float, default=0.0)
    currency = Column(String(8), default="INR")
    merchant = Column(String(200), default="Online Merchant")
    device_id = Column(String(100), default="DEV-1")
    ip_address = Column(String(100), default="127.0.0.1")
    country = Column(String(8), default="IN")
    velocity_10m = Column(Integer, default=0)
    device_change = Column(Boolean, default=False)
    location_distance_km = Column(Float, default=0)
    typing_deviation = Column(Float, default=0)
    mouse_deviation = Column(Float, default=0)
    graph_score = Column(Float, default=0)
    behavior_score = Column(Float, default=0)
    velocity_score = Column(Float, default=0)
    amount_score = Column(Float, default=0)
    risk_score = Column(Float, default=0)
    action = Column(String(30), default="APPROVE")
    reasons = Column(JSON, default=list)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    user = relationship("User", back_populates="transactions")
    account_ref = relationship("FinancialAccount", back_populates="transactions")


class EMI(Base):
    __tablename__ = "emis"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    lender = Column(String(100), nullable=False)
    loan_name = Column(String(100), nullable=False)
    principal_amount = Column(Float, default=0.0)
    outstanding_amount = Column(Float, default=0.0)
    emi_amount = Column(Float, default=0.0)
    interest_rate = Column(Float, default=0.0)
    due_date = Column(Integer, default=5)          # Day of month (1-31)
    remaining_tenure = Column(Integer, default=12) # In months
    status = Column(String(30), default="Active")  # Active, Closed, Paused
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="emis")


class FinancialGoal(Base):
    __tablename__ = "financial_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    goal_name = Column(String(100), nullable=False)
    goal_type = Column(String(50), default="Custom")  # Emergency fund, Vacation, Education, Vehicle, Home, Investment, Custom
    target_amount = Column(Float, default=0.0)
    current_amount = Column(Float, default=0.0)
    target_date = Column(DateTime, nullable=True)
    monthly_contribution = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="goals")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    alert_type = Column(String(50), nullable=False)  # EMI_DUE, LOW_BALANCE, HIGH_SPENDING, ANOMALY, STRESS_INCREASE, DAY25_WARNING, GOAL_MILESTONE, EMERGENCY_FUND
    title = Column(String(150), nullable=False)
    message = Column(String(500), nullable=False)
    severity = Column(String(20), default="INFO")    # INFO, WARNING, CRITICAL
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="alerts")


class SpendingAnomaly(Base):
    __tablename__ = "spending_anomalies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_id = Column(Integer, nullable=True)
    anomaly_type = Column(String(50), default="UNUSUAL_AMOUNT")
    category = Column(String(50), nullable=False)
    amount = Column(Float, default=0.0)
    description = Column(String(255), nullable=False)
    severity = Column(String(20), default="MEDIUM")   # LOW, MEDIUM, HIGH
    status = Column(String(30), default="Pending")    # Pending, Expected, Unexpected
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="anomalies")


class FinancialScoreRecord(Base):
    __tablename__ = "financial_score_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Float, default=70.0)
    risk_level = Column(String(20), default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    metrics_snapshot = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="scores")


class MonthlyReport(Base):
    __tablename__ = "monthly_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    month_year = Column(String(7), index=True)  # "YYYY-MM"
    total_income = Column(Float, default=0.0)
    total_expenses = Column(Float, default=0.0)
    total_savings = Column(Float, default=0.0)
    total_emi = Column(Float, default=0.0)
    health_score = Column(Float, default=70.0)
    risk_level = Column(String(20), default="MEDIUM")
    category_breakdown = Column(JSON, default=dict)
    mom_comparison = Column(JSON, default=dict)
    recommendations = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="reports")
