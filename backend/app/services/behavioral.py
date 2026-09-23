def behavioral_score(typing_deviation, mouse_deviation, device_change, location_distance_km):
    reasons = []
    score = 0.0
    if typing_deviation > 0.55:
        score += 0.25
        reasons.append("Typing behavior differs from the account baseline")
    if mouse_deviation > 0.55:
        score += 0.20
        reasons.append("Pointer behavior differs from the account baseline")
    if device_change:
        score += 0.20
        reasons.append("New device detected")
    if location_distance_km > 250:
        score += 0.25
        reasons.append("Unusual location distance detected")
    elif location_distance_km > 100:
        score += 0.12
    return min(score, 1.0), reasons
