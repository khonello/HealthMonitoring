import logging

from rest_framework import status
from rest_framework.generics import RetrieveAPIView
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import HealthReport
from .serializers import HealthReportSerializer

logger = logging.getLogger(__name__)


class LatestReportView(RetrieveAPIView):
    serializer_class = HealthReportSerializer

    def get_object(self):
        report = (
            HealthReport.objects.filter(health_record__user=self.request.user)
            .select_related("triage_result", "health_record")
            .first()
        )
        if report is None:
            raise NotFound("No reports found.")
        return report


class ReportDetailView(RetrieveAPIView):
    serializer_class = HealthReportSerializer

    def get_object(self):
        report = (
            HealthReport.objects.filter(
                id=self.kwargs["pk"],
                health_record__user=self.request.user,
            )
            .select_related("triage_result", "health_record")
            .first()
        )
        if report is None:
            raise NotFound("Report not found.")
        return report


class RetryTriageView(APIView):
    def post(self, request, pk):
        from apps.triage.prompt_builder import (
            SYSTEM_PROMPT, OVERRIDE_SYSTEM_PROMPT,
            build_prompt, build_override_prompt,
        )
        from apps.triage.llm_client import call_llm, LLMError, MODEL
        from apps.triage.response_parser import (
            parse_triage_response, parse_override_response, ParseError,
        )

        report = (
            HealthReport.objects.filter(
                id=pk, health_record__user=request.user
            )
            .select_related("triage_result", "health_record")
            .first()
        )
        if report is None:
            raise NotFound("Report not found.")

        triage = report.triage_result
        if triage.llm_model_used is not None:
            return Response(
                {"detail": "LLM analysis already succeeded."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        record = report.health_record

        try:
            if triage.hard_rule_triggered:
                raw = call_llm(
                    OVERRIDE_SYSTEM_PROMPT,
                    build_override_prompt(record, request.user, triage.hard_rule_metric),
                )
                triage.recommendation_text = parse_override_response(raw)
            else:
                raw = call_llm(SYSTEM_PROMPT, build_prompt(record, request.user))
                parsed = parse_triage_response(raw)
                triage.triage_level = parsed["triage_level"]
                triage.urgency = parsed["urgency"]
                triage.follow_up_flag = parsed["follow_up_flag"]
                triage.follow_up_hours = parsed.get("follow_up_hours")
                triage.recommendation_text = parsed["recommendation_text"]

            triage.llm_model_used = MODEL
            triage.save()
        except (LLMError, ParseError, Exception) as e:
            logger.error("Retry triage failed for report %s: %s", pk, e)
            return Response(
                {"detail": "LLM analysis failed again. Please try later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        report.refresh_from_db()
        return Response(HealthReportSerializer(report).data)
