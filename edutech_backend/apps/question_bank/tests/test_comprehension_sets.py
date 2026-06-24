from django.test import TestCase
from rest_framework.test import APIClient

from common.tests.builders import AcademicAssessmentBuilder


class QuestionPassageApiTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.teacher_user, _ = self.builder.create_teacher_account(
            institute=self.context["institute"],
            teacher_profile=self.context["teacher"],
            username="teacher-passage",
            password="Teacher@123",
            email="teacher-passage@example.com",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.teacher_user)

    def test_teacher_can_create_comprehension_set(self):
        response = self.client.post(
            "/api/v1/question-bank/passages/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "title": "Cloud foundations passage",
                "content_format": "markdown_latex",
                "passage_text": "Read the passage about AWS global infrastructure.",
                "description": "Used for foundational comprehension practice.",
                "metadata": {"is_draft": True},
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["title"], "Cloud foundations passage")
        self.assertEqual(response.data["linked_question_count"], 0)

    def test_comprehension_set_requires_program_when_subject_is_program_scoped(self):
        response = self.client.post(
            "/api/v1/question-bank/passages/",
            {
                "institute": str(self.context["institute"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "title": "Programless passage should fail",
                "content_format": "markdown_latex",
                "passage_text": "Missing program should be rejected.",
                "description": "",
                "metadata": {},
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("program", response.data)

    def test_question_can_link_to_comprehension_set(self):
        passage_response = self.client.post(
            "/api/v1/question-bank/passages/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "title": "AWS reading set",
                "content_format": "markdown_latex",
                "passage_text": "AWS allows elastic scaling based on demand.",
                "description": "",
                "metadata": {},
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(passage_response.status_code, 201)
        passage_id = passage_response.data["id"]

        create_response = self.client.post(
            "/api/v1/question-bank/questions/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "passage": passage_id,
                "passage_order": 1,
                "question_type": "mcq_single",
                "difficulty_level": "intermediate",
                "content_format": "markdown_latex",
                "question_text": "What does elastic scaling support?",
                "explanation": "Elastic scaling helps systems adapt to demand.",
                "default_marks": "1.00",
                "negative_marks": "0.00",
                "is_active": True,
                "is_verified": False,
                "metadata": {},
                "options": [
                    {
                        "content_format": "markdown_latex",
                        "option_text": "Demand-based capacity changes",
                        "option_order": 1,
                        "is_correct": True,
                        "is_active": True,
                    },
                    {
                        "content_format": "markdown_latex",
                        "option_text": "Fixed yearly billing",
                        "option_order": 2,
                        "is_correct": False,
                        "is_active": True,
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(str(create_response.data["passage"]), passage_id)
        self.assertEqual(create_response.data["passage_detail"]["title"], "AWS reading set")
        self.assertEqual(create_response.data["passage_order"], 1)

        list_response = self.client.get(
            "/api/v1/question-bank/questions/",
            {"compact": "true", "page_size": 20},
        )
        self.assertEqual(list_response.status_code, 200)
        linked_question = next(
            item for item in list_response.data["results"] if item["id"] == create_response.data["id"]
        )
        self.assertEqual(linked_question["passage_title"], "AWS reading set")

        passage_detail_response = self.client.get(f"/api/v1/question-bank/passages/{passage_id}/")
        self.assertEqual(passage_detail_response.status_code, 200)
        self.assertEqual(passage_detail_response.data["linked_question_count"], 1)
        self.assertEqual(
            passage_detail_response.data["linked_questions"][0]["question_text"],
            "What does elastic scaling support?",
        )

    def test_question_subject_must_match_comprehension_set_subject(self):
        other_subject = self.builder.create_subject(
            self.context["institute"],
            self.context["program"],
            name="Physics",
            code="PHY-01",
        )
        passage_response = self.client.post(
            "/api/v1/question-bank/passages/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(other_subject.id),
                "created_by_teacher": str(self.context["teacher"].id),
                "title": "Mismatched subject set",
                "content_format": "markdown_latex",
                "passage_text": "Passage body",
                "description": "",
                "metadata": {},
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(passage_response.status_code, 201)

        create_response = self.client.post(
            "/api/v1/question-bank/questions/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "passage": passage_response.data["id"],
                "passage_order": 1,
                "question_type": "mcq_single",
                "difficulty_level": "intermediate",
                "content_format": "markdown_latex",
                "question_text": "This should fail",
                "explanation": "Mismatch expected.",
                "default_marks": "1.00",
                "negative_marks": "0.00",
                "is_active": True,
                "is_verified": False,
                "metadata": {},
                "options": [
                    {
                        "content_format": "markdown_latex",
                        "option_text": "Option A",
                        "option_order": 1,
                        "is_correct": True,
                        "is_active": True,
                    },
                    {
                        "content_format": "markdown_latex",
                        "option_text": "Option B",
                        "option_order": 2,
                        "is_correct": False,
                        "is_active": True,
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, 400)
        self.assertIn("passage", create_response.data)

    def test_question_topic_must_match_comprehension_set_topic(self):
        other_topic = self.builder.create_topic(
            self.context["institute"],
            self.context["subject"],
            name="Geometry",
            code="GEO-01",
        )
        passage_response = self.client.post(
            "/api/v1/question-bank/passages/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(other_topic.id),
                "created_by_teacher": str(self.context["teacher"].id),
                "title": "Geometry reading set",
                "content_format": "markdown_latex",
                "passage_text": "Geometry passage body",
                "description": "",
                "metadata": {},
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(passage_response.status_code, 201)

        create_response = self.client.post(
            "/api/v1/question-bank/questions/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "passage": passage_response.data["id"],
                "passage_order": 1,
                "question_type": "mcq_single",
                "difficulty_level": "intermediate",
                "content_format": "markdown_latex",
                "question_text": "This should fail because topic does not match the set",
                "explanation": "Mismatch expected.",
                "default_marks": "1.00",
                "negative_marks": "0.00",
                "is_active": True,
                "is_verified": False,
                "metadata": {},
                "options": [
                    {
                        "content_format": "markdown_latex",
                        "option_text": "Option A",
                        "option_order": 1,
                        "is_correct": True,
                        "is_active": True,
                    },
                    {
                        "content_format": "markdown_latex",
                        "option_text": "Option B",
                        "option_order": 2,
                        "is_correct": False,
                        "is_active": True,
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, 400)
        self.assertIn("topic", create_response.data)

    def test_question_without_topic_cannot_link_to_topic_scoped_comprehension_set(self):
        passage_response = self.client.post(
            "/api/v1/question-bank/passages/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "title": "Topic-scoped set",
                "content_format": "markdown_latex",
                "passage_text": "A set with a topic.",
                "description": "",
                "metadata": {},
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(passage_response.status_code, 201)

        create_response = self.client.post(
            "/api/v1/question-bank/questions/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "passage": passage_response.data["id"],
                "passage_order": 1,
                "question_type": "mcq_single",
                "difficulty_level": "intermediate",
                "content_format": "markdown_latex",
                "question_text": "This should fail because topic is missing",
                "explanation": "Mismatch expected.",
                "default_marks": "1.00",
                "negative_marks": "0.00",
                "is_active": True,
                "is_verified": False,
                "metadata": {},
                "options": [
                    {
                        "content_format": "markdown_latex",
                        "option_text": "Option A",
                        "option_order": 1,
                        "is_correct": True,
                        "is_active": True,
                    },
                    {
                        "content_format": "markdown_latex",
                        "option_text": "Option B",
                        "option_order": 2,
                        "is_correct": False,
                        "is_active": True,
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, 400)
        self.assertIn("topic", create_response.data)

    def test_cannot_change_comprehension_mapping_after_questions_are_linked(self):
        passage_response = self.client.post(
            "/api/v1/question-bank/passages/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "title": "Locked mapping set",
                "content_format": "markdown_latex",
                "passage_text": "This mapping should become immutable after linking.",
                "description": "",
                "metadata": {},
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(passage_response.status_code, 201)

        question_response = self.client.post(
            "/api/v1/question-bank/questions/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "passage": passage_response.data["id"],
                "passage_order": 1,
                "question_type": "mcq_single",
                "difficulty_level": "intermediate",
                "content_format": "markdown_latex",
                "question_text": "Lock the set after linking",
                "explanation": "This links the comprehension set.",
                "default_marks": "1.00",
                "negative_marks": "0.00",
                "is_active": True,
                "is_verified": False,
                "metadata": {},
                "options": [
                    {
                        "content_format": "markdown_latex",
                        "option_text": "Option A",
                        "option_order": 1,
                        "is_correct": True,
                        "is_active": True,
                    },
                    {
                        "content_format": "markdown_latex",
                        "option_text": "Option B",
                        "option_order": 2,
                        "is_correct": False,
                        "is_active": True,
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(question_response.status_code, 201)

        other_topic = self.builder.create_topic(
            self.context["institute"],
            self.context["subject"],
            name="Mensuration",
            code="MEN-01",
        )
        update_response = self.client.patch(
            f"/api/v1/question-bank/passages/{passage_response.data['id']}/",
            {
                "topic": str(other_topic.id),
            },
            format="json",
        )

        self.assertEqual(update_response.status_code, 400)
        self.assertIn("topic", update_response.data)

    def test_question_requires_program_when_subject_is_program_scoped(self):
        create_response = self.client.post(
            "/api/v1/question-bank/questions/",
            {
                "institute": str(self.context["institute"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "question_type": "mcq_single",
                "difficulty_level": "intermediate",
                "content_format": "markdown_latex",
                "question_text": "This should fail without a program",
                "explanation": "Program is required for program-scoped subjects.",
                "default_marks": "1.00",
                "negative_marks": "0.00",
                "is_active": True,
                "is_verified": False,
                "metadata": {},
                "options": [
                    {
                        "content_format": "markdown_latex",
                        "option_text": "Option A",
                        "option_order": 1,
                        "is_correct": True,
                        "is_active": True,
                    },
                    {
                        "content_format": "markdown_latex",
                        "option_text": "Option B",
                        "option_order": 2,
                        "is_correct": False,
                        "is_active": True,
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, 400)
        self.assertIn("program", create_response.data)

    def test_teacher_can_create_rich_text_comprehension_set(self):
        response = self.client.post(
            "/api/v1/question-bank/passages/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "title": "Rich Text Reading Set",
                "content_format": "rich_text_html",
                "passage_text": "<h2>Shared passage</h2><p><strong>Important</strong> note.</p><script>alert(1)</script>",
                "description": '<p>Teacher <u>note</u></p><a href="javascript:alert(1)">bad</a>',
                "metadata": {"is_draft": False},
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["content_format"], "rich_text_html")
        self.assertEqual(response.data["passage_text"], "<h2>Shared passage</h2><p><strong>Important</strong> note.</p>alert(1)")
        self.assertEqual(response.data["description"], "<p>Teacher <u>note</u></p><a rel=\"noopener noreferrer\">bad</a>")

    def test_teacher_can_create_rich_text_comprehension_set_with_image(self):
        response = self.client.post(
            "/api/v1/question-bank/passages/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "title": "Image Reading Set",
                "content_format": "rich_text_html",
                "passage_text": '<p>Read the diagram.</p><figure data-align="center"><img src="https://cdn.example.com/passage.png" alt="Passage diagram" data-size="full" data-align="center" width="640"><figcaption>Passage caption</figcaption></figure><img src="javascript:alert(1)" data-align="outer-space" width="1000">',
                "description": "",
                "metadata": {"is_draft": False},
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.data["passage_text"],
            '<p>Read the diagram.</p><figure data-align="center"><img src="https://cdn.example.com/passage.png" alt="Passage diagram" data-size="full" data-align="center" width="640"><figcaption>Passage caption</figcaption></figure>',
        )
