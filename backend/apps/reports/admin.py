from django.contrib import admin

from .models import TriageResult, HealthReport


@admin.register(TriageResult)
class TriageResultAdmin(admin.ModelAdmin):
    list_display = (
        "health_record",
        "triage_level",
        "urgency",
        "confidence_level",
        "hard_rule_triggered",
        "generated_at",
    )
    list_filter = ("triage_level", "urgency", "hard_rule_triggered")
    readonly_fields = ("prompt_sent", "llm_model_used", "generated_at")
    search_fields = ("health_record__user__email",)


@admin.register(HealthReport)
class HealthReportAdmin(admin.ModelAdmin):
    list_display = ("health_record", "generated_at")
    readonly_fields = ("readings_summary", "disclaimer_text", "generated_at")
    search_fields = ("health_record__user__email",)
