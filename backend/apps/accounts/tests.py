from datetime import date

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import User


class RegisterTests(APITestCase):
    def setUp(self):
        self.url = reverse("auth-register")
        self.payload = {
            "email": "new@test.com",
            "password": "pass12345",
            "full_name": "New Person",
        }

    def test_creates_account_and_returns_tokens(self):
        response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "new@test.com")

    def test_password_is_hashed_not_stored_raw(self):
        self.client.post(self.url, self.payload, format="json")
        user = User.objects.get(email="new@test.com")
        self.assertNotEqual(user.password, "pass12345")
        self.assertTrue(user.check_password("pass12345"))

    def test_password_is_never_returned(self):
        response = self.client.post(self.url, self.payload, format="json")
        self.assertNotIn("password", response.data.get("user", {}))

    def test_rejects_duplicate_email(self):
        self.client.post(self.url, self.payload, format="json")
        response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.filter(email="new@test.com").count(), 1)

    def test_rejects_short_password(self):
        response = self.client.post(
            self.url, {**self.payload, "password": "short"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_rejects_malformed_email(self):
        response = self.client.post(
            self.url, {**self.payload, "email": "not-an-email"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_new_accounts_are_never_staff(self):
        """There is no auto-promotion path — staff comes only from the seed or createsuperuser."""
        response = self.client.post(self.url, self.payload, format="json")
        self.assertFalse(response.data["user"]["is_staff"])
        self.assertFalse(User.objects.get(email="new@test.com").is_staff)

    def test_accepts_optional_profile_fields(self):
        response = self.client.post(
            self.url,
            {**self.payload, "date_of_birth": "1995-04-12", "gender": "female"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="new@test.com")
        self.assertEqual(user.date_of_birth, date(1995, 4, 12))
        self.assertEqual(user.gender, "female")


class LoginTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="person@test.com", password="pass12345", full_name="A Person"
        )
        self.url = reverse("auth-login")

    def test_valid_credentials_return_tokens(self):
        response = self.client.post(
            self.url, {"email": "person@test.com", "password": "pass12345"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertEqual(response.data["user"]["email"], "person@test.com")

    def test_wrong_password_is_rejected(self):
        response = self.client.post(
            self.url, {"email": "person@test.com", "password": "wrong-one"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn("access", response.data)

    def test_unknown_email_is_rejected(self):
        response = self.client.post(
            self.url, {"email": "nobody@test.com", "password": "pass12345"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_deactivated_account_is_rejected(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        response = self.client.post(
            self.url, {"email": "person@test.com", "password": "pass12345"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_does_not_grant_staff(self):
        self.client.post(
            self.url, {"email": "person@test.com", "password": "pass12345"}, format="json"
        )
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_staff)


class TokenRefreshTests(APITestCase):
    def test_refresh_token_returns_a_new_access_token(self):
        User.objects.create_user(
            email="person@test.com", password="pass12345", full_name="A Person"
        )
        login = self.client.post(
            reverse("auth-login"),
            {"email": "person@test.com", "password": "pass12345"},
            format="json",
        )
        response = self.client.post(
            reverse("auth-token-refresh"), {"refresh": login.data["refresh"]}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_garbage_refresh_token_is_rejected(self):
        response = self.client.post(
            reverse("auth-token-refresh"), {"refresh": "not-a-token"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ProfileTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="person@test.com", password="pass12345", full_name="A Person"
        )
        self.url = reverse("auth-profile")

    def test_requires_authentication(self):
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_returns_the_signed_in_user(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "person@test.com")

    def test_updates_editable_fields(self):
        self.client.force_authenticate(self.user)
        response = self.client.patch(
            self.url,
            {"full_name": "Renamed Person", "date_of_birth": "1990-01-15", "gender": "other"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.full_name, "Renamed Person")
        self.assertEqual(self.user.date_of_birth, date(1990, 1, 15))

    def test_email_is_not_editable_through_the_profile(self):
        self.client.force_authenticate(self.user)
        self.client.patch(self.url, {"email": "hijacked@test.com"}, format="json")
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "person@test.com")

    def test_staff_flag_cannot_be_self_granted(self):
        self.client.force_authenticate(self.user)
        self.client.patch(self.url, {"is_staff": True}, format="json")
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_staff)

    def test_delete_removes_the_account(self):
        self.client.force_authenticate(self.user)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(email="person@test.com").exists())

    def test_delete_cascades_to_health_records(self):
        from apps.health_records.models import HealthRecord

        HealthRecord.objects.create(user=self.user, input_mode="structured", temperature=37.0)
        self.client.force_authenticate(self.user)
        self.client.delete(self.url)
        self.assertEqual(HealthRecord.objects.count(), 0)


class UserModelTests(APITestCase):
    def test_email_is_the_username_field(self):
        self.assertEqual(User.USERNAME_FIELD, "email")

    def test_create_user_requires_an_email(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(email="", password="pass12345", full_name="No Email")

    def test_email_is_normalised(self):
        user = User.objects.create_user(
            email="Person@TEST.COM", password="pass12345", full_name="Mixed Case"
        )
        self.assertEqual(user.email, "Person@test.com")

    def test_create_superuser_sets_both_flags(self):
        admin = User.objects.create_superuser(
            email="root@test.com", password="pass12345", full_name="Root"
        )
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
