from apps.academics.models import OptionCatalogEntry
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from apps.question_bank.models import Question, QuestionTag, QuestionTagMap
from common.tests.builders import AcademicAssessmentBuilder


class QuestionBankBulkWorkflowTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.teacher_user, self.teacher_account = self.builder.create_teacher_account(
            institute=self.context["institute"],
            teacher_profile=self.context["teacher"],
            username="teacher-bulk",
            password="Teacher@123",
            email="teacher-bulk@example.com",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.teacher_user)

    def _csv_file(self, content, name="question_import.csv"):
        return SimpleUploadedFile(name, content.encode("utf-8"), content_type="text/csv")

    def test_option_catalog_endpoint_returns_seeded_authoring_options(self):
        response = self.client.get(
            "/api/v1/academics/option-catalog/",
            {
                "namespace": "question_type",
                "is_active": "true",
                "page_size": 50,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            any(item["code"] == "mcq_single" for item in response.data["results"])
        )

    def test_import_template_preview_and_finalize_workflow(self):
        template_response = self.client.get("/api/v1/question-bank/questions/import-template/")
        self.assertEqual(template_response.status_code, 200)
        self.assertIn("csv_content", template_response.data)

        csv_content = (
            "subject,topic,question_type,difficulty_level,question_text,option_1,option_2,option_3,option_4,"
            "correct_answer,default_marks,negative_marks,explanation,tags\n"
            "Mathematics,Algebra,mcq_single,intermediate,What is 5 + 5?,8,10,12,,2,1.00,0.00,"
            "10 is correct because 5 plus 5 equals 10.,arithmetic|addition\n"
        )
        preview_response = self.client.post(
            "/api/v1/question-bank/questions/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content),
            },
            format="multipart",
        )
        self.assertEqual(preview_response.status_code, 200)
        self.assertEqual(preview_response.data["valid_rows"], 1)
        self.assertEqual(preview_response.data["invalid_rows"], 0)

        before_count = Question.objects.count()
        finalize_response = self.client.post(
            "/api/v1/question-bank/questions/finalize-import/",
            {
                "institute": str(self.context["institute"].id),
                "preview_rows": preview_response.data["rows"],
                "valid_payloads": preview_response.data["valid_payloads"],
            },
            format="json",
        )
        self.assertEqual(finalize_response.status_code, 201)
        self.assertEqual(finalize_response.data["created_count"], 1)
        self.assertEqual(Question.objects.count(), before_count + 1)

        imported_question = Question.objects.get(question_text="What is 5 + 5?")
        self.assertEqual(imported_question.subject_id, self.context["subject"].id)
        self.assertEqual(imported_question.topic_id, self.context["topic"].id)
        self.assertEqual(QuestionTagMap.objects.filter(question=imported_question).count(), 2)

    def test_preview_import_returns_row_level_validation_errors(self):
        csv_content = (
            "subject,topic,question_type,difficulty_level,question_text,option_1,option_2,option_3,option_4,"
            "correct_answer,default_marks,negative_marks,explanation,tags\n"
            "Mathematics,Algebra,mcq_single,advanced,,,,,1,1.00,0.00,,\n"
        )
        response = self.client.post(
            "/api/v1/question-bank/questions/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="invalid_import.csv"),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["valid_rows"], 0)
        self.assertEqual(response.data["invalid_rows"], 1)
        self.assertEqual(response.data["rows"][0]["status"], "invalid")
        self.assertTrue(response.data["rows"][0]["errors"])

    def test_preview_import_rejects_inactive_catalog_difficulty(self):
        OptionCatalogEntry.objects.filter(
            namespace="question_difficulty",
            code="advanced",
        ).update(is_active=False, is_default=False)

        csv_content = (
            "subject,topic,question_type,difficulty_level,question_text,option_1,option_2,option_3,option_4,"
            "correct_answer,default_marks,negative_marks,explanation,tags\n"
            "Mathematics,Algebra,mcq_single,advanced,What is 8 + 2?,8,10,11,,2,1.00,0.00,"
            "10 is correct because 8 plus 2 equals 10.,arithmetic\n"
        )
        response = self.client.post(
            "/api/v1/question-bank/questions/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="inactive-difficulty.csv"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("difficulty_level", response.data)

    def test_bulk_actions_update_questions_in_place(self):
        extra_topic = self.builder.create_topic(
            self.context["institute"],
            self.context["subject"],
            name="Geometry",
            code="GEO-01",
        )
        question_two, _ = self.builder.create_question_with_options(
            self.context["institute"],
            self.context["program"],
            self.context["subject"],
            self.context["topic"],
            self.context["teacher"],
            question_text="What is 7 + 3?",
            explanation="Basic arithmetic for ten.",
        )

        deactivate_response = self.client.post(
            "/api/v1/question-bank/questions/bulk-action/",
            {
                "action": "deactivate",
                "question_ids": [
                    str(self.context["question"].id),
                    str(question_two.id),
                ],
            },
            format="json",
        )
        self.assertEqual(deactivate_response.status_code, 200)
        self.context["question"].refresh_from_db()
        question_two.refresh_from_db()
        self.assertFalse(self.context["question"].is_active)
        self.assertFalse(question_two.is_active)

        topic_response = self.client.post(
            "/api/v1/question-bank/questions/bulk-action/",
            {
                "action": "set_topic",
                "topic": str(extra_topic.id),
                "question_ids": [str(question_two.id)],
            },
            format="json",
        )
        self.assertEqual(topic_response.status_code, 200)
        question_two.refresh_from_db()
        self.assertEqual(question_two.topic_id, extra_topic.id)

        difficulty_response = self.client.post(
            "/api/v1/question-bank/questions/bulk-action/",
            {
                "action": "set_difficulty",
                "difficulty_level": "advanced",
                "question_ids": [str(question_two.id)],
            },
            format="json",
        )
        self.assertEqual(difficulty_response.status_code, 200)
        question_two.refresh_from_db()
        self.assertEqual(question_two.difficulty_level, "advanced")

    def test_bulk_action_assign_tag_creates_single_mapping_per_question(self):
        tag = QuestionTag.objects.create(
            institute=self.context["institute"],
            name="Algebra Core",
            code="ALGEBRA_CORE",
            is_active=True,
        )

        response = self.client.post(
            "/api/v1/question-bank/questions/bulk-action/",
            {
                "action": "assign_tag",
                "tag": str(tag.id),
                "question_ids": [str(self.context["question"].id)],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["updated_count"], 1)
        self.assertEqual(
            QuestionTagMap.objects.filter(question=self.context["question"], tag=tag).count(),
            1,
        )

        repeat_response = self.client.post(
            "/api/v1/question-bank/questions/bulk-action/",
            {
                "action": "assign_tag",
                "tag": str(tag.id),
                "question_ids": [str(self.context["question"].id)],
            },
            format="json",
        )

        self.assertEqual(repeat_response.status_code, 200)
        self.assertEqual(repeat_response.data["updated_count"], 0)
        self.assertEqual(
            QuestionTagMap.objects.filter(question=self.context["question"], tag=tag).count(),
            1,
        )

    def test_bulk_action_rejects_inactive_catalog_difficulty(self):
        OptionCatalogEntry.objects.filter(
            namespace="question_difficulty",
            code="advanced",
        ).update(is_active=False, is_default=False)

        response = self.client.post(
            "/api/v1/question-bank/questions/bulk-action/",
            {
                "action": "set_difficulty",
                "difficulty_level": "advanced",
                "question_ids": [str(self.context["question"].id)],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("difficulty_level", response.data)

    def test_finalize_import_rejects_cross_institute_subject_payload(self):
        other_institute = self.builder.create_institute(code="DLI002", email="other@example.com")
        other_program = self.builder.create_program(other_institute, code="CLS10X")
        other_subject = self.builder.create_subject(
            other_institute,
            other_program,
            name="Science",
            code="SCI10",
        )
        other_topic = self.builder.create_topic(
            other_institute,
            other_subject,
            name="Physics",
            code="PHY-01",
        )

        response = self.client.post(
            "/api/v1/question-bank/questions/finalize-import/",
            {
                "institute": str(self.context["institute"].id),
                "preview_rows": [
                    {
                        "row_number": 2,
                        "status": "valid",
                        "question_text": "Cross-institute payload",
                        "subject_name": other_subject.name,
                        "topic_name": other_topic.name,
                        "question_type": "mcq_single",
                        "difficulty_level": "intermediate",
                        "tag_values": [],
                        "errors": {},
                    }
                ],
                "valid_payloads": [
                    {
                        "institute": str(self.context["institute"].id),
                        "program": str(other_program.id),
                        "subject": str(other_subject.id),
                        "topic": str(other_topic.id),
                        "created_by_teacher": str(self.context["teacher"].id),
                        "question_type": "mcq_single",
                        "difficulty_level": "intermediate",
                        "question_text": "Cross-institute payload",
                        "explanation": "Should be rejected because subject is out of scope.",
                        "default_marks": "1.00",
                        "negative_marks": "0.00",
                        "is_active": True,
                        "is_verified": False,
                        "metadata": {"import_source": "bulk_csv"},
                        "options": [
                            {
                                "option_text": "A",
                                "option_order": 1,
                                "is_correct": True,
                                "is_active": True,
                            },
                            {
                                "option_text": "B",
                                "option_order": 2,
                                "is_correct": False,
                                "is_active": True,
                            },
                        ],
                        "tags": [],
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["created_count"], 0)
        self.assertEqual(response.data["failed_count"], 1)
        self.assertIn(
            "Program must belong to the selected institute.",
            response.data["failures"][0]["errors"]["detail"][0],
        )
        self.assertFalse(Question.objects.filter(question_text="Cross-institute payload").exists())
