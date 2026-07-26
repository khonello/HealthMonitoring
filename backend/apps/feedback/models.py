from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Feedback(models.Model):
    CATEGORY_CHOICES = [
        ("triage_accuracy", "Triage accuracy"),
        ("bug", "Bug or error"),
        ("usability", "Hard to use"),
        ("suggestion", "Suggestion"),
        ("other", "Something else"),
    ]
    STATUS_CHOICES = [
        ("new", "New"),
        ("reviewed", "Reviewed"),
        ("resolved", "Resolved"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feedback",
    )
    # Optional so general feedback stands alone, but SET_NULL rather than CASCADE:
    # a deleted record must not erase the report of a bad triage.
    health_record = models.ForeignKey(
        "health_records.HealthRecord",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feedback",
    )
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="other")
    message = models.TextField()
    rating = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    app_version = models.CharField(max_length=20, blank=True)
    platform = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new")
    admin_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "-created_at"])]
        verbose_name_plural = "feedback"

    def __str__(self):
        return f"{self.user.email} — {self.category} — {self.created_at:%Y-%m-%d}"
