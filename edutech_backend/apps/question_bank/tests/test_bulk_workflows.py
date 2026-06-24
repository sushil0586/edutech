from apps.academics.models import OptionCatalogEntry
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from apps.attempts.services import save_answer, start_attempt, submit_attempt
from apps.question_bank.models import Question, QuestionPassage, QuestionTag, QuestionTagMap
from apps.question_bank.services import (
    IMPORT_PASSAGE_PREVIEW_SCHEMA_VERSION,
    IMPORT_PREVIEW_SCHEMA_VERSION,
    build_import_preview_signature,
)
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

    def test_compact_question_list_loads_for_teacher_scope(self):
        response = self.client.get(
            "/api/v1/question-bank/questions/",
            {
                "compact": "true",
                "page_size": 20,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["count"], 1)
        self.assertTrue(response.data["results"])
        self.assertEqual(
            response.data["results"][0]["question_text"],
            self.context["question"].question_text,
        )
        self.assertIn("quality_signal", response.data["results"][0])
        self.assertIn("revision_priority", response.data["results"][0])
        self.assertIn("quality_note", response.data["results"][0])

    def test_compact_question_list_supports_quality_filters(self):
        question = self.context["question"]
        self.context["exam"].status = "live"
        self.context["exam"].save(update_fields=["status", "updated_at"])
        wrong_option = question.options.filter(is_correct=False).first()
        first_attempt = start_attempt(self.context["student"], self.context["exam"])
        save_answer(
            attempt=first_attempt,
            question=question,
            selected_option=wrong_option,
            time_spent_seconds=12,
        )
        submit_attempt(first_attempt)

        second_student = self.builder.create_student(
            institute=self.context["institute"],
            academic_year=self.context["academic_year"],
            program=self.context["program"],
            cohort=self.context["cohort"],
            admission_no="QUALITY-002",
            first_name="Quality",
            last_name="Filter",
            email="quality-2@example.com",
        )
        second_attempt = start_attempt(second_student, self.context["exam"])
        save_answer(
            attempt=second_attempt,
            question=question,
            selected_option=wrong_option,
            time_spent_seconds=15,
        )
        submit_attempt(second_attempt)
        third_student = self.builder.create_student(
            institute=self.context["institute"],
            academic_year=self.context["academic_year"],
            program=self.context["program"],
            cohort=self.context["cohort"],
            admission_no="QUALITY-003",
            first_name="Quality",
            last_name="Filter Three",
            email="quality-3@example.com",
        )
        third_attempt = start_attempt(third_student, self.context["exam"])
        save_answer(
            attempt=third_attempt,
            question=question,
            selected_option=wrong_option,
            time_spent_seconds=18,
        )
        submit_attempt(third_attempt)

        response = self.client.get(
            "/api/v1/question-bank/questions/",
            {
                "compact": "true",
                "page_size": 20,
                "revision_priority": "high",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(item["id"] == str(question.id) for item in response.data["results"]))

        detail_response = self.client.get(f"/api/v1/question-bank/questions/{question.id}/")
        self.assertEqual(detail_response.status_code, 200)
        first_option = detail_response.data["options"][0]
        self.assertIn("selected_count", first_option)
        self.assertIn("selection_rate", first_option)
        self.assertIn("distractor_signal", first_option)
        self.assertIn("distractor_note", first_option)

    def test_compact_question_list_loads_for_institute_admin_scope(self):
        institute_admin_user, _ = self.builder.create_institute_admin_account(
            institute=self.context["institute"],
            username="institute-question-bank",
            password="Institute@123",
            email="institute-question-bank@example.com",
        )
        self.builder.create_question_with_options(
            self.context["institute"],
            self.context["program"],
            self.context["subject"],
            self.context["topic"],
            None,
            question_text="Institute-owned question without teacher profile",
            explanation="Created without a linked teacher.",
        )
        institute_client = APIClient()
        institute_client.force_authenticate(user=institute_admin_user)

        response = institute_client.get(
            "/api/v1/question-bank/questions/",
            {
                "compact": "true",
                "page_size": 20,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["count"], 1)
        self.assertTrue(response.data["results"])
        self.assertTrue(
            any(
                item["question_text"] == self.context["question"].question_text
                for item in response.data["results"]
            )
        )
        self.assertTrue(
            any(
                item["question_text"] == "Institute-owned question without teacher profile"
                and item["created_by_teacher_name"] == ""
                for item in response.data["results"]
            )
        )

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

    def test_question_type_registry_endpoint_returns_capability_metadata(self):
        response = self.client.get("/api/v1/question-bank/questions/type-registry/")

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["count"], 4)
        mcq_single = next(
            item for item in response.data["results"] if item["code"] == "mcq_single"
        )
        short_answer = next(
            item for item in response.data["results"] if item["code"] == "short_answer"
        )
        fill_in_blanks = next(
            item for item in response.data["results"] if item["code"] == "fill_in_blanks"
        )
        assertion_reason = next(
            item for item in response.data["results"] if item["code"] == "assertion_reason"
        )
        matrix_match = next(
            item for item in response.data["results"] if item["code"] == "matrix_match"
        )
        self.assertEqual(mcq_single["answer_mode"], "single_choice")
        self.assertEqual(mcq_single["evaluation_mode"], "auto_option_match")
        self.assertEqual(short_answer["option_source"], "none")
        self.assertFalse(short_answer["requires_manual_review"])
        self.assertEqual(assertion_reason["authoring_variant"], "assertion_reason")
        self.assertEqual(assertion_reason["delivery_variant"], "assertion_reason")
        self.assertTrue(assertion_reason["capabilities"]["supports_options"])
        self.assertTrue(mcq_single["capabilities"]["supports_options"])
        self.assertFalse(mcq_single["capabilities"]["supports_text_answer"])
        self.assertTrue(short_answer["capabilities"]["supports_text_answer"])
        self.assertTrue(short_answer["capabilities"]["supports_accepted_answers"])
        self.assertFalse(short_answer["capabilities"]["supports_review_guidance"])
        self.assertEqual(fill_in_blanks["authoring_variant"], "fill_in_blanks")
        self.assertEqual(fill_in_blanks["delivery_variant"], "fill_in_blanks")
        self.assertTrue(fill_in_blanks["capabilities"]["supports_accepted_answers"])
        self.assertEqual(matrix_match["authoring_variant"], "matrix_match")
        self.assertEqual(matrix_match["delivery_variant"], "matrix_match")
        self.assertTrue(matrix_match["capabilities"]["supports_options"])
        self.assertTrue(mcq_single["supports_attachments"])
        self.assertEqual(mcq_single["media_delivery_mode"], "optional_reference")
        self.assertEqual(mcq_single["media_preload_strategy"], "on_demand")
        self.assertIn("image", mcq_single["allowed_attachment_types"])
        self.assertIn("diagram", matrix_match["recommended_attachment_types"])
        self.assertTrue(short_answer["capabilities"]["supports_attachments"])
        self.assertTrue(short_answer["capabilities"]["supports_audio_attachments"])
        self.assertFalse(mcq_single["capabilities"]["supports_audio_attachments"])
        self.assertTrue(short_answer["capabilities"]["supports_pdf_attachments"])
        self.assertFalse(fill_in_blanks["capabilities"]["supports_video_attachments"])

    def test_question_detail_includes_question_type_definition(self):
        response = self.client.get(f"/api/v1/question-bank/questions/{self.context['question'].id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["question_type"], "mcq_single")
        self.assertEqual(response.data["question_type_definition"]["code"], "mcq_single")
        self.assertEqual(response.data["question_type_definition"]["authoring_variant"], "standard_options")
        self.assertIn("capabilities", response.data["question_type_definition"])

    def test_create_numeric_answer_question_with_tolerance(self):
        response = self.client.post(
            "/api/v1/question-bank/questions/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "question_type": "numeric_answer",
                "difficulty_level": "intermediate",
                "content_format": "markdown_latex",
                "question_text": "What is 10 divided by 4?",
                "explanation": "2.5 is the exact quotient.",
                "accepted_answers": ["2.5", "2.50"],
                "numeric_tolerance": "0.01",
                "default_marks": "1.00",
                "negative_marks": "0.25",
                "is_active": True,
                "is_verified": False,
                "metadata": {"is_draft": False},
                "options": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        question = Question.objects.get(question_text="What is 10 divided by 4?")
        self.assertEqual(question.question_type, "numeric_answer")
        self.assertEqual(question.metadata["accepted_answers"], ["2.5"])
        self.assertEqual(question.metadata["numeric_validation"]["tolerance"], "0.01")

    def test_create_fill_in_blanks_question_with_ordered_answers(self):
        response = self.client.post(
            "/api/v1/question-bank/questions/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "question_type": "fill_in_blanks",
                "difficulty_level": "intermediate",
                "content_format": "markdown_latex",
                "question_text": "Amazon [[blank]] stores data as [[blank]] in buckets.",
                "explanation": "Amazon S3 stores objects in buckets.",
                "accepted_answers": ["S3", "objects"],
                "default_marks": "1.00",
                "negative_marks": "0.25",
                "is_active": True,
                "is_verified": False,
                "metadata": {"is_draft": False},
                "options": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        question = Question.objects.get(question_text="Amazon [[blank]] stores data as [[blank]] in buckets.")
        self.assertEqual(question.question_type, "fill_in_blanks")
        self.assertEqual(question.metadata["accepted_answers"], ["S3", "objects"])
        self.assertEqual(question.metadata["fill_in_blanks"]["blank_count"], 2)

    def test_create_assertion_reason_question_with_structured_fields(self):
        response = self.client.post(
            "/api/v1/question-bank/questions/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "question_type": "assertion_reason",
                "difficulty_level": "intermediate",
                "content_format": "markdown_latex",
                "question_text": "",
                "assertion_text": "Cloud elasticity automatically adjusts capacity based on demand.",
                "reason_text": "Elasticity helps systems scale resources up or down as workload changes.",
                "explanation": "Both statements are true and the reason explains the assertion.",
                "default_marks": "1.00",
                "negative_marks": "0.25",
                "is_active": True,
                "is_verified": False,
                "metadata": {"is_draft": False},
                "options": [
                    {
                        "content_format": "markdown_latex",
                        "option_text": "Both Assertion and Reason are true, and Reason is the correct explanation of Assertion.",
                        "option_order": 1,
                        "is_correct": True,
                        "is_active": True,
                    },
                    {
                        "content_format": "markdown_latex",
                        "option_text": "Both Assertion and Reason are true, but Reason is not the correct explanation of Assertion.",
                        "option_order": 2,
                        "is_correct": False,
                        "is_active": True,
                    },
                    {
                        "content_format": "markdown_latex",
                        "option_text": "Assertion is true, but Reason is false.",
                        "option_order": 3,
                        "is_correct": False,
                        "is_active": True,
                    },
                    {
                        "content_format": "markdown_latex",
                        "option_text": "Assertion is false, but Reason is true.",
                        "option_order": 4,
                        "is_correct": False,
                        "is_active": True,
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        question = Question.objects.get(id=response.data["id"])
        self.assertEqual(question.question_type, "assertion_reason")
        self.assertEqual(
            question.metadata["assertion_reason"]["assertion_text"],
            "Cloud elasticity automatically adjusts capacity based on demand.",
        )
        self.assertEqual(
            question.metadata["assertion_reason"]["reason_text"],
            "Elasticity helps systems scale resources up or down as workload changes.",
        )

    def test_create_matrix_match_question_with_structured_columns(self):
        response = self.client.post(
            "/api/v1/question-bank/questions/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "question_type": "matrix_match",
                "difficulty_level": "intermediate",
                "content_format": "markdown_latex",
                "question_text": "Match the services with their descriptions.",
                "matrix_left_items": ["S3", "EC2", "RDS"],
                "matrix_right_items": ["Object storage", "Virtual machine", "Managed relational database"],
                "explanation": "Each service maps to its platform role.",
                "default_marks": "1.00",
                "negative_marks": "0.25",
                "is_active": True,
                "is_verified": False,
                "metadata": {"is_draft": False},
                "options": [
                    {
                        "content_format": "markdown_latex",
                        "option_text": "A-1, B-2, C-3",
                        "option_order": 1,
                        "is_correct": True,
                        "is_active": True,
                    },
                    {
                        "content_format": "markdown_latex",
                        "option_text": "A-2, B-1, C-3",
                        "option_order": 2,
                        "is_correct": False,
                        "is_active": True,
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        question = Question.objects.get(id=response.data["id"])
        self.assertEqual(question.question_type, "matrix_match")
        self.assertEqual(question.metadata["matrix_match"]["left_items"], ["S3", "EC2", "RDS"])
        self.assertEqual(
            question.metadata["matrix_match"]["right_items"],
            ["Object storage", "Virtual machine", "Managed relational database"],
        )

    def test_create_essay_manual_review_question_with_review_guidance(self):
        response = self.client.post(
            "/api/v1/question-bank/questions/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "question_type": "essay_manual_review",
                "difficulty_level": "advanced",
                "content_format": "markdown_latex",
                "question_text": "Explain the shared responsibility model in cloud security.",
                "explanation": "Answers should cover provider and customer responsibilities clearly.",
                "review_guidance": "Check accuracy, coverage, structure, and real examples.",
                "default_marks": "5.00",
                "negative_marks": "0.00",
                "is_active": True,
                "is_verified": False,
                "metadata": {"is_draft": False},
                "options": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        question = Question.objects.get(question_text="Explain the shared responsibility model in cloud security.")
        self.assertEqual(question.question_type, "essay_manual_review")
        self.assertEqual(question.metadata["review_guidance"], "Check accuracy, coverage, structure, and real examples.")

    def test_create_essay_manual_review_question_with_rubric_criteria(self):
        response = self.client.post(
            "/api/v1/question-bank/questions/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "question_type": "essay_manual_review",
                "difficulty_level": "advanced",
                "content_format": "markdown_latex",
                "question_text": "Explain cloud resilience with an example.",
                "explanation": "Review for correctness, clarity, and practical example quality.",
                "review_guidance": "Use the rubric to score this answer consistently.",
                "rubric_criteria": [
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
                        "reviewer_hint": "Reward structure and easy-to-follow wording.",
                    },
                    {
                        "key": "example",
                        "label": "Example quality",
                        "max_score": "1.00",
                        "display_order": 3,
                        "reviewer_hint": "Look for a relevant resilience example.",
                    },
                ],
                "default_marks": "5.00",
                "negative_marks": "0.00",
                "is_active": True,
                "is_verified": False,
                "metadata": {"is_draft": False},
                "options": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        question = Question.objects.get(question_text="Explain cloud resilience with an example.")
        self.assertEqual(question.metadata["rubric"]["mode"], "criterion_scores")
        self.assertEqual(len(question.metadata["rubric"]["criteria"]), 3)
        self.assertEqual(question.metadata["rubric"]["criteria"][0]["key"], "accuracy")
        self.assertEqual(response.data["rubric_criteria"][1]["label"], "Clarity")

    def test_assessment_registry_endpoint_returns_response_and_evaluation_modes(self):
        response = self.client.get("/api/v1/question-bank/questions/assessment-registry/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            any(item["code"] == "single_choice" for item in response.data["response_modes"])
        )
        self.assertTrue(
            any(item["code"] == "auto_option_match" for item in response.data["evaluation_modes"])
        )
        question_type = next(
            item for item in response.data["question_types"] if item["code"] == "mcq_single"
        )
        self.assertEqual(question_type["response_mode_definition"]["code"], "single_choice")
        self.assertEqual(question_type["evaluation_mode_definition"]["code"], "auto_option_match")

    def test_import_template_preview_and_finalize_workflow(self):
        template_response = self.client.get("/api/v1/question-bank/questions/import-template/")
        self.assertEqual(template_response.status_code, 200)
        self.assertIn("csv_content", template_response.data)

        csv_content = (
            "subject,topic,question_type,difficulty_level,question_text,option_1,option_2,option_3,option_4,"
            "correct_answer,accepted_answers,numeric_tolerance,review_guidance,default_marks,negative_marks,explanation,tags\n"
            "Mathematics,Algebra,mcq_single,intermediate,What is 5 + 5?,8,10,12,,2,,,,1.00,0.00,"
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
                "preview_schema_version": preview_response.data["preview_schema_version"],
                "preview_signature": preview_response.data["preview_signature"],
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
            "correct_answer,accepted_answers,numeric_tolerance,review_guidance,default_marks,negative_marks,explanation,tags\n"
            "Mathematics,Algebra,mcq_single,advanced,,,,,1,,,,1.00,0.00,,\n"
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

    def test_preview_import_rejects_subject_without_program_mapping(self):
        unscoped_subject = self.builder.create_subject(
            self.context["institute"],
            None,
            name="Unmapped Subject",
            code="UNMAP-01",
        )
        self.builder.create_topic(
            self.context["institute"],
            unscoped_subject,
            name="Loose Topic",
            code="LOOSE-01",
        )

        csv_content = (
            "subject,topic,question_type,difficulty_level,question_text,option_1,option_2,option_3,option_4,"
            "correct_answer,accepted_answers,numeric_tolerance,review_guidance,default_marks,negative_marks,explanation,tags\n"
            "Unmapped Subject,Loose Topic,mcq_single,intermediate,What is unmapped?,Yes,No,,,1,,,,1.00,0.00,"
            "This row should fail because the subject has no program.,foundation\n"
        )
        response = self.client.post(
            "/api/v1/question-bank/questions/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="missing-program.csv"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["valid_rows"], 0)
        self.assertEqual(response.data["invalid_rows"], 1)
        self.assertIn("program", response.data["rows"][0]["error_map"])

    def test_preview_import_accepts_question_linked_to_existing_comprehension_set(self):
        passage = QuestionPassage.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            title="Algebra Reading Set",
            content_format="markdown_latex",
            passage_text="Shared algebra passage.",
            description="",
        )

        csv_content = (
            "subject,topic,passage_title,passage_order,question_type,difficulty_level,question_text,option_1,option_2,option_3,option_4,"
            "correct_answer,accepted_answers,numeric_tolerance,review_guidance,default_marks,negative_marks,explanation,tags\n"
            "Mathematics,Algebra,Algebra Reading Set,1,mcq_single,intermediate,What does the passage focus on?,Geometry,Algebra,Calculus,,2,,,,1.00,0.00,"
            "The passage is about algebra.,comprehension|algebra\n"
        )
        preview_response = self.client.post(
            "/api/v1/question-bank/questions/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="linked-comprehension.csv"),
            },
            format="multipart",
        )

        self.assertEqual(preview_response.status_code, 200)
        self.assertEqual(preview_response.data["valid_rows"], 1)
        payload = preview_response.data["valid_payloads"][0]
        self.assertEqual(payload["passage"], str(passage.id))
        self.assertEqual(payload["passage_order"], 1)

        finalize_response = self.client.post(
            "/api/v1/question-bank/questions/finalize-import/",
            {
                "institute": str(self.context["institute"].id),
                "preview_schema_version": preview_response.data["preview_schema_version"],
                "preview_signature": preview_response.data["preview_signature"],
                "preview_rows": preview_response.data["rows"],
                "valid_payloads": preview_response.data["valid_payloads"],
            },
            format="json",
        )
        self.assertEqual(finalize_response.status_code, 201)
        question = Question.objects.get(question_text="What does the passage focus on?")
        self.assertEqual(question.passage_id, passage.id)
        self.assertEqual(question.passage_order, 1)

    def test_preview_import_rejects_unknown_comprehension_set_title(self):
        csv_content = (
            "subject,topic,passage_title,passage_order,question_type,difficulty_level,question_text,option_1,option_2,option_3,option_4,"
            "correct_answer,accepted_answers,numeric_tolerance,review_guidance,default_marks,negative_marks,explanation,tags\n"
            "Mathematics,Algebra,Missing Passage,1,mcq_single,intermediate,Which topic is mentioned?,Geometry,Algebra,Calculus,,2,,,,1.00,0.00,"
            "The row should fail without an imported passage.,comprehension|algebra\n"
        )
        response = self.client.post(
            "/api/v1/question-bank/questions/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="missing-passage.csv"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["valid_rows"], 0)
        self.assertIn("passage_title", response.data["rows"][0]["error_map"])

    def test_preview_import_rejects_duplicate_question_text_within_same_file(self):
        csv_content = (
            "subject,topic,question_type,difficulty_level,question_text,option_1,option_2,option_3,option_4,"
            "correct_answer,accepted_answers,numeric_tolerance,review_guidance,default_marks,negative_marks,explanation,tags\n"
            "Mathematics,Algebra,mcq_single,intermediate,Duplicate import question?,8,10,12,,2,,,,1.00,0.00,First row,algebra\n"
            "Mathematics,Algebra,mcq_single,intermediate,Duplicate import question?,8,10,12,,2,,,,1.00,0.00,Second row,algebra\n"
        )
        response = self.client.post(
            "/api/v1/question-bank/questions/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="duplicate-question-file.csv"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["valid_rows"], 1)
        self.assertEqual(response.data["invalid_rows"], 1)
        self.assertIn("question_text", response.data["rows"][1]["error_map"])

    def test_preview_import_rejects_duplicate_question_against_existing_bank(self):
        csv_content = (
            "subject,topic,question_type,difficulty_level,question_text,option_1,option_2,option_3,option_4,"
            "correct_answer,accepted_answers,numeric_tolerance,review_guidance,default_marks,negative_marks,explanation,tags\n"
            f"Mathematics,Algebra,mcq_single,intermediate,{self.context['question'].question_text},8,10,12,,2,,,,1.00,0.00,Existing duplicate,algebra\n"
        )
        response = self.client.post(
            "/api/v1/question-bank/questions/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="duplicate-question-existing.csv"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["valid_rows"], 0)
        self.assertEqual(response.data["invalid_rows"], 1)
        self.assertIn("question_text", response.data["rows"][0]["error_map"])

    def test_preview_import_rejects_duplicate_passage_order_within_same_set(self):
        passage = QuestionPassage.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            title="Duplicate order set",
            content_format="markdown_latex",
            passage_text="A shared comprehension set.",
            description="",
        )
        csv_content = (
            "subject,topic,passage_title,passage_order,question_type,difficulty_level,question_text,option_1,option_2,option_3,option_4,"
            "correct_answer,accepted_answers,numeric_tolerance,review_guidance,default_marks,negative_marks,explanation,tags\n"
            f"Mathematics,Algebra,{passage.title},1,mcq_single,intermediate,First linked question?,A,B,C,,1,,,,1.00,0.00,First row,comprehension\n"
            f"Mathematics,Algebra,{passage.title},1,mcq_single,intermediate,Second linked question?,A,B,C,,1,,,,1.00,0.00,Second row,comprehension\n"
        )
        response = self.client.post(
            "/api/v1/question-bank/questions/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="duplicate-passage-order.csv"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["valid_rows"], 1)
        self.assertEqual(response.data["invalid_rows"], 1)
        self.assertIn("passage_order", response.data["rows"][1]["error_map"])

    def test_preview_import_accepts_numeric_answer_with_accepted_answers_and_tolerance(self):
        csv_content = (
            "subject,topic,question_type,difficulty_level,question_text,option_1,option_2,option_3,option_4,"
            "correct_answer,accepted_answers,numeric_tolerance,review_guidance,default_marks,negative_marks,explanation,tags\n"
            "Mathematics,Algebra,numeric_answer,intermediate,What is 10 divided by 4?,,,,,,2.5|2.50,0.01,,1.00,0.00,"
            "2.5 is the exact quotient.,numeric|foundation\n"
        )
        response = self.client.post(
            "/api/v1/question-bank/questions/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="numeric-import.csv"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["valid_rows"], 1)
        self.assertEqual(response.data["invalid_rows"], 0)
        payload = response.data["valid_payloads"][0]
        self.assertEqual(payload["metadata"]["accepted_answers"], ["2.5"])
        self.assertEqual(payload["metadata"]["numeric_validation"]["tolerance"], "0.01")

    def test_preview_import_accepts_fill_in_blanks_with_ordered_answers(self):
        csv_content = (
            "subject,topic,question_type,difficulty_level,question_text,option_1,option_2,option_3,option_4,"
            "correct_answer,accepted_answers,numeric_tolerance,review_guidance,default_marks,negative_marks,explanation,tags\n"
            "Mathematics,Algebra,fill_in_blanks,intermediate,2 + 2 = [[blank]] and 3 + 3 = [[blank]],,,,,,4|6,,,1.00,0.00,"
            "Two ordered blanks are expected.,fill-in-the-blanks|foundation\n"
        )
        response = self.client.post(
            "/api/v1/question-bank/questions/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="fill-in-blanks-import.csv"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["valid_rows"], 1)
        payload = response.data["valid_payloads"][0]
        self.assertEqual(payload["metadata"]["accepted_answers"], ["4", "6"])
        self.assertEqual(payload["metadata"]["fill_in_blanks"]["blank_count"], 2)

    def test_preview_import_accepts_assertion_reason_with_structured_fields(self):
        csv_content = (
            "subject,topic,question_type,difficulty_level,question_text,assertion_text,reason_text,option_1,option_2,option_3,option_4,"
            "correct_answer,accepted_answers,numeric_tolerance,review_guidance,default_marks,negative_marks,explanation,tags\n"
            "Mathematics,Algebra,assertion_reason,intermediate,Choose the correct relationship between the assertion and the reason.,"
            "A square has four equal sides.,A square is a rectangle with all sides equal.,,,,,1,,,,"
            "1.00,0.00,The reason correctly explains the assertion.,geometry\n"
        )

        response = self.client.post(
            "/api/v1/question-bank/questions/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="assertion-reason-import.csv"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["valid_rows"], 1)
        payload = response.data["valid_payloads"][0]
        self.assertEqual(payload["question_type"], "assertion_reason")
        self.assertEqual(payload["metadata"]["assertion_reason"]["assertion_text"], "A square has four equal sides.")
        self.assertEqual(payload["metadata"]["assertion_reason"]["reason_text"], "A square is a rectangle with all sides equal.")
        self.assertEqual(len(payload["options"]), 4)

    def test_preview_import_accepts_matrix_match_with_structured_columns(self):
        csv_content = (
            "subject,topic,question_type,difficulty_level,question_text,assertion_text,reason_text,matrix_left_items,matrix_right_items,option_1,option_2,option_3,option_4,"
            "correct_answer,accepted_answers,numeric_tolerance,review_guidance,default_marks,negative_marks,explanation,tags\n"
            "Mathematics,Algebra,matrix_match,intermediate,Match the items in Column I and Column II.,,,A|B|C,1|2|3,"
            "A-1 B-2 C-3,A-2 B-1 C-3,A-3 B-2 C-1,,1,,,,1.00,0.00,Use the matching map.,matrix\n"
        )

        response = self.client.post(
            "/api/v1/question-bank/questions/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="matrix-match-import.csv"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["valid_rows"], 1)
        payload = response.data["valid_payloads"][0]
        self.assertEqual(payload["question_type"], "matrix_match")
        self.assertEqual(payload["metadata"]["matrix_match"]["left_items"], ["A", "B", "C"])
        self.assertEqual(payload["metadata"]["matrix_match"]["right_items"], ["1", "2", "3"])
        self.assertEqual(len(payload["options"]), 3)

    def test_preview_import_rejects_fill_in_blanks_when_answer_count_does_not_match_markers(self):
        csv_content = (
            "subject,topic,question_type,difficulty_level,question_text,option_1,option_2,option_3,option_4,"
            "correct_answer,accepted_answers,numeric_tolerance,review_guidance,default_marks,negative_marks,explanation,tags\n"
            "Mathematics,Algebra,fill_in_blanks,intermediate,2 + 2 = [[blank]] and 3 + 3 = [[blank]],,,,,,4,,,1.00,0.00,"
            "Only one accepted answer is provided for two blanks.,fill-in-the-blanks|foundation\n"
        )
        response = self.client.post(
            "/api/v1/question-bank/questions/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="invalid-fill-in-blanks.csv"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["valid_rows"], 0)
        self.assertIn("accepted_answers", response.data["rows"][0]["error_map"])

    def test_preview_import_rejects_numeric_tolerance_for_non_numeric_row(self):
        csv_content = (
            "subject,topic,question_type,difficulty_level,question_text,option_1,option_2,option_3,option_4,"
            "correct_answer,accepted_answers,numeric_tolerance,review_guidance,default_marks,negative_marks,explanation,tags\n"
            "Mathematics,Algebra,short_answer,intermediate,Name the value of pi approximately.,,,,,,3.14,0.01,,1.00,0.00,"
            "3.14 is a common approximation.,numeric|foundation\n"
        )
        response = self.client.post(
            "/api/v1/question-bank/questions/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="invalid-short-answer.csv"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["valid_rows"], 0)
        self.assertIn("numeric_tolerance", response.data["rows"][0]["error_map"])

    def test_preview_import_accepts_essay_manual_review_with_review_guidance(self):
        csv_content = (
            "subject,topic,question_type,difficulty_level,question_text,option_1,option_2,option_3,option_4,"
            "correct_answer,accepted_answers,numeric_tolerance,review_guidance,default_marks,negative_marks,explanation,tags\n"
            "Mathematics,Algebra,essay_manual_review,advanced,Explain how algebra is used in everyday budgeting.,,,,,,,,"
            "\"Check clarity, examples, and whether the student explains variable-based reasoning.\",5.00,0.00,"
            "Answers should connect algebra to real-life planning.,writing|foundation\n"
        )
        response = self.client.post(
            "/api/v1/question-bank/questions/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="essay-review.csv"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["valid_rows"], 1)
        payload = response.data["valid_payloads"][0]
        self.assertEqual(
            payload["metadata"]["review_guidance"],
            "Check clarity, examples, and whether the student explains variable-based reasoning.",
        )

    def test_preview_import_rejects_accepted_answers_for_essay_manual_review(self):
        csv_content = (
            "subject,topic,question_type,difficulty_level,question_text,option_1,option_2,option_3,option_4,"
            "correct_answer,accepted_answers,numeric_tolerance,review_guidance,default_marks,negative_marks,explanation,tags\n"
            "Mathematics,Algebra,essay_manual_review,advanced,Explain your reasoning.,,,,,,sample answer,,Review for structure.,5.00,0.00,"
            "Essay rows should not carry accepted answers.,writing|foundation\n"
        )
        response = self.client.post(
            "/api/v1/question-bank/questions/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="invalid-essay-review.csv"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["valid_rows"], 0)
        self.assertIn("accepted_answers", response.data["rows"][0]["error_map"])

    def test_preview_import_rejects_inactive_catalog_difficulty(self):
        OptionCatalogEntry.objects.filter(
            namespace="question_difficulty",
            code="advanced",
        ).update(is_active=False, is_default=False)

        csv_content = (
            "subject,topic,question_type,difficulty_level,question_text,option_1,option_2,option_3,option_4,"
            "correct_answer,accepted_answers,numeric_tolerance,review_guidance,default_marks,negative_marks,explanation,tags\n"
            "Mathematics,Algebra,mcq_single,advanced,What is 8 + 2?,8,10,11,,2,,,,1.00,0.00,"
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

    def test_question_passage_import_template_preview_and_finalize_workflow(self):
        template_response = self.client.get("/api/v1/question-bank/passages/import-template/")
        self.assertEqual(template_response.status_code, 200)
        self.assertIn("csv_content", template_response.data)

        csv_content = (
            "subject,topic,title,content_format,passage_text,description\n"
            "Mathematics,Algebra,Equation Reading Set,markdown_latex,"
            "\"Equations help represent unknown values using symbols.\","
            "\"Use this set for foundational algebra comprehension.\"\n"
        )
        preview_response = self.client.post(
            "/api/v1/question-bank/passages/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="passage_import.csv"),
            },
            format="multipart",
        )
        self.assertEqual(preview_response.status_code, 200)
        self.assertEqual(preview_response.data["valid_rows"], 1)
        self.assertEqual(preview_response.data["invalid_rows"], 0)

        before_count = QuestionPassage.objects.count()
        finalize_response = self.client.post(
            "/api/v1/question-bank/passages/finalize-import/",
            {
                "institute": str(self.context["institute"].id),
                "preview_schema_version": preview_response.data["preview_schema_version"],
                "preview_signature": preview_response.data["preview_signature"],
                "preview_rows": preview_response.data["rows"],
                "valid_payloads": preview_response.data["valid_payloads"],
            },
            format="json",
        )
        self.assertEqual(finalize_response.status_code, 201)
        self.assertEqual(finalize_response.data["created_count"], 1)
        self.assertEqual(QuestionPassage.objects.count(), before_count + 1)

        imported_passage = QuestionPassage.objects.get(title="Equation Reading Set")
        self.assertEqual(imported_passage.subject_id, self.context["subject"].id)
        self.assertEqual(imported_passage.topic_id, self.context["topic"].id)

    def test_question_passage_preview_import_returns_row_level_validation_errors(self):
        csv_content = (
            "subject,topic,title,content_format,passage_text,description\n"
            "Mathematics,Algebra,,markdown_latex,,\n"
        )
        response = self.client.post(
            "/api/v1/question-bank/passages/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="invalid_passage_import.csv"),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["valid_rows"], 0)
        self.assertEqual(response.data["invalid_rows"], 1)
        self.assertEqual(response.data["rows"][0]["status"], "invalid")
        self.assertIn("title", response.data["rows"][0]["error_map"])

    def test_question_passage_preview_import_rejects_duplicate_titles_in_same_file(self):
        csv_content = (
            "subject,topic,title,content_format,passage_text,description\n"
            "Mathematics,Algebra,Shared Set,markdown_latex,First body,First description\n"
            "Mathematics,Algebra,Shared Set,markdown_latex,Second body,Second description\n"
        )
        response = self.client.post(
            "/api/v1/question-bank/passages/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="duplicate-passage-title-file.csv"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["valid_rows"], 1)
        self.assertEqual(response.data["invalid_rows"], 1)
        self.assertIn("title", response.data["rows"][1]["error_map"])

    def test_question_passage_preview_import_rejects_duplicate_title_against_existing_set(self):
        QuestionPassage.objects.create(
            institute=self.context["institute"],
            program=self.context["program"],
            subject=self.context["subject"],
            topic=self.context["topic"],
            created_by_teacher=self.context["teacher"],
            title="Existing Shared Set",
            content_format="markdown_latex",
            passage_text="Existing passage body",
            description="",
        )
        csv_content = (
            "subject,topic,title,content_format,passage_text,description\n"
            "Mathematics,Algebra,Existing Shared Set,markdown_latex,Duplicate body,Duplicate description\n"
        )
        response = self.client.post(
            "/api/v1/question-bank/passages/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(csv_content, name="duplicate-passage-title-existing.csv"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["valid_rows"], 0)
        self.assertEqual(response.data["invalid_rows"], 1)
        self.assertIn("title", response.data["rows"][0]["error_map"])

    def test_question_passage_finalize_rejects_outdated_preview_signature(self):
        preview_rows = [
            {
                "row_number": 2,
                "status": "valid",
                "is_valid": True,
                "title": "Security Reading Set",
                "subject_code": "Mathematics",
                "subject_name": "Mathematics",
                "topic_code": "Algebra",
                "topic_name": "Algebra",
                "content_format": "markdown_latex",
                "errors": [],
                "error_fields": [],
                "expectations": ["Provide one shared set title plus the full passage text."],
            }
        ]
        valid_payloads = [
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "title": "Security Reading Set",
                "content_format": "markdown_latex",
                "passage_text": "Shared passage content.",
                "description": "",
                "metadata": {"import_source": "bulk_csv_passage"},
                "is_active": True,
            }
        ]
        response = self.client.post(
            "/api/v1/question-bank/passages/finalize-import/",
            {
                "institute": str(self.context["institute"].id),
                "preview_schema_version": IMPORT_PASSAGE_PREVIEW_SCHEMA_VERSION,
                "preview_signature": "stale-signature",
                "preview_rows": preview_rows,
                "valid_payloads": valid_payloads,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("preview_signature", response.data)

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

        preview_rows = [
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
        ]
        valid_payloads = [
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
        ]

        response = self.client.post(
            "/api/v1/question-bank/questions/finalize-import/",
            {
                "institute": str(self.context["institute"].id),
                "preview_schema_version": IMPORT_PREVIEW_SCHEMA_VERSION,
                "preview_signature": build_import_preview_signature(
                    rows=preview_rows,
                    valid_payloads=valid_payloads,
                    schema_version=IMPORT_PREVIEW_SCHEMA_VERSION,
                ),
                "preview_rows": preview_rows,
                "valid_payloads": valid_payloads,
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

    def test_finalize_import_rejects_tampered_preview_payload(self):
        preview_response = self.client.post(
            "/api/v1/question-bank/questions/preview-import/",
            {
                "institute": str(self.context["institute"].id),
                "file": self._csv_file(
                    "subject,topic,question_type,difficulty_level,question_text,option_1,option_2,option_3,option_4,"
                    "correct_answer,accepted_answers,numeric_tolerance,review_guidance,default_marks,negative_marks,explanation,tags\n"
                    "Mathematics,Algebra,mcq_single,intermediate,Original question,Yes,No,,,1,,,,1.00,0.00,"
                    "Original explanation,foundation\n"
                ),
            },
            format="multipart",
        )
        self.assertEqual(preview_response.status_code, 200)

        tampered_payloads = [*preview_response.data["valid_payloads"]]
        tampered_payloads[0] = {
            **tampered_payloads[0],
            "question_text": "Tampered question text",
        }

        finalize_response = self.client.post(
            "/api/v1/question-bank/questions/finalize-import/",
            {
                "institute": str(self.context["institute"].id),
                "preview_schema_version": preview_response.data["preview_schema_version"],
                "preview_signature": preview_response.data["preview_signature"],
                "preview_rows": preview_response.data["rows"],
                "valid_payloads": tampered_payloads,
            },
            format="json",
        )

        self.assertEqual(finalize_response.status_code, 400)
        self.assertIn("preview_signature", finalize_response.data)
        self.assertFalse(Question.objects.filter(question_text="Tampered question text").exists())
