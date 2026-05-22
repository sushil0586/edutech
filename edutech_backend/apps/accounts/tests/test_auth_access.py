from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import AccountProfile
from apps.attempts.services import save_answer, start_attempt, submit_attempt
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

        me_response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_response.data["username"], "student-auth")
        self.assertEqual(me_response.data["role"], "student")

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

    def test_student_available_exam_list_works_and_is_scoped(self):
        self._authenticate_with_token("student-auth", "Student@123")

        available_response = self.client.get("/api/v1/student/exams/available/")
        self.assertEqual(available_response.status_code, 200)
        self.assertEqual([str(item["id"]) for item in available_response.data], [str(self.exam.id)])
        self.assertEqual(available_response.data[0]["availability_state"], "completed")
        self.assertEqual(available_response.data[0]["attempts_used"], 1)
        self.assertIn("server_time", available_response.data[0])

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

    def test_exam_publish_actions_reject_foreign_teacher_and_exam_scope(self):
        self._authenticate_with_token("teacher-auth", "Teacher@123")

        foreign_teacher_response = self.client.post(
            f"/api/v1/exams/{self.exam.id}/publish/",
            {"changed_by": str(self.other_context["teacher"].id), "remarks": "Cross tenant"},
            format="json",
        )
        self.assertEqual(foreign_teacher_response.status_code, 403)

        foreign_exam_response = self.client.post(
            f"/api/v1/exams/{self.other_context['exam'].id}/cancel/",
            {"remarks": "Cross tenant"},
            format="json",
        )
        self.assertEqual(foreign_exam_response.status_code, 404)

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
