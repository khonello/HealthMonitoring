from rest_framework import serializers

from .models import HealthRecord


class HealthRecordSubmitSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthRecord
        fields = (
            "temperature",
            "heart_rate",
            "spo2",
            "systolic_bp",
            "diastolic_bp",
            "symptom_description",
        )

    def validate(self, data):
        vitals = [
            data.get("temperature"),
            data.get("heart_rate"),
            data.get("spo2"),
            data.get("systolic_bp"),
            data.get("diastolic_bp"),
        ]
        description = data.get("symptom_description", "").strip() if data.get("symptom_description") else ""
        if not any(v is not None for v in vitals) and not description:
            raise serializers.ValidationError(
                "Please provide at least one health reading or a symptom description."
            )
        return data

    def _resolve_input_mode(self, validated_data) -> str:
        vitals = [
            validated_data.get("temperature"),
            validated_data.get("heart_rate"),
            validated_data.get("spo2"),
            validated_data.get("systolic_bp"),
            validated_data.get("diastolic_bp"),
        ]
        has_readings = any(v is not None for v in vitals)
        has_description = bool(
            validated_data.get("symptom_description", "").strip()
            if validated_data.get("symptom_description")
            else ""
        )
        if has_readings and has_description:
            return "mixed"
        if has_description:
            return "descriptive"
        return "structured"

    def create(self, validated_data):
        validated_data["input_mode"] = self._resolve_input_mode(validated_data)
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class HealthRecordListSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthRecord
        fields = (
            "id",
            "input_mode",
            "input_confidence",
            "submitted_at",
            "temperature",
            "heart_rate",
            "spo2",
            "systolic_bp",
            "diastolic_bp",
        )
        read_only_fields = fields
