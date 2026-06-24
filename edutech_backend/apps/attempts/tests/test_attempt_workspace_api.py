from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.attempts.models import StudentAnswerReviewTask, StudentExamAttempt
from apps.attempts.services import review_manual_answer, save_answer, start_attempt, submit_attempt
from apps.exams.models import ExamSection
from apps.exams.services import mark_exam_completed, publish_exam, sync_total_marks_from_questions
from apps.results.services import generate_result_from_attempt, publish_exam_results
from apps.question_bank.models import (
    AttachmentType,
    ContentFormat,
    Question,
    QuestionAttachment,
    QuestionOption,
    QuestionPassage,
    QuestionType,
)
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
        self.teacher_user, _ = self.builder.create_teacher_account(
            institute=self.context["institute"],
            teacher_profile=self.context["teacher"],
            username="attempt-review-teacher",
            password="Teacher@123",
            email="attempt-review-teacher@example.com",
        )
        self.teacher_client = APIClient()
        self.teacher_client.force_authenticate(user=self.teacher_user)
        self.institute_admin_user, _ = self.builder.create_institute_admin_account(
            institute=self.context["institute"],
            username="attempt-review-admin",
            password="Admin@123",
            email="attempt-review-admin@example.com",
        )
        self.institute_admin_client = APIClient()
        self.institute_admin_client.force_authenticate(user=self.institute_admin_user)

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
        self.assertEqual(question_payload["question_type_definition"]["response_mode"], "single_choice")
        self.assertEqual(
            question_payload["question_type_definition"]["evaluation_mode_definition"]["code"],
            "auto_option_match",
        )
        self.assertEqual(
            response.data["experience_profile"]["assessment_family"],
            "benchmark",
        )
        self.assertEqual(
            response.data["experience_profile"]["recommended_media_flow"],
            "guided_section_media",
        )
        self.assertIn("options", question_payload)
        self.assertNotIn("is_correct", question_payload["options"][0])

    def test_attempt_detail_includes_linked_comprehension_passage(self):
        passage = QuestionPassage.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            title="AWS passage",
            content_format=ContentFormat.MARKDOWN_LATEX,
            passage_text="AWS scales infrastructure based on demand.",
            description="Shared reading context.",
            is_active=True,
        )
        self.context["question"].passage = passage
        self.context["question"].passage_order = 1
        self.context["question"].save(update_fields=["passage", "passage_order", "updated_at"])

        attempt = self._start_attempt()
        response = self.client.get(f"/api/v1/attempts/{attempt.id}/detail/")

        self.assertEqual(response.status_code, 200)
        question_payload = response.data["questions"][0]
        self.assertEqual(str(question_payload["passage"]), str(passage.id))
        self.assertEqual(question_payload["passage_order"], 1)
        self.assertEqual(question_payload["passage_detail"]["title"], "AWS passage")
        self.assertEqual(
            question_payload["passage_detail"]["passage_text"],
            "AWS scales infrastructure based on demand.",
        )

    def test_attempt_detail_includes_media_context_for_question_attachments(self):
        QuestionAttachment.objects.create(
            question=self.context["question"],
            attachment_type=AttachmentType.AUDIO,
            title="Listening prompt",
            alt_text="Play the listening prompt before answering.",
            display_order=1,
            is_inline=False,
            is_active=True,
        )
        QuestionAttachment.objects.create(
            question=self.context["question"],
            attachment_type=AttachmentType.PDF,
            title="Reference sheet",
            alt_text="Open the reference PDF if needed.",
            display_order=2,
            is_inline=False,
            is_active=True,
        )

        attempt = self._start_attempt()
        response = self.client.get(f"/api/v1/attempts/{attempt.id}/detail/")

        self.assertEqual(response.status_code, 200)
        question_payload = response.data["questions"][0]
        self.assertEqual(question_payload["media_context"]["total_attachments"], 2)
        self.assertEqual(
            question_payload["media_context"]["primary_attachment_type"],
            AttachmentType.AUDIO,
        )
        self.assertEqual(question_payload["media_context"]["delivery_mode"], "optional_reference")
        self.assertEqual(question_payload["media_context"]["preload_strategy"], "on_demand")
        self.assertTrue(question_payload["media_context"]["supports_audio_prompt"])
        self.assertTrue(question_payload["media_context"]["supports_document_prompt"])
        self.assertFalse(question_payload["media_context"]["supports_video_prompt"])

    def test_attempt_detail_includes_current_section_media_context(self):
        section_a = self._create_section("Listening", 1)
        section_b = self._create_section("Reading", 2)

        primary_exam_question = self.exam.exam_questions.get(question=self.context["question"])
        primary_exam_question.section = section_a
        primary_exam_question.save(update_fields=["section", "updated_at"])

        question_b = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.MCQ_SINGLE,
            difficulty_level="foundation",
            content_format=ContentFormat.MARKDOWN_LATEX,
            question_text="Which AWS feature improves availability?",
            explanation="Multi-AZ and distributed design improve availability.",
            default_marks=Decimal("1.00"),
            negative_marks=Decimal("0.00"),
            is_active=True,
        )
        QuestionOption.objects.create(
            question=question_b,
            option_text="Use multiple Availability Zones",
            option_order=1,
            is_correct=True,
            is_active=True,
        )
        QuestionOption.objects.create(
            question=question_b,
            option_text="Use a single instance only",
            option_order=2,
            is_correct=False,
            is_active=True,
        )
        self.builder.create_exam_question(
            self.exam,
            question_b,
            section=section_b,
            marks=Decimal("1.00"),
            negative_marks=Decimal("0.00"),
            question_order=2,
        )

        QuestionAttachment.objects.create(
            question=self.context["question"],
            attachment_type=AttachmentType.AUDIO,
            title="Listening prompt",
            alt_text="Play the listening prompt before answering.",
            display_order=1,
            is_inline=False,
            is_active=True,
        )
        QuestionAttachment.objects.create(
            question=self.context["question"],
            attachment_type=AttachmentType.PDF,
            title="Section transcript",
            alt_text="Open the transcript if your teacher allows reference reading.",
            display_order=2,
            is_inline=False,
            is_active=True,
        )
        QuestionAttachment.objects.create(
            question=question_b,
            attachment_type=AttachmentType.IMAGE,
            title="Architecture diagram",
            alt_text="Inspect the architecture diagram carefully.",
            display_order=1,
            is_inline=True,
            is_active=True,
        )

        attempt = self._start_attempt()
        response = self.client.get(f"/api/v1/attempts/{attempt.id}/detail/")

        self.assertEqual(response.status_code, 200)
        section_media_context = response.data["current_section_media_context"]
        self.assertTrue(section_media_context["has_media"])
        self.assertEqual(section_media_context["scope"], "section")
        self.assertEqual(section_media_context["section_id"], str(section_a.id))
        self.assertEqual(section_media_context["section_name"], "Listening")
        self.assertEqual(section_media_context["question_count"], 1)
        self.assertEqual(section_media_context["questions_with_media"], 1)
        self.assertEqual(section_media_context["total_attachments"], 2)
        self.assertIn(AttachmentType.AUDIO, section_media_context["attachment_types"])
        self.assertIn("optional_reference", section_media_context["delivery_modes"])
        self.assertIn("on_demand", section_media_context["preload_strategies"])
        self.assertTrue(section_media_context["supports_audio_prompt"])
        self.assertTrue(section_media_context["supports_document_prompt"])
        self.assertEqual(section_media_context["recommended_experience"], "media_guided")
        self.assertTrue(response.data["experience_profile"]["supports_section_media_guidance"])

        switch_response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/switch-section/",
            {"section": str(section_b.id)},
            format="json",
        )
        self.assertEqual(switch_response.status_code, 200)
        switched_context = switch_response.data["data"]["current_section_media_context"]
        self.assertEqual(switched_context["section_id"], str(section_b.id))
        self.assertEqual(switched_context["section_name"], "Reading")
        self.assertTrue(switched_context["supports_visual_prompt"])
        self.assertFalse(switched_context["supports_audio_prompt"])
        self.assertEqual(switched_context["inline_attachment_count"], 1)
        self.assertEqual(switched_context["recommended_experience"], "reference_supported")

    def test_save_answer_supports_response_artifact_contract_for_text_questions(self):
        question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            content_format=ContentFormat.RICH_TEXT_HTML,
            question_text="Record a short spoken response about cloud elasticity.",
            explanation="Focus on clarity and the meaning of elastic scaling.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            metadata={"review_guidance": "Review fluency, accuracy, and completeness."},
            is_active=True,
        )
        self.builder.create_exam_question(
            self.exam,
            question,
            marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            question_order=2,
        )
        attempt = self._start_attempt()

        response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(question.id),
                "answer_text": "",
                "answer_transcript": "Elasticity means resources can expand or shrink with demand.",
                "response_artifacts": [
                    {
                        "asset_kind": "audio_recording",
                        "upload_token": "artifact-audio-001",
                        "file_name": "elasticity-answer.m4a",
                        "mime_type": "audio/mp4",
                        "size_bytes": 245760,
                        "duration_seconds": 34,
                        "storage_status": "uploaded",
                    }
                ],
                "is_marked_for_review": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        payload = self._action_data(response)
        self.assertEqual(
            payload["answer_transcript"],
            "Elasticity means resources can expand or shrink with demand.",
        )
        self.assertEqual(payload["response_artifacts"][0]["asset_kind"], "audio_recording")
        saved_answer = question.student_answers.get(attempt=attempt)
        self.assertEqual(
            saved_answer.answer_transcript,
            "Elasticity means resources can expand or shrink with demand.",
        )
        self.assertEqual(saved_answer.response_artifacts[0]["upload_token"], "artifact-audio-001")

    def test_save_answer_rejects_response_artifacts_for_objective_questions(self):
        attempt = self._start_attempt()

        response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(self.context["question"].id),
                "response_artifacts": [
                    {
                        "asset_kind": "audio_recording",
                        "upload_token": "artifact-audio-002",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("answer_text", response.data)

    def test_save_answer_preserves_existing_response_artifacts_when_not_resubmitted(self):
        question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            content_format=ContentFormat.RICH_TEXT_HTML,
            question_text="Explain autoscaling briefly.",
            explanation="Use a concise explanation.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            metadata={"review_guidance": "Review clarity and accuracy."},
            is_active=True,
        )
        self.builder.create_exam_question(
            self.exam,
            question,
            marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            question_order=2,
        )
        attempt = self._start_attempt()

        first_response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(question.id),
                "answer_transcript": "Autoscaling adds or removes resources based on demand.",
                "response_artifacts": [
                    {
                        "asset_kind": "audio_recording",
                        "upload_token": "artifact-audio-preserve",
                        "file_name": "autoscaling.m4a",
                        "mime_type": "audio/mp4",
                        "storage_status": "uploaded",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(first_response.status_code, 200)

        second_response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(question.id),
                "answer_text": "Autoscaling adjusts capacity automatically.",
            },
            format="json",
        )

        self.assertEqual(second_response.status_code, 200)
        saved_answer = question.student_answers.get(attempt=attempt)
        self.assertEqual(len(saved_answer.response_artifacts), 1)
        self.assertEqual(saved_answer.response_artifacts[0]["upload_token"], "artifact-audio-preserve")

    def test_upload_response_artifact_returns_normalized_payload_for_text_question(self):
        question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            content_format=ContentFormat.RICH_TEXT_HTML,
            question_text="Record a short spoken response about cost optimization.",
            explanation="Use a concise explanation.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            metadata={"review_guidance": "Review quality and clarity."},
            is_active=True,
        )
        self.builder.create_exam_question(
            self.exam,
            question,
            marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            question_order=2,
        )
        attempt = self._start_attempt()

        response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/upload-response-artifact/",
            {
                "question": str(question.id),
                "asset_kind": "audio_recording",
                "file": SimpleUploadedFile(
                    "cost-optimization.m4a",
                    b"fake-audio-bytes",
                    content_type="audio/mp4",
                ),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["asset_kind"], "audio_recording")
        self.assertEqual(response.data["storage_status"], "uploaded")
        self.assertEqual(response.data["file_name"], "cost-optimization.m4a")
        self.assertIn("/media/attempts/response-artifacts/", response.data["file_url"])
        self.assertTrue(response.data["upload_token"])
        self.assertTrue(response.data["checksum"])

    def test_upload_response_artifact_rejects_objective_question(self):
        attempt = self._start_attempt()

        response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/upload-response-artifact/",
            {
                "question": str(self.context["question"].id),
                "asset_kind": "audio_recording",
                "file": SimpleUploadedFile(
                    "objective-audio.m4a",
                    b"fake-audio-bytes",
                    content_type="audio/mp4",
                ),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("question", response.data)

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

    def test_save_answer_supports_numeric_answer_with_tolerance(self):
        numeric_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.NUMERIC_ANSWER,
            difficulty_level="foundation",
            question_text="What is one-third as a decimal?",
            explanation="0.333 is acceptable within the configured tolerance.",
            default_marks=Decimal("2.00"),
            negative_marks=Decimal("0.25"),
            is_verified=True,
            is_active=True,
            metadata={
                "accepted_answers": ["0.333"],
                "numeric_validation": {"tolerance": "0.01"},
            },
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=numeric_question,
            question_order=2,
            section_name="Section A",
        )

        attempt = self._start_attempt()
        response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(numeric_question.id),
                "answer_text": "0.334",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        payload = self._action_data(response)
        self.assertEqual(payload["answer_text"], "0.334")
        attempt.refresh_from_db()
        saved_answer = attempt.answers.get(question=numeric_question)
        self.assertEqual(saved_answer.answer_text, "0.334")
        self.assertTrue(saved_answer.is_correct)

    def test_save_answer_supports_fill_in_blanks_with_ordered_answers(self):
        fill_in_blanks_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.FILL_IN_BLANKS,
            difficulty_level="foundation",
            question_text="AWS [[blank]] stores data as [[blank]] in buckets.",
            explanation="Amazon S3 stores objects in buckets.",
            default_marks=Decimal("2.00"),
            negative_marks=Decimal("0.25"),
            is_verified=True,
            is_active=True,
            metadata={
                "accepted_answers": ["S3", "objects"],
                "fill_in_blanks": {"blank_count": 2},
            },
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=fill_in_blanks_question,
            question_order=2,
            section_name="Section A",
        )

        attempt = self._start_attempt()
        response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(fill_in_blanks_question.id),
                "answer_text": "S3|objects",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        payload = self._action_data(response)
        self.assertEqual(payload["answer_text"], "S3|objects")
        attempt.refresh_from_db()
        saved_answer = attempt.answers.get(question=fill_in_blanks_question)
        self.assertTrue(saved_answer.is_correct)

    def test_save_answer_supports_assertion_reason_questions(self):
        assertion_reason_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ASSERTION_REASON,
            difficulty_level="foundation",
            question_text="Assertion: Elasticity changes capacity with demand.\n\nReason: Cloud platforms can automate capacity changes based on policy.",
            explanation="Both statements are true and the reason explains the assertion.",
            default_marks=Decimal("2.00"),
            negative_marks=Decimal("0.25"),
            is_verified=True,
            is_active=True,
            metadata={
                "assertion_reason": {
                    "assertion_text": "Elasticity changes capacity with demand.",
                    "reason_text": "Cloud platforms can automate capacity changes based on policy.",
                }
            },
        )
        option_one = QuestionOption.objects.create(
            question=assertion_reason_question,
            content_format="markdown_latex",
            option_text="Both Assertion and Reason are true, and Reason is the correct explanation of Assertion.",
            option_order=1,
            is_correct=True,
        )
        QuestionOption.objects.create(
            question=assertion_reason_question,
            content_format="markdown_latex",
            option_text="Both Assertion and Reason are true, but Reason is not the correct explanation of Assertion.",
            option_order=2,
            is_correct=False,
        )
        QuestionOption.objects.create(
            question=assertion_reason_question,
            content_format="markdown_latex",
            option_text="Assertion is true, but Reason is false.",
            option_order=3,
            is_correct=False,
        )
        QuestionOption.objects.create(
            question=assertion_reason_question,
            content_format="markdown_latex",
            option_text="Assertion is false, but Reason is true.",
            option_order=4,
            is_correct=False,
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=assertion_reason_question,
            question_order=2,
            section_name="Section A",
        )

        attempt = self._start_attempt()
        response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(assertion_reason_question.id),
                "selected_option": str(option_one.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        payload = self._action_data(response)
        self.assertEqual(str(payload["selected_option"]), str(option_one.id))
        attempt.refresh_from_db()
        saved_answer = attempt.answers.get(question=assertion_reason_question)
        self.assertTrue(saved_answer.is_correct)

    def test_save_answer_supports_matrix_match_questions(self):
        matrix_match_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.MATRIX_MATCH,
            difficulty_level="foundation",
            question_text="Match the services with the correct descriptions.",
            explanation="Each service has a single best description.",
            default_marks=Decimal("2.00"),
            negative_marks=Decimal("0.25"),
            is_verified=True,
            is_active=True,
            metadata={
                "matrix_match": {
                    "left_items": ["S3", "EC2", "RDS"],
                    "right_items": ["Object storage", "Virtual machine", "Managed relational database"],
                }
            },
        )
        option_one = QuestionOption.objects.create(
            question=matrix_match_question,
            content_format="markdown_latex",
            option_text="A-1, B-2, C-3",
            option_order=1,
            is_correct=True,
        )
        QuestionOption.objects.create(
            question=matrix_match_question,
            content_format="markdown_latex",
            option_text="A-2, B-1, C-3",
            option_order=2,
            is_correct=False,
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=matrix_match_question,
            question_order=2,
            section_name="Section A",
        )

        attempt = self._start_attempt()
        response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(matrix_match_question.id),
                "selected_option": str(option_one.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        payload = self._action_data(response)
        self.assertEqual(str(payload["selected_option"]), str(option_one.id))
        attempt.refresh_from_db()
        saved_answer = attempt.answers.get(question=matrix_match_question)
        self.assertTrue(saved_answer.is_correct)

    def test_save_answer_marks_essay_response_pending_manual_review(self):
        essay_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Discuss whether cloud migration should be phased or immediate.",
            explanation="Review based on reasoning quality and examples.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"review_guidance": "Check argument clarity and tradeoff analysis."},
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=essay_question,
            question_order=2,
            section_name="Section A",
        )

        attempt = self._start_attempt()
        response = self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(essay_question.id),
                "answer_text": "A phased migration usually lowers operational risk and rollback cost.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        saved_answer = attempt.answers.get(question=essay_question)
        self.assertEqual(saved_answer.evaluation_status, "manual_pending")
        self.assertEqual(saved_answer.marks_awarded, Decimal("0.00"))

    def test_teacher_can_review_essay_answer_and_generate_result(self):
        essay_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Write a short note on cloud elasticity.",
            explanation="Review for concept accuracy and practical framing.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"review_guidance": "Reward accurate explanation and a good example."},
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=essay_question,
            question_order=2,
            section_name="Section A",
        )

        attempt = self._start_attempt()
        self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(essay_question.id),
                "answer_text": "Elasticity lets systems expand or shrink capacity based on demand.",
            },
            format="json",
        )
        attempt = submit_attempt(attempt)

        with self.assertRaisesMessage(ValidationError, "manual-review answers are graded"):
            generate_result_from_attempt(attempt)

        answer = attempt.answers.get(question=essay_question)
        review_response = self.teacher_client.post(
            f"/api/v1/attempts/answers/{answer.id}/manual-review/",
            {
                "marks_awarded": "4.00",
                "review_notes": "Strong concept explanation, add one real-world example next time.",
            },
            format="json",
        )

        self.assertEqual(review_response.status_code, 200)
        answer.refresh_from_db()
        attempt.refresh_from_db()
        self.assertEqual(answer.evaluation_status, "manual_reviewed")
        self.assertEqual(answer.marks_awarded, Decimal("4.00"))
        self.assertEqual(answer.review_notes, "Strong concept explanation, add one real-world example next time.")
        review_task = StudentAnswerReviewTask.objects.get(answer=answer)
        self.assertEqual(review_task.status, "reviewed")
        self.assertEqual(review_task.latest_marks_awarded, Decimal("4.00"))
        self.assertEqual(review_task.events.count(), 2)
        result = generate_result_from_attempt(attempt)
        self.assertEqual(result.final_score, attempt.final_score)

    def test_manual_review_answer_creates_review_task(self):
        essay_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Describe a staged rollout plan.",
            explanation="Review for structure and practical detail.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"review_guidance": "Reward risk awareness and clarity."},
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=essay_question,
            question_order=2,
            section_name="Section A",
        )

        attempt = self._start_attempt()
        self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(essay_question.id),
                "answer_text": "Use canary rollout, observe metrics, and expand gradually.",
            },
            format="json",
        )

        answer = attempt.answers.get(question=essay_question)
        task = StudentAnswerReviewTask.objects.get(answer=answer)
        self.assertEqual(task.status, "pending")
        self.assertEqual(task.exam_id, self.exam.id)
        self.assertEqual(task.student_id, self.context["student"].id)
        self.assertEqual(task.events.count(), 1)

    def test_teacher_can_list_review_tasks(self):
        essay_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Explain horizontal scaling.",
            explanation="Review for correctness.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"review_guidance": "Check both definition and example."},
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=essay_question,
            question_order=2,
            section_name="Section A",
        )
        attempt = self._start_attempt()
        self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(essay_question.id),
                "answer_text": "Horizontal scaling adds more machines to handle load.",
            },
            format="json",
        )

        response = self.teacher_client.get("/api/v1/attempts/review-tasks/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["status"], "pending")
        self.assertEqual(response.data["results"][0]["exam_title"], self.exam.title)

        summary_response = self.teacher_client.get("/api/v1/attempts/review-tasks/summary/")
        self.assertEqual(summary_response.status_code, 200)
        self.assertEqual(summary_response.data["total"], 1)
        self.assertEqual(summary_response.data["pending"], 1)
        self.assertIn("recheck_requested", summary_response.data)
        self.assertIn("blocked_exams", summary_response.data)
        self.assertIn("average_turnaround_hours", summary_response.data)
        self.assertIn("oldest_open_hours", summary_response.data)
        self.assertIn("backlog_age_buckets", summary_response.data)
        self.assertIn("throughput_trend", summary_response.data)
        self.assertIn("throughput_windows", summary_response.data)
        self.assertIn("release_risk_summary", summary_response.data)
        self.assertEqual(summary_response.data["reviewers"][0]["teacher_name"], "Unassigned")
        self.assertIn("unresolved_count", summary_response.data["reviewers"][0])
        self.assertIn("average_turnaround_hours", summary_response.data["reviewers"][0])
        self.assertEqual(summary_response.data["exams"][0]["exam_title"], self.exam.title)
        self.assertIn("recheck_requested_count", summary_response.data["exams"][0])
        self.assertIn("oldest_open_hours", summary_response.data["exams"][0])
        self.assertIn("release_risk_level", summary_response.data["exams"][0])
        self.assertEqual(len(summary_response.data["throughput_windows"]), 3)
        self.assertEqual(
            summary_response.data["oldest_pending_tasks"][0]["student_name"],
            self.context["student"].full_name,
        )

    def test_teacher_review_task_detail_includes_rubric_context_and_response_artifacts(self):
        essay_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Explain elasticity with a spoken response.",
            explanation="Review for clarity and correctness.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={
                "review_guidance": (
                    "Check explanation quality.\n"
                    "- Reward correct elasticity definition.\n"
                    "- Look for a demand-based example."
                )
            },
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=essay_question,
            question_order=2,
            section_name="Section A",
        )
        attempt = self._start_attempt()
        self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(essay_question.id),
                "answer_transcript": "Elasticity increases or decreases resources with demand.",
                "response_artifacts": [
                    {
                        "asset_kind": "audio_recording",
                        "upload_token": "review-audio-001",
                        "file_name": "elasticity.m4a",
                        "mime_type": "audio/mp4",
                        "storage_status": "uploaded",
                        "file_url": "https://example.com/media/review-audio-001.m4a",
                    }
                ],
            },
            format="json",
        )

        task = StudentAnswerReviewTask.objects.get(answer__question=essay_question)
        response = self.teacher_client.get(f"/api/v1/attempts/review-tasks/{task.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["answer_transcript"],
            "Elasticity increases or decreases resources with demand.",
        )
        self.assertEqual(
            response.data["question_text"],
            "Explain elasticity with a spoken response.",
        )
        self.assertEqual(
            response.data["question_type_definition"]["label"],
            "Essay Manual Review",
        )
        self.assertIn("Check explanation quality.", response.data["review_guidance"])
        self.assertEqual(
            response.data["rubric_checklist"],
            [
                "Check explanation quality.",
                "Reward correct elasticity definition.",
                "Look for a demand-based example.",
            ],
        )
        self.assertEqual(response.data["response_artifacts"][0]["asset_kind"], "audio_recording")
        self.assertEqual(
            response.data["response_artifacts"][0]["file_url"],
            "https://example.com/media/review-audio-001.m4a",
        )

    def test_teacher_can_submit_rubric_scored_review(self):
        essay_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Explain failover strategy.",
            explanation="Review coverage, accuracy, and example quality.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={
                "review_guidance": "Use the rubric for consistent scoring.",
                "rubric": {
                    "mode": "criterion_scores",
                    "criteria": [
                        {
                            "key": "accuracy",
                            "label": "Accuracy",
                            "max_score": "2.00",
                            "display_order": 1,
                            "reviewer_hint": "Reward technically correct explanation.",
                        },
                        {
                            "key": "clarity",
                            "label": "Clarity",
                            "max_score": "2.00",
                            "display_order": 2,
                            "reviewer_hint": "Reward clear structure.",
                        },
                        {
                            "key": "example",
                            "label": "Example quality",
                            "max_score": "1.00",
                            "display_order": 3,
                            "reviewer_hint": "Look for a concrete example.",
                        },
                    ],
                },
            },
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=essay_question,
            question_order=2,
            section_name="Section A",
        )
        attempt = self._start_attempt()
        self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(essay_question.id),
                "answer_text": "Use redundant systems and shift traffic when the primary service fails.",
            },
            format="json",
        )

        task = StudentAnswerReviewTask.objects.get(answer__question=essay_question)
        response = self.teacher_client.post(
            f"/api/v1/attempts/review-tasks/{task.id}/submit-review/",
            {
                "marks_awarded": "4.00",
                "review_notes": "Good answer with one missing example detail.",
                "rubric_scores": [
                    {"criterion_key": "accuracy", "awarded_score": "1.50", "note": "Mostly correct."},
                    {"criterion_key": "clarity", "awarded_score": "1.50", "note": "Well structured."},
                    {"criterion_key": "example", "awarded_score": "1.00", "note": "Concrete example included."},
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        task.refresh_from_db()
        self.assertEqual(task.latest_marks_awarded, Decimal("4.00"))
        self.assertEqual(task.metadata["rubric_total"], "4.00")
        self.assertEqual(task.metadata["rubric_scores"][0]["criterion_key"], "accuracy")
        self.assertEqual(response.data["data"]["rubric_scores"][2]["criterion_key"], "example")

    def test_institute_admin_can_filter_review_tasks_by_assignment_scope(self):
        first_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Explain high availability.",
            explanation="Review for redundancy and failover coverage.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"review_guidance": "Check definition and practical example."},
        )
        second_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Explain disaster recovery planning.",
            explanation="Review for backup and recovery planning.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"review_guidance": "Look for RTO, RPO, and recovery workflow."},
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=first_question,
            question_order=2,
            section_name="Section A",
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=second_question,
            question_order=3,
            section_name="Section A",
        )

        attempt = self._start_attempt()
        self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(first_question.id),
                "answer_text": "High availability keeps services running through redundancy and failover.",
            },
            format="json",
        )
        self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(second_question.id),
                "answer_text": "Disaster recovery planning defines how to restore systems after major failure.",
            },
            format="json",
        )

        first_task = StudentAnswerReviewTask.objects.get(answer__question=first_question)
        second_task = StudentAnswerReviewTask.objects.get(answer__question=second_question)
        second_task.assigned_to_teacher = self.context["teacher"]
        second_task.status = "assigned"
        second_task.assigned_at = timezone.now()
        second_task.save(update_fields=["assigned_to_teacher", "status", "assigned_at", "updated_at"])

        unassigned_response = self.institute_admin_client.get(
            "/api/v1/attempts/review-tasks/?assignment_scope=unassigned"
        )
        self.assertEqual(unassigned_response.status_code, 200)
        self.assertEqual(unassigned_response.data["count"], 1)
        self.assertEqual(unassigned_response.data["results"][0]["id"], str(first_task.id))

        assigned_response = self.institute_admin_client.get(
            "/api/v1/attempts/review-tasks/?assignment_scope=assigned"
        )
        self.assertEqual(assigned_response.status_code, 200)
        self.assertEqual(assigned_response.data["count"], 1)
        self.assertEqual(assigned_response.data["results"][0]["id"], str(second_task.id))

        summary_response = self.institute_admin_client.get(
            "/api/v1/attempts/review-tasks/summary/?assignment_scope=unassigned"
        )
        self.assertEqual(summary_response.status_code, 200)
        self.assertEqual(summary_response.data["total"], 1)
        self.assertEqual(summary_response.data["unassigned"], 1)
        self.assertEqual(summary_response.data["assigned"], 0)
        self.assertEqual(summary_response.data["reviewers"][0]["teacher_name"], "Unassigned")

    def test_teacher_can_submit_review_via_review_task_endpoint(self):
        essay_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Explain cost optimization in cloud computing.",
            explanation="Review for cost and elasticity understanding.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"review_guidance": "Look for examples like pay-as-you-go or rightsizing."},
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=essay_question,
            question_order=2,
            section_name="Section A",
        )
        attempt = self._start_attempt()
        self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(essay_question.id),
                "answer_text": "Cost optimization means paying only for required resources and tuning usage.",
            },
            format="json",
        )
        attempt = submit_attempt(attempt)
        answer = attempt.answers.get(question=essay_question)
        task = StudentAnswerReviewTask.objects.get(answer=answer)

        response = self.teacher_client.post(
            f"/api/v1/attempts/review-tasks/{task.id}/submit-review/",
            {
                "marks_awarded": "4.50",
                "review_notes": "Strong answer with clear cost-control framing.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        answer.refresh_from_db()
        task.refresh_from_db()
        self.assertEqual(answer.evaluation_status, "manual_reviewed")
        self.assertEqual(task.status, "reviewed")
        self.assertEqual(task.latest_marks_awarded, Decimal("4.50"))
        self.assertEqual(task.events.count(), 2)

    def test_institute_admin_can_assign_review_task_to_teacher(self):
        essay_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Explain the shared responsibility model.",
            explanation="Review for clear division between customer and provider.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"review_guidance": "Look for correct responsibilities on both sides."},
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=essay_question,
            question_order=2,
            section_name="Section A",
        )
        attempt = self._start_attempt()
        self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(essay_question.id),
                "answer_text": "AWS secures the cloud, while customers secure what they put in it.",
            },
            format="json",
        )
        answer = attempt.answers.get(question=essay_question)
        task = StudentAnswerReviewTask.objects.get(answer=answer)

        response = self.institute_admin_client.post(
            f"/api/v1/attempts/review-tasks/{task.id}/assign/",
            {
                "assigned_to_teacher": str(self.context["teacher"].id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        task.refresh_from_db()
        self.assertEqual(task.status, "assigned")
        self.assertEqual(task.assigned_to_teacher_id, self.context["teacher"].id)
        self.assertEqual(task.events.count(), 2)

    def test_institute_admin_can_bulk_assign_review_tasks_to_teacher(self):
        first_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Explain shared responsibility boundaries.",
            explanation="Review responsibility separation.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"review_guidance": "Look for provider vs customer clarity."},
        )
        second_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Explain fault tolerance.",
            explanation="Review resilience framing.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"review_guidance": "Look for redundancy and continuity."},
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=first_question,
            question_order=2,
            section_name="Section A",
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=second_question,
            question_order=3,
            section_name="Section A",
        )
        attempt = self._start_attempt()
        self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(first_question.id),
                "answer_text": "AWS secures infrastructure while customers secure workloads and data.",
            },
            format="json",
        )
        self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(second_question.id),
                "answer_text": "Fault tolerance keeps service available even when one component fails.",
            },
            format="json",
        )

        first_task = StudentAnswerReviewTask.objects.get(answer__question=first_question)
        second_task = StudentAnswerReviewTask.objects.get(answer__question=second_question)

        response = self.institute_admin_client.post(
            "/api/v1/attempts/review-tasks/bulk-assign/",
            {
                "task_ids": [str(first_task.id), str(second_task.id)],
                "assigned_to_teacher": str(self.context["teacher"].id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        first_task.refresh_from_db()
        second_task.refresh_from_db()
        self.assertEqual(first_task.assigned_to_teacher_id, self.context["teacher"].id)
        self.assertEqual(second_task.assigned_to_teacher_id, self.context["teacher"].id)
        self.assertEqual(first_task.status, "assigned")
        self.assertEqual(second_task.status, "assigned")
        self.assertEqual(len(response.data["data"]), 2)

    def test_teacher_can_self_assign_review_task(self):
        essay_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Explain elasticity in cloud computing.",
            explanation="Review for scaling explanation.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"review_guidance": "Look for automatic scale up and down."},
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=essay_question,
            question_order=2,
            section_name="Section A",
        )
        attempt = self._start_attempt()
        self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(essay_question.id),
                "answer_text": "Elasticity means resources can grow and shrink with demand.",
            },
            format="json",
        )
        answer = attempt.answers.get(question=essay_question)
        task = StudentAnswerReviewTask.objects.get(answer=answer)

        response = self.teacher_client.post(
            f"/api/v1/attempts/review-tasks/{task.id}/assign-to-me/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        task.refresh_from_db()
        self.assertEqual(task.status, "assigned")
        self.assertEqual(task.assigned_to_teacher_id, self.context["teacher"].id)
        self.assertEqual(task.events.count(), 2)

    def test_teacher_can_claim_next_review_task(self):
        essay_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Explain autoscaling in cloud environments.",
            explanation="Review for dynamic capacity explanation.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"review_guidance": "Look for scale up and scale down behavior."},
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=essay_question,
            question_order=2,
            section_name="Section A",
        )
        attempt = self._start_attempt()
        self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(essay_question.id),
                "answer_text": "Autoscaling adds and removes resources as demand changes.",
            },
            format="json",
        )
        answer = attempt.answers.get(question=essay_question)
        task = StudentAnswerReviewTask.objects.get(answer=answer)

        response = self.teacher_client.post(
            "/api/v1/attempts/review-tasks/claim-next/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        task.refresh_from_db()
        self.assertEqual(task.assigned_to_teacher_id, self.context["teacher"].id)
        self.assertEqual(task.status, "in_review")
        self.assertIsNotNone(task.review_started_at)
        self.assertEqual(response.data["data"]["id"], str(task.id))

    def test_request_recheck_returns_task_to_pending_scoring(self):
        essay_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Explain reserved instances.",
            explanation="Review for pricing optimization understanding.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"review_guidance": "Check commitment and discount explanation."},
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=essay_question,
            question_order=2,
            section_name="Section A",
        )
        attempt = self._start_attempt()
        self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(essay_question.id),
                "answer_text": "Reserved instances lower cost when you commit to usage ahead of time.",
            },
            format="json",
        )
        attempt = submit_attempt(attempt)
        answer = attempt.answers.get(question=essay_question)
        task = StudentAnswerReviewTask.objects.get(answer=answer)
        self.teacher_client.post(
            f"/api/v1/attempts/review-tasks/{task.id}/submit-review/",
            {
                "marks_awarded": "4.00",
                "review_notes": "Good pricing explanation.",
            },
            format="json",
        )

        response = self.institute_admin_client.post(
            f"/api/v1/attempts/review-tasks/{task.id}/request-recheck/",
            {
                "review_notes": "Needs another look for depth and example quality.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        answer.refresh_from_db()
        task.refresh_from_db()
        self.assertEqual(answer.evaluation_status, "manual_pending")
        self.assertEqual(answer.marks_awarded, Decimal("0.00"))
        self.assertEqual(task.status, "recheck_requested")
        self.assertEqual(task.events.count(), 3)

    def test_institute_admin_can_bulk_request_recheck(self):
        first_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Explain AWS pricing options.",
            explanation="Review for pricing awareness.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"review_guidance": "Look for on-demand, reserved, or savings plans."},
        )
        second_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Explain availability zones.",
            explanation="Review for resilience understanding.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"review_guidance": "Look for failure isolation and continuity."},
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=first_question,
            question_order=2,
            section_name="Section A",
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=second_question,
            question_order=3,
            section_name="Section A",
        )
        attempt = self._start_attempt()
        self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(first_question.id),
                "answer_text": "Reserved pricing reduces cost when usage is predictable.",
            },
            format="json",
        )
        self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(second_question.id),
                "answer_text": "Availability zones isolate failures within a region.",
            },
            format="json",
        )
        attempt = submit_attempt(attempt)
        first_answer = attempt.answers.get(question=first_question)
        second_answer = attempt.answers.get(question=second_question)
        first_task = StudentAnswerReviewTask.objects.get(answer=first_answer)
        second_task = StudentAnswerReviewTask.objects.get(answer=second_answer)
        review_manual_answer(
            answer=first_answer,
            reviewed_by_teacher=self.context["teacher"],
            marks_awarded=Decimal("4.00"),
            review_notes="Needs a broader example.",
        )
        review_manual_answer(
            answer=second_answer,
            reviewed_by_teacher=self.context["teacher"],
            marks_awarded=Decimal("5.00"),
            review_notes="Solid resilience explanation.",
        )

        response = self.institute_admin_client.post(
            "/api/v1/attempts/review-tasks/bulk-request-recheck/",
            {
                "task_ids": [str(first_task.id), str(second_task.id)],
                "review_notes": "Return these answers for one more grading pass.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        first_answer.refresh_from_db()
        second_answer.refresh_from_db()
        first_task.refresh_from_db()
        second_task.refresh_from_db()
        self.assertEqual(first_task.status, "recheck_requested")
        self.assertEqual(second_task.status, "recheck_requested")
        self.assertEqual(first_answer.evaluation_status, "manual_pending")
        self.assertEqual(second_answer.evaluation_status, "manual_pending")
        self.assertEqual(len(response.data["data"]), 2)

    def test_institute_admin_can_bulk_moderate_reviewed_tasks(self):
        first_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Explain cost optimization.",
            explanation="Review for savings strategy understanding.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"review_guidance": "Look for rightsizing and pricing models."},
        )
        second_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Explain high availability.",
            explanation="Review for uptime planning.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={"review_guidance": "Look for redundancy and failover."},
        )
        self.builder.create_exam_question(exam=self.exam, question=first_question, question_order=2, section_name="Section A")
        self.builder.create_exam_question(exam=self.exam, question=second_question, question_order=3, section_name="Section A")
        attempt = self._start_attempt()
        self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {"question": str(first_question.id), "answer_text": "Rightsizing and reserved pricing improve cost."},
            format="json",
        )
        self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {"question": str(second_question.id), "answer_text": "High availability uses redundancy to avoid downtime."},
            format="json",
        )
        attempt = submit_attempt(attempt)
        first_answer = attempt.answers.get(question=first_question)
        second_answer = attempt.answers.get(question=second_question)
        first_task = StudentAnswerReviewTask.objects.get(answer=first_answer)
        second_task = StudentAnswerReviewTask.objects.get(answer=second_answer)
        review_manual_answer(
            answer=first_answer,
            reviewed_by_teacher=self.context["teacher"],
            marks_awarded=Decimal("4.25"),
            review_notes="Good answer with one missed example.",
        )
        review_manual_answer(
            answer=second_answer,
            reviewed_by_teacher=self.context["teacher"],
            marks_awarded=Decimal("4.50"),
            review_notes="Strong resilience framing.",
        )

        response = self.institute_admin_client.post(
            "/api/v1/attempts/review-tasks/bulk-moderate/",
            {
                "task_ids": [str(first_task.id), str(second_task.id)],
                "review_notes": "Moderated and approved for final scoring.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        first_task.refresh_from_db()
        second_task.refresh_from_db()
        first_answer.refresh_from_db()
        second_answer.refresh_from_db()
        self.assertEqual(first_task.status, "moderated")
        self.assertEqual(second_task.status, "moderated")
        self.assertEqual(first_answer.marks_awarded, Decimal("4.25"))
        self.assertEqual(second_answer.marks_awarded, Decimal("4.50"))
        self.assertEqual(first_task.latest_review_summary, "Moderated and approved for final scoring.")
        self.assertEqual(second_task.latest_review_summary, "Moderated and approved for final scoring.")
        self.assertEqual(len(response.data["data"]), 2)

    def test_institute_admin_can_moderate_review_task(self):
        essay_question = Question.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            question_type=QuestionType.ESSAY_MANUAL_REVIEW,
            difficulty_level="advanced",
            question_text="Explain availability zones.",
            explanation="Review for redundancy understanding.",
            default_marks=Decimal("5.00"),
            negative_marks=Decimal("0.00"),
            is_verified=True,
            is_active=True,
            metadata={
                "review_guidance": "Look for isolation and resilience language.",
                "rubric": {
                    "mode": "criterion_scores",
                    "criteria": [
                        {
                            "key": "accuracy",
                            "label": "Accuracy",
                            "max_score": "2.00",
                            "display_order": 1,
                            "reviewer_hint": "Reward correctness.",
                        },
                        {
                            "key": "clarity",
                            "label": "Clarity",
                            "max_score": "2.00",
                            "display_order": 2,
                            "reviewer_hint": "Reward readable structure.",
                        },
                        {
                            "key": "example",
                            "label": "Example",
                            "max_score": "1.00",
                            "display_order": 3,
                            "reviewer_hint": "Reward concrete examples.",
                        },
                    ],
                },
            },
        )
        self.builder.create_exam_question(
            exam=self.exam,
            question=essay_question,
            question_order=2,
            section_name="Section A",
        )
        attempt = self._start_attempt()
        self.client.post(
            f"/api/v1/attempts/{attempt.id}/save-answer/",
            {
                "question": str(essay_question.id),
                "answer_text": "Availability zones are separate locations used for higher resilience.",
            },
            format="json",
        )
        answer = attempt.answers.get(question=essay_question)
        task = StudentAnswerReviewTask.objects.get(answer=answer)
        review_response = self.teacher_client.post(
            f"/api/v1/attempts/review-tasks/{task.id}/submit-review/",
            {
                "marks_awarded": "3.50",
                "review_notes": "Initial review completed.",
                "rubric_scores": [
                    {"criterion_key": "accuracy", "awarded_score": "1.50", "note": "Mostly correct."},
                    {"criterion_key": "clarity", "awarded_score": "1.00", "note": "Needs structure."},
                    {"criterion_key": "example", "awarded_score": "1.00", "note": "Example included."},
                ],
            },
            format="json",
        )
        self.assertEqual(review_response.status_code, 200)

        response = self.institute_admin_client.post(
            f"/api/v1/attempts/review-tasks/{task.id}/moderate/",
            {
                "marks_awarded": "4.25",
                "review_notes": "Moderated and approved with stronger resilience framing.",
                "rubric_scores": [
                    {"criterion_key": "accuracy", "awarded_score": "1.75", "note": "More complete than initial review."},
                    {"criterion_key": "clarity", "awarded_score": "1.50", "note": "Clearer structure than first pass."},
                    {"criterion_key": "example", "awarded_score": "1.00", "note": "Example retained."},
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        answer.refresh_from_db()
        task.refresh_from_db()
        self.assertEqual(answer.evaluation_status, "manual_reviewed")
        self.assertEqual(task.status, "moderated")
        self.assertEqual(task.latest_marks_awarded, Decimal("4.25"))
        self.assertEqual(task.events.count(), 3)
        moderation_event = task.events.order_by("-created_at").first()
        self.assertEqual(moderation_event.event_type, "moderated")
        self.assertEqual(moderation_event.metadata["previous_rubric_total"], "3.50")
        self.assertEqual(moderation_event.metadata["previous_rubric_scores"][1]["criterion_key"], "clarity")
        self.assertEqual(moderation_event.metadata["rubric_total"], "4.25")

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
        self.assertEqual(question_payload["question_type_definition"]["response_mode"], "single_choice")
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
