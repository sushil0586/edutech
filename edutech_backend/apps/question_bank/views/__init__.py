import logging
import os
import uuid

from django.core.files.storage import default_storage
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
from apps.question_bank.media import validate_question_attachment_file
from apps.question_bank.models import (
    Question,
    QuestionAttachment,
    QuestionOption,
    QuestionPassage,
    QuestionTag,
    QuestionTagMap,
)
from apps.question_bank.registry import list_question_type_definition_payloads
from apps.question_bank.registry import (
    list_evaluation_mode_definition_payloads,
    list_response_mode_definition_payloads,
)
from apps.question_bank.serializers import (
    QuestionBulkActionSerializer,
    QuestionAttachmentSerializer,
    QuestionImportFinalizeSerializer,
    QuestionPassageImportFinalizeSerializer,
    QuestionPassageImportPreviewResponseSerializer,
    QuestionPassageImportTemplateSerializer,
    QuestionImportPreviewResponseSerializer,
    QuestionImportTemplateSerializer,
    QuestionListSerializer,
    QuestionOptionSerializer,
    QuestionPassageListSerializer,
    QuestionPassageSerializer,
    QuestionSerializer,
    QuestionTagMapSerializer,
    QuestionTagSerializer,
)
from apps.question_bank.services import (
    IMPORT_PREVIEW_SCHEMA_VERSION,
    IMPORT_PASSAGE_PREVIEW_SCHEMA_VERSION,
    build_import_preview_signature,
    import_bulk_questions,
    import_bulk_question_passages,
    notify_question_saved,
    parse_question_import_file,
    parse_question_passage_import_file,
    perform_bulk_question_action,
    preview_bulk_question_import,
    preview_bulk_question_passage_import,
    question_passage_import_template_csv,
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
        "correct_count",
    ]
    ordering = ["-created_at"]

    def _is_compact_list_request(self):
        if self.action != "list":
            return False
        compact = str(self.request.query_params.get("compact", "") or "").strip().lower()
        return compact in {"1", "true", "yes"}

    def get_serializer_class(self):
        if self._is_compact_list_request():
            return QuestionListSerializer
        return super().get_serializer_class()

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
        queryset = Question.objects.select_related(
            "institute",
            "program",
            "subject",
            "topic",
            "created_by_teacher",
            "passage",
        ).annotate(
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
            option_count=Count("options", filter=Q(options__is_active=True), distinct=True),
            correct_option_count=Count(
                "options",
                filter=Q(options__is_active=True, options__is_correct=True),
                distinct=True,
            ),
            attachment_count=Count("attachments", filter=Q(attachments__is_active=True), distinct=True),
            tag_count=Count("tag_maps", filter=Q(tag_maps__is_active=True), distinct=True),
        )
        if self._is_compact_list_request():
            queryset = queryset.only(
                "id",
                "institute_id",
                "program_id",
                "subject_id",
                "topic_id",
                "created_by_teacher_id",
                "passage_id",
                "passage_order",
                "question_type",
                "difficulty_level",
                "content_format",
                "question_text",
                "explanation",
                "default_marks",
                "negative_marks",
                "is_active",
                "is_verified",
                "metadata",
                "passage__title",
                "created_by_teacher__full_name",
            )
        else:
            queryset = queryset.prefetch_related(
                Prefetch(
                    "options",
                    queryset=QuestionOption.objects.filter(is_active=True)
                    .annotate(
                        selected_count=Count("student_answers", filter=Q(student_answers__is_active=True), distinct=True),
                        selected_correct_count=Count(
                            "student_answers",
                            filter=Q(student_answers__is_active=True, student_answers__is_correct=True),
                            distinct=True,
                        ),
                        selected_wrong_count=Count(
                            "student_answers",
                            filter=Q(student_answers__is_active=True, student_answers__is_correct=False),
                            distinct=True,
                        ),
                    )
                    .order_by("option_order"),
                ),
                "attachments",
                "tag_maps__tag",
            )
        queryset = queryset.distinct()
        return scope_question_queryset(queryset, self.request.user)

    @action(detail=False, methods=["get"], url_path="import-template")
    def import_template(self, request):
        payload = {
            "columns": QuestionImportTemplateSerializer().fields["columns"].default,
            "csv_content": question_import_template_csv(),
        }
        return Response(QuestionImportTemplateSerializer(payload).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="type-registry")
    def type_registry(self, request):
        available_only = str(request.query_params.get("available_only", "true")).strip().lower() not in {
            "0",
            "false",
            "no",
        }
        results = list_question_type_definition_payloads(available_only=available_only)
        payload = {
            "count": len(results),
            "results": results,
        }
        return Response(payload, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="assessment-registry")
    def assessment_registry(self, request):
        available_only = str(request.query_params.get("available_only", "true")).strip().lower() not in {
            "0",
            "false",
            "no",
        }
        question_types = list_question_type_definition_payloads(available_only=available_only)
        response_modes = list_response_mode_definition_payloads(available_only=available_only)
        evaluation_modes = list_evaluation_mode_definition_payloads(available_only=available_only)
        payload = {
            "question_types": question_types,
            "response_modes": response_modes,
            "evaluation_modes": evaluation_modes,
        }
        return Response(payload, status=status.HTTP_200_OK)

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
        response_payload = {
            key: preview[key]
            for key in ("total_rows", "valid_rows", "invalid_rows", "rows")
        }
        response_payload["valid_payloads"] = [
            {
                **payload,
                "institute": str(payload["institute"].id),
                "program": str(payload["program"].id) if payload.get("program") else None,
                "subject": str(payload["subject"].id),
                "topic": str(payload["topic"].id) if payload.get("topic") else None,
                "passage": str(payload["passage"].id) if payload.get("passage") else None,
                "passage_title": payload["passage"].title if payload.get("passage") else "",
                "passage_order": payload.get("passage_order"),
                "created_by_teacher": (
                    str(payload["created_by_teacher"].id) if payload.get("created_by_teacher") else None
                ),
                "default_marks": str(payload["default_marks"]),
                "negative_marks": str(payload["negative_marks"]),
            }
            for payload in preview["valid_payloads"]
        ]
        response_payload["preview_schema_version"] = IMPORT_PREVIEW_SCHEMA_VERSION
        response_payload["preview_signature"] = build_import_preview_signature(
            rows=response_payload["rows"],
            valid_payloads=response_payload["valid_payloads"],
            schema_version=IMPORT_PREVIEW_SCHEMA_VERSION,
        )
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
        try:
            result = import_bulk_questions(
                institute=institute_scope,
                preview_payload={
                    "preview_schema_version": serializer.validated_data["preview_schema_version"],
                    "preview_signature": serializer.validated_data["preview_signature"],
                    "rows": serializer.validated_data["preview_rows"],
                    "valid_payloads": serializer.validated_data["valid_payloads"],
                },
                created_by=getattr(getattr(request.user, "account_profile", None), "teacher_profile", None),
            )
        except DjangoValidationError as exc:
            return Response(
                exc.message_dict if getattr(exc, "message_dict", None) else {"detail": exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
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


class QuestionPassageViewSet(SoftDeleteModelViewSetMixin, ModelViewSet):
    serializer_class = QuestionPassageSerializer
    permission_classes = [IsAuthenticated, CanManageQuestionBank]
    filterset_fields = ["institute", "program", "subject", "topic", "created_by_teacher", "is_active"]
    search_fields = ["title", "passage_text", "description"]
    ordering_fields = ["title", "created_at", "updated_at", "linked_question_count"]
    ordering = ["title", "-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return QuestionPassageListSerializer
        return super().get_serializer_class()

    def perform_create(self, serializer):
        passage = serializer.save()
        create_audit_log(
            user=self.request.user,
            institute=passage.institute,
            action="question_passage_create",
            entity_type="question_passage",
            entity_id=passage.id,
            message="Comprehension set created.",
            metadata={"subject_id": str(passage.subject_id)},
            request=self.request,
        )

    def perform_update(self, serializer):
        passage = serializer.save()
        create_audit_log(
            user=self.request.user,
            institute=passage.institute,
            action="question_passage_update",
            entity_type="question_passage",
            entity_id=passage.id,
            message="Comprehension set updated.",
            metadata={"subject_id": str(passage.subject_id)},
            request=self.request,
        )

    def perform_destroy(self, instance):
        create_audit_log(
            user=self.request.user,
            institute=instance.institute,
            action="question_passage_delete",
            entity_type="question_passage",
            entity_id=instance.id,
            message="Comprehension set deleted.",
            metadata={"subject_id": str(instance.subject_id)},
            request=self.request,
        )
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])

    def get_queryset(self):
        queryset = (
            QuestionPassage.objects.select_related(
                "institute",
                "program",
                "subject",
                "topic",
                "created_by_teacher",
            )
            .annotate(
                linked_question_count=Count(
                    "questions",
                    filter=Q(questions__is_active=True),
                    distinct=True,
                )
            )
            .prefetch_related(
                Prefetch(
                    "questions",
                    queryset=Question.objects.filter(is_active=True).order_by("passage_order", "created_at"),
                )
            )
        )
        return scope_teacher_queryset(queryset, self.request.user).distinct()

    @action(detail=False, methods=["get"], url_path="import-template")
    def import_template(self, request):
        payload = {
            "columns": QuestionPassageImportTemplateSerializer().fields["columns"].default,
            "csv_content": question_passage_import_template_csv(),
        }
        return Response(
            QuestionPassageImportTemplateSerializer(payload).data,
            status=status.HTTP_200_OK,
        )

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
            rows = parse_question_passage_import_file(uploaded_file)
            preview = preview_bulk_question_passage_import(
                institute=institute,
                rows=rows,
                created_by=getattr(getattr(request.user, "account_profile", None), "teacher_profile", None),
            )
        except DjangoValidationError as exc:
            import_logger.warning("Question passage import preview failed", extra={"user_id": request.user.id})
            return Response(
                exc.message_dict if getattr(exc, "message_dict", None) else {"detail": exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )
        response_payload = {
            key: preview[key]
            for key in ("total_rows", "valid_rows", "invalid_rows", "rows")
        }
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
            }
            for payload in preview["valid_payloads"]
        ]
        response_payload["preview_schema_version"] = IMPORT_PASSAGE_PREVIEW_SCHEMA_VERSION
        response_payload["preview_signature"] = build_import_preview_signature(
            rows=response_payload["rows"],
            valid_payloads=response_payload["valid_payloads"],
            schema_version=IMPORT_PASSAGE_PREVIEW_SCHEMA_VERSION,
        )
        return Response(response_payload, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="finalize-import")
    def finalize_import(self, request):
        serializer = QuestionPassageImportFinalizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        institute_id = request.data.get("institute")
        institute_queryset = scope_institute_queryset(Institute.objects.all(), request.user)
        institute_scope = (
            institute_queryset.filter(pk=institute_id).first() if institute_id else institute_queryset.first()
        )
        if institute_scope is None:
            return Response({"institute": "Institute scope not found for import."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = import_bulk_question_passages(
                institute=institute_scope,
                preview_payload={
                    "preview_schema_version": serializer.validated_data["preview_schema_version"],
                    "preview_signature": serializer.validated_data["preview_signature"],
                    "rows": serializer.validated_data["preview_rows"],
                    "valid_payloads": serializer.validated_data["valid_payloads"],
                },
                created_by=getattr(getattr(request.user, "account_profile", None), "teacher_profile", None),
            )
        except DjangoValidationError as exc:
            return Response(
                exc.message_dict if getattr(exc, "message_dict", None) else {"detail": exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "created_count": result["created_count"],
                "failed_count": result["failed_count"],
                "created_ids": result["created_ids"],
                "failures": result["failures"],
            },
            status=status.HTTP_201_CREATED,
        )


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
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ["question", "attachment_type", "is_active"]
    search_fields = ["title", "question__question_text"]
    ordering_fields = ["title", "created_at", "updated_at"]
    ordering = ["title", "created_at"]

    def get_queryset(self):
        queryset = QuestionAttachment.objects.select_related("question", "question__subject").all()
        return queryset.filter(question__in=scope_question_queryset(Question.objects.all(), self.request.user))

    @action(detail=False, methods=["post"], url_path="upload-inline-image")
    def upload_inline_image(self, request):
        uploaded_file = request.FILES.get("file")
        try:
            validate_question_attachment_file(uploaded_file=uploaded_file, attachment_type="image")
        except DjangoValidationError as exc:
            return Response(
                exc.message_dict if getattr(exc, "message_dict", None) else {"file": exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        extension = os.path.splitext(uploaded_file.name)[1].lower() or ".png"
        storage_name = default_storage.save(
            f"question-bank/rich-text/{uuid.uuid4().hex}{extension}",
            uploaded_file,
        )
        public_url = request.build_absolute_uri(default_storage.url(storage_name))

        return Response(
            {
                "file_url": public_url,
                "alt_text": str(request.data.get("alt_text") or "").strip(),
                "title": str(request.data.get("title") or "").strip(),
            },
            status=status.HTTP_201_CREATED,
        )
