DISCLAIMER = (
    "This system helps you decide where to seek care. It does not diagnose conditions "
    "or replace professional medical advice. If you are experiencing a medical emergency, "
    "go to the nearest hospital immediately."
)


def _temperature_status(value: float) -> str:
    if value > 40.0:
        return "critical"
    if value >= 38.0:
        return "mildly_elevated"
    if value >= 37.5:
        return "borderline_elevated"
    return "normal"


def _heart_rate_status(value: int) -> str:
    if value < 40 or value > 150:
        return "critical"
    if value < 60:
        return "low"
    if value > 100:
        return "high"
    return "normal"


def _spo2_status(value: float) -> str:
    if value < 90:
        return "critical"
    if value < 95:
        return "low"
    return "normal"


def _bp_status(systolic: int) -> str:
    if systolic > 180:
        return "critical"
    if systolic >= 140:
        return "stage_2_hypertension"
    if systolic >= 130:
        return "stage_1_hypertension"
    if systolic >= 120:
        return "elevated"
    return "normal"


def build_readings_summary(record) -> dict:
    summary = {}
    if record.temperature is not None:
        summary["temperature"] = {
            "value": record.temperature,
            "unit": "°C",
            "status": _temperature_status(record.temperature),
        }
    if record.heart_rate is not None:
        summary["heart_rate"] = {
            "value": record.heart_rate,
            "unit": "bpm",
            "status": _heart_rate_status(record.heart_rate),
        }
    if record.spo2 is not None:
        summary["spo2"] = {
            "value": record.spo2,
            "unit": "%",
            "status": _spo2_status(record.spo2),
        }
    if record.systolic_bp is not None:
        bp_value = (
            f"{record.systolic_bp}/{record.diastolic_bp}"
            if record.diastolic_bp is not None
            else str(record.systolic_bp)
        )
        summary["blood_pressure"] = {
            "value": bp_value,
            "unit": "mmHg",
            "status": _bp_status(record.systolic_bp),
        }
    return summary


def build_report_response(record, triage_result: dict) -> dict:
    from .models import HealthReport, TriageResult as TriageResultModel

    triage_obj = TriageResultModel.objects.get(health_record=record)
    readings_summary = build_readings_summary(record)

    report = HealthReport.objects.create(
        health_record=record,
        triage_result=triage_obj,
        readings_summary=readings_summary,
        disclaimer_text=DISCLAIMER,
    )

    response = {
        "report_id": report.id,
        "triage": {
            "level": triage_result["triage_level"],
            "urgency": triage_result["urgency"],
            "confidence": triage_result["confidence_level"],
            "hard_rule_triggered": triage_result["hard_rule_triggered"],
            "recommendation": triage_result["recommendation_text"],
            "follow_up_flag": triage_result["follow_up_flag"],
            "follow_up_in_hours": triage_result.get("follow_up_hours"),
            "disclaimer": DISCLAIMER,
        },
        "readings_summary": readings_summary,
        "generated_at": report.generated_at.isoformat(),
    }

    if triage_result.get("fallback"):
        response["triage"]["fallback"] = True

    return response
