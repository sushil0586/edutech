import logging
from decimal import Decimal

from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth import get_user_model
from django.db.models import Case, Count, IntegerField, Prefetch, Q, Value, When
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.permissions import (
    CanBuildExams,
    CanManageQuestionBank,
    CanViewAnalytics,
    IsPlatformOrInstituteAdmin,
    IsStudent,
    IsTeacherOrInstituteAdmin,
)
from apps.accounts.models import AccountProfile
from apps.accounts.services import (
    create_institute_login,
    create_student_login,
    create_teacher_login,
    generate_temporary_password,
    get_public_registration_options,
    get_scoped_institute_for_admin,
    get_scoped_student_for_admin,
    get_scoped_teacher_for_admin,
    get_scoped_user_for_admin,
)
from apps.accounts.scopes import (
    scope_exam_queryset,
    scope_question_queryset,
    scope_student_queryset,
    scope_teacher_queryset,
)
from apps.accounts.serializers import (
    AccountProfileSerializer,
    CreateLoginSerializer,
    LoginSerializer,
    OnboardingProfileSerializer,
    PublicRegistrationSerializer,
    RefreshTokenSerializer,
    ResetPasswordSerializer,
    StudentExamAccessKeySerializer,
)
from apps.attempts.models import (
    AttemptIntegrityEvent,
    StudentAnswer,
    StudentAnswerReviewTask,
    StudentExamAttempt,
)
from apps.attempts.serializers import StudentExamAttemptSerializer
from apps.attempts.services import REVIEW_TASK_UNRESOLVED_STATUSES
from apps.academics.models import AcademicYear, Cohort, Program, Subject, Topic
from apps.exams.models import Exam, ExamAccessSlot, ExamQuestion, ExamSection
from apps.exams.models import ExamStudentAssignment
from apps.exams.serializers import (
    ExamListSerializer,
    ExamReadSerializer,
    StudentExamAvailabilitySerializer,
    StudentExamCatalogSerializer,
    StudentExamDashboardSerializer,
    StudentExamDiscoverySerializer,
    StudentExamFollowUpSerializer,
    StudentExamReadinessSerializer,
)
from apps.exams.services import STUDENT_EXAM_SOURCE_FILTERS
from apps.exams.services import is_exam_assigned_to_student
from apps.exams.services import filter_student_visible_exams_by_source
from apps.question_bank.models import Question
from apps.question_bank.serializers import QuestionSerializer
from apps.reports.services import create_audit_log
from apps.reports.services import ensure_exam_window_notifications
from apps.results.models import ExamPerformanceSummary, ExamResult
from apps.results.serializers import (
    ExamPerformanceSummarySerializer,
    ExamResultListSerializer,
    ExamResultSerializer,
)
from apps.attempts.services import REVIEW_TASK_UNRESOLVED_STATUSES
from apps.results.services import (
    INSTITUTE_DASHBOARD_SUMMARY_CACHE_TTL_SECONDS,
    build_student_insight_summary,
    build_student_question_analytics,
    build_teacher_insight_summary,
    build_teacher_question_performance_summary,
    get_institute_dashboard_summary_cache_key,
)
from apps.exams.services import resolve_exam_experience_profile
from apps.institutes.models import Institute
from apps.students.models import StudentProfile
from apps.teachers.models import TeacherProfile
from common.throttles import LoginRateThrottle
from common.throttles import RegistrationRateThrottle
from common.throttles import TokenRefreshRateThrottle
from common.throttles import AdminProvisionRateThrottle
from common.pagination import StandardResultsSetPagination


auth_logger = logging.getLogger("nexora.auth")
User = get_user_model()


def _hydrate_exam_access_policies(exams):
    from apps.exams.services import hydrate_exam_access_policies

    return hydrate_exam_access_policies(exams)


def _get_hydrated_account_profile_for_session(user):
    return (
        AccountProfile.objects.select_related(
            "user",
            "institute",
            "student_profile__program",
            "student_profile__academic_year",
            "student_profile__cohort",
            "teacher_profile",
            "parent_profile",
            "location_profile",
            "acquisition_profile",
        )
        .filter(user=user)
        .first()
    )


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    @extend_schema(
        request=LoginSerializer,
        responses=inline_serializer(
            name="LoginResponse",
            fields={
                "refresh": serializers.CharField(),
                "access": serializers.CharField(),
                "user": serializers.DictField(),
            },
        ),
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError:
            auth_logger.warning(
                "Login failed",
                extra={
                    "username": request.data.get("username", ""),
                    "ip_address": request.META.get("REMOTE_ADDR", ""),
                },
            )
            create_audit_log(
                action="login_failed",
                entity_type="auth",
                entity_id=request.data.get("username", "unknown"),
                message="Login attempt failed.",
                metadata={"username": request.data.get("username", "")},
                request=request,
            )
            raise
        payload = serializer.save()
        user = serializer.validated_data["user"]
        create_audit_log(
            user=user,
            institute=getattr(getattr(user, "account_profile", None), "institute", None),
            action="login",
            entity_type="user",
            entity_id=user.id,
            message="User logged in successfully.",
            metadata={"username": user.username},
            request=request,
        )
        return Response(payload, status=status.HTTP_200_OK)


class PublicRegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RegistrationRateThrottle]

    @extend_schema(
        request=PublicRegistrationSerializer,
        responses=inline_serializer(
            name="PublicRegisterResponse",
            fields={
                "refresh": serializers.CharField(),
                "access": serializers.CharField(),
                "user": serializers.DictField(),
            },
        ),
    )
    def post(self, request):
        serializer = PublicRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account_profile = serializer.save()
        user = account_profile.user
        refresh = RefreshToken.for_user(user)
        create_audit_log(
            user=user,
            institute=account_profile.institute,
            action="public_registration",
            entity_type="user",
            entity_id=user.id,
            message="Public registration completed.",
            metadata={
                "username": user.username,
                "role": account_profile.role,
            },
            request=request,
        )
        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": AccountProfileSerializer(account_profile).data,
            },
            status=status.HTTP_201_CREATED,
        )


