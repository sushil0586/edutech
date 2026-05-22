from django.core.exceptions import ValidationError


def validate_teacher_assignment_relations(instance):
    if instance.teacher.institute_id != instance.institute_id:
        raise ValidationError({"teacher": "Teacher must belong to the same institute."})
    if instance.academic_year.institute_id != instance.institute_id:
        raise ValidationError({"academic_year": "Academic year must belong to the same institute."})
    if instance.program.institute_id != instance.institute_id:
        raise ValidationError({"program": "Program must belong to the same institute."})
    if instance.subject.institute_id != instance.institute_id:
        raise ValidationError({"subject": "Subject must belong to the same institute."})
    if instance.subject.program_id and instance.subject.program_id != instance.program_id:
        raise ValidationError({"subject": "Subject program must match the selected program."})

    if instance.cohort_id:
        if instance.cohort.institute_id != instance.institute_id:
            raise ValidationError({"cohort": "Cohort must belong to the same institute."})
        if instance.cohort.program_id != instance.program_id:
            raise ValidationError({"cohort": "Cohort must match the selected program."})
        if instance.cohort.academic_year_id != instance.academic_year_id:
            raise ValidationError({"cohort": "Cohort must match the selected academic year."})

    duplicate_scope = instance.__class__.objects.filter(
        teacher=instance.teacher,
        academic_year=instance.academic_year,
        program=instance.program,
        cohort=instance.cohort,
        subject=instance.subject,
        assignment_role=instance.assignment_role,
    ).exclude(pk=instance.pk)
    if duplicate_scope.exists():
        raise ValidationError(
            {
                "assignment_role": (
                    "This teacher already has the same assignment role for the selected scope."
                )
            }
        )

    if instance.is_primary:
        queryset = instance.__class__.objects.filter(
            institute=instance.institute,
            academic_year=instance.academic_year,
            program=instance.program,
            cohort=instance.cohort,
            subject=instance.subject,
            is_primary=True,
        ).exclude(pk=instance.pk)
        if queryset.exists():
            raise ValidationError(
                {"is_primary": "Only one primary assignment is allowed for this teaching scope."}
            )
