from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from apps.economy.models import ContentAccessPolicy, RewardRule
from apps.institutes.models import Institute
from common.tests.builders import AcademicAssessmentBuilder


class SeedPublicInstituteBootstrapCommandTestCase(TestCase):
    def test_creates_public_institute_and_runs_default_economy_seed(self):
        stdout = StringIO()

        call_command("seed_public_institute_bootstrap", stdout=stdout)

        institute = Institute.objects.get(code="PUB001")
        self.assertEqual(institute.name, "Nexora Public Institute")
        self.assertTrue(institute.is_active)
        self.assertEqual(institute.metadata["seed_code"], "public_institute_bootstrap_v1")
        self.assertTrue(institute.metadata["is_public_content_hub"])
        self.assertEqual(institute.metadata["content_owner_type"], "platform")
        self.assertEqual(institute.metadata["visibility_rule"], "academic_match")

        self.assertEqual(RewardRule.objects.filter(institute=institute).count(), 4)
        self.assertEqual(ContentAccessPolicy.objects.filter(institute=institute).count(), 5)

        output = stdout.getvalue()
        self.assertIn("Public institute created", output)
        self.assertIn("Bootstrapping platform-owned economy defaults", output)

    def test_updates_existing_institute_preserves_custom_metadata_and_can_skip_economy(self):
        builder = AcademicAssessmentBuilder()
        institute = builder.create_institute(
            code="PUB001",
            name="Old Public Institute",
            metadata={"custom_flag": "keep-me"},
            is_active=False,
        )
        stdout = StringIO()

        call_command(
            "seed_public_institute_bootstrap",
            name="Renamed Public Institute",
            skip_economy_seed=True,
            stdout=stdout,
        )

        institute.refresh_from_db()
        self.assertEqual(institute.name, "Renamed Public Institute")
        self.assertTrue(institute.is_active)
        self.assertEqual(institute.metadata["custom_flag"], "keep-me")
        self.assertTrue(institute.metadata["is_public_content_hub"])
        self.assertEqual(RewardRule.objects.filter(institute=institute).count(), 0)
        self.assertIn("Economy seed skipped", stdout.getvalue())

    def test_can_pass_custom_code_and_future_economy_templates(self):
        stdout = StringIO()

        call_command(
            "seed_public_institute_bootstrap",
            code="NEXORA-PUBLIC",
            name="Nexora Shared Public Hub",
            include_future_economy_templates=True,
            stdout=stdout,
        )

        institute = Institute.objects.get(code="NEXORA-PUBLIC")
        self.assertEqual(institute.metadata["public_institute_code"], "NEXORA-PUBLIC")
        self.assertEqual(RewardRule.objects.filter(institute=institute).count(), 7)
        self.assertIn("Template mode: baseline + future templates", stdout.getvalue())

    def test_rejects_creating_a_second_public_institute(self):
        builder = AcademicAssessmentBuilder()
        builder.create_institute(
            code="PUB001",
            name="Existing Public Hub",
            metadata={"is_public_content_hub": True},
        )

        with self.assertRaisesMessage(
            CommandError,
            "A public institute already exists (PUB001). Only one public institute is allowed.",
        ):
            call_command(
                "seed_public_institute_bootstrap",
                code="PUB002",
                name="Another Public Hub",
            )
