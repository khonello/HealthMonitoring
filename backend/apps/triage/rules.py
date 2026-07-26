# Fallback values used if a metric has no SafetyThreshold row (empty/misconfigured
# table) — an admin-editable config gap must never silently disable safety gating.
_DEFAULT_THRESHOLDS = {
    "temperature": {"operator": "gt", "value": 40.0, "value_high": None},
    "spo2": {"operator": "lt", "value": 90.0, "value_high": None},
    "heart_rate": {"operator": "outside_range", "value": 40.0, "value_high": 150.0},
    "systolic_bp": {"operator": "gt", "value": 180.0, "value_high": None},
}

# Checked in this order — first match wins.
_METRIC_ORDER = ["temperature", "spo2", "heart_rate", "systolic_bp"]


def _get_threshold(metric: str) -> tuple:
    from apps.admin_panel.models import SafetyThreshold

    row = SafetyThreshold.objects.filter(metric=metric).first()
    if row is not None:
        return row.operator, row.value, row.value_high
    default = _DEFAULT_THRESHOLDS[metric]
    return default["operator"], default["value"], default["value_high"]


def _breaches(operator: str, reading: float, low: float, high: float | None) -> bool:
    if operator == "gt":
        return reading > low
    if operator == "lt":
        return reading < low
    if operator == "outside_range":
        return reading < low or reading > high
    return False


def check_hard_rules(record) -> tuple:
    """
    Returns (triggered: bool, metric_name: str | None).
    Checks metrics in priority order — first match wins.
    """
    for metric in _METRIC_ORDER:
        reading = getattr(record, metric, None)
        if reading is None:
            continue
        operator, low, high = _get_threshold(metric)
        if _breaches(operator, reading, low, high):
            return True, metric
    return False, None
