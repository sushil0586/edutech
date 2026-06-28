from rest_framework.test import APIClient, APITestCase

from apps.economy.models import (
    InstituteQuestionFeatureEntitlement,
    InstituteQuestionEntitlementStatus,
    InstituteQuestionUsageActionType,
    InstituteQuestionUsageLedger,
    QuestionBankAccessMode,
    QuestionBankOwnershipType,
    QuestionBankPackage,
    QuestionBankPackageScope,
    QuestionBankPackageType,
)
from apps.economy.services import (
    grant_institute_feature_entitlement,
    grant_institute_question_bank_entitlement,
)
from apps.question_bank.models import InstituteQuestionAccessStatus, Question, QuestionOption
from apps.question_bank.services import sync_master_question_from_institute_question
from common.tests.builders import AcademicAssessmentBuilder


class MasterQuestionLibraryApiTests(APITestCase):
    SHARED_LIBRARY_FEATURE_CODE = "QUESTION_BANK_SHARED_LIBRARY"

    def setUp(self):
        self.client = APIClient()
        self.builder = AcademicAssessmentBuilder()

        self.public_institute = self.builder.create_institute(
            code="PUB201",
            name="Public Content Hub",
            metadata={"is_public_content_hub": True},
        )
        self.private_institute = self.builder.create_institute(
            code="SCH201",
            name="Subscribed Private School",
        )

        self.public_program = self.builder.create_program(
            self.public_institute,
            code="CLS7",
            name="Class 7",
        )
        self.public_subject = self.builder.create_subject(
            self.public_institute,
            self.public_program,
            code="CLS7-MATH",
            name="Mathematics",
        )
        self.public_topic = self.builder.create_topic(
            self.public_institute,
            self.public_subject,
            code="ALG-01",
            name="Algebra",
        )
        self.public_teacher = self.builder.create_teacher(
            self.public_institute,
            employee_code="PUBT01",
        )

        self.private_program = self.builder.create_program(
            self.private_institute,
            code="CLS7",
            name="Class 7",
        )
        self.private_subject = self.builder.create_subject(
            self.private_institute,
            self.private_program,
            code="CLS7-MATH",
            name="Mathematics",
        )
        self.private_topic = self.builder.create_topic(
            self.private_institute,
            self.private_subject,
            code="ALG-01",
            name="Algebra",
        )
        self.private_teacher = self.builder.create_teacher(
            self.private_institute,
            employee_code="PVTT01",
        )

        self.platform_user, _ = self.builder.create_platform_admin_account(
            username="master-platform-admin",
        )
        self.institute_admin_user, _ = self.builder.create_institute_admin_account(
            institute=self.private_institute,
            username="master-institute-admin",
        )
        self.teacher_user, _ = self.builder.create_teacher_account(
            self.private_institute,
            self.private_teacher,
            username="master-private-teacher",
        )
        self._grant_shared_library_feature()

        source_question = Question.objects.create(
            institute=self.public_institute,
            program=self.public_program,
            subject=self.public_subject,
            topic=self.public_topic,
            created_by_teacher=self.public_teacher,
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="What is x + x?",
            explanation="It simplifies to 2x.",
            default_marks="2.00",
            negative_marks="0.25",
            is_verified=True,
            metadata={"question_visibility": "shared_by_request"},
        )
        QuestionOption.objects.create(
            question=source_question,
            option_text="2x",
            option_order=1,
            is_correct=True,
        )
        QuestionOption.objects.create(
            question=source_question,
            option_text="x2",
            option_order=2,
            is_correct=False,
        )
        self.master_question = sync_master_question_from_institute_question(source_question)
        second_source_question = Question.objects.create(
            institute=self.public_institute,
            program=self.public_program,
            subject=self.public_subject,
            topic=self.public_topic,
            created_by_teacher=self.public_teacher,
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="What is x + 2x?",
            explanation="It simplifies to 3x.",
            default_marks="2.00",
            negative_marks="0.25",
            is_verified=True,
            metadata={"question_visibility": "shared_by_request"},
        )
        QuestionOption.objects.create(
            question=second_source_question,
            option_text="3x",
            option_order=1,
            is_correct=True,
        )
        QuestionOption.objects.create(
            question=second_source_question,
            option_text="x3",
            option_order=2,
            is_correct=False,
        )
        self.second_master_question = sync_master_question_from_institute_question(second_source_question)

        self.package = QuestionBankPackage.objects.create(
            institute=self.public_institute,
            name="Class 7 Math Library",
            code="CLS7_MATH_LIBRARY",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        QuestionBankPackageScope.objects.create(
            institute=self.public_institute,
            package=self.package,
            program=self.public_program,
            subject=self.public_subject,
            topic=self.public_topic,
            question_source_type="platform_only",
            question_type="mcq_single",
            difficulty_level="intermediate",
            master_visibility="shared_by_request",
        )

    def _grant_shared_library_feature(self):
        entitlement, _ = grant_institute_feature_entitlement(
            institute=self.private_institute,
            feature_code=self.SHARED_LIBRARY_FEATURE_CODE,
        )
        return entitlement

    def _revoke_shared_library_feature(self):
        InstituteQuestionFeatureEntitlement.objects.filter(
            institute=self.private_institute,
            feature_code=self.SHARED_LIBRARY_FEATURE_CODE,
        ).update(status=InstituteQuestionEntitlementStatus.REVOKED)

    def test_teacher_master_library_list_shows_access_false_before_grant(self):
        self.client.force_authenticate(user=self.teacher_user)

        response = self.client.get("/api/v1/question-bank/master-library/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 2)
        self.assertTrue(all(item["has_access"] is False for item in response.data["results"]))
        self.assertTrue(all(item["has_entitlement"] is False for item in response.data["results"]))
        self.assertTrue(all(item["access_availability"] == "subscription_required" for item in response.data["results"]))
        self.assertTrue(all(item["matching_packages"] == [] for item in response.data["results"]))

    def test_teacher_master_library_list_shows_matching_package_after_grant(self):
        grant_institute_question_bank_entitlement(
            institute=self.private_institute,
            question_bank_package=self.package,
        )
        self.client.force_authenticate(user=self.teacher_user)

        response = self.client.get("/api/v1/question-bank/master-library/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 2)
        self.assertTrue(all(item["has_access"] is True for item in response.data["results"]))
        self.assertTrue(all(item["has_entitlement"] is True for item in response.data["results"]))
        self.assertTrue(all(item["access_availability"] == "available" for item in response.data["results"]))
        self.assertTrue(
            all(item["matching_packages"][0]["code"] == self.package.code for item in response.data["results"])
        )

    def test_teacher_master_library_list_marks_quota_exhausted_when_matching_package_is_full(self):
        self.package.access_mode = QuestionBankAccessMode.QUOTA_LIMITED
        self.package.save(update_fields=["access_mode", "updated_at"])
        scope = self.package.scopes.get()
        scope.max_questions_total = 1
        scope.save(update_fields=["max_questions_total", "updated_at"])

        grant_institute_question_bank_entitlement(
            institute=self.private_institute,
            question_bank_package=self.package,
        )
        self.client.force_authenticate(user=self.institute_admin_user)
        first_link_response = self.client.post(
            f"/api/v1/question-bank/master-library/{self.master_question.id}/link/",
            {
                "local_subject_code": self.private_subject.code,
                "local_topic_code": self.private_topic.code,
            },
            format="json",
        )
        self.assertEqual(first_link_response.status_code, 200)

        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get("/api/v1/question-bank/master-library/")

        self.assertEqual(response.status_code, 200)
        exhausted_row = next(item for item in response.data["results"] if item["id"] == str(self.second_master_question.id))
        self.assertTrue(exhausted_row["has_entitlement"])
        self.assertFalse(exhausted_row["has_access"])
        self.assertEqual(exhausted_row["access_availability"], "quota_exhausted")
        self.assertTrue(exhausted_row["quota_exhausted"])
        self.assertTrue(exhausted_row["quota_limited"])
        self.assertIn("quota", exhausted_row["quota_note"].lower())

    def test_teacher_cannot_query_other_target_institute(self):
        other_institute = self.builder.create_institute(code="SCH999", name="Other School")
        self.client.force_authenticate(user=self.teacher_user)

        response = self.client.get(
            f"/api/v1/question-bank/master-library/?target_institute_code={other_institute.code}"
        )

        self.assertEqual(response.status_code, 403)

    def test_master_library_requires_shared_library_feature_entitlement(self):
        self._revoke_shared_library_feature()
        self.client.force_authenticate(user=self.teacher_user)

        list_response = self.client.get("/api/v1/question-bank/master-library/")
        self.assertEqual(list_response.status_code, 403)
        self.assertEqual(
            list_response.data["detail"],
            "Shared question library is not enabled for your institute subscription.",
        )

        request_response = self.client.post(
            f"/api/v1/question-bank/master-library/{self.master_question.id}/request-access/",
            {
                "local_subject_code": self.private_subject.code,
                "local_topic_code": self.private_topic.code,
            },
            format="json",
        )
        self.assertEqual(request_response.status_code, 403)
        self.assertEqual(
            request_response.data["detail"],
            "Shared question library is not enabled for your institute subscription.",
        )

    def test_request_access_is_blocked_without_matching_package(self):
        self.client.force_authenticate(user=self.teacher_user)

        response = self.client.post(
            f"/api/v1/question-bank/master-library/{self.master_question.id}/request-access/",
            {
                "local_subject_code": self.private_subject.code,
                "local_topic_code": self.private_topic.code,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("master_question", response.data)

    def test_request_access_succeeds_with_matching_package(self):
        grant_institute_question_bank_entitlement(
            institute=self.private_institute,
            question_bank_package=self.package,
        )
        self.client.force_authenticate(user=self.teacher_user)

        response = self.client.post(
            f"/api/v1/question-bank/master-library/{self.master_question.id}/request-access/",
            {
                "local_subject_code": self.private_subject.code,
                "local_topic_code": self.private_topic.code,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], InstituteQuestionAccessStatus.REQUESTED)
        self.assertEqual(response.data["matching_package_codes"], [self.package.code])

    def test_institute_admin_can_link_with_matching_package(self):
        grant_institute_question_bank_entitlement(
            institute=self.private_institute,
            question_bank_package=self.package,
        )
        self.client.force_authenticate(user=self.institute_admin_user)

        response = self.client.post(
            f"/api/v1/question-bank/master-library/{self.master_question.id}/link/",
            {
                "local_subject_code": self.private_subject.code,
                "local_topic_code": self.private_topic.code,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], InstituteQuestionAccessStatus.LINKED)
        self.assertIsNotNone(response.data["linked_question_id"])
        usage_entry = InstituteQuestionUsageLedger.objects.get(
            institute=self.private_institute,
            action_type=InstituteQuestionUsageActionType.QUESTION_LINKED,
            master_question=self.master_question,
        )
        self.assertEqual(usage_entry.question_bank_package_id, self.package.id)
        self.assertEqual(str(usage_entry.question_id), response.data["linked_question_id"])

    def test_link_is_idempotent_and_quota_blocks_second_distinct_question(self):
        self.package.access_mode = QuestionBankAccessMode.QUOTA_LIMITED
        self.package.save(update_fields=["access_mode", "updated_at"])
        scope = self.package.scopes.get()
        scope.max_questions_total = 1
        scope.save(update_fields=["max_questions_total", "updated_at"])

        grant_institute_question_bank_entitlement(
            institute=self.private_institute,
            question_bank_package=self.package,
        )
        self.client.force_authenticate(user=self.institute_admin_user)

        first_response = self.client.post(
            f"/api/v1/question-bank/master-library/{self.master_question.id}/link/",
            {
                "local_subject_code": self.private_subject.code,
                "local_topic_code": self.private_topic.code,
            },
            format="json",
        )
        self.assertEqual(first_response.status_code, 200)

        repeat_response = self.client.post(
            f"/api/v1/question-bank/master-library/{self.master_question.id}/link/",
            {
                "local_subject_code": self.private_subject.code,
                "local_topic_code": self.private_topic.code,
            },
            format="json",
        )
        self.assertEqual(repeat_response.status_code, 200)
        self.assertEqual(
            repeat_response.data["linked_question_id"],
            first_response.data["linked_question_id"],
        )
        self.assertEqual(
            InstituteQuestionUsageLedger.objects.filter(
                institute=self.private_institute,
                action_type=InstituteQuestionUsageActionType.QUESTION_LINKED,
                master_question=self.master_question,
            ).count(),
            1,
        )

        second_response = self.client.post(
            f"/api/v1/question-bank/master-library/{self.second_master_question.id}/link/",
            {
                "local_subject_code": self.private_subject.code,
                "local_topic_code": self.private_topic.code,
            },
            format="json",
        )
        self.assertEqual(second_response.status_code, 400)
        self.assertIn("master_question", second_response.data)

    def test_compact_question_list_reports_shared_library_access_state(self):
        entitlement, _ = grant_institute_question_bank_entitlement(
            institute=self.private_institute,
            question_bank_package=self.package,
        )
        self.client.force_authenticate(user=self.institute_admin_user)

        link_response = self.client.post(
            f"/api/v1/question-bank/master-library/{self.master_question.id}/link/",
            {
                "local_subject_code": self.private_subject.code,
                "local_topic_code": self.private_topic.code,
            },
            format="json",
        )
        self.assertEqual(link_response.status_code, 200)
        linked_question_id = link_response.data["linked_question_id"]

        active_response = self.client.get("/api/v1/question-bank/questions/?compact=1")
        self.assertEqual(active_response.status_code, 200)
        active_row = next(item for item in active_response.data["results"] if item["id"] == linked_question_id)
        self.assertTrue(active_row["is_shared_library_link"])
        self.assertTrue(active_row["shared_library_access_active"])
        self.assertEqual(active_row["shared_library_access_state"], "active")

        entitlement.status = InstituteQuestionEntitlementStatus.PAUSED
        entitlement.save(update_fields=["status", "updated_at"])

        paused_response = self.client.get("/api/v1/question-bank/questions/?compact=1")
        self.assertEqual(paused_response.status_code, 200)
        paused_row = next(item for item in paused_response.data["results"] if item["id"] == linked_question_id)
        self.assertTrue(paused_row["is_shared_library_link"])
        self.assertFalse(paused_row["shared_library_access_active"])
        self.assertEqual(paused_row["shared_library_access_state"], "inactive")

    def test_linked_question_update_is_blocked_when_entitlement_is_paused(self):
        entitlement, _ = grant_institute_question_bank_entitlement(
            institute=self.private_institute,
            question_bank_package=self.package,
        )
        self.client.force_authenticate(user=self.institute_admin_user)

        link_response = self.client.post(
            f"/api/v1/question-bank/master-library/{self.master_question.id}/link/",
            {
                "local_subject_code": self.private_subject.code,
                "local_topic_code": self.private_topic.code,
            },
            format="json",
        )
        self.assertEqual(link_response.status_code, 200)
        linked_question_id = link_response.data["linked_question_id"]

        entitlement.status = InstituteQuestionEntitlementStatus.PAUSED
        entitlement.save(update_fields=["status", "updated_at"])

        update_response = self.client.patch(
            f"/api/v1/question-bank/questions/{linked_question_id}/",
            {
                "question_text": "What is x + x?",
                "explanation": "Updated explanation after entitlement pause.",
            },
            format="json",
        )

        self.assertEqual(update_response.status_code, 400)
        self.assertIn("question", update_response.data)
