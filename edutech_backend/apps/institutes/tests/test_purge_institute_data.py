from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from apps.institutes.models import Institute


class PurgeInstituteDataCommandTestCase(TestCase):
    def test_guarded_purge_refuses_normal_institute(self):
        institute = Institute.objects.create(
            code="CUSTOMER001",
            name="Customer Institute",
            metadata={},
        )

        with self.assertRaisesMessage(CommandError, "is not marked"):
            call_command(
                "purge_institute_data",
                institute.code,
                apply=True,
                require_synthetic_fixture=True,
                stdout=StringIO(),
            )

        self.assertTrue(Institute.objects.filter(pk=institute.pk).exists())

    def test_guarded_purge_removes_only_marked_fixture(self):
        customer = Institute.objects.create(
            code="CUSTOMER002",
            name="Customer Institute",
            metadata={},
        )
        fixture = Institute.objects.create(
            code="W05QA001",
            name="W05 Synthetic Fixture",
            metadata={"synthetic_fixture": True, "fixture_namespace": "W05.03"},
        )

        call_command(
            "purge_institute_data",
            fixture.code,
            apply=True,
            require_synthetic_fixture=True,
            stdout=StringIO(),
        )

        self.assertFalse(Institute.objects.filter(pk=fixture.pk).exists())
        self.assertTrue(Institute.objects.filter(pk=customer.pk).exists())
