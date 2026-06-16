from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.academics.models import Program, Subject, Topic
from apps.institutes.models import Institute
from apps.question_bank.models import (
    InstituteQuestionAccess,
    InstituteQuestionAccessStatus,
    MasterQuestion,
    MasterQuestionVisibility,
)
from apps.question_bank.services import (
    link_master_question_to_institute,
    request_master_question_access,
)
from apps.teachers.models import TeacherProfile


User = get_user_model()


class Command(BaseCommand):
    help = (
        "Request or approve master-question links for a private institute. "
        "Designed for admin-triggered public UI actions."
    )

    def add_arguments(self, parser):
        parser.add_argument("target_institute_code", help="Private institute code to receive question access.")
        parser.add_argument(
            "--mode",
            default="request",
            choices=["request", "approve"],
            help="Whether to create access requests or approve/link matching master questions.",
        )
        parser.add_argument(
            "--source-institute",
            required=True,
            help="Source institute code that owns the master questions, typically the public institute.",
        )
        parser.add_argument(
            "--subject-code",
            default="",
            help="Filter master questions by source subject code.",
        )
        parser.add_argument(
            "--topic-code",
            default="",
            help="Filter master questions by source topic code.",
        )
        parser.add_argument(
            "--question-ids",
            nargs="*",
            default=[],
            help="Optional specific master question ids to request or approve.",
        )
        parser.add_argument(
            "--visibility",
            default="",
            choices=["", *[choice[0] for choice in MasterQuestionVisibility.choices]],
            help="Optional master question visibility filter.",
        )
        parser.add_argument(
            "--teacher-employee-code",
            default="",
            help="Optional target institute teacher employee code for request ownership.",
        )
        parser.add_argument(
            "--approved-by-username",
            default="",
            help="Platform admin username to stamp on approval actions.",
        )
        parser.add_argument(
            "--only-requested",
            action="store_true",
            help="In approve mode, only approve questions that already have a request row.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        target_institute = self._resolve_private_institute(options["target_institute_code"].strip())
        source_institute = self._resolve_source_institute(options["source_institute"].strip())
        requested_by_teacher = self._resolve_teacher(
            institute=target_institute,
            employee_code=options["teacher_employee_code"].strip(),
        )
        approved_by = self._resolve_user(options["approved_by_username"].strip())
        default_local_program, default_local_subject, default_local_topic = self._resolve_local_scope(
            institute=target_institute,
            source_institute=source_institute,
            subject_code=options["subject_code"].strip(),
            topic_code=options["topic_code"].strip(),
        )

        master_questions = self._resolve_master_questions(
            source_institute=source_institute,
            subject_code=options["subject_code"].strip(),
            topic_code=options["topic_code"].strip(),
            question_ids=options["question_ids"],
            visibility=options["visibility"],
        )
        if not master_questions:
            raise CommandError("No master questions matched the provided filters.")

        requested_count = 0
        linked_count = 0
        skipped_count = 0

        for master_question in master_questions:
            local_program, local_subject, local_topic = self._resolve_local_scope_for_master_question(
                institute=target_institute,
                master_question=master_question,
                default_program=default_local_program,
                default_subject=default_local_subject,
                default_topic=default_local_topic,
            )
            if options["mode"] == "request":
                request_master_question_access(
                    master_question=master_question,
                    institute=target_institute,
                    requested_by_teacher=requested_by_teacher,
                    local_program=local_program,
                    local_subject=local_subject,
                    local_topic=local_topic,
                    notes="Created by link_master_questions_to_institute command in request mode.",
                )
                requested_count += 1
                continue

            if options["only_requested"]:
                access = InstituteQuestionAccess.objects.filter(
                    institute=target_institute,
                    master_question=master_question,
                    status=InstituteQuestionAccessStatus.REQUESTED,
                ).first()
                if access is None:
                    skipped_count += 1
                    continue
            link_master_question_to_institute(
                master_question=master_question,
                institute=target_institute,
                approved_by=approved_by,
                requested_by_teacher=requested_by_teacher,
                local_program=local_program,
                local_subject=local_subject,
                local_topic=local_topic,
                notes="Created by link_master_questions_to_institute command in approve mode.",
            )
            linked_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Master question link flow completed for {target_institute.code} in {options['mode']} mode."
            )
        )
        self.stdout.write(f"- matched_master_questions={len(master_questions)}")
        self.stdout.write(f"- requested={requested_count}")
        self.stdout.write(f"- linked={linked_count}")
        self.stdout.write(f"- skipped={skipped_count}")

    def _resolve_private_institute(self, institute_code):
        institute = Institute.objects.filter(code=institute_code).first()
        if institute is None:
            raise CommandError(f"Target institute not found: {institute_code}")
        if (institute.metadata or {}).get("is_public_content_hub"):
            raise CommandError(
                f"Target institute {institute_code} is the public content hub. Choose a private institute instead."
            )
        return institute

    def _resolve_source_institute(self, institute_code):
        institute = Institute.objects.filter(code=institute_code).first()
        if institute is None:
            raise CommandError(f"Source institute not found: {institute_code}")
        return institute

    def _resolve_teacher(self, *, institute, employee_code):
        if not employee_code:
            return None
        teacher = TeacherProfile.objects.filter(
            institute=institute,
            employee_code=employee_code,
        ).first()
        if teacher is None:
            raise CommandError(
                f"Teacher {employee_code} was not found in target institute {institute.code}."
            )
        return teacher

    def _resolve_user(self, username):
        if not username:
            return None
        user = User.objects.filter(username=username).first()
        if user is None:
            raise CommandError(f"Approved-by user not found: {username}")
        return user

    def _resolve_local_scope(self, *, institute, source_institute, subject_code, topic_code):
        local_program = None
        local_subject = None
        local_topic = None

        if subject_code:
            source_subject = Subject.objects.filter(
                institute=source_institute,
                code=subject_code,
            ).first()
            if source_subject is None:
                raise CommandError(
                    f"Source subject {subject_code} was not found in {source_institute.code}."
                )
            local_subject = Subject.objects.filter(institute=institute, code=subject_code).first()
            if local_subject is None:
                raise CommandError(
                    f"Target institute {institute.code} does not have subject {subject_code}. Seed academics first."
                )
            local_program = local_subject.program

        if topic_code:
            if not local_subject:
                raise CommandError("--topic-code requires --subject-code.")
            local_topic = Topic.objects.filter(
                institute=institute,
                subject=local_subject,
                code=topic_code,
            ).first()
            if local_topic is None:
                raise CommandError(
                    f"Target institute {institute.code} does not have topic {topic_code}. Seed academics first."
                )

        if local_program is None:
            local_program = Program.objects.filter(institute=institute, code="CLS7").first()
        return local_program, local_subject, local_topic

    def _resolve_local_scope_for_master_question(
        self,
        *,
        institute,
        master_question,
        default_program,
        default_subject,
        default_topic,
    ):
        local_subject = default_subject
        local_topic = default_topic
        local_program = default_program

        if local_subject is None:
            local_subject = Subject.objects.filter(
                institute=institute,
                code=master_question.source_subject.code,
            ).first()
            if local_subject is None:
                raise CommandError(
                    f"Target institute {institute.code} does not have subject "
                    f"{master_question.source_subject.code}. Seed academics first."
                )
        if local_program is None:
            local_program = local_subject.program or Program.objects.filter(
                institute=institute,
                code="CLS7",
            ).first()
        if local_topic is None and master_question.source_topic_id:
            local_topic = Topic.objects.filter(
                institute=institute,
                subject=local_subject,
                code=master_question.source_topic.code,
            ).first()
        return local_program, local_subject, local_topic

    def _resolve_master_questions(
        self,
        *,
        source_institute,
        subject_code,
        topic_code,
        question_ids,
        visibility,
    ):
        queryset = MasterQuestion.objects.filter(
            source_institute=source_institute,
            is_active=True,
        ).select_related("source_program", "source_subject", "source_topic")
        if subject_code:
            queryset = queryset.filter(source_subject__code=subject_code)
        if topic_code:
            queryset = queryset.filter(source_topic__code=topic_code)
        if question_ids:
            queryset = queryset.filter(id__in=question_ids)
        if visibility:
            queryset = queryset.filter(visibility=visibility)
        return list(queryset.order_by("source_subject__sort_order", "source_topic__sort_order", "created_at"))
