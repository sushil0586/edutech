# Architecture And Security Review

## Architecture Summary

| Layer | Evidence | Observed state |
| --- | --- | --- |
| Backend | Django 6, DRF, SimpleJWT, PostgreSQL in `edutech_backend` | Model/service/test-heavy; top-level API route implementation incomplete by static evidence |
| Web | Next.js 16, React 19 in `edutech_web` | Large role-based app with server actions, server components, and Next API proxy routes |
| Mobile | Expo/React Native in `nexora_student_mobile` | Student-focused app using REST API clients and secure-store session handling |
| Deployment | `deployment/nexora-learn-backend.service`, `deployment/nexora-learn-web.service`, nginx config | Present, not execution-verified |
| Docs | `docs/reference`, backend blueprints/runbooks, e2e docs | Broad documentation base |

## Backend API Risk

`edutech_backend/config/urls.py` references:

- `apps.accounts.urls`
- `apps.institutes.urls`
- `apps.academics.urls`
- `apps.students.urls`
- `apps.teachers.urls`
- `apps.question_bank.urls`
- `apps.exams.urls`
- `apps.attempts.urls`
- `apps.results.urls`
- `apps.economy.urls`
- `apps.parents.urls`
- `apps.reports.urls`

Static audit found:

- `find edutech_backend/apps -type f -name 'urls.py'` -> `0`
- no top-level `views.py`, `*views*.py`, `serializers.py`, or `*serializers*.py` files under `edutech_backend/apps`.

Impact: runtime import of the configured API URL tree is likely broken unless these modules are generated, ignored, or deployed from a different source tree. `manage.py check` passing is not enough because it did not prove route importability.

Priority: P0.

## Authentication And Authorization

Evidence:

- Roles defined in `edutech_backend/apps/accounts/models.py`.
- Role permissions in `edutech_backend/apps/accounts/permissions.py`.
- Query scoping in `edutech_backend/apps/accounts/scopes.py`.
- Next auth/session logic in `edutech_web/src/lib/auth/session.ts`.
- JWT configured in `edutech_backend/config/settings/base.py`.

Risks:

- Authorization cannot be certified without importing and exercising the actual backend views.
- Platform admin scoping intentionally has broad access; this requires explicit audit coverage.
- Teacher and institute admin scoping are institute-based in helper functions, but object-level enforcement depends on view usage not verified here.
- Student exam visibility has a confirmed broken path in latest Playwright evidence.

Priority: P0 for role-scope certification.

## Data Isolation

Positive evidence:

- `AccountProfile.clean()` enforces institute consistency for linked student/teacher profiles.
- Scoping helpers filter institute, student, teacher, question, exam, attempt, and result querysets.
- Models include institute relationships across major entities.

Unverified:

- Whether every API view uses the scoping helpers.
- Whether Next API proxy routes enforce role checks before upstream calls.
- Whether parent-child access is fully isolated per parent relationship.
- Whether mobile endpoints prevent cross-student access.

Priority: P0.

## Database Design

Model areas present:

- Accounts, institutes, geography, academics, students, teachers, parents.
- Economy: star ledger, subscriptions, question bank package entitlements, unlock rules, payment orders/transactions.
- Question bank: master questions, institute questions, options, passages, tags, attachments, access links.
- Exams: exams, sections, exam questions, access slots, student assignments, publish logs, templates, preset packs.
- Attempts/review: attempts, answers, selected options, integrity events, review tasks/events, response artifacts.
- Results/reports: exam results, topic performance, summaries, notifications, audit logs.

Risks:

- Migrations exist, but migration application was not verified.
- No database integrity test execution was run in this read-only audit.
- Production seed/demo data boundaries need certification, especially because many specs use mutable seeded flows.

Priority: P1.

## Configuration Security

Positive evidence in `edutech_backend/config/settings/base.py` and `prod.py`:

- `DEBUG` defaults false.
- Production raises if default secret is used.
- HSTS, secure cookies, nosniff, frame deny, referrer policy configured.
- CORS defaults to not allow all origins.
- JWT token lifetimes are configurable.
- DRF default permission is authenticated.
- Login/registration/attempt/import throttle rate settings exist.

Risks:

- `.env`, `.env.local`, and mobile `.env` files are present in the workspace. Contents were not disclosed in this report, but secrets-in-repo/workspace handling must be audited.
- `urlpatterns += static(settings.MEDIA_URL, ...)` is unconditional in `config/urls.py`; production media serving should be reviewed.
- CORS/CSRF production values were not validated against deployment.
- Next API proxy routes rely on `API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL`; missing config causes many UI paths to degrade.

Priority: P0/P1.

## Frontend/API Integration

Evidence:

- Web API clients use `API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL` and bearer tokens.
- Next API routes proxy backend calls for admin, institute, teacher, parent, student, question bank, exams, and economy flows.

Risks:

- Some components call `/api/v1/...` directly from the browser, e.g. economy admin components. This bypasses the Next proxy pattern and must be checked for auth/header correctness.
- Backend route implementation is not visible in top-level source.
- API contracts are broad but not certified by current passing execution.

Priority: P0.

## Mobile Security

Evidence:

- Secure session module exists: `nexora_student_mobile/src/lib/secure-session.ts`.
- API client exists: `nexora_student_mobile/src/lib/api/client.ts`.

Risks:

- Console logging appears in auth/session/API paths:
  - `nexora_student_mobile/app/(auth)/login.tsx`
  - `nexora_student_mobile/src/lib/api/client.ts`
  - `nexora_student_mobile/src/lib/secure-session.ts`
  - `nexora_student_mobile/src/hooks/use-session-bootstrap.ts`
- Mobile execution evidence was not found.

Priority: P1.

## Security Certification Requirements

P0:

- Force import all Django URL modules and generate OpenAPI schema.
- Run role-scope negative tests for every role.
- Verify student/institute/teacher data isolation on exams, attempts, results, question bank, and economy.
- Fix failed exam visibility lifecycle.
- Validate production env, secrets, CORS, CSRF, SSL/HSTS, cookies, and media serving.

P1:

- Remove or gate verbose mobile logs.
- Add explicit audit tests for Next proxy auth forwarding.
- Validate file upload limits and content-type checks for rich text/question/attempt artifacts.
- Review payment/order workflows for authorization and idempotency.

P2:

- Add security headers verification to Playwright/API smoke.
- Produce a threat model for parent access and institute onboarding.
