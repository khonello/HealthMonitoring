from django.contrib import admin

from .models import HealthRecord


@admin.register(HealthRecord)
class HealthRecordAdmin(admin.ModelAdmin):
    list_display = ("user", "input_mode", "input_confidence", "submitted_at")
    list_filter = ("input_mode", "input_confidence")
    search_fields = ("user__email",)
    readonly_fields = ("input_confidence", "submitted_at")
