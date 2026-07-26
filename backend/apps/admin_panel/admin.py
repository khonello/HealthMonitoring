from django.contrib import admin

from .models import LLMFailureLog, SafetyThreshold, SystemConfig


@admin.register(LLMFailureLog)
class LLMFailureLogAdmin(admin.ModelAdmin):
    list_display = ("source", "error_type", "health_record", "occurred_at")
    list_filter = ("source", "error_type")
    readonly_fields = ("error_message", "occurred_at")
    search_fields = ("health_record__user__email", "error_type", "error_message")


@admin.register(SafetyThreshold)
class SafetyThresholdAdmin(admin.ModelAdmin):
    list_display = ("metric", "operator", "value", "value_high", "updated_at")
    search_fields = ("metric",)


@admin.register(SystemConfig)
class SystemConfigAdmin(admin.ModelAdmin):
    list_display = ("key", "updated_at")
    search_fields = ("key",)