class PublicRegistrationOptionsView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        responses=inline_serializer(
            name="PublicRegistrationOptionsResponse",
            fields={
                "roles": serializers.ListField(child=serializers.DictField(), required=False),
                "class_levels": serializers.ListField(child=serializers.DictField(), required=False),
                "boards": serializers.ListField(child=serializers.DictField(), required=False),
                "exam_interests": serializers.ListField(child=serializers.DictField(), required=False),
                "subject_interests": serializers.ListField(child=serializers.DictField(), required=False),
            },
        )
    )
    def get(self, request):
        return Response(get_public_registration_options(), status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses=inline_serializer(
            name="MeResponse",
            fields={
                "id": serializers.UUIDField(),
                "username": serializers.CharField(),
                "email": serializers.CharField(),
                "display_name": serializers.CharField(),
                "role": serializers.CharField(),
                "institute": serializers.UUIDField(allow_null=True),
                "student_profile": serializers.UUIDField(allow_null=True),
                "teacher_profile": serializers.UUIDField(allow_null=True),
                "registration_context": serializers.DictField(),
                "student_context": serializers.DictField(required=False, allow_null=True),
                "parent_context": serializers.DictField(required=False, allow_null=True),
                "location_context": serializers.DictField(required=False, allow_null=True),
                "acquisition_context": serializers.DictField(required=False, allow_null=True),
                "is_active": serializers.BooleanField(),
            },
        )
    )
    def get(self, request):
        profile = _get_hydrated_account_profile_for_session(request.user)
        if profile is None:
            return Response({"detail": "Account profile is inactive or missing."}, status=status.HTTP_404_NOT_FOUND)
        return Response(AccountProfileSerializer(profile).data)


class OnboardingProfileView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=OnboardingProfileSerializer,
        responses=inline_serializer(
            name="OnboardingProfileResponse",
            fields={
                "id": serializers.UUIDField(),
                "username": serializers.CharField(),
                "email": serializers.CharField(),
                "display_name": serializers.CharField(),
                "role": serializers.CharField(),
                "registration_context": serializers.DictField(),
                "onboarding_status": serializers.CharField(),
                "profile_completion_required": serializers.BooleanField(),
                "is_active": serializers.BooleanField(),
            },
        ),
    )
    def patch(self, request):
        serializer = OnboardingProfileSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        account_profile = serializer.save()
        create_audit_log(
            user=request.user,
            institute=account_profile.institute,
            action="onboarding_profile_complete",
            entity_type="user",
            entity_id=request.user.id,
            message="Public onboarding profile completed.",
            metadata={"role": account_profile.role},
            request=request,
        )
        return Response(AccountProfileSerializer(account_profile).data, status=status.HTTP_200_OK)


class RefreshSessionView(TokenRefreshView):
    permission_classes = [AllowAny]
    throttle_classes = [TokenRefreshRateThrottle]
    serializer_class = RefreshTokenSerializer


