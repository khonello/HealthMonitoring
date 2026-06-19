import json
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

_TIP_SYSTEM = (
    "You are a concise health educator. "
    "Return ONLY a valid JSON object with exactly three string keys: "
    "\"text\" (1–2 sentences, a practical, specific health tip), "
    "\"category\" (one word, e.g. Hydration, Sleep, Nutrition, Activity, Breathing, Posture, Monitoring), "
    "\"icon\" (one of: water-outline, moon-outline, walk-outline, leaf-outline, nutrition-outline, "
    "body-outline, heart-outline, fitness-outline, sunny-outline, bandage-outline). "
    "No markdown fences, no explanation, just the JSON object."
)


class HealthTipView(APIView):
    def get(self, request):
        from apps.triage.llm_client import call_llm, LLMError

        try:
            raw = call_llm(_TIP_SYSTEM, "Give me a fresh, practical daily health tip.")
            match = re.search(r'\{.*\}', raw, re.DOTALL)
            if not match:
                raise ValueError("No JSON in LLM response")
            tip = json.loads(match.group())
            if not all(k in tip for k in ("text", "category", "icon")):
                raise ValueError("Missing keys in tip response")
            return Response(tip)
        except Exception as e:
            logger.warning("HealthTipView LLM failed: %s", e)
            return Response(_TIP_FALLBACK)
