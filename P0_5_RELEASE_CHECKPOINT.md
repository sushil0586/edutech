# P0.5 Release Checkpoint

## Purpose

This document records the final release-readiness checkpoint for the current P0 closeout.

Related documents:

- [NEXT_P0_CLOSEOUT_IMPLEMENTATION_PLAN.md](./NEXT_P0_CLOSEOUT_IMPLEMENTATION_PLAN.md)
- [P0_2_CRITICAL_WORKFLOW_REGRESSION_MATRIX.md](./P0_2_CRITICAL_WORKFLOW_REGRESSION_MATRIX.md)
- [P0_3_ROLE_SCOPE_VERIFICATION_MATRIX.md](./P0_3_ROLE_SCOPE_VERIFICATION_MATRIX.md)

---

## High-Level Read

The current P0 checkpoint is now in release-hardening shape.

What this means:

- backend migration drift was resolved
- high-risk backend workflows were re-verified
- role and governance boundaries were re-verified
- frontend type safety passed
- production frontend build passed

This is sufficient to treat the current P0 implementation wave as closed and stable enough to move into the next phase.

---

## Verification Summary

## Backend schema and migration readiness

Verified:

1. `./.venv/bin/python manage.py makemigrations --check --dry-run`
2. `./.venv/bin/python manage.py migrate exams 0011`

Outcome:

- no model drift remained in the active checkpoint path
- preset-pack migration applied cleanly

---

## Backend workflow verification

Verified sequential passes:

1. `./.venv/bin/python manage.py test --noinput apps.question_bank.tests.test_bulk_workflows apps.question_bank.tests.test_comprehension_sets apps.question_bank.tests.test_rich_content`
2. `./.venv/bin/python manage.py test --noinput apps.exams.test_advanced_builder_api apps.exams.test_advanced_templates_api apps.exams.test_preset_packs_api`
3. `./.venv/bin/python manage.py test --noinput apps.attempts.tests.test_attempt_workspace_api apps.results.tests.test_smoke_flow apps.accounts.tests.test_auth_access`
4. `./.venv/bin/python manage.py test --noinput apps.accounts.tests.test_auth_access`
5. `./.venv/bin/python manage.py test --noinput apps.exams.test_advanced_templates_api apps.exams.test_preset_packs_api`

Outcome:

- critical authoring, builder, attempt, review, result, and governance flows passed at the targeted checkpoint level

---

## Frontend verification

Verified passes:

1. `npm run typecheck`
2. `npm run build`

Outcome:

- type generation passed
- TypeScript passed
- production build passed

---

## Meaningful Fix During P0.5

### Issue

Frontend production build initially failed because a client-consumed validation helper imported `TeacherBuilderApiError` from `src/lib/api/teacher-builder.ts`, which depends on `src/lib/auth/session.ts`.

That pulled `next/headers` and `server-only` into a browser-side import path.

### Fix

Extracted `TeacherBuilderApiError` into:

- `edutech_web/src/lib/api/teacher-builder-error.ts`

Updated:

- `edutech_web/src/lib/api/teacher-builder.ts`
- `edutech_web/src/lib/teacher/question-bank-validation.ts`

### Result

- server-only auth/session logic no longer leaks into client-side question-bank validation code
- production build completes successfully

---

## Remaining Known Risks

These are not current blockers, but they should remain visible:

1. browser-level manual sanity checks are still useful for route visibility and empty-state polish across admin, institute, teacher, and student portals
2. local Django test execution should remain sequential in the current PostgreSQL setup to avoid test-database collisions
3. the repo still contains many in-flight changes across adjacent features, so future closeout work should continue avoiding unrelated reversions

---

## Recommendation

The current checkpoint can move beyond P0 closeout.

Recommended next step:

- begin the next planned phase instead of reopening P0 unless a real browser regression or production issue appears

Status:

- `P0 closeout: complete for the current checkpoint`
