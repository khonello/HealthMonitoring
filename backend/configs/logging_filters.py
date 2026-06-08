import logging

_HEALTH_FIELDS = {
    "temperature", "heart_rate", "spo2",
    "systolic_bp", "diastolic_bp", "symptom_description",
}


class HealthDataFilter(logging.Filter):
    """Strips health field values from log records before they are written."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.args, dict):
            record.args = {
                k: ("***" if k in _HEALTH_FIELDS else v)
                for k, v in record.args.items()
            }
        return True
