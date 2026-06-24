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

Last verified runs:

- default suite: `40 total`
- default suite result: `23 passed`, `17 skipped`
- skip reason: all 17 skipped tests are opt-in mutable data workflows gated by env flags
- baseline command: `23 passed`, `0 skipped`
- full real-data round: `40 passed`
- current full-round blockers: none

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
