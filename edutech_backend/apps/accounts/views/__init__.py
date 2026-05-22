import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth import get_user_model
from django.db.models import Prefetch
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import (
    CanBuildExams,
    CanManageQuestionBank,
    CanViewAnalytics,
    IsPlatformOrInstituteAdmin,
    IsStudent,
    IsTeacherOrInstituteAdmin,
)
from apps.accounts.services import (
    create_student_login,
    create_teacher_login,
    generate_temporary_password,
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
    ResetPasswordSerializer,
)
from apps.attempts.models import StudentExamAttempt
from apps.exams.models import Exam
from apps.exams.serializers import (
    ExamReadSerializer,
    StudentExamAvailabilitySerializer,
    StudentExamReadinessSerializer,
)
from apps.question_bank.models import Question
from apps.question_bank.serializers import QuestionSerializer
from apps.reports.services import create_audit_log
from apps.reports.services import ensure_exam_window_notifications
from apps.results.models import ExamResult
from apps.results.serializers import ExamPerformanceSummarySerializer, ExamResultSerializer
from apps.results.services import (
    build_student_insight_summary,
    build_teacher_insight_summary,
    build_teacher_question_performance_summary,
)
from common.throttles import LoginRateThrottle


auth_logger = logging.getLogger("nexora.auth")
User = get_user_model()


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


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(AccountProfileSerializer(request.user.account_profile).data)


class StudentCreateLoginView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

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


class TeacherCreateLoginView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

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
        queryset = scope_exam_queryset(
            Exam.objects.select_related("institute", "academic_year", "program", "cohort", "subject"),
            request.user,
        ).filter(is_active=True).prefetch_related(
            Prefetch(
                "attempts",
                queryset=StudentExamAttempt.objects.filter(student=student, is_active=True).select_related("result"),
                to_attr="_prefetched_attempts_for_student",
            )
        )
        exams = list(queryset)
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
            Exam.objects.select_related("institute", "academic_year", "program", "cohort", "subject").prefetch_related(
                "sections",
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
        if exam is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(
            StudentExamReadinessSerializer(exam, context={"request": request}).data
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


class TeacherExamListView(APIView):
    permission_classes = [IsAuthenticated, CanBuildExams]

    def get(self, request):
        queryset = scope_teacher_queryset(
            Exam.objects.select_related("institute", "academic_year", "program", "cohort", "subject"),
            request.user,
        ).filter(is_active=True)
        return Response(ExamReadSerializer(queryset, many=True).data)


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

        queryset = scope_teacher_queryset(
            ExamPerformanceSummary.objects.select_related("institute", "exam"),
            request.user,
        ).filter(is_active=True)
        return Response(ExamPerformanceSummarySerializer(queryset, many=True).data)


class TeacherInsightSummaryView(APIView):
    permission_classes = [IsAuthenticated, CanViewAnalytics]

    def get(self, request):
        return Response(build_teacher_insight_summary(request.user))


class TeacherQuestionPerformanceView(APIView):
    permission_classes = [IsAuthenticated, CanViewAnalytics]

    def get(self, request):
        return Response(build_teacher_question_performance_summary(request.user))
