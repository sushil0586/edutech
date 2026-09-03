# Phase 0 Staging Rerun Command Set

Date: Wednesday, September 2, 2026
Scope: EC2 staging/release-branch validation before production launch
Primary objective: make the staging proof repeatable, evidence-backed, and safe for mutable browser tests.

## Launch Assumptions

Replace these values with the real staging values before the run:

```bash
export STAGE_WEB_URL=https://learn.accerio.in
export STAGE_API_URL=https://learn.accerio.in
export STAGE_REPO=/var/www/nexora-learn/edutech
export RELEASE_REF=<commit-or-tag>
```

Operational assumptions:

- Staging runs on AWS EC2 behind Nginx.
- Django and Next.js can be hosted under the same public staging hostname.
- Browser tests are run from a QA laptop or CI runner against the staging URL.
- Backend seed/reset commands are run on the EC2 staging host, not through local npm scripts.
- Mutable tests are allowed only on staging or disposable release-test data, never production.

## Do Not Mix These

Some local npm scripts prepare data by executing `../edutech_backend/manage.py` before Playwright. That is useful for local testing, but risky for remote staging because it can seed the local database while the browser points at EC2.

For staging:

- Run Django seed/reset commands on the staging host over SSH.
- Run browser-only Playwright commands from the QA machine.
- Use [phase0_staging_browser_rerun.sh](/Users/ansh/Documents/Eductech/edutech/scripts/phase0_staging_browser_rerun.sh) for the browser side.
- Use mutable browser groups only after staging data has been reset intentionally.

## EC2 Preflight

Run on the staging EC2 host:

```bash
cd "$STAGE_REPO"
git fetch --all --tags --prune
git checkout "$RELEASE_REF"
git rev-parse --short HEAD
git status --short
```

Backend release checks:

```bash
cd "$STAGE_REPO/edutech_backend"
source .venv/bin/activate
export DJANGO_SETTINGS_MODULE=config.settings.prod

python manage.py check --deploy
python manage.py makemigrations --check --dry-run
python manage.py showmigrations --plan | tail -50
python manage.py audit_exam_publish_readiness --only-problem-exams
python manage.py audit_result_publish_readiness --only-problem-exams
```

Apply migrations only after the release owner accepts the migration plan:

```bash
python manage.py migrate
python manage.py collectstatic --noinput
```

Frontend release checks:

```bash
cd "$STAGE_REPO/edutech_web"
API_BASE_URL="$STAGE_API_URL" \
NEXT_PUBLIC_API_BASE_URL="$STAGE_API_URL" \
npm run build
```

Service checks:

```bash
sudo nginx -t
sudo systemctl status nexora-learn-backend --no-pager
sudo systemctl status nexora-learn-web --no-pager
curl -i "$STAGE_API_URL/api/v1/health/"
curl -I -s "$STAGE_WEB_URL/login"
```

## Staging Seed Preconditions

Run only on staging after confirming the target database is not production:

```bash
cd "$STAGE_REPO/edutech_backend"
source .venv/bin/activate
export DJANGO_SETTINGS_MODULE=config.settings.prod

python manage.py prepare_demo_playwright_auth
python manage.py seed_demo_parent_workspace
python manage.py seed_demo_shared_library_access --target-institute-code DLI001
python manage.py reset_demo_institute_subscription_workflow --target-institute-code DLI001
python manage.py seed_playwright_exam_rehearsal_bank
```

Record seed command output and row counts in the evidence log.

## QA Machine Setup

Run from this repository root on the QA machine:

```bash
cd /path/to/edutech
export PLAYWRIGHT_BASE_URL="$STAGE_WEB_URL"
export PLAYWRIGHT_API_BASE_URL="$STAGE_API_URL"
export PLAYWRIGHT_WORKERS=1
```

Guardrails:

- `PLAYWRIGHT_BASE_URL` must be the staging URL.
- Use `ALLOW_LOCAL_PLAYWRIGHT_BASE=1` only for local rehearsal.
- Use `ALLOW_STAGING_MUTATION=1` only after staging seed/reset is complete.

## Browser Gates

P0 smoke:

```bash
./scripts/phase0_staging_browser_rerun.sh smoke
```

Role access:

