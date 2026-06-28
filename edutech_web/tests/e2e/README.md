# Playwright E2E

## Local run

Start the backend and frontend first, then set:

- `PLAYWRIGHT_BASE_URL`
- `PLAYWRIGHT_WORKERS`
- `PLAYWRIGHT_INSTITUTE_USERNAME`
- `PLAYWRIGHT_INSTITUTE_PASSWORD`
- `PLAYWRIGHT_TEACHER_USERNAME`
- `PLAYWRIGHT_TEACHER_PASSWORD`
- `PLAYWRIGHT_STUDENT_USERNAME`
- `PLAYWRIGHT_STUDENT_PASSWORD`

Default seeded credentials used when env vars are not provided:

- institute: `demo-institute-admin` / `Demo@12345`
- teacher: `demo-teacher` / `Demo@12345`
- student: `demo-student` / `Demo@12345`

Example:

```bash
cd edutech_web
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
PLAYWRIGHT_WORKERS=1 \
PLAYWRIGHT_TEACHER_USERNAME=teacher-demo \
PLAYWRIGHT_TEACHER_PASSWORD=password123 \
npm run test:e2e:smoke
```

If role credentials are missing, the matching smoke tests will be skipped.

## Cross-browser lane

The default suite stays on Chromium for speed.

Enable the opt-in Firefox and WebKit lane with:

- `PLAYWRIGHT_ENABLE_CROSS_BROWSER=1`

Use the focused shell sanity command when you want a quick multi-engine signal:

```bash
cd edutech_web
npm run test:e2e:cross-browser
```

This opt-in lane currently covers:

- student shell route sanity
- student results and analytics deep-route sanity
- student attempts and post-submit summary sanity
- student exam detail and conditional runtime sanity
- admin shell route sanity
- admin deep-route sanity
- teacher shell route sanity
- teacher results deep-route sanity
- institute shell route sanity
- institute results deep-route sanity

## Mobile-web baseline

Use the focused mobile-web lane when you want a quick small-screen Chromium signal for the student web workspace before real-device QA:

```bash
cd edutech_web
npm run test:e2e:mobile-web
```

This lane currently covers:

- student mobile navigation shell sanity
- student mobile exams, attempts, and results route reachability
- seeded NEET mobile exam-detail sanity
- seeded JEE mobile exam-detail sanity
- seeded NEET mobile results-to-summary sanity
- seeded JEE mobile results-to-summary and truthful review-route sanity
- truthful fallback state panels for unavailable exam detail, summary, and review routes

This lane is intentionally not a replacement for:

- real-device touch comfort validation
- weak-network recovery validation
- long-attempt comfort validation

## CI regression policy

Current intended CI split:

- pull requests:
  - [`.github/workflows/edutech-web-playwright-smoke.yml`](/Users/ansh/Documents/Eductech/.github/workflows/edutech-web-playwright-smoke.yml:1)
  - runs `npm run test:e2e:smoke`
  - purpose: fail fast on core workflow breakage
- `main` or `master` pushes:
  - [`.github/workflows/edutech-web-playwright-regression.yml`](/Users/ansh/Documents/Eductech/.github/workflows/edutech-web-playwright-regression.yml:1)
  - runs `npm run test:e2e:baseline`
  - purpose: broader non-mutable regression confidence
- nightly:
  - [`.github/workflows/edutech-web-playwright-regression.yml`](/Users/ansh/Documents/Eductech/.github/workflows/edutech-web-playwright-regression.yml:1)
  - currently runs `npm run test:e2e:baseline`
  - purpose: keep the broader always-on Chromium lane healthy before introducing heavier suites
- manual dispatch:
  - the regression workflow can run either `smoke` or `baseline`

Why this split exists:

- smoke stays fast enough for PR feedback
- baseline protects more route, scope, and workflow surfaces on stable branches
- mutable real-data lanes remain opt-in until they are reliable enough for always-on automation

## Mutable workflow lane

Some workflow specs intentionally create or mutate real demo data and are therefore opt-in.

Enable them only when you want disposable record coverage:

- `PLAYWRIGHT_REAL_DATA_MODE=1`
- `PLAYWRIGHT_ENABLE_ALL_MUTABLE_ACTIONS=1`

