from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APIClient
from decimal import Decimal

from apps.attempts.models import StudentExamAttempt
from apps.attempts.services import save_answer, start_attempt, submit_attempt
from apps.exams.services import publish_exam
from apps.results.models import ExamResult
from apps.results.services import calculate_exam_ranks, generate_result_from_attempt
from common.tests.builders import AcademicAssessmentBuilder


class AcademicAssessmentSmokeTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.user, self.account_profile = self.builder.create_platform_admin_account(
            username="smoke-admin",
            email="smoke-admin@example.com",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _action_data(self, response):
        return response.data["data"]

    def test_full_academic_assessment_flow_end_to_end(self):
        exam = self.context["exam"]
        question = self.context["question"]
        correct_option = next(option for option in self.context["options"] if option.is_correct)

        sync_response = self.client.post(f"/api/v1/exams/{exam.id}/sync-marks/")
        self.assertEqual(sync_response.status_code, 200)
        exam.refresh_from_db()
        self.assertEqual(str(exam.total_marks), "2.00")
        exam.passing_marks = Decimal("1.00")
        exam.save(update_fields=["passing_marks", "updated_at"])

        publish_response = self.client.post(
            f"/api/v1/exams/{exam.id}/publish/",
            {"changed_by": str(self.context["teacher"].id), "remarks": "Go live"},
            format="json",
        )
        self.assertEqual(publish_response.status_code, 200)
        self.assertTrue(publish_response.data["success"])
        exam.refresh_from_db()
        self.assertEqual(exam.status, "scheduled")

        start_response = self.client.post(
            "/api/v1/attempts/start/",
            {"exam": str(exam.id), "student": str(self.context["student"].id)},
            format="json",
        )
        self.assertEqual(start_response.status_code, 201)
        attempt_id = self._action_data(start_response)["id"]

        save_response = self.client.post(
            f"/api/v1/attempts/{attempt_id}/save-answer/",
            {
                "question": str(question.id),
                "selected_option": str(correct_option.id),
                "time_spent_seconds": 21,
                "is_marked_for_review": False,
            },
            format="json",
        )
        self.assertEqual(save_response.status_code, 200)

        submit_response = self.client.post(
            f"/api/v1/attempts/{attempt_id}/submit/",
            {"auto_submitted": False},
            format="json",
        )
        self.assertEqual(submit_response.status_code, 200)
        self.assertEqual(self._action_data(submit_response)["final_score"], "2.00")
        self.assertEqual(self._action_data(submit_response)["percentage"], "100.00")

        generate_response = self.client.post(
            "/api/v1/results/generate-from-attempt/",
            {"attempt": str(attempt_id)},
            format="json",
        )
        self.assertEqual(generate_response.status_code, 201)
        self.assertEqual(self._action_data(generate_response)["result_status"], "pass")

        rank_response = self.client.post(
            "/api/v1/results/calculate-ranks/",
            {"exam": str(exam.id)},
            format="json",
        )
        self.assertEqual(rank_response.status_code, 200)
        self.assertEqual(self._action_data(rank_response)[0]["rank"], 1)

        publish_results_response = self.client.post(
            "/api/v1/results/publish-exam-results/",
            {"exam": str(exam.id)},
            format="json",
        )
        self.assertEqual(publish_results_response.status_code, 200)
        self.assertTrue(self._action_data(publish_results_response)[0]["is_published"])

        leaderboard_response = self.client.get(f"/api/v1/results/exam/{exam.id}/leaderboard/")
        self.assertEqual(leaderboard_response.status_code, 200)
        self.assertEqual(len(leaderboard_response.data), 1)
        self.assertEqual(leaderboard_response.data[0]["rank"], 1)
        self.assertEqual(leaderboard_response.data[0]["final_score"], "2.00")

        performance_response = self.client.get(
            f"/api/v1/results/student/{self.context['student'].id}/performance/"
        )
        self.assertEqual(performance_response.status_code, 200)
        self.assertEqual(len(performance_response.data), 1)
        self.assertEqual(performance_response.data[0]["percentage"], "100.00")

        topic_performance_response = self.client.get("/api/v1/results/topic-performance/")
        self.assertEqual(topic_performance_response.status_code, 200)
        self.assertEqual(topic_performance_response.data["count"], 1)

        summary_response = self.client.get("/api/v1/results/exam-summary/")
        self.assertEqual(summary_response.status_code, 200)
        self.assertEqual(summary_response.data["count"], 1)

    def test_cannot_publish_exam_without_questions(self):
        empty_exam = self.builder.create_exam(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            self.context["subject"],
            code="EMPTY-EXAM",
            title="Empty Exam",
        )

        with self.assertRaises(ValidationError):
            publish_exam(empty_exam, changed_by=self.context["teacher"])

    def test_cannot_start_attempt_beyond_max_attempts(self):
        flow = self.builder.run_full_assessment_flow(self.context)
        exam = flow["exam"]

        with self.assertRaises(ValidationError):
            start_attempt(self.context["student"], exam)

    def test_cannot_change_answer_after_submission(self):
        flow = self.builder.run_full_assessment_flow(self.context)
        wrong_option = next(option for option in self.context["options"] if not option.is_correct)

        with self.assertRaises(ValidationError):
            save_answer(
                attempt=flow["attempt"],
                question=self.context["question"],
                selected_option=wrong_option,
                time_spent_seconds=10,
            )

    def test_cannot_generate_duplicate_result_for_same_attempt(self):
        flow = self.builder.run_full_assessment_flow(self.context)

        first_result = flow["result"]
        second_result = generate_result_from_attempt(flow["attempt"])

        self.assertEqual(first_result.id, second_result.id)
        self.assertEqual(ExamResult.objects.filter(attempt=flow["attempt"]).count(), 1)
