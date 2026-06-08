from rest_framework import serializers

from .models import TriageResult, HealthReport


class TriageResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = TriageResult
        fields = (
            "id",
            "triage_level",
            "urgency",
            "confidence_level",
            "hard_rule_triggered",
            "hard_rule_metric",
            "recommendation_text",
            "follow_up_flag",
            "follow_up_hours",
            "llm_model_used",
            "generated_at",
        )
        read_only_fields = fields


class HealthReportSerializer(serializers.ModelSerializer):
    triage = TriageResultSerializer(source="triage_result", read_only=True)

    class Meta:
        model = HealthReport
        fields = (
            "id",
            "triage",
            "readings_summary",
            "disclaimer_text",
            "generated_at",
        )
        read_only_fields = fields
