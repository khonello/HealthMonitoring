from django.db import migrations

# Values hardcoded here intentionally match apps/triage/rules.py::HARD_RULES and
# apps/reports/assembler.py::DISCLAIMER at the time this migration was written.
# Data migrations must stay self-contained — do not import app code into them.
SAFETY_THRESHOLDS = [
    {
        "metric": "temperature",
        "operator": "gt",
        "value": 40.0,
        "value_high": None,
        "description": "Body temperature above this value (°C) triggers a hard-rule override.",
    },
    {
        "metric": "spo2",
        "operator": "lt",
        "value": 90.0,
        "value_high": None,
        "description": "Blood oxygen saturation (%) below this value triggers a hard-rule override.",
    },
    {
        "metric": "heart_rate",
        "operator": "outside_range",
        "value": 40.0,
        "value_high": 150.0,
        "description": "Heart rate (bpm) below value or above value_high triggers a hard-rule override.",
    },
    {
        "metric": "systolic_bp",
        "operator": "gt",
        "value": 180.0,
        "value_high": None,
        "description": "Systolic blood pressure (mmHg) above this value triggers a hard-rule override.",
    },
]

DISCLAIMER_TEXT = (
    "This system helps you decide where to seek care. It does not diagnose conditions "
    "or replace professional medical advice. If you are experiencing a medical emergency, "
    "go to the nearest hospital immediately."
)


def seed_config(apps, schema_editor):
    SafetyThreshold = apps.get_model("admin_panel", "SafetyThreshold")
    SystemConfig = apps.get_model("admin_panel", "SystemConfig")

    for row in SAFETY_THRESHOLDS:
        SafetyThreshold.objects.get_or_create(metric=row["metric"], defaults=row)

    SystemConfig.objects.get_or_create(
        key="disclaimer_text", defaults={"value": DISCLAIMER_TEXT}
    )


def unseed_config(apps, schema_editor):
    SafetyThreshold = apps.get_model("admin_panel", "SafetyThreshold")
    SystemConfig = apps.get_model("admin_panel", "SystemConfig")
    SafetyThreshold.objects.filter(
        metric__in=[row["metric"] for row in SAFETY_THRESHOLDS]
    ).delete()
    SystemConfig.objects.filter(key="disclaimer_text").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("admin_panel", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_config, unseed_config),
    ]
