# Student Mutable Attempt-First Execution Plan - 2026-07-13

## Purpose

This plan turns the student mutable pack from one large mostly-skipped bundle into a narrower execution path that can actually establish confidence.

The first group to run should be student attempt lifecycle.

Why this group first:

- it proves the most important learner state changes
- it validates real student exam start, resume, save, section movement, and submit behavior
- it is the foundation for later result, review, and long-session confidence

## New Narrow Commands

Added in `edutech_web/package.json`:

- `test:e2e:mutable:student-attempt-core`
- `test:e2e:mutable:student-results-core`
- `test:e2e:mutable:student-practice-core`

## Recommended Order

### Step 1: Student attempt lifecycle

Run:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
PLAYWRIGHT_BASE_URL=http://localhost:3006 PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 npm run test:e2e:mutable:student-attempt-core
```

This command automatically:

- prepares demo Playwright auth
- enables `PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1`
- runs:
  - `student-exam-detail-mutable.spec.ts`
  - `student-attempt-mutable.spec.ts`
  - `student-long-session-runtime.mutable.spec.ts`

### Step 2: Student results publication group

Run after attempt-core is working:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
PLAYWRIGHT_BASE_URL=http://localhost:3006 PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 npm run test:e2e:mutable:student-results-core
```

This enables:

- `PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS=1`

and runs:

- `student-results-mutable.spec.ts`
- `student-results-storytelling.mutable.spec.ts`
- `student-analytics-drilldown.mutable.spec.ts`

### Step 3: Student practice and weak-network group

Run after attempt-core is stable:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
PLAYWRIGHT_BASE_URL=http://localhost:3006 PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 npm run test:e2e:mutable:student-practice-core
```

This enables:

- `PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS=1`

and runs:

- `student-practice-mutable.spec.ts`
- `student-family-weak-network.mutable.spec.ts`

## What Attempt-Core Needs

### Credentials

- teacher Playwright credentials
- student Playwright credentials

### Backend and frontend

- frontend running
- backend running
- `PLAYWRIGHT_BASE_URL` set correctly
- `PLAYWRIGHT_API_BASE_URL` set correctly

### Seed expectations

The attempt-core specs create disposable teacher-assigned exams and run them through real student flows.

That means they need:

- teacher account able to create exams
- teacher account able to attach at least a few questions
- teacher account able to assign the exam to the student
- student account able to open the resulting exam

### What prepare-auth gives us

The command uses:

```bash
../edutech_backend/.venv/bin/python ../edutech_backend/manage.py prepare_demo_playwright_auth
```

This helps with:

- reseeding demo auth state
- clearing login throttle issues

It does not guarantee every mutable student lifecycle dependency beyond authentication.

## Success Criteria For Attempt-Core

We can call this group healthy when it proves:

- student sees truthful blocked/upcoming exam detail states
- student can start a disposable teacher-assigned exam
- student can save answers
- student can switch sections where expected
- student can resume the attempt
- student can submit successfully
- long-session runtime keeps save/reload/revisit/resume continuity truthful

## How To Interpret Outcomes

### If attempt-core passes cleanly

This is a major student-confidence gain.

It means:

- deep student state changes are now browser-proven
- remaining mutable gaps are more likely to be results/publication, economy, or family-seed specific

### If attempt-core still skips heavily

The next thing to inspect is not the whole student pack.

Inspect:

- whether teacher can create/assign disposable exams in this environment
- whether student and teacher credentials are both valid
- whether question-attach and assignment forms are actually populated

### If attempt-core fails

Treat that as high priority.

A failure here is much more likely to indicate a real learner lifecycle regression than many of the broader mutable skips.

## Next Best Action

Run this first:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
PLAYWRIGHT_BASE_URL=http://localhost:3006 PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 npm run test:e2e:mutable:student-attempt-core
```

Then report:

- passed
- skipped
- failed

That result will tell us whether student deep confidence can start moving from baseline-only to true lifecycle proof.
