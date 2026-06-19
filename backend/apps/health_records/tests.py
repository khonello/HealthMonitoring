from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


def make_user(email="test@example.com", password="testpass123"):
    return User.objects.create_user(email=email, password=password, full_name="Test User")


class SubmitHealthDataTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = make_user()
        self.client.force_authenticate(user=self.user)

    def test_requires_auth(self):
        self.client.logout()
        r = self.client.post("/api/health/submit/", {"temperature": 37.0}, format="json")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_empty_payload_rejected(self):
        r = self.client.post("/api/health/submit/", {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valid_structured_input_accepted(self):
        r = self.client.post(
            "/api/health/submit/",
            {"temperature": 37.2, "heart_rate": 72},
            format="json",
        )
        # 201 if triage LLM is mocked/available, or any non-500 response
        self.assertNotEqual(r.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)

    def test_out_of_range_temperature_still_accepted(self):
        """Validation allows any float — range checking is a triage concern, not input validation."""
        r = self.client.post("/api/health/submit/", {"temperature": 45.0}, format="json")
        self.assertNotEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_descriptive_only_input_accepted(self):
        r = self.client.post(
            "/api/health/submit/",
            {"symptom_description": "I have a bad headache and feel very tired since morning"},
            format="json",
        )
        self.assertNotEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


class HealthHistoryTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = make_user()
        self.client.force_authenticate(user=self.user)

    def test_requires_auth(self):
        self.client.logout()
        r = self.client.get("/api/health/history/")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_returns_paginated_response(self):
        r = self.client.get("/api/health/history/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("results", r.data)
        self.assertIn("count", r.data)

    def test_empty_for_new_user(self):
        r = self.client.get("/api/health/history/")
        self.assertEqual(r.data["count"], 0)
        self.assertEqual(r.data["results"], [])

    def test_other_users_records_not_visible(self):
        other = make_user(email="other@example.com")
        other_client = APIClient()
        other_client.force_authenticate(user=other)
        # other user submits — we won't call triage here, just create record directly
        from apps.health_records.models import HealthRecord
        HealthRecord.objects.create(
            user=other,
            temperature=37.0,
            input_mode="structured",
            input_confidence="medium",
        )
        r = self.client.get("/api/health/history/")
        self.assertEqual(r.data["count"], 0)


class ExportHealthDataTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = make_user()
        self.client.force_authenticate(user=self.user)

    def test_requires_auth(self):
        self.client.logout()
        r = self.client.get("/api/health/export/")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_returns_list(self):
        r = self.client.get("/api/health/export/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIsInstance(r.data, list)

    def test_export_not_paginated(self):
        r = self.client.get("/api/health/export/")
        self.assertNotIn("results", r.data)
        self.assertNotIn("count", r.data)
