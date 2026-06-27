# Staging Readiness Checklist

## Scope

This checklist covers staging readiness for:

- `edutech_backend`
- `edutech_web`

It is based on a direct audit of the current repository state and local verification runs.

## Current Recommendation

Status: `NO-GO` for staging beta right now.

The project is close enough to harden, but not yet safe to deploy for staged beta testing because core backend exam flows are failing under test and the frontend production env guidance can break runtime API calls.

## Verified Audit Results

These checks were run during the audit:

- Backend: `manage.py check` passed
- Backend: `manage.py check --settings=config.settings.prod` passed
- Backend: `manage.py makemigrations --check --dry-run` passed
- Backend: `manage.py collectstatic --noinput` passed
- Backend: `manage.py test --keepdb` failed with 5 test failures
- Frontend: `npm run typecheck` passed
- Frontend: `npm run build` passed
- Frontend: `npm run lint` failed with 15 errors

## Release Blockers

### 1. Backend exam action regressions

Priority: `P0`

Why this blocks staging:

- These are core teacher/admin workflows
- They affect exam completion, student assignment scoping, preview access, and exam access-key operations
- Beta testers are likely to hit these directly

Verified failing tests:

- [edutech_backend/apps/results/tests/test_smoke_flow.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/results/tests/test_smoke_flow.py:103)
- [edutech_backend/apps/results/tests/test_smoke_flow.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/results/tests/test_smoke_flow.py:339)
- [edutech_backend/apps/accounts/tests/test_auth_access.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/accounts/tests/test_auth_access.py:504)
- [edutech_backend/apps/accounts/tests/test_auth_access.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/accounts/tests/test_auth_access.py:865)
- [edutech_backend/apps/accounts/tests/test_auth_access.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/accounts/tests/test_auth_access.py:876)

Observed failures:

- `POST /api/v1/exams/{id}/mark-completed/` returned `404` where test expects `200`
- `POST /api/v1/exams/{id}/assign-students/` returned `404` where test expects `200`
- `GET /api/v1/exams/{id}/preview/` returned `404` where test expects `200`
- `POST /api/v1/exams/{id}/toggle-access-key/` returned `404` where test expects `200`
- `POST /api/v1/exams/{id}/regenerate-access-key/` is implicated by the same regression path

Relevant implementation files:

- [edutech_backend/apps/exams/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/views/__init__.py:460)
- [edutech_backend/apps/exams/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/views/__init__.py:526)
- [edutech_backend/apps/exams/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/views/__init__.py:546)
- [edutech_backend/apps/exams/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/views/__init__.py:610)
- [edutech_backend/apps/exams/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/views/__init__.py:618)
- [edutech_backend/apps/exams/urls/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/urls/__init__.py:1)

What to fix:

- Confirm DRF router/action registration for all custom exam actions
- Confirm no route shadowing or basename conflicts are interfering with detail actions
- Re-run the targeted auth and smoke tests after each fix

Acceptance criteria:

- All 5 failing backend tests pass
- No custom exam action returns `404` for in-scope authenticated users where tests expect `200`

Suggested validation:

```bash
cd /Users/ansh/Documents/Eductech/edutech_backend
./.venv/bin/python manage.py test apps.accounts.tests.test_auth_access --keepdb
./.venv/bin/python manage.py test apps.results.tests.test_smoke_flow --keepdb
./.venv/bin/python manage.py test --keepdb
```

### 2. Cancelled exam force-submit guard is not behaving as intended

Priority: `P0`

Why this blocks staging:

- This is an assessment integrity rule
- It allows an operational action on cancelled exams that the service layer says should be rejected

Verified mismatch:

- Test expects `400`: [edutech_backend/apps/results/tests/test_smoke_flow.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/results/tests/test_smoke_flow.py:339)
- Guard logic says cancelled exams should be blocked: [edutech_backend/apps/results/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/results/services.py:130)

What to fix:

- Confirm the exam cancel action is actually persisting cancelled state before force-submit runs
- Confirm the results endpoint is evaluating the current exam status, not stale in-memory state
- If needed, refresh related models before eligibility checks

Acceptance criteria:

- Force-submit on a cancelled exam returns `400`
- Response payload contains an `attempt` validation error

Suggested validation:

```bash
cd /Users/ansh/Documents/Eductech/edutech_backend
./.venv/bin/python manage.py test apps.results.tests.test_smoke_flow.AcademicAssessmentSmokeTestCase.test_cannot_force_submit_attempt_for_cancelled_exam --keepdb
```

### 3. Frontend production API base URL guidance is currently wrong

Priority: `P0`

Why this blocks staging:

- The documented production config can create broken API URLs immediately after deploy
- This can break login, registration, student APIs, teacher APIs, and internal Next route handlers

Verified issue:

- Frontend concatenates base URL plus full `/api/v1/...` path in [edutech_web/src/lib/auth/session.ts](/Users/ansh/Documents/Eductech/edutech_web/src/lib/auth/session.ts:158)
- Example auth call uses `/api/v1/auth/login/` in [edutech_web/src/lib/auth/session.ts](/Users/ansh/Documents/Eductech/edutech_web/src/lib/auth/session.ts:272)
- Student APIs also include `/api/v1/...` in [edutech_web/src/lib/api/student.ts](/Users/ansh/Documents/Eductech/edutech_web/src/lib/api/student.ts:113)
- Deployment guide recommends `API_BASE_URL=https://learn.yourdomain.com/api/v1` in [DEPLOYMENT_GUIDE.md](/Users/ansh/Documents/Eductech/DEPLOYMENT_GUIDE.md:115)

Why it breaks:

- Current code expects `API_BASE_URL` to be the host root, for example `https://learn.yourdomain.com`
- The guide currently recommends a value that already includes `/api/v1`
- That produces requests like `https://learn.yourdomain.com/api/v1/api/v1/auth/login/`

What to fix:

- Update deployment docs to use host-root values only
- Review all server-side Next route handlers to ensure they follow the same assumption
- Add a small note in the web README or deployment guide clarifying the expected format

Correct production example:

```env
API_BASE_URL=https://learn.yourdomain.com
NEXT_PUBLIC_API_BASE_URL=https://learn.yourdomain.com
```

Acceptance criteria:

- Login and registration succeed in production mode using documented env values
- A sample teacher and student page can load without API base URL failures

Suggested validation:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
API_BASE_URL=https://learn.yourdomain.com NEXT_PUBLIC_API_BASE_URL=https://learn.yourdomain.com npm run build
```

### 4. Deployment guide currently tells operators to copy local env into production

Priority: `P0`

Why this blocks staging:

- It risks deploying localhost dev values into production
- It creates a high-probability operator mistake

Verified issue:

- Guide says `cp .env.local .env.production` in [DEPLOYMENT_GUIDE.md](/Users/ansh/Documents/Eductech/DEPLOYMENT_GUIDE.md:167)
- Local env currently points to `127.0.0.1:9001` in [edutech_web/.env.local](/Users/ansh/Documents/Eductech/edutech_web/.env.local:1)

What to fix:

- Replace the copy step with an explicit production env creation step
- Add a sample `.env.production.example` for `edutech_web` if you want safer deploys

Acceptance criteria:

- Deployment instructions never reuse local development env blindly
- Web service can boot with staging-specific env only

## High Priority Hardening

### 5. Production Django secret key should fail fast if missing

Priority: `P1`

Why this matters:

- The app can currently start in prod with a known placeholder secret
- That is unsafe even for staging

Verified issue:

- Fallback secret is defined in [edutech_backend/config/settings/base.py](/Users/ansh/Documents/Eductech/edutech_backend/config/settings/base.py:9)
- Production settings in [edutech_backend/config/settings/prod.py](/Users/ansh/Documents/Eductech/edutech_backend/config/settings/prod.py:1) do not force a real value

What to fix:

- In prod settings, assert that `DJANGO_SECRET_KEY` is set and not equal to the placeholder
- Optionally fail startup if `DEBUG=True` in prod settings

Acceptance criteria:

- Production boot fails with a clear error when secret key is missing or placeholder

### 6. Frontend lint is failing with 15 errors

Priority: `P1`

Why this matters:

- Build passes, but lint still reveals unstable or noncompliant frontend patterns
- Several issues are around React effects and navigation correctness

Verified issue:

- `npm run lint` fails from [edutech_web/package.json](/Users/ansh/Documents/Eductech/edutech_web/package.json:5)

Examples from the audit:

- Invalid anchor navigation in [edutech_web/src/app/(student)/app/layout.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/layout.tsx:114)
- `react-hooks/set-state-in-effect` in [edutech_web/src/components/admin/institute-economy-workspace.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/admin/institute-economy-workspace.tsx:64)
- Similar hook issues in teacher question bank workspace and several admin dialogs

What to fix:

- Replace direct page nav anchors with `next/link` where required
- Refactor synchronous state-setting effects that are only mirroring props or initializing client state
- Clean warnings where practical, especially missing hook dependencies

Acceptance criteria:

- `npm run lint` passes cleanly

Suggested validation:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
npm run lint
npm run typecheck
npm run build
```

