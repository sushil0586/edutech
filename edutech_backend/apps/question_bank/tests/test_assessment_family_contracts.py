from django.test import TestCase
from rest_framework.test import APIClient

from apps.academics.models import AssessmentFamily
from common.tests.builders import AcademicAssessmentBuilder


class QuestionBankAssessmentFamilyContractTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.family = AssessmentFamily.objects.create(
            code="competitive",
            label="Competitive",
            description="Competitive assessment contract",
            allowed_question_types=[
                "mcq_single",
                "mcq_multiple",
                "numeric_answer",
            ],
            scoring_defaults={
                "negative_marking_default": True,
                "supports_numeric_entry": True,
            },
            is_active=True,
        )
        self.context["program"].assessment_family = self.family
        self.context["program"].save(update_fields=["assessment_family", "updated_at"])
        self.teacher_user, _ = self.builder.create_teacher_account(
            institute=self.context["institute"],
            teacher_profile=self.context["teacher"],
            username="teacher-family-contract",
            password="Teacher@123",
            email="teacher-family-contract@example.com",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.teacher_user)

    def test_question_create_rejects_question_type_outside_program_family_contract(self):
        response = self.client.post(
            "/api/v1/question-bank/questions/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "question_type": "short_answer",
                "difficulty_level": "intermediate",
                "content_format": "markdown_latex",
                "question_text": "Explain why this should fail.",
                "explanation": "Short answer is outside this competitive contract.",
                "accepted_answers": ["Because it is disallowed."],
                "default_marks": "2.00",
                "negative_marks": "0.00",
                "is_active": True,
                "is_verified": False,
                "metadata": {},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("question_type", response.data)

