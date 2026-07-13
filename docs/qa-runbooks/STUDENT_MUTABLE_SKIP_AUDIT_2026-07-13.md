# Student Mutable Skip Audit - 2026-07-13

## Summary

Observed `student-mutable-core` result:

- `1 passed`
- `31 skipped`
- `0 failed`

This is not a red signal for the student product.

It means the mutable student pack is mostly environment-gated right now.

The major blockers are:

- mutable feature flags not enabled
- missing disposable seed accounts or seeded family learners
- missing published-result and review-ready chains
- missing referral and wallet reward prerequisites
- missing active entitlement or economy setup

## What This Pack Tries To Prove

The mutable student pack is the deep lifecycle layer, not the baseline page layer.

It tries to prove:

- real student attempt creation and state changes
- real student exam-key usage
- real result publication and release continuity
- real practice lifecycle
- descriptive results and analytics continuity
- long-session and weak-network resilience
- referral, wallet, and student economy mutations
- family-specific lifecycle lanes
- entitlement-sensitive discovery contracts

## Main Cause Categories

### 1. Mutable flag not enabled

Many mutable student specs are intentionally hard-gated by environment flags.

Examples:

- `PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS`
- `PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_EXAM_KEY_ACTIONS`
- `PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS`
- `PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS`
- `PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS`
- `PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ECONOMY_ACTIONS`
- `PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_REFERRAL_ONBOARDING`
- `PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_EXAM_VISIBILITY_ENTITLEMENT_CONTRACT`

If these are not enabled, the spec will skip by design.

### 2. Missing seeded learner state

Some student specs need the configured student to already expose one of these:

- active attempt runtime route
- resumable attempt route
- post-submit summary route
- review route
- subject analytics drill route
- teacher-scoped analytics source route
- result-state matrix records

Without those seeded states, the spec skips because the current account cannot prove the target behavior.

### 3. Missing family-specific seeded learners or exams

The family contract and family lifecycle lanes depend on dedicated family demo accounts and exam codes.

Examples:

- AWS
- GRE
- JEE
- NEET
- multi-subject
- competitive / certification / language family demo accounts

If those demo-family accounts or seeded exams are absent, these lanes now skip cleanly instead of failing falsely.

### 4. Missing referral or institute reward setup

Referral lanes require:

- a student account that exposes a referral code
- a student account that exposes an institute
- an active referral program for that institute
- in one case, an alternate public registration institute

Without these, the referral pack skips by design.

### 5. Missing economy or entitlement setup

The student economy and entitlement lanes require:

- visible mutable star pack or subscription request options
- active question-bank entitlements for the student institute
- admin-side economy state that can be safely toggled during the contract test

Without those, the economy and entitlement specs skip.

## Skip Groups By Spec

### Attempt and exam-detail mutable group

Needs:

- teacher credentials
- student credentials
- `PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1`
- disposable teacher-created exam setup

Specs:

- `student-exam-detail-mutable.spec.ts`
- `student-attempt-mutable.spec.ts`
- `student-long-session-runtime.mutable.spec.ts`

### Exam-key mutable group

Needs:

- student credentials
- `PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_EXAM_KEY_ACTIONS=1`
- seeded live exam-key lane

Specs:

- `student-exam-key-mutable.spec.ts`

### Practice and family lifecycle mutable group

Needs:

- student credentials
- `PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS=1`
- seeded practice/family exams
- seeded practice-start or practice-resume states

Specs:

- `student-practice-mutable.spec.ts`
- `student-family-weak-network.mutable.spec.ts`
- `student-aws-practice-lifecycle.mutable.spec.ts`
- `student-gre-quant-lifecycle.mutable.spec.ts`
- `student-jee-full-mock-lifecycle.mutable.spec.ts`
- `student-neet-full-mock-lifecycle.mutable.spec.ts`
- `student-multi-subject-lifecycle.mutable.spec.ts`

### Results publication and storytelling mutable group

Needs:

- teacher credentials
- student credentials
- `PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS=1`
- teacher-owned disposable exam/question/result publication path

