import os
import shutil
import subprocess
from collections import defaultdict
from pathlib import Path

from django.apps import apps
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import AccountProfile
from apps.academics.models import Program, Subject, Topic
from apps.institutes.models import Institute
from apps.question_bank.models import MasterQuestion, MasterQuestionAttachment, MasterQuestionOption


User = get_user_model()


class Command(BaseCommand):
    help = (
        "Reset onboarding/runtime institute data while preserving the master question library "
        "and the minimal source institute catalog rows it depends on."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually delete data. Without this flag, only a dry-run summary is printed.",
        )
        parser.add_argument(
            "--skip-backup",
            action="store_true",
            help="Skip the automatic SQLite backup before applying the reset.",
        )

    def handle(self, *args, **options):
        plan = self._build_plan()
        self._print_plan(plan)

        if not options["apply"]:
            self.stdout.write(self.style.WARNING("Dry run only. Re-run with --apply to execute the reset."))
            return

        backup_path = None
        if not options["skip_backup"]:
            backup_path = self._backup_database()

        with transaction.atomic():
            self._execute_plan(plan)

        if backup_path is not None:
            self.stdout.write(self.style.SUCCESS(f"Database backup created at: {backup_path}"))
        self.stdout.write(self.style.SUCCESS("End-to-end onboarding reset complete."))

    def _build_plan(self):
        preserve_institute_ids = set(
            MasterQuestion.objects.values_list("source_institute_id", flat=True).distinct()
        )
        preserve_program_ids = set(
            MasterQuestion.objects.exclude(source_program_id__isnull=True)
            .values_list("source_program_id", flat=True)
            .distinct()
        )
        preserve_subject_ids = set(
            MasterQuestion.objects.values_list("source_subject_id", flat=True).distinct()
        )
        preserve_topic_ids = set(
            MasterQuestion.objects.exclude(source_topic_id__isnull=True)
            .values_list("source_topic_id", flat=True)
            .distinct()
        )
        preserve_topic_ids = self._expand_topic_ancestors(
            topic_ids=preserve_topic_ids,
            preserve_institute_ids=preserve_institute_ids,
        )

        excluded_models = {
            Institute,
            AccountProfile,
            Program,
            Subject,
            Topic,
            MasterQuestion,
            MasterQuestionOption,
            MasterQuestionAttachment,
        }

        direct_institute_deletes = []
        global_deletes = []
        delete_counts = defaultdict(int)

        for model in apps.get_models():
            if model in excluded_models or model._meta.abstract or model._meta.proxy:
                continue

            institute_field = None
            for field in model._meta.get_fields():
                if (
                    getattr(field, "concrete", False)
                    and getattr(field, "is_relation", False)
                    and getattr(field, "many_to_one", False)
                    and getattr(field, "name", "") == "institute"
                    and getattr(getattr(field, "remote_field", None), "model", None) is Institute
                ):
                    institute_field = field
                    break

            if institute_field is None:
                continue

            queryset = model._default_manager.all()
            count = queryset.count()
            if count <= 0:
                continue

            direct_institute_deletes.append((model._meta.label, queryset))
            delete_counts[model._meta.label] = count

        institute_user_ids = list(
            User.objects.filter(account_profile__institute__isnull=False)
            .distinct()
            .values_list("id", flat=True)
        )
        institute_usernames = list(
            User.objects.filter(id__in=institute_user_ids).order_by("username").values_list("username", flat=True)
        )
        account_profile_count = AccountProfile.objects.filter(institute__isnull=False).count()
        if account_profile_count:
            delete_counts[AccountProfile._meta.label] = account_profile_count
        if institute_user_ids:
            delete_counts["auth.User[institute_linked]"] = len(institute_user_ids)

        session_count = Session.objects.count()
        if session_count:
            global_deletes.append((Session._meta.label, Session.objects.all()))
            delete_counts[Session._meta.label] = session_count

        non_preserved_institute_qs = Institute.objects.exclude(id__in=preserve_institute_ids)
        preserved_institute_qs = Institute.objects.filter(id__in=preserve_institute_ids)

        unused_topics_qs = Topic.objects.filter(institute_id__in=preserve_institute_ids).exclude(id__in=preserve_topic_ids)
        unused_subjects_qs = Subject.objects.filter(institute_id__in=preserve_institute_ids).exclude(
            id__in=preserve_subject_ids
        )
        unused_programs_qs = Program.objects.filter(institute_id__in=preserve_institute_ids).exclude(
            id__in=preserve_program_ids
        )

        if unused_topics_qs.exists():
            delete_counts[Topic._meta.label + "[unused_preserved_sources]"] = unused_topics_qs.count()
        if unused_subjects_qs.exists():
            delete_counts[Subject._meta.label + "[unused_preserved_sources]"] = unused_subjects_qs.count()
        if unused_programs_qs.exists():
            delete_counts[Program._meta.label + "[unused_preserved_sources]"] = unused_programs_qs.count()
        if non_preserved_institute_qs.exists():
            delete_counts[Institute._meta.label + "[non_master_sources]"] = non_preserved_institute_qs.count()

        return {
            "preserved_institutes": list(
                preserved_institute_qs.values("id", "code", "name", "management_mode").order_by("code")
            ),
            "preserve_counts": {
                "master_questions": MasterQuestion.objects.count(),
                "master_question_options": MasterQuestionOption.objects.count(),
                "master_question_attachments": MasterQuestionAttachment.objects.count(),
                "source_institutes": len(preserve_institute_ids),
                "source_programs": len(preserve_program_ids),
                "source_subjects": len(preserve_subject_ids),
                "source_topics": len(preserve_topic_ids),
            },
            "delete_counts": dict(sorted(delete_counts.items())),
            "direct_institute_deletes": direct_institute_deletes,
            "global_deletes": global_deletes,
            "account_profiles_qs": AccountProfile.objects.filter(institute__isnull=False),
            "institute_user_ids": institute_user_ids,
            "institute_usernames": institute_usernames,
            "unused_topics_qs": unused_topics_qs,
            "unused_subjects_qs": unused_subjects_qs,
            "unused_programs_qs": unused_programs_qs,
            "non_preserved_institutes_qs": non_preserved_institute_qs,
        }

    def _print_plan(self, plan):
        preserve_counts = plan["preserve_counts"]
        self.stdout.write(self.style.WARNING("Preserving master library dependencies:"))
        self.stdout.write(
            "  "
            f"{preserve_counts['master_questions']} master questions, "
            f"{preserve_counts['master_question_options']} options, "
            f"{preserve_counts['master_question_attachments']} attachments"
        )
        self.stdout.write(
            "  "
            f"{preserve_counts['source_institutes']} source institutes, "
            f"{preserve_counts['source_programs']} programs, "
            f"{preserve_counts['source_subjects']} subjects, "
            f"{preserve_counts['source_topics']} topics"
        )
        for institute in plan["preserved_institutes"]:
            self.stdout.write(
                f"  - {institute['code']}: {institute['name']} ({institute['management_mode']})"
            )

        self.stdout.write(self.style.WARNING("Delete plan:"))
        for model_label, count in plan["delete_counts"].items():
            self.stdout.write(f"  - {model_label}: {count}")

        if plan["institute_usernames"]:
            preview = ", ".join(plan["institute_usernames"][:20])
            suffix = "" if len(plan["institute_usernames"]) <= 20 else " ..."
            self.stdout.write(f"  Linked institute users preview: {preview}{suffix}")

    def _backup_database(self):
        database_config = settings.DATABASES["default"]
        engine = database_config.get("ENGINE", "")
        database_name = database_config.get("NAME")
        if not database_name:
            return None

        if engine.endswith("postgresql"):
            return self._backup_postgresql_database(database_config)

        if not database_name:
            return None

        database_path = Path(database_name)
        if not database_path.exists() or not database_path.is_file():
            return None

        timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
        backup_path = database_path.with_name(f"{database_path.name}.backup_reset_{timestamp}")
        shutil.copy2(database_path, backup_path)
        return str(backup_path)

    def _backup_postgresql_database(self, database_config):
        timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = Path.cwd() / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        backup_path = backup_dir / f"{database_config['NAME']}.reset_backup_{timestamp}.dump"

        command = [
            "pg_dump",
            "-Fc",
            "-f",
            str(backup_path),
            "-h",
            str(database_config.get("HOST") or ""),
            "-p",
            str(database_config.get("PORT") or ""),
            "-U",
            str(database_config.get("USER") or ""),
            str(database_config["NAME"]),
        ]
        env = os.environ.copy()
        if database_config.get("PASSWORD"):
            env["PGPASSWORD"] = str(database_config["PASSWORD"])

        try:
            subprocess.run(command, check=True, env=env, capture_output=True, text=True)
        except FileNotFoundError:
            self.stdout.write(self.style.WARNING("pg_dump not found; PostgreSQL backup skipped."))
            return None
        except subprocess.CalledProcessError as exc:
            message = exc.stderr.strip() or exc.stdout.strip() or "Unknown pg_dump error."
            self.stdout.write(self.style.WARNING(f"PostgreSQL backup skipped: {message}"))
            return None
        return str(backup_path)

    def _expand_topic_ancestors(self, *, topic_ids, preserve_institute_ids):
        preserved_ids = {topic_id for topic_id in topic_ids if topic_id}
        if not preserved_ids:
            return preserved_ids

        topic_parent_rows = Topic.objects.filter(institute_id__in=preserve_institute_ids).values_list(
            "id",
            "parent_topic_id",
        )
        parent_by_id = {topic_id: parent_id for topic_id, parent_id in topic_parent_rows}

        queue = list(preserved_ids)
        while queue:
            topic_id = queue.pop()
            parent_id = parent_by_id.get(topic_id)
            if parent_id and parent_id not in preserved_ids:
                preserved_ids.add(parent_id)
                queue.append(parent_id)
        return preserved_ids

    def _execute_plan(self, plan):
        for model_label, queryset in plan["global_deletes"]:
            deleted_count, _ = queryset.delete()
            self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_count} rows from {model_label}"))

        for model_label, queryset in plan["direct_institute_deletes"]:
            deleted_count, _ = queryset.delete()
            self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_count} rows from {model_label}"))

        account_deleted_count, _ = plan["account_profiles_qs"].delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {account_deleted_count} rows from {AccountProfile._meta.label}"))

        if plan["institute_user_ids"]:
            user_deleted_count, _ = User.objects.filter(id__in=plan["institute_user_ids"]).delete()
            self.stdout.write(self.style.SUCCESS(f"Deleted {user_deleted_count} linked auth users"))

        for label, queryset in (
            (Topic._meta.label + "[unused_preserved_sources]", plan["unused_topics_qs"]),
            (Subject._meta.label + "[unused_preserved_sources]", plan["unused_subjects_qs"]),
            (Program._meta.label + "[unused_preserved_sources]", plan["unused_programs_qs"]),
        ):
            count = queryset.count()
            if count <= 0:
                continue
            deleted_count, _ = queryset.delete()
            self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_count} rows from {label}"))

        institute_count = plan["non_preserved_institutes_qs"].count()
        if institute_count > 0:
            deleted_count, _ = plan["non_preserved_institutes_qs"].delete()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Deleted {deleted_count} rows while removing {institute_count} non-master-source institutes"
                )
            )
