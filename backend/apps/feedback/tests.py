from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.health_records.models import HealthRecord

from .models import Feedback


class FeedbackSubmitTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="submitter@test.com", password="pass12345", full_name="Sub Mitter"
        )
        self.url = reverse("feedback-list-create")

    def test_requires_authentication(self):
        response = self.client.post(self.url, {"category": "bug", "message": "Something is broken here."})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_submits_feedback(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.url,
            {"category": "suggestion", "message": "Please add a dark mode option.", "rating": 4},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        feedback = Feedback.objects.get()
        self.assertEqual(feedback.user, self.user)
        self.assertEqual(feedback.category, "suggestion")
        self.assertEqual(feedback.rating, 4)
        self.assertEqual(feedback.status, "new")

    def test_rejects_short_message(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(self.url, {"category": "bug", "message": "bad"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("message", response.data)
        self.assertEqual(Feedback.objects.count(), 0)

    def test_rejects_whitespace_only_message(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.url, {"category": "bug", "message": "              "}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Feedback.objects.count(), 0)

    def test_rejects_out_of_range_rating(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.url,
            {"category": "other", "message": "This rating should be rejected.", "rating": 9},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("rating", response.data)

    def test_rating_is_optional(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.url, {"category": "other", "message": "No rating supplied here."}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(Feedback.objects.get().rating)

    def test_cannot_attach_another_users_health_record(self):
        other = User.objects.create_user(
            email="other@test.com", password="pass12345", full_name="Other Person"
        )
        record = HealthRecord.objects.create(user=other, input_mode="structured", temperature=37.0)
        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.url,
            {
                "category": "triage_accuracy",
                "message": "This triage looked wrong to me.",
                "health_record": record.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Feedback.objects.count(), 0)

    def test_can_attach_own_health_record(self):
        record = HealthRecord.objects.create(user=self.user, input_mode="structured", temperature=37.0)
        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.url,
            {
                "category": "triage_accuracy",
                "message": "The result did not match how I felt.",
                "health_record": record.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Feedback.objects.get().health_record, record)

    def test_status_cannot_be_set_by_submitter(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.url,
            {"category": "bug", "message": "Trying to mark this resolved.", "status": "resolved"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Feedback.objects.get().status, "new")

    def test_list_returns_only_own_feedback(self):
        other = User.objects.create_user(
            email="other2@test.com", password="pass12345", full_name="Other Two"
        )
        Feedback.objects.create(user=self.user, category="bug", message="Mine to see.")
        Feedback.objects.create(user=other, category="bug", message="Not mine to see.")
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["message"], "Mine to see.")

    def test_admin_note_hidden_from_submitter(self):
        Feedback.objects.create(
            user=self.user, category="bug", message="Has a note.", admin_note="Internal only."
        )
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)
        self.assertNotIn("admin_note", response.data["results"][0])


class AdminFeedbackTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            email="staff@test.com", password="pass12345", full_name="Staff Member", is_staff=True
        )
        self.user = User.objects.create_user(
            email="regular@test.com", password="pass12345", full_name="Regular Person"
        )
        self.feedback = Feedback.objects.create(
            user=self.user, category="bug", message="The report screen crashes."
        )
        self.list_url = reverse("admin-feedback-list")
        self.detail_url = reverse("admin-feedback-detail", args=[self.feedback.id])

    def test_non_staff_forbidden(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get(self.list_url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.patch(self.detail_url, {}).status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_sees_submitter_identity(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = response.data["results"][0]
        self.assertEqual(row["user_email"], "regular@test.com")
        self.assertEqual(row["user_full_name"], "Regular Person")

    def test_filter_by_status_and_category(self):
        Feedback.objects.create(
            user=self.user, category="suggestion", message="A nice idea.", status="resolved"
        )
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.get(self.list_url, {"status": "new"}).data["count"], 1)
        self.assertEqual(self.client.get(self.list_url, {"status": "resolved"}).data["count"], 1)
        self.assertEqual(self.client.get(self.list_url, {"category": "bug"}).data["count"], 1)
        # An unrecognised value is ignored rather than returning an empty list.
        self.assertEqual(self.client.get(self.list_url, {"status": "bogus"}).data["count"], 2)

    def test_staff_updates_status_and_note(self):
        self.client.force_authenticate(self.staff)
        response = self.client.patch(
            self.detail_url, {"status": "reviewed", "admin_note": "Reproduced."}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.feedback.refresh_from_db()
        self.assertEqual(self.feedback.status, "reviewed")
        self.assertEqual(self.feedback.admin_note, "Reproduced.")

    def test_staff_cannot_rewrite_submitted_message(self):
        self.client.force_authenticate(self.staff)
        response = self.client.patch(self.detail_url, {"message": "Rewritten."}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.feedback.refresh_from_db()
        self.assertEqual(self.feedback.message, "The report screen crashes.")

    def test_summary_counts_new_feedback(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get(reverse("admin-summary"))
        self.assertEqual(response.data["new_feedback"], 1)
        self.feedback.status = "resolved"
        self.feedback.save(update_fields=["status"])
        response = self.client.get(reverse("admin-summary"))
        self.assertEqual(response.data["new_feedback"], 0)
