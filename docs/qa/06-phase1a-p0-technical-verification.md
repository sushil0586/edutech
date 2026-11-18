# Phase 1A P0 Technical Verification

Date: 2026-10-14

Scope: P0 Architecture and Core Workflow Verification using the Phase 0 discovery artifacts in `docs/qa/00-product-discovery-report.md` through `docs/qa/05-production-certification-roadmap.md` as baseline.

This phase did not certify production readiness. It narrowed two P0 findings to verified root causes, fixed the confirmed lifecycle regression in the focused test path, and left broader certification gates open.

## Executive Result

| Area | Phase 0 finding | Phase 1A result | Classification |
| --- | --- | --- | --- |
| Django route/API-source mismatch | Backend app URL/view/serializer modules appeared absent by static file search | URL, view, and serializer modules are implemented as packages with `__init__.py`; resolver imports and controlled requests succeeded | False positive for missing source |
| Institute exam lifecycle | Assigned exam was not visible/startable for intended student | Two test workflow defects were confirmed: roster provisioning used the wrong selected institute, and exam publish was attempted without a schedule while the helper accepted static UI copy as success | Confirmed defects in E2E workflow/fixture; fixed |
| Evidence capture | Browser trace expected for failed workflow | `--trace on` reached the attempt and save state, then failed during artifact packaging with `file data stream has unexpected number of bytes`; `--trace off` passed | Unresolved tooling/evidence capture issue |

## 1. Django Route/API Source Mismatch

### Evidence Traced

Root routing begins in `edutech_backend/config/urls.py` and includes app URL packages rather than flat `urls.py` files. Phase 0 searched for `edutech_backend/apps/**/urls.py`, which returned zero because the active implementation uses:

- `edutech_backend/apps/accounts/urls/__init__.py`
- `edutech_backend/apps/academics/urls/__init__.py`
- `edutech_backend/apps/institutes/urls/__init__.py`
- `edutech_backend/apps/students/urls/__init__.py`
- `edutech_backend/apps/teachers/urls/__init__.py`
- `edutech_backend/apps/question_bank/urls/__init__.py`
- `edutech_backend/apps/exams/urls/__init__.py`
- `edutech_backend/apps/attempts/urls/__init__.py`
- `edutech_backend/apps/results/urls/__init__.py`
- `edutech_backend/apps/economy/urls/__init__.py`
- `edutech_backend/apps/parents/urls/__init__.py`
- `edutech_backend/apps/reports/urls/__init__.py`
- `edutech_backend/apps/reports/admin_urls.py`

The same package-module pattern exists for views and serializers through `views/__init__.py` and `serializers/__init__.py`.

### Runtime Checks

Executed focused resolver import through Django shell:

```bash
../edutech_backend/.venv/bin/python manage.py shell -c "from django.urls import get_resolver; ..."
```

Result: root patterns and every `api/v1/...` include imported from the package URL modules above.

Executed controlled request smoke with Django test client and `override_settings(ALLOWED_HOSTS=['testserver','localhost','127.0.0.1'])`:

| Route | Result | Notes |
| --- | --- | --- |
| `/api/v1/health/` | 200 | JSON health response |
| `/api/schema/` | 200 | Schema rendered, but emitted drf-spectacular introspection warnings |
| `/api/v1/auth/register/options/` | 200 | Public auth metadata reachable |
| `/api/v1/student/exams/available/` | 401 | Expected unauthenticated response |
| `/api/v1/exams/` | 401 | Expected unauthenticated response |
| `/api/v1/institutes/onboarding-profiles/` | 401 | Expected unauthenticated response |

### Why `manage.py check` Passed

`manage.py check` passed because Django can import the configured include modules. The apparent mismatch came from a flat-file static discovery command that did not account for Python package modules. `manage.py check` does not prove end-to-end route behavior, auth correctness, or OpenAPI quality, but it correctly did not flag missing URL modules because they are present and importable.

