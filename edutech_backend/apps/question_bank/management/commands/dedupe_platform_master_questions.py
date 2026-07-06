from collections import defaultdict

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.attempts.models import StudentAnswer, StudentAnswerReviewEvent, StudentAnswerReviewTask
from apps.economy.models import InstituteQuestionUsageLedger
from apps.exams.models import ExamQuestion
from apps.institutes.models import Institute
from apps.question_bank.models import (
    InstituteQuestionAccess,
    InstituteQuestionAccessStatus,
    MasterQuestion,
    MasterQuestionSourceType,
    Question,
    QuestionAttachment,
    QuestionTagMap,
)


STATUS_PRIORITY = {
    InstituteQuestionAccessStatus.LINKED: 5,
    InstituteQuestionAccessStatus.APPROVED: 4,
    InstituteQuestionAccessStatus.REQUESTED: 3,
    InstituteQuestionAccessStatus.REJECTED: 2,
    InstituteQuestionAccessStatus.ARCHIVED: 1,
}


class Command(BaseCommand):
    help = (
        "Deduplicate duplicate platform master-question rows for a source institute. "
        "Keeps one canonical master row per duplicate content signature, reassigns dependent "
        "records, and collapses institute-local linked duplicates created through the stale masters."
    )

    def add_arguments(self, parser):
        parser.add_argument("institute_code", help="Source institute code to clean, for example PUB001.")
        parser.add_argument(
            "--subject-code",
            default="",
            help="Optional source subject code filter, for example CLS7-SCI.",
        )
        parser.add_argument(
            "--topic-code",
            default="",
            help="Optional source topic code filter, for example SCI-MATTER-ACIDBASE.",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually write changes. Without this flag the command runs in dry-run mode.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        institute = Institute.objects.filter(code=options["institute_code"].strip()).first()
        if institute is None:
            raise CommandError(f"Institute not found: {options['institute_code']}")

        queryset = MasterQuestion.objects.filter(
            source_institute=institute,
            source_type=MasterQuestionSourceType.PLATFORM,
            is_active=True,
        ).select_related("source_subject", "source_topic")
        subject_code = options["subject_code"].strip()
        topic_code = options["topic_code"].strip()
        if subject_code:
            queryset = queryset.filter(source_subject__code=subject_code)
        if topic_code:
            queryset = queryset.filter(source_topic__code=topic_code)

        groups = defaultdict(list)
        for master_question in queryset.order_by("source_subject__code", "source_topic__code", "created_at", "id"):
            groups[self._duplicate_signature(master_question)].append(master_question)

        duplicate_groups = [rows for rows in groups.values() if len(rows) > 1]
        if not duplicate_groups:
            self.stdout.write(self.style.SUCCESS("No duplicate platform master-question groups were found."))
            return

        dry_run = not options["apply"]
        totals = {
            "duplicate_groups": len(duplicate_groups),
            "master_rows_seen": 0,
            "question_rows_reassigned": 0,
            "usage_rows_reassigned": 0,
            "access_rows_deleted": 0,
            "question_rows_deleted": 0,
            "master_rows_deleted": 0,
        }

        for duplicate_rows in duplicate_groups:
            totals["master_rows_seen"] += len(duplicate_rows)
            canonical = self._select_canonical_master(duplicate_rows)
            duplicate_ids = [row.id for row in duplicate_rows if row.id != canonical.id]
            affected_institutes = set(
                InstituteQuestionAccess.objects.filter(master_question_id__in=duplicate_ids).values_list(
                    "institute_id",
                    flat=True,
                )
            )
            affected_institutes.update(
                Question.objects.filter(master_question_id__in=duplicate_ids).values_list(
                    "institute_id",
                    flat=True,
                )
            )

            topic_code_value = getattr(canonical.source_topic, "code", "")
            self.stdout.write(
                f"topic={topic_code_value or 'NO_TOPIC'} keep={canonical.id} remove={len(duplicate_ids)}"
            )

            if dry_run:
                continue

            totals["question_rows_reassigned"] += Question.objects.filter(
                master_question_id__in=duplicate_ids
            ).update(master_question=canonical)
            totals["usage_rows_reassigned"] += InstituteQuestionUsageLedger.objects.filter(
                master_question_id__in=duplicate_ids
            ).update(master_question=canonical)

            for institute_id in sorted(affected_institutes):
                self._merge_access_rows(
                    institute_id=institute_id,
                    canonical=canonical,
                    duplicate_ids=duplicate_ids,
                    totals=totals,
                )
                self._dedupe_question_rows(
                    institute_id=institute_id,
                    canonical=canonical,
                    totals=totals,
                )

            deleted_count, _ = MasterQuestion.objects.filter(id__in=duplicate_ids).delete()
            totals["master_rows_deleted"] += deleted_count

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"Dry run only. Found {totals['duplicate_groups']} duplicate platform master-question groups "
                    f"covering {totals['master_rows_seen']} master rows. Re-run with --apply to clean them."
                )
            )
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"Deduplicated {totals['duplicate_groups']} duplicate platform master-question groups in {institute.code}."
            )
        )
        for key, value in totals.items():
            if key == "duplicate_groups":
                continue
            self.stdout.write(f"- {key}={value}")

    def _duplicate_signature(self, master_question):
        metadata = master_question.metadata if isinstance(master_question.metadata, dict) else {}
        normalized_text = " ".join((master_question.question_text or "").split())
        return (
            master_question.source_subject_id,
            master_question.source_topic_id,
            master_question.question_type,
            metadata.get("seed_batch") or "",
            metadata.get("seed_sequence") or "",
            normalized_text,
        )

    def _select_canonical_master(self, rows):
        def score(master_question):
            metadata = master_question.metadata if isinstance(master_question.metadata, dict) else {}
            origin_question_id = metadata.get("origin_question_id")
            origin_exists = False
            if origin_question_id:
                origin_exists = Question.objects.filter(id=origin_question_id, is_active=True).exists()
            return (
                1 if origin_exists else 0,
                master_question.access_links.count(),
                master_question.institute_questions.count(),
                master_question.question_bank_usage_entries.count(),
                -master_question.created_at.timestamp(),
            )

        return max(rows, key=score)

    def _merge_access_rows(self, *, institute_id, canonical, duplicate_ids, totals):
        rows = list(
            InstituteQuestionAccess.objects.filter(
                institute_id=institute_id,
                master_question_id__in=[canonical.id, *duplicate_ids],
            ).order_by("created_at", "id")
        )
        if not rows:
            return

        canonical_row = next((row for row in rows if row.master_question_id == canonical.id), None)
        best_row = max(rows, key=self._access_score)
        keeper = canonical_row or best_row

        if best_row.id != keeper.id and self._access_score(best_row) > self._access_score(keeper):
            keeper.requested_by_teacher = best_row.requested_by_teacher
            keeper.approved_by = best_row.approved_by
            keeper.linked_question = best_row.linked_question
            keeper.local_program = best_row.local_program
            keeper.local_subject = best_row.local_subject
            keeper.local_topic = best_row.local_topic
            keeper.status = best_row.status
            keeper.notes = best_row.notes
            keeper.is_active = best_row.is_active
            keeper.metadata = best_row.metadata

        keeper.master_question = canonical
        keeper.save()

        delete_ids = [row.id for row in rows if row.id != keeper.id]
        if delete_ids:
            deleted_count, _ = InstituteQuestionAccess.objects.filter(id__in=delete_ids).delete()
            totals["access_rows_deleted"] += deleted_count

    def _access_score(self, access):
        return (
            1 if access.is_active else 0,
            STATUS_PRIORITY.get(access.status, 0),
            1 if access.linked_question_id else 0,
            1 if access.approved_by_id else 0,
            access.created_at.timestamp(),
        )

    def _dedupe_question_rows(self, *, institute_id, canonical, totals):
        duplicate_rows = list(
            Question.objects.filter(
                institute_id=institute_id,
                master_question=canonical,
                is_active=True,
            )
            .select_related("subject", "topic")
            .order_by("created_at", "id")
        )
        if len(duplicate_rows) <= 1:
            return

        linked_access = (
            InstituteQuestionAccess.objects.filter(
                institute_id=institute_id,
                master_question=canonical,
                linked_question_id__in=[row.id for row in duplicate_rows],
                is_active=True,
                status=InstituteQuestionAccessStatus.LINKED,
            )
            .order_by("created_at", "id")
            .first()
        )
        keep_question = None
        if linked_access and linked_access.linked_question_id:
            keep_question = next(
                (row for row in duplicate_rows if row.id == linked_access.linked_question_id),
                None,
            )

        if keep_question is None:
            metadata = canonical.metadata if isinstance(canonical.metadata, dict) else {}
            origin_question_id = metadata.get("origin_question_id")
            if origin_question_id:
                keep_question = next(
                    (row for row in duplicate_rows if str(row.id) == str(origin_question_id)),
                    None,
                )

        if keep_question is None:
            keep_question = duplicate_rows[0]

        duplicate_ids = [row.id for row in duplicate_rows if row.id != keep_question.id]
        if not duplicate_ids:
            return

        InstituteQuestionAccess.objects.filter(linked_question_id__in=duplicate_ids).update(linked_question=keep_question)
        InstituteQuestionUsageLedger.objects.filter(question_id__in=duplicate_ids).update(question=keep_question)
        ExamQuestion.objects.filter(question_id__in=duplicate_ids).update(question=keep_question)
        StudentAnswer.objects.filter(question_id__in=duplicate_ids).update(question=keep_question)
        StudentAnswerReviewTask.objects.filter(question_id__in=duplicate_ids).update(question=keep_question)
        StudentAnswerReviewEvent.objects.filter(question_id__in=duplicate_ids).update(question=keep_question)
        QuestionAttachment.objects.filter(question_id__in=duplicate_ids).update(question=keep_question)

        for duplicate_id in duplicate_ids:
            for tag_map in QuestionTagMap.objects.filter(question_id=duplicate_id):
                QuestionTagMap.objects.get_or_create(
                    question=keep_question,
                    tag=tag_map.tag,
                )
                tag_map.delete()

        deleted_count, _ = Question.objects.filter(id__in=duplicate_ids).delete()
        totals["question_rows_deleted"] += deleted_count
