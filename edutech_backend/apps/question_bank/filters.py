import django_filters
from django.db.models import Q

from apps.question_bank.models import Question


class QuestionFilterSet(django_filters.FilterSet):
    tag = django_filters.UUIDFilter(field_name="tag_maps__tag_id")
    missing_explanation = django_filters.BooleanFilter(method="filter_missing_explanation")

    class Meta:
        model = Question
        fields = {
            "institute": ["exact"],
            "program": ["exact"],
            "subject": ["exact"],
            "topic": ["exact"],
            "created_by_teacher": ["exact"],
            "question_type": ["exact"],
            "difficulty_level": ["exact"],
            "is_verified": ["exact"],
            "is_active": ["exact"],
        }

    def filter_missing_explanation(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(Q(explanation__isnull=True) | Q(explanation__exact=""))
