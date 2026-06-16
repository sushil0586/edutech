from django.core.management.base import BaseCommand
from django.db import transaction

from apps.geography.models import City, Country, PostalCode, State
from apps.geography.services import DEFAULT_GEOGRAPHY_SEED


class Command(BaseCommand):
    help = "Seed default geography masters for onboarding and analytics."

    @transaction.atomic
    def handle(self, *args, **options):
        for country_payload in DEFAULT_GEOGRAPHY_SEED:
            country_data = country_payload["country"]
            country, _ = Country.objects.update_or_create(
                code=country_data["code"],
                defaults={
                    "name": country_data["name"],
                    "sort_order": country_data.get("sort_order", 0),
                    "is_active": True,
                },
            )
            for state_payload in country_payload["states"]:
                state, _ = State.objects.update_or_create(
                    country=country,
                    code=state_payload["code"],
                    defaults={
                        "name": state_payload["name"],
                        "sort_order": state_payload.get("sort_order", 0),
                        "is_active": True,
                    },
                )
                for city_payload in state_payload["cities"]:
                    city, _ = City.objects.update_or_create(
                        state=state,
                        name=city_payload["name"],
                        defaults={
                            "sort_order": city_payload.get("sort_order", 0),
                            "is_active": True,
                        },
                    )
                    for index, postal_code in enumerate(city_payload.get("pincodes", []), start=1):
                        PostalCode.objects.update_or_create(
                            city=city,
                            code=postal_code,
                            defaults={
                                "sort_order": index * 10,
                                "is_active": True,
                            },
                        )

        self.stdout.write(self.style.SUCCESS("Default geography seeded successfully."))
