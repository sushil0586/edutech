from django.test import SimpleTestCase
from django.urls import Resolver404, resolve


class DeploymentRouteContractTests(SimpleTestCase):
    def test_django_admin_uses_the_documented_non_conflicting_prefix(self):
        match = resolve("/django-admin/login/")

        self.assertEqual(match.app_name, "admin")
        with self.assertRaises(Resolver404):
            resolve("/admin/login/")
