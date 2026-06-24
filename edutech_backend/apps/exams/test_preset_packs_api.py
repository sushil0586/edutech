from rest_framework.test import APIClient, APITestCase

from apps.exams.models import ExamPresetPack, ExamPresetPackScope
from common.tests.builders import AcademicAssessmentBuilder


class ExamPresetPackApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.teacher = self.context["teacher"]
        self.teacher_user, _ = self.builder.create_teacher_account(
            self.context["institute"],
            self.teacher,
            username="preset-pack-teacher",
        )
        self.admin_user, _ = self.builder.create_institute_admin_account(
            self.context["institute"],
            username="preset-pack-admin",
        )

    def _payload(self, *, code="ielts_academic_custom", scope_type="institute"):
        return {
            "scope_type": scope_type,
            "code": code,
            "label": "IELTS Academic Custom",
            "family": "Study Abroad",
            "note": "Institute-customized language test pack.",
            "chip": "Language test",
            "config": {
                "selectionMode": "strict",
                "messageLabel": "IELTS Academic Custom",
            },
            "is_active": True,
        }

    def test_institute_admin_can_create_institute_preset_pack(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            "/api/v1/exams/preset-packs/",
            self._payload(),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(ExamPresetPack.objects.count(), 1)
        pack = ExamPresetPack.objects.get()
        self.assertEqual(pack.scope_type, ExamPresetPackScope.INSTITUTE)
        self.assertEqual(pack.institute_id, self.context["institute"].id)

    def test_teacher_can_list_platform_and_institute_preset_packs(self):
        ExamPresetPack.objects.create(
            scope_type=ExamPresetPackScope.PLATFORM,
            code="platform-pack",
            label="Platform Pack",
            family="Global",
            note="Global preset pack",
            chip="Global",
            config={},
        )
        ExamPresetPack.objects.create(
            institute=self.context["institute"],
            scope_type=ExamPresetPackScope.INSTITUTE,
            code="institute-pack",
            label="Institute Pack",
            family="Institute",
            note="Institute preset pack",
            chip="Institute",
            config={},
        )
        self.client.force_authenticate(user=self.teacher_user)

        response = self.client.get("/api/v1/exams/preset-packs/")

        self.assertEqual(response.status_code, 200)
        codes = {item["code"] for item in response.data["results"]}
        self.assertEqual(codes, {"platform-pack", "institute-pack"})

    def test_teacher_cannot_create_preset_pack(self):
        self.client.force_authenticate(user=self.teacher_user)

        response = self.client.post(
            "/api/v1/exams/preset-packs/",
            self._payload(code="teacher-blocked"),
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(ExamPresetPack.objects.filter(code="teacher-blocked").exists())

    def test_institute_admin_cannot_delete_platform_preset_pack(self):
        pack = ExamPresetPack.objects.create(
            scope_type=ExamPresetPackScope.PLATFORM,
            code="platform-core",
            label="Platform Core",
            family="Global",
            note="Platform managed core pack",
            chip="Core",
            config={},
        )
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.delete(f"/api/v1/exams/preset-packs/{pack.id}/")

        self.assertEqual(response.status_code, 404)
        pack.refresh_from_db()
        self.assertTrue(pack.is_active)
