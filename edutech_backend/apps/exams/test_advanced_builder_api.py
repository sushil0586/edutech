from decimal import Decimal

from rest_framework.test import APIClient, APITestCase

from apps.academics.models import AssessmentFamily
from apps.economy.models import (
    InstituteQuestionFeatureEntitlement,
    InstituteQuestionEntitlementStatus,
    QuestionBankOwnershipType,
    QuestionBankPackage,
    QuestionBankPackageScope,
    QuestionBankPackageType,
)
from apps.economy.services import (
    grant_institute_feature_entitlement,
    grant_institute_question_bank_entitlement,
)
from apps.economy.models import ContentAccessPolicy, UnlockRule
from apps.exams.models import Exam, ExamQuestion, ExamSection, ExamSourceType
from apps.question_bank.models import Question, QuestionOption
from apps.question_bank.services import link_master_question_to_institute, sync_master_question_from_institute_question
from apps.question_bank.models import QuestionType
from apps.teachers.models import TeacherAssignment
from common.tests.builders import AcademicAssessmentBuilder


class AdvancedExamBuilderApiTests(APITestCase):
    ADVANCED_BUILDER_FEATURE_CODE = "ADVANCED_EXAM_BUILDER"

    def setUp(self):
        self.client = APIClient()
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.teacher = self.context["teacher"]
        self.teacher_user, _ = self.builder.create_teacher_account(
            self.context["institute"],
            self.teacher,
            username="advanced-teacher",
        )
        self.admin_user, _ = self.builder.create_institute_admin_account(
            self.context["institute"],
            username="advanced-admin",
        )
        TeacherAssignment.objects.create(
            institute=self.context["institute"],
            teacher=self.teacher,
            academic_year=self.context["academic_year"],
            program=self.context["program"],
            cohort=self.context["cohort"],
            subject=self.context["subject"],
            is_primary=True,
        )
        self.topic_algebra = self.context["topic"]
        self.topic_numbers = self.builder.create_topic(
            self.context["institute"],
            self.context["subject"],
            name="Number System",
            code="NUM-01",
            sort_order=2,
        )
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
        TeacherAssignment.objects.create(
            institute=self.context["institute"],
            teacher=self.teacher,
            academic_year=self.context["academic_year"],
            program=self.context["program"],
            cohort=self.context["cohort"],
            subject=self.second_subject,
            is_primary=False,
        )
        self._seed_questions_for_topic(self.topic_algebra, foundation=6, intermediate=6, advanced=6)
        self._seed_questions_for_topic(self.topic_numbers, foundation=8, intermediate=8, advanced=8)
        self._seed_questions_for_topic(
            self.second_topic,
            foundation=6,
            intermediate=6,
            advanced=6,
            subject=self.second_subject,
        )
        self._grant_advanced_builder_feature()

    def _grant_advanced_builder_feature(self):
        entitlement, _ = grant_institute_feature_entitlement(
            institute=self.context["institute"],
            feature_code=self.ADVANCED_BUILDER_FEATURE_CODE,
        )
        return entitlement

    def _revoke_advanced_builder_feature(self):
        InstituteQuestionFeatureEntitlement.objects.filter(
            institute=self.context["institute"],
            feature_code=self.ADVANCED_BUILDER_FEATURE_CODE,
        ).update(status=InstituteQuestionEntitlementStatus.REVOKED)

    def _seed_questions_for_topic(self, topic, *, foundation, intermediate, advanced, subject=None):
        counts = {
            "foundation": foundation,
            "intermediate": intermediate,
            "advanced": advanced,
        }
        subject = subject or self.context["subject"]
        for difficulty_level, total in counts.items():
            for index in range(total):
                self.builder.create_question_with_options(
                    self.context["institute"],
                    self.context["program"],
                    subject,
                    topic,
                    self.teacher,
                    difficulty_level=difficulty_level,
                    question_text=f"{topic.code}-{difficulty_level}-{index}",
                    default_marks=Decimal("2.00"),
                    negative_marks=Decimal("0.25"),
                )

    def _create_numeric_question(self, topic, *, difficulty_level="advanced", question_text=None):
        question_text = question_text or f"{topic.code}-{difficulty_level}-numeric"
        question, _ = self.builder.create_question_with_options(
            self.context["institute"],
            self.context["program"],
            self.context["subject"],
            topic,
            self.teacher,
            question_type=QuestionType.NUMERIC_ANSWER,
            question_text=question_text,
            default_marks=Decimal("4.00"),
            negative_marks=Decimal("0.00"),
            options=[],
            metadata={
                "accepted_answers": ["42"],
                "numeric_validation": {"tolerance": "0.01"},
            },
        )
        return question

    def _payload(self):
        return {
            "scope": {
                "institute_code": self.context["institute"].code,
                "academic_year_name": self.context["academic_year"].name,
                "program_code": self.context["program"].code,
                "cohort_code": self.context["cohort"].code,
                "subject_code": self.context["subject"].code,
            },
            "exam": {
                "title": "Advanced Algebra and Number System Test",
                "code": "ADV-BUILDER-01",
                "description": "Blueprint-driven test",
                "exam_type": "test",
                "delivery_mode": "online",
                "status": "draft",
                "duration_minutes": 60,
                "instructions": "Answer carefully.",
            },
            "composition": {
                "selection_mode": "strict",
                "sections": [
                    {
                        "name": "Section A",
                        "order": 1,
                        "question_count": 12,
                        "marks_per_question": "2.00",
                        "negative_marks_per_question": "0.25",
                        "difficulty_mix": {
                            "foundation": 25,
                            "intermediate": 50,
                            "advanced": 25,
                        },
                        "topics": [
                            {"topic_code": self.topic_algebra.code, "count": 6},
                            {"topic_code": self.topic_numbers.code, "count": 6},
                        ],
                    },
                    {
                        "name": "Section B",
                        "order": 2,
                        "question_count": 6,
                        "marks_per_question": "3.00",
                        "difficulty_mix": {
                            "foundation": 0,
                            "intermediate": 50,
                            "advanced": 50,
                        },
                        "topics": [
                            {"topic_code": self.topic_algebra.code, "count": 2},
                            {"topic_code": self.topic_numbers.code, "count": 4},
                        ],
                    },
                ],
            },
            "delivery": {
                "timer_mode": "global",
                "navigation_mode": "free_exam",
                "attempt_policy": "single",
                "max_attempts": 1,
                "result_publish_mode": "after_review",
                "review_mode": "attempted_only",
                "security_mode": "normal",
                "assignment_mode": "scope",
                "randomize_questions": True,
                "randomize_options": True,
            },
            "economy": {
                "policy_type": "stars_or_entitlement",
                "star_cost": 120,
                "entitlement_code": "bundle:math-premium",
                "priority": 10,
                "unlock_rule": {
                    "rule_type": "score_threshold",
                    "required_score_percentage": "75.00",
                    "priority": 20,
                },
            },
        }

    def test_preview_defaults_end_date_to_academic_year_end(self):
        self.client.force_authenticate(user=self.teacher_user)

        response = self.client.post(
            "/api/v1/exams/advanced-builder/preview/",
            self._payload(),
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["valid"])
        self.assertEqual(response.data["resolved_exam"]["total_questions"], 18)
        self.assertIn("question_quality", response.data["resolved_exam"])
        self.assertIn("quality_summary", response.data["sections"][0])
        self.assertIn("quality_breakup", response.data["sections"][0]["topic_breakup"][0])
        self.assertEqual(response.data["resolved_exam"]["source_type"], ExamSourceType.TEACHER)
        self.assertEqual(
            response.data["resolved_exam"]["end_at"].date(),
            self.context["academic_year"].end_date,
        )

    def test_preview_rejects_teacher_when_advanced_builder_feature_is_not_entitled(self):
        self._revoke_advanced_builder_feature()
        self.client.force_authenticate(user=self.teacher_user)

        response = self.client.post(
            "/api/v1/exams/advanced-builder/preview/",
            self._payload(),
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.data["detail"],
            "Advanced exam builder is not enabled for your institute subscription.",
        )

    def test_preview_rejects_institute_admin_when_advanced_builder_feature_is_not_entitled(self):
        self._revoke_advanced_builder_feature()
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            "/api/v1/exams/advanced-builder/preview/",
            self._payload(),
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.data["detail"],
            "Advanced exam builder is not enabled for your institute subscription.",
        )

    def test_preview_uses_program_assessment_family_profile_defaults(self):
        family = AssessmentFamily.objects.get(code="competitive")
        program = self.context["program"]
        program.assessment_family = family
        program.save(update_fields=["assessment_family"])

        self.client.force_authenticate(user=self.teacher_user)

        response = self.client.post(
            "/api/v1/exams/advanced-builder/preview/",
            self._payload(),
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["resolved_exam"]["experience_profile"]["assessment_family"],
            "competitive",
        )
        self.assertEqual(
            response.data["resolved_exam"]["experience_profile"]["assessment_family_label"],
            "Competitive",
        )
        self.assertEqual(
            response.data["resolved_exam"]["experience_profile"]["recommended_timer_mode"],
            "section",
        )
        self.assertEqual(
            response.data["resolved_exam"]["experience_profile"]["recommended_navigation_mode"],
            "sequential",
        )
        self.assertEqual(
            response.data["resolved_exam"]["assessment_family_profile"]["code"],
            "competitive",
        )
        self.assertIn(
            "matrix_match",
            response.data["resolved_exam"]["assessment_family_profile"]["allowed_question_types"],
        )
        self.assertEqual(
            response.data["sections"][0]["family_contract"]["assessment_family_code"],
            "competitive",
        )
        self.assertEqual(
            response.data["sections"][0]["family_contract"]["negative_marking_scope"],
            "objective_only",
        )
        self.assertTrue(response.data["sections"][0]["family_contract"]["negative_marking_allowed"])
        self.assertTrue(response.data["sections"][0]["family_contract"]["negative_marking_recommended"])
        self.assertTrue(response.data["sections"][0]["family_contract"]["negative_marking_aligned"])

    def test_preview_rejects_section_negative_marks_when_family_disables_them(self):
        family = AssessmentFamily.objects.get(code="certification")
        program = self.context["program"]
        program.assessment_family = family
        program.save(update_fields=["assessment_family"])

        self.client.force_authenticate(user=self.teacher_user)
        payload = self._payload()
        payload["exam"]["code"] = "ADV-BUILDER-CERT-01"
        payload["composition"]["sections"][0]["negative_marks_per_question"] = "0.25"

        response = self.client.post(
            "/api/v1/exams/advanced-builder/preview/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("composition", response.data)
        self.assertTrue(
            any("does not allow section-level negative marking" in item for item in response.data["composition"])
        )

    def test_preview_warns_when_competitive_family_section_has_no_negative_marks(self):
        family = AssessmentFamily.objects.get(code="competitive")
        program = self.context["program"]
        program.assessment_family = family
        program.save(update_fields=["assessment_family"])

        self.client.force_authenticate(user=self.teacher_user)
        payload = self._payload()
        payload["exam"]["code"] = "ADV-BUILDER-COMP-01"
        payload["composition"]["sections"][0]["negative_marks_per_question"] = "0.00"

        response = self.client.post(
            "/api/v1/exams/advanced-builder/preview/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["valid"])
        self.assertFalse(response.data["sections"][0]["family_contract"]["negative_marking_aligned"])
        self.assertTrue(response.data["sections"][0]["family_contract"]["negative_marking_recommended"])
        self.assertTrue(
            any("usually expects negative marking" in warning for warning in response.data["warnings"])
        )

    def test_preview_warns_when_jee_preset_has_no_numeric_entry_questions(self):
        family = AssessmentFamily.objects.get(code="competitive")
        program = self.context["program"]
        program.assessment_family = family
        program.save(update_fields=["assessment_family"])

        self.client.force_authenticate(user=self.teacher_user)
        payload = self._payload()
        payload["exam"]["code"] = "ADV-BUILDER-JEE-NONUM-01"
        payload["exam"]["preset_pack_code"] = "jee_mains_math"

        response = self.client.post(
            "/api/v1/exams/advanced-builder/preview/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["valid"])
        self.assertTrue(
            any("resolved no numeric-entry questions" in warning for warning in response.data["warnings"])
        )
        self.assertTrue(response.data["sections"][0]["family_contract"]["numeric_entry_supported"])
        self.assertFalse(response.data["sections"][0]["family_contract"]["numeric_entry_present"])
        self.assertEqual(response.data["sections"][0]["family_contract"]["numeric_entry_count"], 0)

    def test_preview_rejects_jee_numeric_entry_section_with_negative_marking(self):
        family = AssessmentFamily.objects.get(code="competitive")
        program = self.context["program"]
        program.assessment_family = family
        program.save(update_fields=["assessment_family"])

        self.client.force_authenticate(user=self.teacher_user)
        payload = self._payload()
        payload["exam"]["code"] = "ADV-BUILDER-JEE-NUMPEN-01"
        payload["exam"]["preset_pack_code"] = "jee_mains_math"
        payload["composition"]["sections"] = [
            {
                "name": "Numeric Section",
                "order": 1,
                "question_count": 1,
                "marks_per_question": "4.00",
                "negative_marks_per_question": "1.00",
                "difficulty_mix": {
                    "foundation": 0,
                    "intermediate": 0,
                    "advanced": 100,
                },
                "topics": [
                    {"topic_code": self.topic_numbers.code, "count": 1},
                ],
            }
        ]

        response = self.client.post(
            "/api/v1/exams/advanced-builder/preview/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("composition", response.data)
        self.assertIn("do not support negative marking", str(response.data["composition"]))

    def test_preview_returns_gre_reporting_contract_for_gre_preset(self):
        self.client.force_authenticate(user=self.teacher_user)
        payload = self._payload()
        payload["exam"]["code"] = "ADV-BUILDER-GRE-REPORT-01"
        payload["exam"]["preset_pack_code"] = "gre_quant"

        response = self.client.post(
            "/api/v1/exams/advanced-builder/preview/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        contract = response.data["resolved_exam"]["reporting_contract"]
        self.assertEqual(contract["family_id"], "gre")
        self.assertEqual(contract["score_reporting_mode"], "total_score_first")
        self.assertFalse(contract["sectional_reporting_ready"])
        self.assertEqual(contract["recommended_review_mode"], "attempted_only")
        self.assertEqual(contract["recommended_percentile_visibility_mode"], "final_after_exam_closure")
        self.assertEqual(contract["recommended_benchmark_visibility_mode"], "peer_average_plus_percentile")

    def test_preview_warns_when_gre_reporting_visibility_is_too_early(self):
        self.client.force_authenticate(user=self.teacher_user)
        payload = self._payload()
        payload["exam"]["code"] = "ADV-BUILDER-GRE-WARN-01"
        payload["exam"]["preset_pack_code"] = "gre_quant"
        payload["delivery"]["review_mode"] = "solution_review"
        payload["delivery"]["rank_visibility_mode"] = "provisional_after_submit"
        payload["delivery"]["percentile_visibility_mode"] = "provisional_after_submit"
        payload["delivery"]["benchmark_visibility_mode"] = "hidden"

        response = self.client.post(
            "/api/v1/exams/advanced-builder/preview/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            any("attempted-only mode" in warning for warning in response.data["warnings"])
        )
        self.assertTrue(
            any("avoid provisional rank visibility" in warning for warning in response.data["warnings"])
        )
        self.assertTrue(
            any("percentile visibility works best after exam closure" in warning for warning in response.data["warnings"])
        )

    def test_create_builds_exam_sections_questions_and_economy(self):
        self.client.force_authenticate(user=self.teacher_user)
        payload = self._payload()
        payload["exam"]["preset_pack_code"] = "gre_quant"
        payload["exam"]["experience_profile"] = {
            "recommended_timer_mode": "section",
            "recommended_navigation_mode": "sequential",
            "recommended_media_flow": "controlled_exam_media",
            "supports_section_media_guidance": True,
            "learner_summary": "Treat this as a full simulation with stricter pacing.",
            "creator_summary": "Use this for premium mock delivery.",
        }

        response = self.client.post(
            "/api/v1/exams/advanced-builder/create/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        exam_payload = response.data["data"]
        self.assertEqual(exam_payload["source_type"], ExamSourceType.TEACHER)
        self.assertEqual(exam_payload["active_questions_count"], 18)

        exam_id = exam_payload["id"]
        self.assertEqual(ExamSection.objects.filter(exam_id=exam_id).count(), 2)
        self.assertEqual(ExamQuestion.objects.filter(exam_id=exam_id).count(), 18)

        policy = ContentAccessPolicy.objects.get(content_key=exam_id, is_active=True)
        self.assertEqual(policy.policy_type, "stars_or_entitlement")
        self.assertEqual(policy.star_cost, 120)

        exam = Exam.objects.get(pk=exam_id)
        self.assertEqual(
            exam.metadata["experience_profile"]["recommended_media_flow"],
            "controlled_exam_media",
        )
        self.assertEqual(
            exam.metadata["advanced_builder"]["preset_pack_code"],
            "gre_quant",
        )
        self.assertEqual(
            exam.metadata["advanced_builder"]["reporting_contract"]["family_id"],
            "gre",
        )
        self.assertEqual(
            exam.metadata["advanced_builder"]["reporting_contract"]["score_reporting_mode"],
            "total_score_first",
        )
        self.assertEqual(
            exam_payload["experience_profile"]["recommended_navigation_mode"],
            "sequential",
        )
        self.assertEqual(
            exam_payload["experience_profile"]["learner_summary"],
            "Treat this as a full simulation with stricter pacing.",
        )
        self.assertTrue(all(section.subject_id == self.context["subject"].id for section in exam.sections.all()))

        unlock_rule = UnlockRule.objects.get(content_key=exam_id, is_active=True)
        self.assertEqual(unlock_rule.rule_type, "score_threshold")
        self.assertEqual(unlock_rule.required_score_percentage, Decimal("75.00"))

    def test_preview_supports_section_subject_codes_without_scope_subject(self):
        self.client.force_authenticate(user=self.teacher_user)
        payload = self._payload()
        payload["scope"]["subject_code"] = ""
        payload["exam"]["code"] = "ADV-BUILDER-MULTI-01"
        payload["composition"]["sections"] = [
            {
                "name": "Math Section",
                "order": 1,
                "subject_code": self.context["subject"].code,
                "question_count": 4,
                "marks_per_question": "2.00",
                "difficulty_mix": {
                    "foundation": 50,
                    "intermediate": 50,
                    "advanced": 0,
                },
                "topics": [
                    {"topic_code": self.topic_algebra.code, "count": 4},
                ],
            },
            {
                "name": "Science Section",
                "order": 2,
                "subject_code": self.second_subject.code,
                "question_count": 4,
                "marks_per_question": "2.00",
                "difficulty_mix": {
                    "foundation": 50,
                    "intermediate": 50,
                    "advanced": 0,
                },
                "topics": [
                    {"topic_code": self.second_topic.code, "count": 4},
                ],
            },
        ]

        response = self.client.post(
            "/api/v1/exams/advanced-builder/preview/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["valid"])
        self.assertTrue(response.data["resolved_exam"]["primary_subject"])
        self.assertEqual(response.data["sections"][0]["subject_code"], self.context["subject"].code)
        self.assertEqual(response.data["sections"][1]["subject_code"], self.second_subject.code)
        self.assertEqual(response.data["sections"][1]["subject_name"], self.second_subject.name)

    def test_create_persists_section_subjects_for_multi_subject_exam(self):
        self.client.force_authenticate(user=self.teacher_user)
        payload = self._payload()
        payload["scope"]["subject_code"] = ""
        payload["exam"]["code"] = "ADV-BUILDER-MULTI-02"
        payload["composition"]["sections"] = [
            {
                "name": "Math Section",
                "order": 1,
                "subject_code": self.context["subject"].code,
                "question_count": 3,
                "marks_per_question": "2.00",
                "difficulty_mix": {
                    "foundation": 100,
                    "intermediate": 0,
                    "advanced": 0,
                },
                "topics": [
                    {"topic_code": self.topic_algebra.code, "count": 3},
                ],
            },
            {
                "name": "Science Section",
                "order": 2,
                "subject_code": self.second_subject.code,
                "question_count": 3,
                "marks_per_question": "2.00",
                "difficulty_mix": {
                    "foundation": 100,
                    "intermediate": 0,
                    "advanced": 0,
                },
                "topics": [
                    {"topic_code": self.second_topic.code, "count": 3},
                ],
            },
        ]

        response = self.client.post(
            "/api/v1/exams/advanced-builder/create/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        exam = Exam.objects.get(pk=response.data["data"]["id"])
        self.assertEqual(exam.sections.count(), 2)
        self.assertEqual(
            list(exam.sections.order_by("section_order").values_list("subject__code", flat=True)),
            [self.context["subject"].code, self.second_subject.code],
        )
        self.assertEqual(
            exam.metadata["advanced_builder"]["section_subject_codes"],
            [self.context["subject"].code, self.second_subject.code],
        )

    def test_strict_selection_fails_when_topic_pool_is_short(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = self._payload()
        payload["exam"]["code"] = "ADV-BUILDER-02"
        payload["composition"]["sections"][1]["difficulty_mix"] = {
            "foundation": 0,
            "intermediate": 0,
            "advanced": 100,
        }
        payload["composition"]["sections"][1]["topics"] = [
            {"topic_code": self.topic_algebra.code, "count": 6},
        ]
        payload["composition"]["sections"][1]["question_count"] = 6

        response = self.client.post(
            "/api/v1/exams/advanced-builder/preview/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("composition", response.data)

    def test_section_topic_count_mismatch_returns_clear_section_message(self):
        self.client.force_authenticate(user=self.teacher_user)
        payload = self._payload()
        payload["exam"]["code"] = "ADV-BUILDER-03"
        payload["composition"]["sections"][0]["question_count"] = 18
        payload["composition"]["sections"][0]["topics"] = [
            {"topic_code": self.topic_algebra.code, "count": 9},
        ]

        response = self.client.post(
            "/api/v1/exams/advanced-builder/create/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["composition"]["sections"][0]["topics"][0],
            "Section A has 9 topic slot(s), but needs 18 question(s). Topic counts must add up to the section question count.",
        )

    def test_teacher_scope_error_names_missing_assignment_scope(self):
        self.client.force_authenticate(user=self.teacher_user)
        TeacherAssignment.objects.all().delete()
        payload = self._payload()
        payload["exam"]["code"] = "ADV-BUILDER-04"

        response = self.client.post(
            "/api/v1/exams/advanced-builder/create/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["scope"][0],
            (
                f"You are not assigned to {self.context['academic_year'].name} / "
                f"{self.context['program'].code} / {self.context['subject'].code} / {self.context['cohort'].code}. "
                "Choose a year, program, subject, and cohort that match one of your active teacher assignments, "
                "or ask your institute admin to add this assignment before creating the exam."
            ),
        )

    def test_preview_warns_when_relaxed_mode_uses_difficulty_fallback(self):
        self.client.force_authenticate(user=self.teacher_user)
        payload = self._payload()
        payload["exam"]["code"] = "ADV-BUILDER-05"
        payload["composition"]["selection_mode"] = "relaxed"
        payload["composition"]["sections"] = [
            {
                "name": "Section A",
                "order": 1,
                "question_count": 8,
                "marks_per_question": "2.00",
                "negative_marks_per_question": "0.25",
                "difficulty_mix": {
                    "foundation": 0,
                    "intermediate": 0,
                    "advanced": 100,
                },
                "topics": [
                    {"topic_code": self.topic_algebra.code, "count": 8},
                ],
            }
        ]

        response = self.client.post(
            "/api/v1/exams/advanced-builder/preview/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["valid"])
        self.assertTrue(
            any("used 2 foundation question(s) to cover the advanced target" in warning for warning in response.data["warnings"])
        )
        self.assertTrue(
            any("all resolved questions are still emerging" in warning for warning in response.data["warnings"])
        )

    def test_preview_warns_when_marks_are_inherited_and_timers_exceed_exam(self):
        self.client.force_authenticate(user=self.teacher_user)
        payload = self._payload()
        payload["exam"]["code"] = "ADV-BUILDER-06"
        payload["exam"]["duration_minutes"] = 60
        payload["composition"]["sections"][0]["marks_per_question"] = None
        payload["composition"]["sections"][0]["timer_enabled"] = True
        payload["composition"]["sections"][0]["duration_minutes"] = 40
        payload["composition"]["sections"][1]["timer_enabled"] = True
        payload["composition"]["sections"][1]["duration_minutes"] = 30

        response = self.client.post(
            "/api/v1/exams/advanced-builder/preview/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["valid"])
        self.assertTrue(
            any("Timed sections add up to 70 min" in blocker for blocker in response.data["blockers"])
        )
        self.assertTrue(
            any("marks per question is blank" in warning for warning in response.data["warnings"])
        )

    def test_create_blocks_when_preview_contains_hard_stop_blockers(self):
        self.client.force_authenticate(user=self.teacher_user)
        payload = self._payload()
        payload["exam"]["code"] = "ADV-BUILDER-07"
        payload["exam"]["duration_minutes"] = 45
        payload["composition"]["sections"][0]["timer_enabled"] = True
        payload["composition"]["sections"][0]["duration_minutes"] = 30
        payload["composition"]["sections"][1]["timer_enabled"] = True
        payload["composition"]["sections"][1]["duration_minutes"] = 20

        response = self.client.post(
            "/api/v1/exams/advanced-builder/create/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("composition", response.data)
        self.assertTrue(
            any("Timed sections add up to 50 min" in item for item in response.data["composition"])
        )

    def test_preview_excludes_linked_shared_library_question_when_entitlement_is_paused(self):
        third_subject = self.builder.create_subject(
            self.context["institute"],
            self.context["program"],
            name="Social Science",
            code="SST10",
            sort_order=3,
        )
        third_topic = self.builder.create_topic(
            self.context["institute"],
            third_subject,
            name="Civics",
            code="SST-CIV-01",
            sort_order=1,
        )
        TeacherAssignment.objects.create(
            institute=self.context["institute"],
            teacher=self.teacher,
            academic_year=self.context["academic_year"],
            program=self.context["program"],
            cohort=self.context["cohort"],
            subject=third_subject,
            is_primary=False,
        )

        public_institute = self.builder.create_institute(
            code="PUBADV1",
            name="Advanced Builder Public Hub",
            metadata={"is_public_content_hub": True},
        )
        public_program = self.builder.create_program(
            public_institute,
            code=self.context["program"].code,
            name=self.context["program"].name,
        )
        public_subject = self.builder.create_subject(
            public_institute,
            public_program,
            code=third_subject.code,
            name=third_subject.name,
        )
        public_topic = self.builder.create_topic(
            public_institute,
            public_subject,
            code=third_topic.code,
            name=third_topic.name,
        )
        public_teacher = self.builder.create_teacher(public_institute, employee_code="PUB-ADV-TCH")
        source_question = Question.objects.create(
            institute=public_institute,
            program=public_program,
            subject=public_subject,
            topic=public_topic,
            created_by_teacher=public_teacher,
            question_type="mcq_single",
            difficulty_level="intermediate",
            question_text="Linked question for builder entitlement enforcement",
            explanation="Only licensed use should resolve.",
            default_marks="2.00",
            negative_marks="0.25",
            is_verified=True,
            metadata={"question_visibility": "shared_by_request"},
        )
        QuestionOption.objects.create(question=source_question, option_text="Option A", option_order=1, is_correct=True)
        QuestionOption.objects.create(question=source_question, option_text="Option B", option_order=2, is_correct=False)
        master_question = sync_master_question_from_institute_question(source_question)

        package = QuestionBankPackage.objects.create(
            institute=public_institute,
            name="Advanced Builder Package",
            code="ADVANCED_BUILDER_PACKAGE",
            package_type=QuestionBankPackageType.SUBJECT_LIBRARY,
            ownership_type=QuestionBankOwnershipType.PLATFORM,
        )
        QuestionBankPackageScope.objects.create(
            institute=public_institute,
            package=package,
            program=public_program,
            subject=public_subject,
            topic=public_topic,
            question_source_type="platform_only",
            question_type="mcq_single",
            difficulty_level="intermediate",
            master_visibility="shared_by_request",
        )
        entitlement, _ = grant_institute_question_bank_entitlement(
            institute=self.context["institute"],
            question_bank_package=package,
        )
        link_master_question_to_institute(
            master_question=master_question,
            institute=self.context["institute"],
            approved_by=None,
            requested_by_teacher=self.teacher,
            local_program=self.context["program"],
            local_subject=third_subject,
            local_topic=third_topic,
        )
        entitlement.status = InstituteQuestionEntitlementStatus.PAUSED
        entitlement.save(update_fields=["status", "updated_at"])

        self.client.force_authenticate(user=self.teacher_user)
        payload = {
            "scope": {
                "institute_code": self.context["institute"].code,
                "academic_year_name": self.context["academic_year"].name,
                "program_code": self.context["program"].code,
                "cohort_code": self.context["cohort"].code,
                "subject_code": third_subject.code,
            },
            "exam": {
                "title": "Entitlement Paused Builder Test",
                "code": "ADV-BUILDER-08",
                "description": "Should not resolve paused linked content",
                "exam_type": "test",
                "delivery_mode": "online",
                "status": "draft",
                "duration_minutes": 30,
                "instructions": "Test paused entitlements.",
            },
            "composition": {
                "selection_mode": "strict",
                "sections": [
                    {
                        "name": "Section A",
                        "order": 1,
                        "question_count": 1,
                        "marks_per_question": "2.00",
                        "negative_marks_per_question": "0.25",
                        "difficulty_mix": {
                            "foundation": 0,
                            "intermediate": 100,
                            "advanced": 0,
                        },
                        "topics": [
                            {"topic_code": third_topic.code, "count": 1},
                        ],
                    }
                ],
            },
            "delivery": {
                "timer_mode": "global",
                "navigation_mode": "free_exam",
                "attempt_policy": "single",
                "max_attempts": 1,
                "result_publish_mode": "after_review",
                "review_mode": "attempted_only",
                "security_mode": "normal",
                "assignment_mode": "scope",
            },
            "economy": {
                "policy_type": "free",
                "star_cost": 0,
                "entitlement_code": "",
                "priority": 10,
            },
        }

        response = self.client.post(
            "/api/v1/exams/advanced-builder/preview/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("composition", response.data)
        self.assertTrue(
            any(
                "short by 1" in item or "only 0 could be resolved" in item
                for item in response.data["composition"]
            )
        )
