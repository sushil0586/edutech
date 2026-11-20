from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import AccountSession


class Command(BaseCommand):
    help = "Delete expired account-session records in bounded batches."

    def add_arguments(self, parser):
        parser.add_argument("--batch-size", type=int, default=1000)

    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        if batch_size < 1 or batch_size > 10000:
            raise ValueError("--batch-size must be between 1 and 10000.")

        ids = list(
            AccountSession.objects.filter(expires_at__lte=timezone.now())
            .order_by("expires_at")
            .values_list("id", flat=True)[:batch_size]
        )
        deleted, _ = AccountSession.objects.filter(id__in=ids).delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted} expired account session(s)."))
