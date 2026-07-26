from django.urls import path

from .views import (
    AdminDisclaimerConfigView,
    AdminLLMFailureListView,
    AdminLLMStatsView,
    AdminSafetyThresholdDetailView,
    AdminSafetyThresholdListView,
    AdminSummaryView,
    AdminTriageOversightView,
    AdminUserDeactivateView,
    AdminUserDetailView,
    AdminUserListView,
)

urlpatterns = [
    path("summary/", AdminSummaryView.as_view(), name="admin-summary"),
    path("triage/", AdminTriageOversightView.as_view(), name="admin-triage-oversight"),
    path("llm/failures/", AdminLLMFailureListView.as_view(), name="admin-llm-failures"),
    path("llm/stats/", AdminLLMStatsView.as_view(), name="admin-llm-stats"),
    path("users/", AdminUserListView.as_view(), name="admin-user-list"),
    path("users/<int:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
    path("users/<int:pk>/deactivate/", AdminUserDeactivateView.as_view(), name="admin-user-deactivate"),
    path("config/thresholds/", AdminSafetyThresholdListView.as_view(), name="admin-threshold-list"),
    path("config/thresholds/<int:pk>/", AdminSafetyThresholdDetailView.as_view(), name="admin-threshold-detail"),
    path("config/disclaimer/", AdminDisclaimerConfigView.as_view(), name="admin-disclaimer-config"),
]
