# Self-Serve First-Time Operator Pack

Last updated: 2026-07-08

## Purpose

This pack turns the remaining unsupported self-serve confidence gap into one concrete rerunnable proof set.

Use it when the question is no longer:

- does the feature basically work?

Use it when the question is now:

- can a first-time operator understand what is wrong
- can they tell who must act
- can they tell where to recover next
- does the product distinguish filtered-empty, blocked, partial, and role-limited states truthfully

Related documents:

- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
- [SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md)
- [SHARED_LIBRARY_SELF_SERVE_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SHARED_LIBRARY_SELF_SERVE_EXECUTION_BOARD.md)
- [OPERATOR_8_TO_9_CONFIDENCE_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OPERATOR_8_TO_9_CONFIDENCE_EXECUTION_BOARD.md)

---

## Current Goal

Raise unsupported self-serve confidence by proving the product is teachable and recoverable for first-time operators in the densest onboarding and question-bank access lanes.

This pack is not about isolated happy paths.

It is about grouped operator understanding across:

- mixed onboarding outcomes
- package mismatch and partial entitlement
- teacher request-only versus institute link-capable recovery
- empty-state versus true no-access differentiation

---

## What This Pack Must Prove

### 1. Mixed onboarding remains understandable

At least one institute should land in a clean ready state, and another should land in a truthful follow-up-needed state.

The operator must be able to tell:

- what was created
- what access was attached
- whether the institute is ready now
- what route to open next if it is not ready

### 2. Package mismatch and partial entitlement do not look like broken product

The operator must be able to tell the difference between:

- no matching package coverage
- partial package coverage
- feature-level blocking
- scope mismatch

### 3. Teacher versus institute role boundaries stay product-led

The teacher must see the truthful request-only lane.

The institute must see the truthful final-link lane.

Recovery should make it obvious:

- who can act
- which surface they must use
- what changes after the admin or institute fix

### 4. Empty-state versus true no-access stays distinct

The product must not collapse these into one confusing blank experience:

- filtered-empty
- unseeded or no-match state
- no entitlement
- quota exhausted
- already-linked or non-actionable state

---

## Recommended Spec Pack

### Core pack

- `edutech_web/tests/e2e/workflow/admin-mixed-institute-onboarding.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/teacher-institute-shared-library-role-difference.spec.ts`
- `edutech_web/tests/e2e/workflow/teacher-question-bank-shared-library-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-question-bank-shared-library-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-question-bank-shared-library-no-entitlement.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-question-bank-shared-library-quota-exhausted.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-package-scope-recovery-institute-linked.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-package-scope-expansion-institute-linker.mutable.spec.ts`

### Optional strengthening lanes

Use these if we want a denser follow-up wave after the core pack is green:

- `edutech_web/tests/e2e/workflow/institute-question-bank-shared-library-quota-exhausted.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/teacher-question-bank-shared-library-request.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-institute-question-bank-feature-recovery.mutable.spec.ts`

Current strengthening result:

- grouped strengthening wave: `3 passed`, `1 expected skip`
- quota-lane follow-up rerun with `PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_SHARED_LIBRARY_QUOTA=1`: `1 passed`
- combined strengthening read: `4/4 proven`

---

## Recommended Run Order

1. mixed onboarding summary and follow-up truth
2. teacher versus institute role-boundary truth
3. institute empty-state, no-entitlement, and quota-blocked distinction
4. admin package-scope recovery back into institute usability
5. optional mutable strengthening lanes

Reason for this order:

- start with first-run operator understanding
- then lock the role mental model
- then prove blocked states are distinguishable
- then prove recovery is not support-magic

---

## Copy-Paste Commands

### Mixed onboarding and role-boundary pass

```bash
PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES=1 \
PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS=1 \
npx playwright test \
  edutech_web/tests/e2e/workflow/admin-mixed-institute-onboarding.mutable.spec.ts \
  edutech_web/tests/e2e/workflow/teacher-institute-shared-library-role-difference.spec.ts \
  edutech_web/tests/e2e/workflow/teacher-question-bank-shared-library-workspace.spec.ts \
  edutech_web/tests/e2e/workflow/institute-question-bank-shared-library-workspace.spec.ts \
  --reporter=line
```

### Access-state and recovery pass

```bash
PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES=1 \
PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS=1 \
npx playwright test \
  edutech_web/tests/e2e/workflow/institute-question-bank-shared-library-no-entitlement.spec.ts \
  edutech_web/tests/e2e/workflow/institute-question-bank-shared-library-quota-exhausted.spec.ts \
  edutech_web/tests/e2e/workflow/admin-package-scope-recovery-institute-linked.mutable.spec.ts \
  edutech_web/tests/e2e/workflow/admin-package-scope-expansion-institute-linker.mutable.spec.ts \
  --reporter=line
```

### Optional strengthening rerun

```bash
PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_SHARED_LIBRARY_QUOTA=1 \
PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS=1 \
PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_SHARED_LIBRARY_REQUEST=1 \
npx playwright test \
  edutech_web/tests/e2e/workflow/institute-question-bank-shared-library-quota-exhausted.mutable.spec.ts \
  edutech_web/tests/e2e/workflow/teacher-question-bank-shared-library-request.mutable.spec.ts \
  edutech_web/tests/e2e/workflow/admin-institute-question-bank-feature-recovery.mutable.spec.ts \
  --reporter=line
```

---

## Signoff Checklist

Treat this pack as successful only when all of these are true:

- a first-time operator can tell whether the institute is ready or still needs follow-up
- package mismatch, no entitlement, quota exhaustion, and filtered-empty do not read like the same failure
- teacher request-only versus institute final-link authority is visible from the UI alone
- recovery after admin package widening restores truthful institute-side usability
- grouped reruns stay green without relying on hidden manual explanation

---

## What This Pack Improves

If this pack is clean, it should justify raising confidence specifically in:

- broader unsupported self-serve teachability
- first-time operator recovery confidence
- grouped operator proof beyond isolated scenario wins

It should not by itself be used to claim:

- performance or scale readiness
- full exam-day concurrency confidence
- totally support-free rollout at arbitrary breadth

Those still depend on the stage and performance workstreams.
