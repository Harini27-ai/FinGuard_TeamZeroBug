# FinGuard — AI Fraud Prevention (Team ZeroBug)

Runnable MVP based on the uploaded FinGuard pitch deck.

Architecture represented in the deck: FastAPI + React dashboard, PostgreSQL, Neo4j, Redis, with a machine-learning/graph layer. The MVP implements real-time transaction scoring, behavioral signals, relationship-graph checks, and autonomous action recommendations.

## Features
- Transaction risk scoring API
- Behavioral anomaly signals
- Account/device/IP relationship checks
- APPROVE / STEP_UP / FREEZE policy
- PostgreSQL persistence
- Neo4j graph persistence
- Redis service included in Docker stack
- React dashboard with live simulation
- Docker Compose
- Synthetic demo seed data

> The pitch-deck figures such as 99.4% precision and 45ms latency are presentation claims/targets. This MVP does not claim to reproduce them. Production validation requires a representative labeled dataset and benchmarking.

## Run with Docker

```bash
docker compose up --build
```

Open:
- Dashboard: http://localhost:5173
- API docs: http://localhost:8000/docs
- Neo4j: http://localhost:7474

Neo4j credentials:
- user: neo4j
- password: finGuard123

## Local backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

For a simple local demo without external databases, use:
```env
DATABASE_URL=sqlite:///./finguard.db
REDIS_URL=
NEO4J_URI=
```

## Main API

`GET /api/health`

`GET /api/dashboard`

`GET /api/transactions?limit=20`

`POST /api/transactions/score`

Example body:
```json
{
  "account_id": "ACC-1001",
  "amount": 82000,
  "currency": "INR",
  "merchant": "Unknown Crypto Exchange",
  "device_id": "DEV-99",
  "ip_address": "185.91.22.7",
  "country": "IN",
  "velocity_10m": 7,
  "device_change": true,
  "location_distance_km": 420,
  "typing_deviation": 0.68,
  "mouse_deviation": 0.55
}
```

`POST /api/transactions/simulate`

The dashboard's **Simulate Transaction** button uses the last endpoint and updates the feed.

## Risk policy in this demo
- `< 0.35` → APPROVE
- `0.35–0.70` → STEP_UP
- `> 0.70` → FREEZE

This is a hackathon/demo policy, not a production financial decision model.

## Production upgrades
- Train a real GNN with PyTorch Geometric.
- Train/calibrate XGBoost using versioned fraud labels.
- Add Kafka/Redpanda for transaction streams.
- Add model registry, feature store and drift monitoring.
- Add authentication, authorization and audit logs.
- Add human review and explainability.
- Add idempotency, rate limiting and encrypted sensitive data.
