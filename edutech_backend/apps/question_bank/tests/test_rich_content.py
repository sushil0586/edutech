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

    def test_rich_text_html_question_creation_is_sanitized(self):
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
                "content_format": "rich_text_html",
                "question_text": "<p><strong>Pick</strong> the valid answer.</p><script>alert(1)</script>",
                "explanation": '<p>Use the <em>definition</em>.</p><a href="javascript:alert(1)">bad</a>',
                "default_marks": "2.00",
                "negative_marks": "0.25",
                "is_active": True,
                "is_verified": False,
                "metadata": {},
                "options": [
                    {
                        "content_format": "rich_text_html",
                        "option_text": '<p>Safe option</p><figure data-align="center"><img src="https://cdn.example.com/option.png" alt="Option illustration" data-size="medium" data-align="center" width="360"><figcaption>Option caption</figcaption></figure><img src="javascript:alert(1)" data-size="giant" width="9999">',
                        "option_order": 1,
                        "is_correct": True,
                        "is_active": True,
                    },
                    {
                        "content_format": "rich_text_html",
                        "option_text": "<p>Other option</p>",
                        "option_order": 2,
                        "is_correct": False,
                        "is_active": True,
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["content_format"], ContentFormat.RICH_TEXT_HTML)
        self.assertEqual(response.data["question_text"], "<p><strong>Pick</strong> the valid answer.</p>alert(1)")
        self.assertEqual(response.data["explanation"], "<p>Use the <em>definition</em>.</p><a rel=\"noopener noreferrer\">bad</a>")
        self.assertEqual(response.data["options"][0]["content_format"], ContentFormat.RICH_TEXT_HTML)
        self.assertEqual(
            response.data["options"][0]["option_text"],
            '<p>Safe option</p><figure data-align="center"><img src="https://cdn.example.com/option.png" alt="Option illustration" data-size="medium" data-align="center" width="360"><figcaption>Option caption</figcaption></figure>',
        )

    def test_inline_rich_text_image_upload_returns_media_url(self):
        response = self.client.post(
            "/api/v1/question-bank/attachments/upload-inline-image/",
            {
                "file": SimpleUploadedFile("passage.png", b"fake-image-bytes", content_type="image/png"),
                "alt_text": "Passage image",
                "title": "Passage diagram",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn("/media/question-bank/rich-text/", response.data["file_url"])
        self.assertEqual(response.data["alt_text"], "Passage image")
        self.assertEqual(response.data["title"], "Passage diagram")

    def test_attachment_upload_rejects_mismatched_media_type(self):
        response = self.client.post(
            "/api/v1/question-bank/attachments/",
            {
                "question": str(self.context["question"].id),
                "file": SimpleUploadedFile("diagram.png", b"fake-image-bytes", content_type="image/png"),
                "attachment_type": AttachmentType.AUDIO,
                "title": "Wrong audio",
                "display_order": 1,
                "alt_text": "Wrong file type",
                "is_inline": False,
                "is_active": True,
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("file", response.data)

    def test_inline_rich_text_image_upload_rejects_non_image_file(self):
        response = self.client.post(
            "/api/v1/question-bank/attachments/upload-inline-image/",
            {
                "file": SimpleUploadedFile("notes.pdf", b"fake-pdf-bytes", content_type="application/pdf"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("file", response.data)
