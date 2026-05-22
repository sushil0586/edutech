import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Prefetch, Q
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.academics.models import Topic
from apps.accounts.permissions import CanManageQuestionBank
from apps.accounts.scopes import scope_institute_queryset, scope_question_queryset, scope_teacher_queryset
from apps.institutes.models import Institute
from apps.question_bank.filters import QuestionFilterSet
from apps.question_bank.models import (
    Question,
    QuestionAttachment,
    QuestionOption,
    QuestionTag,
    QuestionTagMap,
)
from apps.question_bank.serializers import (
    QuestionBulkActionSerializer,
    QuestionAttachmentSerializer,
    QuestionImportFinalizeSerializer,
    QuestionImportPreviewResponseSerializer,
    QuestionImportTemplateSerializer,
    QuestionOptionSerializer,
    QuestionSerializer,
    QuestionTagMapSerializer,
    QuestionTagSerializer,
)
from apps.question_bank.services import (
    import_bulk_questions,
    notify_question_saved,
    parse_question_import_file,
    perform_bulk_question_action,
    preview_bulk_question_import,
    question_import_template_csv,
)
from apps.reports.services import create_audit_log
from common.throttles import BulkImportRateThrottle
from common.viewsets import SoftDeleteModelViewSetMixin


import_logger = logging.getLogger("nexora.import")


class QuestionViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticated, CanManageQuestionBank]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filterset_class = QuestionFilterSet
    search_fields = ["question_text", "explanation"]
    ordering_fields = [
        "created_at",
        "updated_at",
        "default_marks",
        "negative_marks",
        "difficulty_level",
        "usage_count",
        "wrong_count",
        "skipped_count",
    ]
    ordering = ["-created_at"]

    def perform_create(self, serializer):
        question = serializer.save()
        notify_question_saved(question)
        create_audit_log(
            user=self.request.user,
            institute=question.institute,
            action="question_create",
            entity_type="question",
            entity_id=question.id,
            message="Question created.",
            metadata={"question_type": question.question_type},
            request=self.request,
        )

    def perform_update(self, serializer):
        question = serializer.save()
        notify_question_saved(question)
        create_audit_log(
            user=self.request.user,
            institute=question.institute,
            action="question_update",
            entity_type="question",
            entity_id=question.id,
            message="Question updated.",
            metadata={"question_type": question.question_type},
            request=self.request,
        )

    def perform_destroy(self, instance):
        create_audit_log(
            user=self.request.user,
            institute=instance.institute,
            action="question_delete",
            entity_type="question",
            entity_id=instance.id,
            message="Question deleted.",
            metadata={"question_type": instance.question_type},
            request=self.request,
        )
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])

    def get_queryset(self):
        queryset = (
            Question.objects.select_related(
                "institute",
                "program",
                "subject",
                "topic",
                "created_by_teacher",
            )
            .prefetch_related(
                Prefetch("options", queryset=QuestionOption.objects.filter(is_active=True).order_by("option_order")),
                "attachments",
                "tag_maps__tag",
            )
            .annotate(
                usage_count=Count("student_answers", filter=Q(student_answers__is_active=True), distinct=True),
                correct_count=Count(
                    "student_answers",
                    filter=Q(
                        student_answers__is_active=True,
                        student_answers__selected_option__isnull=False,
                        student_answers__is_correct=True,
                    ),
                    distinct=True,
                ),
                wrong_count=Count(
                    "student_answers",
                    filter=Q(
                        student_answers__is_active=True,
                        student_answers__selected_option__isnull=False,
                        student_answers__is_correct=False,
                    ),
                    distinct=True,
                ),
                skipped_count=Count(
                    "student_answers",
                    filter=Q(
                        student_answers__is_active=True,
                        student_answers__selected_option__isnull=True,
                    ),
                    distinct=True,
                ),
            )
            .distinct()
        )
        return scope_question_queryset(queryset, self.request.user)

    @action(detail=False, methods=["get"], url_path="import-template")
    def import_template(self, request):
        payload = {
            "columns": QuestionImportTemplateSerializer().fields["columns"].default,
            "csv_content": question_import_template_csv(),
        }
        return Response(QuestionImportTemplateSerializer(payload).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="preview-import")
    def preview_import(self, request):
        uploaded_file = request.FILES.get("file")
        if uploaded_file is None:
            return Response({"file": "Upload a CSV file first."}, status=status.HTTP_400_BAD_REQUEST)
        institute_id = request.data.get("institute")
        institute_queryset = scope_institute_queryset(Institute.objects.all(), request.user)
        institute = institute_queryset.filter(pk=institute_id).first() if institute_id else institute_queryset.first()
        if institute is None:
            return Response({"institute": "Institute scope not found for import."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            rows = parse_question_import_file(uploaded_file)
            preview = preview_bulk_question_import(
                institute=institute,
                rows=rows,
                created_by=getattr(getattr(request.user, "account_profile", None), "teacher_profile", None),
            )
        except DjangoValidationError as exc:
            import_logger.warning("Question import preview failed", extra={"user_id": request.user.id})
            return Response(
                exc.message_dict if getattr(exc, "message_dict", None) else {"detail": exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )
        response_payload = {key: preview[key] for key in ("total_rows", "valid_rows", "invalid_rows", "rows")}
        response_payload["valid_payloads"] = [
            {
                **payload,
                "institute": str(payload["institute"].id),
                "program": str(payload["program"].id) if payload.get("program") else None,
                "subject": str(payload["subject"].id),
                "topic": str(payload["topic"].id) if payload.get("topic") else None,
                "created_by_teacher": (
                    str(payload["created_by_teacher"].id) if payload.get("created_by_teacher") else None
                ),
                "default_marks": str(payload["default_marks"]),
                "negative_marks": str(payload["negative_marks"]),
            }
            for payload in preview["valid_payloads"]
        ]
        return Response(response_payload, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="finalize-import")
    def finalize_import(self, request):
        serializer = QuestionImportFinalizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        institute_id = request.data.get("institute")
        institute_queryset = scope_institute_queryset(Institute.objects.all(), request.user)
        institute_scope = (
            institute_queryset.filter(pk=institute_id).first() if institute_id else institute_queryset.first()
        )
        if institute_scope is None:
            return Response({"institute": "Institute scope not found for import."}, status=status.HTTP_400_BAD_REQUEST)
        result = import_bulk_questions(
            institute=institute_scope,
            preview_payload={
                "rows": serializer.validated_data["preview_rows"],
                "valid_payloads": serializer.validated_data["valid_payloads"],
            },
            created_by=getattr(getattr(request.user, "account_profile", None), "teacher_profile", None),
        )
        create_audit_log(
            user=request.user,
            institute=institute_scope,
            action="bulk_question_import",
            entity_type="question_import",
            entity_id=institute_scope.id,
            message="Bulk question import finalized.",
            metadata={
                "created_count": result.get("created_count", 0),
                "error_count": len(result.get("errors", [])),
            },
            request=request,
        )
        return Response(result, status=status.HTTP_201_CREATED)

    def get_throttles(self):
        if self.action in {"preview_import", "finalize_import"}:
            return [BulkImportRateThrottle()]
        return super().get_throttles()

    @action(detail=False, methods=["post"], url_path="bulk-action")
    def bulk_action(self, request):
        serializer = QuestionBulkActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        queryset = self.get_queryset().filter(id__in=serializer.validated_data["question_ids"])
        action_name = serializer.validated_data["action"]
        value = None
        if action_name == "assign_tag":
            value = scope_teacher_queryset(QuestionTag.objects.all(), request.user).get(
                pk=serializer.validated_data["tag"]
            )
        elif action_name == "set_topic" and serializer.validated_data.get("topic"):
            value = scope_teacher_queryset(Topic.objects.all(), request.user).get(
                pk=serializer.validated_data["topic"]
            )
        elif action_name == "set_difficulty":
            value = serializer.validated_data["difficulty_level"]
        result = perform_bulk_question_action(
            action_name=action_name,
            questions=queryset,
            value=value,
        )
        return Response(result, status=status.HTTP_200_OK)


class QuestionOptionViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = QuestionOptionSerializer
    permission_classes = [IsAuthenticated, CanManageQuestionBank]
    filterset_fields = ["question", "is_correct", "is_active"]
    search_fields = ["option_text", "question__question_text"]
    ordering_fields = ["option_order", "created_at", "updated_at"]
    ordering = ["question", "option_order"]

    def get_queryset(self):
        queryset = QuestionOption.objects.select_related("question", "question__subject").all()
        return queryset.filter(question__in=scope_question_queryset(Question.objects.all(), self.request.user))


class QuestionTagViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = QuestionTagSerializer
    permission_classes = [IsAuthenticated, CanManageQuestionBank]
    filterset_fields = ["institute", "is_active"]
    search_fields = ["name", "code", "institute__name"]
    ordering_fields = ["name", "code", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        queryset = QuestionTag.objects.select_related("institute").all()
        return scope_teacher_queryset(queryset, self.request.user)


class QuestionTagMapViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = QuestionTagMapSerializer
    permission_classes = [IsAuthenticated, CanManageQuestionBank]
    filterset_fields = ["question", "tag", "is_active"]
    search_fields = ["question__question_text", "tag__name", "tag__code"]
    ordering_fields = ["created_at", "updated_at", "tag__name"]
    ordering = ["tag__name"]

    def get_queryset(self):
        queryset = QuestionTagMap.objects.select_related("question", "tag").all()
        return queryset.filter(question__in=scope_question_queryset(Question.objects.all(), self.request.user))


class QuestionAttachmentViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = QuestionAttachmentSerializer
    permission_classes = [IsAuthenticated, CanManageQuestionBank]
    filterset_fields = ["question", "attachment_type", "is_active"]
    search_fields = ["title", "question__question_text"]
    ordering_fields = ["title", "created_at", "updated_at"]
    ordering = ["title", "created_at"]

    def get_queryset(self):
        queryset = QuestionAttachment.objects.select_related("question", "question__subject").all()
        return queryset.filter(question__in=scope_question_queryset(Question.objects.all(), self.request.user))
