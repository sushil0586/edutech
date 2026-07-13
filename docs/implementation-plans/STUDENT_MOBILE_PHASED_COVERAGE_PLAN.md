# Student Mobile Phased Coverage Plan

## Objective

Turn the current student mobile Playwright coverage into a deliberate rollout plan that closes the remaining gaps in order of product risk.

The current mobile suite already gives us strong confidence in:

- navigation
- read-only discovery
- fallback / empty states
- results and review continuity

What is still missing is the active student journey on mobile, especially attempt runtime and CRUD-style flows.

---

## Current Coverage Snapshot

### Covered

1. mobile shell navigation
2. dashboard route reachability
3. exam list route reachability
4. exam detail route reachability
5. empty-state and fallback-state truthfulness
6. results summary and review continuity
7. analytics route reachability from mobile flows
8. family-specific seeded exam and result visibility

### Partial

1. attempt route reachability
2. results route reachability
3. analytics route reachability

These are currently covered mostly as safe reads, not as full interactive journeys.

### Missing

1. attempt runtime start / resume / submit on mobile
2. section switching in a live attempt
3. practice flow on mobile
4. mobile CRUD for profile, wallet, and subscription surfaces
5. mobile cross-browser coverage
6. mobile timing / performance budgets

---

## Current Specs

Mobile student specs already in the suite:

- `tests/e2e/workflow/student-mobile-sanity-workspace.spec.ts`
- `tests/e2e/workflow/student-family-mobile-sanity.spec.ts`
- `tests/e2e/workflow/student-family-mobile-results-sanity.spec.ts`
- `tests/e2e/workflow/student-mobile-state-panel-sanity.spec.ts`
- `tests/e2e/workflow/student-mobile-results-review-workflow.spec.ts`

Current mobile pack scripts use `PLAYWRIGHT_BASE_URL=http://localhost:3006` by default.

---

## Phase 1: Core Mobile Exam Runtime

### Goal

Make the live exam journey dependable on small screens.

### Scope

1. start attempt from mobile exam detail
2. resume an in-progress attempt
3. switch sections on mobile
4. answer, save, and revisit questions
5. submit from mobile with clear confirmation
6. verify timer, question state, and persistence on refresh

### Suggested Test Coverage

1. `student-mobile-attempt-runtime.spec.ts`
2. `student-mobile-attempt-resume.spec.ts`
3. `student-mobile-section-switching.spec.ts`
4. `student-mobile-submit-confirmation.spec.ts`

### Exit Criteria

1. a student can complete an exam on mobile without layout or navigation dead ends
2. refresh / resume behavior stays truthful
3. section switching and submit flows are stable

---

## Phase 2: Mobile Student Operations

### Goal

Cover the operational surfaces students use outside the exam runtime.

### Scope

1. profile view and edit
2. wallet and subscription visibility
3. notifications / utility surfaces
4. analytics drilldown and comparison
5. results detail and review revisit paths

### Suggested Test Coverage

1. `student-mobile-profile-crud.spec.ts`
2. `student-mobile-wallet-subscription.spec.ts`
3. `student-mobile-notifications.spec.ts`
4. `student-mobile-analytics-drilldown.spec.ts`

### Exit Criteria

1. the student can manage their account and understand their access state
2. results and analytics are usable on small screens
3. no key student surface is desktop-only by accident

---

## Phase 3: Mobile Reliability And Scale Confidence

### Goal

Make the mobile coverage trustworthy enough to support release confidence.

### Scope

1. cross-browser runs for mobile student flows
2. route-fallback and not-found truthfulness on mobile
3. performance timing checks for core student mobile routes
4. repeatability under reload / revisit / back-navigation

### Suggested Test Coverage

1. chromium + webkit smoke for the student mobile pack
2. route-gap / fallback assertions for missing mobile exam states
3. timing specs for dashboard, exams, results, and review

### Exit Criteria

1. mobile student flows pass in more than one browser engine
2. core route timings are measured, not assumed
3. mobile failures are true product failures, not test brittleness

---

## Priority Order

If we do this in order, the safest sequence is:

1. mobile exam runtime
2. mobile profile / wallet / subscription operations
3. cross-browser and timing hardening

This gives the most product value first and the best confidence improvement second.

---

## Notes

- Keep mobile scripts aligned to the working browser port configuration.
- Prefer user-facing selectors over layout-dependent selectors.
- Treat mobile route failure pages as product bugs only after base URL and auth state are confirmed.

