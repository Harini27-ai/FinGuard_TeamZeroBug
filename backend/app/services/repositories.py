from ..models import Transaction

def save_transaction(db, data, result):
    tx = Transaction(
        account_id=data.account_id, amount=data.amount, currency=data.currency,
        merchant=data.merchant, device_id=data.device_id, ip_address=data.ip_address,
        country=data.country, velocity_10m=data.velocity_10m,
        device_change=data.device_change, location_distance_km=data.location_distance_km,
        typing_deviation=data.typing_deviation, mouse_deviation=data.mouse_deviation,
        graph_score=result.graph_score, behavior_score=result.behavior_score,
        velocity_score=result.velocity_score, amount_score=result.amount_score,
        risk_score=result.risk_score, action=result.action, reasons=result.reasons
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx
