import logging
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth import get_user_model
from django.db.models import Case, Count, IntegerField, Prefetch, Q, Value, When
from django.utils import timezone
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
from apps.attempts.models import StudentExamAttempt
from apps.academics.models import AcademicYear, Cohort, Program, Subject, Topic
from apps.exams.models import Exam
from apps.exams.serializers import (
    ExamListSerializer,
    ExamReadSerializer,
    StudentExamAvailabilitySerializer,
    StudentExamReadinessSerializer,
)
from apps.exams.services import STUDENT_EXAM_SOURCE_FILTERS
from apps.exams.services import is_exam_assigned_to_student
from apps.exams.services import filter_student_visible_exams_by_source
from apps.question_bank.models import Question
from apps.question_bank.serializers import QuestionSerializer
from apps.reports.services import create_audit_log
from apps.reports.services import ensure_exam_window_notifications
from apps.results.models import ExamResult
from apps.results.serializers import ExamPerformanceSummarySerializer, ExamResultSerializer
from apps.results.services import (
    build_student_insight_summary,
    build_student_question_analytics,
    build_teacher_insight_summary,
    build_teacher_question_performance_summary,
)
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
    if not exams:
        return {}

    from apps.economy.models import ContentAccessPolicy
    from apps.exams.services import EXAM_CONTENT_TYPE

    institute_ids = {exam.institute_id for exam in exams if getattr(exam, "institute_id", None)}
    content_keys = {str(exam.id) for exam in exams}
    if not institute_ids or not content_keys:
        return {}

    policies = list(
        ContentAccessPolicy.objects.filter(
            institute_id__in=institute_ids,
            content_type=EXAM_CONTENT_TYPE,
            content_key__in=content_keys,
            is_active=True,
        )
        .select_related("subject")
        .order_by("priority", "created_at")
    )

    policy_by_target = {}
    for policy in policies:
        target_key = (policy.institute_id, policy.content_key)
        current = policy_by_target.get(target_key)
        if current is None:
            policy_by_target[target_key] = {"subjects": {}, "fallback": None}
            current = policy_by_target[target_key]
        if policy.subject_id is not None:
            current["subjects"].setdefault(policy.subject_id, policy)
        elif current["fallback"] is None:
            current["fallback"] = policy

    resolved_by_exam_id = {}
    for exam in exams:
        resolved = policy_by_target.get((exam.institute_id, str(exam.id)))
        if resolved is None:
            exam._resolved_access_policy = None
            resolved_by_exam_id[exam.id] = None
            continue
        subject_policy = resolved["subjects"].get(exam.subject_id)
        fallback_policy = resolved["fallback"]
        selected_policy = subject_policy if subject_policy is not None else fallback_policy
        exam._resolved_access_policy = selected_policy
        resolved_by_exam_id[exam.id] = selected_policy

    return resolved_by_exam_id


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

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

    def get(self, request):
        return Response(get_public_registration_options(), status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(AccountProfileSerializer(request.user.account_profile).data)


class OnboardingProfileView(APIView):
    permission_classes = [IsAuthenticated]

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

    def get(self, request):
        student = request.user.account_profile.student_profile
        source_filter = str(request.query_params.get("source", "all") or "all").strip().lower()
        teacher_filter = str(
            request.query_params.get("teacher")
            or request.query_params.get("teacher_id")
            or ""
        ).strip()
        if source_filter not in STUDENT_EXAM_SOURCE_FILTERS:
            raise ValidationError({"source": "Invalid source filter."})
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
            "student_assignments",
            Prefetch(
                "attempts",
                queryset=StudentExamAttempt.objects.filter(student=student, is_active=True).select_related("result"),
                to_attr="_prefetched_attempts_for_student",
            )
        )
        exams = [exam for exam in queryset if is_exam_assigned_to_student(exam, student)]
        exams = filter_student_visible_exams_by_source(
            exams,
            source=source_filter,
            teacher_id=teacher_filter or None,
        )
        ensure_exam_window_notifications(student, exams)
        return Response(
            StudentExamAvailabilitySerializer(
                exams,
                many=True,
                context={"request": request},
            ).data
        )


