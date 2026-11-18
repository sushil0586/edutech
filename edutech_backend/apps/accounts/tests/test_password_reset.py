from datetime import timedelta
from urllib.parse import parse_qs, urlparse
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import AccountProfile, PasswordResetRequest


User = get_user_model()


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    PASSWORD_RESET_WEB_URL="https://learn.example.test/reset-password",
    SECURE_SSL_REDIRECT=False,
)
class PasswordResetApiTestCase(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="recover@example.test",
            email="recover@example.test",
            password="OriginalPassword@123",
        )
        AccountProfile.objects.create(user=self.user, role="platform_admin")

    def _request_and_token(self):
        response = self.client.post(
            "/api/v1/auth/password-reset/request/",
            {"identifier": self.user.email},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(mail.outbox), 1)
        reset_url = mail.outbox[0].body.splitlines()[2]
        query = parse_qs(urlparse(reset_url).query)
        return response, query["request"][0], query["token"][0]

    def test_request_is_neutral_and_delivery_is_recorded(self):
        matched, _, _ = self._request_and_token()
        unmatched = self.client.post(
            "/api/v1/auth/password-reset/request/",
            {"identifier": "missing@example.test"},
            format="json",
        )
        self.assertEqual(unmatched.status_code, 200)
        self.assertEqual(matched.data, unmatched.data)
        self.assertEqual(PasswordResetRequest.objects.get().delivery_status, "sent")

    def test_requests_are_rate_limited(self):
        statuses = [
            self.client.post(
                "/api/v1/auth/password-reset/request/",
                {"identifier": "missing@example.test"},
                format="json",
            ).status_code
            for _ in range(6)
        ]
        self.assertEqual(statuses[:5], [200] * 5)
        self.assertEqual(statuses[5], 429)

    def test_confirmation_is_single_use_and_invalidates_existing_tokens(self):
        login = self.client.post(
            "/api/v1/auth/login/",
            {"username": self.user.username, "password": "OriginalPassword@123"},
            format="json",
        )
        access = login.data["access"]
        refresh = login.data["refresh"]
        _, request_id, token = self._request_and_token()
        payload = {
            "request": request_id,
            "token": token,
            "new_password": "RecoveredPassword@456",
            "confirm_password": "RecoveredPassword@456",
        }
        response = self.client.post("/api/v1/auth/password-reset/confirm/", payload, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        replay = self.client.post("/api/v1/auth/password-reset/confirm/", payload, format="json")
        self.assertEqual(replay.status_code, 400)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 401)
        self.client.credentials()
        self.assertEqual(
            self.client.post("/api/v1/auth/refresh/", {"refresh": refresh}, format="json").status_code,
            401,
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/login/",
                {"username": self.user.username, "password": "RecoveredPassword@456"},
                format="json",
            ).status_code,
            200,
        )

    def test_expired_token_and_delivery_failure_do_not_reset_password(self):
        _, request_id, token = self._request_and_token()
        PasswordResetRequest.objects.filter(pk=request_id).update(
            expires_at=timezone.now() - timedelta(seconds=1)
        )
        response = self.client.post(
            "/api/v1/auth/password-reset/confirm/",
            {
                "request": request_id,
                "token": token,
                "new_password": "RecoveredPassword@456",
                "confirm_password": "RecoveredPassword@456",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OriginalPassword@123"))

        with patch("apps.accounts.services.send_mail", side_effect=RuntimeError("provider down")):
            neutral = self.client.post(
                "/api/v1/auth/password-reset/request/",
                {"identifier": self.user.email},
                format="json",
            )
        self.assertEqual(neutral.status_code, 200)
        self.assertEqual(PasswordResetRequest.objects.latest("created_at").delivery_status, "failed")
