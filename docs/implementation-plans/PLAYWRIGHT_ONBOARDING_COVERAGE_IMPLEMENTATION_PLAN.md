# Playwright Onboarding Coverage Implementation Plan

## Objective

Expand the Playwright browser suite so onboarding is covered across:

- platform-admin institute onboarding
- public student and teacher registration onboarding
- onboarding validation and blocked states
- onboarding recovery and reapply flows
- management-mode variants
- post-onboarding operational readiness

This plan is intentionally execution-oriented. It defines:

- what is already covered
- what still needs coverage
- exact spec files to add or extend
- exact test titles to implement
- shared helper/page-object boundaries
- run order and lane strategy

---

## Current Covered Scenarios

Already browser-covered today:

1. fresh institute full-preset onboarding
2. selected-subject onboarding
3. selected-topic-group onboarding
4. Class 8 Math onboarding
5. onboarding with package + advanced-builder access
6. reapply onboarding without duplicate academic structure
7. warning-path onboarding with incomplete access setup
8. mixed-preset multi-step onboarding with package/shared-library follow-up
9. institute post-onboarding dataset bootstrap through UI-only flows
10. student registration reaches profile completion
11. teacher registration reaches profile completion
12. student referral onboarding success
13. invalid referral code rejection
14. cross-institute referral rejection
15. paused referral program rejection

Primary existing specs:

- `edutech_web/tests/e2e/workflow/admin-onboarding-types.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/admin-mixed-institute-onboarding.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-onboarding-dataset-bootstrap.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/student-referral-onboarding.mutable.spec.ts`
- `edutech_web/tests/e2e/smoke/registration.spec.ts`

---

## Coverage Gaps

The following onboarding scenarios are not explicitly covered today:

1. `BLANK_INSTITUTE` happy path
2. `SCHOOL_STARTER` happy path
3. `TRIAL_FULL_ACCESS` happy path from create-institute flow
4. duplicate institute code validation
5. invalid onboarding profile code handling
6. failed onboarding run visibility and recovery
7. resume / retry onboarding run
8. onboarding run history and task detail audit as dedicated coverage
9. explicit no-access onboarding shape
10. management mode onboarding matrix:
   - `private_institute_managed`
   - `public_institute_managed`
   - `platform_managed`
11. platform-admin vs institute-admin management-mode permission guard in browser flow
12. public onboarding success completion for student
13. public onboarding success completion for teacher
14. topic-tree integrity assertions after onboarding

---

## Desired Final Coverage Matrix

### A. Institute Onboarding Profiles

Every supported onboarding profile should have one browser-proven happy path:

1. `BLANK_INSTITUTE`
2. `SCHOOL_STARTER`
3. `TRIAL_FULL_ACCESS`

### B. Onboarding Apply Shapes

Every supported academic apply shape should be browser-proven:

1. full preset
2. selected subjects
3. selected topic groups
4. Class 8 preset
5. mixed preset across multiple applies

### C. Access Shapes

Every supported access shape should be browser-proven:

1. no package, no advanced builder
2. package only
3. advanced builder only
4. package + advanced builder
5. package + manual linking required warning path

### D. Failure / Recovery Shapes

1. validation-blocked create
2. validation-blocked apply
3. failed onboarding run visible
4. reapply without duplication
5. retry / resume run

### E. Management Variants

1. private institute managed
2. public institute managed
3. platform managed

### F. Public Registration Onboarding

1. student signup to complete-profile
2. teacher signup to complete-profile
3. student onboarding success completion
4. referral success
5. referral failure and blocked variants

### G. Operational Readiness

1. post-onboarding student import
2. student login creation
3. exam creation
4. assignment
5. attempt
6. result publication

---

## Implementation Phases

## Phase 1: Shared Helper Extraction

Goal:
Reduce duplication before adding new onboarding specs.

### Files To Add

1. `edutech_web/tests/e2e/helpers/onboarding.ts`
2. `edutech_web/tests/e2e/page-objects/admin/admin-institute-onboarding.po.ts`

### Helper Responsibilities

`helpers/onboarding.ts`

- `createDisposableInstitute(page, options)`
- `deleteInstituteViaApi(page, instituteId)`
- `fetchInstituteByCode(page, code)`
- `fetchInstituteOnboardingRuns(page, instituteId)`
- `fetchInstituteOnboardingRunDetail(page, instituteId, runId)`
- `fetchInstituteOnboardingTasks(page, instituteId, runId)`
- `countAcademicEntities(page, instituteId)`
- `assertNoAcademicDuplication(before, after)`

`admin-institute-onboarding.po.ts`

