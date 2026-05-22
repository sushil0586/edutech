from django.contrib import admin

from apps.accounts.models import AccountProfile


@admin.register(AccountProfile)
class AccountProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "institute", "student_profile", "teacher_profile", "is_active")
    list_filter = ("role", "institute", "is_active")
    search_fields = ("user__username", "user__email")
    ordering = ("user__username",)
    autocomplete_fields = ("user", "institute", "student_profile", "teacher_profile")
