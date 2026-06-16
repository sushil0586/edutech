from django.contrib import admin

from apps.geography.models import City, Country, PostalCode, State
from common.admin import RichModelAdmin


@admin.register(Country)
class CountryAdmin(RichModelAdmin):
    list_display = ("name", "code", "sort_order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "code")
    ordering = ("sort_order", "name")


@admin.register(State)
class StateAdmin(RichModelAdmin):
    list_display = ("name", "code", "country", "sort_order", "is_active")
    list_filter = ("country", "is_active")
    search_fields = ("name", "code", "country__name")
    ordering = ("country__sort_order", "sort_order", "name")


@admin.register(City)
class CityAdmin(RichModelAdmin):
    list_display = ("name", "state", "country_name", "sort_order", "is_active")
    list_filter = ("state__country", "state", "is_active")
    search_fields = ("name", "state__name", "state__country__name")
    ordering = ("state__country__sort_order", "state__sort_order", "sort_order", "name")

    @admin.display(description="Country")
    def country_name(self, obj):
        return obj.state.country.name


@admin.register(PostalCode)
class PostalCodeAdmin(RichModelAdmin):
    list_display = ("code", "city", "state_name", "country_name", "sort_order", "is_active")
    list_filter = ("city__state__country", "city__state", "city", "is_active")
    search_fields = ("code", "city__name", "city__state__name", "city__state__country__name")
    ordering = (
        "city__state__country__sort_order",
        "city__state__sort_order",
        "city__sort_order",
        "sort_order",
        "code",
    )

    @admin.display(description="State")
    def state_name(self, obj):
        return obj.city.state.name

    @admin.display(description="Country")
    def country_name(self, obj):
        return obj.city.state.country.name
