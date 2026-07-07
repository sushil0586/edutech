# Playwright, Performance, And Penetration Execution Pack

Last updated: 2026-07-06

## Purpose

This document converts the master testing plan into exact executable lanes:

- Playwright subsets
- stage browser commands
- performance commands
- penetration checklist
- severity and reporting template

Related documents:

- [PLAYWRIGHT_PERFORMANCE_PENETRATION_MASTER_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_PERFORMANCE_PENETRATION_MASTER_PLAN.md)
- [STAGE_BROWSER_PERFORMANCE_SECURITY_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_BROWSER_PERFORMANCE_SECURITY_CHECKLIST.md)
- [PENETRATION_FINDINGS_TRACKER_TEMPLATE.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PENETRATION_FINDINGS_TRACKER_TEMPLATE.md)
- [STAGE_PERFORMANCE_TEST_COMMANDS.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_PERFORMANCE_TEST_COMMANDS.md)
- [PERFORMANCE_TEST_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PERFORMANCE_TEST_PLAN.md)
- [PLAYWRIGHT_TEST_BOUNDARY_AND_ENGINEERING_RULES.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_TEST_BOUNDARY_AND_ENGINEERING_RULES.md)
- [LOCAL_DEV_PENETRATION_BASELINE_2026-07-06.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/LOCAL_DEV_PENETRATION_BASELINE_2026-07-06.md)

---

## 1. Playwright Subsets

## 1.1 Release Smoke

Purpose:

- fastest meaningful pre-release browser signal
- should run on local and stage

Specs:

- `edutech_web/tests/e2e/workflow/student-dashboard-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/student-exam-detail-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/student-results-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/teacher-results-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-dashboard-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-question-bank-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-dashboard-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-economy-workspace.spec.ts`

Success rule:

- all pass
- no auth failures
- no route crash
- no obvious empty-state mismatch for seeded accounts

## 1.2 Stage Browser Performance

Purpose:

- measure browser route timings on stage

Specs:

- `edutech_web/tests/e2e/workflow/student-results-timing.spec.ts`
- `edutech_web/tests/e2e/workflow/student-summary-timing.spec.ts`
- `edutech_web/tests/e2e/workflow/student-review-timing.spec.ts`
- `edutech_web/tests/e2e/workflow/teacher-results-timing.spec.ts`
- `edutech_web/tests/e2e/workflow/teacher-question-bank-timing.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-results-timing.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-shell-timing.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-question-bank-timing.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-economy-timing.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-reports-timing.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-institutes-timing.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-people-timing.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-security-timing.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-settings-timing.spec.ts`

Success rule:

- all pass
- timing artifacts collected
- regressions recorded against latest local baseline

## 1.3 Deep Workflow Confidence

Purpose:

- prove business-critical continuity across real workflows

Specs:

- `edutech_web/tests/e2e/workflow/institute-family-release-happy-path.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/teacher-family-release-happy-path.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-family-release-state.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-family-immediate-release.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-mixed-institute-onboarding.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/student-results-storytelling.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-results-live-populated.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/teacher-results-live-populated.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-results-analysis-populated.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/teacher-results-analysis-populated.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-economy-mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-economy-cross-role-package-propagation.mutable.spec.ts`

Success rule:

- all pass or have explicit seed/data blockers
- each failure is classified as:
  - test issue
  - seed issue
  - product bug

## 1.4 Advanced Builder And Exam Creation

Purpose:

- protect the densest authoring and configuration flows

Specs:

- `edutech_web/tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-exam-creation-wizard-matrix.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-exam-creation-advanced-student-attempt.mutable.spec.ts`

Success rule:

- create, preview, save, publish, and attempt paths stay consistent

---

## 2. Stage Playwright Commands

Set the shared environment first:

```bash
export PLAYWRIGHT_BASE_URL=https://learn.accerio.in
```

If the stage credentials are managed through env vars in the suite, export those as well before running.

Run these security parity probes once before the browser pack:

```bash
curl -I -s https://learn.accerio.in/login
curl -I -s https://learn.accerio.in/admin
curl -s -D - -o /dev/null \
  -X OPTIONS https://learn.accerio.in/api/v1/auth/login/ \
  -H 'Origin: http://evil.example' \
  -H 'Access-Control-Request-Method: POST'
```

Expected:

