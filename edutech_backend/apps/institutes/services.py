from django.utils import timezone

from apps.institutes.models import (
    InstituteOnboardingProfile,
    InstituteOnboardingRun,
    InstituteOnboardingRunStatus,
    InstituteOnboardingTaskRun,
    InstituteOnboardingTaskStatus,
)


def start_institute_onboarding_run(
    *,
    institute,
    profile_code="",
    source="master_defaults",
    status=InstituteOnboardingRunStatus.RUNNING,
    requested_config_json=None,
    resolved_config_json=None,
    initiated_by=None,
):
    profile = None
    normalized_profile_code = str(profile_code or "").strip().upper()
    if normalized_profile_code:
        profile = InstituteOnboardingProfile.objects.filter(code=normalized_profile_code).first()

    initiated_by_user_id = None
    if initiated_by is not None:
        initiated_by_user_id = getattr(initiated_by, "id", None)

    return InstituteOnboardingRun.objects.create(
        institute=institute,
        profile=profile,
        profile_code=normalized_profile_code,
        source=str(source or "master_defaults").strip() or "master_defaults",
        status=status,
        requested_config_json=requested_config_json or {},
        resolved_config_json=resolved_config_json or {},
        initiated_by_user_id=initiated_by_user_id,
        started_at=timezone.now(),
    )


def resume_institute_onboarding_run(*, run):
    run.status = InstituteOnboardingRunStatus.RUNNING
    run.error_summary = ""
    if run.started_at is None:
        run.started_at = timezone.now()
    run.completed_at = None
    run.save(update_fields=["status", "error_summary", "started_at", "completed_at", "updated_at"])
    return run


def record_institute_onboarding_task(
    *,
    run,
    task_code,
    label="",
    status=InstituteOnboardingTaskStatus.COMPLETED,
    message="",
    result_json=None,
):
    now = timezone.now()
    return InstituteOnboardingTaskRun.objects.create(
        run=run,
        task_code=str(task_code or "").strip(),
        label=str(label or "").strip(),
        status=status,
        message=str(message or "").strip(),
        result_json=result_json or {},
        started_at=now,
        completed_at=now if status != InstituteOnboardingTaskStatus.PENDING else None,
    )


def complete_institute_onboarding_run(
    *,
    run,
    status=InstituteOnboardingRunStatus.COMPLETED,
    error_summary="",
):
    run.status = status
    run.error_summary = str(error_summary or "").strip()
    run.completed_at = timezone.now()
    run.save(update_fields=["status", "error_summary", "completed_at", "updated_at"])
    return run
