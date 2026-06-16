from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from apps.academics.models import Subject, Topic
from common.tests.builders import AcademicAssessmentBuilder


class SeedInstituteAcademicsCommandTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.institute = self.builder.create_institute(code="SCH001", name="Springfield School")

    def test_seed_institute_academics_creates_class_7_tree(self):
        stdout = StringIO()

        call_command("seed_institute_academics", "SCH001", stdout=stdout)

        self.assertEqual(Subject.objects.filter(institute=self.institute).count(), 5)
        self.assertEqual(Topic.objects.filter(institute=self.institute).count(), 96)
        self.assertIn("Institute academics seeded for SCH001", stdout.getvalue())

    def test_seed_institute_academics_rejects_public_hub(self):
        self.institute.metadata = {"is_public_content_hub": True}
        self.institute.save()

        with self.assertRaisesMessage(
            CommandError,
            "Institute SCH001 is the public content hub. Use seed_public_academics instead.",
        ):
            call_command("seed_institute_academics", "SCH001")