- frontend HTML includes anti-framing and CSP headers
- backend preflight does not expose wildcard `access-control-allow-origin: *`

## 2.1 Release Smoke

```bash
cd edutech_web
npx playwright test \
  tests/e2e/workflow/student-dashboard-workspace.spec.ts \
  tests/e2e/workflow/student-exam-detail-workspace.spec.ts \
  tests/e2e/workflow/student-results-workspace.spec.ts \
  tests/e2e/workflow/teacher-results-workspace.spec.ts \
  tests/e2e/workflow/institute-dashboard-workspace.spec.ts \
  tests/e2e/workflow/institute-question-bank-workspace.spec.ts \
  tests/e2e/workflow/admin-dashboard-workspace.spec.ts \
  tests/e2e/workflow/admin-economy-workspace.spec.ts \
  --project=chromium
```

## 2.2 Stage Browser Performance

```bash
cd edutech_web
npx playwright test \
  tests/e2e/workflow/student-results-timing.spec.ts \
  tests/e2e/workflow/student-summary-timing.spec.ts \
  tests/e2e/workflow/student-review-timing.spec.ts \
  tests/e2e/workflow/teacher-results-timing.spec.ts \
  tests/e2e/workflow/teacher-question-bank-timing.spec.ts \
  tests/e2e/workflow/institute-results-timing.spec.ts \
  tests/e2e/workflow/institute-shell-timing.spec.ts \
  tests/e2e/workflow/institute-question-bank-timing.spec.ts \
  tests/e2e/workflow/admin-economy-timing.spec.ts \
  tests/e2e/workflow/admin-reports-timing.spec.ts \
  tests/e2e/workflow/admin-institutes-timing.spec.ts \
  tests/e2e/workflow/admin-people-timing.spec.ts \
  tests/e2e/workflow/admin-security-timing.spec.ts \
  tests/e2e/workflow/admin-settings-timing.spec.ts \
  --project=chromium
```

## 2.3 Deep Workflow Pass

```bash
cd edutech_web
npx playwright test \
  tests/e2e/workflow/institute-family-release-happy-path.mutable.spec.ts \
  tests/e2e/workflow/teacher-family-release-happy-path.mutable.spec.ts \
  tests/e2e/workflow/institute-family-release-state.mutable.spec.ts \
  tests/e2e/workflow/institute-family-immediate-release.mutable.spec.ts \
  tests/e2e/workflow/admin-mixed-institute-onboarding.mutable.spec.ts \
  tests/e2e/workflow/student-results-storytelling.mutable.spec.ts \
  tests/e2e/workflow/institute-results-live-populated.mutable.spec.ts \
  tests/e2e/workflow/teacher-results-live-populated.mutable.spec.ts \
  tests/e2e/workflow/institute-results-analysis-populated.mutable.spec.ts \
  tests/e2e/workflow/teacher-results-analysis-populated.mutable.spec.ts \
  tests/e2e/workflow/admin-economy-mutable.spec.ts \
  tests/e2e/workflow/admin-economy-cross-role-package-propagation.mutable.spec.ts \
  --project=chromium
```

Recommended artifact flags for stage reruns:

```bash
--trace on-first-retry --screenshot only-on-failure
```

---

## 3. Performance Execution Order

## 3.1 Browser First

Run Playwright timing before `k6`.

Goal:

- confirm stage is healthy
- catch broken routes before synthetic load begins

## 3.2 `k6` Wave 1: Login And Discovery

```bash
export K6_BASE_URL=https://learn.accerio.in
export K6_USER_CREDENTIALS_JSON='[...]'

k6 run performance/k6/student-login-and-exam-discovery.js
```

## 3.3 `k6` Wave 2: Session Reuse Discovery

```bash
export K6_BASE_URL=https://learn.accerio.in
export K6_USER_CREDENTIALS_JSON='[...]'

k6 run performance/k6/student-session-and-exam-discovery.js
```

## 3.4 `k6` Wave 3: Runtime Save Pressure

```bash
export K6_BASE_URL=https://learn.accerio.in
export K6_USER_CREDENTIALS_JSON='[...]'
export K6_SAVE_COUNT=10
export K6_SUBMIT_AT_END=false

k6 run performance/k6/student-exam-runtime.js
```

## 3.5 `k6` Wave 4: Submission Spike

