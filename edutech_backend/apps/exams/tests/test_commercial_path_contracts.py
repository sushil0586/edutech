from django.test import TestCase

from apps.economy.models import ContentAccessPolicy
from apps.exams.models import ExamSourceType
from apps.exams.services import resolve_exam_economy_access
from common.tests.builders import AcademicAssessmentBuilder


class ExamCommercialPathContractTests(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.exam = self.context["exam"]
        self.student = self.context["student"]

    def test_resolve_exam_economy_access_normalizes_institute_sponsored_alias(self):
        ContentAccessPolicy.objects.create(
            institute=self.context["institute"],
            subject=self.context["subject"],
            content_type="exam",
            content_key=str(self.exam.id),
            content_label=self.exam.title,
            policy_type="entitlement_only",
            entitlement_code="institute:sponsored",
            priority=10,
            metadata={"commercial_path": "institute_sponsored_exam"},
        )

        access = resolve_exam_economy_access(self.student, self.exam)

        self.assertEqual(access["commercial_path"], "institute_sponsored")
        self.assertTrue(access["is_unlocked"])
        self.assertEqual(access["decision_type"], "allowed_sponsored")

    def test_resolve_exam_economy_access_normalizes_platform_sponsored_alias(self):
        self.exam.source_type = ExamSourceType.PLATFORM
        self.exam.save(update_fields=["source_type", "updated_at"])
        ContentAccessPolicy.objects.create(
            institute=self.context["institute"],
            subject=self.context["subject"],
            content_type="exam",
            content_key=str(self.exam.id),
            content_label=self.exam.title,
            policy_type="entitlement_only",
            entitlement_code="platform:event",
            priority=10,
            metadata={"commercial_path": "platform_sponsored_exam"},
        )

        access = resolve_exam_economy_access(self.student, self.exam)

        self.assertEqual(access["commercial_path"], "platform_managed")
        self.assertTrue(access["is_unlocked"])
        self.assertEqual(access["decision_type"], "allowed_sponsored")
