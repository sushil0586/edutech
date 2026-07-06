from django.core.management.base import BaseCommand

from apps.academics.assessment_family_contracts import ASSESSMENT_FAMILY_CONTRACTS
from apps.academics.models import AssessmentFamily


FAMILY_REGISTRY = (
    {
        "code": "school",
        "label": "School",
        "description": "General academic school-style assessments with broad question support.",
        "sort_order": 100,
    },
    {
        "code": "competitive",
        "label": "Competitive",
        "description": "Competitive exam pattern with objective-first scoring and negative marking support.",
        "sort_order": 200,
    },
    {
        "code": "certification",
        "label": "Certification",
        "description": "Certification-style assessments focused on practical validation and best-attempt flows.",
        "sort_order": 300,
    },
    {
        "code": "language_proficiency",
        "label": "Language Proficiency",
        "description": "Language proficiency pattern with rubric-heavy authoring and review flows.",
        "sort_order": 400,
    },
)


class Command(BaseCommand):
    help = "Seed platform assessment-family master rows from the contract registry."

    def handle(self, *args, **options):
        created = 0
        updated = 0

        for entry in FAMILY_REGISTRY:
            contract = ASSESSMENT_FAMILY_CONTRACTS.get(entry["code"], {})
            defaults = {
                "label": entry["label"],
                "description": entry["description"],
                "sort_order": entry["sort_order"],
                "allowed_question_types": contract.get("allowed_question_types", []),
                "scoring_defaults": contract.get("scoring_defaults", {}),
                "delivery_defaults": contract.get("delivery_defaults", {}),
                "analytics_preset": contract.get("analytics_preset", {}),
                "authoring_hints": contract.get("authoring_hints", {}),
                "is_active": True,
            }
            family = AssessmentFamily.objects.filter(code__iexact=entry["code"]).first()
            was_created = family is None
            if family is None:
                family = AssessmentFamily(code=entry["code"], **defaults)
            else:
                family.code = entry["code"]
                for key, value in defaults.items():
                    setattr(family, key, value)
            family.save()
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"Created assessment family {family.code}"))
            else:
                updated += 1
                self.stdout.write(self.style.WARNING(f"Updated assessment family {family.code}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"Assessment family seed complete. Created {created}, updated {updated}."
            )
        )