class StudentExamDetailView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

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
                "sections",
                "student_assignments",
                "exam_questions__section",
                "exam_questions__question",
                "exam_questions__question__options",
                Prefetch(
                    "attempts",
                    queryset=StudentExamAttempt.objects.filter(student=student, is_active=True).select_related("result"),
                    to_attr="_prefetched_attempts_for_student",
                ),
            ),
            request.user,
        ).filter(pk=exam_id, is_active=True)
        exam = queryset.first()
        if exam is None or not is_exam_assigned_to_student(exam, student):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(
            StudentExamReadinessSerializer(exam, context={"request": request}).data
        )


class StudentExamAccessKeyResolveView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

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
                "sections",
                "student_assignments",
                "exam_questions__section",
                "exam_questions__question",
                "exam_questions__question__options",
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
        return Response(
            StudentExamReadinessSerializer(exam, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class StudentAttemptListView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        queryset = scope_student_queryset(
            StudentExamAttempt.objects.select_related("exam", "student", "institute"),
            request.user,
        ).filter(is_active=True)
        from apps.attempts.serializers import StudentExamAttemptSerializer

        return Response(StudentExamAttemptSerializer(queryset, many=True).data)


class StudentResultListView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        queryset = scope_student_queryset(
            ExamResult.objects.select_related("exam", "student", "attempt", "institute"),
            request.user,
        ).filter(is_active=True)
        return Response(ExamResultSerializer(queryset, many=True).data)


class StudentInsightSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        profile = request.user.account_profile
        payload = build_student_insight_summary(profile.student_profile)
        return Response(payload)


class StudentQuestionAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

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

    def get(self, request):
        queryset = scope_teacher_queryset(
            Exam.objects.select_related(
                "institute",
                "academic_year",
                "program",
                "cohort",
                "subject",
                "source_teacher",
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

        queryset = queryset.annotate(
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
        )

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
            queryset = queryset.annotate(
                risk_rank=Case(
                    When(status="live", then=Value(0)),
                    When(access_key_enabled=True, then=Value(1)),
                    When(security_mode="fullscreen", then=Value(2)),
                    When(security_mode="focus", then=Value(3)),
                    default=Value(4),
                    output_field=IntegerField(),
                )
            ).order_by("risk_rank", "-updated_at", "title")
        else:
            queryset = queryset.annotate(
                recommended_rank=Case(
                    When(status="live", then=Value(0)),
                    When(status="scheduled", then=Value(1)),
                    When(status="draft", then=Value(2)),
                    default=Value(3),
                    output_field=IntegerField(),
                )
            ).order_by("recommended_rank", "title")

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

    def get(self, request):
        from apps.results.models import ExamPerformanceSummary
        from django.db.models import Count, Q

        queryset = scope_teacher_queryset(
            ExamPerformanceSummary.objects.select_related("institute", "exam"),
            request.user,
        ).filter(is_active=True).annotate(
            total_results_count=Count("exam__results", distinct=True),
            published_results_count=Count(
                "exam__results",
                filter=Q(exam__results__is_published=True),
                distinct=True,
            ),
        )
        return Response(ExamPerformanceSummarySerializer(queryset, many=True).data)


class TeacherInsightSummaryView(APIView):
    permission_classes = [IsAuthenticated, CanViewAnalytics]

    def get(self, request):
        return Response(build_teacher_insight_summary(request.user))


class InstituteDashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def get(self, request):
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
        metadata = institute.get("metadata") if isinstance(institute, dict) else {}
        exam_defaults = metadata.get("exam_defaults", {}) if isinstance(metadata, dict) else {}
        exam_default_count = len(exam_defaults) if isinstance(exam_defaults, dict) else 0
        people_count = student_count + teacher_count
        academic_structure_count = (
            academic_year_count + program_count + cohort_count + subject_count + topic_count
        )
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

        return Response(
            {
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
                },
                "derived": {
                    "people_count": people_count,
                    "academic_structure_count": academic_structure_count,
                    "active_coverage_signals": active_coverage_signals,
                    "readiness_score": readiness_score,
                },
            }
        )


class TeacherQuestionPerformanceView(APIView):
    permission_classes = [IsAuthenticated, CanViewAnalytics]

    def get(self, request):
        return Response(build_teacher_question_performance_summary(request.user))
