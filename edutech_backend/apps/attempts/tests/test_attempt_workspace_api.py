from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.attempts.models import StudentExamAttempt
from apps.attempts.services import save_answer, start_attempt, submit_attempt
from apps.exams.services import publish_exam, sync_total_marks_from_questions
from apps.results.services import generate_result_from_attempt, publish_exam_results
from common.tests.builders import AcademicAssessmentBuilder


class AttemptWorkspaceApiTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.exam = sync_total_marks_from_questions(self.context["exam"])
        self.exam.passing_marks = Decimal("1.00")
        self.exam.allow_review_after_submit = False
        self.exam.show_result_immediately = False
        self.exam.save(
            update_fields=[
                "passing_marks",
                "allow_review_after_submit",
                "show_result_immediately",
                "updated_at",
            ]
        )
        publish_exam(self.exam, changed_by=self.context["teacher"], remarks="Workspace API publish")

        self.student_user, _ = self.builder.create_student_account(
            institute=self.context["institute"],
            student_profile=self.context["student"],
            username="attempt-student",
            password="Student@123",
            email="attempt-student@example.com",
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.student_user)

        self.correct_option = next(
            option for option in self.context["options"] if option.is_correct
        )
        self.incorrect_option = next(
            option for option in self.context["options"] if not option.is_correct
        )

    def _action_data(self, response):
        return response.data["data"]

    def _start_attempt(self):
        return start_attempt(self.context["student"], self.exam)

    def test_attempt_detail_hides_correctness_and_returns_server_time(self):
        attempt = self._start_attempt()
        save_answer(
            attempt=attempt,
            question=self.context["question"],
            selected_option=self.correct_option,
            is_marked_for_review=True,
            time_spent_seconds=18,
        )

        response = self.client.get(f"/api/v1/attempts/{attempt.id}/detail/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(str(response.data["id"]), str(attempt.id))
        self.assertEqual(response.data["status"], "in_progress")
        self.assertIn("server_time", response.data)
        self.assertEqual(len(response.data["questions"]), 1)
        self.assertEqual(len(response.data["answers"]), 1)

        answer_payload = response.data["answers"][0]
        self.assertNotIn("is_correct", answer_payload)
        self.assertNotIn("marks_awarded", answer_payload)
        self.assertNotIn("negative_marks_applied", answer_payload)
        self.assertTrue(answer_payload["is_marked_for_review"])

        question_payload = response.data["questions"][0]
        self.assertEqual(question_payload["question_type"], "mcq_single")
        self.assertIn("options", question_payload)
        self.assertNotIn("is_correct", question_payload["options"][0])

    def test_save_answer_supports_marked_for_review(self):
        attempt = self._start_attempt()

        response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(self.context["question"].id),
                "selected_option": str(self.correct_option.id),
                "is_marked_for_review": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(self._action_data(response)["is_marked_for_review"])
        attempt.refresh_from_db()
        saved_answer = attempt.answers.get(question=self.context["question"])
        self.assertTrue(saved_answer.is_marked_for_review)

    def test_save_answer_supports_clear_response(self):
        attempt = self._start_attempt()
        save_answer(
            attempt=attempt,
            question=self.context["question"],
            selected_option=self.correct_option,
            answer_text="temp",
        )

        response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(self.context["question"].id),
                "clear_response": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(self._action_data(response)["selected_option"])
        attempt.refresh_from_db()
        saved_answer = attempt.answers.get(question=self.context["question"])
        self.assertIsNone(saved_answer.selected_option)
        self.assertEqual(saved_answer.answer_text, "")

    def test_save_answer_supports_skip(self):
        attempt = self._start_attempt()

        response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(self.context["question"].id),
                "skip": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(self._action_data(response)["selected_option"])
        attempt.refresh_from_db()
        saved_answer = attempt.answers.get(question=self.context["question"])
        self.assertIsNone(saved_answer.selected_option)
        self.assertEqual(saved_answer.answer_text, "")

    def test_cannot_save_after_submitted(self):
        attempt = self._start_attempt()
        submit_attempt(attempt)

        response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(self.context["question"].id),
                "selected_option": str(self.correct_option.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("attempt", response.data)

    def test_expired_attempt_save_rejects_safely(self):
        attempt = self._start_attempt()
        StudentExamAttempt.objects.filter(pk=attempt.pk).update(
            expires_at=timezone.now() - timedelta(minutes=1)
        )
        attempt.refresh_from_db()

        response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(self.context["question"].id),
                "selected_option": str(self.incorrect_option.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        response_message = str(response.data)
        self.assertIn("expired", response_message.lower())
        attempt.refresh_from_db()
        self.assertEqual(attempt.status, "in_progress")

    def test_attempt_summary_returns_server_time(self):
        attempt = self._start_attempt()
        response = self.client.get(f"/api/v1/attempts/{attempt.id}/summary/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("server_time", response.data)

    def test_review_is_blocked_before_allowed(self):
        attempt = self._start_attempt()
        save_answer(
            attempt=attempt,
            question=self.context["question"],
            selected_option=self.correct_option,
        )
        submit_attempt(attempt)

        response = self.client.get(f"/api/v1/attempts/{attempt.id}/review/")
        self.assertEqual(response.status_code, 403)
        self.assertIn("detail", response.data)

    def test_review_is_allowed_when_exam_allows_review(self):
        self.exam.allow_review_after_submit = True
        self.exam.save(update_fields=["allow_review_after_submit", "updated_at"])
        attempt = self._start_attempt()
        save_answer(
            attempt=attempt,
            question=self.context["question"],
            selected_option=self.correct_option,
            is_marked_for_review=True,
        )
        submit_attempt(attempt)

        response = self.client.get(f"/api/v1/attempts/{attempt.id}/review/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["review_questions"]), 1)
        question_payload = response.data["review_questions"][0]
        self.assertEqual(question_payload["result_status"], "correct")
        self.assertEqual(question_payload["selected_option"], str(self.correct_option.id))
        self.assertTrue(
            any(option["is_correct"] for option in question_payload["options"])
        )
        self.assertEqual(question_payload["explanation"], self.context["question"].explanation)

    def test_review_is_allowed_after_result_is_published(self):
        attempt = self._start_attempt()
        save_answer(
            attempt=attempt,
            question=self.context["question"],
            selected_option=self.incorrect_option,
        )
        submit_attempt(attempt)
        generate_result_from_attempt(attempt)
        publish_exam_results(self.exam)

        response = self.client.get(f"/api/v1/attempts/{attempt.id}/review/")
        self.assertEqual(response.status_code, 200)
        question_payload = response.data["review_questions"][0]
        self.assertEqual(question_payload["result_status"], "wrong")