- `gotoMasterDefaults(instituteId)`
- `selectOnboardingProfile(code)`
- `setAcademicYear(name, start, end)`
- `selectAcademicPreset(code)`
- `selectApplyMode(mode)`
- `setQuestionBankAccess(mode, packageCode?)`
- `setQuestionLinkingMode(mode)`
- `setAdvancedBuilderAccess(mode)`
- `previewChanges()`
- `applyPreset()`
- `openRunHistory()`
- `openRunDetail(runId)`
- `expectReadySummary()`
- `expectFollowUpSummary()`
- `expectWarningCard(text)`

### Done Criteria

- existing onboarding specs can reuse the helper without behavioral change
- all institute cleanup remains best-effort but reliable

---

## Phase 2: Profile Happy Paths

### New Spec

`edutech_web/tests/e2e/workflow/admin-institute-onboarding-profiles.mutable.spec.ts`

### Tests To Implement

1. `@workflow @mutable @onboarding admin can onboard a fresh institute with BLANK_INSTITUTE`
2. `@workflow @mutable @onboarding admin can onboard a fresh institute with SCHOOL_STARTER`
3. `@workflow @mutable @onboarding admin can onboard a fresh institute with TRIAL_FULL_ACCESS`
4. `@workflow @mutable @onboarding onboarding summary reflects the expected readiness state for each onboarding profile`

### Assertions

For `BLANK_INSTITUTE`:

- onboarding run exists
- no programs created
- no subjects created
- no topics created
- no package granted
- no advanced builder granted
- summary indicates limited/manual setup state

For `SCHOOL_STARTER`:

- onboarding run exists
- expected academics created
- no premium package granted by default
- advanced builder remains disabled
- summary indicates academic-ready but premium-disabled state

For `TRIAL_FULL_ACCESS`:

- onboarding run exists
- expected academics created
- advanced builder enabled
- package state matches configuration
- summary indicates guided-use-ready or truthful follow-up state

---

## Phase 3: Validation And Guard Rails

### New Spec

`edutech_web/tests/e2e/workflow/admin-institute-onboarding-validation.mutable.spec.ts`

### Tests To Implement

1. `@workflow @mutable @onboarding admin cannot create two institutes with the same code`
2. `@workflow @mutable @onboarding invalid onboarding profile code is rejected safely`
3. `@workflow @mutable @onboarding onboarding apply warns when package access is enabled without usable linking readiness`
4. `@workflow @mutable @onboarding onboarding with all premium access disabled stays truthful and usable`
5. `@workflow @mutable @onboarding missing required institute fields block onboarding create`

### Assertions

- inline or page-level validation errors visible
- no silent partial institute duplication
- no broken onboarding run generated for invalid create
- warning cards are visible before apply
- operator guidance remains actionable

---

## Phase 4: Recovery And Reapply

### New Spec

`edutech_web/tests/e2e/workflow/admin-institute-onboarding-recovery.mutable.spec.ts`

### Tests To Implement

1. `@workflow @mutable @onboarding admin can reapply onboarding without duplicating academic structure`
2. `@workflow @mutable @onboarding failed onboarding run is visible in institute run history`
3. `@workflow @mutable @onboarding admin can recover from a blocked onboarding configuration and complete apply`
4. `@workflow @mutable @onboarding onboarding run detail exposes requested config resolved config and task outcomes`
5. `@workflow @mutable @onboarding admin can resume onboarding work on an existing institute after earlier partial setup`

### Notes

If a true backend failure is hard to induce safely in browser tests, use a recoverable blocked configuration instead of forcing server faults.

### Assertions

- onboarding run list shows multiple runs in expected order
- run statuses are truthful
- task rows are visible and understandable
- entity counts do not duplicate after reapply
- final summary state is correct

---

## Phase 5: Management Mode Matrix

### New Spec

`edutech_web/tests/e2e/workflow/admin-institute-onboarding-management-mode.mutable.spec.ts`

### Tests To Implement

1. `@workflow @mutable @onboarding platform admin can onboard a private_institute_managed institute`
2. `@workflow @mutable @onboarding platform admin can onboard a public_institute_managed institute`
3. `@workflow @mutable @onboarding platform admin can onboard a platform_managed institute`
4. `@workflow @mutable @onboarding institute admin cannot change management mode`
5. `@workflow @mutable @onboarding management mode persists after onboarding and page reload`

### Assertions

- correct mode saved
- platform admin update succeeds
- institute admin update is blocked
- institute workspace remains reachable
- onboarding runs still attach to the correct institute

---

## Phase 6: Public Registration Onboarding

### New Spec

`edutech_web/tests/e2e/workflow/student-public-onboarding.mutable.spec.ts`

### Existing Specs To Keep

- `edutech_web/tests/e2e/smoke/registration.spec.ts`
- `edutech_web/tests/e2e/workflow/student-referral-onboarding.mutable.spec.ts`

