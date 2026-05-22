from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.accounts.permissions import CanBuildExams
from apps.accounts.scopes import get_scoped_object_or_403, scope_exam_queryset
from apps.exams.models import Exam, ExamPublishLog, ExamQuestion, ExamSection
from apps.exams.serializers import (
    ExamActionSerializer,
    ExamPublishLogSerializer,
    ExamQuestionSerializer,
    ExamReadSerializer,
    ExamSectionSerializer,
    ExamSyncMarksResponseSerializer,
    ExamWriteSerializer,
)
from apps.exams.services import cancel_exam, publish_exam, sync_total_marks_from_questions
from apps.teachers.models import TeacherProfile
from apps.reports.services import create_audit_log
from common.responses import action_response
from common.viewsets import SoftDeleteModelViewSetMixin


class ExamViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated, CanBuildExams]
    filterset_fields = [
        "institute",
        "academic_year",
        "program",
        "cohort",
        "subject",
        "exam_type",
        "delivery_mode",
        "status",
        "is_active",
    ]
    search_fields = ["title", "code", "description"]
    ordering_fields = ["start_at", "end_at", "created_at", "title"]
    ordering = ["-start_at", "-created_at"]

    def get_queryset(self):
        queryset = (
            Exam.objects.select_related(
                "institute",
                "academic_year",
                "program",
                "cohort",
                "subject",
            )
            .prefetch_related(
                "sections",
                "exam_questions__question",
                "publish_logs__changed_by",
            )
            .all()
        )
        return scope_exam_queryset(queryset, self.request.user)

    def get_serializer_class(self):
        if self.action in {"list", "retrieve"}:
            return ExamReadSerializer
        if self.action == "sync_marks":
            return ExamSyncMarksResponseSerializer
        return ExamWriteSerializer

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, *args, **kwargs):
        try:
            return super().partial_update(request, *args, **kwargs)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="sync-marks")
    def sync_marks(self, request, pk=None):
        exam = self.get_object()
        exam = sync_total_marks_from_questions(exam)
        serializer = ExamSyncMarksResponseSerializer(exam)
        return action_response(
            data=serializer.data,
            message="Exam marks synchronized successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="publish")
    def publish(self, request, pk=None):
        exam = self.get_object()
        serializer = ExamActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        changed_by = serializer.validated_data.get("changed_by")
        if changed_by is not None:
            get_scoped_object_or_403(
                scope_exam_queryset(TeacherProfile.objects.select_related("institute"), request.user),
                user=request.user,
                value=changed_by.pk,
                not_found_message="Teacher not found in your scope.",
            )
        try:
            publish_exam(
                exam,
                changed_by=changed_by,
                remarks=serializer.validated_data.get("remarks", ""),
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
        create_audit_log(
            user=request.user,
            institute=exam.institute,
            action="exam_publish",
            entity_type="exam",
            entity_id=exam.id,
            message="Exam published/scheduled.",
            metadata={"status": exam.status},
            request=request,
        )
        return action_response(
            data=ExamReadSerializer(exam).data,
            message="Exam published successfully.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        exam = self.get_object()
        serializer = ExamActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        changed_by = serializer.validated_data.get("changed_by")
        if changed_by is not None:
            get_scoped_object_or_403(
                scope_exam_queryset(TeacherProfile.objects.select_related("institute"), request.user),
                user=request.user,
                value=changed_by.pk,
                not_found_message="Teacher not found in your scope.",
            )
        try:
            cancel_exam(
                exam,
                changed_by=changed_by,
                remarks=serializer.validated_data.get("remarks", ""),
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
        create_audit_log(
            user=request.user,
            institute=exam.institute,
            action="exam_cancel",
            entity_type="exam",
            entity_id=exam.id,
            message="Exam cancelled.",
            metadata={"status": exam.status},
            request=request,
        )
        return action_response(
            data=ExamReadSerializer(exam).data,
            message="Exam cancelled successfully.",
            status_code=status.HTTP_200_OK,
        )


class ExamSectionViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = ExamSectionSerializer
    permission_classes = [IsAuthenticated, CanBuildExams]
    filterset_fields = ["exam", "is_active"]
    search_fields = ["name", "description", "instructions", "exam__title", "exam__code"]
    ordering_fields = ["section_order", "created_at", "name"]
    ordering = ["section_order", "name"]

    def get_queryset(self):
        queryset = ExamSection.objects.select_related("exam", "exam__program", "exam__subject").all()
        return queryset.filter(exam__in=scope_exam_queryset(Exam.objects.all(), self.request.user))


class ExamQuestionViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = ExamQuestionSerializer
    permission_classes = [IsAuthenticated, CanBuildExams]
    filterset_fields = ["exam", "question", "is_mandatory", "is_active"]
    search_fields = ["section_name", "question__question_text", "exam__title", "exam__code"]
    ordering_fields = ["question_order", "marks", "created_at"]
    ordering = ["question_order"]

    def get_queryset(self):
        queryset = ExamQuestion.objects.select_related(
            "exam",
            "question",
            "question__subject",
            "question__topic",
        ).all()
        return queryset.filter(exam__in=scope_exam_queryset(Exam.objects.all(), self.request.user))


class ExamPublishLogViewSet(ModelViewSet):
    serializer_class = ExamPublishLogSerializer
    permission_classes = [IsAuthenticated, CanBuildExams]
    http_method_names = ["get", "head", "options"]
    filterset_fields = ["exam", "old_status", "new_status", "changed_by"]
    search_fields = ["exam__title", "exam__code", "remarks", "changed_by__full_name"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = ExamPublishLog.objects.select_related("exam", "changed_by").all()
        return queryset.filter(exam__in=scope_exam_queryset(Exam.objects.all(), self.request.user))
