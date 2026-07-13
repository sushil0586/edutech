# Playwright Onboarding Coverage Status

## Scope

This document records the current browser-automation status for onboarding-related flows.

The target for this phase is:

- institute onboarding through platform admin flows
- public registration onboarding
- onboarding validation and recovery
- management-mode coverage
- first operational readiness after onboarding through browser-only steps

## Covered Now

The following onboarding scenarios are already covered through Playwright browser flows.

### 1. Platform-admin institute onboarding happy paths

Covered specs:

- `edutech_web/tests/e2e/workflow/admin-onboarding-types.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-mixed-institute-onboarding.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-institute-onboarding-profiles.mutable.spec.ts`

Covered scenarios:

- full-preset onboarding
- selected-subject onboarding
- selected-topic-group onboarding
- Class 8 onboarding
- mixed multi-step onboarding
- `BLANK_INSTITUTE`
- `SCHOOL_STARTER`
- `TRIAL_FULL_ACCESS`
- package-access and advanced-builder combinations
- truthful follow-up summary when manual linking is still required

### 2. Onboarding validation and guard rails

Covered spec:

- `edutech_web/tests/e2e/workflow/admin-institute-onboarding-validation.mutable.spec.ts`

Covered scenarios:

- missing required institute fields block create
- duplicate institute code is rejected
- tampered or invalid onboarding profile code is rejected safely

### 3. Onboarding recovery and run-history visibility

Covered spec:

- `edutech_web/tests/e2e/workflow/admin-institute-onboarding-recovery.mutable.spec.ts`

Covered scenarios:

- completed onboarding run appears in run history
- run detail and task detail are inspectable
- reapply from fresh master defaults creates a new tracked run
- reapply does not duplicate academic structure

### 4. Institute management-mode coverage

Covered spec:

- `edutech_web/tests/e2e/workflow/admin-institute-management-mode.mutable.spec.ts`

Covered scenarios:

- platform admin can create institute with management mode
- platform admin can edit management mode
- institute admin cannot change management mode

Management modes covered in browser create/edit flows:

- `private_institute_managed`
- `public_institute_managed`
- `platform_managed`

### 5. Public registration onboarding

Covered specs:

- `edutech_web/tests/e2e/workflow/public-registration-onboarding.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/student-referral-onboarding.mutable.spec.ts`

Covered scenarios:

- public student signup completes onboarding and enters student workspace
- public teacher signup completes onboarding and enters teacher workspace
- referral signup success path
- invalid referral code rejection
- cross-institute referral rejection
- paused referral-program rejection

### 6. Post-onboarding operational readiness through browser-only flows

Covered specs:

- `edutech_web/tests/e2e/workflow/institute-onboarding-dataset-bootstrap.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-institute-consolidated-regression.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-institute-onboarding-roster-bootstrap.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-institute-blank-onboarding-operations.mutable.spec.ts`

Covered scenarios:

- student CSV import from browser
- teacher CSV import from browser
- student login creation
- teacher login creation
- institute exam shell creation
- section creation
- question attach
- assignment to selected student
- publish and mark live flow
- student starts attempt
- student saves answer
- student submits attempt
- institute generates and publishes results
- admin-to-institute full chain from fresh onboarding to published results

## Phase 1 Coverage Conclusion

Phase 1 is no longer just institute creation.

It now proves, through browser automation, the full onboarding journey across:

- create institute
- apply onboarding defaults
- validate bad inputs
- inspect and reapply runs
- enforce management-mode permissions
- complete public user onboarding
- drive the first real institute operating flow after onboarding

## Still Not Covered In The Onboarding Slice

These are still valuable, but they are now adjacent operational coverage rather than core onboarding gaps.

### 1. Bulk onboarding variants not yet combined into one browser matrix

- teacher import as part of the same fresh-onboarding journey
- mixed student and teacher bootstrap in one scenario
- repeated bootstrap on same institute across multiple academic years

### 2. First-day institute operations after onboarding

- teacher creation and teacher assignment flows immediately after onboarding
- first review-queue workflow after descriptive submissions
- first leaderboard and analytics verification for multiple learners

### 3. Negative operational readiness paths

- import preview with mixed valid and invalid rows immediately after onboarding
- assignment blocked when roster is empty

### 4. Scale and performance are not covered by onboarding specs

- page-load timing
- API over-fetch auditing during onboarding
- concurrency and slot-scale behavior
- long-window public exam threshold behavior

## Best Next Browser Additions

If we continue after this phase, the next highest-value browser specs are:

1. onboarding to teacher-and-student roster bootstrap
2. blank-onboarding negative path for first exam creation
3. onboarding to first teacher-owned exam assignment
4. onboarding to multi-learner results publication

## Practical Readiness Call

From the onboarding perspective, the browser suite now has good confidence for a pilot run.

The remaining work is mostly in:

- post-onboarding operational depth
- scale and performance validation
- load and capacity testing

That means onboarding itself is no longer the biggest unmanaged risk area.
