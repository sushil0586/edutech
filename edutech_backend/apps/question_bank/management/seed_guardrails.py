from django.core.management.base import CommandError

from apps.academics.services import audit_academic_catalog


def assert_catalog_scope_is_consistent(*, institute_code=None, subject_code=None):
    findings = audit_academic_catalog(
        institute_code=institute_code,
        subject_code=subject_code,
        fail_on_empty_active_topics=False,
    )
    if not findings:
        return

    summaries = []
    for finding in findings:
        summaries.append(f"{finding['code']} ({len(finding.get('records', []))})")
    scope = []
    if institute_code:
        scope.append(f"institute={institute_code}")
    if subject_code:
        scope.append(f"subject={subject_code}")
    scope_label = ", ".join(scope) if scope else "global scope"
    raise CommandError(
        "Academic catalog audit failed for "
        f"{scope_label}: {', '.join(summaries)}. "
        "Run `python manage.py audit_academic_catalog --fail-on-findings` and fix the catalog before seeding questions."
    )


def ensure_subject_seed_scope_is_active(subject):
    if subject.program_id and not subject.program.is_active:
        subject.program.is_active = True
        subject.program.save(update_fields=["is_active", "updated_at"])
    if not subject.is_active:
        subject.is_active = True
        subject.save(update_fields=["is_active", "updated_at"])


def ensure_topic_seed_scope_is_active(topic):
    current = topic
    while current is not None:
        if not current.is_active:
            current.is_active = True
            current.save(update_fields=["is_active", "updated_at"])
        current = current.parent_topic
