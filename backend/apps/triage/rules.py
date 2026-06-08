HARD_RULES = [
    ("temperature", lambda v: v is not None and v > 40.0),
    ("spo2", lambda v: v is not None and v < 90.0),
    ("heart_rate", lambda v: v is not None and (v < 40 or v > 150)),
    ("systolic_bp", lambda v: v is not None and v > 180),
]


def check_hard_rules(record) -> tuple:
    """
    Returns (triggered: bool, metric_name: str | None).
    Checks metrics in priority order — first match wins.
    """
    for metric, condition in HARD_RULES:
        if condition(getattr(record, metric, None)):
            return True, metric
    return False, None
