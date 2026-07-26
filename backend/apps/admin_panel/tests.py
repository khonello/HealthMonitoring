from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.health_records.models import HealthRecord
from apps.reports.assembler import _DEFAULT_DISCLAIMER, get_disclaimer
from apps.reports.models import TriageResult

from .models import LLMFailureLog, SafetyThreshold, SystemConfig


def make_triage(user, *, level="rest_at_home", urgency="low", confidence="high",
                hard_rule=False, metric=None, temperature=37.0):
    record = HealthRecord.objects.create(
        user=user, input_mode="structured", temperature=temperature
    )
    return TriageResult.objects.create(
        health_record=record,
        triage_level=level,
        urgency=urgency,
        confidence_level=confidence,
        hard_rule_triggered=hard_rule,
        hard_rule_metric=metric,
        recommendation_text="Seeded for tests.",
        prompt_sent="test",
    )


class AdminPermissionTests(APITestCase):
    """Every admin route must reject non-staff — these endpoints expose health data."""

    def setUp(self):
        self.regular = User.objects.create_user(
            email="regular@test.com", password="pass12345", full_name="Regular Person"
        )
        HealthRecord.objects.create(user=self.regular, input_mode="structured")
        self.threshold = SafetyThreshold.objects.get(metric="temperature")

    def routes(self):
        return [
            reverse("admin-summary"),
            reverse("admin-triage-oversight"),
            reverse("admin-llm-failures"),
            reverse("admin-llm-stats"),
            reverse("admin-user-list"),
            reverse("admin-user-detail", args=[self.regular.id]),
            reverse("admin-threshold-list"),
            reverse("admin-threshold-detail", args=[self.threshold.id]),
            reverse("admin-disclaimer-config"),
        ]

    def test_anonymous_is_rejected(self):
        for url in self.routes():
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_regular_user_is_forbidden(self):
        self.client.force_authenticate(self.regular)
        for url in self.routes():
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_user_cannot_deactivate_accounts(self):
        self.client.force_authenticate(self.regular)
        response = self.client.patch(reverse("admin-user-deactivate", args=[self.regular.id]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_user_cannot_edit_safety_thresholds(self):
        self.client.force_authenticate(self.regular)
        response = self.client.patch(
            reverse("admin-threshold-detail", args=[self.threshold.id]), {"value": 10.0}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.threshold.refresh_from_db()
        self.assertEqual(self.threshold.value, 40.0)


class AdminSummaryTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            email="staff@test.com", password="pass12345", full_name="Staff", is_staff=True
        )
        self.user = User.objects.create_user(
            email="u@test.com", password="pass12345", full_name="User"
        )
        self.client.force_authenticate(self.staff)

    def test_counts_reflect_recent_activity(self):
        make_triage(self.user, level="see_doctor", urgency="high", hard_rule=True, metric="temperature")
        make_triage(self.user, confidence="low")
        LLMFailureLog.objects.create(source="triage", error_type="Timeout", error_message="x")

        data = self.client.get(reverse("admin-summary")).data
        self.assertEqual(data["total_users"], 2)
        self.assertEqual(data["critical_last_24h"], 1)
        self.assertEqual(data["hard_rule_last_24h"], 1)
        self.assertEqual(data["low_confidence_last_24h"], 1)
        self.assertEqual(data["llm_failures_last_24h"], 1)

    def test_empty_system_reports_zeroes(self):
        data = self.client.get(reverse("admin-summary")).data
        for key in ("critical_last_24h", "hard_rule_last_24h", "low_confidence_last_24h"):
            self.assertEqual(data[key], 0, key)


class AdminTriageOversightTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            email="staff@test.com", password="pass12345", full_name="Staff", is_staff=True
        )
        self.user = User.objects.create_user(
            email="u@test.com", password="pass12345", full_name="User"
        )
        make_triage(self.user, level="see_doctor", urgency="high")
        make_triage(self.user, hard_rule=True, metric="spo2")
        make_triage(self.user, confidence="low")
        make_triage(self.user)
        self.client.force_authenticate(self.staff)
        self.url = reverse("admin-triage-oversight")

    def test_unfiltered_returns_everything(self):
        self.assertEqual(self.client.get(self.url).data["count"], 4)

    def test_filters(self):
        self.assertEqual(self.client.get(self.url, {"filter": "critical_urgent"}).data["count"], 1)
        self.assertEqual(self.client.get(self.url, {"filter": "hard_rule"}).data["count"], 1)
        self.assertEqual(self.client.get(self.url, {"filter": "low_confidence"}).data["count"], 1)

    def test_unknown_filter_is_ignored_not_empty(self):
        self.assertEqual(self.client.get(self.url, {"filter": "nonsense"}).data["count"], 4)

    def test_row_identifies_the_submitting_user(self):
        row = self.client.get(self.url).data["results"][0]
        self.assertEqual(row["user_email"], "u@test.com")
        self.assertIn("health_record_id", row)


class AdminUserManagementTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            email="staff@test.com", password="pass12345", full_name="Staff", is_staff=True
        )
        self.alice = User.objects.create_user(
            email="alice@test.com", password="pass12345", full_name="Alice Adams"
        )
        self.bob = User.objects.create_user(
            email="bob@test.com", password="pass12345", full_name="Bob Brown"
        )
        self.client.force_authenticate(self.staff)

    def test_search_matches_email_and_name(self):
        url = reverse("admin-user-list")
        self.assertEqual(self.client.get(url, {"search": "alice@"}).data["count"], 1)
        self.assertEqual(self.client.get(url, {"search": "Brown"}).data["count"], 1)
        self.assertEqual(self.client.get(url, {"search": "nobody"}).data["count"], 0)

    def test_recent_critical_flag(self):
        make_triage(self.alice, level="see_doctor", urgency="high")
        rows = {r["email"]: r for r in self.client.get(reverse("admin-user-list")).data["results"]}
        self.assertTrue(rows["alice@test.com"]["has_recent_critical"])
        self.assertFalse(rows["bob@test.com"]["has_recent_critical"])

    def test_detail_includes_health_records(self):
        make_triage(self.alice, temperature=38.4)
        data = self.client.get(reverse("admin-user-detail", args=[self.alice.id])).data
        self.assertEqual(data["email"], "alice@test.com")
        self.assertEqual(len(data["health_records"]), 1)
        self.assertEqual(data["health_records"][0]["temperature"], 38.4)
        self.assertIsNotNone(data["health_records"][0]["triage"])

    def test_deactivate_toggles_both_ways(self):
        url = reverse("admin-user-deactivate", args=[self.alice.id])
        self.assertFalse(self.client.patch(url).data["is_active"])
        self.alice.refresh_from_db()
        self.assertFalse(self.alice.is_active)

        self.assertTrue(self.client.patch(url).data["is_active"])
        self.alice.refresh_from_db()
        self.assertTrue(self.alice.is_active)

    def test_deactivated_user_cannot_log_in(self):
        self.client.patch(reverse("admin-user-deactivate", args=[self.alice.id]))
        anon = self.client_class()
        response = anon.post(
            reverse("auth-login"),
            {"email": "alice@test.com", "password": "pass12345"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AdminSafetyConfigTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            email="staff@test.com", password="pass12345", full_name="Staff", is_staff=True
        )
        self.client.force_authenticate(self.staff)

    def test_migration_seeded_all_four_thresholds(self):
        data = self.client.get(reverse("admin-threshold-list")).data
        self.assertEqual(data["count"], 4)
        metrics = {row["metric"] for row in data["results"]}
        self.assertEqual(metrics, {"temperature", "spo2", "heart_rate", "systolic_bp"})

    def test_editing_a_threshold_changes_triage_behaviour(self):
        from apps.triage.rules import check_hard_rules

        user = User.objects.create_user(
            email="p@test.com", password="pass12345", full_name="Patient"
        )
        record = HealthRecord.objects.create(user=user, input_mode="structured", temperature=38.5)
        self.assertEqual(check_hard_rules(record), (False, None))

        threshold = SafetyThreshold.objects.get(metric="temperature")
        response = self.client.patch(
            reverse("admin-threshold-detail", args=[threshold.id]), {"value": 38.0}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(check_hard_rules(record), (True, "temperature"))

    def test_metric_name_is_not_editable(self):
        threshold = SafetyThreshold.objects.get(metric="spo2")
        self.client.patch(
            reverse("admin-threshold-detail", args=[threshold.id]),
            {"metric": "renamed"},
            format="json",
        )
        threshold.refresh_from_db()
        self.assertEqual(threshold.metric, "spo2")


class DisclaimerTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            email="staff@test.com", password="pass12345", full_name="Staff", is_staff=True
        )

    def test_migration_seeded_a_disclaimer(self):
        self.assertTrue(SystemConfig.objects.filter(key="disclaimer_text").exists())
        self.assertTrue(get_disclaimer().strip())

    def test_staff_can_edit_it(self):
        self.client.force_authenticate(self.staff)
        response = self.client.patch(
            reverse("admin-disclaimer-config"), {"value": "Updated notice."}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(get_disclaimer(), "Updated notice.")

    def test_blank_disclaimer_falls_back_to_default(self):
        """An admin clearing the field must never leave a report with no disclaimer."""
        self.client.force_authenticate(self.staff)
        self.client.patch(reverse("admin-disclaimer-config"), {"value": "   "}, format="json")
        self.assertEqual(get_disclaimer(), _DEFAULT_DISCLAIMER)

    def test_missing_row_falls_back_to_default(self):
        SystemConfig.objects.filter(key="disclaimer_text").delete()
        self.assertEqual(get_disclaimer(), _DEFAULT_DISCLAIMER)

    def test_public_endpoint_is_readable_without_auth(self):
        response = self.client.get(reverse("public-disclaimer"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["disclaimer"].strip())

    def test_public_endpoint_reflects_admin_edits(self):
        self.client.force_authenticate(self.staff)
        self.client.patch(
            reverse("admin-disclaimer-config"), {"value": "New public text."}, format="json"
        )
        self.client.force_authenticate(None)
        response = self.client.get(reverse("public-disclaimer"))
        self.assertEqual(response.data["disclaimer"], "New public text.")

    def test_public_endpoint_is_read_only(self):
        response = self.client.patch(reverse("public-disclaimer"), {"disclaimer": "hacked"})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class AdminLLMHealthTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            email="staff@test.com", password="pass12345", full_name="Staff", is_staff=True
        )
        LLMFailureLog.objects.create(source="triage", error_type="Timeout", error_message="a")
        LLMFailureLog.objects.create(source="triage", error_type="Timeout", error_message="b")
        LLMFailureLog.objects.create(source="retry", error_type="RateLimit", error_message="c")
        self.client.force_authenticate(self.staff)

    def test_stats_group_by_source_and_error_type(self):
        data = self.client.get(reverse("admin-llm-stats")).data
        self.assertEqual(data["total"], 3)
        self.assertEqual(data["last_24h"], 3)
        self.assertEqual({r["source"]: r["count"] for r in data["by_source"]}, {"triage": 2, "retry": 1})
        self.assertEqual(
            {r["error_type"]: r["count"] for r in data["by_error_type"]},
            {"Timeout": 2, "RateLimit": 1},
        )

    def test_failure_list_tolerates_a_null_health_record(self):
        row = self.client.get(reverse("admin-llm-failures")).data["results"][0]
        self.assertIsNone(row["health_record_id"])
        self.assertIsNone(row["user_email"])
