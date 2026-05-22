from django.core.exceptions import ValidationError


def validate_academic_year_overlap(instance):
    overlapping_years = instance.__class__.objects.filter(
        institute=instance.institute,
        start_date__lte=instance.end_date,
        end_date__gte=instance.start_date,
    ).exclude(pk=instance.pk)

    if overlapping_years.exists():
        raise ValidationError(
            {"end_date": "Academic year dates overlap with an existing academic year."}
        )
