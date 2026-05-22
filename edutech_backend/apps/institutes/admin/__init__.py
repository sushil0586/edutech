from django.contrib import admin

from apps.institutes.models import Institute


@admin.register(Institute)
class InstituteAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "email",
        "phone",
        "city",
        "state",
        "country",
        "is_active",
    )
    list_filter = ("is_active", "country", "state", "city")
    search_fields = ("name", "code", "email", "phone", "city", "state", "country")
    ordering = ("name",)
