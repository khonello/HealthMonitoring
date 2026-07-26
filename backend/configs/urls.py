from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/health/", include("apps.health_records.urls")),
    path("api/reports/", include("apps.reports.urls")),
    path("api/feedback/", include("apps.feedback.urls")),
    path("api/config/", include("apps.admin_panel.public_urls")),
    path("api/admin/", include("apps.admin_panel.urls")),
    path("api/admin/feedback/", include("apps.feedback.admin_urls")),
]
