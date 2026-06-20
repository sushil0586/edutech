from datetime import timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from decimal import Decimal

from apps.attempts.models import StudentExamAttempt
from apps.attempts.services import save_answer, start_attempt, submit_attempt
from apps.exams.services import mark_exam_completed, mark_exam_live, publish_exam, refresh_exam_status
from apps.results.models import ExamResult
from apps.results.services import (
    calculate_exam_ranks,
    generate_result_from_attempt,
    generate_results_for_exam,
    publish_exam_results,
)
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
        self.assertIsNone(self._action_data(submit_response)["final_score"])
        self.assertIsNone(self._action_data(submit_response)["percentage"])

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

        complete_response = self.client.post(
            f"/api/v1/exams/{exam.id}/mark-completed/",
            {"changed_by": str(self.context["teacher"].id), "remarks": "Ready for result publish"},
            format="json",
        )
        self.assertEqual(complete_response.status_code, 200)

        publish_results_response = self.client.post(
            "/api/v1/results/publish-exam-results/",
            {"exam": str(exam.id)},
            format="json",
        )
        self.assertEqual(publish_results_response.status_code, 200)
        self.assertTrue(self._action_data(publish_results_response)[0]["is_published"])

        leaderboard_response = self.client.get(f"/api/v1/results/exam/{exam.id}/leaderboard/")
        self.assertEqual(leaderboard_response.status_code, 200)
        self.assertEqual(leaderboard_response.data["count"], 1)
        self.assertEqual(len(leaderboard_response.data["results"]), 1)
        self.assertEqual(leaderboard_response.data["results"][0]["rank"], 1)
        self.assertEqual(leaderboard_response.data["results"][0]["final_score"], "2.00")
        self.assertTrue(leaderboard_response.data["summary"]["all_ranked"])

        live_monitor_response = self.client.get(
            f"/api/v1/results/exam/{exam.id}/live-monitor/"
        )
        self.assertEqual(live_monitor_response.status_code, 200)
        self.assertEqual(live_monitor_response.data["total_students"], 1)
        self.assertEqual(live_monitor_response.data["completed_students"], 1)
        self.assertEqual(live_monitor_response.data["attempts_by_health"]["stable"], 1)
        self.assertEqual(len(live_monitor_response.data["recent_attempts"]), 1)

        attempts_response = self.client.get(
            f"/api/v1/results/exam/{exam.id}/attempts/?page=1&page_size=10&filter=all&sort=latest&attempt_id={attempt_id}"
        )
        self.assertEqual(attempts_response.status_code, 200)
        self.assertEqual(attempts_response.data["count"], 1)
        self.assertEqual(attempts_response.data["summary"]["total_attempts"], 1)
        self.assertEqual(attempts_response.data["selected_attempt"]["id"], str(attempt_id))
        self.assertEqual(attempts_response.data["results"][0]["id"], str(attempt_id))

        attempt_question_analysis_response = self.client.get(
            f"/api/v1/results/exam/{exam.id}/attempt-question-analysis/?attempt_id={attempt_id}&filter=all"
        )
        self.assertEqual(attempt_question_analysis_response.status_code, 200)
        self.assertEqual(
            attempt_question_analysis_response.data["selected_attempt"]["id"],
            str(attempt_id),
        )
        self.assertEqual(attempt_question_analysis_response.data["summary"]["total_questions"], 1)
        self.assertEqual(attempt_question_analysis_response.data["summary"]["correct_count"], 1)
        self.assertEqual(len(attempt_question_analysis_response.data["results"]), 1)
        self.assertEqual(
            attempt_question_analysis_response.data["results"][0]["outcome"],
            "correct",
        )

        intervention_note_response = self.client.post(
            "/api/v1/results/attempt-intervention-note/",
            {
                "attempt": str(attempt_id),
                "note": "Reviewed the attempt after repeated integrity warnings.",
                "follow_up": "monitoring",
            },
            format="json",
        )
        self.assertEqual(intervention_note_response.status_code, 201)
        self.assertEqual(
            intervention_note_response.data["data"]["metadata"]["follow_up"],
            "monitoring",
        )

        intervention_history_response = self.client.get(
            f"/api/v1/results/attempt/{attempt_id}/interventions/"
        )
        self.assertEqual(intervention_history_response.status_code, 200)
        self.assertEqual(len(intervention_history_response.data), 1)
        self.assertEqual(
            intervention_history_response.data[0]["message"],
            "Reviewed the attempt after repeated integrity warnings.",
        )

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

    def test_generate_results_for_exam_uses_best_attempt_policy(self):
        exam = self.context["exam"]
        exam.max_attempts = 2
        exam.attempt_policy = "best"
        exam.passing_marks = Decimal("1.00")
        exam.save(update_fields=["max_attempts", "attempt_policy", "passing_marks", "updated_at"])
        publish_exam(exam, changed_by=self.context["teacher"], remarks="Best attempt policy")

        wrong_option = next(option for option in self.context["options"] if not option.is_correct)
        correct_option = next(option for option in self.context["options"] if option.is_correct)

        attempt_one = start_attempt(self.context["student"], exam)
        save_answer(
            attempt=attempt_one,
            question=self.context["question"],
            selected_option=wrong_option,
            time_spent_seconds=12,
        )
        submit_attempt(attempt_one)

        attempt_two = start_attempt(self.context["student"], exam)
        save_answer(
            attempt=attempt_two,
            question=self.context["question"],
            selected_option=correct_option,
            time_spent_seconds=8,
        )
        submit_attempt(attempt_two)

        results = generate_results_for_exam(exam)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].attempt_id, attempt_two.id)
        self.assertTrue(
            ExamResult.objects.get(attempt=attempt_two).is_active,
        )
        self.assertFalse(
            ExamResult.objects.filter(attempt=attempt_one, is_active=True).exists(),
        )

    def test_exam_status_transition_helpers_cover_live_and_completed(self):
        exam = self.context["exam"]
        exam.start_at = timezone.now() - timedelta(minutes=5)
        exam.end_at = timezone.now() + timedelta(minutes=25)
        exam.save(update_fields=["start_at", "end_at", "updated_at"])
        publish_exam(exam, changed_by=self.context["teacher"], remarks="Scheduled")

        refreshed = refresh_exam_status(exam)
        self.assertEqual(refreshed.status, "live")

        completed = mark_exam_completed(refreshed, changed_by=self.context["teacher"])
        self.assertEqual(completed.status, "completed")

    def test_mark_exam_live_promotes_scheduled_exam(self):
        exam = self.context["exam"]
        exam.start_at = timezone.now() + timedelta(minutes=30)
        exam.end_at = timezone.now() + timedelta(hours=2)
        exam.save(update_fields=["start_at", "end_at", "updated_at"])
        publish_exam(exam, changed_by=self.context["teacher"], remarks="Scheduled")

        promoted = mark_exam_live(exam, changed_by=self.context["teacher"])
        self.assertEqual(promoted.status, "live")

    def test_cannot_publish_results_until_exam_is_completed(self):
        exam = self.context["exam"]
        question = self.context["question"]
        correct_option = next(option for option in self.context["options"] if option.is_correct)
        exam = publish_exam(exam, changed_by=self.context["teacher"], remarks="Scheduled")

        attempt = start_attempt(self.context["student"], exam)
        save_answer(
            attempt=attempt,
            question=question,
            selected_option=correct_option,
            time_spent_seconds=10,
        )
        submit_attempt(attempt)
        generate_results_for_exam(exam)

        with self.assertRaises(ValidationError):
            publish_exam_results(exam)

    def test_teacher_can_force_submit_in_progress_attempt_from_monitor(self):
        exam = publish_exam(
            self.context["exam"],
            changed_by=self.context["teacher"],
            remarks="Force submit flow",
        )

        start_response = self.client.post(
            "/api/v1/attempts/start/",
            {"exam": str(exam.id), "student": str(self.context["student"].id)},
            format="json",
        )
        self.assertEqual(start_response.status_code, 201)
        attempt_id = self._action_data(start_response)["id"]

        force_submit_response = self.client.post(
            "/api/v1/results/force-submit-attempt/",
            {"attempt": str(attempt_id)},
            format="json",
        )
        self.assertEqual(force_submit_response.status_code, 200)
        self.assertEqual(self._action_data(force_submit_response)["status"], "auto_submitted")
        self.assertTrue(self._action_data(force_submit_response)["is_auto_submitted"])

        attempt = StudentExamAttempt.objects.get(pk=attempt_id)
        self.assertEqual(attempt.status, "auto_submitted")
        self.assertTrue(attempt.is_auto_submitted)

    def test_cannot_force_submit_attempt_for_cancelled_exam(self):
        exam = publish_exam(
            self.context["exam"],
            changed_by=self.context["teacher"],
            remarks="Cancelled force submit guard",
        )
        start_response = self.client.post(
            "/api/v1/attempts/start/",
            {"exam": str(exam.id), "student": str(self.context["student"].id)},
            format="json",
        )
        self.assertEqual(start_response.status_code, 201)
        attempt_id = self._action_data(start_response)["id"]

        self.client.post(f"/api/v1/exams/{exam.id}/cancel/")

        force_submit_response = self.client.post(
            "/api/v1/results/force-submit-attempt/",
            {"attempt": str(attempt_id)},
            format="json",
        )
        self.assertEqual(force_submit_response.status_code, 400)
        self.assertIn("attempt", force_submit_response.data)

    def test_live_monitor_includes_alert_counts_and_alert_details(self):
        exam = publish_exam(
            self.context["exam"],
            changed_by=self.context["teacher"],
            remarks="Monitor alerts",
        )
        attempt = start_attempt(self.context["student"], exam)
        attempt.started_at = timezone.now() - timedelta(minutes=25)
        attempt.save(update_fields=["started_at", "updated_at"])

        response = self.client.get(f"/api/v1/results/exam/{exam.id}/live-monitor/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["alerted_attempts"], 1)
        self.assertEqual(response.data["high_alert_attempts"], 1)
        self.assertEqual(response.data["medium_alert_attempts"], 0)
        self.assertEqual(response.data["stalled_attempts"], 1)
        self.assertEqual(response.data["integrity_warning_attempts"], 0)
        self.assertEqual(response.data["integrity_warnings_total"], 0)
        self.assertEqual(response.data["threshold_reached_attempts"], 0)
        self.assertEqual(response.data["attempts_by_health"]["critical"], 1)
        self.assertEqual(response.data["recent_attempts"][0]["alerts"][0]["code"], "stalled_activity")
