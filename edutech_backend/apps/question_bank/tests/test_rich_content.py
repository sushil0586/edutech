from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from apps.question_bank.models import (
    AttachmentType,
    ContentFormat,
    QuestionAttachment,
    QuestionOption,
)
from common.tests.builders import AcademicAssessmentBuilder


class QuestionRichContentTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.teacher_user, _ = self.builder.create_teacher_account(
            institute=self.context["institute"],
            teacher_profile=self.context["teacher"],
            username="teacher-rich",
            password="Teacher@123",
            email="teacher-rich@example.com",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.teacher_user)

    def test_markdown_latex_question_creation(self):
        response = self.client.post(
            "/api/v1/question-bank/questions/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "subject": str(self.context["subject"].id),
                "topic": str(self.context["topic"].id),
                "created_by_teacher": str(self.context["teacher"].id),
                "question_type": "mcq_single",
                "difficulty_level": "intermediate",
                "content_format": "markdown_latex",
                "question_text": "Solve \\(2x + 5 = 15\\).",
                "explanation": "Since \\(2x = 10\\), **x = 5**.",
                "default_marks": "2.00",
                "negative_marks": "0.25",
                "is_active": True,
                "is_verified": False,
                "metadata": {},
                "options": [
                    {
                        "content_format": "markdown_latex",
                        "option_text": "\\(x = 5\\)",
                        "option_order": 1,
                        "is_correct": True,
                        "is_active": True,
                    },
                    {
                        "content_format": "markdown_latex",
                        "option_text": "\\(x = 10\\)",
                        "option_order": 2,
                        "is_correct": False,
                        "is_active": True,
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["content_format"], ContentFormat.MARKDOWN_LATEX)
        self.assertEqual(response.data["options"][0]["content_format"], ContentFormat.MARKDOWN_LATEX)

    def test_attachment_serialization_exposes_rich_fields(self):
        attachment = QuestionAttachment.objects.create(
            question=self.context["question"],
            file=SimpleUploadedFile("triangle.png", b"diagram-bytes", content_type="image/png"),
            attachment_type=AttachmentType.DIAGRAM,
            title="Triangle diagram",
            display_order=2,
            alt_text="A triangle diagram for geometry question.",
            is_inline=True,
        )

        response = self.client.get(f"/api/v1/question-bank/questions/{self.context['question'].id}/")

        self.assertEqual(response.status_code, 200)
        attachments = response.data["attachments"]
        self.assertEqual(len(attachments), 1)
        payload = attachments[0]
        self.assertEqual(payload["attachment_type"], AttachmentType.DIAGRAM)
        self.assertEqual(payload["title"], attachment.title)
        self.assertEqual(payload["alt_text"], attachment.alt_text)
        self.assertEqual(payload["display_order"], attachment.display_order)
        self.assertTrue(payload["is_inline"])
        self.assertTrue(payload["file_url"])

    def test_plain_text_questions_remain_backward_compatible(self):
        option = QuestionOption.objects.create(
            question=self.context["question"],
            option_text="Plain option",
            option_order=99,
            is_correct=False,
            content_format=ContentFormat.PLAIN_TEXT,
        )
        self.context["question"].content_format = ContentFormat.PLAIN_TEXT
        self.context["question"].save(update_fields=["content_format", "updated_at"])

        response = self.client.get(f"/api/v1/question-bank/questions/{self.context['question'].id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["content_format"], ContentFormat.PLAIN_TEXT)
        option_payload = next(item for item in response.data["options"] if item["id"] == str(option.id))
        self.assertEqual(option_payload["content_format"], ContentFormat.PLAIN_TEXT)
