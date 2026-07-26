from datetime import timedelta

from django.db.models import Count, Exists, OuterRef, Q
from django.utils import timezone
from rest_framework.generics import (
    ListAPIView,
    RetrieveAPIView,
    RetrieveUpdateAPIView,
)
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.feedback.models import Feedback
from apps.reports.assembler import get_disclaimer
from apps.reports.models import TriageResult

from .models import LLMFailureLog, SafetyThreshold, SystemConfig
from .serializers import (
    AdminTriageResultSerializer,
    AdminUserDetailSerializer,
    AdminUserSummarySerializer,
    LLMFailureLogSerializer,
    SafetyThresholdSerializer,
    SystemConfigSerializer,
)

_TRIAGE_FILTERS = {
    "critical_urgent": Q(urgency="high") | Q(triage_level="see_doctor"),
    "hard_rule": Q(hard_rule_triggered=True),
    "low_confidence": Q(confidence_level="low"),
}


class AdminSummaryView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        last_24h = now - timedelta(hours=24)
        recent_triage = TriageResult.objects.filter(generated_at__gte=last_24h)
        data = {
            "total_users": User.objects.count(),
            "critical_last_24h": recent_triage.filter(_TRIAGE_FILTERS["critical_urgent"]).count(),
            "hard_rule_last_24h": recent_triage.filter(_TRIAGE_FILTERS["hard_rule"]).count(),
            "low_confidence_last_24h": recent_triage.filter(_TRIAGE_FILTERS["low_confidence"]).count(),
            "llm_failures_last_24h": LLMFailureLog.objects.filter(occurred_at__gte=last_24h).count(),
            # Unread rather than 24h-windowed: feedback stays on the queue until triaged.
            "new_feedback": Feedback.objects.filter(status="new").count(),
        }
        return Response(data)


class AdminTriageOversightView(ListAPIView):
    serializer_class = AdminTriageResultSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = TriageResult.objects.select_related("health_record__user").order_by(
            "-generated_at"
        )
        filter_key = self.request.query_params.get("filter")
        condition = _TRIAGE_FILTERS.get(filter_key)
        if condition is not None:
            queryset = queryset.filter(condition)
        return queryset


class AdminLLMFailureListView(ListAPIView):
    serializer_class = LLMFailureLogSerializer
    permission_classes = [IsAdminUser]
    queryset = LLMFailureLog.objects.select_related("health_record__user").all()


class AdminLLMStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        queryset = LLMFailureLog.objects.all()
        data = {
            "total": queryset.count(),
            "last_24h": queryset.filter(occurred_at__gte=now - timedelta(hours=24)).count(),
            "last_7d": queryset.filter(occurred_at__gte=now - timedelta(days=7)).count(),
            "by_source": list(
                queryset.values("source").annotate(count=Count("id")).order_by("-count")
            ),
            "by_error_type": list(
                queryset.values("error_type").annotate(count=Count("id")).order_by("-count")
            ),
        }
        return Response(data)


class AdminUserListView(ListAPIView):
    serializer_class = AdminUserSummarySerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        recent_critical = TriageResult.objects.filter(
            health_record__user=OuterRef("pk"),
            generated_at__gte=timezone.now() - timedelta(hours=24),
        ).filter(_TRIAGE_FILTERS["critical_urgent"] | Q(hard_rule_triggered=True))

        queryset = User.objects.annotate(
            has_recent_critical=Exists(recent_critical)
        ).order_by("-created_at")
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) | Q(full_name__icontains=search)
            )
        return queryset


class AdminUserDetailView(RetrieveAPIView):
    serializer_class = AdminUserDetailSerializer
    permission_classes = [IsAdminUser]
    queryset = User.objects.all()


class AdminUserDeactivateView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        user = User.objects.get(pk=pk)
        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])
        return Response(AdminUserSummarySerializer(user).data)


class AdminSafetyThresholdListView(ListAPIView):
    serializer_class = SafetyThresholdSerializer
    permission_classes = [IsAdminUser]
    queryset = SafetyThreshold.objects.all().order_by("metric")


class AdminSafetyThresholdDetailView(RetrieveUpdateAPIView):
    serializer_class = SafetyThresholdSerializer
    permission_classes = [IsAdminUser]
    queryset = SafetyThreshold.objects.all()


class PublicDisclaimerView(APIView):
    """Unauthenticated read of the active disclaimer, for the in-app legal screen."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"disclaimer": get_disclaimer()})


class AdminDisclaimerConfigView(RetrieveUpdateAPIView):
    serializer_class = SystemConfigSerializer
    permission_classes = [IsAdminUser]

    def get_object(self):
        obj, _ = SystemConfig.objects.get_or_create(
            key="disclaimer_text", defaults={"value": ""}
        )
        return obj
