# FinGuard — Financial Immune System & Real-Time Defense
> **Predict Financial Stress. Prevent Financial Crisis.**

FinGuard is a production-style personal financial health and early-warning platform combined with an autonomous real-time transaction risk and fraud defense pipeline.

---

## Architecture Overview

- **Backend**: FastAPI, SQLAlchemy (SQLite for rapid local dev + PostgreSQL compatibility), PyJWT, Passlib/Bcrypt, Pydantic v2.
- **Frontend**: React 18, Vite, Tailwind CSS, Recharts, Lucide React icons.
- **Engines & Intelligence**:
  - Dynamic 0–100 **Financial Health Score** (8 weighted factors)
  - Modular **Financial Stress Prediction Engine**
  - **Day-25 Early Warning Engine** for month-end cash depletion
  - **Emergency Fund Predictor** (6-month runway benchmark)
  - **Spending Anomaly Detection** with statistical outlier classification
  - **What-If Financial Stress Simulator** (non-destructive in-memory modeling)
  - **AI Financial Assistant** scoped strictly to authenticated user data
  - Preserved **Team ZeroBug Autonomous Real-Time Fraud Engine** (Graph + Behavioral + Velocity Scoring)

---

## Windows Quick Setup (Local - No Docker Required)

### 1. Backend Setup

Open PowerShell in the project directory:

```powershell
cd c:\hackathon\FinGuard_TeamZeroBug_Complete\FinGuard\backend

# Activate virtual environment
.\.venv\Scripts\activate

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Initialize database and populate demo records
python seed.py

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```

The backend API will be live at:
- **API Root / Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### 2. Frontend Setup

Open another PowerShell window:

```powershell
cd c:\hackathon\FinGuard_TeamZeroBug_Complete\FinGuard\frontend

# Start Vite dev server
npm run dev
```

The React dashboard will be live at:
- **Dashboard**: [http://localhost:5173](http://localhost:5173)

---

## 1-Click Demo / Evaluator Credentials

You do not need to create accounts manually. Use either:
1. **1-Click Evaluator Demo Login**: Click the **1-Click Evaluator Demo Login** button on the sign-in screen.
2. **Manual Login**:
   - **Email**: `demo@finguard.ai`
   - **Password**: `DemoPassword123!`
3. **Load Demo Data**: Click the **Load Demo Data** button in the top navbar at any time to regenerate realistic Indian Rupee accounts (HDFC, SBI, ICICI), transactions, active EMIs, and early warnings.

---

## Key API Endpoints

### Authentication & Security
- `POST /api/auth/register` — Register a new user
- `POST /api/auth/login` — Login & receive JWT access + refresh tokens
- `POST /api/auth/refresh` — Refresh expired access token
- `GET /api/auth/me` — Current authenticated user profile
- `POST /api/auth/logout` — Revoke active session tokens
- `GET /api/security/overview` — Audit active browser sessions & login history
- `POST /api/security/change-password` — Change password & revoke older sessions
- `DELETE /api/security/account` — Permanently delete account and all data

### Financial Accounts & Transactions
- `GET /api/accounts` & `POST /api/accounts` — Manage bank accounts (stores only last 4 digits)
- `GET /api/transactions` & `POST /api/transactions` — Add/filter/search transactions
- `GET /api/transactions/summary` — Monthly revenue, outflow, and category breakdown

### EMI & Debt Tracker
- `GET /api/emi` & `POST /api/emi` — Manage active loans
- `GET /api/emi/summary` — DTI (Debt-to-Income) ratio, burden level, and upcoming payment warnings

### Intelligence & Early Warnings
- `GET /api/dashboard` — Unified dashboard metrics, charts, and live feed
- `GET /api/financial-score` — Dynamic 0–100 health score with contributing factors
- `GET /api/prediction` — Financial stress score & projected stress period
- `GET /api/day25-warning` — Day-25 cash depletion forecasting
- `GET /api/emergency-fund` — Emergency fund months of coverage & target gap
- `GET /api/expense-prediction` — Next month expense projection
- `POST /api/simulator` — What-If financial simulator
- `GET /api/recommendations` — Personalized dynamic recommendations
- `POST /api/assistant/chat` — Scoped AI Financial Assistant
- `GET /api/reports` — Monthly financial reports by `YYYY-MM`
- `GET /api/anomalies` & `PUT /api/anomalies/{id}/status` — Mark anomalies Expected/Unexpected
- `GET /api/alerts` — Smart alert management

### Real-Time Fraud Defense (Preserved)
- `POST /api/transactions/score` — Real-time transaction risk scoring
- `POST /api/transactions/simulate` — Live fraud transaction simulator

---

## Running Automated Tests

Run the full pytest suite from the backend directory:

```powershell
cd c:\hackathon\FinGuard_TeamZeroBug_Complete\FinGuard\backend
.\.venv\Scripts\pytest -v
```

All 8 test suites cover:
- Authentication & JWT token validation
- User data isolation (User A cannot access User B's records)
- Transactions & monthly summaries
- Financial Health Score (0-100 logic)
- Stress prediction & Day-25 warnings
- Non-destructive What-If simulator
- Scoped AI Assistant queries
- Legacy real-time fraud defense routes
