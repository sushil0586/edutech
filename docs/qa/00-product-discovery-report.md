# Product Discovery Report

Date: 2026-10-14
Scope: read-only repository audit of the top-level `edutech_backend`, `edutech_web`, `nexora_student_mobile`, deployment files, docs, and test artifacts.

## Executive State

The repository contains a large EdTech learning platform with:

- Django backend models, services, migrations, seed commands, and backend tests.
- Next.js web portal with 125 page routes and 93 Next API proxy routes.
- Expo student mobile app with auth, exams, attempts, results, analytics, and profile surfaces.
- 440 Playwright spec files plus backend Django tests and mobile Maestro script entries.
- Existing reference docs and prior audit/runbook docs.

Current product state is **not production-certified**. The codebase has broad implementation breadth, but the audit found launch blockers and many areas that remain **Not Verified** because no full current test execution was performed in this read-only discovery pass.

## Discovery Evidence

Commands run:

- `find edutech_web/src/app -type f -name 'page.tsx' | wc -l` -> `125`
- `find edutech_web/src/app/api -type f -name 'route.ts' | wc -l` -> `93`
- `find edutech_backend/apps -type f -name 'models.py' | wc -l` -> `13`
- `find edutech_backend/apps -type f -name 'urls.py' | wc -l` -> `0`
- `find edutech_backend/apps -type f \( -name '*views*.py' -o -name '*serializers*.py' -o -name 'serializers.py' \) | wc -l` -> `0`
- `find edutech_web/tests/e2e -type f -name '*.spec.ts' | wc -l` -> `440`
- `cd edutech_backend && ../edutech_backend/.venv/bin/python manage.py check` -> `System check identified no issues`

Execution evidence found:

- `edutech_web/test-results/.last-run.json` reports `"status": "failed"`.
- Failure artifact: `edutech_web/test-results/workflow-institute-full-ac-a9769--run-a-student-exam-attempt-chromium/error-context.md`.
- Failed test: `tests/e2e/workflow/institute-full-access-exam-lifecycle.mutable.spec.ts`.
- Observed failure: newly created full-access exam was not visible to the provisioned student; UI showed "This exam is not available in your workspace."

## Confirmed Roles

Defined in `edutech_backend/apps/accounts/models.py`:

- Platform Admin
- Institute Admin
- Teacher
- Student
- Parent

Role permission/scoping helpers exist in:

- `edutech_backend/apps/accounts/permissions.py`
- `edutech_backend/apps/accounts/scopes.py`

## Implemented Product Areas By Source Evidence

| Area | Evidence | State |
| --- | --- | --- |
| Authentication/profile completion | `edutech_web/src/app/(auth)`, `edutech_web/src/lib/auth`, `edutech_backend/apps/accounts` | Partial / Not Verified |
| Platform admin workspace | `edutech_web/src/app/(admin)/admin/*`, admin components | Partial / Not Verified |
| Institute admin workspace | `edutech_web/src/app/(institute)/institute/*` | Partial / Not Verified |
| Teacher workspace | `edutech_web/src/app/(teacher)/teacher/*` | Partial / Not Verified |
| Student web workspace | `edutech_web/src/app/(student)/app/*` | Partial / Not Verified |
| Parent workspace | `edutech_web/src/app/(parent)/parent/*`, `edutech_backend/apps/parents` | Partial / Not Verified |
| Question bank | `edutech_backend/apps/question_bank/models.py`, web question-bank routes/components | Partial / Not Verified |
| Exam builder/lifecycle | `edutech_backend/apps/exams/models.py`, web exam routes | Partial / Confirmed broken in one full-access lifecycle test |
| Attempts | `edutech_backend/apps/attempts/models.py`, student attempt routes | Partial / Not Verified |
| Results/reports/analytics | `edutech_backend/apps/results`, `edutech_backend/apps/reports`, many student/operator report pages | Partial / Not Verified |
| Economy/subscriptions/wallet | `edutech_backend/apps/economy/models.py`, admin/student economy routes | Partial / Not Verified |
| Student mobile app | `nexora_student_mobile/app`, `nexora_student_mobile/src/lib/api` | Partial / Not Verified |

## Critical Findings

| Priority | Finding | Evidence | Classification |
| --- | --- | --- | --- |
| P0 | Backend route modules referenced by `edutech_backend/config/urls.py` are absent from top-level `edutech_backend/apps/*`. | `config/urls.py` includes `apps.institutes.urls`, `apps.academics.urls`, etc.; `find edutech_backend/apps -type f -name 'urls.py'` returned `0`. | Broken / Launch blocker |
| P0 | No top-level backend DRF view/serializer modules found, while web routes proxy to many `/api/v1/...` endpoints. | `find ... '*views*.py'/'*serializers*.py'` returned `0`; Next API routes call `/api/v1/...`. | Broken or incomplete API surface |
| P0 | Latest Playwright execution evidence is failed. | `edutech_web/test-results/.last-run.json`; `error-context.md`. | Confirmed broken |
| P0 | Student exam assignment/visibility flow failed in mutable full-access lifecycle. | Error context shows student route rendered "This exam is not available in your workspace." | Confirmed broken |
| P1 | Broad feature surface exists without current passing execution evidence in this audit. | 125 pages, 93 proxy routes, 440 specs; only failed last-run artifact found. | Not Verified |
| P1 | Mobile app logs auth/API/session details to console. | `nexora_student_mobile/app/(auth)/login.tsx`, `src/lib/api/client.ts`, `src/lib/secure-session.ts`, `src/hooks/use-session-bootstrap.ts`. | Security / privacy risk |
| P1 | Top-level repo contains duplicate/nested `edutech/` app copies. | `edutech/edutech_backend`, `edutech/edutech_web`, `edutech/nexora_student_mobile`. | Operational risk |
| P2 | Many pages use placeholder visual elements and static landing content. | `placeholderDot`, `placeholderPanel`, `edutech_web/src/lib/site-content.ts`, marketing pages. | Partial / UX risk |

## Launch Blockers

1. Resolve backend URL/view/serializer surface mismatch or confirm the deployed backend source lives elsewhere.
2. Re-run backend API import/schema tests against the exact production candidate.
3. Fix the confirmed student exam assignment/visibility failure.
4. Produce a current passing evidence pack for smoke, role-scope, critical CRUD, exam lifecycle, attempt lifecycle, results, and security tests.
5. Validate production configuration: secrets, CORS, CSRF, HSTS, media serving, database migrations, and deployment service files.

## Recommended Next Phase

Move to a **Certification Baseline Phase**:

1. Freeze the active source tree and remove/label duplicate app copies.
2. Run backend import/schema checks that force URL imports.
3. Run focused P0 Playwright smoke suite and the failed full-access lifecycle spec.
4. Build a route-to-API trace matrix from Next pages to backend endpoints.
5. Only after P0 stability, run broad regression, accessibility, security, and performance certification.
