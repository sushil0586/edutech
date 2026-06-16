from django.core.exceptions import ValidationError
from django.db.models import Prefetch

from apps.geography.models import City, Country, PostalCode, State


DEFAULT_GEOGRAPHY_SEED = [
    {
        "country": {"name": "India", "code": "IN", "sort_order": 10},
        "states": [
            {
                "name": "Delhi",
                "code": "DL",
                "sort_order": 10,
                "cities": [
                    {"name": "Delhi", "sort_order": 10, "pincodes": ["110001"]},
                    {"name": "New Delhi", "sort_order": 20, "pincodes": ["110001"]},
                    {"name": "Dwarka", "sort_order": 30, "pincodes": ["110075"]},
                    {"name": "Rohini", "sort_order": 40, "pincodes": ["110085"]},
                ],
            },
            {
                "name": "Maharashtra",
                "code": "MH",
                "sort_order": 20,
                "cities": [
                    {"name": "Mumbai", "sort_order": 10, "pincodes": ["400001"]},
                    {"name": "Pune", "sort_order": 20, "pincodes": ["411001"]},
                    {"name": "Nagpur", "sort_order": 30, "pincodes": ["440001"]},
                ],
            },
            {
                "name": "Karnataka",
                "code": "KA",
                "sort_order": 30,
                "cities": [
                    {"name": "Bengaluru", "sort_order": 10, "pincodes": ["560001"]},
                    {"name": "Mysuru", "sort_order": 20, "pincodes": ["570001"]},
                    {"name": "Mangaluru", "sort_order": 30, "pincodes": ["575001"]},
                ],
            },
            {
                "name": "Tamil Nadu",
                "code": "TN",
                "sort_order": 40,
                "cities": [
                    {"name": "Chennai", "sort_order": 10, "pincodes": ["600001"]},
                    {"name": "Coimbatore", "sort_order": 20, "pincodes": ["641001"]},
                    {"name": "Madurai", "sort_order": 30, "pincodes": ["625001"]},
                ],
            },
            {
                "name": "Uttar Pradesh",
                "code": "UP",
                "sort_order": 50,
                "cities": [
                    {"name": "Lucknow", "sort_order": 10, "pincodes": ["226001"]},
                    {"name": "Noida", "sort_order": 20, "pincodes": ["201301"]},
                    {"name": "Kanpur", "sort_order": 30, "pincodes": ["208001"]},
                ],
            },
        ],
    }
]


def build_location_catalog():
    countries = (
        Country.objects.filter(is_active=True)
        .prefetch_related(
            Prefetch(
                "states",
                queryset=State.objects.filter(is_active=True).prefetch_related(
                    Prefetch(
                        "cities",
                        queryset=City.objects.filter(is_active=True).prefetch_related(
                            Prefetch(
                                "postal_codes",
                                queryset=PostalCode.objects.filter(is_active=True).order_by("sort_order", "code"),
                            )
                        ).order_by("sort_order", "name"),
                    )
                ).order_by("sort_order", "name"),
            )
        )
        .order_by("sort_order", "name")
    )

    catalog = []
    for country in countries:
        state_items = []
        for state in country.states.all():
            city_items = []
            for city in state.cities.all():
                city_items.append(
                    {
                        "name": city.name,
                        "pincodes": [postal.code for postal in city.postal_codes.all()],
                    }
                )
            state_items.append({"name": state.name, "cities": city_items})
        catalog.append({"country": country.name, "states": state_items})
    return catalog


def has_active_geography_data():
    return Country.objects.filter(is_active=True).exists()


def resolve_location_selection(*, country_name, state_name, city_name, postal_code):
    country = Country.objects.filter(name__iexact=(country_name or "").strip(), is_active=True).first()
    if country is None:
        raise ValidationError({"country": "Selected country is not valid."})

    state = State.objects.filter(
        country=country,
        name__iexact=(state_name or "").strip(),
        is_active=True,
    ).first()
    if state is None:
        raise ValidationError({"state": "Selected state is not valid for the chosen country."})

    city = City.objects.filter(
        state=state,
        name__iexact=(city_name or "").strip(),
        is_active=True,
    ).first()
    if city is None:
        raise ValidationError({"city": "Selected city is not valid for the chosen state."})

    postal = PostalCode.objects.filter(
        city=city,
        code=(postal_code or "").strip(),
        is_active=True,
    ).first()
    if postal is None:
        raise ValidationError({"pincode": "Selected pincode is not valid for the chosen city."})

    return {
        "country": country.name,
        "state": state.name,
        "city": city.name,
        "pincode": postal.code,
    }
