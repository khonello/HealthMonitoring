from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.health_records.models import HealthRecord

from .assembler import build_readings_summary, get_disclaimer
from .models import HealthReport, TriageResult


def make_report(user, *, llm_model="llama-3.3-70b-versatile", **record_kwargs):
    record = HealthRecord.objects.create(
        user=user, input_mode=record_kwargs.pop("input_mode", "structured"), **record_kwargs
    )
    triage = TriageResult.objects.create(
        health_record=record,
        triage_level="rest_at_home",
        urgency="low",
        confidence_level="high",
        recommendation_text="Rest and stay hydrated.",
        llm_model_used=llm_model,
        prompt_sent="test",
    )
    return HealthReport.objects.create(
        health_record=record,
        triage_result=triage,
        readings_summary=build_readings_summary(record),
        disclaimer_text=get_disclaimer(),
    )


class ReadingsSummaryTests(APITestCase):
    """build_readings_summary drives the status colours the user sees on the report."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="u@test.com", password="pass12345", full_name="U"
        )

    def summary_for(self, **kwargs):
        record = HealthRecord.objects.create(user=self.user, input_mode="structured", **kwargs)
        return build_readings_summary(record)

    def test_omits_metrics_that_were_not_supplied(self):
        summary = self.summary_for(temperature=37.0)
        self.assertIn("temperature", summary)
        self.assertNotIn("heart_rate", summary)
        self.assertNotIn("blood_pressure", summary)

    def test_empty_record_produces_an_empty_summary(self):
        self.assertEqual(self.summary_for(), {})

    def test_temperature_bands(self):
        self.assertEqual(self.summary_for(temperature=36.8)["temperature"]["status"], "normal")
        self.assertEqual(
            self.summary_for(temperature=37.6)["temperature"]["status"], "borderline_elevated"
        )
        self.assertEqual(
            self.summary_for(temperature=38.5)["temperature"]["status"], "mildly_elevated"
        )
        self.assertEqual(self.summary_for(temperature=40.5)["temperature"]["status"], "critical")

    def test_spo2_bands(self):
        self.assertEqual(self.summary_for(spo2=98.0)["spo2"]["status"], "normal")
        self.assertEqual(self.summary_for(spo2=93.0)["spo2"]["status"], "low")
        self.assertEqual(self.summary_for(spo2=88.0)["spo2"]["status"], "critical")

    def test_heart_rate_bands(self):
        self.assertEqual(self.summary_for(heart_rate=72)["heart_rate"]["status"], "normal")
        self.assertEqual(self.summary_for(heart_rate=55)["heart_rate"]["status"], "low")
        self.assertEqual(self.summary_for(heart_rate=110)["heart_rate"]["status"], "high")
        self.assertEqual(self.summary_for(heart_rate=160)["heart_rate"]["status"], "critical")

    def test_blood_pressure_formats_as_a_pair(self):
        summary = self.summary_for(systolic_bp=118, diastolic_bp=76)
        self.assertEqual(summary["blood_pressure"]["value"], "118/76")
        self.assertEqual(summary["blood_pressure"]["status"], "normal")

    def test_systolic_only_still_renders(self):
        summary = self.summary_for(systolic_bp=145)
        self.assertEqual(summary["blood_pressure"]["value"], "145")
        self.assertEqual(summary["blood_pressure"]["status"], "stage_2_hypertension")


class ReportAccessTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@test.com", password="pass12345", full_name="Owner"
        )
        self.intruder = User.objects.create_user(
            email="intruder@test.com", password="pass12345", full_name="Intruder"
        )
        self.report = make_report(self.owner, temperature=37.1, heart_rate=74)

    def test_detail_requires_authentication(self):
        url = reverse("report-detail", args=[self.report.id])
        self.assertEqual(self.client.get(url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_owner_can_read_their_report(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get(reverse("report-detail", args=[self.report.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.report.id)

    def test_another_user_cannot_read_it(self):
        """Cross-user isolation — a health report must never leak by guessing an ID."""
        self.client.force_authenticate(self.intruder)
        response = self.client.get(reverse("report-detail", args=[self.report.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_latest_returns_the_most_recent_report(self):
        newer = make_report(self.owner, temperature=38.0)
        self.client.force_authenticate(self.owner)
        response = self.client.get(reverse("report-latest"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], newer.id)

    def test_latest_is_404_when_the_user_has_none(self):
        self.client.force_authenticate(self.intruder)
        response = self.client.get(reverse("report-latest"))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_latest_ignores_other_users_reports(self):
        self.client.force_authenticate(self.intruder)
        self.assertEqual(
            self.client.get(reverse("report-latest")).status_code, status.HTTP_404_NOT_FOUND
        )


class ReportPayloadTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="u@test.com", password="pass12345", full_name="U"
        )
        self.client.force_authenticate(self.user)

    def test_payload_shape(self):
        report = make_report(
            self.user,
            input_mode="mixed",
            temperature=37.4,
            symptom_description="Mild headache since this morning.",
        )
        data = self.client.get(reverse("report-detail", args=[report.id])).data

        for key in ("id", "triage", "readings_summary", "symptom_description",
                    "disclaimer_text", "generated_at"):
            self.assertIn(key, data)
        self.assertEqual(data["symptom_description"], "Mild headache since this morning.")
        self.assertEqual(data["triage"]["triage_level"], "rest_at_home")

    def test_every_report_carries_a_disclaimer(self):
        report = make_report(self.user, temperature=37.0)
        data = self.client.get(reverse("report-detail", args=[report.id])).data
        self.assertTrue(data["disclaimer_text"].strip())

    def test_prompt_is_never_exposed_to_the_user(self):
        """prompt_sent is an audit field — it must not reach the client."""
        report = make_report(self.user, temperature=37.0)
        data = self.client.get(reverse("report-detail", args=[report.id])).data
        self.assertNotIn("prompt_sent", data["triage"])


class RetryTriageTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="u@test.com", password="pass12345", full_name="U"
        )
        self.other = User.objects.create_user(
            email="other@test.com", password="pass12345", full_name="Other"
        )

    def test_retry_rejected_when_the_first_call_already_succeeded(self):
        report = make_report(self.user, temperature=37.0, llm_model="llama-3.3-70b-versatile")
        self.client.force_authenticate(self.user)
        response = self.client.post(reverse("report-retry-triage", args=[report.id]))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_another_user_cannot_retry_your_report(self):
        report = make_report(self.user, temperature=37.0, llm_model=None)
        self.client.force_authenticate(self.other)
        response = self.client.post(reverse("report-retry-triage", args=[report.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_retry_requires_authentication(self):
        report = make_report(self.user, temperature=37.0, llm_model=None)
        response = self.client.post(reverse("report-retry-triage", args=[report.id]))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
