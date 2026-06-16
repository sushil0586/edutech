from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.attempts.models import StudentExamAttempt
from apps.attempts.services import save_answer, start_attempt, submit_attempt
from apps.exams.models import ExamSection
from apps.exams.services import mark_exam_completed, publish_exam, sync_total_marks_from_questions
from apps.results.services import generate_result_from_attempt, publish_exam_results
from apps.question_bank.models import Question, QuestionType
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

    def _create_section(self, name, order):
        return ExamSection.objects.create(
            exam=self.exam,
            name=name,
            section_order=order,
            total_questions=1,
            is_active=True,
        )

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

    def test_attempt_detail_includes_security_policy_and_integrity_summary(self):
        self.exam.security_mode = "fullscreen"
        self.exam.save(update_fields=["security_mode", "updated_at"])
        attempt = self._start_attempt()

        response = self.client.get(f"/api/v1/attempts/{attempt.id}/detail/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["security_mode"], "fullscreen")
        self.assertEqual(response.data["security_policy"]["mode"], "fullscreen")
        self.assertTrue(response.data["security_policy"]["requires_fullscreen"])
        self.assertEqual(response.data["integrity_summary"]["violation_count"], 0)
        self.assertFalse(response.data["integrity_summary"]["threshold_reached"])

    def test_attempt_start_applies_accommodation_snapshot_and_extra_time(self):
        self.context["student"].accommodation_profile = {
            "extra_time_minutes": 15,
            "simplified_warning_copy": True,
            "alternative_instructions": "Take a moment to read each question twice.",
        }
        self.context["student"].save(update_fields=["accommodation_profile", "updated_at"])

        attempt = self._start_attempt()
        snapshot = attempt.metadata.get("accommodation_snapshot", {})

        self.assertTrue(snapshot["has_accommodations"])
        self.assertEqual(snapshot["applied_extra_time_minutes"], 15)
        self.assertTrue(snapshot["simplified_warning_copy"])
        self.assertEqual(
            snapshot["alternative_instructions"],
            "Take a moment to read each question twice.",
        )
        expected_minutes = self.exam.duration_minutes + 15
        actual_minutes = int((attempt.expires_at - attempt.started_at).total_seconds() / 60)
        self.assertEqual(actual_minutes, expected_minutes)

    def test_attempt_detail_includes_accommodation_snapshot_and_simplified_copy(self):
        self.exam.security_mode = "proctored"
        self.exam.save(update_fields=["security_mode", "updated_at"])
        self.context["student"].accommodation_profile = {
            "extra_time_minutes": 10,
            "simplified_warning_copy": True,
            "notes": "Allow additional reading time.",
        }
        self.context["student"].save(update_fields=["accommodation_profile", "updated_at"])
        attempt = self._start_attempt()

        response = self.client.get(f"/api/v1/attempts/{attempt.id}/detail/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["accommodation_snapshot"]["has_accommodations"])
        self.assertEqual(response.data["accommodation_snapshot"]["applied_extra_time_minutes"], 10)
        self.assertTrue(response.data["accommodation_snapshot"]["simplified_warning_copy"])
        self.assertIn("ask for help", response.data["security_policy"]["student_warning_copy"])

    def test_attempt_detail_includes_adjusted_violation_limit_from_accommodation(self):
        self.exam.security_mode = "violation_limited"
        self.exam.save(update_fields=["security_mode", "updated_at"])
        self.context["student"].accommodation_profile = {
            "additional_violation_allowance": 1,
        }
        self.context["student"].save(update_fields=["accommodation_profile", "updated_at"])
        attempt = self._start_attempt()

        response = self.client.get(f"/api/v1/attempts/{attempt.id}/detail/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["security_policy"]["violation_limit"], 4)
        self.assertEqual(
            response.data["accommodation_snapshot"]["additional_violation_allowance"],
            1,
        )

    def test_attempt_start_creates_delivery_snapshot(self):
        self.exam.randomize_questions = True
        self.exam.randomize_options = True
        self.exam.save(
            update_fields=["randomize_questions", "randomize_options", "updated_at"]
        )

        attempt = self._start_attempt()
        delivery_snapshot = attempt.metadata.get("delivery_snapshot", {})

        self.assertTrue(delivery_snapshot.get("question_order"))
        self.assertIn(str(self.context["question"].id), delivery_snapshot.get("option_order", {}))

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

    def test_integrity_event_endpoint_auto_submits_after_violation_threshold(self):
        self.exam.security_mode = "violation_limited"
        self.exam.save(update_fields=["security_mode", "updated_at"])
        attempt = self._start_attempt()
        base_time = timezone.now()

        for offset in [0, 10, 20]:
            response = self.client.post(
                f"/api/v1/attempts/{attempt.id}/integrity-event/",
                {
                    "event_type": "fullscreen_exited",
                    "event_at": (base_time + timedelta(seconds=offset)).isoformat(),
                    "metadata": {"source": "test"},
                },
                format="json",
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["data"]["auto_submitted"])
        self.assertEqual(response.data["data"]["attempt_status"], "auto_submitted")
        self.assertEqual(response.data["data"]["integrity_summary"]["violation_count"], 3)
        attempt.refresh_from_db()
        self.assertEqual(attempt.status, "auto_submitted")

    def test_integrity_event_threshold_respects_accommodation_allowance(self):
        self.exam.security_mode = "violation_limited"
        self.exam.save(update_fields=["security_mode", "updated_at"])
        self.context["student"].accommodation_profile = {
            "additional_violation_allowance": 1,
        }
        self.context["student"].save(update_fields=["accommodation_profile", "updated_at"])
        attempt = self._start_attempt()
        base_time = timezone.now()

        for offset in [0, 10, 20]:
            response = self.client.post(
                f"/api/v1/attempts/{attempt.id}/integrity-event/",
                {
                    "event_type": "fullscreen_exited",
                    "event_at": (base_time + timedelta(seconds=offset)).isoformat(),
                    "metadata": {"source": "test"},
                },
                format="json",
            )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["data"]["auto_submitted"])
        self.assertEqual(response.data["data"]["integrity_summary"]["violation_count"], 3)
        self.assertEqual(response.data["data"]["integrity_summary"]["violation_limit"], 4)
        attempt.refresh_from_db()
        self.assertEqual(attempt.status, "in_progress")

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

    def test_save_answer_supports_multi_select_questions(self):
        multi_question, multi_options = self.builder.create_question_with_options(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            teacher=self.context["teacher"],
            question_type=QuestionType.MCQ_MULTIPLE,
            question_text="Select all prime numbers.",
            options=[
                {
                    "option_text": "2",
                    "option_order": 1,
                    "is_correct": True,
                    "is_active": True,
                },
                {
                    "option_text": "3",
                    "option_order": 2,
                    "is_correct": True,
                    "is_active": True,
                },
                {
                    "option_text": "4",
                    "option_order": 3,
                    "is_correct": False,
                    "is_active": True,
                },
            ],
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=multi_question,
            question_order=2,
            section_name="Section A",
        )

        attempt = self._start_attempt()
        response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(multi_question.id),
                "selected_option_ids": [
                    str(multi_options[0].id),
                    str(multi_options[1].id),
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        payload = self._action_data(response)
        self.assertEqual(
            payload["selected_option_ids"],
            [str(multi_options[0].id), str(multi_options[1].id)],
        )
        attempt.refresh_from_db()
        saved_answer = attempt.answers.get(question=multi_question)
        self.assertEqual(
            saved_answer.selected_option_ids,
            [str(multi_options[0].id), str(multi_options[1].id)],
        )
        self.assertTrue(saved_answer.is_correct)

    def test_save_answer_supports_short_answer_questions(self):
        short_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.SHORT_ANSWER,
            difficulty_level="foundation",
            question_text="What is 3 + 4?",
            explanation="3 + 4 = 7.",
            default_marks=Decimal("2.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"accepted_answers": ["7"]},
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=short_question,
            question_order=2,
            section_name="Section A",
        )

        attempt = self._start_attempt()
        response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(short_question.id),
                "answer_text": "7",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        payload = self._action_data(response)
        self.assertEqual(payload["answer_text"], "7")
        attempt.refresh_from_db()
        saved_answer = attempt.answers.get(question=short_question)
        self.assertEqual(saved_answer.answer_text, "7")
        self.assertTrue(saved_answer.is_correct)

    def test_review_marks_short_answer_correct_when_answer_key_matches(self):
        short_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.SHORT_ANSWER,
            difficulty_level="foundation",
            question_text="What is the square root of 81?",
            explanation="The principal square root of 81 is 9.",
            default_marks=Decimal("2.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"accepted_answers": ["9"]},
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=short_question,
            question_order=2,
            section_name="Section A",
        )
        self.exam.allow_review_after_submit = True
        self.exam.show_result_immediately = True
        self.exam.review_mode = "solution_review"
        self.exam.save(
            update_fields=[
                "allow_review_after_submit",
                "show_result_immediately",
                "review_mode",
                "updated_at",
            ]
        )

        attempt = self._start_attempt()
        save_answer(
            attempt=attempt,
            question=short_question,
            answer_text="9",
        )
        submit_attempt(attempt)

        response = self.client.get(f"/api/v1/attempts/{attempt.id}/review/")
        self.assertEqual(response.status_code, 200)
        question_payload = next(
            item
            for item in response.data["review_questions"]
            if str(item["question_id"]) == str(short_question.id)
        )
        self.assertEqual(question_payload["answer_text"], "9")
        self.assertEqual(question_payload["result_status"], "correct")
        self.assertEqual(question_payload["accepted_answers"], ["9"])
        self.assertEqual(question_payload["explanation"], "The principal square root of 81 is 9.")

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

    def test_attempt_summary_hides_scoring_until_result_is_visible(self):
        attempt = self._start_attempt()
        save_answer(
            attempt=attempt,
            question=self.context["question"],
            selected_option=self.correct_option,
        )
        submit_attempt(attempt)

        response = self.client.get(f"/api/v1/attempts/{attempt.id}/summary/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["result_visible"])
        self.assertIsNone(response.data["final_score"])
        self.assertIsNone(response.data["percentage"])
        self.assertFalse(response.data["review_available"])

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
        self.exam.show_result_immediately = True
        self.exam.save(
            update_fields=[
                "allow_review_after_submit",
                "show_result_immediately",
                "updated_at",
            ]
        )
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
        self.assertEqual(question_payload["explanation"], "")

    def test_attempted_only_review_hides_unattempted_questions_and_explanations(self):
        question_b, _ = self.builder.create_question_with_options(
            self.context["institute"],
            self.context["program"],
            self.context["subject"],
            self.context["topic"],
            self.context["teacher"],
            question_text="What is 15 - 4?",
            options=[
                {"option_text": "11", "option_order": 1, "is_correct": True, "is_active": True},
                {"option_text": "10", "option_order": 2, "is_correct": False, "is_active": True},
            ],
        )
        self.builder.add_question_to_exam(
            self.exam,
            question_b,
            question_order=2,
            section_name="Section B",
        )
        self.exam.review_mode = "attempted_only"
        self.exam.allow_review_after_submit = True
        self.exam.show_result_immediately = True
        self.exam.save(
            update_fields=[
                "review_mode",
                "allow_review_after_submit",
                "show_result_immediately",
                "updated_at",
            ]
        )

        attempt = self._start_attempt()
        save_answer(
            attempt=attempt,
            question=self.context["question"],
            selected_option=self.correct_option,
        )
        submit_attempt(attempt)

        response = self.client.get(f"/api/v1/attempts/{attempt.id}/review/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["review_mode"], "attempted_only")
        self.assertFalse(response.data["show_explanations"])
        self.assertEqual(len(response.data["review_questions"]), 1)
        question_payload = response.data["review_questions"][0]
        self.assertEqual(str(question_payload["question_id"]), str(self.context["question"].id))
        self.assertEqual(question_payload["explanation"], "")

    def test_review_is_allowed_after_result_is_published(self):
        attempt = self._start_attempt()
        save_answer(
            attempt=attempt,
            question=self.context["question"],
            selected_option=self.incorrect_option,
        )
        submit_attempt(attempt)
        generate_result_from_attempt(attempt)
        mark_exam_completed(self.exam, changed_by=self.context["teacher"])
        publish_exam_results(self.exam)

        response = self.client.get(f"/api/v1/attempts/{attempt.id}/review/")
        self.assertEqual(response.status_code, 200)
        question_payload = response.data["review_questions"][0]
        self.assertEqual(question_payload["result_status"], "wrong")

    def test_review_includes_structured_section_metadata(self):
        section = self._create_section("Section A", 1)
        self.context["exam_question"].section = section
        self.context["exam_question"].save(
            update_fields=["section", "section_name", "updated_at"]
        )

        attempt = self._start_attempt()
        save_answer(
            attempt=attempt,
            question=self.context["question"],
            selected_option=self.correct_option,
        )
        submit_attempt(attempt)
        generate_result_from_attempt(attempt)
        mark_exam_completed(self.exam, changed_by=self.context["teacher"])
        publish_exam_results(self.exam)

        response = self.client.get(f"/api/v1/attempts/{attempt.id}/review/")
        self.assertEqual(response.status_code, 200)
        question_payload = response.data["review_questions"][0]
        self.assertEqual(question_payload["section_id"], str(section.id))
        self.assertEqual(question_payload["section_title"], "Section A")
        self.assertEqual(question_payload["section_order"], 1)

    def test_attempt_detail_respects_delivery_snapshot_order(self):
        question_b, options_b = self.builder.create_question_with_options(
            self.context["institute"],
            self.context["program"],
            self.context["subject"],
            self.context["topic"],
            self.context["teacher"],
            question_text="What is 7 + 1?",
            options=[
                {"option_text": "8", "option_order": 1, "is_correct": True, "is_active": True},
                {"option_text": "9", "option_order": 2, "is_correct": False, "is_active": True},
                {"option_text": "10", "option_order": 3, "is_correct": False, "is_active": True},
            ],
        )
        exam_question_b = self.builder.add_question_to_exam(
            self.exam,
            question_b,
            section_name="Section B",
            question_order=2,
        )

        attempt = self._start_attempt()
        metadata = attempt.metadata
        metadata["delivery_snapshot"] = {
            "question_order": [
                str(exam_question_b.id),
                str(self.context["exam_question"].id),
            ],
            "option_order": {
                str(self.context["question"].id): [
                    str(self.incorrect_option.id),
                    str(self.correct_option.id),
                ],
                str(question_b.id): [
                    str(options_b[2].id),
                    str(options_b[0].id),
                    str(options_b[1].id),
                ],
            },
        }
        attempt.metadata = metadata
        attempt.save(update_fields=["metadata", "updated_at"])

        response = self.client.get(f"/api/v1/attempts/{attempt.id}/detail/")
        self.assertEqual(response.status_code, 200)
        questions = response.data["questions"]
        self.assertEqual(str(questions[0]["id"]), str(exam_question_b.id))
        self.assertEqual(questions[0]["question_order"], 1)
        self.assertEqual([option["option_order"] for option in questions[0]["options"]], [1, 2, 3])
        self.assertEqual(
            [str(option["id"]) for option in questions[0]["options"]],
            [str(options_b[2].id), str(options_b[0].id), str(options_b[1].id)],
        )

    def test_review_respects_scheduled_result_publish_policy(self):
        self.exam.result_publish_mode = "scheduled"
        self.exam.review_mode = "attempted_only"
        self.exam.result_publish_at = timezone.now() + timedelta(hours=2)
        self.exam.allow_review_after_submit = True
        self.exam.show_result_immediately = False
        self.exam.save(
            update_fields=[
                "result_publish_mode",
                "review_mode",
                "result_publish_at",
                "allow_review_after_submit",
                "show_result_immediately",
                "updated_at",
            ]
        )

        attempt = self._start_attempt()
        save_answer(
            attempt=attempt,
            question=self.context["question"],
            selected_option=self.correct_option,
        )
        submit_attempt(attempt)
        generate_result_from_attempt(attempt)

        response = self.client.get(f"/api/v1/attempts/{attempt.id}/review/")
        self.assertEqual(response.status_code, 403)

    def test_save_answer_blocks_questions_outside_current_section_in_free_section_mode(self):
        section_a = self._create_section("Section A", 1)
        section_b = self._create_section("Section B", 2)
        self.context["exam_question"].section = section_a
        self.context["exam_question"].save(update_fields=["section", "section_name", "updated_at"])

        question_b, options_b = self.builder.create_question_with_options(
            self.context["institute"],
            self.context["program"],
            self.context["subject"],
            self.context["topic"],
            self.context["teacher"],
            question_text="What is 5 + 5?",
            options=[
                {"option_text": "10", "option_order": 1, "is_correct": True, "is_active": True},
                {"option_text": "11", "option_order": 2, "is_correct": False, "is_active": True},
            ],
        )
        self.builder.add_question_to_exam(
            self.exam,
            question_b,
            section=section_b,
            section_name=section_b.name,
            question_order=2,
        )

        self.exam.navigation_mode = "free_section"
        self.exam.allow_section_switching = False
        self.exam.save(update_fields=["navigation_mode", "allow_section_switching", "updated_at"])

        attempt = self._start_attempt()
        correct_option_b = next(option for option in options_b if option.is_correct)

        response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(question_b.id),
                "selected_option": str(correct_option_b.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("question", response.data)
        self.assertIn("currently active section", str(response.data["question"][0]).lower())

    def test_switch_section_allows_answering_in_target_section_for_hybrid_navigation(self):
        section_a = self._create_section("Section A", 1)
        section_b = self._create_section("Section B", 2)
        self.context["exam_question"].section = section_a
        self.context["exam_question"].save(update_fields=["section", "section_name", "updated_at"])

        question_b, options_b = self.builder.create_question_with_options(
            self.context["institute"],
            self.context["program"],
            self.context["subject"],
            self.context["topic"],
            self.context["teacher"],
            question_text="What is 9 - 3?",
            options=[
                {"option_text": "6", "option_order": 1, "is_correct": True, "is_active": True},
                {"option_text": "7", "option_order": 2, "is_correct": False, "is_active": True},
            ],
        )
        self.builder.add_question_to_exam(
            self.exam,
            question_b,
            section=section_b,
            section_name=section_b.name,
            question_order=2,
        )

        self.exam.navigation_mode = "hybrid"
        self.exam.allow_section_switching = True
        self.exam.allow_return_to_previous_section = True
        self.exam.save(
            update_fields=[
                "navigation_mode",
                "allow_section_switching",
                "allow_return_to_previous_section",
                "updated_at",
            ]
        )

        attempt = self._start_attempt()
        switch_response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/switch-section/",
            {"section": str(section_b.id)},
            format="json",
        )

        self.assertEqual(switch_response.status_code, 200)
        payload = self._action_data(switch_response)
        self.assertEqual(payload["section_runtime"]["current_section_id"], str(section_b.id))

        correct_option_b = next(option for option in options_b if option.is_correct)
        answer_response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(question_b.id),
                "selected_option": str(correct_option_b.id),
            },
            format="json",
        )

        self.assertEqual(answer_response.status_code, 200)
        self.assertEqual(self._action_data(answer_response)["question"], str(question_b.id))

    def test_attempt_detail_auto_advances_when_current_section_timer_expires(self):
        section_a = ExamSection.objects.create(
            exam=self.exam,
            name="Section A",
            section_order=1,
            total_questions=1,
            timer_enabled=True,
            duration_minutes=1,
            is_active=True,
        )
        section_b = ExamSection.objects.create(
            exam=self.exam,
            name="Section B",
            section_order=2,
            total_questions=1,
            timer_enabled=True,
            duration_minutes=1,
            is_active=True,
        )
        self.context["exam_question"].section = section_a
        self.context["exam_question"].save(
            update_fields=["section", "section_name", "updated_at"]
        )

        question_b, _ = self.builder.create_question_with_options(
            self.context["institute"],
            self.context["program"],
            self.context["subject"],
            self.context["topic"],
            self.context["teacher"],
            question_text="What is 12 / 3?",
            options=[
                {"option_text": "4", "option_order": 1, "is_correct": True, "is_active": True},
                {"option_text": "5", "option_order": 2, "is_correct": False, "is_active": True},
            ],
        )
        self.builder.add_question_to_exam(
            self.exam,
            question_b,
            section=section_b,
            section_name=section_b.name,
            question_order=2,
        )

        self.exam.timer_mode = "section"
        self.exam.duration_minutes = 2
        self.exam.save(update_fields=["timer_mode", "duration_minutes", "updated_at"])

        attempt = self._start_attempt()
        expired_started = timezone.now() - timedelta(minutes=2)
        expired_at = timezone.now() - timedelta(minutes=1)
        metadata = attempt.metadata
        metadata["section_runtime"]["current_section_started_at"] = expired_started.isoformat()
        metadata["section_runtime"]["current_section_expires_at"] = expired_at.isoformat()
        metadata["section_runtime"]["current_section_timer_enabled"] = True
        metadata["section_runtime"]["section_states"] = [
            {
                "section_id": str(section_a.id),
                "section_name": section_a.name,
                "section_order": 1,
                "timer_enabled": True,
                "duration_minutes": 1,
                "started_at": expired_started.isoformat(),
                "expires_at": expired_at.isoformat(),
                "completed_at": None,
            },
            {
                "section_id": str(section_b.id),
                "section_name": section_b.name,
                "section_order": 2,
                "timer_enabled": True,
                "duration_minutes": 1,
                "started_at": None,
                "expires_at": None,
                "completed_at": None,
            },
        ]
        attempt.metadata = metadata
        attempt.save(update_fields=["metadata", "updated_at"])

        response = self.client.get(f"/api/v1/attempts/{attempt.id}/detail/")
        self.assertEqual(response.status_code, 200)
        payload = response.data["section_runtime"]
        self.assertEqual(payload["current_section_id"], str(section_b.id))
        self.assertEqual(payload["current_section_name"], "Section B")
        self.assertIsNotNone(payload["current_section_expires_at"])

    def test_switch_section_respects_sequential_navigation_rules(self):
        section_a = self._create_section("Section A", 1)
        section_b = self._create_section("Section B", 2)
        section_c = self._create_section("Section C", 3)
        self.context["exam_question"].section = section_a
        self.context["exam_question"].save(update_fields=["section", "section_name", "updated_at"])

        self.exam.navigation_mode = "sequential"
        self.exam.allow_section_switching = True
        self.exam.allow_return_to_previous_section = False
        self.exam.save(
            update_fields=[
                "navigation_mode",
                "allow_section_switching",
                "allow_return_to_previous_section",
                "updated_at",
            ]
        )

        attempt = self._start_attempt()

        jump_response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/switch-section/",
            {"section": str(section_c.id)},
            format="json",
        )
        self.assertEqual(jump_response.status_code, 400)
        self.assertIn("sequence", str(jump_response.data).lower())

        move_to_b_response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/switch-section/",
            {"section": str(section_b.id)},
            format="json",
        )
        self.assertEqual(move_to_b_response.status_code, 200)

        back_response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/switch-section/",
            {"section": str(section_a.id)},
            format="json",
        )
        self.assertEqual(back_response.status_code, 400)
        self.assertIn("previous sections", str(back_response.data).lower())