### Classification

| Issue | Result |
| --- | --- |
| Missing app URL modules | False positive |
| Missing app view/serializer modules | False positive |
| Request-level route import smoke | Verified for sampled public/protected endpoints |
| OpenAPI schema warnings | Unresolved P1 quality issue |
| Django test client `ALLOWED_HOSTS` requiring override for `testserver` | P1 test environment/configuration issue |

## 2. Institute Exam Lifecycle Failure

### Original Failure

Focused spec: `edutech_web/tests/e2e/workflow/institute-full-access-exam-lifecycle.mutable.spec.ts`

Original observed failure: the student reached exam detail and saw "This exam is not available in your workspace."

### Root Cause A: Roster Provisioning Used Wrong Institute Context

The spec created a disposable institute, then navigated to:

- `/admin/people?view=teachers`
- `/admin/people?view=students`

`edutech_web/src/app/(admin)/admin/people/page.tsx` resolves the selected institute through `normalizeSelectedInstitute()`. Without `institute=<id>`, the page may select a different active institute than the disposable one. That means the exam could be created in one institute while the student belonged to another.

Fix applied in `edutech_web/tests/e2e/workflow/institute-full-access-exam-lifecycle.mutable.spec.ts`:

- `createTeacherViaUi(page, institute.id)` navigates to `/admin/people?view=teachers&institute=${institute.id}`
- `createStudentViaUi(page, institute.id)` navigates to `/admin/people?view=students&institute=${institute.id}`

Classification: confirmed E2E fixture defect.

### Root Cause B: Publish Helper Accepted Static UI Copy

After Root Cause A was fixed, the student could see the intended exam, but the Start button was disabled as "Not Available Yet".

Database evidence for failed run `PW Full Access Exam 1791979847924311`:

- `status`: `draft`
- `assignment_mode`: `selected_students`
- `start_at`: `None`
- `end_at`: `2027-03-31 23:59:59+00:00`
- assignment existed for the intended student in the same institute
- questions count: 5
- publish readiness blocker: `missing_schedule` on `start_at`

The helper clicked "Make Exam Available" and waited for `/making available|available/`, which matched static UI text even when publish readiness rejected the exam. The advanced builder flow had not supplied a required `start_at`.

Fix applied in `edutech_web/tests/e2e/workflow/institute-full-access-exam-lifecycle.mutable.spec.ts`:

- fills `Start at` with `now - 5 minutes`
- fills `End at` with `now + 2 hours`
- replaces static text assertion with polling `/api/institute/exams/${examId}` until persisted status is `scheduled` or `live`
- reports publish readiness blockers if the exam remains `draft`
- restores the admin session before disposable institute cleanup so synthetic data deletion runs with admin authorization

Classification: confirmed E2E workflow defect with a real readiness precondition.

### Cleanup Verification

The original passing run left the browser authenticated as the student before cleanup, and server logs showed `DELETE /api/admin/institutes/...` returning 401. The focused spec now calls `loginAsRole(page, "admin")` in `finally` before invoking `deleteDisposableInstitute()`.

Follow-up warm run evidence showed cleanup succeeded:

- Backend: `DELETE /api/v1/institutes/3fad7b54-80e0-4ce9-9205-5ec831fdc24a/` returned 200.
- Next route: `DELETE /api/admin/institutes/3fad7b54-80e0-4ce9-9205-5ec831fdc24a` returned 200.

### Backend Logic Cross-Check

Focused Django regression tests passed:

```bash
../edutech_backend/.venv/bin/python manage.py test \
  apps.accounts.tests.test_auth_access.AuthenticationAccessControlTestCase.test_selected_student_assignment_limits_exam_visibility_and_start \
  apps.accounts.tests.test_auth_access.AuthenticationAccessControlTestCase.test_selected_student_assignment_overrides_program_scope_for_visibility_and_detail \
  apps.exams.tests.test_exam_api_contracts.ExamApiContractTests.test_retrieve_includes_slot_payloads_and_student_override_fields \
  --keepdb
```

