from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.academics.models import Subject
from apps.economy.models import RewardRule
from apps.institutes.models import Institute


class SeedInstituteBootstrapCommandTestCase(TestCase):
    def test_bootstrap_creates_regular_institute_and_can_seed_economy_and_academics(self):
        stdout = StringIO()

        call_command(
            "seed_institute_bootstrap",
            "SCH001",
            name="Springfield School",
            seed_academics=True,
            stdout=stdout,
        )

        institute = Institute.objects.get(code="SCH001")
        self.assertFalse(institute.metadata["is_public_content_hub"])
        self.assertEqual(institute.metadata["content_owner_type"], "tenant")
        self.assertEqual(RewardRule.objects.filter(institute=institute).count(), 4)
        self.assertEqual(Subject.objects.filter(institute=institute).count(), 5)
        self.assertIn("Bootstrapping institute academic defaults", stdout.getvalue())

    def test_bootstrap_can_skip_economy_seed(self):
        stdout = StringIO()

        call_command(
            "seed_institute_bootstrap",
            "SCH002",
            name="Riverdale School",
            skip_economy_seed=True,
            stdout=stdout,
        )

        institute = Institute.objects.get(code="SCH002")
        self.assertEqual(RewardRule.objects.filter(institute=institute).count(), 0)
        self.assertIn("Economy seed skipped for the institute", stdout.getvalue())
