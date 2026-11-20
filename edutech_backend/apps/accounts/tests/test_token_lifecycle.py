from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from apps.accounts.models import AccountProfile, AccountRole, AccountSession


User = get_user_model()


class TokenLifecycleSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="token-lifecycle-user",
            email="token-lifecycle@example.test",
            password="TokenLifecycle@123",
        )
        AccountProfile.objects.create(
            user=self.user,
            role=AccountRole.PLATFORM_ADMIN,
            is_active=True,
        )

    def test_valid_refresh_issues_a_new_access_token(self):
        login = self.client.post(
            "/api/v1/auth/login/",
            {"username": self.user.username, "password": "TokenLifecycle@123"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)

        refreshed = self.client.post(
            "/api/v1/auth/refresh/",
            {"refresh": login.data["refresh"]},
            format="json",
        )

        self.assertEqual(refreshed.status_code, 200)
        self.assertTrue(refreshed.data["access"])
        self.assertNotEqual(refreshed.data["access"], login.data["access"])

    def test_expired_access_token_is_rejected_without_authentication(self):
        token = AccessToken.for_user(self.user)
        token.set_exp(lifetime=timedelta(seconds=-1))
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.client.get("/api/v1/auth/me/")

        self.assertEqual(response.status_code, 401)

    def test_refresh_is_rejected_after_password_change(self):
        login = self.client.post(
            "/api/v1/auth/login/",
            {"username": self.user.username, "password": "TokenLifecycle@123"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)
        self.user.set_password("TokenLifecycleChanged@123")
        self.user.save(update_fields=["password"])

        refreshed = self.client.post(
            "/api/v1/auth/refresh/",
            {"refresh": login.data["refresh"]},
            format="json",
        )

        self.assertEqual(refreshed.status_code, 401)

    def test_logout_revokes_access_and_refresh_for_only_that_session(self):
        first = self.client.post(
            "/api/v1/auth/login/",
            {"username": self.user.username, "password": "TokenLifecycle@123"},
            format="json",
        )
        second = self.client.post(
            "/api/v1/auth/login/",
            {"username": self.user.username, "password": "TokenLifecycle@123"},
            format="json",
        )

        logged_out = self.client.post(
            "/api/v1/auth/logout/",
            {"refresh": first.data["refresh"]},
            format="json",
        )
        self.assertEqual(logged_out.status_code, 200)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {first.data['access']}")
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 401)
        self.client.credentials()
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/refresh/",
                {"refresh": first.data["refresh"]},
                format="json",
            ).status_code,
            401,
        )

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {second.data['access']}")
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 200)
        self.client.credentials()
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/refresh/",
                {"refresh": second.data["refresh"]},
                format="json",
            ).status_code,
            200,
        )

    def test_logout_is_idempotent_for_the_same_session(self):
        login = self.client.post(
            "/api/v1/auth/login/",
            {"username": self.user.username, "password": "TokenLifecycle@123"},
            format="json",
        )
        payload = {"refresh": login.data["refresh"]}

        self.assertEqual(self.client.post("/api/v1/auth/logout/", payload, format="json").status_code, 200)
        self.assertEqual(self.client.post("/api/v1/auth/logout/", payload, format="json").status_code, 200)

    def test_access_is_rejected_after_server_session_expires(self):
        login = self.client.post(
            "/api/v1/auth/login/",
            {"username": self.user.username, "password": "TokenLifecycle@123"},
            format="json",
        )
        session = AccountSession.objects.get(user=self.user)
        session.expires_at = timezone.now() - timedelta(seconds=1)
        session.save(update_fields=["expires_at", "updated_at"])
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 401)

    def test_refresh_is_rejected_after_server_session_expires(self):
        login = self.client.post(
            "/api/v1/auth/login/",
            {"username": self.user.username, "password": "TokenLifecycle@123"},
            format="json",
        )
        session = AccountSession.objects.get(user=self.user)
        session.expires_at = timezone.now() - timedelta(seconds=1)
        session.save(update_fields=["expires_at", "updated_at"])

        response = self.client.post(
            "/api/v1/auth/refresh/",
            {"refresh": login.data["refresh"]},
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    def test_malformed_logout_token_does_not_revoke_another_session(self):
        login = self.client.post(
            "/api/v1/auth/login/",
            {"username": self.user.username, "password": "TokenLifecycle@123"},
            format="json",
        )

        self.assertEqual(
            self.client.post("/api/v1/auth/logout/", {"refresh": "not-a-token"}, format="json").status_code,
            400,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 200)

    def test_legacy_access_token_without_session_claim_is_rejected(self):
        token = AccessToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 401)

    def test_foreign_session_claim_is_rejected(self):
        other = User.objects.create_user(
            username="token-lifecycle-other",
            email="token-lifecycle-other@example.test",
            password="TokenLifecycle@123",
        )
        AccountProfile.objects.create(user=other, role=AccountRole.PLATFORM_ADMIN, is_active=True)
        other_login = self.client.post(
            "/api/v1/auth/login/",
            {"username": other.username, "password": "TokenLifecycle@123"},
            format="json",
        )
        other_session_id = RefreshToken(other_login.data["refresh"])["sid"]
        forged_server_token = AccessToken.for_user(self.user)
        forged_server_token["sid"] = other_session_id
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {forged_server_token}")

        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 401)

    def test_new_login_removes_expired_sessions_for_that_user(self):
        expired = AccountSession.objects.create(
            user=self.user,
            expires_at=timezone.now() - timedelta(days=1),
        )

        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": self.user.username, "password": "TokenLifecycle@123"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(AccountSession.objects.filter(id=expired.id).exists())