Result: 3 passed.

This supports that selected-student visibility and detail behavior work when institute/student/exam fixtures are internally consistent.

## Tests Executed

| Test/check | Command | Result |
| --- | --- | --- |
| Focused TypeScript compile for modified spec | `npx tsc --noEmit ... tests/e2e/workflow/institute-full-access-exam-lifecycle.mutable.spec.ts` | Passed |
| Focused Django assignment/detail regression tests | `manage.py test ... --keepdb` | Passed, 3 tests |
| Focused Playwright lifecycle with trace | `npx playwright test tests/e2e/workflow/institute-full-access-exam-lifecycle.mutable.spec.ts --project=chromium --trace on` | Failed during artifact packaging after reaching attempt/save state |
| Focused Playwright lifecycle without trace | `npx playwright test tests/e2e/workflow/institute-full-access-exam-lifecycle.mutable.spec.ts --project=chromium --trace off` | Passed, 1 test; final warm cleanup-aware run passed in 1.5m |
| Cleanup-aware cold run | Same focused Playwright command after restarting dev servers | Failed by 300s timeout during cold Next/Turbopack compilation, before product assertion; rerun on warm server passed |
| Global web typecheck | `npm run typecheck -- --pretty false` | Failed due pre-existing unrelated test typing errors |

## Evidence Paths

Successful/focused source changes:

- `edutech_web/tests/e2e/workflow/institute-full-access-exam-lifecycle.mutable.spec.ts`
- `docs/qa/04-master-qa-coverage-matrix.md`
- `docs/qa/06-phase1a-p0-technical-verification.md`

Current Playwright output retained after final passing run:

- `edutech_web/test-results/workflow-institute-full-ac-a9769--run-a-student-exam-attempt-chromium/pw-full-access-exam-1791980867703385-questions.csv`

Observed but not retained after reruns:

- The trace-on failure produced `error-context.md` and `test-failed-1.png` in the same Playwright output directory, but the final passing rerun reused that directory and removed the failure artifacts.
- The earlier pre-fix reproduction produced a `trace.zip`, `error-context.md`, and `test-failed-1.png`, but those were also overwritten by subsequent focused reruns.

Evidence handling note: the same Playwright output directory name is reused by this spec, so failure artifacts must be copied to a run-stamped archive before any future reruns that need preservation.

## Remaining P0/P1 Blockers

| Priority | Blocker | Current status |
| --- | --- | --- |
| P0 | Full lifecycle with trace artifact capture | Application path passes without trace; trace-on run failed during artifact packaging, not at the original assertion |
| P0 | Broad attempt submit/results certification | Not executed in Phase 1A |
| P0 | Auth and role isolation full matrix | Only focused backend selected-student tests and one browser lifecycle path executed |
| P1 | OpenAPI schema generation warnings | `/api/schema/` returns 200 but emits drf-spectacular warnings |
| P1 | Global web typecheck | Blocked by unrelated pre-existing spec typing errors |
| P1 | Durable evidence archiving | Current `test-results` path is reused by Playwright |
| P1 | Cold-start Playwright timeout budget | Restarted dev servers caused the focused spec to exceed 300s before assignment interaction; warm run passed |

## Recommendation for Phase 1B

1. Add a run-stamped evidence archive step for focused Playwright traces/screenshots/API payloads before rerunning specs.
2. Investigate the Playwright trace-on artifact packaging failure separately from application behavior.
3. Extend the now-passing lifecycle to submit attempt, verify result generation, and verify institute/student role visibility.
4. Run focused negative isolation cases: student from another institute, inactive assignment, draft exam, future schedule, expired window.
5. Triage global typecheck failures only after P0 lifecycle evidence capture is stable.
6. Keep Django route architecture unchanged; address schema warnings as a P1 API documentation/contract task.