- `PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS=1`
- `PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS=1`
- `PLAYWRIGHT_ENABLE_MUTABLE_QUESTION_BANK_ACTIONS=1`
- `PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_QUESTION_BANK_ACTIONS=1`
- `PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS=1`
- `PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_EXAM_DETAIL_ACTIONS=1`
- `PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1`
- `PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_EXAM_KEY_ACTIONS=1`
- `PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS=1`
- `PLAYWRIGHT_ENABLE_MUTABLE_ACADEMIC_SETUP_ACTIONS=1`
- `PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_ASSIGNMENT_ACTIONS=1`
- `PLAYWRIGHT_ENABLE_MUTABLE_IMPORT_ACTIONS=1`
- `PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_REVIEW_ACTIONS=1`
- `PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_COMPREHENSION_ACTIONS=1`
- `PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS=1`
 
The roster CRUD and roster CSV lanes both use:

- `PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS=1`

Example:

```bash
cd edutech_web
npm run test:e2e:mutable
```

Or, if you want to target a single mutable lane:

```bash
cd edutech_web
PLAYWRIGHT_REAL_DATA_MODE=1 \
npx playwright test tests/e2e/workflow/institute-exam-mutable.spec.ts
```

```bash
cd edutech_web
PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS=1 \
npx playwright test tests/e2e/workflow/institute-roster-mutable.spec.ts
```

```bash
cd edutech_web
PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS=1 \
npx playwright test tests/e2e/workflow/institute-roster-import-mutable.spec.ts
```

```bash
cd edutech_web
PLAYWRIGHT_ENABLE_MUTABLE_QUESTION_BANK_ACTIONS=1 \
npx playwright test tests/e2e/workflow/teacher-question-mutable.spec.ts
```

```bash
cd edutech_web
PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_QUESTION_BANK_ACTIONS=1 \
npx playwright test tests/e2e/workflow/institute-question-mutable.spec.ts
```

```bash
cd edutech_web
PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS=1 \
npx playwright test tests/e2e/workflow/teacher-exam-builder-mutable.spec.ts
```

```bash
cd edutech_web
PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_EXAM_DETAIL_ACTIONS=1 \
npx playwright test tests/e2e/workflow/teacher-exam-detail-mutable.spec.ts
```

```bash
cd edutech_web
PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 \
npx playwright test tests/e2e/workflow/student-attempt-mutable.spec.ts
```

```bash
cd edutech_web
PLAYWRIGHT_ENABLE_MUTABLE_ACADEMIC_SETUP_ACTIONS=1 \
npx playwright test tests/e2e/workflow/institute-academic-setup-mutable.spec.ts
```

```bash
cd edutech_web
PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_ASSIGNMENT_ACTIONS=1 \
npx playwright test tests/e2e/workflow/institute-teacher-assignments-mutable.spec.ts
```

```bash
cd edutech_web
PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_EXAM_KEY_ACTIONS=1 \
npx playwright test tests/e2e/workflow/student-exam-key-mutable.spec.ts
```

```bash
cd edutech_web
PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS=1 \
npx playwright test tests/e2e/workflow/student-practice-mutable.spec.ts
```

Dedicated subscription request workflow with automatic demo-state reset:

```bash
cd edutech_web
npm run test:e2e:mutable:subscription-request
```

What this does:

- resets demo institute subscription request rows and requestable package entitlements
- runs the institute submit -> admin reject -> institute submit -> admin approve flow
- verifies approval materializes real institute package entitlements

Dedicated shared-library entitlement enforcement workflow:

```bash
cd edutech_web
npm run test:e2e:mutable:shared-library-enforcement
```

What this does:

- seeds demo shared-library package and feature access for the demo institute
- runs institute shared-library entitlement enforcement coverage
- runs teacher shared-library entitlement enforcement coverage
- temporarily pauses matching package entitlements
- verifies authoring surfaces switch to truthful blocked state
- restores entitlements at the end of each test

Dedicated shared-library authoring workflow bundle:

```bash
cd edutech_web
npm run test:e2e:mutable:shared-library-workflow
```

What this does:

- seeds demo shared-library access, blocked-state, and quota-demo coverage
- verifies teacher and institute no-entitlement truthfulness
- verifies institute link-to-local-bank flow
- verifies institute shared-library to exam-builder flow
- verifies teacher request-access flow
- verifies teacher and institute quota-exhausted blocking
- reseeds between mutable slices so link and request candidates are not consumed by earlier mutations

Commercialization regression bundle:

```bash
cd edutech_web
npm run test:e2e:mutable:commercialization-bundle
```

What this does:

