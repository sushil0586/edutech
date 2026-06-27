from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.academics.models import AssessmentFamily
from apps.question_bank.models import Question, QuestionType
from common.tests.builders import AcademicAssessmentBuilder


class ExamQuestionAssessmentFamilyContractTestCase(TestCase):
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
            username="teacher-exam-family-contract",
            password="Teacher@123",
            email="teacher-exam-family-contract@example.com",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.teacher_user)

    def test_exam_question_update_rejects_linked_question_type_outside_program_family_contract(self):
        short_answer_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.SHORT_ANSWER,
            difficulty_level="intermediate",
            question_text="State the theorem.",
            explanation="This is an intentionally out-of-contract question.",
            default_marks=Decimal("2.00"),
            negative_marks=Decimal("0.00"),
            metadata={"accepted_answers": ["Sample theorem statement"]},
            is_active=True,
            is_verified=False,
        )
        exam_question = self.builder.create_exam_question(
            self.context["exam"],
            short_answer_question,
            question_order=2,
        )

        response = self.client.patch(
            f"/api/v1/exams/questions/{exam_question.id}/",
            {
                "exam": str(self.context["exam"].id),
                "question": str(short_answer_question.id),
                "question_order": 2,
                "marks": "2.00",
                "negative_marks": "0.00",
                "is_mandatory": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("question_type", response.data)

