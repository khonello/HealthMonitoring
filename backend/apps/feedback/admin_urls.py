"""Staff-only feedback routes, mounted under /api/admin/ alongside the admin panel."""

from django.urls import path

from .views import AdminFeedbackDetailView, AdminFeedbackListView

urlpatterns = [
    path("", AdminFeedbackListView.as_view(), name="admin-feedback-list"),
    path("<int:pk>/", AdminFeedbackDetailView.as_view(), name="admin-feedback-detail"),
]
