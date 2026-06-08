from rest_framework.generics import RetrieveAPIView
from rest_framework.exceptions import NotFound

from .models import HealthReport
from .serializers import HealthReportSerializer


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
