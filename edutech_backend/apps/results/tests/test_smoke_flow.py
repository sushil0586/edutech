from datetime import timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from decimal import Decimal

from apps.attempts.models import StudentExamAttempt
from apps.attempts.services import save_answer, start_attempt, submit_attempt
from apps.exams.models import ExamSection
from apps.exams.services import mark_exam_completed, mark_exam_live, publish_exam, refresh_exam_status
from apps.exams.services import sync_total_marks_from_questions
from apps.results.models import ExamResult
from apps.results.services import (
    build_student_insight_summary,
    build_result_publish_readiness,
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

    def _build_attempt_for_student(
        self,
        *,
        exam,
        student,
        question,
        selected_option,
        time_spent_seconds=20,
        is_marked_for_review=False,
    ):
        attempt = start_attempt(student, exam)
        save_answer(
            attempt=attempt,
            question=question,
            selected_option=selected_option,
            time_spent_seconds=time_spent_seconds,
            is_marked_for_review=is_marked_for_review,
        )
        attempt = submit_attempt(attempt)
        generate_result_from_attempt(attempt)
        return attempt

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

        question_analysis_response = self.client.get(
            f"/api/v1/results/exam/{exam.id}/question-analysis/?page=1&page_size=10&filter=all"
        )
        self.assertEqual(question_analysis_response.status_code, 200)
        self.assertEqual(question_analysis_response.data["count"], 1)
        self.assertIn("summary", question_analysis_response.data)
        self.assertIn("question_quality", question_analysis_response.data["summary"])
        self.assertIn(
            "top_revision_topics",
            question_analysis_response.data["summary"]["question_quality"],
        )
        self.assertIn(
            "recommended_actions",
            question_analysis_response.data["summary"]["question_quality"],
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
        self.assertIn("score_distribution", summary_response.data["results"][0])
        self.assertIn("section_performance", summary_response.data["results"][0])
        self.assertIn("review_release_risk", summary_response.data["results"][0])

    def test_question_analysis_exposes_distractor_and_revision_signals(self):
        exam = self.context["exam"]
        question = self.context["question"]
        correct_option = next(option for option in self.context["options"] if option.is_correct)
        wrong_option = next(option for option in self.context["options"] if not option.is_correct)

        sync_total_marks_from_questions(exam)
        exam.passing_marks = Decimal("1.00")
        exam.save(update_fields=["passing_marks", "updated_at"])
        publish_exam(exam, changed_by=self.context["teacher"], remarks="Question quality smoke test")

        students = [
            self.context["student"],
            self.builder.create_student(
                self.context["institute"],
                self.context["academic_year"],
                self.context["program"],
                self.context["cohort"],
                admission_no="STU002",
                first_name="Ishaan",
                email="ishaan@example.com",
            ),
            self.builder.create_student(
                self.context["institute"],
                self.context["academic_year"],
                self.context["program"],
                self.context["cohort"],
                admission_no="STU003",
                first_name="Myra",
                email="myra@example.com",
            ),
        ]

        self._build_attempt_for_student(
            exam=exam,
            student=students[0],
            question=question,
            selected_option=correct_option,
            time_spent_seconds=18,
        )
        self._build_attempt_for_student(
            exam=exam,
            student=students[1],
            question=question,
            selected_option=wrong_option,
            time_spent_seconds=26,
            is_marked_for_review=True,
        )
        self._build_attempt_for_student(
            exam=exam,
            student=students[2],
            question=question,
            selected_option=wrong_option,
            time_spent_seconds=31,
            is_marked_for_review=True,
        )

        response = self.client.get(
            f"/api/v1/results/exam/{exam.id}/question-analysis/?page=1&page_size=10&filter=all"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

        row = response.data["results"][0]
        self.assertEqual(row["question_id"], str(question.id))
        self.assertEqual(row["quality_signal"], "hard")
        self.assertEqual(row["revision_priority"], "urgent")
        self.assertEqual(row["wrong_count"], 2)
        self.assertEqual(row["marked_for_review_count"], 2)
        self.assertIn("High wrong-answer pressure", row["revision_reasons"])
        self.assertIn("Strong misconception trap: 3", row["revision_reasons"])

        distractor_signals = {
            item["option_text_summary"]: item["distractor_signal"]
            for item in row["distractor_insights"]
        }
        self.assertEqual(distractor_signals["4"], "validated_key")
        self.assertEqual(distractor_signals["3"], "strong_distractor")

        summary = response.data["summary"]
        self.assertEqual(summary["question_quality"]["revision_candidates"], 1)
        self.assertEqual(summary["question_quality"]["urgent_revision_candidates"], 1)
        self.assertEqual(summary["question_quality"]["hard_questions"], 1)
        self.assertEqual(summary["question_quality"]["top_revision_topics"][0]["topic_name"], "Algebra")
        self.assertEqual(
            str(summary["question_quality"]["top_revision_questions"][0]["question_id"]),
            str(question.id),
        )
        self.assertEqual(summary["distractor_quality"]["strong_distractors"], 1)
        self.assertEqual(summary["distractor_quality"]["weak_distractors"], 0)
        self.assertEqual(summary["distractor_quality"]["key_review_options"], 0)
        self.assertEqual(
            summary["distractor_quality"]["top_strong_distractors"][0]["option_text_summary"],
            "3",
        )

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

    def test_result_publish_readiness_reports_completion_blocker(self):
        exam = self.context["exam"]
        question = self.context["question"]
        correct_option = next(option for option in self.context["options"] if option.is_correct)
        exam = publish_exam(exam, changed_by=self.context["teacher"], remarks="Readiness scheduled")

        attempt = start_attempt(self.context["student"], exam)
        save_answer(
            attempt=attempt,
            question=question,
            selected_option=correct_option,
            time_spent_seconds=10,
        )
        submit_attempt(attempt)
        generate_results_for_exam(exam)

        readiness = build_result_publish_readiness(exam)

        self.assertFalse(readiness["ready"])
        blocker_codes = {item["code"] for item in readiness["blockers"]}
        self.assertIn("exam_not_completed", blocker_codes)

    def test_result_publish_readiness_reports_missing_rank_warning(self):
        exam = self.context["exam"]
        question = self.context["question"]
        correct_option = next(option for option in self.context["options"] if option.is_correct)
        exam = publish_exam(exam, changed_by=self.context["teacher"], remarks="Rank warning scheduled")

        attempt = start_attempt(self.context["student"], exam)
        save_answer(
            attempt=attempt,
            question=question,
            selected_option=correct_option,
            time_spent_seconds=10,
        )
        submit_attempt(attempt)
        generate_result_from_attempt(attempt)
        exam = mark_exam_completed(exam, changed_by=self.context["teacher"])

        readiness = build_result_publish_readiness(exam)

        self.assertTrue(readiness["ready"])
        warning_codes = {item["code"] for item in readiness["warnings"]}
        self.assertIn("missing_ranks", warning_codes)

    def test_student_insight_summary_keeps_multi_subject_recent_exam_and_subject_breakdown(self):
        exam = self.context["exam"]
        exam.max_attempts = 1
        exam.passing_marks = Decimal("2.00")
        exam.save(update_fields=["max_attempts", "passing_marks", "updated_at"])

        first_section = ExamSection.objects.create(
            exam=exam,
            subject=self.context["subject"],
            name="Mathematics Section",
            section_order=1,
            total_questions=1,
        )

        second_subject = self.builder.create_subject(
            self.context["institute"],
            self.context["program"],
            name="Physics",
            code="PHY10",
            sort_order=2,
        )
        second_topic = self.builder.create_topic(
            self.context["institute"],
            second_subject,
            name="Motion",
            code="MOT-01",
            sort_order=2,
        )
        second_question, second_options = self.builder.create_question_with_options(
            self.context["institute"],
            self.context["program"],
            second_subject,
            second_topic,
            self.context["teacher"],
            question_text="What is velocity?",
            explanation="Basic motion concept.",
            options=[
                {"option_text": "Speed with direction", "option_order": 1, "is_correct": True, "is_active": True},
                {"option_text": "Distance only", "option_order": 2, "is_correct": False, "is_active": True},
            ],
        )
        second_section = ExamSection.objects.create(
            exam=exam,
            subject=second_subject,
            name="Physics Section",
            section_order=2,
            total_questions=1,
        )

        exam_question = self.context["exam_question"]
        exam_question.section = first_section
        exam_question.section_name = first_section.name
        exam_question.save(update_fields=["section", "section_name", "updated_at"])
        self.builder.create_exam_question(
            exam,
            second_question,
            section=second_section,
            section_name=second_section.name,
            question_order=2,
        )

        sync_total_marks_from_questions(exam)
        publish_exam(exam, changed_by=self.context["teacher"], remarks="Multi-subject summary smoke test")

        attempt = start_attempt(self.context["student"], exam)
        first_correct_option = next(
            option for option in self.context["options"] if option.is_correct
        )
        second_correct_option = next(option for option in second_options if option.is_correct)
        save_answer(
            attempt=attempt,
            question=self.context["question"],
            selected_option=first_correct_option,
            time_spent_seconds=15,
        )
        save_answer(
            attempt=attempt,
            question=second_question,
            selected_option=second_correct_option,
            time_spent_seconds=18,
        )
        submit_attempt(attempt)
        generate_result_from_attempt(attempt)

        summary = build_student_insight_summary(self.context["student"])

        recent_exam = summary["recent_exams"][0]
        self.assertTrue(recent_exam["is_multi_subject"])
        self.assertEqual(recent_exam["primary_subject_name"], self.context["subject"].name)
        self.assertEqual(recent_exam["subject_summary"]["subject_count"], 2)
        self.assertEqual(
            {item["name"] for item in recent_exam["section_subjects"]},
            {self.context["subject"].name, second_subject.name},
        )

        subject_breakdown_names = {
            item["subject_name"] for item in summary["source_subject_breakdown"]
        }
        self.assertIn(self.context["subject"].name, subject_breakdown_names)
        self.assertIn(second_subject.name, subject_breakdown_names)

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
