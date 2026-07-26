import json
import random
import re
import logging

from rest_framework import status
from rest_framework.generics import CreateAPIView, ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import HealthRecord
from .serializers import HealthRecordSubmitSerializer, HealthRecordListSerializer

logger = logging.getLogger(__name__)


class SubmitHealthDataView(CreateAPIView):
    serializer_class = HealthRecordSubmitSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = serializer.save()

        from apps.triage import run_triage
        from apps.reports.assembler import build_report_response

        triage_result = run_triage(record, request.user)
        response_data = build_report_response(record, triage_result)
        return Response(response_data, status=status.HTTP_201_CREATED)


class HealthHistoryView(ListAPIView):
    serializer_class = HealthRecordListSerializer

    def get_queryset(self):
        return (
            HealthRecord.objects
            .filter(user=self.request.user)
            .select_related("triage_result")
        )


class ExportHealthDataView(APIView):
    """Returns all of the user's health records as JSON — no pagination."""

    def get(self, request):
        records = (
            HealthRecord.objects
            .filter(user=request.user)
            .select_related("triage_result")
            .order_by("-submitted_at")
        )
        serializer = HealthRecordListSerializer(records, many=True)
        return Response(serializer.data)


class DeleteHealthRecordView(APIView):
    def delete(self, request, pk):
        record = get_object_or_404(HealthRecord, pk=pk, user=request.user)
        record.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


_TIP_FALLBACK = {
    "text": "Drink at least 8 glasses of water daily. Staying hydrated helps regulate body temperature and supports every organ in your body.",
    "category": "Hydration",
    "icon": "water-outline",
}

# Category chosen server-side (not left to the model) — left to its own
# devices, the LLM defaults to hydration/water tips most of the time.
_TIP_CATEGORIES = [
    ("Hydration", "water-outline"),
    ("Sleep", "moon-outline"),
    ("Nutrition", "nutrition-outline"),
    ("Activity", "walk-outline"),
    ("Breathing", "leaf-outline"),
    ("Posture", "body-outline"),
    ("Monitoring", "heart-outline"),
]

_TIP_SYSTEM = (
    "You are a concise health educator. "
    "Return ONLY a valid JSON object with exactly two string keys: "
    "\"text\" (1–2 sentences, a practical, specific health tip about the given category), "
    "\"category\" (echo back the category given in the user message, verbatim). "
    "No markdown fences, no explanation, just the JSON object."
)


class HealthTipView(APIView):
    def get(self, request):
        from apps.triage.llm_client import call_llm, LLMError

        category, icon = random.choice(_TIP_CATEGORIES)

        try:
            raw = call_llm(
                _TIP_SYSTEM,
                f'Give me a fresh, practical daily health tip about "{category}".',
            )
            match = re.search(r'\{.*\}', raw, re.DOTALL)
            if not match:
                raise ValueError("No JSON in LLM response")
            tip = json.loads(match.group())
            if "text" not in tip:
                raise ValueError("Missing text key in tip response")
            # Category/icon are set from our own selection, not trusted from
            # the model, so the label always matches what was actually asked.
            tip["category"] = category
            tip["icon"] = icon
            return Response(tip)
        except Exception as e:
            logger.warning("HealthTipView LLM failed: %s", e)
            from apps.admin_panel.models import LLMFailureLog

            LLMFailureLog.objects.create(
                health_record=None,
                source="health_tip",
                error_type=type(e).__name__,
                error_message=str(e),
            )
            return Response(_TIP_FALLBACK)
