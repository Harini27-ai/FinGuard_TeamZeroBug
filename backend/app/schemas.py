from datetime import datetime
from typing import Any, Optional, List, Dict
from pydantic import BaseModel, Field, EmailStr


# ==========================================
# 1. USER & AUTH SCHEMAS
# ==========================================

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


# ==========================================
# 2. FINANCIAL ACCOUNT SCHEMAS
# ==========================================

class AccountCreate(BaseModel):
    bank_name: str = Field(..., min_length=2, max_length=100)
    account_nickname: str = Field(..., min_length=2, max_length=100)
    account_type: str = Field("Savings", description="Savings, Current, Salary, Credit Card, Investment")
    last4: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")
    current_balance: float = Field(default=0.0, ge=0)
    monthly_income: float = Field(default=0.0, ge=0)
    account_status: str = Field("Active")


class AccountUpdate(BaseModel):
    bank_name: Optional[str] = None
    account_nickname: Optional[str] = None
    account_type: Optional[str] = None
    last4: Optional[str] = Field(None, min_length=4, max_length=4, pattern=r"^\d{4}$")
    current_balance: Optional[float] = None
    monthly_income: Optional[float] = None
    account_status: Optional[str] = None


class AccountOut(BaseModel):
    id: int
    user_id: int
    bank_name: str
    account_nickname: str
    account_type: str
    last4: str
    current_balance: float
    monthly_income: float
    account_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# 3. TRANSACTION SCHEMAS
# ==========================================

class TransactionIn(BaseModel):
    # Backward compatibility with existing Fraud Engine input
    account_id: str = "ACC-1001"
    amount: float = Field(gt=0)
    currency: str = "INR"
    merchant: str = "Online Merchant"
    device_id: str = "DEV-1"
    ip_address: str = "127.0.0.1"
    country: str = "IN"
    velocity_10m: int = Field(default=1, ge=0)
    device_change: bool = False
    location_distance_km: float = Field(default=0, ge=0)
    typing_deviation: float = Field(default=0, ge=0, le=1)
    mouse_deviation: float = Field(default=0, ge=0, le=1)


class TransactionCreate(BaseModel):
    account_ref_id: Optional[int] = None
    account_id: Optional[str] = "ACC-1001"
    transaction_type: str = Field("expense", description="income, expense, transfer")
    category: str = Field("Other", description="Food, Transport, Shopping, Bills, Rent, EMI, Education, Healthcare, Entertainment, Investments, Salary, Other")
    amount: float = Field(gt=0)
    description: str = Field(default="")
    transaction_date: Optional[datetime] = None
    merchant: Optional[str] = "Merchant"
    currency: str = "INR"


class TransactionUpdate(BaseModel):
    account_ref_id: Optional[int] = None
    transaction_type: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    description: Optional[str] = None
    transaction_date: Optional[datetime] = None
    merchant: Optional[str] = None


class TransactionOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    account_ref_id: Optional[int] = None
    transaction_type: str = "expense"
    category: str = "Other"
    description: Optional[str] = ""
    transaction_date: Optional[datetime] = None
    account_id: str
    amount: float
    currency: str
    merchant: str
    device_id: Optional[str] = None
    ip_address: Optional[str] = None
    country: Optional[str] = None
    velocity_10m: Optional[int] = 0
    device_change: Optional[bool] = False
    location_distance_km: Optional[float] = 0
    typing_deviation: Optional[float] = 0
    mouse_deviation: Optional[float] = 0
    graph_score: float = 0
    behavior_score: float = 0
    velocity_score: float = 0
    amount_score: float = 0
    risk_score: float = 0
    action: str = "APPROVE"
    reasons: list[str] = []
    created_at: datetime

    class Config:
        from_attributes = True


class CategoryBreakdownItem(BaseModel):
    category: str
    amount: float
    percentage: float
    count: int


class TransactionSummaryOut(BaseModel):
    total_income: float
    total_expenses: float
    net_savings: float
    savings_rate: float
    transaction_count: int
    category_breakdown: List[CategoryBreakdownItem]


# ==========================================
# 4. EMI / DEBT SCHEMAS
# ==========================================

class EMICreate(BaseModel):
    lender: str = Field(..., min_length=2, max_length=100)
    loan_name: str = Field(..., min_length=2, max_length=100)
    principal_amount: float = Field(..., ge=0)
    outstanding_amount: float = Field(..., ge=0)
    emi_amount: float = Field(..., gt=0)
    interest_rate: float = Field(..., ge=0)
    due_date: int = Field(5, ge=1, le=31)
    remaining_tenure: int = Field(12, ge=1)
    status: str = Field("Active")