- runs the full subscription request reject/approve workflow
- verifies entitlement activation after approval
- seeds shared-library package and feature access
- runs institute and teacher entitlement-enforcement checks
- gives one compact regression bundle for the commercial question-bank lane

```bash
cd edutech_web
PLAYWRIGHT_ENABLE_MUTABLE_IMPORT_ACTIONS=1 \
npx playwright test tests/e2e/workflow/question-import-mutable.spec.ts
```

```bash
cd edutech_web
PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_REVIEW_ACTIONS=1 \
npx playwright test tests/e2e/workflow/teacher-review-mutable.spec.ts
```

```bash
cd edutech_web
PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_COMPREHENSION_ACTIONS=1 \
npx playwright test tests/e2e/workflow/teacher-comprehension-mutable.spec.ts
```

```bash
cd edutech_web
PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS=1 \
npx playwright test tests/e2e/workflow/teacher-results-mutable.spec.ts
```

## Real data scenario rounds

Recommended commands:

- `npm run test:e2e:baseline`
- `npm run test:e2e:mutable`
- `npm run test:e2e:full-round`

Detailed execution order and operating guidance live in:

- [REAL_DATA_INCREMENTAL_SCENARIO_ROUND.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/REAL_DATA_INCREMENTAL_SCENARIO_ROUND.md)
- [ROLE_MODULE_COVERAGE_MAP.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/ROLE_MODULE_COVERAGE_MAP.md)
- [PAGE_ACTION_COVERAGE_MAP.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/PAGE_ACTION_COVERAGE_MAP.md)
- [EXAM_CREATION_SCENARIO_CATALOG.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/EXAM_CREATION_SCENARIO_CATALOG.md)
- [EXAM_CREATION_TEST_CASE_MATRIX.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/EXAM_CREATION_TEST_CASE_MATRIX.md)

## Current status

Current authored suite shape:

- total authored tests: `123`
- spec files: `105`
- baseline/non-mutable tests: `77`
- opt-in mutable tests: `46`

Latest targeted verification in this repo pass:

- full authored round: `109 passed`, `1 skipped`
- readiness-focused baseline subset: `5 passed`
- teacher mutable results readiness lifecycle: `1 passed`
- institute mutable results readiness lifecycle: `1 passed`
- admin advanced-builder learner-handoff readiness lifecycle: `1 passed`
- student published results grouped-outcome lifecycle: `1 passed`
- student analytics source-to-compare scope continuity: `1 passed`
- student analytics compare-to-timeline-to-actions scope continuity: `1 passed`
- student mobile navigation and route sanity: `1 passed`
- student cross-browser shell sanity: `3 passed`
  - chromium: `1 passed`
  - firefox: `1 passed`
  - webkit: `1 passed`
- student cross-browser analytics and results sanity: `3 passed`
  - chromium: `1 passed`
  - firefox: `1 passed`
  - webkit: `1 passed`
- student cross-browser attempts and post-submit summary sanity: `3 passed`
  - chromium: `1 passed`
  - firefox: `1 passed`
  - webkit: `1 passed`
- student cross-browser exam detail and runtime sanity: `3 passed`
  - chromium: `1 passed`
  - firefox: `1 passed`
  - webkit: `1 passed`
- post-fix targeted follow-up: `4 passed`
  - admin economy mutable: `1 passed`
  - admin exams workspace + admin roster mutable: `2 passed`
  - teacher results mutable: `1 passed`

Historical note:

- last documented full-round result in this file before the current expansion work: `40 passed`
- the suite has grown materially since that earlier snapshot, so the counts above are the current source-of-truth for authored coverage size

Default passing coverage:

- role and scope protection
- institute smoke journey
- institute results workspace workflow
- institute results attempts workspace workflow
- institute reviews workspace workflow
- institute reports workspace workflow
- institute people export workflow
- teacher smoke journey
- teacher results workspace workflow
- teacher results attempts workspace workflow
- teacher reviews workspace workflow
- student smoke journey
- student practice workspace workflow
- student results workspace workflow
- registration smoke journey
- teacher exam builder workflow
- teacher question-bank deep workflow

Opt-in mutable lanes currently green when enabled:

- institute academic setup mutable
- institute exam mutable
- institute results mutable
- institute question-bank mutable
- institute roster mutable
- institute roster import mutable
- institute teacher-assignment mutable
- student attempt mutable
- student exam-key mutable
- student practice mutable
- teacher exam builder mutable
- teacher exam detail mutable
- teacher review mutable
- teacher and institute question-import mutable
- teacher question-bank mutable
- teacher comprehension mutable
- teacher results mutable
- admin advanced-builder learner handoff mutable

