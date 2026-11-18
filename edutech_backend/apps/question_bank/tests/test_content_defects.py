from django.test import TestCase
from rest_framework.test import APIClient

from apps.attempts.services import save_answer, start_attempt, submit_attempt
from apps.question_bank.models import QuestionContentDefect
from common.tests.builders import AcademicAssessmentBuilder


class QuestionContentDefectWorkflowTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.teacher_user, _ = self.builder.create_teacher_account(
            institute=self.context["institute"],
            teacher_profile=self.context["teacher"],
            username="content-reporter",
        )
        self.admin_user, _ = self.builder.create_institute_admin_account(
            institute=self.context["institute"],
            username="content-reviewer",
        )
        self.client = APIClient()

    def _report_defect(self):
        self.client.force_authenticate(self.teacher_user)
        response = self.client.post(
            "/api/v1/question-bank/content-defects/",
            {
                "question": str(self.context["question"].id),
                "category": "incorrect_answer",
                "description": "The marked option is ambiguous and needs review.",
            },
            format="json",
            secure=True,
        )
        self.assertEqual(response.status_code, 201, response.data)
        return QuestionContentDefect.objects.get(pk=response.data["id"])

    def test_teacher_reports_snapshot_but_cannot_resolve(self):
        defect = self._report_defect()

        self.assertEqual(defect.reported_by, self.teacher_user)
        self.assertEqual(
            defect.question_snapshot["question_text"],
            self.context["question"].question_text,
        )
        self.assertTrue(defect.question_snapshot["options"])

        response = self.client.post(
            f"/api/v1/question-bank/content-defects/{defect.id}/resolve/",
            {
                "resolution_notes": "Teacher should not be able to close this.",
                "question_text": "Unauthorized replacement",
            },
            format="json",
            secure=True,
        )
        self.assertEqual(response.status_code, 403)

    def test_admin_resolution_creates_revision_and_preserves_historical_answer(self):
        question = self.context["question"]
        original_text = question.question_text
        original_options = list(
            question.options.order_by("option_order").values_list("id", "option_text", "is_correct")
        )
        self.context["exam"].status = "live"
        self.context["exam"].save(update_fields=["status", "updated_at"])
        attempt = start_attempt(self.context["student"], self.context["exam"])
        selected_option = question.options.filter(is_correct=True).first()
        answer = save_answer(
            attempt=attempt,
            question=question,
            selected_option=selected_option,
            time_spent_seconds=10,
        )
        submit_attempt(attempt)

        self.client.force_authenticate(self.teacher_user)
        direct_edit = self.client.patch(
            f"/api/v1/question-bank/questions/{question.id}/",
            {"question_text": "A silent historical rewrite?"},
            format="json",
            secure=True,
        )
        self.assertEqual(direct_edit.status_code, 400, direct_edit.data)

        defect = self._report_defect()

        replacement_options = [
            {"option_text": "Corrected A", "is_correct": True},
            {"option_text": "Corrected B", "is_correct": False},
            {"option_text": "Corrected C", "is_correct": False},
            {"option_text": "Corrected D", "is_correct": False},
        ]
        self.client.force_authenticate(self.admin_user)
        response = self.client.post(
            f"/api/v1/question-bank/content-defects/{defect.id}/resolve/",
            {
                "resolution_notes": "Academic reviewer approved a corrected revision.",
                "question_text": "Corrected question wording?",
                "explanation": "Corrected explanation.",
                "options": replacement_options,
            },
            format="json",
            secure=True,
        )
        self.assertEqual(response.status_code, 200, response.data)

        defect.refresh_from_db()
        question.refresh_from_db()
        answer.refresh_from_db()
        replacement = defect.replacement_question
        self.assertEqual(defect.status, "resolved")
        self.assertFalse(question.is_active)
        self.assertEqual(question.question_text, original_text)
        self.assertEqual(
            list(question.options.order_by("option_order").values_list("id", "option_text", "is_correct")),
            original_options,
        )
        self.assertEqual(answer.question_id, question.id)
        self.assertEqual(answer.selected_option_id, selected_option.id)
        self.assertEqual(replacement.question_text, "Corrected question wording?")
        self.assertTrue(replacement.is_active)
        self.assertEqual(replacement.metadata["revision_of"], str(question.id))
        self.assertEqual(question.metadata["superseded_by"], str(replacement.id))
