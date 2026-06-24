import django_filters
from django.db.models import Q

from apps.question_bank.models import Question


class QuestionFilterSet(django_filters.FilterSet):
    tag = django_filters.UUIDFilter(field_name="tag_maps__tag_id")
    missing_explanation = django_filters.BooleanFilter(method="filter_missing_explanation")
    quality_signal = django_filters.CharFilter(method="filter_quality_signal")
    revision_priority = django_filters.CharFilter(method="filter_revision_priority")

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

    def _quality_buckets(self, queryset):
        emerging = Q(usage_count__lt=3)
        ambiguous = Q(usage_count__gte=3, wrong_count__gt=0, skipped_count__gt=0) & (
            (Q(wrong_count__gte=1) & Q(usage_count__lte=1))
            | (Q(wrong_count__gte=3) & Q(usage_count__lte=5))
            | (Q(wrong_count__gte=6) & Q(usage_count__lte=10))
            | (Q(wrong_count__gte=9) & Q(usage_count__gt=10))
        ) & (
            (Q(skipped_count__gte=1) & Q(usage_count__lte=4))
            | (Q(skipped_count__gte=2) & Q(usage_count__lte=5))
            | (Q(skipped_count__gte=3) & Q(usage_count__lte=10))
            | (Q(skipped_count__gte=4) & Q(usage_count__gt=10))
        )
        revision_candidate = Q(usage_count__gte=3) & (
            (Q(wrong_count__gte=2) & Q(usage_count__lte=3))
            | (Q(wrong_count__gte=3) & Q(usage_count__lte=4))
            | (Q(wrong_count__gte=4) & Q(usage_count__lte=5))
            | (Q(wrong_count__gte=5) & Q(usage_count__lte=7))
            | (Q(wrong_count__gte=7) & Q(usage_count__lte=10))
            | (Q(wrong_count__gte=8) & Q(usage_count__gt=10))
        )
        skip_risk = Q(usage_count__gte=3) & (
            (Q(skipped_count__gte=2) & Q(usage_count__lte=4))
            | (Q(skipped_count__gte=3) & Q(usage_count__lte=6))
            | (Q(skipped_count__gte=4) & Q(usage_count__lte=8))
            | (Q(skipped_count__gte=5) & Q(usage_count__gt=8))
        )
        hard = Q(usage_count__gte=3) & (
            (Q(wrong_count__gte=2) & Q(usage_count__lte=4))
            | (Q(wrong_count__gte=3) & Q(usage_count__lte=6))
            | (Q(wrong_count__gte=4) & Q(usage_count__lte=8))
            | (Q(wrong_count__gte=5) & Q(usage_count__gt=8))
        )
        watch = Q(usage_count__gte=3) & (
            (Q(wrong_count__gte=1) | Q(skipped_count__gte=1))
        )
        return {
            "emerging": emerging,
            "ambiguous": ambiguous,
            "revision_candidate": revision_candidate,
            "skip_risk": skip_risk,
            "hard": hard,
            "watch": watch,
            "healthy": Q(usage_count__gte=3),
        }

    def filter_quality_signal(self, queryset, name, value):
        normalized = str(value or "").strip().lower()
        if not normalized:
            return queryset
        buckets = self._quality_buckets(queryset)
        if normalized == "healthy":
            return queryset.exclude(
                buckets["ambiguous"]
                | buckets["revision_candidate"]
                | buckets["skip_risk"]
                | buckets["hard"]
                | buckets["watch"]
                | buckets["emerging"]
            )
        clause = buckets.get(normalized)
        if clause is None:
            return queryset
        return queryset.filter(clause)

    def filter_revision_priority(self, queryset, name, value):
        normalized = str(value or "").strip().lower()
        if not normalized:
            return queryset
        if normalized == "urgent":
            return self.filter_quality_signal(queryset, "quality_signal", "ambiguous")
        if normalized == "high":
            return queryset.filter(
                self._quality_buckets(queryset)["revision_candidate"] | self._quality_buckets(queryset)["skip_risk"]
            )
        if normalized == "medium":
            return self.filter_quality_signal(queryset, "quality_signal", "hard")
        if normalized == "watch":
            return queryset.filter(
                self._quality_buckets(queryset)["watch"] | self._quality_buckets(queryset)["emerging"]
            )
        if normalized == "none":
            return self.filter_quality_signal(queryset, "quality_signal", "healthy")
        return queryset
