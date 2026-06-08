from django.conf import settings
from django.db import models


class HealthRecord(models.Model):
    INPUT_MODE_CHOICES = [
        ("structured", "Structured"),
        ("descriptive", "Descriptive"),
        ("mixed", "Mixed"),
    ]
    CONFIDENCE_CHOICES = [
        ("high", "High"),
        ("medium", "Medium"),
        ("low", "Low"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="health_records",
    )
    input_mode = models.CharField(max_length=20, choices=INPUT_MODE_CHOICES)
    temperature = models.FloatField(null=True, blank=True)
    heart_rate = models.IntegerField(null=True, blank=True)
    spo2 = models.FloatField(null=True, blank=True)
    systolic_bp = models.IntegerField(null=True, blank=True)
    diastolic_bp = models.IntegerField(null=True, blank=True)
    symptom_description = models.TextField(null=True, blank=True)
    input_confidence = models.CharField(
        max_length=10, choices=CONFIDENCE_CHOICES, editable=False
    )
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.user.email} — {self.input_mode} — {self.submitted_at:%Y-%m-%d}"

    def save(self, *args, **kwargs):
        self.input_confidence = self._compute_confidence()
        super().save(*args, **kwargs)

    def _compute_confidence(self) -> str:
        vitals = [self.temperature, self.heart_rate, self.spo2, self.systolic_bp, self.diastolic_bp]
        has_all_readings = all(v is not None for v in vitals)
        has_description = bool(
            self.symptom_description
            and len(self.symptom_description.split()) >= 10
        )
        if has_all_readings and has_description:
            return "high"
        if has_all_readings or has_description:
            return "medium"
        return "low"
