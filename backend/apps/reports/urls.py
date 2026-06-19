from django.urls import path

from .views import LatestReportView, ReportDetailView, RetryTriageView

urlpatterns = [
    path("latest/", LatestReportView.as_view(), name="report-latest"),
    path("<int:pk>/", ReportDetailView.as_view(), name="report-detail"),
    path("<int:pk>/retry/", RetryTriageView.as_view(), name="report-retry-triage"),
]
