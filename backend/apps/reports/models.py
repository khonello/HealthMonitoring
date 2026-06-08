from django.db import models


class TriageResult(models.Model):
    TRIAGE_LEVEL_CHOICES = [
        ("see_doctor", "See Doctor"),
        ("visit_pharmacy", "Visit Pharmacy"),
        ("rest_at_home", "Rest at Home"),
    ]
    URGENCY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    ]
    CONFIDENCE_CHOICES = [
        ("high", "High"),
        ("medium", "Medium"),
        ("low", "Low"),
    ]

    health_record = models.OneToOneField(
        "health_records.HealthRecord",
        on_delete=models.CASCADE,
        related_name="triage_result",
    )
    triage_level = models.CharField(max_length=20, choices=TRIAGE_LEVEL_CHOICES)
    urgency = models.CharField(max_length=10, choices=URGENCY_CHOICES)
    confidence_level = models.CharField(max_length=10, choices=CONFIDENCE_CHOICES)
    hard_rule_triggered = models.BooleanField(default=False)
    hard_rule_metric = models.CharField(max_length=50, null=True, blank=True)
    recommendation_text = models.TextField()
    follow_up_flag = models.BooleanField(default=False)
    follow_up_hours = models.IntegerField(null=True, blank=True)
    llm_model_used = models.CharField(max_length=100, null=True, blank=True)
    prompt_sent = models.TextField()
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.health_record} → {self.triage_level}"


class HealthReport(models.Model):
    health_record = models.OneToOneField(
        "health_records.HealthRecord",
        on_delete=models.CASCADE,
        related_name="report",
    )
    triage_result = models.OneToOneField(
        TriageResult,
        on_delete=models.CASCADE,
        related_name="report",
    )
    readings_summary = models.JSONField()
    disclaimer_text = models.TextField()
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-generated_at"]

    def __str__(self):
        return f"Report for {self.health_record}"
