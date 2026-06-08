from django.urls import path

from .views import SubmitHealthDataView, HealthHistoryView

urlpatterns = [
    path("submit/", SubmitHealthDataView.as_view(), name="health-submit"),
    path("history/", HealthHistoryView.as_view(), name="health-history"),
]
