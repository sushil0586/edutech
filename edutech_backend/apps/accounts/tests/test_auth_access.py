from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import AccountProfile
from apps.attempts.services import save_answer, start_attempt, submit_attempt
from apps.economy.models import ContentAccessPolicy
from apps.economy.services import grant_admin_stars
from apps.exams.models import ExamSection, ExamSourceType
from apps.exams.services import publish_exam, sync_total_marks_from_questions
from apps.results.services import calculate_exam_performance_summary, generate_result_from_attempt
from common.tests.builders import AcademicAssessmentBuilder

User = get_user_model()


class AuthenticationAccessControlTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.exam = sync_total_marks_from_questions(self.context["exam"])
        self.exam.passing_marks = Decimal("1.00")
        self.exam.allow_review_after_submit = True
        self.exam.show_result_immediately = False
        self.exam.save(
            update_fields=[
                "passing_marks",
                "allow_review_after_submit",
                "show_result_immediately",
                "updated_at",
            ]
        )
        publish_exam(self.exam, changed_by=self.context["teacher"], remarks="Auth test publish")

        self.student_user, self.student_account = self.builder.create_student_account(
            institute=self.context["institute"],
            student_profile=self.context["student"],
            username="student-auth",
            password="Student@123",
            email="student-auth@example.com",
        )
        self.teacher_user, self.teacher_account = self.builder.create_teacher_account(
            institute=self.context["institute"],
            teacher_profile=self.context["teacher"],
            username="teacher-auth",
            password="Teacher@123",
            email="teacher-auth@example.com",
        )
        self.institute_admin_user, self.institute_admin_account = self.builder.create_institute_admin_account(
            institute=self.context["institute"],
            username="institute-admin-auth",
            password="Admin@123",
            email="institute-admin-auth@example.com",
        )

        self.other_student = self.builder.create_student(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            admission_no="STU002",
            email="vihaan@example.com",
            first_name="Vihaan",
            last_name="Gupta",
        )
        self.other_student_user, self.other_student_account = self.builder.create_student_account(
            institute=self.context["institute"],
            student_profile=self.other_student,
            username="other-student-auth",
            password="Student@123",
            email="other-student-auth@example.com",
        )

        self.other_context = self._build_other_institute_context()

        self.primary_attempt = self._complete_attempt(self.context["student"])
        self.other_attempt = self._complete_attempt(self.other_student)

        generate_result_from_attempt(self.primary_attempt)
        generate_result_from_attempt(self.other_attempt)
        calculate_exam_performance_summary(self.exam)

        self.client = APIClient()

    def _action_data(self, response):
        return response.data["data"]

    def _build_other_institute_context(self):
        institute = self.builder.create_institute(
            name="Other Institute",
            code="DLI002",
            email="other@demo.edu",
        )
        academic_year = self.builder.create_academic_year(
            institute,
            name="2027-2028",
        )
        program = self.builder.create_program(
            institute,
            name="Science Foundation",
            code="SCI11F",
        )
        cohort = self.builder.create_cohort(
            institute,
            program,
            academic_year,
            name="Science Batch A",
            code="SCI11A",
        )
        subject = self.builder.create_subject(
            institute,
            program,
            name="Science",
            code="SCI11",
        )
        topic = self.builder.create_topic(
            institute,
            subject,
            name="Chemistry Basics",
            code="CHEM-01",
        )
        teacher = self.builder.create_teacher(
            institute,
            employee_code="TCH002",
            email="other-teacher@example.com",
            first_name="Riya",
            last_name="Sen",
        )
        question, _ = self.builder.create_question_with_options(
            institute,
            program,
            subject,
            topic,
            teacher,
            question_text="What is H2O commonly called?",
            explanation="It is water.",
            options=[
                {"option_text": "Salt", "option_order": 1, "is_correct": False, "is_active": True},
                {"option_text": "Water", "option_order": 2, "is_correct": True, "is_active": True},
            ],
        )
        exam = self.builder.create_exam(
            institute,
            academic_year,
            program,
            cohort,
            subject,
            title="Science Quiz",
            code="SCI-QZ-01",
        )
        self.builder.add_question_to_exam(exam, question)
        exam = sync_total_marks_from_questions(exam)
        exam.passing_marks = Decimal("1.00")
        exam.save(update_fields=["passing_marks", "updated_at"])
        publish_exam(exam, changed_by=teacher, remarks="Other institute publish")
        student = self.builder.create_student(
            institute,
            academic_year,
            program,
            cohort,
            admission_no="STU901",
            email="other-student@example.com",
            first_name="Ira",
            last_name="Thomas",
        )
        teacher_user, _ = self.builder.create_teacher_account(
            institute=institute,
            teacher_profile=teacher,
            username="other-teacher-auth",
            password="Teacher@123",
            email="other-teacher-auth@example.com",
        )
        institute_admin_user, _ = self.builder.create_institute_admin_account(
            institute=institute,
            username="other-institute-admin-auth",
            password="Admin@123",
            email="other-institute-admin@example.com",
        )

        return {
            "institute": institute,
            "exam": exam,
            "question": question,
            "teacher": teacher,
            "student": student,
            "teacher_user": teacher_user,
            "institute_admin_user": institute_admin_user,
        }

    def _complete_attempt(self, student):
        correct_option = next(option for option in self.context["options"] if option.is_correct)
        attempt = start_attempt(student, self.exam)
        save_answer(
            attempt=attempt,
            question=self.context["question"],
            selected_option=correct_option,
            time_spent_seconds=15,
        )
        return submit_attempt(attempt)

    def _authenticate_with_token(self, username, password):
        cache.clear()
        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": username, "password": password},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        return response

    def test_login_and_me_endpoint_return_current_profile(self):
        login_response = self._authenticate_with_token("student-auth", "Student@123")

        self.assertEqual(login_response.data["user"]["role"], "student")
        self.assertEqual(str(login_response.data["user"]["student_profile"]), str(self.context["student"].id))
        self.assertEqual(
            login_response.data["user"]["display_name"],
            self.context["student"].full_name,
        )

        me_response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_response.data["username"], "student-auth")
        self.assertEqual(me_response.data["role"], "student")
        self.assertEqual(me_response.data["display_name"], self.context["student"].full_name)
        self.assertIsNotNone(me_response.data["student_context"])
        self.assertEqual(
            me_response.data["student_context"]["program_name"],
            self.context["program"].name,
        )
        self.assertIn(
            self.context["subject"].name,
            [item["label"] for item in me_response.data["student_context"]["subject_options"]],
        )

    def test_inactive_user_is_blocked_from_login(self):
        self.student_user.is_active = False
        self.student_user.save(update_fields=["is_active"])

        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": "student-auth", "password": "Student@123"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("inactive", str(response.data["detail"]).lower())

    def test_student_cannot_see_another_students_attempts_or_results(self):
        self._authenticate_with_token("student-auth", "Student@123")

        attempts_response = self.client.get("/api/v1/student/attempts/")
        self.assertEqual(attempts_response.status_code, 200)
        self.assertEqual(len(attempts_response.data), 1)
        self.assertEqual(str(attempts_response.data[0]["student"]), str(self.context["student"].id))
        self.assertEqual(str(attempts_response.data[0]["id"]), str(self.primary_attempt.id))

        results_response = self.client.get("/api/v1/student/results/")
        self.assertEqual(results_response.status_code, 200)
        self.assertEqual(len(results_response.data), 1)
        self.assertEqual(str(results_response.data[0]["student"]), str(self.context["student"].id))

        blocked_response = self.client.get(f"/api/v1/results/student/{self.other_student.id}/performance/")
        self.assertEqual(blocked_response.status_code, 403)

    def test_teacher_can_access_only_institute_exam_and_question_data(self):
        self._authenticate_with_token("teacher-auth", "Teacher@123")

        teacher_exams_response = self.client.get("/api/v1/teacher/exams/")
        self.assertEqual(teacher_exams_response.status_code, 200)
        self.assertEqual([str(item["id"]) for item in teacher_exams_response.data], [str(self.exam.id)])

        teacher_exams_page_response = self.client.get(
            "/api/v1/teacher/exams/?page=1&page_size=10&filter=all&sort=recommended"
        )
        self.assertEqual(teacher_exams_page_response.status_code, 200)
        self.assertEqual(teacher_exams_page_response.data["count"], 1)
        self.assertEqual(
            str(teacher_exams_page_response.data["results"][0]["id"]),
            str(self.exam.id),
        )

        ContentAccessPolicy.objects.create(
            institute=self.context["institute"],
            content_type="exam",
            content_key=str(self.exam.id),
            subject=self.context["subject"],
            policy_type="stars_only",
            star_cost=25,
            priority=10,
        )
        teacher_gated_exams_response = self.client.get(
            "/api/v1/teacher/exams/?page=1&page_size=10&filter=economy_gated&sort=recommended"
        )
        self.assertEqual(teacher_gated_exams_response.status_code, 200)
        self.assertEqual(teacher_gated_exams_response.data["count"], 1)
        self.assertEqual(
            teacher_gated_exams_response.data["summary"]["total_star_cost"],
            25,
        )

        teacher_questions_response = self.client.get("/api/v1/teacher/questions/")
        self.assertEqual(teacher_questions_response.status_code, 200)
        self.assertEqual(
            [str(item["id"]) for item in teacher_questions_response.data],
            [str(self.context["question"].id)],
        )

        summary_response = self.client.get("/api/v1/teacher/results/summary/")
        self.assertEqual(summary_response.status_code, 200)
        self.assertEqual(len(summary_response.data), 1)
        self.assertEqual(str(summary_response.data[0]["exam"]), str(self.exam.id))

    def test_teacher_has_read_only_access_to_academic_setup_lookups(self):
        self._authenticate_with_token("teacher-auth", "Teacher@123")

        subjects_response = self.client.get("/api/v1/academics/subjects/")
        self.assertEqual(subjects_response.status_code, 200)
        self.assertEqual(subjects_response.data["count"], 1)
        self.assertEqual(str(subjects_response.data["results"][0]["id"]), str(self.context["subject"].id))

        topics_response = self.client.get("/api/v1/academics/topics/")
        self.assertEqual(topics_response.status_code, 200)
        self.assertEqual(topics_response.data["count"], 1)
        self.assertEqual(str(topics_response.data["results"][0]["id"]), str(self.context["topic"].id))

        create_response = self.client.post(
            "/api/v1/academics/subjects/",
            {
                "institute": str(self.context["institute"].id),
                "program": str(self.context["program"].id),
                "name": "Teacher Cannot Create",
                "code": "TCC01",
                "description": "",
                "sort_order": 99,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 403)

        attempts_response = self.client.get(f"/api/v1/results/exam/{self.exam.id}/attempts/")
        self.assertEqual(attempts_response.status_code, 200)
        self.assertEqual(len(attempts_response.data), 2)

        analysis_response = self.client.get(
            f"/api/v1/results/exam/{self.exam.id}/question-analysis/"
        )
        self.assertEqual(analysis_response.status_code, 200)
        self.assertEqual(len(analysis_response.data), 1)
        self.assertEqual(str(analysis_response.data[0]["question_id"]), str(self.context["question"].id))

    def test_institute_admin_can_view_institute_dashboard_summary(self):
        self._authenticate_with_token("institute-admin-auth", "Admin@123")

        response = self.client.get("/api/v1/institute/dashboard/summary/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(str(response.data["institute"]["id"]), str(self.context["institute"].id))
        self.assertEqual(response.data["counts"]["students"], 2)
        self.assertIn("readiness_score", response.data["derived"])

    def test_student_available_exam_list_works_and_is_scoped(self):
        self._authenticate_with_token("student-auth", "Student@123")

        available_response = self.client.get("/api/v1/student/exams/available/")
        self.assertEqual(available_response.status_code, 200)
        self.assertEqual([str(item["id"]) for item in available_response.data], [str(self.exam.id)])
        self.assertEqual(available_response.data[0]["availability_state"], "completed")
        self.assertEqual(available_response.data[0]["attempts_used"], 1)
        self.assertTrue(available_response.data[0]["access_key_enabled"])
        self.assertIn("server_time", available_response.data[0])

    def test_student_can_resolve_exam_by_access_key(self):
        self._authenticate_with_token("student-auth", "Student@123")

        response = self.client.post(
            "/api/v1/student/exams/resolve-key/",
            {"access_key": self.exam.access_key},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(str(response.data["id"]), str(self.exam.id))
        self.assertEqual(response.data["code"], self.exam.code)
        self.assertNotIn("access_key", response.data)

    def test_student_exam_key_rejects_invalid_value(self):
        self._authenticate_with_token("student-auth", "Student@123")

        response = self.client.post(
            "/api/v1/student/exams/resolve-key/",
            {"access_key": "BADKEY99"},
            format="json",
        )

        self.assertEqual(response.status_code, 404)

    def test_student_can_access_only_own_topic_performance_rows(self):
        self._authenticate_with_token("student-auth", "Student@123")

        topic_response = self.client.get(
            "/api/v1/results/topic-performance/",
            {"exam": str(self.exam.id), "student": str(self.context["student"].id)},
        )
        self.assertEqual(topic_response.status_code, 200)
        self.assertTrue(
            all(
                str(item["student"]) == str(self.context["student"].id)
                for item in topic_response.data["results"]
            )
        )

        blocked_other_student = self.client.get(
            "/api/v1/results/topic-performance/",
            {"exam": str(self.exam.id), "student": str(self.other_student.id)},
        )
        self.assertEqual(blocked_other_student.status_code, 403)

        detail_response = self.client.get(f"/api/v1/student/exams/{self.exam.id}/detail/")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(str(detail_response.data["id"]), str(self.exam.id))
        self.assertEqual(detail_response.data["attempts_used"], 1)
        self.assertEqual(detail_response.data["remaining_attempts"], 0)

        missing_response = self.client.get(f"/api/v1/student/exams/{self.other_context['exam'].id}/detail/")
        self.assertEqual(missing_response.status_code, 404)

    def test_student_availability_payload_includes_resume_metadata(self):
        section = ExamSection.objects.create(
            exam=self.exam,
            name="Section A",
            section_order=1,
            total_questions=1,
            timer_enabled=True,
            duration_minutes=5,
            is_active=True,
        )
        self.context["exam_question"].section = section
        self.context["exam_question"].save(
            update_fields=["section", "section_name", "updated_at"]
        )
        self.exam.timer_mode = "hybrid"
        self.exam.save(update_fields=["timer_mode", "updated_at"])
        fresh_student = self.builder.create_student(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            admission_no="STU003",
            email="resume@example.com",
            first_name="Resume",
            last_name="Student",
        )
        self.builder.create_student_account(
            institute=self.context["institute"],
            student_profile=fresh_student,
            username="resume-student",
            password="Student@123",
            email="resume-student@example.com",
        )
        resume_attempt = start_attempt(fresh_student, self.exam)

        self._authenticate_with_token("resume-student", "Student@123")
        response = self.client.get("/api/v1/student/exams/available/")
        self.assertEqual(response.status_code, 200)
        payload = response.data[0]
        self.assertEqual(payload["availability_state"], "available_now")
        self.assertTrue(payload["can_resume"])
        self.assertFalse(payload["can_start"])
        self.assertEqual(str(payload["active_attempt"]["id"]), str(resume_attempt.id))
        self.assertEqual(
            payload["active_attempt"]["section_runtime"]["current_section_id"],
            str(section.id),
        )
        self.assertEqual(
            payload["active_attempt"]["section_runtime"]["current_section_name"],
            "Section A",
        )
        self.assertIsNotNone(
            payload["active_attempt"]["section_runtime"]["current_section_expires_at"]
        )

    def test_expired_in_progress_attempt_is_not_returned_as_resumable(self):
        fresh_student = self.builder.create_student(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            admission_no="STU099",
            email="expired-practice@example.com",
            first_name="Expired",
            last_name="Practice",
        )
        self.builder.create_student_account(
            institute=self.context["institute"],
            student_profile=fresh_student,
            username="expired-practice-student",
            password="Student@123",
            email="expired-practice-student@example.com",
        )
        expired_attempt = start_attempt(fresh_student, self.exam)
        expired_attempt.expires_at = self.builder.now - timedelta(minutes=5)
        expired_attempt.save(update_fields=["expires_at", "updated_at"])

        self._authenticate_with_token("expired-practice-student", "Student@123")
        response = self.client.get("/api/v1/student/exams/available/")
        self.assertEqual(response.status_code, 200)
        payload = response.data[0]
        self.assertEqual(payload["availability_state"], "completed")
        self.assertFalse(payload["can_resume"])
        self.assertFalse(payload["can_start"])
        self.assertIsNone(payload["active_attempt"])
        self.assertEqual(payload["latest_attempt_status"], "auto_submitted")

        expired_attempt.refresh_from_db()
        self.assertEqual(expired_attempt.status, "auto_submitted")
        self.assertTrue(expired_attempt.is_auto_submitted)

    def test_selected_student_assignment_limits_exam_visibility_and_start(self):
        assigned_student = self.builder.create_student(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            admission_no="STU004",
            email="assigned@example.com",
            first_name="Assigned",
            last_name="Student",
        )
        self.builder.create_student_account(
            institute=self.context["institute"],
            student_profile=assigned_student,
            username="assigned-student",
            password="Student@123",
            email="assigned-student@example.com",
        )

        self._authenticate_with_token("teacher-auth", "Teacher@123")
        assign_response = self.client.post(
            f"/api/v1/exams/{self.exam.id}/assign-students/",
            {
                "assignment_mode": "selected_students",
                "student_ids": [str(assigned_student.id)],
            },
            format="json",
        )
        self.assertEqual(assign_response.status_code, 200)
        self.assertEqual(assign_response.data["data"]["assignment_mode"], "selected_students")
        self.assertEqual(assign_response.data["data"]["assigned_student_count"], 1)

        self._authenticate_with_token("student-auth", "Student@123")
        available_response = self.client.get("/api/v1/student/exams/available/")
        self.assertEqual(available_response.status_code, 200)
        self.assertEqual(available_response.data, [])

        start_response = self.client.post(
            "/api/v1/attempts/start/",
            {"exam": str(self.exam.id), "student": str(self.context["student"].id)},
            format="json",
        )
        self.assertEqual(start_response.status_code, 400)
        self.assertIn("exam", start_response.data)

        self._authenticate_with_token("assigned-student", "Student@123")
        assigned_available_response = self.client.get("/api/v1/student/exams/available/")
        self.assertEqual(assigned_available_response.status_code, 200)
        self.assertEqual([str(item["id"]) for item in assigned_available_response.data], [str(self.exam.id)])

    def test_upcoming_and_expired_exams_cannot_be_started(self):
        self._authenticate_with_token("student-auth", "Student@123")

        upcoming_exam = self.builder.create_exam(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            self.context["subject"],
            title="Upcoming Exam",
            code="UPCOMING-01",
        )
        upcoming_exam.start_at = self.builder.now + timedelta(hours=2)
        upcoming_exam.end_at = self.builder.now + timedelta(hours=3)
        upcoming_exam.status = "scheduled"
        upcoming_exam.save(update_fields=["start_at", "end_at", "status", "updated_at"])
        self.builder.add_question_to_exam(upcoming_exam, self.context["question"])

        expired_exam = self.builder.create_exam(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            self.context["subject"],
            title="Expired Exam",
            code="EXPIRED-01",
        )
        expired_exam.start_at = self.builder.now - timedelta(hours=3)
        expired_exam.end_at = self.builder.now - timedelta(hours=1)
        expired_exam.status = "scheduled"
        expired_exam.save(update_fields=["start_at", "end_at", "status", "updated_at"])
        self.builder.add_question_to_exam(expired_exam, self.context["question"])

        upcoming_response = self.client.post(
            "/api/v1/attempts/start/",
            {"exam": str(upcoming_exam.id), "student": str(self.context["student"].id)},
            format="json",
        )
        self.assertEqual(upcoming_response.status_code, 400)

        expired_response = self.client.post(
            "/api/v1/attempts/start/",
            {"exam": str(expired_exam.id), "student": str(self.context["student"].id)},
            format="json",
        )
        self.assertEqual(expired_response.status_code, 400)

    def test_student_exam_payload_includes_star_access_lock_state(self):
        fresh_exam = self.builder.create_exam(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            self.context["subject"],
            title="Star Locked Exam",
            code="STAR-LOCK-01",
        )
        self.builder.add_question_to_exam(fresh_exam, self.context["question"])
        fresh_exam = sync_total_marks_from_questions(fresh_exam)
        fresh_exam.passing_marks = Decimal("1.00")
        fresh_exam.save(update_fields=["passing_marks", "updated_at"])
        publish_exam(fresh_exam, changed_by=self.context["teacher"], remarks="Star lock publish")

        ContentAccessPolicy.objects.create(
            institute=self.context["institute"],
            subject=self.context["subject"],
            content_type="exam",
            content_key=str(fresh_exam.id),
            content_label=fresh_exam.title,
            policy_type="stars_only",
            star_cost=120,
        )

        self._authenticate_with_token("student-auth", "Student@123")

        available_response = self.client.get("/api/v1/student/exams/available/")
        self.assertEqual(available_response.status_code, 200)
        payload = next(
            item for item in available_response.data if str(item["id"]) == str(fresh_exam.id)
        )
        economy_access = payload["economy_access"]
        self.assertEqual(economy_access["content_type"], "exam")
        self.assertEqual(economy_access["content_key"], str(fresh_exam.id))
        self.assertEqual(economy_access["subject_id"], str(self.context["subject"].id))
        self.assertEqual(economy_access["policy_type"], "stars_only")
        self.assertEqual(economy_access["star_cost"], 120)
        self.assertTrue(economy_access["is_locked"])
        self.assertFalse(payload["can_start"])
        self.assertEqual(payload["availability_state"], "locked")

        detail_response = self.client.get(f"/api/v1/student/exams/{fresh_exam.id}/detail/")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.data["economy_access"]["policy_type"], "stars_only")
        self.assertTrue(detail_response.data["economy_access"]["is_locked"])

    def test_student_must_unlock_star_locked_exam_before_starting(self):
        fresh_exam = self.builder.create_exam(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            self.context["subject"],
            title="Unlock Before Start",
            code="STAR-LOCK-02",
        )
        self.builder.add_question_to_exam(fresh_exam, self.context["question"])
        fresh_exam = sync_total_marks_from_questions(fresh_exam)
        fresh_exam.passing_marks = Decimal("1.00")
        fresh_exam.save(update_fields=["passing_marks", "updated_at"])
        publish_exam(fresh_exam, changed_by=self.context["teacher"], remarks="Unlock before start")

        ContentAccessPolicy.objects.create(
            institute=self.context["institute"],
            subject=self.context["subject"],
            content_type="exam",
            content_key=str(fresh_exam.id),
            content_label=fresh_exam.title,
            policy_type="stars_only",
            star_cost=120,
        )

        self._authenticate_with_token("student-auth", "Student@123")

        locked_response = self.client.post(
            "/api/v1/attempts/start/",
            {"exam": str(fresh_exam.id), "student": str(self.context["student"].id)},
            format="json",
        )
        self.assertEqual(locked_response.status_code, 400)
        self.assertIn("stars are required", str(locked_response.data["exam"][0]).lower())

        grant_admin_stars(
            student=self.context["student"],
            stars=200,
            reason="Unlock budget",
            created_by=self.institute_admin_user,
            metadata={"trigger": "test_unlock_budget"},
        )

        unlock_response = self.client.post(
            "/api/v1/economy/spend-stars/",
            {
                "content_type": "exam",
                "content_key": str(fresh_exam.id),
                "subject": str(self.context["subject"].id),
            },
            format="json",
        )
        self.assertEqual(unlock_response.status_code, 200)
        self.assertEqual(unlock_response.data["data"]["spent_stars"], 120)
        self.assertEqual(
            unlock_response.data["data"]["unlock_state"]["status"],
            "unlocked",
        )

        unlocked_start_response = self.client.post(
            "/api/v1/attempts/start/",
            {"exam": str(fresh_exam.id), "student": str(self.context["student"].id)},
            format="json",
        )
        self.assertEqual(unlocked_start_response.status_code, 201)

    def test_student_cannot_start_attempt_for_another_student(self):
        self._authenticate_with_token("student-auth", "Student@123")

        response = self.client.post(
            "/api/v1/attempts/start/",
            {"exam": str(self.exam.id), "student": str(self.other_student.id)},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_teacher_cannot_start_attempts_or_cross_tenant_result_actions(self):
        self._authenticate_with_token("teacher-auth", "Teacher@123")

        start_response = self.client.post(
            "/api/v1/attempts/start/",
            {"exam": str(self.exam.id), "student": str(self.context["student"].id)},
            format="json",
        )
        self.assertEqual(start_response.status_code, 403)

        own_generate = self.client.post(
            "/api/v1/results/generate-for-exam/",
            {"exam": str(self.exam.id)},
            format="json",
        )
        self.assertEqual(own_generate.status_code, 201)
        self.assertTrue(own_generate.data["success"])

        cross_generate = self.client.post(
            "/api/v1/results/generate-for-exam/",
            {"exam": str(self.other_context["exam"].id)},
            format="json",
        )
        self.assertEqual(cross_generate.status_code, 403)

    def test_institute_admin_cannot_cross_institute_boundaries(self):
        self._authenticate_with_token("institute-admin-auth", "Admin@123")

        generate_response = self.client.post(
            "/api/v1/results/generate-for-exam/",
            {"exam": str(self.other_context["exam"].id)},
            format="json",
        )
        self.assertEqual(generate_response.status_code, 403)

        rank_response = self.client.post(
            "/api/v1/results/calculate-ranks/",
            {"exam": str(self.other_context["exam"].id)},
            format="json",
        )
        self.assertEqual(rank_response.status_code, 403)

        publish_response = self.client.post(
            "/api/v1/results/publish-exam-results/",
            {"exam": str(self.other_context["exam"].id)},
            format="json",
        )
        self.assertEqual(publish_response.status_code, 403)

        live_monitor_response = self.client.get(
            f"/api/v1/results/exam/{self.other_context['exam'].id}/live-monitor/"
        )
        self.assertEqual(live_monitor_response.status_code, 403)

        other_attempt = start_attempt(self.other_context["student"], self.other_context["exam"])

        force_submit_response = self.client.post(
            "/api/v1/results/force-submit-attempt/",
            {"attempt": str(other_attempt.id)},
            format="json",
        )
        self.assertEqual(force_submit_response.status_code, 403)

        intervention_response = self.client.post(
            "/api/v1/results/attempt-intervention-note/",
            {
                "attempt": str(other_attempt.id),
                "note": "Cross institute admin access should fail.",
                "follow_up": "monitoring",
            },
            format="json",
        )
        self.assertEqual(intervention_response.status_code, 403)

        foreign_teacher_publish = self.client.post(
            f"/api/v1/exams/{self.exam.id}/publish/",
            {"changed_by": str(self.other_context["teacher"].id), "remarks": "Cross institute changed_by"},
            format="json",
        )
        self.assertEqual(foreign_teacher_publish.status_code, 403)
        self.assertIn("changed_by", foreign_teacher_publish.data)

        foreign_exam_cancel = self.client.post(
            f"/api/v1/exams/{self.other_context['exam'].id}/cancel/",
            {"remarks": "Cross institute cancel"},
            format="json",
        )
        self.assertEqual(foreign_exam_cancel.status_code, 404)

    def test_teacher_result_actions_reject_cross_tenant_exam_and_attempt_scope(self):
        self._authenticate_with_token("teacher-auth", "Teacher@123")

        rank_response = self.client.post(
            "/api/v1/results/calculate-ranks/",
            {"exam": str(self.other_context["exam"].id)},
            format="json",
        )
        self.assertEqual(rank_response.status_code, 403)

        publish_response = self.client.post(
            "/api/v1/results/publish-exam-results/",
            {"exam": str(self.other_context["exam"].id)},
            format="json",
        )
        self.assertEqual(publish_response.status_code, 403)

        live_monitor_response = self.client.get(
            f"/api/v1/results/exam/{self.other_context['exam'].id}/live-monitor/"
        )
        self.assertEqual(live_monitor_response.status_code, 403)

        other_attempt = start_attempt(self.other_context["student"], self.other_context["exam"])

        force_submit_response = self.client.post(
            "/api/v1/results/force-submit-attempt/",
            {"attempt": str(other_attempt.id)},
            format="json",
        )
        self.assertEqual(force_submit_response.status_code, 403)

        intervention_response = self.client.post(
            "/api/v1/results/attempt-intervention-note/",
            {
                "attempt": str(other_attempt.id),
                "note": "Cross tenant access should fail.",
                "follow_up": "monitoring",
            },
            format="json",
        )
        self.assertEqual(intervention_response.status_code, 403)

    def test_exam_publish_actions_reject_foreign_teacher_and_exam_scope(self):
        self._authenticate_with_token("teacher-auth", "Teacher@123")

        foreign_teacher_response = self.client.post(
            f"/api/v1/exams/{self.exam.id}/publish/",
            {"changed_by": str(self.other_context["teacher"].id), "remarks": "Cross tenant"},
            format="json",
        )
        self.assertEqual(foreign_teacher_response.status_code, 403)
        self.assertIn("changed_by", foreign_teacher_response.data)

        refresh_with_foreign_teacher = self.client.post(
            f"/api/v1/exams/{self.exam.id}/refresh-status/",
            {"changed_by": str(self.other_context["teacher"].id), "remarks": "Cross tenant refresh"},
            format="json",
        )
        self.assertEqual(refresh_with_foreign_teacher.status_code, 403)
        self.assertIn("changed_by", refresh_with_foreign_teacher.data)

        foreign_exam_response = self.client.post(
            f"/api/v1/exams/{self.other_context['exam'].id}/cancel/",
            {"remarks": "Cross tenant"},
            format="json",
        )
        self.assertEqual(foreign_exam_response.status_code, 404)

        own_preview_response = self.client.get(
            f"/api/v1/exams/{self.exam.id}/preview/"
        )
        self.assertEqual(own_preview_response.status_code, 200)
        self.assertEqual(str(own_preview_response.data["id"]), str(self.exam.id))

        foreign_preview_response = self.client.get(
            f"/api/v1/exams/{self.other_context['exam'].id}/preview/"
        )
        self.assertEqual(foreign_preview_response.status_code, 404)

    def test_teacher_can_toggle_and_regenerate_exam_access_key(self):
        self._authenticate_with_token("teacher-auth", "Teacher@123")
        original_key = self.exam.access_key

        toggle_response = self.client.post(
            f"/api/v1/exams/{self.exam.id}/toggle-access-key/",
            {"remarks": "Disable quick entry"},
            format="json",
        )
        self.assertEqual(toggle_response.status_code, 200)
        self.exam.refresh_from_db()
        self.assertFalse(self.exam.access_key_enabled)

        regenerate_response = self.client.post(
            f"/api/v1/exams/{self.exam.id}/regenerate-access-key/",
            {"remarks": "Rotate exam key"},
            format="json",
        )
        self.assertEqual(regenerate_response.status_code, 200)
        self.exam.refresh_from_db()
        self.assertNotEqual(self.exam.access_key, original_key)

    def test_teacher_exam_patch_with_invalid_window_returns_400(self):
        self._authenticate_with_token("teacher-auth", "Teacher@123")

        response = self.client.patch(
            f"/api/v1/exams/{self.exam.id}/",
            {
                "start_at": "2026-05-21T15:00:00Z",
                "end_at": "2026-05-21T14:00:00Z",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("end_at", response.data)

    def test_teacher_exam_create_inherits_institute_exam_defaults(self):
        self.context["institute"].metadata = {
            "exam_defaults": {
                "duration_minutes": 75,
                "navigation_mode": "hybrid",
                "timer_mode": "global",
                "attempt_policy": "latest",
                "review_mode": "attempted_only",
                "security_mode": "focus",
                "randomize_questions": True,
                "randomize_options": True,
                "allow_resume": True,
            }
        }
        self.context["institute"].save(update_fields=["metadata", "updated_at"])
        self._authenticate_with_token("teacher-auth", "Teacher@123")

        response = self.client.post(
            "/api/v1/exams/",
            {
                "institute": str(self.context["institute"].id),
                "academic_year": str(self.context["academic_year"].id),
                "program": str(self.context["program"].id),
                "cohort": str(self.context["cohort"].id),
                "subject": str(self.context["subject"].id),
                "title": "Defaults Driven Exam",
                "code": "DEFAULTS-01",
                "exam_type": "test",
                "delivery_mode": "online",
                "status": "draft",
                "total_marks": "0.00",
                "passing_marks": "0.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["duration_minutes"], 75)
        self.assertEqual(response.data["navigation_mode"], "hybrid")
        self.assertEqual(response.data["attempt_policy"], "latest")
        self.assertEqual(response.data["security_mode"], "focus")
        self.assertEqual(response.data["source_type"], ExamSourceType.TEACHER)
        self.assertTrue(response.data["randomize_questions"])
        self.assertTrue(response.data["randomize_options"])

    def test_teacher_exam_create_defaults_to_teacher_source_and_links_teacher(self):
        self._authenticate_with_token("teacher-auth", "Teacher@123")

        response = self.client.post(
            "/api/v1/exams/",
            {
                "institute": str(self.context["institute"].id),
                "academic_year": str(self.context["academic_year"].id),
                "program": str(self.context["program"].id),
                "cohort": str(self.context["cohort"].id),
                "subject": str(self.context["subject"].id),
                "title": "Teacher Owned Exam",
                "code": "TEACHER-SOURCE-01",
                "exam_type": "test",
                "delivery_mode": "online",
                "status": "draft",
                "duration_minutes": 60,
                "total_marks": "0.00",
                "passing_marks": "0.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["source_type"], ExamSourceType.TEACHER)
        self.assertEqual(str(response.data["source_teacher"]), str(self.context["teacher"].id))

    def test_teacher_can_create_institute_source_exam(self):
        self._authenticate_with_token("teacher-auth", "Teacher@123")

        response = self.client.post(
            "/api/v1/exams/",
            {
                "institute": str(self.context["institute"].id),
                "academic_year": str(self.context["academic_year"].id),
                "program": str(self.context["program"].id),
                "cohort": str(self.context["cohort"].id),
                "subject": str(self.context["subject"].id),
                "title": "Institute Owned Exam",
                "code": "INSTITUTE-SOURCE-01",
                "exam_type": "test",
                "delivery_mode": "online",
                "status": "draft",
                "source_type": ExamSourceType.INSTITUTE,
                "duration_minutes": 60,
                "total_marks": "0.00",
                "passing_marks": "0.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["source_type"], ExamSourceType.INSTITUTE)
        self.assertIsNone(response.data["source_teacher"])

    def test_institute_admin_exam_create_defaults_to_institute_source(self):
        self._authenticate_with_token("institute-admin-auth", "Admin@123")

        response = self.client.post(
            "/api/v1/exams/",
            {
                "institute": str(self.context["institute"].id),
                "academic_year": str(self.context["academic_year"].id),
                "program": str(self.context["program"].id),
                "cohort": str(self.context["cohort"].id),
                "subject": str(self.context["subject"].id),
                "title": "Institute Admin Default Source Exam",
                "code": "INST-DEFAULT-01",
                "exam_type": "test",
                "delivery_mode": "online",
                "status": "draft",
                "duration_minutes": 60,
                "total_marks": "0.00",
                "passing_marks": "0.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["source_type"], ExamSourceType.INSTITUTE)
        self.assertIsNone(response.data["source_teacher"])

    def test_institute_admin_cannot_create_teacher_source_exam(self):
        self._authenticate_with_token("institute-admin-auth", "Admin@123")

        response = self.client.post(
            "/api/v1/exams/",
            {
                "institute": str(self.context["institute"].id),
                "academic_year": str(self.context["academic_year"].id),
                "program": str(self.context["program"].id),
                "cohort": str(self.context["cohort"].id),
                "subject": str(self.context["subject"].id),
                "title": "Blocked Teacher Source Exam",
                "code": "INST-BLOCKED-01",
                "exam_type": "test",
                "delivery_mode": "online",
                "status": "draft",
                "source_type": ExamSourceType.TEACHER,
                "duration_minutes": 60,
                "total_marks": "0.00",
                "passing_marks": "0.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("source_type", response.data)

    def test_institute_admin_can_update_institute_exam_defaults(self):
        self._authenticate_with_token("institute-admin-auth", "Admin@123")

        response = self.client.patch(
            f"/api/v1/institutes/{self.context['institute'].id}/",
            {
                "exam_defaults": {
                    "duration_minutes": 90,
                    "timer_mode": "hybrid",
                    "navigation_mode": "free_section",
                    "attempt_policy": "best",
                    "result_publish_mode": "scheduled",
                    "review_mode": "solution_review",
                    "security_mode": "fullscreen",
                    "allow_resume": True,
                    "allow_section_switching": False,
                    "allow_return_to_previous_section": False,
                    "randomize_questions": True,
                }
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["exam_defaults"]["duration_minutes"], 90)
        self.assertEqual(response.data["exam_defaults"]["attempt_policy"], "best")
        self.assertEqual(response.data["exam_defaults"]["security_mode"], "fullscreen")
        self.assertFalse(response.data["exam_defaults"]["allow_section_switching"])

        self.context["institute"].refresh_from_db()
        self.assertEqual(self.context["institute"].metadata["exam_defaults"]["timer_mode"], "hybrid")

    def test_institute_detail_includes_linked_admin_login_metadata(self):
        self._authenticate_with_token("platform-admin-cred", "Platform@123")

        response = self.client.get(f"/api/v1/institutes/{self.context['institute'].id}/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["has_login"])
        self.assertEqual(response.data["login_username"], "institute-admin-cred")
        self.assertTrue(response.data["login_is_active"])
        self.assertEqual(response.data["account_user_id"], self.institute_admin_user.id)
        self.assertEqual(
            self.context["institute"].metadata["exam_defaults"]["review_mode"],
            "solution_review",
        )


class CredentialManagementApiTestCase(TestCase):
    def setUp(self):
        self.builder = AcademicAssessmentBuilder()
        self.context = self.builder.build_full_flow_entities()
        self.platform_admin_user, _ = self.builder.create_platform_admin_account(
            username="platform-admin-cred",
            password="Platform@123",
            email="platform-admin-cred@example.com",
        )
        self.student_user, _ = self.builder.create_student_account(
            institute=self.context["institute"],
            student_profile=self.context["student"],
            username="student-cred-existing",
            password="Student@123",
            email="student-cred-existing@example.com",
        )
        self.teacher_user, _ = self.builder.create_teacher_account(
            institute=self.context["institute"],
            teacher_profile=self.context["teacher"],
            username="teacher-cred-existing",
            password="Teacher@123",
            email="teacher-cred-existing@example.com",
        )
        self.institute_admin_user, _ = self.builder.create_institute_admin_account(
            institute=self.context["institute"],
            username="institute-admin-cred",
            password="Admin@123",
            email="institute-admin-cred@example.com",
        )
        self.fresh_student = self.builder.create_student(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            admission_no="STU900",
            first_name="Fresh",
            last_name="Student",
            email="fresh-student@example.com",
        )
        self.fresh_teacher = self.builder.create_teacher(
            self.context["institute"],
            employee_code="TCH900",
            first_name="Fresh",
            last_name="Teacher",
            email="fresh-teacher@example.com",
        )
        self.other_institute = self.builder.create_institute(
            name="Credential Other Institute",
            code="CRI002",
            email="credentials-other@example.com",
        )
        self.other_academic_year = self.builder.create_academic_year(
            self.other_institute,
            name="2027-2028",
        )
        self.other_program = self.builder.create_program(
            self.other_institute,
            name="Other Program",
            code="OTHPROG",
        )
        self.other_cohort = self.builder.create_cohort(
            self.other_institute,
            self.other_program,
            self.other_academic_year,
            name="Other Cohort",
            code="OTHC1",
        )
        self.other_student = self.builder.create_student(
            self.other_institute,
            self.other_academic_year,
            self.other_program,
            self.other_cohort,
            admission_no="STU990",
            first_name="Other",
            last_name="Student",
            email="other-student-cred@example.com",
        )
        self.other_teacher = self.builder.create_teacher(
            self.other_institute,
            employee_code="TCH990",
            first_name="Other",
            last_name="Teacher",
            email="other-teacher-cred@example.com",
        )
        self.client = APIClient()

    def _auth(self, username, password):
        user = User.objects.get(username=username)
        self.client.force_authenticate(user=user)

    def _authenticate_with_token(self, username, password):
        cache.clear()
        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": username, "password": password},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_admin_can_create_student_login_and_authenticate(self):
        self._auth("institute-admin-cred", "Admin@123")
        response = self.client.post(
            f"/api/v1/accounts/students/{self.fresh_student.id}/create-login/",
            {
                "username": "fresh-student-login",
                "password": "StrongPass@123",
                "confirm_password": "StrongPass@123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["username"], "fresh-student-login")
        self.assertIsNone(response.data["generated_password"])
        self.assertTrue(User.objects.filter(username="fresh-student-login").exists())
        self.assertTrue(AccountProfile.objects.filter(student_profile=self.fresh_student).exists())

        students_response = self.client.get("/api/v1/students/")
        self.assertEqual(students_response.status_code, 200)
        student_payload = next(item for item in students_response.data["results"] if item["id"] == str(self.fresh_student.id))
        self.assertTrue(student_payload["has_login"])
        self.assertEqual(student_payload["login_username"], "fresh-student-login")

        self.client.credentials()
        cache.clear()
        login_response = self.client.post(
            "/api/v1/auth/login/",
            {"username": "fresh-student-login", "password": "StrongPass@123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, 200)

    def test_platform_admin_can_create_institute_login_and_authenticate(self):
        self._auth("platform-admin-cred", "Platform@123")
        response = self.client.post(
            f"/api/v1/accounts/institutes/{self.other_institute.id}/create-login/",
            {"auto_generate": True},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["role"], "institute_admin")
        self.assertTrue(response.data["username"].startswith("cri002"))
        self.assertTrue(response.data["generated_password"])
        self.assertTrue(
            AccountProfile.objects.filter(
                institute=self.other_institute,
                role="institute_admin",
            ).exists()
        )

        institute_response = self.client.get(f"/api/v1/institutes/{self.other_institute.id}/")
        self.assertEqual(institute_response.status_code, 200)
        self.assertTrue(institute_response.data["has_login"])
        self.assertEqual(institute_response.data["login_username"], response.data["username"])

        self.client.credentials()
        cache.clear()
        login_response = self.client.post(
            "/api/v1/auth/login/",
            {
                "username": response.data["username"],
                "password": response.data["generated_password"],
            },
            format="json",
        )
        self.assertEqual(login_response.status_code, 200)

    def test_admin_can_update_student_accommodation_profile(self):
        self._auth("institute-admin-cred", "Admin@123")
        response = self.client.patch(
            f"/api/v1/students/{self.fresh_student.id}/",
            {
                "accommodation_profile": {
                    "extra_time_minutes": 20,
                    "additional_violation_allowance": 1,
                    "simplified_warning_copy": True,
                    "alternative_instructions": "Read each question carefully before answering.",
                }
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.fresh_student.refresh_from_db()
        self.assertEqual(
            self.fresh_student.accommodation_profile["extra_time_minutes"],
            20,
        )
        self.assertTrue(
            self.fresh_student.accommodation_profile["simplified_warning_copy"]
        )
        self.assertEqual(
            self.fresh_student.accommodation_profile["additional_violation_allowance"],
            1,
        )
        self.assertEqual(
            response.data["accommodation_profile"]["alternative_instructions"],
            "Read each question carefully before answering.",
        )

    def test_admin_can_create_teacher_login_with_auto_generate(self):
        self._auth("institute-admin-cred", "Admin@123")
        response = self.client.post(
            f"/api/v1/accounts/teachers/{self.fresh_teacher.id}/create-login/",
            {"auto_generate": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["username"].startswith("tch900"))
        self.assertTrue(response.data["generated_password"])
        self.assertTrue(AccountProfile.objects.filter(teacher_profile=self.fresh_teacher).exists())
        teachers_response = self.client.get("/api/v1/teachers/")
        self.assertEqual(teachers_response.status_code, 200)
        teacher_payload = next(item for item in teachers_response.data["results"] if item["id"] == str(self.fresh_teacher.id))
        self.assertTrue(teacher_payload["has_login"])

        self.client.credentials()
        cache.clear()
        login_response = self.client.post(
            "/api/v1/auth/login/",
            {
                "username": response.data["username"],
                "password": response.data["generated_password"],
            },
            format="json",
        )
        self.assertEqual(login_response.status_code, 200)

    def test_platform_admin_can_create_login_for_any_institute(self):
        self._auth("platform-admin-cred", "Platform@123")
        response = self.client.post(
            f"/api/v1/accounts/students/{self.other_student.id}/create-login/",
            {"auto_generate": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(AccountProfile.objects.filter(student_profile=self.other_student).exists())

    def test_institute_admin_cannot_create_login_for_another_institute(self):
        self._auth("institute-admin-cred", "Admin@123")
        response = self.client.post(
            f"/api/v1/accounts/teachers/{self.other_teacher.id}/create-login/",
            {"auto_generate": True},
            format="json",
        )
        self.assertEqual(response.status_code, 404)
        self.assertFalse(AccountProfile.objects.filter(teacher_profile=self.other_teacher).exists())

    def test_duplicate_login_and_duplicate_username_are_blocked(self):
        self._auth("institute-admin-cred", "Admin@123")
        existing_user = User.objects.get(username="teacher-cred-existing")
        response = self.client.post(
            f"/api/v1/accounts/teachers/{self.fresh_teacher.id}/create-login/",
            {
                "username": existing_user.username,
                "password": "StrongPass@123",
                "confirm_password": "StrongPass@123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("username", response.data)

        duplicate_response = self.client.post(
            f"/api/v1/accounts/teachers/{self.context['teacher'].id}/create-login/",
            {"auto_generate": True},
            format="json",
        )
        self.assertEqual(duplicate_response.status_code, 400)

    def test_password_mismatch_blocked(self):
        self._auth("institute-admin-cred", "Admin@123")
        response = self.client.post(
            f"/api/v1/accounts/students/{self.fresh_student.id}/create-login/",
            {
                "username": "student-mismatch",
                "password": "StrongPass@123",
                "confirm_password": "WrongPass@123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("confirm_password", response.data)

    def test_disabled_login_cannot_authenticate(self):
        self._auth("institute-admin-cred", "Admin@123")
        create_response = self.client.post(
            f"/api/v1/accounts/students/{self.fresh_student.id}/create-login/",
            {
                "username": "student-disable",
                "password": "StrongPass@123",
                "confirm_password": "StrongPass@123",
            },
            format="json",
        )
        user_id = create_response.data["user_id"]
        disable_response = self.client.post(
            f"/api/v1/accounts/users/{user_id}/disable/",
            {},
            format="json",
        )
        self.assertEqual(disable_response.status_code, 200)

        self.client.credentials()
        cache.clear()
        login_response = self.client.post(
            "/api/v1/auth/login/",
            {"username": "student-disable", "password": "StrongPass@123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, 400)

    def test_admin_can_reset_password_and_enable_login(self):
        self._auth("institute-admin-cred", "Admin@123")
        create_response = self.client.post(
            f"/api/v1/accounts/teachers/{self.fresh_teacher.id}/create-login/",
            {
                "username": "teacher-reset",
                "password": "StrongPass@123",
                "confirm_password": "StrongPass@123",
            },
            format="json",
        )
        user_id = create_response.data["user_id"]
        reset_response = self.client.post(
            f"/api/v1/accounts/users/{user_id}/reset-password/",
            {
                "new_password": "Stronger@456",
                "confirm_password": "Stronger@456",
            },
            format="json",
        )
        self.assertEqual(reset_response.status_code, 200)
        disable_response = self.client.post(f"/api/v1/accounts/users/{user_id}/disable/", {}, format="json")
        self.assertEqual(disable_response.status_code, 200)
        enable_response = self.client.post(f"/api/v1/accounts/users/{user_id}/enable/", {}, format="json")
        self.assertEqual(enable_response.status_code, 200)

        self.client.credentials()
        cache.clear()
        login_response = self.client.post(
            "/api/v1/auth/login/",
            {"username": "teacher-reset", "password": "Stronger@456"},
            format="json",
        )
        self.assertEqual(login_response.status_code, 200)

    def test_teacher_and_student_cannot_manage_credentials(self):
        self._auth("teacher-cred-existing", "Teacher@123")
        teacher_response = self.client.post(
            f"/api/v1/accounts/students/{self.fresh_student.id}/create-login/",
            {"auto_generate": True},
            format="json",
        )
        self.assertEqual(teacher_response.status_code, 403)

        self.client.credentials()
        self._auth("student-cred-existing", "Student@123")
        student_response = self.client.post(
            f"/api/v1/accounts/teachers/{self.fresh_teacher.id}/create-login/",
            {"auto_generate": True},
            format="json",
        )
        self.assertEqual(student_response.status_code, 403)

    def test_student_and_teacher_insight_endpoints_return_scoped_summaries(self):
        self._authenticate_with_token("student-cred-existing", "Student@123")
        student_summary_response = self.client.get("/api/v1/student/insights/summary/")
        self.assertEqual(student_summary_response.status_code, 200)
        self.assertEqual(
            str(student_summary_response.data["student_id"]),
            str(self.context["student"].id),
        )
        self.assertIn("average_percentage", student_summary_response.data)
        self.assertIn("insight_messages", student_summary_response.data)
        self.assertIn("source_breakdown", student_summary_response.data)
        self.assertIn("source_subject_breakdown", student_summary_response.data)
        self.assertIn("recent_exams", student_summary_response.data)
        if student_summary_response.data["recent_exams"]:
            self.assertIn("source_label", student_summary_response.data["recent_exams"][0])

        self._authenticate_with_token("teacher-cred-existing", "Teacher@123")
        teacher_summary_response = self.client.get("/api/v1/teacher/insights/summary/")
        self.assertEqual(teacher_summary_response.status_code, 200)
        self.assertIn("overview", teacher_summary_response.data)
        self.assertIn("weak_topics", teacher_summary_response.data)

        question_performance_response = self.client.get(
            "/api/v1/teacher/questions/performance/"
        )
        self.assertEqual(question_performance_response.status_code, 200)
        self.assertEqual(len(question_performance_response.data), 1)
        self.assertEqual(
            str(question_performance_response.data[0]["question_id"]),
            str(self.context["question"].id),
        )

    def test_student_available_exams_can_be_filtered_by_source_and_teacher(self):
        second_teacher = self.builder.create_teacher(
            self.context["institute"],
            employee_code="TCHSRC02",
            email="teacher-source-2@example.com",
            first_name="Kiran",
            last_name="Mehta",
        )

        def create_source_exam(*, code, title, source_type, source_teacher=None):
            exam = self.builder.create_exam(
                self.context["institute"],
                self.context["academic_year"],
                self.context["program"],
                self.context["cohort"],
                self.context["subject"],
                title=title,
                code=code,
                source_type=source_type,
                source_teacher=source_teacher,
            )
            self.builder.add_question_to_exam(exam, self.context["question"], question_order=1)
            exam = sync_total_marks_from_questions(exam)
            exam.passing_marks = Decimal("1.00")
            exam.save(update_fields=["passing_marks", "updated_at"])
            publish_exam(
                exam,
                changed_by=source_teacher or self.context["teacher"],
                remarks=f"{title} publish",
            )
            return exam

        institute_exam = create_source_exam(
            code="SRC-INSTITUTE-STUDENT-01",
            title="Institute Source Mock",
            source_type=ExamSourceType.INSTITUTE,
        )
        platform_exam = create_source_exam(
            code="SRC-PLATFORM-STUDENT-01",
            title="Platform Source Mock",
            source_type=ExamSourceType.PLATFORM,
        )
        teacher_exam = create_source_exam(
            code="SRC-TEACHER-STUDENT-01",
            title="Teacher Source Mock",
            source_type=ExamSourceType.TEACHER,
            source_teacher=self.context["teacher"],
        )
        second_teacher_exam = create_source_exam(
            code="SRC-TEACHER-STUDENT-02",
            title="Teacher Source Mock 2",
            source_type=ExamSourceType.TEACHER,
            source_teacher=second_teacher,
        )

        self._authenticate_with_token("student-cred-existing", "Student@123")

        all_response = self.client.get("/api/v1/student/exams/available/")
        self.assertEqual(all_response.status_code, 200)
        all_codes = {item["code"] for item in all_response.data}
        self.assertIn(institute_exam.code, all_codes)
        self.assertIn(platform_exam.code, all_codes)
        self.assertIn(teacher_exam.code, all_codes)
        self.assertIn(second_teacher_exam.code, all_codes)

        platform_response = self.client.get("/api/v1/student/exams/available/?source=platform")
        self.assertEqual(platform_response.status_code, 200)
        self.assertEqual(
            {item["code"] for item in platform_response.data},
            {platform_exam.code},
        )

        institute_response = self.client.get("/api/v1/student/exams/available/?source=institute")
        self.assertEqual(institute_response.status_code, 200)
        institute_codes = {item["code"] for item in institute_response.data}
        self.assertIn(institute_exam.code, institute_codes)
        self.assertNotIn(platform_exam.code, institute_codes)
        self.assertNotIn(teacher_exam.code, institute_codes)

        teacher_response = self.client.get("/api/v1/student/exams/available/?source=teacher")
        self.assertEqual(teacher_response.status_code, 200)
        self.assertEqual(
            {item["code"] for item in teacher_response.data},
            {teacher_exam.code, second_teacher_exam.code},
        )

        teacher_specific_response = self.client.get(
            f"/api/v1/student/exams/available/?source=teacher&teacher={self.context['teacher'].id}"
        )
        self.assertEqual(teacher_specific_response.status_code, 200)
        self.assertEqual(
            {item["code"] for item in teacher_specific_response.data},
            {teacher_exam.code},
        )

        invalid_response = self.client.get("/api/v1/student/exams/available/?source=invalid")
        self.assertEqual(invalid_response.status_code, 400)
        self.assertIn("source", invalid_response.data)

    def test_unauthenticated_access_is_blocked_on_protected_endpoints(self):
        student_response = self.client.get("/api/v1/student/exams/available/")
        self.assertEqual(student_response.status_code, 401)

        teacher_response = self.client.get("/api/v1/teacher/exams/")
        self.assertEqual(teacher_response.status_code, 401)

        attempt_response = self.client.get("/api/v1/attempts/")
        self.assertEqual(attempt_response.status_code, 401)

    def test_student_attempt_answers_hide_correctness_when_review_is_not_allowed(self):
        locked_exam = self.builder.create_exam(
            self.context["institute"],
            self.context["academic_year"],
            self.context["program"],
            self.context["cohort"],
            self.context["subject"],
            title="Locked Review Exam",
            code="LOCKED-EXAM-01",
            allow_review_after_submit=False,
            show_result_immediately=False,
        )
        self.builder.add_question_to_exam(locked_exam, self.context["question"], question_order=1)
        locked_exam = sync_total_marks_from_questions(locked_exam)
        locked_exam.passing_marks = Decimal("1.00")
        locked_exam.save(update_fields=["passing_marks", "updated_at"])
        publish_exam(locked_exam, changed_by=self.context["teacher"], remarks="Locked review publish")

        correct_option = next(option for option in self.context["options"] if option.is_correct)
        locked_attempt = start_attempt(self.context["student"], locked_exam)
        save_answer(
            attempt=locked_attempt,
            question=self.context["question"],
            selected_option=correct_option,
            time_spent_seconds=12,
        )
        submit_attempt(locked_attempt)

        self._authenticate_with_token("student-cred-existing", "Student@123")
        attempts_response = self.client.get("/api/v1/student/attempts/")
        self.assertEqual(attempts_response.status_code, 200)

        locked_attempt_payload = next(
            item for item in attempts_response.data if str(item["id"]) == str(locked_attempt.id)
        )
        self.assertEqual(len(locked_attempt_payload["answers"]), 1)
        self.assertNotIn("is_correct", locked_attempt_payload["answers"][0])
        self.assertNotIn("marks_awarded", locked_attempt_payload["answers"][0])
