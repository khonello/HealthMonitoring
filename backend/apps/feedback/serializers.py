from rest_framework import serializers

from .models import Feedback

MIN_MESSAGE_LENGTH = 10
MAX_MESSAGE_LENGTH = 2000


class FeedbackSubmitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = (
            "id",
            "category",
            "message",
            "rating",
            "health_record",
            "app_version",
            "platform",
            "status",
            "created_at",
        )
        read_only_fields = ("id", "status", "created_at")

    def validate_message(self, value):
        cleaned = value.strip()
        if len(cleaned) < MIN_MESSAGE_LENGTH:
            raise serializers.ValidationError(
                f"Please write at least {MIN_MESSAGE_LENGTH} characters so we know what to act on."
            )
        if len(cleaned) > MAX_MESSAGE_LENGTH:
            raise serializers.ValidationError(
                f"Please keep your feedback under {MAX_MESSAGE_LENGTH} characters."
            )
        return cleaned

    def validate_health_record(self, value):
        if value is not None and value.user_id != self.context["request"].user.id:
            raise serializers.ValidationError("You can only attach one of your own health records.")
        return value

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class FeedbackSerializer(serializers.ModelSerializer):
    """The submitter's own view — no admin_note, so internal notes stay internal."""

    class Meta:
        model = Feedback
        fields = (
            "id",
            "category",
            "message",
            "rating",
            "health_record",
            "status",
            "created_at",
        )
        read_only_fields = fields


class AdminFeedbackSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = Feedback
        fields = (
            "id",
            "user_id",
            "user_email",
            "user_full_name",
            "health_record",
            "category",
            "message",
            "rating",
            "app_version",
            "platform",
            "status",
            "admin_note",
            "created_at",
            "updated_at",
        )
        # Only triage state is editable — the user's own words are never rewritten.
        read_only_fields = (
            "id",
            "user_id",
            "user_email",
            "user_full_name",
            "health_record",
            "category",
            "message",
            "rating",
            "app_version",
            "platform",
            "created_at",
            "updated_at",
        )
