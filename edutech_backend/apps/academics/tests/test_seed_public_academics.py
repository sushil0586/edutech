from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from apps.academics.models import AcademicYear, Program, Subject, Topic
from common.tests.builders import AcademicAssessmentBuilder


class SeedPublicAcademicsCommandTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.public_institute = self.builder.create_institute(
            code="PUB001",
            name="Nexora Public Institute",
            metadata={"is_public_content_hub": True},
        )

    def test_seed_public_academics_creates_class_7_tree_and_is_idempotent(self):
        stdout = StringIO()

        call_command("seed_public_academics", stdout=stdout)

        self.assertEqual(AcademicYear.objects.filter(institute=self.public_institute).count(), 1)
        self.assertEqual(Program.objects.filter(institute=self.public_institute).count(), 1)
        self.assertEqual(Subject.objects.filter(institute=self.public_institute).count(), 5)
        self.assertEqual(Topic.objects.filter(institute=self.public_institute).count(), 96)

        program = Program.objects.get(institute=self.public_institute, code="CLS7")
        self.assertEqual(program.name, "Class 7")

        sst = Subject.objects.get(institute=self.public_institute, code="CLS7-SST")
        self.assertEqual(sst.name, "Social Science")

        geometry = Topic.objects.get(subject__code="CLS7-MATH", code="MATH-GEOMETRY")
        self.assertIsNone(geometry.parent_topic)
        triangles = Topic.objects.get(subject__code="CLS7-MATH", code="MATH-GEOMETRY-TRIANGLES")
        self.assertEqual(triangles.parent_topic_id, geometry.id)

        output = stdout.getvalue()
        self.assertIn("Public academics seeded for PUB001 using preset class_7_cbse_core", output)

        stdout = StringIO()
        call_command("seed_public_academics", stdout=stdout)

        self.assertEqual(AcademicYear.objects.filter(institute=self.public_institute).count(), 1)
        self.assertEqual(Program.objects.filter(institute=self.public_institute).count(), 1)
        self.assertEqual(Subject.objects.filter(institute=self.public_institute).count(), 5)
        self.assertEqual(Topic.objects.filter(institute=self.public_institute).count(), 96)
        self.assertIn("updated=", stdout.getvalue())

    def test_seed_public_academics_can_target_public_institute_by_code(self):
        stdout = StringIO()

        call_command(
            "seed_public_academics",
            institute_code="PUB001",
            academic_year_name="2027-2028",
            academic_year_start="2027-04-01",
            academic_year_end="2028-03-31",
            stdout=stdout,
        )

        academic_year = AcademicYear.objects.get(institute=self.public_institute, name="2027-2028")
        self.assertTrue(academic_year.is_current)

    def test_seed_public_academics_requires_a_public_institute(self):
        self.public_institute.metadata = {}
        self.public_institute.save()

        with self.assertRaisesMessage(
            CommandError,
            "No public institute found. Run seed_public_institute_bootstrap first.",
        ):
            call_command("seed_public_academics")
