from rest_framework.generics import ListAPIView, ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAdminUser, IsAuthenticated

from .models import Feedback
from .serializers import (
    AdminFeedbackSerializer,
    FeedbackSerializer,
    FeedbackSubmitSerializer,
)

_STATUSES = {value for value, _ in Feedback.STATUS_CHOICES}
_CATEGORIES = {value for value, _ in Feedback.CATEGORY_CHOICES}


class FeedbackListCreateView(ListCreateAPIView):
    """POST to submit, GET to see your own submissions and where they stand."""

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Feedback.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return FeedbackSubmitSerializer if self.request.method == "POST" else FeedbackSerializer


class AdminFeedbackListView(ListAPIView):
    serializer_class = AdminFeedbackSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = Feedback.objects.select_related("user")
        status = self.request.query_params.get("status")
        if status in _STATUSES:
            queryset = queryset.filter(status=status)
        category = self.request.query_params.get("category")
        if category in _CATEGORIES:
            queryset = queryset.filter(category=category)
        return queryset


class AdminFeedbackDetailView(RetrieveUpdateAPIView):
    serializer_class = AdminFeedbackSerializer
    permission_classes = [IsAdminUser]
    queryset = Feedback.objects.select_related("user")
