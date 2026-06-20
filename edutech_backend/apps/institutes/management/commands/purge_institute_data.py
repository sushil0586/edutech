from collections import defaultdict

from django.apps import apps
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import AccountProfile
from apps.institutes.models import Institute


User = get_user_model()


class Command(BaseCommand):
    help = (
        "Purge all data scoped to an institute code, including the institute record itself. "
        "Runs in dry-run mode unless --apply is provided."
    )

    def add_arguments(self, parser):
        parser.add_argument("code", help="Institute code to purge.")
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually delete the data. Without this flag, only a dry-run summary is printed.",
        )
        parser.add_argument(
            "--keep-users",
            action="store_true",
            help="Keep linked Django auth users after deleting institute-scoped profiles.",
        )

    def handle(self, *args, **options):
        code = str(options["code"]).strip()
        institute = Institute.objects.filter(code=code).first()
        if institute is None:
            raise CommandError(f"Institute with code '{code}' was not found.")

        plan = self._build_plan(institute)
        users = list(
            User.objects.filter(account_profile__institute=institute)
            .distinct()
            .only("id", "username")
        )

        self.stdout.write(self.style.WARNING(f"Institute purge plan for {institute.name} ({institute.code})"))
        self.stdout.write(f"Institute id: {institute.id}")
        for model_label, count in sorted(plan["counts"].items()):
            self.stdout.write(f"- {model_label}: {count}")
        self.stdout.write(f"- auth_users_linked_via_account_profiles: {len(users)}")
        if users:
            self.stdout.write(
                "  Users: " + ", ".join(user.username for user in users)
            )

        if not options["apply"]:
            self.stdout.write(self.style.WARNING("Dry run only. Re-run with --apply to delete this data."))
            return

        with transaction.atomic():
            self._execute_plan(plan)
            if not options["keep_users"] and users:
                deleted_count, _ = User.objects.filter(id__in=[user.id for user in users]).delete()
                self.stdout.write(self.style.SUCCESS(f"Deleted linked auth users: {deleted_count}"))

        self.stdout.write(self.style.SUCCESS("Institute purge complete."))

    def _build_plan(self, institute):
        counts = defaultdict(int)
        querysets = []

        for model in apps.get_models():
            if model is Institute or model._meta.abstract or model._meta.proxy:
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

            queryset = model._default_manager.filter(institute_id=institute.id)
            count = queryset.count()
            if count <= 0:
                continue

            counts[model._meta.label] = count
            querysets.append((model._meta.label, queryset))

        counts[Institute._meta.label] = 1
        return {
            "institute": institute,
            "counts": counts,
            "querysets": querysets,
        }

    def _execute_plan(self, plan):
        for model_label, queryset in plan["querysets"]:
            deleted_count, _ = queryset.delete()
            self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_count} from {model_label}"))

        institute = plan["institute"]
        deleted_count, _ = Institute.objects.filter(pk=institute.pk).delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted institute rows: {deleted_count}"))
