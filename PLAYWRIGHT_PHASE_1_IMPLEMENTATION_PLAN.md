# Playwright Phase 1 Implementation Plan

## Purpose

This document defines the first implementation slice for Playwright in this platform.

Phase 1 is intentionally narrow.

It should create:

- a reliable Playwright foundation
- a small critical smoke suite
- CI-ready release-confidence coverage

It should not try to automate the whole portal at once.

Related documents:

- [PLAYWRIGHT_AUTOMATION_PHASED_ROADMAP.md](./PLAYWRIGHT_AUTOMATION_PHASED_ROADMAP.md)
- [PENDING_WORK_AND_AUTOMATION_STRATEGY.md](./PENDING_WORK_AND_AUTOMATION_STRATEGY.md)

---

## Phase 1 Goal

Protect the minimum set of high-value workflows that must not silently break.

The execution principle is:

`small, stable, and release-critical first`

---

## Scope

Phase 1 should cover only the critical smoke journeys.

### In scope

- Playwright installation and config
- environment handling
- basic shared fixtures
- seeded or reusable test users
- 5 to 8 smoke workflows
- CI command integration

### Out of scope

- full role-scope matrix
- visual regression
- multi-browser matrix on every run
- large analytics test suite
- exhaustive builder permutations

---

## Recommended Technology Setup

Inside `edutech_web`:

- install `@playwright/test`
- keep tests in TypeScript
- start with Chromium only
- use Playwright HTML reporting

Recommended scripts:

- `test:e2e`
- `test:e2e:smoke`
- `test:e2e:headed`

Recommended config principles:

- base URL from env
- retry only in CI
- screenshots on failure
- trace on first retry
- video only on failure if needed later

---

## Folder Structure

Suggested structure:

```text
edutech_web/
  playwright.config.ts
  tests/
    e2e/
      smoke/
      fixtures/
      helpers/
      auth/
```

Suggested intent:

- `smoke/`
  critical user journeys only
- `fixtures/`
  shared test users and setup logic
- `helpers/`
  navigation and stable interaction helpers
- `auth/`
  login/session utilities

---

## Required Test Data Strategy

Phase 1 should not depend on random manual data.

Preferred options:

### Best option

Use seeded fixture users and a known demo dataset.

Examples:

- institute admin demo user
- teacher demo user
- student demo user

### Acceptable option

Create minimal setup helpers that establish the smallest required entities before a workflow runs.

### Avoid

- tests that depend on ad hoc local state
- tests that depend on hand-created records not documented anywhere

---

## Phase 1 Test Flows

These are the recommended first smoke tests.

## 1. Institute login and results workspace load

Validates:

- login works
- institute portal loads
- results page loads without fatal UI failure

Why it matters:

- broad platform confidence check

---

## 2. Teacher question-bank page and import workspace load

Validates:

- teacher login works
- question-bank page loads
- import entry flow is reachable

Why it matters:

- authoring and bank workflows are a platform backbone

---

## 3. Teacher exam builder basic path

Validates:

- exams list loads
- exam builder opens
- question-linking / preview entry point is visible

Why it matters:

- builder regressions are high-cost operational failures

---

## 4. Student available exam to attempt start

Validates:

- student login works
- exam list loads
- eligible exam can be opened
- attempt can be started

Why it matters:

- core learner journey coverage

---

## 5. Student attempt submit or submit-path visibility

Validates:

- question rendering works
- attempt workspace loads
- submit action is visible and functional in known-safe fixture conditions

Why it matters:

- protects the most important runtime flow

---

## 6. Teacher review queue load

Validates:

- teacher review page loads
- queue items or empty state render correctly
- review workflow entry is reachable

Why it matters:

- manual-review capability is a core growth track

---

## 7. Institute review queue and moderation workspace load

Validates:

- institute review page loads
- moderation-side queue renders
- no cross-role route or UI regression

Why it matters:

- institute operational workflow confidence

---

## 8. Institute or teacher analytics analysis page load

Validates:

- results analysis page renders
- key analytics blocks appear
- no hydration/runtime break on the main decision-support surface

Why it matters:

- analytics pages now have enough complexity to justify smoke protection

---

## Execution Order

Recommended implementation order:

1. Playwright config and scripts
2. shared login helpers
3. institute smoke
4. teacher smoke
5. student smoke
6. review smoke
7. analytics smoke
8. CI integration

Reason:

- this builds the least fragile base first

---

## Selector Strategy

Playwright reliability depends heavily on selector quality.

Preferred order:

1. explicit `data-testid`
2. accessible labels and roles
3. stable text
4. never rely on fragile layout selectors for critical flows

Phase 1 may reveal places where the UI needs test-friendly attributes.

That is expected and healthy.

---

## Reliability Rules

Phase 1 tests should follow these rules:

- each test checks one core journey
- keep assertions high-signal
- avoid over-asserting cosmetic details
- use resilient waits based on real page state
- prefer smoke reliability over deep coverage

Avoid:

- long brittle flows in one test
- unnecessary form filling where page load proves enough
- random timing waits

---

## CI Integration

Phase 1 should support:

### Local

- developers can run smoke tests on demand

### PR

- run smoke suite only
- Chromium only
- fail fast on regression

### Main or nightly

- run smoke suite consistently
- keep room for broader suites later

---

## Expected Deliverables

Phase 1 implementation should produce:

- Playwright installed in `edutech_web`
- working Playwright config
- environment-aware base URL setup
- shared auth helper utilities
- first smoke suite
- npm scripts for e2e runs
- documentation for local and CI usage

---

## Exit Criteria

Phase 1 is complete when:

- Playwright is configured and runnable locally
- critical smoke tests pass consistently
- suite is small enough for PR usage
- failures are readable and actionable
- the platform has browser-level protection for the most important workflows

---

## Risks To Watch

Main risks:

- unstable local data
- selectors that are not durable
- tests that try to do too much
- over-coupling to cosmetic UI details
- slow runs caused by deep flows too early

Mitigation:

- seed data intentionally
- keep tests narrow
- add stable test hooks where needed
- separate smoke from deeper workflow coverage

---

## High-Level Recommendation

Phase 1 should not try to prove everything.

It should prove only this:

`the platform’s most important browser journeys still work`

That is the right first milestone before expanding Playwright into deeper role, workflow, analytics, and visual coverage.
