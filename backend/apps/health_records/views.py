from rest_framework import status
from rest_framework.generics import CreateAPIView, ListAPIView
from rest_framework.response import Response

from .models import HealthRecord
from .serializers import HealthRecordSubmitSerializer, HealthRecordListSerializer


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
