from django.test import SimpleTestCase

from apps.question_bank.registry import (
    get_question_type_definition_payload,
    load_question_type_registry,
)


class QuestionTypeRegistryTestCase(SimpleTestCase):
    def test_loader_returns_expected_essay_manual_review_artifact_support(self):
        registry = load_question_type_registry()

        essay_definition = registry["question_types"]["essay_manual_review"]
        self.assertIn("audio_recording", essay_definition.allowed_response_artifact_types)
        self.assertIn("video", essay_definition.allowed_attachment_types)

    def test_question_type_payload_includes_nested_capabilities(self):
        payload = get_question_type_definition_payload("short_answer")

        self.assertIsNotNone(payload)
        self.assertEqual(payload["response_mode_definition"]["code"], "text")
        self.assertTrue(payload["capabilities"]["supports_audio_attachments"])
        self.assertFalse(payload["capabilities"]["supports_response_artifacts"])
