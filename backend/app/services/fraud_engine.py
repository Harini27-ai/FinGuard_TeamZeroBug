from dataclasses import dataclass

@dataclass
class FraudResult:
    graph_score: float
    behavior_score: float
    velocity_score: float
    amount_score: float
    risk_score: float
    action: str
    reasons: list[str]

def score_transaction(data, graph_score_fn):
    graph_score, graph_reasons = graph_score_fn()
    from .behavioral import behavioral_score
    behavior, behavior_reasons = behavioral_score(
        data.typing_deviation, data.mouse_deviation,
        data.device_change, data.location_distance_km
    )
    velocity = min(data.velocity_10m / 10.0, 1.0)
    velocity_reasons = ["High transaction velocity"] if data.velocity_10m >= 5 else []
    amount = min(data.amount / 100000.0, 1.0)
    amount_reasons = ["Unusually large transaction amount"] if data.amount >= 50000 else []
    risk = round(min(max(
        0.35*graph_score + 0.30*behavior + 0.20*velocity + 0.15*amount, 0
    ), 1), 4)
    reasons = graph_reasons + behavior_reasons + velocity_reasons + amount_reasons
    action = "FREEZE" if risk > 0.70 else ("STEP_UP" if risk >= 0.35 else "APPROVE")
    if not reasons:
        reasons = ["No major anomaly detected"]
    return FraudResult(
        round(graph_score,4), round(behavior,4), round(velocity,4),
        round(amount,4), risk, action, reasons
    )