Specs:

- `student-results-mutable.spec.ts`
- `student-results-storytelling.mutable.spec.ts`
- `student-analytics-drilldown.mutable.spec.ts`
- `student-mobile-results-review-workflow.spec.ts`

### Descriptive and mixed-history mutable group

Needs:

- teacher/institute/admin mutable exam-result publication setup
- `PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS=1`
- descriptive manual-review capable result chain

Specs:

- `student-descriptive-result-storytelling.mutable.spec.ts`
- `student-descriptive-analytics-continuity.mutable.spec.ts`
- `student-multi-attempt-history.mutable.spec.ts`
- `student-mixed-result-history.mutable.spec.ts`

### Referral and wallet mutable group

Needs:

- `PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_REFERRAL_ONBOARDING=1`
- student account with referral code
- student account linked to institute
- active referral program
- alternate public institute for one cross-institute case

Specs:

- `student-referral-onboarding.mutable.spec.ts`

Additional wallet view lane:

- `student-referral-wallet-workspace.spec.ts`

### Student economy mutable group

Needs:

- `PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ECONOMY_ACTIONS=1`
- student account with mutable star pack or subscription request options

Specs:

- `student-economy-mutable.spec.ts`

### Entitlement visibility contract group

Needs:

- admin credentials
- student credentials
- `PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_EXAM_VISIBILITY_ENTITLEMENT_CONTRACT=1`
- active institute question-bank entitlement

Specs:

- `student-question-bank-entitlement-visibility-contract.mutable.spec.ts`

## Why Only One Spec Passed

The current result shape strongly suggests that nearly the whole pack was blocked before it could exercise its real assertions.

That means the `1 passed` result is not enough to claim deep student lifecycle confidence.

The current environment is good enough for student baseline proof, but not yet ready for a broad mutable student signoff.

## What To Do Before The Next Mutable Rerun

### Minimum flag layer

Export the mutable flags needed for the desired lane:

```bash
export PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1
export PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_EXAM_KEY_ACTIONS=1
export PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS=1
export PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS=1
export PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS=1
export PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ECONOMY_ACTIONS=1
export PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_REFERRAL_ONBOARDING=1
export PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_EXAM_VISIBILITY_ENTITLEMENT_CONTRACT=1
```

### Minimum credential layer

Confirm these are available:

- `student`
- `teacher`
- `admin`

Several mutable student specs depend on teacher-created or admin-governed disposable setup.

### Minimum seed layer

Prepare or confirm:

- family demo students for AWS/GRE/JEE/NEET/language/certification/competitive
- review-ready and published student results
- descriptive result chain
- active referral program
- institute-linked referral-capable student
- active question-bank entitlement for at least one student institute
- mutable star pack or subscription request option visibility

## Recommended Next Execution Strategy

Do not rerun the full `student-mutable-core` immediately.

Use this order:

1. Enable flags
2. Prepare one seed target per group
3. Run one narrow mutable group at a time

Suggested sequence:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3006 npx playwright test tests/e2e/workflow/student-exam-detail-mutable.spec.ts tests/e2e/workflow/student-attempt-mutable.spec.ts --project=chromium

PLAYWRIGHT_BASE_URL=http://localhost:3006 npx playwright test tests/e2e/workflow/student-results-mutable.spec.ts tests/e2e/workflow/student-results-storytelling.mutable.spec.ts tests/e2e/workflow/student-analytics-drilldown.mutable.spec.ts --project=chromium

PLAYWRIGHT_BASE_URL=http://localhost:3006 npx playwright test tests/e2e/workflow/student-referral-onboarding.mutable.spec.ts tests/e2e/workflow/student-economy-mutable.spec.ts --project=chromium
```

Then rerun:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3006 npm run test:e2e:release:student-mutable-core
```

## Current Read

Current student confidence split is:

- baseline student web functionality: good
- deep student mutable lifecycle confidence: not yet established in this environment

That is a setup-readiness gap, not a newly discovered failure cluster.
