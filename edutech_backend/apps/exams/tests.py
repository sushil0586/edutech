from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta

from apps.exams.models import ExamSection, ExamSourceType
from apps.exams.serializers import (
    ExamListSerializer,
    ExamQuestionSerializer,
    ExamReadSerializer,
    ExamSectionSerializer,
)
from apps.exams.services import build_exam_publish_readiness, sync_total_marks_from_questions
from common.tests.builders import AcademicAssessmentBuilder


class ExamSourceModelTests(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()

    def test_teacher_source_requires_source_teacher(self):
        exam = self.builder.create_exam(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            self.context["subject"],
            code="SRC-TEACHER-REQ-01",
        )

        exam.source_type = ExamSourceType.TEACHER
        exam.source_teacher = None

        with self.assertRaises(ValidationError) as exc:
            exam.full_clean()

        self.assertIn("source_teacher", exc.exception.message_dict)

    def test_teacher_source_accepts_teacher_from_same_institute(self):
        exam = self.builder.create_exam(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            self.context["subject"],
            code="SRC-TEACHER-OK-01",
            source_type=ExamSourceType.TEACHER,
            source_teacher=self.context["teacher"],
        )

        exam.full_clean()

        self.assertEqual(exam.source_type, ExamSourceType.TEACHER)
        self.assertEqual(exam.source_teacher_id, self.context["teacher"].id)

    def test_platform_and_institute_sources_do_not_require_teacher(self):
        platform_exam = self.builder.create_exam(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            self.context["subject"],
            code="SRC-PLATFORM-01",
            source_type=ExamSourceType.PLATFORM,
        )
        institute_exam = self.builder.create_exam(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            self.context["subject"],
            code="SRC-INSTITUTE-01",
            source_type=ExamSourceType.INSTITUTE,
        )

        platform_exam.full_clean()
        institute_exam.full_clean()

        self.assertEqual(platform_exam.source_label, "Platform")
        self.assertEqual(institute_exam.source_label, "Institute")


class ExamPublishReadinessTests(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()

    def test_publish_readiness_reports_schedule_and_question_blockers(self):
        exam = self.builder.create_exam(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            self.context["subject"],
            code="READY-BLOCK-01",
            title="Readiness blockers",
        )

        readiness = build_exam_publish_readiness(exam)

        self.assertFalse(readiness["ready"])
        blocker_codes = {item["code"] for item in readiness["blockers"]}
        self.assertIn("no_active_questions", blocker_codes)

    def test_publish_readiness_reports_question_quality_warnings(self):
        exam = self.context["exam"]
        exam.start_at = timezone.now()
        exam.end_at = exam.start_at + timedelta(minutes=90)
        exam.save(update_fields=["start_at", "end_at", "updated_at"])

        question = self.context["question"]
        question.explanation = ""
        question.is_verified = False
        question.save(update_fields=["explanation", "is_verified", "updated_at"])
        sync_total_marks_from_questions(exam)

        readiness = build_exam_publish_readiness(exam)

        self.assertTrue(readiness["ready"])
        warning_codes = {item["code"] for item in readiness["warnings"]}
        self.assertIn("missing_explanation", warning_codes)
        self.assertIn("unverified_question", warning_codes)

    def test_publish_readiness_blocks_question_when_section_subject_mismatches(self):
        second_subject = self.builder.create_subject(
            self.context["institute"],
            self.context["program"],
            name="Science",
            code="SCI10",
            sort_order=2,
        )
        section = self.context["section"]
        section.subject = second_subject
        section.save(update_fields=["subject", "updated_at"])

        exam = self.context["exam"]
        exam.start_at = timezone.now()
        exam.end_at = exam.start_at + timedelta(minutes=90)
        exam.save(update_fields=["start_at", "end_at", "updated_at"])
        sync_total_marks_from_questions(exam)

        readiness = build_exam_publish_readiness(exam)

        self.assertFalse(readiness["ready"])
        blocker_messages = [item["message"] for item in readiness["blockers"]]
        self.assertTrue(any("does not match the subject assigned to section" in message for message in blocker_messages))


class ExamSubjectValidationTests(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.second_subject = self.builder.create_subject(
            self.context["institute"],
            self.context["program"],
            name="Science",
            code="SCI10",
            sort_order=2,
        )
        self.second_topic = self.builder.create_topic(
            self.context["institute"],
            self.second_subject,
            name="Motion",
            code="SCI-MOT-01",
            sort_order=1,
        )
        self.second_question, _ = self.builder.create_question_with_options(
            self.context["institute"],
            self.context["program"],
            self.second_subject,
            self.second_topic,
            self.context["teacher"],
            question_text="Science question",
        )

    def test_section_serializer_falls_back_to_exam_subject_on_create(self):
        serializer = ExamSectionSerializer(
            data={
                "exam": str(self.context["exam"].id),
                "name": "Fallback Subject Section",
                "section_order": 2,
                "description": "",
                "instructions": "",
                "total_questions": 0,
                "timer_enabled": False,
                "allow_skip_section": True,
                "lock_after_submit": False,
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["subject"].id, self.context["exam"].subject_id)

    def test_question_serializer_rejects_question_when_section_subject_mismatches(self):
        section = self.context["section"]
        section.subject = self.context["subject"]
        section.save(update_fields=["subject", "updated_at"])

        serializer = ExamQuestionSerializer(
            data={
                "exam": str(self.context["exam"].id),
                "question": str(self.second_question.id),
                "section": str(section.id),
                "question_order": 2,
                "marks": "2.00",
                "negative_marks": "0.50",
                "is_mandatory": True,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("question", serializer.errors)


class ExamReadContractTests(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()

    def test_exam_read_serializer_exposes_single_subject_summary(self):
        serializer = ExamReadSerializer(instance=self.context["exam"])
        data = serializer.data

        self.assertFalse(data["is_multi_subject"])
        self.assertEqual(data["primary_subject"], str(self.context["subject"].id))
        self.assertEqual(data["primary_subject_name"], self.context["subject"].name)
        self.assertEqual(data["subject_name"], self.context["subject"].name)
        self.assertEqual(data["subject_summary"]["display_label"], self.context["subject"].name)
        self.assertEqual(len(data["section_subjects"]), 1)

    def test_exam_list_serializer_exposes_mixed_subject_summary(self):
        second_subject = self.builder.create_subject(
            self.context["institute"],
            self.context["program"],
            name="Science",
            code="SCI10",
            sort_order=2,
        )
        ExamSection.objects.create(
            exam=self.context["exam"],
            name="Math Section",
            section_order=1,
            total_questions=1,
            subject=self.context["subject"],
        )
        ExamSection.objects.create(
            exam=self.context["exam"],
            name="Science Section",
            section_order=2,
            total_questions=1,
            subject=second_subject,
        )

        serializer = ExamListSerializer(instance=self.context["exam"])
        data = serializer.data

        self.assertTrue(data["is_multi_subject"])
        self.assertEqual(data["primary_subject"], str(self.context["subject"].id))
        self.assertEqual(data["primary_subject_name"], self.context["subject"].name)
        self.assertEqual(data["subject_name"], self.context["subject"].name)
        self.assertEqual(data["subject_summary"]["subject_count"], 2)
        self.assertEqual(data["subject_summary"]["short_label"], f"{self.context['subject'].name} +1")
        self.assertEqual(
            [subject["code"] for subject in data["section_subjects"]],
            [self.context["subject"].code, second_subject.code],
        )
