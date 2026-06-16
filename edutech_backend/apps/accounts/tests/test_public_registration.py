from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts import services as account_services
from apps.accounts.models import AccountAcquisition, AccountLocation, AccountProfile
from apps.academics.models import AcademicYear, Program
from apps.economy.models import ReferralEvent
from apps.geography.models import City, Country, PostalCode, State
from apps.institutes.models import Institute
from apps.parents.models import ParentProfile
from apps.students.models import StudentProfile
from apps.teachers.models import TeacherProfile


User = get_user_model()


class PublicRegistrationApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.registration_institute = Institute.objects.create(
            name="Nexora Public School",
            code="NPS",
            email="nps@example.com",
        )
        self.country = Country.objects.create(name="India", code="IN", sort_order=10)
        self.state = State.objects.create(
            country=self.country,
            name="Delhi",
            code="DL",
            sort_order=10,
        )
        self.city = City.objects.create(
            state=self.state,
            name="Delhi",
            sort_order=10,
        )
        PostalCode.objects.create(city=self.city, code="110001", sort_order=10)
        self.secondary_city = City.objects.create(
            state=self.state,
            name="New Delhi",
            sort_order=20,
        )
        PostalCode.objects.create(city=self.secondary_city, code="110002", sort_order=10)

    def test_student_registration_creates_login_and_public_profile(self):
        response = self.client.post(
            "/api/v1/auth/register/",
            {
                "role": "student",
                "first_name": "Aarav",
                "last_name": "Sharma",
                "email": "aarav.student@example.com",
                "phone": "9876543210",
                "password": "Student@12345",
                "confirm_password": "Student@12345",
                "school_code": "NPS",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["role"], "student")
        self.assertEqual(response.data["user"]["display_name"], "Aarav Sharma")
        self.assertIsNone(response.data["user"]["student_context"])
        self.assertEqual(response.data["user"]["onboarding_status"], "not_started")
        self.assertTrue(response.data["user"]["profile_completion_required"])
        self.assertEqual(response.data["user"]["onboarding_role"], "student")
        self.assertEqual(response.data["user"]["onboarding_version"], "v1_public_quick_signup")

        user = User.objects.get(username="aarav.student@example.com")
        self.assertTrue(user.check_password("Student@12345"))

        profile = AccountProfile.objects.get(user=user)
        self.assertEqual(profile.role, "student")
        self.assertEqual(profile.institute_id, self.registration_institute.id)
        self.assertTrue(profile.registration_context)
        self.assertEqual(profile.registration_context["school_code"], "NPS")
        self.assertEqual(profile.registration_context["school_name"], "Nexora Public School")
        self.assertEqual(profile.onboarding_status, "not_started")
        self.assertTrue(profile.profile_completion_required)
        self.assertEqual(profile.onboarding_role, "student")
        self.assertEqual(profile.registration_context["phone"], "9876543210")
        self.assertIsNone(profile.student_profile_id)
        self.assertFalse(StudentProfile.objects.filter(email="aarav.student@example.com").exists())
        self.assertFalse(Program.objects.filter(institute=self.registration_institute).exists())

        login_response = self.client.post(
            "/api/v1/auth/login/",
            {"username": "aarav.student@example.com", "password": "Student@12345"},
            format="json",
        )
        self.assertEqual(login_response.status_code, 200)
        self.assertTrue(login_response.data["user"]["profile_completion_required"])

    def test_teacher_registration_creates_teacher_profile(self):
        response = self.client.post(
            "/api/v1/auth/register/",
            {
                "role": "teacher",
                "first_name": "Neha",
                "last_name": "Kapoor",
                "email": "neha.teacher@example.com",
                "phone": "9876500000",
                "password": "Teacher@12345",
                "confirm_password": "Teacher@12345",
                "school_code": "NPS",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["user"]["role"], "teacher")
        self.assertEqual(response.data["user"]["onboarding_status"], "not_started")
        self.assertTrue(response.data["user"]["profile_completion_required"])
        self.assertIn("location_context", response.data["user"])
        self.assertIn("acquisition_context", response.data["user"])

        profile = AccountProfile.objects.get(user__username="neha.teacher@example.com")
        self.assertEqual(profile.role, "teacher")
        self.assertIsNone(profile.teacher_profile_id)
        self.assertEqual(profile.registration_context["school_code"], "NPS")
        self.assertEqual(profile.registration_context["school_name"], "Nexora Public School")
        self.assertEqual(profile.onboarding_role, "teacher")
        self.assertFalse(TeacherProfile.objects.filter(email="neha.teacher@example.com").exists())

    def test_parent_registration_creates_parent_profile(self):
        response = self.client.post(
            "/api/v1/auth/register/",
            {
                "role": "parent",
                "first_name": "Rakesh",
                "last_name": "Sharma",
                "email": "rakesh.parent@example.com",
                "phone": "9876555555",
                "password": "Parent@12345",
                "confirm_password": "Parent@12345",
                "school_code": "NPS",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["user"]["role"], "parent")

        profile = AccountProfile.objects.get(user__username="rakesh.parent@example.com")
        self.assertEqual(profile.role, "parent")
        self.assertEqual(profile.registration_context["school_code"], "NPS")
        self.assertEqual(profile.registration_context["school_name"], "Nexora Public School")
        self.assertTrue(profile.institute_id)
        self.assertIn("parent_context", response.data["user"])
        self.assertIsNone(response.data["user"]["parent_context"]["parent_profile_id"])
        self.assertTrue(response.data["user"]["profile_completion_required"])
        self.assertFalse(ParentProfile.objects.filter(account_profile=profile).exists())

    def test_student_registration_applies_valid_referral_code(self):
        response = self.client.post(
            "/api/v1/auth/register/",
            {
                "role": "student",
                "first_name": "Aarav",
                "last_name": "Sharma",
                "email": "aarav.referred@example.com",
                "phone": "9876543210",
                "password": "Student@12345",
                "confirm_password": "Student@12345",
                "school_code": "NPS",
                "referral_code": "NEXORA-ABC123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        referred_profile = AccountProfile.objects.get(user__username="aarav.referred@example.com")
        self.assertEqual(referred_profile.registration_context["referral_code"], "NEXORA-ABC123")
        self.assertIsNone(referred_profile.student_profile_id)
        self.assertEqual(ReferralEvent.objects.count(), 0)
        acquisition = AccountAcquisition.objects.get(account_profile=referred_profile)
        self.assertEqual(acquisition.referral_channel, "code")
        self.assertEqual(acquisition.referral_identifier, "NEXORA-ABC123")

    def test_registration_persists_detected_location_and_acquisition_metadata(self):
        response = self.client.post(
            "/api/v1/auth/register/",
            {
                "role": "student",
                "first_name": "Geo",
                "last_name": "Aware",
                "email": "geo.aware@example.com",
                "phone": "9811111111",
                "password": "Student@12345",
                "confirm_password": "Student@12345",
                "school_code": "NPS",
                "signup_source": "public_web",
                "landing_variant": "quick-signup-v2",
                "platform": "web",
                "device_category": "desktop",
                "browser_family": "chrome",
                "utm_source": "google",
                "utm_medium": "cpc",
                "utm_campaign": "launch_june",
                "invite_code": "INVITE-001",
                "detected_country": "India",
                "detected_state": "Delhi",
                "detected_city": "New Delhi",
                "detected_pincode": "110001",
                "detected_timezone": "Asia/Kolkata",
                "detection_source": "ip_lookup",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        profile = AccountProfile.objects.get(user__username="geo.aware@example.com")
        location = AccountLocation.objects.get(account_profile=profile)
        acquisition = AccountAcquisition.objects.get(account_profile=profile)

        self.assertEqual(location.detected_country, "India")
        self.assertEqual(location.detected_state, "Delhi")
        self.assertEqual(location.detected_city, "New Delhi")
        self.assertEqual(location.detection_source, "ip_lookup")
        self.assertIsNotNone(location.detected_at)

        self.assertEqual(acquisition.signup_source, "public_web")
        self.assertEqual(acquisition.platform, "web")
        self.assertEqual(acquisition.utm_source, "google")
        self.assertEqual(acquisition.invite_code, "INVITE-001")
        self.assertEqual(acquisition.school_name_text, "Nexora Public School")
        self.assertEqual(acquisition.school_normalization_status, "matched_existing")

    def test_duplicate_email_is_rejected(self):
        self.client.post(
            "/api/v1/auth/register/",
            {
                "role": "student",
                "first_name": "Aarav",
                "email": "duplicate@example.com",
                "phone": "9876543210",
                "password": "Student@12345",
                "confirm_password": "Student@12345",
                "school_code": "NPS",
            },
            format="json",
        )

        response = self.client.post(
            "/api/v1/auth/register/",
            {
                "role": "teacher",
                "first_name": "Neha",
                "email": "duplicate@example.com",
                "phone": "9876500000",
                "password": "Teacher@12345",
                "confirm_password": "Teacher@12345",
                "school_code": "NPS",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("already exists", str(response.data).lower())

    def test_phone_is_required_for_public_registration(self):
        response = self.client.post(
            "/api/v1/auth/register/",
            {
                "role": "student",
                "first_name": "Aarav",
                "email": "missing.phone@example.com",
                "password": "Student@12345",
                "confirm_password": "Student@12345",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("phone", response.data)

    def test_registration_options_are_exposed_from_backend(self):
        response = self.client.get("/api/v1/auth/register/options/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("schools", response.data)
        self.assertIn("class_levels", response.data)
        self.assertIn("boards", response.data)
        self.assertIn("student_exam_interests", response.data)
        self.assertIn("teacher_focus_options", response.data)
        self.assertIn("parent_focus_options", response.data)
        self.assertIn("subject_catalog", response.data)
        self.assertIn("location_catalog", response.data)
        self.assertIn("exam_catalog", response.data)
        self.assertIn("public_institute", response.data)
        self.assertEqual(response.data["location_catalog"][0]["country"], "India")
        self.assertEqual(response.data["location_catalog"][0]["states"][0]["name"], "Delhi")
        self.assertEqual(
            response.data["location_catalog"][0]["states"][0]["cities"][0]["name"],
            "Delhi",
        )
        self.assertIn(
            "110001",
            response.data["location_catalog"][0]["states"][0]["cities"][0]["pincodes"],
        )

    def test_public_onboarding_reuses_existing_overlapping_academic_year(self):
        AcademicYear.objects.create(
            institute=self.registration_institute,
            name="2026 Existing Session",
            start_date=account_services.date.today().replace(month=4, day=1),
            end_date=account_services.date.today().replace(month=3, day=31).replace(
                year=account_services.date.today().year + 1
            ),
            is_current=False,
            is_active=True,
        )

        response = self.client.post(
            "/api/v1/auth/register/",
            {
                "role": "student",
                "first_name": "Aarav",
                "last_name": "Reuse",
                "email": "aarav.reuse@example.com",
                "phone": "9876543211",
                "password": "Student@12345",
                "confirm_password": "Student@12345",
                "school_code": "NPS",
            },
            format="json",
        )
        user = User.objects.get(username="aarav.reuse@example.com")
        self.client.force_authenticate(user=user)

        completion = self.client.patch(
            "/api/v1/onboarding/profile/",
            {
                "class_level": "7",
                "board": "CBSE",
                "exam_interest": "Olympiad",
                "subject_interests": ["Math", "Science"],
                "country": "India",
                "state": "Delhi",
                "city": "Delhi",
                "pincode": "110001",
                "timezone": "Asia/Kolkata",
                "school_code": "NPS",
            },
            format="json",
        )

        self.assertEqual(completion.status_code, 200, completion.data)
        profile = AccountProfile.objects.get(user=user)
        self.assertIsNotNone(profile.student_profile)
        self.assertEqual(profile.student_profile.academic_year.institute_id, self.registration_institute.id)
        self.assertTrue(profile.student_profile.academic_year.is_current)

    def test_student_onboarding_completion_creates_student_profile_and_marks_account_complete(self):
        registration = self.client.post(
            "/api/v1/auth/register/",
            {
                "role": "student",
                "first_name": "Aarav",
                "last_name": "Sharma",
                "email": "aarav.complete@example.com",
                "phone": "9876543210",
                "password": "Student@12345",
                "confirm_password": "Student@12345",
                "school_code": "NPS",
            },
            format="json",
        )
        user = User.objects.get(username="aarav.complete@example.com")
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            "/api/v1/onboarding/profile/",
            {
                "class_level": "7",
                "board": "CBSE",
                "exam_interest": "Olympiad",
                "subject_interests": ["Math", "Science"],
                "country": "India",
                "state": "Delhi",
                "city": "Delhi",
                "pincode": "110001",
                "timezone": "Asia/Kolkata",
                "school_code": "NPS",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["onboarding_status"], "completed")
        self.assertFalse(response.data["profile_completion_required"])
        self.assertIsNotNone(response.data["student_profile"])
        self.assertIsNotNone(response.data["student_context"])
        self.assertEqual(response.data["location_context"]["confirmed_country"], "India")
        self.assertEqual(response.data["acquisition_context"]["school_normalization_status"], "confirmed_by_user")

        profile = AccountProfile.objects.get(user=user)
        self.assertEqual(profile.onboarding_status, "completed")
        self.assertFalse(profile.profile_completion_required)
        self.assertIsNotNone(profile.profile_completion_completed_at)
        self.assertIsNotNone(profile.student_profile_id)
        self.assertEqual(profile.registration_context["class_level"], "7")
        self.assertEqual(profile.registration_context["country"], "India")
        location = AccountLocation.objects.get(account_profile=profile)
        self.assertEqual(location.confirmed_country, "India")
        self.assertEqual(location.confirmed_city, "Delhi")
        self.assertIsNotNone(location.confirmed_at)

    def test_parent_onboarding_completion_creates_parent_profile_and_marks_account_complete(self):
        registration = self.client.post(
            "/api/v1/auth/register/",
            {
                "role": "parent",
                "first_name": "Rakesh",
                "last_name": "Sharma",
                "email": "parent.complete@example.com",
                "phone": "9999999999",
                "password": "Parent@12345",
                "confirm_password": "Parent@12345",
                "school_code": "NPS",
            },
            format="json",
        )
        user = User.objects.get(username="parent.complete@example.com")
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            "/api/v1/onboarding/profile/",
            {
                "child_class_level": "10",
                "child_board": "CBSE",
                "parent_focus": "Readiness",
                "country": "India",
                "state": "Delhi",
                "city": "Delhi",
                "pincode": "110001",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        profile = AccountProfile.objects.get(user=user)
        self.assertEqual(profile.onboarding_status, "completed")
        self.assertFalse(profile.profile_completion_required)
        self.assertTrue(ParentProfile.objects.filter(account_profile=profile).exists())

    def test_teacher_onboarding_completion_creates_teacher_profile_and_marks_account_complete(self):
        registration = self.client.post(
            "/api/v1/auth/register/",
            {
                "role": "teacher",
                "first_name": "Neha",
                "last_name": "Kapoor",
                "email": "teacher.complete@example.com",
                "phone": "8888888888",
                "password": "Teacher@12345",
                "confirm_password": "Teacher@12345",
                "school_code": "NPS",
            },
            format="json",
        )
        user = User.objects.get(username="teacher.complete@example.com")
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            "/api/v1/onboarding/profile/",
            {
                "teaching_focus": "Competitive exams",
                "teaching_scope": ["Math", "Science"],
                "country": "India",
                "state": "Delhi",
                "city": "Delhi",
                "pincode": "110001",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        profile = AccountProfile.objects.get(user=user)
        self.assertEqual(profile.onboarding_status, "completed")
        self.assertFalse(profile.profile_completion_required)
        self.assertTrue(TeacherProfile.objects.filter(pk=profile.teacher_profile_id).exists())

    def test_onboarding_completion_rejects_missing_required_fields(self):
        self.client.post(
            "/api/v1/auth/register/",
            {
                "role": "student",
                "first_name": "Aarav",
                "email": "student.invalid.complete@example.com",
                "phone": "9876543210",
                "password": "Student@12345",
                "confirm_password": "Student@12345",
            },
            format="json",
        )
        user = User.objects.get(username="student.invalid.complete@example.com")
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            "/api/v1/onboarding/profile/",
            {
                "class_level": "7",
                "country": "India",
                "state": "Delhi",
                "city": "Delhi",
                "pincode": "110001",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("board", response.data)
        self.assertIn("exam_interest", response.data)

    def test_onboarding_completion_rejects_invalid_location_chain(self):
        self.client.post(
            "/api/v1/auth/register/",
            {
                "role": "student",
                "first_name": "Aarav",
                "email": "student.invalid.location@example.com",
                "phone": "9876543210",
                "password": "Student@12345",
                "confirm_password": "Student@12345",
            },
            format="json",
        )
        user = User.objects.get(username="student.invalid.location@example.com")
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            "/api/v1/onboarding/profile/",
            {
                "class_level": "7",
                "board": "CBSE",
                "exam_interest": "Olympiad",
                "country": "India",
                "state": "Delhi",
                "city": "Delhi",
                "pincode": "999999",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("pincode", response.data)