class StudentCreateLoginView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]
    throttle_classes = [AdminProvisionRateThrottle]

    @extend_schema(
        request=CreateLoginSerializer,
        responses={
            201: OpenApiResponse(
                response=inline_serializer(
                    name="StudentCreateLoginResponse",
                    fields={
                        "user_id": serializers.IntegerField(),
                        "username": serializers.CharField(),
                        "generated_password": serializers.CharField(allow_null=True),
                        "role": serializers.CharField(),
                    },
                )
            ),
            404: OpenApiResponse(description="Student not found."),
        },
    )
    def post(self, request, student_id):
        admin_profile = request.user.account_profile
        student = get_scoped_student_for_admin(
            student_id=student_id,
            requesting_profile=admin_profile,
        )
        if student is None:
            return Response({"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CreateLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            account_profile, generated_password = create_student_login(
                student=student,
                username=serializer.validated_data.get("username") or None,
                password=serializer.validated_data.get("password") or None,
                auto_generate=serializer.validated_data.get("auto_generate", False),
            )
        except DjangoValidationError as exc:
            detail = exc.message_dict if getattr(exc, "message_dict", None) else {"detail": exc.messages}
            return Response(detail, status=status.HTTP_400_BAD_REQUEST)

        create_audit_log(
            user=request.user,
            institute=student.institute,
            action="student_login_create",
            entity_type="student_profile",
            entity_id=student.id,
            message="Student login created.",
            metadata={"created_username": account_profile.user.username},
            request=request,
        )
        return Response(
            {
                "user_id": account_profile.user.id,
                "username": account_profile.user.username,
                "generated_password": generated_password,
                "role": account_profile.role,
            },
            status=status.HTTP_201_CREATED,
        )


class InstituteCreateLoginView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]
    throttle_classes = [AdminProvisionRateThrottle]

    @extend_schema(
        request=CreateLoginSerializer,
        responses={
            201: OpenApiResponse(
                response=inline_serializer(
                    name="InstituteCreateLoginResponse",
                    fields={
                        "user_id": serializers.IntegerField(),
                        "username": serializers.CharField(),
                        "generated_password": serializers.CharField(allow_null=True),
                        "role": serializers.CharField(),
                    },
                )
            ),
            404: OpenApiResponse(description="Institute not found."),
        },
    )
    def post(self, request, institute_id):
        admin_profile = request.user.account_profile
        institute = get_scoped_institute_for_admin(
            institute_id=institute_id,
            requesting_profile=admin_profile,
        )
        if institute is None:
            return Response({"detail": "Institute not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CreateLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            account_profile, generated_password = create_institute_login(
                institute=institute,
                username=serializer.validated_data.get("username") or None,
                password=serializer.validated_data.get("password") or None,
                auto_generate=serializer.validated_data.get("auto_generate", False),
            )
        except DjangoValidationError as exc:
            detail = exc.message_dict if getattr(exc, "message_dict", None) else {"detail": exc.messages}
            return Response(detail, status=status.HTTP_400_BAD_REQUEST)

        create_audit_log(
            user=request.user,
            institute=institute,
            action="institute_login_create",
            entity_type="institute",
            entity_id=institute.id,
            message="Institute admin login created.",
            metadata={"created_username": account_profile.user.username},
            request=request,
        )
        return Response(
            {
                "user_id": account_profile.user.id,
                "username": account_profile.user.username,
                "generated_password": generated_password,
                "role": account_profile.role,
            },
            status=status.HTTP_201_CREATED,
        )


class TeacherCreateLoginView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]
    throttle_classes = [AdminProvisionRateThrottle]

    @extend_schema(
        request=CreateLoginSerializer,
        responses={
            201: OpenApiResponse(
                response=inline_serializer(
                    name="TeacherCreateLoginResponse",
                    fields={
                        "user_id": serializers.IntegerField(),
                        "username": serializers.CharField(),
                        "generated_password": serializers.CharField(allow_null=True),
                        "role": serializers.CharField(),
                    },
                )
            ),
            404: OpenApiResponse(description="Teacher not found."),
        },
    )
    def post(self, request, teacher_id):
        admin_profile = request.user.account_profile
        teacher = get_scoped_teacher_for_admin(
            teacher_id=teacher_id,
            requesting_profile=admin_profile,
        )
        if teacher is None:
            return Response({"detail": "Teacher not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CreateLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            account_profile, generated_password = create_teacher_login(
                teacher=teacher,
                username=serializer.validated_data.get("username") or None,
                password=serializer.validated_data.get("password") or None,
                auto_generate=serializer.validated_data.get("auto_generate", False),
            )
        except DjangoValidationError as exc:
            detail = exc.message_dict if getattr(exc, "message_dict", None) else {"detail": exc.messages}
            return Response(detail, status=status.HTTP_400_BAD_REQUEST)

        create_audit_log(
            user=request.user,
            institute=teacher.institute,
            action="teacher_login_create",
            entity_type="teacher_profile",
            entity_id=teacher.id,
            message="Teacher login created.",
            metadata={"created_username": account_profile.user.username},
            request=request,
        )
        return Response(
            {
                "user_id": account_profile.user.id,
                "username": account_profile.user.username,
                "generated_password": generated_password,
                "role": account_profile.role,
            },
            status=status.HTTP_201_CREATED,
        )


class UserResetPasswordView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    @extend_schema(
        request=ResetPasswordSerializer,
        responses={
            200: OpenApiResponse(
                response=inline_serializer(
                    name="UserResetPasswordResponse",
                    fields={
                        "user_id": serializers.IntegerField(),
                        "username": serializers.CharField(),
                        "generated_password": serializers.CharField(allow_null=True),
                    },
                )
            ),
            404: OpenApiResponse(description="User not found."),
        },
    )
    def post(self, request, user_id):
        admin_profile = request.user.account_profile
        user = get_scoped_user_for_admin(user_id=user_id, requesting_profile=admin_profile)
        if user is None:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        generated_password = None
        if serializer.validated_data.get("auto_generate", False):
            new_password = generate_temporary_password()
            generated_password = new_password
        else:
            new_password = serializer.validated_data["new_password"]

        user.set_password(new_password)
        user.save(update_fields=["password"])
        create_audit_log(
            user=request.user,
            institute=getattr(getattr(user, "account_profile", None), "institute", None),
            action="user_password_reset",
            entity_type="user",
            entity_id=user.id,
            message="User password reset.",
            metadata={"target_username": user.username},
            request=request,
        )
        return Response(
            {
                "user_id": user.id,
                "username": user.username,
                "generated_password": generated_password,
            }
        )


class UserDisableView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    @extend_schema(
        request=None,
        responses={
            200: OpenApiResponse(
                response=inline_serializer(
                    name="UserDisableResponse",
                    fields={
                        "user_id": serializers.IntegerField(),
                        "is_active": serializers.BooleanField(),
                    },
                )
            ),
            404: OpenApiResponse(description="User not found."),
        },
    )
    def post(self, request, user_id):
        admin_profile = request.user.account_profile
        user = get_scoped_user_for_admin(user_id=user_id, requesting_profile=admin_profile)
        if user is None:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        user.is_active = False
        user.save(update_fields=["is_active"])
        create_audit_log(
            user=request.user,
            institute=getattr(getattr(user, "account_profile", None), "institute", None),
            action="user_login_disable",
            entity_type="user",
            entity_id=user.id,
            message="User login disabled.",
            metadata={"target_username": user.username},
            request=request,
        )
        return Response({"user_id": user.id, "is_active": user.is_active})


class UserEnableView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    @extend_schema(
        request=None,
        responses={
            200: OpenApiResponse(
                response=inline_serializer(
                    name="UserEnableResponse",
                    fields={
                        "user_id": serializers.IntegerField(),
                        "is_active": serializers.BooleanField(),
                    },
                )
            ),
            404: OpenApiResponse(description="User not found."),
        },
    )
    def post(self, request, user_id):
        admin_profile = request.user.account_profile
        user = get_scoped_user_for_admin(user_id=user_id, requesting_profile=admin_profile)
        if user is None:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        user.is_active = True
        user.save(update_fields=["is_active"])
        create_audit_log(
            user=request.user,
            institute=getattr(getattr(user, "account_profile", None), "institute", None),
            action="user_login_enable",
            entity_type="user",
            entity_id=user.id,
            message="User login enabled.",
            metadata={"target_username": user.username},
            request=request,
        )
        return Response({"user_id": user.id, "is_active": user.is_active})


class StudentAvailableExamView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    @extend_schema(
        parameters=[
            OpenApiParameter(name="source", type=str, required=False, enum=sorted(STUDENT_EXAM_SOURCE_FILTERS)),
            OpenApiParameter(name="compact", type=bool, required=False),
            OpenApiParameter(name="discovery", type=bool, required=False),
            OpenApiParameter(name="dashboard", type=bool, required=False),
            OpenApiParameter(name="catalog", type=bool, required=False),
            OpenApiParameter(name="exam_type", type=str, required=False),
            OpenApiParameter(name="exclude_exam_type", type=str, required=False),
            OpenApiParameter(name="teacher", type=str, required=False),
        ],
        responses=inline_serializer(
            name="StudentAvailableExamItem",
            fields={
                "id": serializers.UUIDField(),
                "title": serializers.CharField(),
                "code": serializers.CharField(),
                "exam_type": serializers.CharField(required=False),
                "status": serializers.CharField(required=False),
                "source_type": serializers.CharField(required=False),
                "availability_state": serializers.CharField(required=False),
                "can_start": serializers.BooleanField(required=False),
                "can_resume": serializers.BooleanField(required=False),
                "start_access": serializers.DictField(required=False),
                "economy_access": serializers.DictField(required=False),
            },
            many=True,
        ),
    )
    def get(self, request):
        student = request.user.account_profile.student_profile
        student_attempts_queryset = (
            StudentExamAttempt.objects.filter(
                student=student,
                is_active=True,
            )
            .select_related("result")
            .prefetch_related(
                Prefetch(
                    "review_tasks",
                    queryset=StudentAnswerReviewTask.objects.filter(
                        is_active=True,
                        status__in=REVIEW_TASK_UNRESOLVED_STATUSES,
                    ).only("id", "attempt_id"),
                    to_attr="_prefetched_unresolved_review_tasks",
                )
            )
        )
        source_filter = str(request.query_params.get("source", "all") or "all").strip().lower()
        compact = str(request.query_params.get("compact", "") or "").strip().lower() == "true"
        discovery = (
            str(request.query_params.get("discovery", "") or "").strip().lower()
            in {"1", "true", "yes"}
        )
        dashboard = (
            str(request.query_params.get("dashboard", "") or "").strip().lower()
            in {"1", "true", "yes"}
        )
        catalog = (
            str(request.query_params.get("catalog", "") or "").strip().lower()
            in {"1", "true", "yes"}
        )
        exam_type_filter = str(request.query_params.get("exam_type", "") or "").strip().lower()
        exclude_exam_type_filter = str(
            request.query_params.get("exclude_exam_type", "") or ""
        ).strip().lower()
        teacher_filter = str(
            request.query_params.get("teacher")
            or request.query_params.get("teacher_id")
            or ""
        ).strip()
        if source_filter not in STUDENT_EXAM_SOURCE_FILTERS:
            raise ValidationError({"source": "Invalid source filter."})
        if compact or discovery:
            queryset = scope_exam_queryset(
                Exam.objects.select_related(
                    "institute",
                    "subject",
                    "source_teacher",
                ),
                request.user,
            ).filter(is_active=True).prefetch_related(
                Prefetch(
                    "student_assignments",
                    queryset=ExamStudentAssignment.objects.filter(
                        is_active=True
                    ).select_related("access_slot"),
                    to_attr="_prefetched_student_assignments",
                ),
                Prefetch(
                    "access_slots",
                    queryset=ExamAccessSlot.objects.filter(
                        is_active=True,
                        status="active",
                    )
                    .annotate(
                        active_assignment_count=Count(
                            "student_assignments",
                            filter=Q(student_assignments__is_active=True),
                            distinct=True,
                        ),
                        active_attempt_count=Count(
                            "attempts",
                            filter=Q(attempts__is_active=True, attempts__status="in_progress"),
                            distinct=True,
                        ),
                    )
                    .order_by("slot_start_at", "created_at"),
                    to_attr="_prefetched_active_access_slots",
                ),
                Prefetch(
                    "attempts",
                    queryset=student_attempts_queryset,
                    to_attr="_prefetched_attempts_for_student",
                ),
            )
        elif dashboard or catalog:
            queryset = scope_exam_queryset(
                Exam.objects.select_related(
                    "institute",
                    "subject",
                    "source_teacher",
                ),
                request.user,
            ).filter(is_active=True).prefetch_related(
                Prefetch(
                    "sections",
                    queryset=ExamSection.objects.filter(is_active=True)
                    .select_related("subject")
                    .order_by("section_order", "created_at"),
                ),
                Prefetch(
                    "student_assignments",
                    queryset=ExamStudentAssignment.objects.filter(
                        is_active=True
                    ).select_related("access_slot"),
                    to_attr="_prefetched_student_assignments",
                ),
                Prefetch(
                    "access_slots",
                    queryset=ExamAccessSlot.objects.filter(
                        is_active=True,
                        status="active",
                    )
                    .annotate(
                        active_assignment_count=Count(
                            "student_assignments",
                            filter=Q(student_assignments__is_active=True),
                            distinct=True,
                        ),
                        active_attempt_count=Count(
                            "attempts",
                            filter=Q(attempts__is_active=True, attempts__status="in_progress"),
                            distinct=True,
                        ),
                    )
                    .order_by("slot_start_at", "created_at"),
                    to_attr="_prefetched_active_access_slots",
                ),
                Prefetch(
                    "attempts",
                    queryset=student_attempts_queryset,
                    to_attr="_prefetched_attempts_for_student",
                ),
            )
        else:
            queryset = scope_exam_queryset(
                Exam.objects.select_related(
                    "institute",
                    "academic_year",
                    "program",
                    "cohort",
                    "subject",
                    "source_teacher",
                ),
                request.user,
            ).filter(is_active=True).prefetch_related(
                Prefetch(
                    "sections",
                    queryset=ExamSection.objects.filter(is_active=True)
                    .select_related("subject")
                    .order_by("section_order", "created_at"),
                ),
                Prefetch(
                    "student_assignments",
                    queryset=ExamStudentAssignment.objects.filter(
                        is_active=True
                    ).select_related("access_slot"),
                    to_attr="_prefetched_student_assignments",
                ),
                Prefetch(
                    "access_slots",
                    queryset=ExamAccessSlot.objects.filter(
                        is_active=True,
                        status="active",
                    )
                    .annotate(
                        active_assignment_count=Count(
                            "student_assignments",
                            filter=Q(student_assignments__is_active=True),
                            distinct=True,
                        ),
                        active_attempt_count=Count(
                            "attempts",
                            filter=Q(attempts__is_active=True, attempts__status="in_progress"),
                            distinct=True,
                        ),
                    )
                    .order_by("slot_start_at", "created_at"),
                    to_attr="_prefetched_active_access_slots",
                ),
                Prefetch(
                    "attempts",
                    queryset=student_attempts_queryset,
                    to_attr="_prefetched_attempts_for_student",
                )
            )
        if exam_type_filter:
            queryset = queryset.filter(exam_type=exam_type_filter)
        if exclude_exam_type_filter:
            queryset = queryset.exclude(exam_type=exclude_exam_type_filter)
        exams = [exam for exam in queryset if is_exam_assigned_to_student(exam, student)]
        exams = filter_student_visible_exams_by_source(
            exams,
            source=source_filter,
            teacher_id=teacher_filter or None,
        )
        _hydrate_exam_access_policies(exams)
        if not compact and not discovery and not dashboard and not catalog:
            ensure_exam_window_notifications(student, exams)
        if catalog:
            serializer_class = StudentExamCatalogSerializer
        elif dashboard:
            serializer_class = StudentExamDashboardSerializer
        elif discovery:
            serializer_class = StudentExamDiscoverySerializer
        elif compact:
            serializer_class = StudentExamFollowUpSerializer
        else:
            serializer_class = StudentExamAvailabilitySerializer
        return Response(
            serializer_class(
                exams,
                many=True,
                context={"request": request, "persist_unlock_state": False},
            ).data
        )


class StudentExamDetailView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    @extend_schema(
        parameters=[OpenApiParameter(name="exam_id", type=str, location=OpenApiParameter.PATH)],
        responses={
            200: OpenApiResponse(
                response=inline_serializer(
                    name="StudentExamReadinessResponse",
                    fields={
                        "id": serializers.UUIDField(),
                        "title": serializers.CharField(),
                        "code": serializers.CharField(),
                        "status": serializers.CharField(),
                        "start_access": serializers.DictField(required=False),
                        "security_policy": serializers.DictField(required=False),
                        "sections": serializers.ListField(child=serializers.DictField(), required=False),
                        "questions": serializers.ListField(child=serializers.DictField(), required=False),
                    },
                )
            ),
            404: OpenApiResponse(description="Exam not found."),
        },
    )
    def get(self, request, exam_id):
        student = request.user.account_profile.student_profile
        queryset = scope_exam_queryset(
            Exam.objects.select_related(
                "institute",
                "academic_year",
                "program",
                "cohort",
                "subject",
                "source_teacher",
            ).prefetch_related(
                Prefetch(
                    "sections",
                    queryset=ExamSection.objects.filter(is_active=True)
                    .select_related("subject")
                    .order_by("section_order", "created_at"),
                ),
                Prefetch(
                    "exam_questions",
                    queryset=ExamQuestion.objects.filter(is_active=True)
                    .select_related(
                        "section",
                        "question",
                        "question__passage",
                    )
                    .prefetch_related(
                        "question__options",
                        "question__attachments",
                    )
                    .order_by("question_order", "created_at"),
                ),
                Prefetch(
                    "attempts",
                    queryset=StudentExamAttempt.objects.filter(student=student, is_active=True).select_related("result"),
                    to_attr="_prefetched_attempts_for_student",
                ),
            ),
            request.user,
        ).filter(pk=exam_id, is_active=True)
        queryset = queryset.prefetch_related(
            Prefetch(
                "student_assignments",
                queryset=ExamStudentAssignment.objects.filter(is_active=True).select_related(
                    "access_slot"
                ),
                to_attr="_prefetched_student_assignments",
            ),
            Prefetch(
                "access_slots",
                queryset=ExamAccessSlot.objects.filter(
                    is_active=True,
                    status="active",
                ).order_by("slot_start_at", "created_at"),
                to_attr="_prefetched_active_access_slots",
            ),
        )
        exam = queryset.first()
        if exam is None or not is_exam_assigned_to_student(exam, student):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        _hydrate_exam_access_policies([exam])
        return Response(
            StudentExamReadinessSerializer(exam, context={"request": request}).data
        )


class StudentExamAccessKeyResolveView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    @extend_schema(
        request=StudentExamAccessKeySerializer,
        responses={
            200: OpenApiResponse(
                response=inline_serializer(
                    name="StudentExamAccessKeyResolveResponse",
                    fields={
                        "id": serializers.UUIDField(),
                        "title": serializers.CharField(),
                        "code": serializers.CharField(),
                        "status": serializers.CharField(),
                        "start_access": serializers.DictField(required=False),
                        "security_policy": serializers.DictField(required=False),
                        "sections": serializers.ListField(child=serializers.DictField(), required=False),
                        "questions": serializers.ListField(child=serializers.DictField(), required=False),
                    },
                )
            ),
            403: OpenApiResponse(description="Exam is not available to this student."),
            404: OpenApiResponse(description="Invalid exam key."),
        },
    )
    def post(self, request):
        serializer = StudentExamAccessKeySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = request.user.account_profile.student_profile
        access_key = serializer.validated_data["access_key"]

        queryset = scope_exam_queryset(
            Exam.objects.select_related(
                "institute",
                "academic_year",
                "program",
                "cohort",
                "subject",
                "source_teacher",
            ).prefetch_related(
                Prefetch(
                    "sections",
                    queryset=ExamSection.objects.filter(is_active=True)
                    .select_related("subject")
                    .order_by("section_order", "created_at"),
                ),
                Prefetch(
                    "exam_questions",
                    queryset=ExamQuestion.objects.filter(is_active=True)
                    .select_related(
                        "section",
                        "question",
                        "question__passage",
                    )
                    .prefetch_related(
                        "question__options",
                        "question__attachments",
                    )
                    .order_by("question_order", "created_at"),
                ),
                Prefetch(
                    "attempts",
                    queryset=StudentExamAttempt.objects.filter(
                        student=student,
                        is_active=True,
                    ).select_related("result"),
                    to_attr="_prefetched_attempts_for_student",
                ),
            ),
            request.user,
        ).filter(
            access_key=access_key,
            access_key_enabled=True,
            is_active=True,
        )
        queryset = queryset.prefetch_related(
            Prefetch(
                "student_assignments",
                queryset=ExamStudentAssignment.objects.filter(is_active=True).select_related(
                    "access_slot"
                ),
                to_attr="_prefetched_student_assignments",
            ),
            Prefetch(
                "access_slots",
                queryset=ExamAccessSlot.objects.filter(
                    is_active=True,
                    status="active",
                ).order_by("slot_start_at", "created_at"),
                to_attr="_prefetched_active_access_slots",
            ),
        )
        exam = queryset.first()
        if exam is None:
            return Response(
                {"detail": "Invalid exam key."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not is_exam_assigned_to_student(exam, student):
            return Response(
                {"detail": "This exam is not available to your student profile."},
                status=status.HTTP_403_FORBIDDEN,
            )

        create_audit_log(
            user=request.user,
            institute=exam.institute,
            action="student_exam_key_lookup",
            entity_type="exam",
            entity_id=exam.id,
            message="Student resolved an exam using the access key flow.",
            metadata={"student_id": str(student.id), "access_key": access_key},
            request=request,
        )
        _hydrate_exam_access_policies([exam])
        return Response(
            StudentExamReadinessSerializer(exam, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class StudentAttemptListView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    @extend_schema(responses=StudentExamAttemptSerializer(many=True))
    def get(self, request):
        queryset = scope_student_queryset(
            StudentExamAttempt.objects.select_related(
                "exam",
                "exam__subject",
                "exam__program",
                "exam__cohort",
                "exam__source_teacher",
                "student",
                "institute",
                "result",
            ).prefetch_related(
                Prefetch(
                    "answers",
                    queryset=StudentAnswer.objects.select_related(
                        "question",
                        "selected_option",
                        "attempt",
                    ).prefetch_related("question__options"),
                ),
                Prefetch(
                    "exam__exam_questions",
                    queryset=ExamQuestion.objects.filter(is_active=True).select_related(
                        "question",
                        "section",
                    ).prefetch_related(
                        "question__attachments",
                    ).order_by("question_order", "created_at"),
                    to_attr="_prefetched_active_exam_questions",
                ),
                Prefetch(
                    "integrity_events",
                    queryset=AttemptIntegrityEvent.objects.filter(is_active=True).order_by(
                        "-event_at",
                        "-created_at",
                    ),
                    to_attr="_prefetched_active_integrity_events",
                ),
            ),
            request.user,
        ).filter(is_active=True)
        return Response(StudentExamAttemptSerializer(queryset, many=True).data)


class StudentResultListView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    @extend_schema(responses=ExamResultListSerializer(many=True))
    def get(self, request):
        queryset = scope_student_queryset(
            ExamResult.objects.select_related(
                "exam",
                "exam__institute",
                "exam__source_teacher",
                "student",
                "attempt",
                "institute",
            ).prefetch_related(
                Prefetch(
                    "attempt__review_tasks",
                    queryset=StudentAnswerReviewTask.objects.filter(
                        is_active=True,
                        status__in=REVIEW_TASK_UNRESOLVED_STATUSES,
                    ).only("id", "attempt_id"),
                    to_attr="_prefetched_unresolved_review_tasks",
                ),
            ),
            request.user,
        ).filter(is_active=True)
        return Response(ExamResultListSerializer(queryset, many=True).data)


class StudentInsightSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    @extend_schema(
        responses=inline_serializer(
            name="StudentInsightSummaryResponse",
            fields={
                "summary": serializers.DictField(required=False),
                "cards": serializers.ListField(child=serializers.DictField(), required=False),
                "recommendations": serializers.ListField(child=serializers.DictField(), required=False),
            },
        )
    )
    def get(self, request):
        profile = request.user.account_profile
        payload = build_student_insight_summary(profile.student_profile)
        return Response(payload)


class StudentQuestionAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    @extend_schema(
        parameters=[
            OpenApiParameter(name="subject", type=str, required=False),
            OpenApiParameter(name="topic", type=str, required=False),
            OpenApiParameter(name="question_type", type=str, required=False),
            OpenApiParameter(name="source", type=str, required=False),
            OpenApiParameter(name="teacher", type=str, required=False),
        ],
        responses=inline_serializer(
            name="StudentQuestionAnalyticsResponse",
            fields={
                "summary": serializers.DictField(required=False),
                "questions": serializers.ListField(child=serializers.DictField(), required=False),
                "filters": serializers.DictField(required=False),
            },
        ),
    )
    def get(self, request):
        profile = request.user.account_profile
        payload = build_student_question_analytics(
            profile.student_profile,
            subject=request.query_params.get("subject"),
            topic=request.query_params.get("topic"),
            question_type=request.query_params.get("question_type"),
            source=request.query_params.get("source"),
            teacher=request.query_params.get("teacher"),
        )
        return Response(payload)


class TeacherExamListView(APIView):
    permission_classes = [IsAuthenticated, CanBuildExams]

    @extend_schema(
        parameters=[
            OpenApiParameter(name="page", type=int, required=False),
            OpenApiParameter(name="page_size", type=int, required=False),
            OpenApiParameter(name="filter", type=str, required=False),
            OpenApiParameter(name="sort", type=str, required=False),
            OpenApiParameter(name="search", type=str, required=False),
            OpenApiParameter(name="teacher", type=str, required=False),
        ],
        responses=ExamListSerializer(many=True),
    )
    def get(self, request):
        queryset = scope_teacher_queryset(
            Exam.objects.select_related(
                "institute",
                "academic_year",
                "program",
                "cohort",
                "subject",
                "source_teacher",
            ).annotate(
                assigned_student_count=Count(
                    "student_assignments",
                    filter=Q(student_assignments__is_active=True),
                    distinct=True,
                ),
                active_questions_count=Count(
                    "exam_questions",
                    filter=Q(exam_questions__is_active=True),
                    distinct=True,
                ),
            ).prefetch_related(
                Prefetch(
                    "sections",
                    queryset=ExamSection.objects.filter(is_active=True).select_related("subject"),
                )
            ),
            request.user,
        ).filter(is_active=True)
        if not any(
            key in request.query_params
            for key in ("page", "page_size", "filter", "sort", "search", "teacher")
        ):
            return Response(ExamReadSerializer(queryset, many=True).data)

        exam_filter = (request.query_params.get("filter") or "all").strip()
        exam_sort = (request.query_params.get("sort") or "recommended").strip()
        search = (request.query_params.get("search") or "").strip()
        teacher_id = (request.query_params.get("teacher") or "").strip()
        economy_summary = None

        if exam_filter == "live":
            queryset = queryset.filter(status="live")
        elif exam_filter == "scheduled":
            queryset = queryset.filter(status="scheduled")
        elif exam_filter == "draft":
            queryset = queryset.filter(status="draft")
        elif exam_filter == "completed":
            queryset = queryset.filter(status="completed")
        elif exam_filter == "elevated":
            queryset = queryset.exclude(security_mode="normal")
        elif exam_filter == "access_key":
            queryset = queryset.filter(access_key_enabled=True)

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(code__icontains=search)
                | Q(status__icontains=search)
                | Q(exam_type__icontains=search)
                | Q(subject__name__icontains=search)
            )

        if teacher_id:
            queryset = queryset.filter(source_teacher_id=teacher_id)

        if exam_filter in {"economy_gated", "stars_gated", "entitlement_gated"}:
            scoped_exams = list(queryset)
            resolved_policies = _hydrate_exam_access_policies(scoped_exams)
            star_gated_count = 0
            entitlement_gated_count = 0

            for policy in resolved_policies.values():
                if policy is None:
                    continue
                if policy.policy_type in {"stars_only", "stars_or_entitlement"}:
                    star_gated_count += 1
                if policy.policy_type in {"entitlement_only", "stars_or_entitlement"}:
                    entitlement_gated_count += 1

            def matches_policy(policy):
                if policy is None:
                    return False
                if exam_filter == "economy_gated":
                    return True
                if exam_filter == "stars_gated":
                    return policy.policy_type in {"stars_only", "stars_or_entitlement"}
                return policy.policy_type in {"entitlement_only", "stars_or_entitlement"}

            matching_exam_ids = [exam.id for exam in scoped_exams if matches_policy(resolved_policies.get(exam.id))]
            total_star_cost = sum(
                int(getattr(resolved_policies.get(exam_id), "star_cost", 0) or 0)
                for exam_id in matching_exam_ids
            )
            queryset = queryset.filter(id__in=matching_exam_ids)
            economy_summary = {
                "total_star_cost": total_star_cost,
                "star_gated_count": star_gated_count,
                "entitlement_gated_count": entitlement_gated_count,
            }

        if exam_sort == "start_soon":
            queryset = queryset.order_by("start_at", "title")
        elif exam_sort == "duration_short":
            queryset = queryset.order_by("duration_minutes", "title")
        elif exam_sort in {"learners_high", "students"}:
            queryset = queryset.order_by("-assigned_student_count", "title")
        elif exam_sort == "marks_high":
            queryset = queryset.order_by("-total_marks", "title")
        elif exam_sort == "title":
            queryset = queryset.order_by("title")
        elif exam_sort == "latest":
            queryset = queryset.order_by("-updated_at", "-created_at")
        elif exam_sort == "risk_high":
            queryset = queryset.order_by(
                Case(
                    When(status="live", then=Value(0)),
                    When(access_key_enabled=True, then=Value(1)),
                    When(security_mode="fullscreen", then=Value(2)),
                    When(security_mode="focus", then=Value(3)),
                    default=Value(4),
                    output_field=IntegerField(),
                ),
                "-updated_at",
                "title",
            )
        else:
            queryset = queryset.order_by(
                Case(
                    When(status="live", then=Value(0)),
                    When(status="scheduled", then=Value(1)),
                    When(status="draft", then=Value(2)),
                    default=Value(3),
                    output_field=IntegerField(),
                ),
                "title",
            )

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        _hydrate_exam_access_policies(page)
        serializer = ExamListSerializer(page, many=True, context={"request": request})
        response = paginator.get_paginated_response(serializer.data)
        response.data["applied_filter"] = exam_filter
        response.data["applied_sort"] = exam_sort
        response.data["applied_search"] = search
        response.data["applied_teacher"] = teacher_id
        if economy_summary is not None:
            response.data["summary"] = economy_summary
        return response


class TeacherQuestionListView(APIView):
    permission_classes = [IsAuthenticated, CanManageQuestionBank]

    @extend_schema(responses=QuestionSerializer(many=True))
    def get(self, request):
        queryset = scope_question_queryset(
            Question.objects.select_related(
                "institute", "program", "subject", "topic", "created_by_teacher"
            ).prefetch_related("options", "attachments", "tag_maps__tag"),
            request.user,
        ).filter(is_active=True).distinct()
        return Response(QuestionSerializer(queryset, many=True).data)


class TeacherResultSummaryView(APIView):
    permission_classes = [IsAuthenticated, CanViewAnalytics]

    @extend_schema(
        parameters=[
            OpenApiParameter(name="search", type=str, required=False),
            OpenApiParameter(name="page_size", type=int, required=False),
        ],
        responses=ExamPerformanceSummarySerializer(many=True),
    )
    def get(self, request):
        from apps.results.models import ExamPerformanceSummary
        from apps.attempts.services import REVIEW_TASK_UNRESOLVED_STATUSES
        from django.db.models import Count, Min, Q

        search = (request.query_params.get("search") or "").strip()
        requested_page_size = request.query_params.get("page_size")
        unresolved_statuses = tuple(REVIEW_TASK_UNRESOLVED_STATUSES)
        queryset = scope_teacher_queryset(
            ExamPerformanceSummary.objects.select_related(
                "institute",
                "exam",
                "exam__program",
                "exam__program__assessment_family",
            ),
            request.user,
        ).filter(is_active=True).annotate(
            total_results_count=Count("exam__results", distinct=True),
            published_results_count=Count(
                "exam__results",
                filter=Q(exam__results__is_published=True),
                distinct=True,
            ),
            pending_review_tasks_count=Count(
                "exam__answer_review_tasks",
                filter=Q(exam__answer_review_tasks__status__in=unresolved_statuses),
                distinct=True,
            ),
            recheck_review_tasks_count=Count(
                "exam__answer_review_tasks",
                filter=Q(exam__answer_review_tasks__status="recheck_requested"),
                distinct=True,
            ),
            oldest_pending_review_opened_at=Min(
                "exam__answer_review_tasks__opened_at",
                filter=Q(exam__answer_review_tasks__status__in=unresolved_statuses),
            ),
        )
        if search:
            queryset = queryset.filter(
                Q(exam__title__icontains=search)
                | Q(exam__code__icontains=search)
                | Q(exam__subject__name__icontains=search)
            )

        queryset = queryset.order_by("-updated_at", "exam__title")

        if requested_page_size:
            try:
                page_size = max(1, min(int(requested_page_size), 20))
            except (TypeError, ValueError):
                page_size = 20
            queryset = queryset[:page_size]

        return Response(ExamPerformanceSummarySerializer(queryset, many=True).data)


class TeacherInsightSummaryView(APIView):
    permission_classes = [IsAuthenticated, CanViewAnalytics]

    @extend_schema(
        responses=inline_serializer(
            name="TeacherInsightSummaryResponse",
            fields={
                "summary": serializers.DictField(required=False),
                "cards": serializers.ListField(child=serializers.DictField(), required=False),
                "recommendations": serializers.ListField(child=serializers.DictField(), required=False),
            },
        )
    )
    def get(self, request):
        return Response(build_teacher_insight_summary(request.user))


class InstituteDashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    @extend_schema(
        responses=inline_serializer(
            name="InstituteDashboardSummaryResponse",
            fields={
                "institute": serializers.DictField(),
                "counts": serializers.DictField(),
                "derived": serializers.DictField(),
                "recent_exam_analytics": serializers.ListField(child=serializers.DictField()),
                "aggregate_score_distribution": serializers.ListField(child=serializers.DictField()),
            },
        )
    )
    def get(self, request):
        from apps.attempts.services import unresolved_review_tasks_queryset

        profile = getattr(request.user, "account_profile", None)
        institute_id = getattr(profile, "institute_id", None)
        if not institute_id:
            return Response(
                {"detail": "Institute dashboard summary is not available for this account."},
                status=status.HTTP_403_FORBIDDEN,
            )

        institute = (
            Institute.objects.filter(id=institute_id, is_active=True)
            .values("id", "name", "code", "is_active", "metadata")
            .first()
        )
        if institute is None:
            return Response(
                {"detail": "Institute not found in your scope."},
                status=status.HTTP_404_NOT_FOUND,
            )
        cache_key = get_institute_dashboard_summary_cache_key(institute_id)
        cached_payload = cache.get(cache_key)
        if cached_payload is not None:
            return Response(cached_payload)

        institute_filter = Q(institute_id=institute_id)
        academic_year_count = AcademicYear.objects.filter(institute_filter, is_active=True).count()
        program_count = Program.objects.filter(institute_filter, is_active=True).count()
        cohort_count = Cohort.objects.filter(institute_filter, is_active=True).count()
        subject_count = Subject.objects.filter(institute_filter, is_active=True).count()
        topic_count = Topic.objects.filter(institute_filter, is_active=True).count()
        student_count = StudentProfile.objects.filter(institute_filter, is_active=True).count()
        teacher_count = TeacherProfile.objects.filter(institute_filter, is_active=True).count()
        exam_count = Exam.objects.filter(institute_filter, is_active=True).count()
        result_count = ExamResult.objects.filter(institute_filter, is_active=True).count()
        assessment_family_mix = list(
            Program.objects.filter(institute_filter, is_active=True)
            .values("assessment_family__code", "assessment_family__label")
            .annotate(program_count=Count("id"))
            .order_by("-program_count", "assessment_family__label")
        )
        review_task_qs = unresolved_review_tasks_queryset(institute_id=institute_id)
        metadata = institute.get("metadata") if isinstance(institute, dict) else {}
        exam_defaults = metadata.get("exam_defaults", {}) if isinstance(metadata, dict) else {}
        exam_default_count = len(exam_defaults) if isinstance(exam_defaults, dict) else 0
        people_count = student_count + teacher_count
        academic_structure_count = (
            academic_year_count + program_count + cohort_count + subject_count + topic_count
        )
        review_aggregates = review_task_qs.aggregate(
            unresolved_review_tasks=Count("id"),
            blocked_review_exams=Count("exam_id", distinct=True),
            recheck_tasks=Count("id", filter=Q(status="recheck_requested")),
        )
        unresolved_review_tasks = review_aggregates["unresolved_review_tasks"] or 0
        blocked_review_exams = review_aggregates["blocked_review_exams"] or 0
        recheck_tasks = review_aggregates["recheck_tasks"] or 0
        summary_rows = list(
            ExamPerformanceSummary.objects.filter(institute_id=institute_id, is_active=True)
            .select_related("exam", "exam__program", "exam__program__assessment_family")
            .order_by("-last_calculated_at", "-updated_at")[:5]
        )
        aggregate_distribution_map = {}
        for summary in summary_rows:
            metadata = summary.metadata if isinstance(summary.metadata, dict) else {}
            for bucket in metadata.get("score_distribution", []):
                label = bucket.get("label")
                if not label:
                    continue
                entry = aggregate_distribution_map.setdefault(
                    label,
                    {
                        "label": label,
                        "min_percentage": bucket.get("min_percentage", 0),
                        "max_percentage": bucket.get("max_percentage", 0),
                        "count": 0,
                    },
                )
                entry["count"] += bucket.get("count", 0) or 0
        aggregate_distribution_total = sum(
            item["count"] for item in aggregate_distribution_map.values()
        )
        aggregate_score_distribution = [
            {
                **bucket,
                "percentage_share": round(
                    (bucket["count"] / aggregate_distribution_total) * 100,
                    2,
                )
                if aggregate_distribution_total > 0
                else 0.0,
            }
            for bucket in sorted(
                aggregate_distribution_map.values(),
                key=lambda item: item["min_percentage"],
            )
        ]
        active_coverage_signals = len(
            [
                value
                for value in (
                    people_count,
                    academic_structure_count,
                    exam_count,
                    result_count,
                    exam_default_count,
                )
                if value > 0
            ]
        )
        readiness_score = round((active_coverage_signals / 5) * 100)

        payload = {
            "institute": {
                "id": str(institute["id"]),
                "name": institute["name"],
                "code": institute["code"],
                "is_active": institute["is_active"],
                "exam_default_count": exam_default_count,
            },
            "counts": {
                "academic_years": academic_year_count,
                "programs": program_count,
                "cohorts": cohort_count,
                "subjects": subject_count,
                "topics": topic_count,
                "students": student_count,
                "teachers": teacher_count,
                "exams": exam_count,
                "results": result_count,
                "pending_review_tasks": unresolved_review_tasks,
                "blocked_review_exams": blocked_review_exams,
                "recheck_review_tasks": recheck_tasks,
                "assessment_family_mix": [
                    {
                        "code": item["assessment_family__code"] or "unassigned",
                        "label": item["assessment_family__label"] or "Unassigned",
                        "program_count": item["program_count"],
                    }
                    for item in assessment_family_mix
                ],
            },
            "derived": {
                "people_count": people_count,
                "academic_structure_count": academic_structure_count,
                "active_coverage_signals": active_coverage_signals,
                "readiness_score": readiness_score,
                "review_ops_pressure": unresolved_review_tasks,
                "active_assessment_families": len(
                    [item for item in assessment_family_mix if item["assessment_family__code"]]
                ),
                "analytics_ready_exams": len(summary_rows),
                "analytics_result_rows": aggregate_distribution_total,
            },
            "recent_exam_analytics": [
                {
                    "exam_id": str(summary.exam_id),
                    "exam_title": summary.exam.title,
                    "exam_code": summary.exam.code,
                    "average_percentage": format(
                        summary.average_percentage or Decimal("0.00"),
                        "f",
                    ),
                    "total_attempted": summary.total_attempted,
                    "total_passed": summary.total_passed,
                    "total_failed": summary.total_failed,
                    "last_calculated_at": (
                        summary.last_calculated_at.isoformat()
                        if summary.last_calculated_at
                        else None
                    ),
                    "experience_profile": resolve_exam_experience_profile(summary.exam),
                    "score_distribution": (
                        summary.metadata.get("score_distribution", [])
                        if isinstance(summary.metadata, dict)
                        else []
                    ),
                    "section_performance": (
                        summary.metadata.get("section_performance", [])
                        if isinstance(summary.metadata, dict)
                        else []
                    ),
                }
                for summary in summary_rows
            ],
            "aggregate_score_distribution": aggregate_score_distribution,
        }
        cache.set(
            cache_key,
            payload,
            INSTITUTE_DASHBOARD_SUMMARY_CACHE_TTL_SECONDS,
        )
        return Response(payload)


class TeacherQuestionPerformanceView(APIView):
    permission_classes = [IsAuthenticated, CanViewAnalytics]

    @extend_schema(
        responses=inline_serializer(
            name="TeacherQuestionPerformanceResponse",
            fields={
                "summary": serializers.DictField(required=False),
                "questions": serializers.ListField(child=serializers.DictField(), required=False),
                "filters": serializers.DictField(required=False),
            },
        )
    )
    def get(self, request):
        return Response(build_teacher_question_performance_summary(request.user))