class EMIUpdate(BaseModel):
    lender: Optional[str] = None
    loan_name: Optional[str] = None
    principal_amount: Optional[float] = None
    outstanding_amount: Optional[float] = None
    emi_amount: Optional[float] = None
    interest_rate: Optional[float] = None
    due_date: Optional[int] = Field(None, ge=1, le=31)
    remaining_tenure: Optional[int] = None
    status: Optional[str] = None


class EMIOut(BaseModel):
    id: int
    user_id: int
    lender: str
    loan_name: str
    principal_amount: float
    outstanding_amount: float
    emi_amount: float
    interest_rate: float
    due_date: int
    remaining_tenure: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UpcomingEMI(BaseModel):
    id: int
    lender: str
    loan_name: str
    emi_amount: float
    due_date: int
    days_left: int
    status: str


class EMISummaryOut(BaseModel):
    total_monthly_emi: float
    total_outstanding: float
    active_loans_count: int
    debt_to_income_ratio: float  # Percentage
    emi_burden_level: str        # "Low", "Moderate", "High", "Critical"
    upcoming_emis: List[UpcomingEMI]
    warnings: List[str]


# ==========================================
# 5. FINANCIAL GOALS SCHEMAS
# ==========================================

class GoalCreate(BaseModel):
    goal_name: str = Field(..., min_length=2, max_length=100)
    goal_type: str = Field("Custom", description="Emergency fund, Vacation, Education, Vehicle, Home, Investment, Custom")
    target_amount: float = Field(..., gt=0)
    current_amount: float = Field(default=0.0, ge=0)
    target_date: Optional[datetime] = None
    monthly_contribution: float = Field(default=0.0, ge=0)


class GoalUpdate(BaseModel):
    goal_name: Optional[str] = None
    goal_type: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    target_date: Optional[datetime] = None
    monthly_contribution: Optional[float] = None


class GoalContribute(BaseModel):
    amount: float = Field(..., gt=0)


class GoalOut(BaseModel):
    id: int
    user_id: int
    goal_name: str
    goal_type: str
    target_amount: float
    current_amount: float
    target_date: Optional[datetime] = None
    monthly_contribution: float
    progress_percentage: float
    remaining_amount: float
    required_monthly_saving: float
    projected_completion_date: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# 6. FINANCIAL HEALTH SCORE SCHEMAS
# ==========================================

class ContributingFactor(BaseModel):
    name: str
    rating: str          # "Good", "Moderate", "High", "Critical"
    weight_score: float  # Points earned
    max_weight: float    # Max possible points
    description: str


class ImprovementSuggestion(BaseModel):
    priority: str        # "High", "Medium", "Low"
    action: str
    potential_impact: str


class FinancialScoreOut(BaseModel):
    score: int           # 0 - 100
    risk_level: str      # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    summary: str
    contributing_factors: List[ContributingFactor]
    improvement_suggestions: List[ImprovementSuggestion]
    score_breakdown: Dict[str, float]
    updated_at: datetime


# ==========================================
# 7. PREDICTION & WARNING ENGINES
# ==========================================

class StressPredictionOut(BaseModel):
    stress_score: float               # 0 - 100%
    risk_category: str                # "LOW", "MEDIUM", "HIGH", "SEVERE"
    projected_stress_period: str      # e.g., "Next 25–30 days"
    major_risk_factors: List[str]
    recommended_actions: List[str]
    model_type: str = "Hybrid Rules-ML Engine v1.0"


class Day25WarningOut(BaseModel):
    is_triggered: bool
    warning_level: str                # "SAFE", "INFO", "WARNING", "CRITICAL"
    warning_message: str
    affected_metric: str
    projected_balance: float
    safe_buffer: float
    recommended_action: str
    days_to_salary: int


class EmergencyFundOut(BaseModel):
    current_fund: float
    essential_monthly_expenses: float
    coverage_months: float
    recommended_target_months: float = 6.0
    target_amount: float
    gap_amount: float
    monthly_saving_recommendation: float
    status_rating: str                # "Excellent", "Adequate", "Vulnerable", "Critical"


class ExpensePredictionOut(BaseModel):
    predicted_total_expense: float
    predicted_category_expenses: Dict[str, float]
    comparison_with_previous_month: Dict[str, Any]
    confidence_level: str             # "High", "Medium", "Low"
    projection_basis: str


# ==========================================
# 8. ANOMALY SCHEMAS
# ==========================================

class AnomalyStatusUpdate(BaseModel):
    status: str = Field(..., pattern=r"^(Expected|Unexpected|Pending)$")