```bash
./scripts/phase0_staging_browser_rerun.sh access
```

Parent seeded path:

```bash
./scripts/phase0_staging_browser_rerun.sh parent
```

Student core:

```bash
./scripts/phase0_staging_browser_rerun.sh student-core
```

Operator core:

```bash
./scripts/phase0_staging_browser_rerun.sh operator-core
```

Mobile web:

```bash
./scripts/phase0_staging_browser_rerun.sh mobile-web
```

Commercialization mutable checks:

```bash
ALLOW_STAGING_MUTATION=1 ./scripts/phase0_staging_browser_rerun.sh commercial
```

Phase 1 optimized-route and warning watchpoints:

```bash
./scripts/phase0_staging_browser_rerun.sh phase1-watchpoints
```

Full browser rerun:

```bash
ALLOW_STAGING_MUTATION=1 ./scripts/phase0_staging_browser_rerun.sh all
```

## Provider Checks

Payment:

- Create one test-mode Razorpay order from staging.
- Complete one success path.
- Complete one failure/cancel path.
- Confirm webhook receipt, internal order status, and user-facing receipt/invoice state.

Email:

- Trigger signup/reset/notification email from staging.
- Confirm inbox delivery, sender/domain alignment, and provider event log.
- Confirm bounce/error handling is visible in logs or provider dashboard.

OTP/SMS:

- Trigger OTP send from staging to an approved test number.
- Confirm verify, expiry, retry, throttle, and failure logging.
- Confirm no OTP secret/test provider value is present in browser-visible config.

## Acceptance Matrix

| Gate | Required Result |
| --- | --- |
| Build/config | `check --deploy`, migration drift check, and frontend production build pass |
| Health/security | API health responds, login route responds, Nginx config passes, no wildcard production CORS |
| Browser P0 | Smoke, access, parent, student, operator, mobile-web gates pass with 0 failures |
| Commercialization | Mutable subscription and entitlement checks pass after staging reset |
| Providers | Razorpay, email, and OTP have direct staging evidence |
| Runtime logs | No repeated backend 500s, integrity-event flood, or recurring stream-close warning in staging logs |
| Slow routes | Admin exams, institute search, and teacher search meet accepted staging p95 thresholds |
| Data safety | Mutable tests are run only against staging/disposable data |

Staging p95 thresholds:

| Route Area | Controlled Launch Maximum | Premium Target |
| --- | ---: | ---: |
| Admin exams first open/reset | `< 8s` p95 | `< 4s` p95 |
| Admin exams scoped/filter transitions | `< 5s` p95 | `< 2.5s` p95 |
| Institute search open/filter/group | `< 6s` p95 | `< 3s` p95 |
| Teacher search open/filter/group | `< 6s` p95 | `< 3s` p95 |

## Evidence To Capture

- Staging hostname and API hostname.
- EC2 instance ID or deployment host label.
- `git rev-parse --short HEAD` and release tag/branch.
- Exact command transcript or CI job links.
- Playwright HTML report or trace folder for failures.
- Provider dashboard screenshots or exported event IDs.
- Backend logs for the test window.
- Rollback target commit/tag.

## Failure Triage

Classify every failure before changing code:

| Failure Type | Signal | First Action |
| --- | --- | --- |
| Seed/data issue | Missing demo account, empty child link, no entitlement, no test plan | Rerun the EC2 seed/reset command and record row counts |
| Environment issue | CORS, CSRF, host, SSL, API base mismatch, static files missing | Fix staging env/Nginx/config and rerun only failed group |
| Provider issue | Webhook missing, OTP not delivered, email bounce, payment status mismatch | Check provider dashboard and callback logs |
| Product defect | Same failure repeats with clean seed and healthy env | File launch blocker or watchpoint with route/spec/log evidence |
| Test harness issue | Selector mismatch with correct UI behavior | Update test only after manual browser confirmation |

## Exit Decision

Phase 0 staging rerun is complete when:

- EC2 preflight and service checks pass.
- Browser gates pass against the staging URL.
- Mutable staging checks are run after an intentional reset.
- Provider-backed payment, email, and OTP evidence is attached.
- Backup/restore and rollback have either live drill proof or an explicitly accepted launch decision.
