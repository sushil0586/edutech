from rest_framework.test import APIClient, APITestCase

from apps.exams.models import AdvancedExamTemplate
from common.tests.builders import AcademicAssessmentBuilder


class AdvancedExamTemplateApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.teacher = self.context["teacher"]
        self.teacher_user, _ = self.builder.create_teacher_account(
            self.context["institute"],
            self.teacher,
            username="template-teacher",
        )
        self.other_teacher = self.builder.create_teacher(
            institute=self.context["institute"],
            employee_code="TCH999",
            first_name="Other",
            last_name="Teacher",
            email="other-template-teacher@example.com",
        )
        self.other_teacher_user, _ = self.builder.create_teacher_account(
            self.context["institute"],
            self.other_teacher,
            username="template-teacher-other",
        )
        self.admin_user, _ = self.builder.create_institute_admin_account(
            self.context["institute"],
            username="template-admin",
        )

    def _payload(self, *, name="Weekly Math Mock"):
        return {
            "name": name,
            "description": "Shared institute blueprint",
            "audience_context": "teacher",
            "blueprint": {
                "exam": {
                    "title": "Weekly Math Mock",
                    "code": "WEEKLY-MATH-01",
                    "description": "Reusable weekly blueprint",
                    "examType": "mock_exam",
                    "deliveryMode": "online",
                    "status": "draft",
                    "sourceType": "teacher",
                    "durationMinutes": "60",
                    "passingMarks": "0.00",
                    "startAt": "",
                    "endAt": "",
                    "instructions": "",
                },
                "delivery": {
                    "timerMode": "global",
                    "navigationMode": "free_exam",
                    "attemptPolicy": "single",
                    "resultPublishMode": "after_review",
                    "reviewMode": "attempted_only",
                    "securityMode": "normal",
                    "assignmentMode": "scope",
                    "maxAttempts": "1",
                    "randomizeQuestions": True,
                    "randomizeOptions": True,
                    "allowLateSubmit": False,
                    "showResultImmediately": False,
                    "allowReviewAfterSubmit": True,
                    "allowResume": True,
                    "allowSectionSwitching": True,
                    "allowReturnToPreviousSection": True,
                    "resultPublishAt": "",
                    "reviewAvailableFrom": "",
                    "reviewAvailableUntil": "",
                },
                "economy": {
                    "policyType": "free",
                    "starCost": "0",
                    "entitlementCode": "",
                    "priority": "100",
                    "unlockRuleType": "",
                    "requiredStarBalance": "",
                    "requiredEntitlementCode": "",
                    "requiredCompletionCount": "",
                    "requiredScorePercentage": "",
                    "unlockPriority": "100",
                    "adminOverrideAllowed": True,
                },
                "selectionMode": "strict",
                "sections": [
                    {
                        "name": "Section A",
                        "order": 1,
                        "description": "",
                        "instructions": "",
                        "questionCount": 10,
                        "marksPerQuestion": "1.00",
                        "negativeMarksPerQuestion": "0.00",
                        "timerEnabled": False,
                        "durationMinutes": "",
                        "allowSkipSection": True,
                        "lockAfterSubmit": False,
                        "difficultyMix": {
                            "foundation": 30,
                            "intermediate": 50,
                            "advanced": 20,
                        },
                        "topics": [
                            {"topicCode": "ALG-01", "count": 10},
                        ],
                    }
                ],
            },
        }

    def test_teacher_can_upsert_shared_template(self):
        self.client.force_authenticate(user=self.teacher_user)

        response = self.client.post(
            "/api/v1/exams/advanced-templates/",
            self._payload(),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(AdvancedExamTemplate.objects.count(), 1)
        template = AdvancedExamTemplate.objects.get()
        self.assertEqual(template.name, "Weekly Math Mock")
        self.assertEqual(template.created_by_teacher_id, self.teacher.id)

        response = self.client.post(
            "/api/v1/exams/advanced-templates/",
            self._payload(name="Weekly Math Mock"),
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(AdvancedExamTemplate.objects.count(), 1)

    def test_institute_admin_can_list_templates(self):
        AdvancedExamTemplate.objects.create(
            institute=self.context["institute"],
            created_by_teacher=self.teacher,
            name="Institute Shared Template",
            audience_context="institute",
            blueprint=self._payload()["blueprint"],
        )
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get("/api/v1/exams/advanced-templates/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Institute Shared Template")

    def test_teacher_can_delete_template_in_scope(self):
        template = AdvancedExamTemplate.objects.create(
            institute=self.context["institute"],
            created_by_teacher=self.teacher,
            name="Delete Me",
            audience_context="teacher",
            blueprint=self._payload()["blueprint"],
        )
        self.client.force_authenticate(user=self.teacher_user)

        response = self.client.delete(f"/api/v1/exams/advanced-templates/{template.id}/")

        self.assertEqual(response.status_code, 200)
        template.refresh_from_db()
        self.assertFalse(template.is_active)

    def test_teacher_can_only_see_own_personal_templates_and_institute_templates(self):
        AdvancedExamTemplate.objects.create(
            institute=self.context["institute"],
            created_by_teacher=self.teacher,
            name="My Personal Template",
            audience_context="teacher",
            blueprint=self._payload()["blueprint"],
        )
        AdvancedExamTemplate.objects.create(
            institute=self.context["institute"],
            created_by_teacher=self.other_teacher,
            name="Other Teacher Personal Template",
            audience_context="teacher",
            blueprint=self._payload()["blueprint"],
        )
        AdvancedExamTemplate.objects.create(
            institute=self.context["institute"],
            name="Institute Template",
            audience_context="institute",
            blueprint=self._payload()["blueprint"],
        )
        self.client.force_authenticate(user=self.teacher_user)

        response = self.client.get("/api/v1/exams/advanced-templates/")

        self.assertEqual(response.status_code, 200)
        names = {item["name"] for item in response.data["results"]}
        self.assertEqual(names, {"My Personal Template", "Institute Template"})

    def test_teacher_cannot_create_institute_template(self):
        self.client.force_authenticate(user=self.teacher_user)
        payload = self._payload(name="Institute Shared Attempt")
        payload["audience_context"] = "institute"

        response = self.client.post("/api/v1/exams/advanced-templates/", payload, format="json")

        self.assertEqual(response.status_code, 403)
        self.assertFalse(
            AdvancedExamTemplate.objects.filter(name="Institute Shared Attempt").exists()
        )

    def test_teacher_cannot_delete_institute_template(self):
        template = AdvancedExamTemplate.objects.create(
            institute=self.context["institute"],
            name="Locked Institute Template",
            audience_context="institute",
            blueprint=self._payload()["blueprint"],
        )
        self.client.force_authenticate(user=self.teacher_user)

        response = self.client.delete(f"/api/v1/exams/advanced-templates/{template.id}/")

        self.assertEqual(response.status_code, 403)
        template.refresh_from_db()
        self.assertTrue(template.is_active)

    def test_institute_admin_cannot_delete_teacher_personal_template(self):
        template = AdvancedExamTemplate.objects.create(
            institute=self.context["institute"],
            created_by_teacher=self.teacher,
            name="Locked Teacher Template",
            audience_context="teacher",
            blueprint=self._payload()["blueprint"],
        )
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.delete(f"/api/v1/exams/advanced-templates/{template.id}/")

        self.assertEqual(response.status_code, 404)
        template.refresh_from_db()
        self.assertTrue(template.is_active)