class AnomalyOut(BaseModel):
    id: int
    user_id: int
    transaction_id: Optional[int] = None
    anomaly_type: str
    category: str
    amount: float
    description: str
    severity: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# 9. SIMULATOR SCHEMAS
# ==========================================

class SimulatorRequest(BaseModel):
    salary_change: float = 0.0          # + or - amount
    expense_change: float = 0.0         # + or - amount
    new_emi_amount: float = 0.0         # additional monthly EMI
    emi_change: float = 0.0             # change to existing EMI (+ or -)
    additional_savings: float = 0.0     # added to balance
    one_time_expense: float = 0.0       # subtracted once from balance


class SimulationMetrics(BaseModel):
    health_score: int
    risk_level: str
    monthly_income: float
    monthly_expenses: float
    monthly_savings: float
    savings_rate: float
    total_emi: float
    debt_to_income_ratio: float
    emergency_coverage_months: float
    stress_risk_percent: float


class SimulatorResultOut(BaseModel):
    baseline: SimulationMetrics
    simulated: SimulationMetrics
    score_delta: int
    savings_delta: float
    coverage_delta: float
    insights: List[str]


# ==========================================
# 10. RECOMMENDATIONS SCHEMAS
# ==========================================

class RecommendationItem(BaseModel):
    id: str
    title: str
    description: str
    category: str      # "SAVINGS", "DEBT", "EXPENSES", "EMERGENCY_FUND", "BUDGET"
    severity: str      # "INFO", "WARNING", "URGENT"
    actionable_step: str


class RecommendationOut(BaseModel):
    total_recommendations: int
    recommendations: List[RecommendationItem]


# ==========================================
# 11. ASSISTANT SCHEMAS
# ==========================================

class AssistantChatRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=500)


class AssistantChatResponse(BaseModel):
    answer: str
    suggested_followups: List[str]
    context_used: Dict[str, Any]
    disclaimer: str = "FinGuard Assistant provides automated predictive financial calculations and budgeting guidance. This does not constitute certified legal or financial advisory services."


# ==========================================
# 12. MONTHLY REPORT SCHEMAS
# ==========================================

class MonthlyReportOut(BaseModel):
    month_year: str
    total_income: float
    total_expenses: float
    total_savings: float
    total_emi: float
    health_score: float
    risk_level: str
    category_breakdown: Dict[str, float]
    mom_comparison: Dict[str, Any]
    recommendations: List[str]
    anomalies_count: int


# ==========================================
# 13. ALERTS SCHEMAS
# ==========================================

class AlertOut(BaseModel):
    id: int
    user_id: int
    alert_type: str
    title: str
    message: str
    severity: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# 14. SECURITY & SESSIONS SCHEMAS
# ==========================================

class SessionOut(BaseModel):
    id: int
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    is_current: bool = False
    is_revoked: bool = False
    created_at: datetime
    expires_at: Optional[datetime] = None


class SecurityOverviewOut(BaseModel):
    current_session: Optional[SessionOut]
    active_sessions: List[SessionOut]
    last_login: Optional[datetime] = None
    total_sessions: int


# ==========================================
# 15. COMPREHENSIVE DASHBOARD OUT
# ==========================================

class DashboardOut(BaseModel):
    # Preserved legacy fraud fields
    total: int = 0
    high_risk: int = 0
    step_up: int = 0
    approved: int = 0
    avg_risk: float = 0.0
    high_risk_rate: float = 0.0
    recent: list[dict[str, Any]] = []

    # New comprehensive financial immune metrics
    financial_health_score: Optional[int] = 74
    health_risk_level: Optional[str] = "MEDIUM"
    current_balance: Optional[float] = 0.0
    monthly_income: Optional[float] = 0.0
    monthly_expenses: Optional[float] = 0.0
    monthly_savings: Optional[float] = 0.0
    total_emi: Optional[float] = 0.0
    savings_rate: Optional[float] = 0.0
    debt_to_income: Optional[float] = 0.0

    # Predictions & warnings
    stress_risk_percent: Optional[float] = 0.0
    day25_warning: Optional[Day25WarningOut] = None
    emergency_fund: Optional[EmergencyFundOut] = None

    # Trends and aggregations
    category_spending: Optional[List[CategoryBreakdownItem]] = []
    income_vs_expense_trend: Optional[List[Dict[str, Any]]] = []
    savings_trend: Optional[List[Dict[str, Any]]] = []
    score_trend: Optional[List[Dict[str, Any]]] = []

    # Collections
    upcoming_emis: Optional[List[UpcomingEMI]] = []
    active_goals: Optional[List[GoalOut]] = []
    active_anomalies: Optional[List[AnomalyOut]] = []
    unread_alerts_count: Optional[int] = 0
