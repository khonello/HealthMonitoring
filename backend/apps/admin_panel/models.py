from django.db import models


class LLMFailureLog(models.Model):
    SOURCE_CHOICES = [
        ("triage", "Triage"),
        ("retry", "Retry Triage"),
        ("health_tip", "Health Tip"),
    ]

    health_record = models.ForeignKey(
        "health_records.HealthRecord",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="llm_failures",
    )
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    error_type = models.CharField(max_length=100)
    error_message = models.TextField()
    occurred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-occurred_at"]

    def __str__(self):
        return f"{self.source} — {self.error_type} — {self.occurred_at:%Y-%m-%d %H:%M}"


class SafetyThreshold(models.Model):
    OPERATOR_CHOICES = [
        ("gt", "Greater than"),
        ("lt", "Less than"),
        ("outside_range", "Outside range (below value or above value_high)"),
    ]

    metric = models.CharField(max_length=50, unique=True)
    operator = models.CharField(max_length=20, choices=OPERATOR_CHOICES)
    value = models.FloatField()
    value_high = models.FloatField(null=True, blank=True)
    description = models.CharField(max_length=255, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.metric} ({self.operator} {self.value})"


class SystemConfig(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key
