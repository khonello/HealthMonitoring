from rest_framework import serializers

from apps.accounts.models import User
from apps.health_records.models import HealthRecord
from apps.reports.models import TriageResult

from .models import LLMFailureLog, SafetyThreshold, SystemConfig


class AdminTriageResultSerializer(serializers.ModelSerializer):
    health_record_id = serializers.IntegerField(source="health_record.id")
    user_id = serializers.IntegerField(source="health_record.user.id")
    user_email = serializers.EmailField(source="health_record.user.email")

    class Meta:
        model = TriageResult
        fields = (
            "id",
            "health_record_id",
            "user_id",
            "user_email",
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


class LLMFailureLogSerializer(serializers.ModelSerializer):
    health_record_id = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = LLMFailureLog
        fields = (
            "id",
            "health_record_id",
            "user_id",
            "user_email",
            "source",
            "error_type",
            "error_message",
            "occurred_at",
        )
        read_only_fields = fields

    def get_health_record_id(self, obj):
        return obj.health_record_id

    def get_user_id(self, obj):
        return obj.health_record.user_id if obj.health_record else None

    def get_user_email(self, obj):
        return obj.health_record.user.email if obj.health_record else None


class AdminUserSummarySerializer(serializers.ModelSerializer):
    # default=False covers instances fetched without the has_recent_critical
    # annotation (e.g. AdminUserDeactivateView's plain User.objects.get).
    has_recent_critical = serializers.BooleanField(read_only=True, default=False)

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "is_active", "is_staff", "created_at", "has_recent_critical")
        read_only_fields = fields


class AdminRecordTriageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TriageResult
        fields = (
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


class AdminHealthRecordSerializer(serializers.ModelSerializer):
    triage = AdminRecordTriageSerializer(source="triage_result", read_only=True)

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
            "symptom_description",
            "triage",
        )
        read_only_fields = fields


class AdminUserDetailSerializer(serializers.ModelSerializer):
    health_records = serializers.SerializerMethodField()
    llm_failures = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "date_of_birth",
            "gender",
            "is_active",
            "is_staff",
            "created_at",
            "health_records",
            "llm_failures",
        )
        read_only_fields = fields

    def get_health_records(self, obj):
        records = obj.health_records.select_related("triage_result").order_by("-submitted_at")[:50]
        return AdminHealthRecordSerializer(records, many=True).data

    def get_llm_failures(self, obj):
        failures = LLMFailureLog.objects.filter(health_record__user=obj).order_by("-occurred_at")[:20]
        return LLMFailureLogSerializer(failures, many=True).data


class SafetyThresholdSerializer(serializers.ModelSerializer):
    class Meta:
        model = SafetyThreshold
        fields = ("id", "metric", "operator", "value", "value_high", "description", "updated_at")
        read_only_fields = ("id", "metric", "updated_at")


class SystemConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfig
        fields = ("id", "key", "value", "updated_at")
        read_only_fields = ("id", "key", "updated_at")
