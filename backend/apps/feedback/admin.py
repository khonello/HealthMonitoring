from django.contrib import admin

from .models import Feedback


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "category", "rating", "status", "created_at")
    list_filter = ("status", "category", "created_at")
    search_fields = ("user__email", "user__full_name", "message")
    readonly_fields = (
        "user",
        "health_record",
        "category",
        "message",
        "rating",
        "app_version",
        "platform",
        "created_at",
        "updated_at",
    )
