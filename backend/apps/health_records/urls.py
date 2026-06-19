from django.urls import path

from .views import SubmitHealthDataView, HealthHistoryView, ExportHealthDataView, DeleteHealthRecordView, HealthTipView

urlpatterns = [
    path("submit/", SubmitHealthDataView.as_view(), name="health-submit"),
    path("history/", HealthHistoryView.as_view(), name="health-history"),
    path("export/", ExportHealthDataView.as_view(), name="health-export"),
    path("tip/", HealthTipView.as_view(), name="health-tip"),
    path("<int:pk>/", DeleteHealthRecordView.as_view(), name="health-delete"),
]