Current mutable coverage:

- create a disposable institute exam shell
- validate core institute exam-detail navigation buttons from the real delivery page
- validate institute exam-detail utility actions like refresh status and sync marks
- toggle access-key entry
- regenerate exam access key
- save exam access policy changes
- create a disposable teacher without login
- create login from the institute roster
- reset, disable, and re-enable that teacher login
- create a disposable student without login
- clean disposable roster records through the scoped admin people API
- preview and finalize disposable student roster CSV rows
- preview and finalize disposable teacher roster CSV rows
- create a disposable draft teacher question
- update that question from the detail editor
- delete the disposable teacher-authored question through the scoped teacher proxy
- create a disposable draft institute question
- update that institute-authored question from the detail editor
- delete the disposable institute-authored question through the shared question-bank proxy
- create a disposable teacher exam shell
- validate core teacher exam-detail navigation buttons from the real delivery page
- validate teacher exam-detail utility actions like refresh, sync, access-key toggle, and key regeneration
- update and persist teacher exam access policy from the real delivery page
- update and persist teacher exam settings from the real builder
- add and remove an exam section in the real builder
- attach, update, and remove a linked exam question in the real builder
- create a disposable teacher-assigned exam for a real student
- publish and mark that exam live from the teacher delivery page
- start, save, and submit a real student attempt against the disposable exam
- create a disposable practice set and validate start, resume, submit, and review from the student practice lane
- create a disposable essay/manual-review teacher question
- create a disposable exam that generates a real review task from a real student submission
- assign the pending review task to the teacher and submit marks plus review notes
- create institute-scoped academic year, program, cohort, subject, and topic records
- edit institute academic year and topic records from the setup dialogs
- archive and restore institute academic year and subject records through the setup tables
- create, edit, archive, and restore a disposable teacher assignment from the institute workspace
- open a disposable assigned exam through the student exam-key route
- preview and finalize a disposable teacher question import
- preview and finalize a disposable institute question import

Mutable import note:

- bulk import preview/finalize lanes now run cleanly in local debug mode without developer-facing throttle noise
- this keeps the suite truthful: import product regressions still fail, but backend rate-limit windows no longer turn the whole round red

## Worker strategy

The default worker count is `1`. This is intentional because the current baseline suite uses
shared seeded demo accounts, and parallel login attempts against the same account can cause
flaky session redirects.

Increase `PLAYWRIGHT_WORKERS` only after either:

- provisioning dedicated automation accounts per role, or
- moving to storage-state/session seeding that avoids concurrent password logins.

## CI setup

Recommended GitHub Actions secrets:

- `PLAYWRIGHT_BASE_URL`
- `PLAYWRIGHT_INSTITUTE_USERNAME`
- `PLAYWRIGHT_INSTITUTE_PASSWORD`
- `PLAYWRIGHT_TEACHER_USERNAME`
- `PLAYWRIGHT_TEACHER_PASSWORD`
- `PLAYWRIGHT_STUDENT_USERNAME`
- `PLAYWRIGHT_STUDENT_PASSWORD`

The bundled workflow runs the smoke suite against the configured base URL and skips cleanly if
`PLAYWRIGHT_BASE_URL` is not configured yet.

## Current implemented coverage

- institute results workspace shell
- institute results attempts filter and inspection workflow
- institute results filter and cross-view workflow
- institute reviews workspace shell
- institute reviews filter and queue-navigation workflow
- teacher results attempts filter and inspection workflow
- teacher results filter and cross-view workflow
- teacher question-bank workspace shell
- teacher question-import workflow
- teacher reviews filter and queue-navigation workflow
- teacher reviews workspace shell
- teacher analytics workspace shell
- student exams page shell
- student exam-key submit workflow
- student attempts page shell
- student practice filter and action workflow
- student results filter and summary-action workflow
- institute teacher-assignment happy-path workflow
- student registration to complete-profile
- teacher registration to complete-profile
- anonymous protected-route redirects
- wrong-role route blocking and safe redirect behavior
- teacher question-bank search/filter workflow
- teacher question detail disclosure workflow

Current coverage now spans:

- Phase 1 smoke
- Phase 2 role and scope protection
- first Phase 3 workflow regression slices

Richer roster CSV imports, comprehension bulk flows, export verification, and review-decision mutation lanes remain the next Phase 3 expansion targets.
