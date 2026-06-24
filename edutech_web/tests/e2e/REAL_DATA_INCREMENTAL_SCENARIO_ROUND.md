# Real Data Incremental Scenario Round

## Goal

Run Playwright against real backend-connected data while still keeping the data lifecycle controlled.

This suite already uses two patterns:

- stable baseline flows that do not need mutation
- disposable mutable flows that create temporary records and clean them up

The recommended real-data strategy is to keep those two lanes separate.

## Modes

### 1. Baseline read-only lane

Use this when you want workspace validation without changing business data.

```bash
cd edutech_web
npm run test:e2e:baseline
```

### 2. Mutable real-data lane

Use this when you want disposable real records created, exercised, and cleaned up.

```bash
cd edutech_web
npm run test:e2e:mutable
```

This enables `PLAYWRIGHT_REAL_DATA_MODE=1`, which now unlocks all mutable workflow specs together.

### 3. Full scenario round

Use this when you want the complete end-to-end pass in one run:

- read-only baseline
- disposable authoring
- disposable exams
- disposable attempt lifecycle

```bash
cd edutech_web
npm run test:e2e:full-round
```

## Incremental execution order

For safer investigation and faster debugging, run the scenario round in this order:

1. Role and smoke validation
2. Read-only workflow validation
3. Institute structure mutations
4. Teacher and institute authoring mutations
5. Exam shell and builder mutations
6. Student attempt lifecycle mutation

Recommended command order:

```bash
cd edutech_web
npx playwright test --grep @smoke
npm run test:e2e:baseline
npx playwright test tests/e2e/workflow/institute-academic-setup-mutable.spec.ts
npx playwright test tests/e2e/workflow/institute-roster-mutable.spec.ts
npx playwright test tests/e2e/workflow/teacher-question-mutable.spec.ts tests/e2e/workflow/institute-question-mutable.spec.ts
npx playwright test tests/e2e/workflow/institute-exam-mutable.spec.ts tests/e2e/workflow/teacher-exam-builder-mutable.spec.ts tests/e2e/workflow/teacher-exam-detail-mutable.spec.ts
npx playwright test tests/e2e/workflow/student-attempt-mutable.spec.ts
```

Run those commands with:

```bash
PLAYWRIGHT_REAL_DATA_MODE=1
```

## Data model strategy

The mutable specs should keep following this pattern:

- create uniquely named disposable records using timestamp-based suffixes
- validate real UI and backend behavior on those records
- clean up records at the end whenever the product exposes a safe delete/archive path

That gives us incremental real data without polluting long-lived demo content.

## When to use seeded data vs incremental data

Use seeded data for:

- login accounts
- minimum reference catalogs
- stable dropdown options
- baseline workspace rendering

Use incremental disposable data for:

- new roster entities
- new questions
- new exams
- linked question mappings
- student attempt execution
- academic setup CRUD verification

## Operational guidance

- Keep `PLAYWRIGHT_WORKERS=1` for shared real accounts.
- Prefer disposable record names with `PW` or `Playwright` prefixes.
- Do not run the full mutable lane against production.
- Use a staging or local environment with backend cleanup access.
- If a mutable spec leaves residue after an interrupted run, clean that single entity before rerunning the lane.

## Recommended next expansion

To make the real-data round richer over time, add:

1. institute people read-write validations with disposable accounts
2. student results with a guaranteed published disposable attempt
3. review queue lifecycle using a disposable descriptive-answer exam
4. cross-role scenario chains where institute creates, teacher configures, student attempts, and institute reviews