### Tests To Implement

1. `@workflow @mutable @onboarding student can complete public onboarding successfully`
2. `@workflow @mutable @onboarding teacher can complete public onboarding successfully`
3. `@workflow @mutable @onboarding student public onboarding persists profile and institute context correctly`

### Assertions

- user reaches `/complete-profile`
- completion transitions into workspace
- onboarding status becomes completed
- correct profile details are visible after completion

Note:
Referral-specific success and failure paths remain in the current referral spec.

---

## Phase 7: Operational Readiness Proof

### Existing Spec To Extend

`edutech_web/tests/e2e/workflow/institute-onboarding-dataset-bootstrap.mutable.spec.ts`

### Optional New Spec

`edutech_web/tests/e2e/workflow/institute-post-onboarding-readiness.mutable.spec.ts`

### Tests To Add Or Keep

1. `@workflow @mutable @onboarding institute can import students after onboarding`
2. `@workflow @mutable @onboarding institute can create a published exam after onboarding`
3. `@workflow @mutable @onboarding onboarded institute can drive one student attempt to published results`

### Purpose

This phase proves the onboarding result is not cosmetic.
It proves the institute is functionally usable after onboarding.

---

## Existing Specs To Extend Instead Of Replacing

Continue using and extending:

1. `admin-onboarding-types.mutable.spec.ts`
2. `admin-mixed-institute-onboarding.mutable.spec.ts`
3. `student-referral-onboarding.mutable.spec.ts`
4. `institute-onboarding-dataset-bootstrap.mutable.spec.ts`

Do not rewrite these immediately.
Refactor shared flows out first, then move targeted cases into the new dedicated specs.

---

## Suggested Tagging Convention

Add these tags consistently to new onboarding tests:

- `@workflow`
- `@mutable`
- `@onboarding`

Optional sub-tags:

- `@admin-onboarding`
- `@public-onboarding`
- `@onboarding-recovery`
- `@onboarding-management-mode`

This allows focused execution such as:

```bash
npx playwright test --grep "@onboarding"
```

or

```bash
npx playwright test --grep "@admin-onboarding"
```

---

## Mutable Lane Flags

New onboarding coverage should align with existing mutable-lane patterns.

Expected flags:

- `PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES=1`
- `PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS=1`
- `PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS=1`
- `PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS=1`
- `PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_REFERRAL_ONBOARDING=1`

Recommended execution mode:

- `PLAYWRIGHT_WORKERS=1`

Reason:
most onboarding tests create shared mutable data and should run serially until cleanup is hardened further.

---

## Recommended Execution Order

### Wave 1

1. extract helper/page-object layer
2. add profile happy paths
3. rerun existing onboarding specs

### Wave 2

1. add validation and guard-rail spec
2. add recovery spec
3. harden institute cleanup paths

### Wave 3

1. add management-mode matrix
2. add public onboarding success-completion spec
3. extend operational readiness proof

### Wave 4

1. add topic-tree integrity assertions after academic onboarding data is stable again
2. add optional staged/prod-safe smoke subset if desired

---

## CI / Suite Grouping Strategy

Add one npm script or Playwright command alias for onboarding-only runs.

Suggested command:

```bash
npx playwright test --grep "@onboarding" --reporter=line
```

Suggested future package.json aliases:

- `test:e2e:onboarding`
- `test:e2e:onboarding:admin`
- `test:e2e:onboarding:public`

---

## Definition Of Done

Onboarding is considered comprehensively browser-covered when all of the following are true:

1. every supported institute onboarding profile has one passing happy-path test
2. duplicate-code and invalid-config validation are browser-proven
3. onboarding reapply and recovery are browser-proven
4. management-mode variants are browser-proven
5. student and teacher public onboarding success is browser-proven
6. referral onboarding success and failure states are browser-proven
7. at least one post-onboarding operational readiness journey passes through student import, exam flow, and results publish
8. all onboarding tests can run in a single tagged lane with predictable setup and cleanup

---

## Immediate Next Implementation Checklist

1. add `helpers/onboarding.ts`
2. add `page-objects/admin/admin-institute-onboarding.po.ts`
3. create `admin-institute-onboarding-profiles.mutable.spec.ts`
4. migrate profile-specific assertions out of `admin-onboarding-types.mutable.spec.ts` only where it reduces duplication
5. create `admin-institute-onboarding-validation.mutable.spec.ts`
6. create `admin-institute-onboarding-recovery.mutable.spec.ts`
7. create `admin-institute-onboarding-management-mode.mutable.spec.ts`
8. create `student-public-onboarding.mutable.spec.ts`
9. extend `institute-onboarding-dataset-bootstrap.mutable.spec.ts`
10. add onboarding-only run command to team runbook or package scripts

