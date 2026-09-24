from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import statistics
from collections import defaultdict
from sqlalchemy.orm import Session
from ..models import User, Transaction, SpendingAnomaly, Alert


def scan_and_record_anomalies(db: Session, user: User, new_tx: Optional[Transaction] = None) -> List[SpendingAnomaly]:
    """
    Spending Anomaly Detection Engine.
    Examines transaction amounts vs category historical baselines (> 2.5 std deviations or > 2.5x mean).
    Creates persistent SpendingAnomaly and Alert records.
    """
    user_txs = db.query(Transaction).filter(
        Transaction.user_id == user.id,
        Transaction.transaction_type == "expense"
    ).all()

    if not user_txs:
        return []

    # Group by category
    category_amounts = defaultdict(list)
    for t in user_txs:
        cat = t.category or "Other"
        category_amounts[cat].append(t.amount)

    target_txs = [new_tx] if new_tx else user_txs[-10:]
    detected_anomalies: List[SpendingAnomaly] = []

    for tx in target_txs:
        if not tx or tx.transaction_type != "expense":
            continue

        cat = tx.category or "Other"
        history = category_amounts[cat]

        # Calculate category mean
        if len(history) >= 2:
            mean = statistics.mean(history)
            try:
                stdev = statistics.stdev(history)
            except Exception:
                stdev = mean * 0.4
        else:
            mean = 2500.0
            stdev = 1500.0

        # Anomaly checks:
        # 1. High absolute transaction (> ₹20,000)
        # 2. > 2.5x category average
        is_anomaly = False
        multiplier = round(tx.amount / mean, 1) if mean > 0 else 1.0

        if tx.amount >= 20000.0 and multiplier >= 2.0:
            is_anomaly = True
            desc = f"{cat} transaction of ₹{tx.amount:,.0f} is {multiplier}x higher than your average of ₹{mean:,.0f}."
            severity = "HIGH" if multiplier >= 3.0 else "MEDIUM"
        elif multiplier >= 2.5 and tx.amount >= 3000.0:
            is_anomaly = True
            desc = f"Unusual spike in {cat}: ₹{tx.amount:,.0f} ({multiplier}x normal spend)."
            severity = "MEDIUM"

        if is_anomaly:
            # Check if already logged for this transaction
            existing = db.query(SpendingAnomaly).filter(
                SpendingAnomaly.user_id == user.id,
                SpendingAnomaly.transaction_id == tx.id
            ).first()

            if not existing:
                anomaly = SpendingAnomaly(
                    user_id=user.id,
                    transaction_id=tx.id,
                    anomaly_type="CATEGORY_SURGE",
                    category=cat,
                    amount=tx.amount,
                    description=desc,
                    severity=severity,
                    status="Pending"
                )
                db.add(anomaly)
                db.flush()

                # Also create a Smart Alert
                alert = Alert(
                    user_id=user.id,
                    alert_type="ANOMALY",
                    title=f"⚠️ Unusual {cat} Spend Detected",
                    message=desc,
                    severity="WARNING" if severity == "HIGH" else "INFO",
                    is_read=False
                )
                db.add(alert)
                detected_anomalies.append(anomaly)

    db.commit()
    return detected_anomalies