## Medium Priority Checks Before Beta

### 7. Align backend/web deployment docs and service units

Priority: `P2`

Verified files:

- [deployment/nexora-learn-web.service](/Users/ansh/Documents/Eductech/deployment/nexora-learn-web.service:1)
- [deployment/nexora-learn-backend.service](/Users/ansh/Documents/Eductech/deployment/nexora-learn-backend.service:1)
- [deployment/nexora-learn.nginx.conf](/Users/ansh/Documents/Eductech/deployment/nexora-learn.nginx.conf:1)
- [DEPLOYMENT_GUIDE.md](/Users/ansh/Documents/Eductech/DEPLOYMENT_GUIDE.md:1)

Checks to perform:

- Ensure web service reads production env explicitly if required by your host setup
- Ensure Nginx `server_name` matches the actual staging hostname
- Ensure backend `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, and `CSRF_TRUSTED_ORIGINS` match the same staging host
- Ensure static and media paths exist on server

Acceptance criteria:

- Fresh EC2-style deployment can be performed by following docs exactly once, without manual guesswork

### 8. Make backend test execution non-interactive by default in CI/staging workflows

Priority: `P2`

Why this matters:

- The first raw `manage.py test` run hit an interactive prompt because `test_edutech_db` already existed
- That is fine locally, but brittle for scripted validation

What to fix:

- Prefer `--keepdb` or ensure test DB cleanup in CI
- If using automation, document the expected test command

Acceptance criteria:

- Test commands used for release validation never block on interactive input

## Recommended Fix Order

1. Fix backend `404` action regressions.
2. Fix cancelled-exam force-submit behavior.
3. Correct production env docs for `edutech_web`.
4. Make Django prod settings fail fast for invalid secret/debug config.
5. Clean frontend lint errors.
6. Re-run full backend and web validation.
7. Do one fresh staging deployment rehearsal from the docs.

## Final Release Gate

Use this as the final sign-off gate before staging beta.

### Backend gate

```bash
cd /Users/ansh/Documents/Eductech/edutech_backend
./.venv/bin/python manage.py check
DJANGO_SETTINGS_MODULE=config.settings.prod ./.venv/bin/python manage.py check
./.venv/bin/python manage.py makemigrations --check --dry-run
DJANGO_SETTINGS_MODULE=config.settings.prod ./.venv/bin/python manage.py collectstatic --noinput
./.venv/bin/python manage.py test --keepdb
./.venv/bin/python manage.py audit_exam_publish_readiness --only-problem-exams
./.venv/bin/python manage.py audit_result_publish_readiness --only-problem-exams
```

Pass condition:

- All commands succeed
- Test suite reports `0` failures
- Publish-readiness audits do not reveal unexpected blocker inventory for exams intended to go live

### Frontend gate

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
npm run lint
npm run typecheck
npm run build
```

Pass condition:

- All commands succeed with no lint errors

### Deployment gate

Pass condition:

- Web can log in against the backend in production mode
- Student dashboard loads
- Teacher exam list loads
- One exam can be previewed
- One exam can be assigned to selected students
- One exam access key can be toggled and regenerated
- Health endpoint returns `200` at `/api/v1/health/`

## Suggested Owner Split

- Backend routing and exam flow fixes: backend engineer
- Deployment docs and env cleanup: platform or full-stack owner
- Frontend lint cleanup: frontend engineer
- Final rehearsal deploy: whoever owns staging infrastructure

## Short Conclusion

This repo is not far from staging, but it still has `P0` blockers. Once the backend action regressions and env/deployment mistakes are corrected, it should be reasonable to do a controlled staging beta deploy.
