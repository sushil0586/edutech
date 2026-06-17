from decimal import Decimal

from rest_framework.test import APIClient, APITestCase

from apps.economy.models import ContentAccessPolicy, UnlockRule
from apps.exams.models import ExamQuestion, ExamSection, ExamSourceType
from apps.teachers.models import TeacherAssignment
from common.tests.builders import AcademicAssessmentBuilder


class AdvancedExamBuilderApiTests(APITestCase):
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
        self._seed_questions_for_topic(self.topic_algebra, foundation=6, intermediate=6, advanced=6)
        self._seed_questions_for_topic(self.topic_numbers, foundation=8, intermediate=8, advanced=8)

    def _seed_questions_for_topic(self, topic, *, foundation, intermediate, advanced):
        counts = {
            "foundation": foundation,
            "intermediate": intermediate,
            "advanced": advanced,
        }
        for difficulty_level, total in counts.items():
            for index in range(total):
                self.builder.create_question_with_options(
                    self.context["institute"],
                    self.context["program"],
                    self.context["subject"],
                    topic,
                    self.teacher,
                    difficulty_level=difficulty_level,
                    question_text=f"{topic.code}-{difficulty_level}-{index}",
                    default_marks=Decimal("2.00"),
                    negative_marks=Decimal("0.25"),
                )

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
        self.assertEqual(response.data["resolved_exam"]["source_type"], ExamSourceType.TEACHER)
        self.assertEqual(
            response.data["resolved_exam"]["end_at"].date(),
            self.context["academic_year"].end_date,
        )

    def test_create_builds_exam_sections_questions_and_economy(self):
        self.client.force_authenticate(user=self.teacher_user)

        response = self.client.post(
            "/api/v1/exams/advanced-builder/create/",
            self._payload(),
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

        unlock_rule = UnlockRule.objects.get(content_key=exam_id, is_active=True)
        self.assertEqual(unlock_rule.rule_type, "score_threshold")
        self.assertEqual(unlock_rule.required_score_percentage, Decimal("75.00"))

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
