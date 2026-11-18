from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import AccountProfile, SupportRequest
from apps.institutes.models import Institute


User = get_user_model()


@override_settings(SECURE_SSL_REDIRECT=False)
class SupportRequestApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.first_institute = Institute.objects.create(name="First School", code="SUP-FIRST")
        self.second_institute = Institute.objects.create(name="Second School", code="SUP-SECOND")
        self.first_admin = User.objects.create_user("first-support", password="Password@123")
        self.second_admin = User.objects.create_user("second-support", password="Password@123")
        self.platform_admin = User.objects.create_user("platform-support", password="Password@123")
        AccountProfile.objects.create(user=self.first_admin, role="institute_admin", institute=self.first_institute)
        AccountProfile.objects.create(user=self.second_admin, role="institute_admin", institute=self.second_institute)
        AccountProfile.objects.create(user=self.platform_admin, role="platform_admin")

    def test_request_is_owned_by_authenticated_tenant_and_cross_tenant_hidden(self):
        self.client.force_authenticate(self.first_admin)
        response = self.client.post(
            "/api/v1/support/requests/",
            {
                "category": "data_export",
                "subject": "Export my institute account data",
                "description": "Please prepare the verified account data export for this pilot account.",
                "institute": str(self.second_institute.id),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        support_request = SupportRequest.objects.get(pk=response.data["id"])
        self.assertEqual(support_request.requester, self.first_admin)
        self.assertEqual(support_request.institute, self.first_institute)

        self.client.force_authenticate(self.second_admin)
        self.assertEqual(self.client.get("/api/v1/support/requests/").data, [])
        denied = self.client.patch(
            f"/api/v1/support/requests/{support_request.id}/",
            {"status": "resolved", "resolution_notes": "Unauthorized cross-tenant closure."},
            format="json",
        )
        self.assertEqual(denied.status_code, 403)

        self.client.force_authenticate(self.platform_admin)
        platform_response = self.client.get("/api/v1/support/requests/")
        self.assertEqual(len(platform_response.data), 1)
        self.assertEqual(platform_response.data[0]["category"], "data_export")
        resolved = self.client.patch(
            f"/api/v1/support/requests/{support_request.id}/",
            {"status": "resolved", "resolution_notes": "Verified export delivered to the account email."},
            format="json",
        )
        self.assertEqual(resolved.status_code, 200)
        self.assertEqual(resolved.data["status"], "resolved")
        self.assertEqual(resolved.data["resolved_by"], self.platform_admin.id)
