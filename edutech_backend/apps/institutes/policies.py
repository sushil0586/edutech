DEFAULT_INSTITUTE_MANAGEMENT_MODE = "private_institute_managed"
DEFAULT_ONBOARDING_PROFILE_CATEGORY = "general"
DEFAULT_ONBOARDING_PROFILE_SORT_ORDER = 100
DEFAULT_ONBOARDING_RUN_SOURCE = "master_defaults"
DEFAULT_ONBOARDING_RUN_PROFILE_LABEL = "manual"


def resolve_institute_management_mode(value):
    return value or DEFAULT_INSTITUTE_MANAGEMENT_MODE


def format_onboarding_run_label(*, institute_code, profile_code, status):
    return f"{institute_code} · {profile_code or DEFAULT_ONBOARDING_RUN_PROFILE_LABEL} · {status}"
