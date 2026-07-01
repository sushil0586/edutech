# Nexora Learn Security Notes

## Pilot Security Priorities

Pilot safety depends on strict data boundaries and predictable workflow access, not on adding more features.

This phase focuses on:

- tenant scope enforcement
- role-aware capability checks
- student data isolation
- safe workflow actions
- auditability
- production-safe defaults

## Tenant Scope Rules

No workflow endpoint should fetch tenant-owned records through unscoped raw UUID lookups.

Unsafe pattern:

- `Model.objects.get(pk=...)`

Preferred pattern:

- build a queryset already restricted to the caller scope
- resolve the object from that scoped queryset
- return `403` for out-of-scope access attempts

Scope helpers live in `apps/accounts/scopes.py`.

## Role Boundaries

Base roles remain:

- `platform_admin`
- `institute_admin`
- `teacher`
- `student`
- `parent`

This phase introduces lightweight capability separation without redesigning auth:

- `can_manage_academics`
- `can_manage_students`
- `can_build_exams`
- `can_publish_results`
- `can_manage_question_bank`
- `can_view_analytics`

Capability checks are implemented as helper-backed permissions so new modules can compose existing patterns instead of widening teacher/admin access by default.

## Workflow Safety

The following workflow classes require scoped access and capability checks:

- attempt start/save/submit/review
- exam publish/cancel/sync actions
- result generation/rank/publish actions
- notifications read/update actions
- analytics and review endpoints
- bulk question-bank actions

Special rules:

- a student may only act on their own student profile and attempt/result data
- a teacher must remain inside their own institute
- an institute admin must remain inside their own institute
- a platform admin may retain full system visibility

## Audit Expectations

Important action endpoints should emit audit logs when they mutate workflow state.

Typical examples:

- attempt start
- attempt submit
- notification read operations
- result publishing
- exam publishing/cancellation

## Production Safety Notes

- Prefer explicit service entry points over hidden model side effects
- Prefer structured action responses so failures are easier to reason about
- Keep prod settings checks green before rollout
- Add tests whenever a new scoped action endpoint is introduced

## Validation Expectations

Minimum validation before pilot rollout:

- `python manage.py test`
- `python manage.py check`
- `python manage.py check --settings=config.settings.prod`
- `flutter analyze`
- `flutter test`
