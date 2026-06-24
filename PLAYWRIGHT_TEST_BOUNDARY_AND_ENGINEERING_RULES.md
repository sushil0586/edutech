# Playwright Test Boundary And Engineering Rules

## Purpose

This document defines the engineering rules for how Playwright automation should interact with product code.

Its goal is to keep:

- application logic clean
- automation independent
- regressions actionable
- future test growth sustainable

Related documents:

- [PLAYWRIGHT_AUTOMATION_PHASED_ROADMAP.md](./PLAYWRIGHT_AUTOMATION_PHASED_ROADMAP.md)
- [PLAYWRIGHT_PHASE_1_IMPLEMENTATION_PLAN.md](./PLAYWRIGHT_PHASE_1_IMPLEMENTATION_PLAN.md)
- [PENDING_WORK_AND_AUTOMATION_STRATEGY.md](./PENDING_WORK_AND_AUTOMATION_STRATEGY.md)

---

## Core Principle

The correct model is:

`automation verifies the product`

not:

`the product changes its behavior to satisfy automation`

That means:

- application code owns business behavior
- Playwright owns browser-level verification
- test failures should reveal product issues or automation issues clearly

---

## Required Boundary

Automation and product code should be independent by default.

### Product code should contain:

- real business logic
- real UI behavior
- real role-based behavior
- real validation and workflow rules

### Automation code should contain:

- test flows
- fixtures
- helpers
- assertions
- test environment setup

### Product code may include small testability hooks:

- `data-testid`
- accessible labels
- stable roles
- deterministic empty/loading/error states

These are allowed because they improve product quality as well, not only tests.

---

## What Is Allowed

The following changes are acceptable to support Playwright.

## 1. Stable selectors

Examples:

- `data-testid="results-analysis-card"`
- `data-testid="builder-preview-button"`
- `data-testid="question-import-submit"`

Why allowed:

- they do not change business behavior
- they reduce selector fragility

---

## 2. Accessibility improvements

Examples:

- better button labels
- proper form labels
- semantic headings
- consistent dialog titles

Why allowed:

- good for users
- good for automation

---

## 3. Predictable UI states

Examples:

- explicit loading text
- explicit empty-state text
- explicit no-results blocks
- explicit error banners

Why allowed:

- improves usability
- makes tests stable

---

## 4. Seeded fixture data support

Examples:

- known demo users
- known demo exams
- documented seeded workflows

Why allowed:

- tests should not depend on random local data
- fixtures improve repeatability

---

## What Is Not Allowed

These patterns should be avoided.

## 1. Test-only business logic branches

Not allowed:

- `if (isPlaywright) { ... }`
- alternate workflow logic only for tests
- fake success paths for automation

Reason:

- this corrupts product truth

---

## 2. Hidden automation shortcuts in real workflows

Not allowed:

- bypassing validation only for tests
- skipping required steps through hidden flags
- adding secret routes that alter business behavior

Reason:

- tests stop representing reality

---

## 3. Fixing tests by weakening the product

Not allowed:

- removing useful validation because a test is failing
- reducing security behavior to simplify automation
- hiding real errors instead of solving them

Reason:

- automation should raise product quality, not lower it

---

## Correct Failure Handling Model

When a Playwright test fails, handle it in this order:

### 1. Check whether the test is wrong

Examples:

- brittle selector
- stale assumption
- wrong test data expectation

If yes:

- fix the test

### 2. Check whether the product has a real issue

Examples:

- broken route
- scope leak
- hydration error
- action button missing
- workflow blocked unexpectedly

If yes:

- fix product code

### 3. Check whether the UI is insufficiently testable

Examples:

- unstable selectors
- poor accessibility labels
- ambiguous empty states

If yes:

- add testability support without changing business logic

---

## Base-First Test Strategy

The correct rollout is:

`base workflows first, advanced functionality later`

This is the right approach for this platform because:

- there are many roles
- there are many long workflows
- advanced flows depend on stable base flows

So Playwright should begin with:

## Base coverage

- role login
- portal landing
- page load sanity
- core navigation
- primary workflow entry points
- basic create/load/open flows

Only after that should the suite expand into:

## Advanced coverage

- deep builder workflows
- review moderation edge cases
- analytics filters and drilldowns
- comprehension and rich-content permutations
- advanced media and rubric cases

---

## Recommended Phase 1 Rule

For the first Playwright phase:

- prefer smoke reliability over deep coverage
- protect critical base journeys
- keep tests short and high-signal
- avoid long multi-feature chains

Phase 1 should prove:

- users can enter the correct portal
- critical pages load
- main workflow entry points work
- the platform does not fail at the browser level

---

## Test Design Rules

Every Playwright test should follow these rules:

## 1. One journey per test

Keep each test focused on one meaningful workflow.

## 2. Assert outcomes, not implementation details

Test what users see and can do, not internal UI structure.

## 3. Prefer stable selectors

Use:

1. `data-testid`
2. roles and labels
3. stable text

Avoid fragile style-based selectors.

## 4. Avoid random waits

Wait on:

- visible UI state
- network-complete behavior where needed
- stable route or content state

Do not rely on arbitrary sleep timing.

## 5. Keep advanced assertions out of smoke tests

Smoke tests should fail only for meaningful regressions.

---

## Code Organization Rules

Recommended separation:

### Product code

- `src/app`
- `src/components`
- `src/features`
- backend apps and services

### Automation code

- `tests/e2e`
- `tests/e2e/helpers`
- `tests/e2e/fixtures`
- `playwright.config.ts`

The product should not contain embedded test flow logic.

---

## Data Rules

Base tests should use deterministic data.

Preferred order:

1. seeded demo accounts
2. seeded demo exams and content
3. idempotent setup helpers if needed

Avoid:

- hidden dependence on whatever currently exists in a local database
- flows that only pass after manual environment manipulation

---

## CI Rules

### PR automation

Run only:

- base smoke tests
- Chromium
- fast failure

### Main or nightly

Add:

- deeper workflow suites
- broader role coverage
- analytics and advanced flows

Reason:

- base tests must remain fast and dependable

---

## High-Level Recommendation

The best engineering rule for Playwright in this platform is:

`independent automation, minimal testability hooks, real product fixes when issues are exposed`

And the best rollout rule is:

`base workflows first, advanced functionality later`

That gives the platform:

- cleaner product code
- safer automation growth
- lower maintenance cost
- higher confidence over time
