from django.urls import path

from .views import LatestReportView, ReportDetailView

urlpatterns = [
    path("latest/", LatestReportView.as_view(), name="report-latest"),
    path("<int:pk>/", ReportDetailView.as_view(), name="report-detail"),
]