```bash
export K6_BASE_URL=https://learn.accerio.in
export K6_USER_CREDENTIALS_JSON='[...]'
export K6_SAVE_COUNT=2
export K6_SUBMIT_AT_END=true

k6 run performance/k6/student-exam-runtime.js
```

## 3.6 Optional Analytics Route Load

```bash
export K6_BASE_URL=https://learn.accerio.in
export K6_USER_CREDENTIALS_JSON='[...]'

k6 run performance/k6/student-analytics-routes.js
```

Monitor during each run:

- app CPU
- app memory
- DB CPU
- DB connections
- p95 latency
- failure rate
- 4xx and 5xx counts
- slow query spikes

---

## 4. Penetration Testing Checklist

Run only on approved stage or isolated test environment.

## 4.1 Unauthenticated Surface

- verify public routes do not leak role-only data
- verify no directory-style forced browsing exposes protected content
- verify login, signup, and reset-related endpoints enforce rate limits
- verify CORS headers are not overly permissive
- verify security headers are present and sensible

## 4.2 Authentication And Session

- brute-force resistance on login
- token invalidation after logout
- expired token handling
- session fixation checks
- role switching with stale token checks
- verify `/auth/me/` does not expose cross-role or hidden fields

## 4.3 Authorization And IDOR

- student cannot access another student attempt, result, wallet, or analytics route
- teacher cannot access other institute teacher-owned restricted records
- institute admin cannot access another institute’s records
- admin-only routes reject lower roles
- object ID tampering on:
  - exam detail
  - attempt detail
  - result detail
  - question-bank question detail
  - package and entitlement routes
  - institute and student economy routes

## 4.4 File Upload And Import

- image upload content-type spoofing
- oversize file handling
- script payload in rich text or uploaded filename
- spreadsheet import formula injection risk
- malformed CSV/XLSX import error handling
- path traversal attempts in upload or import metadata

## 4.5 Input Tampering

- change enum values outside allowed choices
- inject large payloads into filters and search params
- alter hidden form fields in exam/economy/question-bank flows
- test mass-assignment style payload additions on mutable admin endpoints

## 4.6 Stored And Reflected XSS

- question text
- explanation text
- descriptive answers
- institute names
- package descriptions
- search inputs
- report/export labels

## 4.7 Business Logic Abuse

- publish exam without required readiness
- restore/reactivate entitlement with mismatched institute/package
- apply package plan to wrong institute
- save or submit attempt outside intended lifecycle boundary
- review or score attempts without role ownership

## 4.8 Rate Limit And Abuse Controls

- login attempts
- OTP/reset if applicable
- image upload repetition
- import endpoint repetition
- answer save spam
- result/review action spam

## 4.9 Data Export And Reporting

- CSV/report export restricted by role
- no hidden columns leaked
- no cross-institute report data visible
- spreadsheet export values sanitized for formula injection where relevant

---

## 5. Penetration Severity Template

## Critical

- auth bypass
- privilege escalation to admin or cross-institute access
- unrestricted access to student attempts, results, wallet, or personal data
- remote code execution or direct infrastructure compromise

Target:

- fix before any wider rollout

## High

- confirmed IDOR with sensitive business impact
- stored XSS in privileged workflow
- broken upload/import validation leading to material risk
- broken authorization on write actions

Target:

- fix before pilot expansion

## Medium

- reflected XSS with constrained impact
- missing or weak rate limiting
- business-logic abuse with guardrail bypass but limited blast radius
- sensitive metadata exposure without full data takeover

Target:

- triage and schedule in the next hardening wave

## Low

- non-sensitive information leakage
- missing hardening headers without exploit chain
- noisy but low-impact validation or enumeration behavior

Target:

- batch with platform hardening cleanup

---

## 6. Reporting Template

For every finding, record:

- title
- environment
- date
- tester
- affected route or module
- role used
- reproduction steps
- actual result
- expected result
- severity
- business impact
- screenshot or request sample
- fix owner
- retest result

---

## 7. Recommended Next Run

If only one full wave is run next, do it in this order:

1. Playwright `release-smoke` on stage
2. Playwright `stage browser performance`
3. `k6` login/discovery
4. `k6` session-reuse discovery
5. first authenticated penetration sweep:
   - auth
   - IDOR
   - role isolation
   - upload/import abuse

That sequence gives:

- browser truth
- latency truth
- concurrency truth
- first security truth
