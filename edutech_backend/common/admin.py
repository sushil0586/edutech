import json

from django.contrib import admin
from django.db import models
from django.utils.html import format_html


class RichModelAdmin(admin.ModelAdmin):
    empty_value_display = "--"
    list_per_page = 50
    save_on_top = True
    show_full_result_count = True

    def get_readonly_fields(self, request, obj=None):
        readonly = list(super().get_readonly_fields(request, obj))
        model_fields = {field.name: field for field in self.model._meta.get_fields()}
        for field_name in ("id", "created_at", "updated_at"):
            if field_name in model_fields and field_name not in readonly:
                readonly.append(field_name)
        return tuple(readonly)


class ReadOnlyAdmin(RichModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class JsonPreviewAdminMixin:
    json_preview_fields = ()

    @staticmethod
    def render_json(value):
        if not value:
            return "--"
        try:
            formatted = json.dumps(value, indent=2, sort_keys=True, ensure_ascii=True)
        except TypeError:
            formatted = str(value)
        return format_html("<pre style='white-space: pre-wrap; max-width: 1080px;'>{}</pre>", formatted)

    def get_readonly_fields(self, request, obj=None):
        readonly = list(super().get_readonly_fields(request, obj))
        for field_name in self.json_preview_fields:
            preview_name = f"{field_name}_preview"
            if preview_name not in readonly:
                readonly.append(preview_name)
        return tuple(readonly)

    def get_fields(self, request, obj=None):
        fields = list(super().get_fields(request, obj))
        for field_name in self.json_preview_fields:
            if field_name in fields:
                index = fields.index(field_name)
                fields[index] = f"{field_name}_preview"
        return fields


def build_json_preview(field_name, description=None):
    @admin.display(description=description or field_name.replace("_", " ").title())
    def _preview(self, obj):
        value = getattr(obj, field_name, None)
        return JsonPreviewAdminMixin.render_json(value)

    _preview.__name__ = f"{field_name}_preview"
    return _preview


class RichTabularInline(admin.TabularInline):
    extra = 0
    show_change_link = True
