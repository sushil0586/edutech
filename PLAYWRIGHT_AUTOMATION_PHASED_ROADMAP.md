# Playwright Automation Phased Roadmap

## Purpose

This document defines how Playwright should be introduced into the platform in controlled phases.

It is not meant to replace:

- Django unit and integration tests
- TypeScript type checks
- backend contract validation

Instead, it defines how Playwright should become the platform's:

`critical user-journey and UI workflow regression layer`

Related documents:

- [PENDING_WORK_AND_AUTOMATION_STRATEGY.md](./PENDING_WORK_AND_AUTOMATION_STRATEGY.md)
- [NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md](./NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md)
- [FUTURE_PROOF_ASSESSMENT_PLATFORM_EXECUTION_BLUEPRINT.md](./FUTURE_PROOF_ASSESSMENT_PLATFORM_EXECUTION_BLUEPRINT.md)

---

## Why Playwright Fits This Platform

This portal has:

- many roles
- many workflows
- shared but role-scoped pages
- high-value exam and result flows
- complex builder, review, and analytics UIs

That means many regressions are not purely backend bugs.

They are often:

- page wiring issues
- scope and redirect issues
- filter-state issues
- workflow continuity issues
- UI-state issues after backend changes

Playwright is the right technology here because it can validate:

- real browser behavior
- real route navigation
- real forms and tables
- role-based end-to-end journeys
- cross-page state continuity

---

## What Playwright Should Cover

Playwright should own:

- end-to-end role workflows
- critical release-path smoke tests
- scope and access behavior in the UI
- workflow regressions across portals
- selected visual and interaction stability checks

Playwright should not own:

- core scoring logic validation
- result calculation correctness
- low-level serializer or service behavior
- bulk backend logic without UI value

Those should remain in Django tests.

---

## Testing Pyramid Position

The recommended test stack is:

### Layer 1: Django tests

Use for:

- services
- validators
- scoring
- review logic
- result generation
- API contracts

### Layer 2: Type safety and build checks

Use for:

- frontend compile safety
- route safety
- type drift detection

### Layer 3: Playwright

Use for:

- true user workflows
- portal regressions
- multi-step UI journeys
- release-confidence smoke paths

The principle is:

`backend truth in Django, workflow truth in Playwright`

---

## Phased Rollout

Playwright should be delivered in five phases.

## Phase 1: Critical Smoke Journeys

Goal:

Prove that the most business-critical user paths still work after code changes.

Coverage:

- role login and landing behavior
- teacher question-bank import basics
- exam builder basic link and preview flow
- student attempt and submit flow
- teacher review and results publish flow

Outcome:

- fast release-confidence smoke suite

---

## Phase 2: Role And Scope Regression

Goal:

Protect role-based behavior and scoped data visibility.

Coverage:

- institute vs teacher route access
- student and parent surface boundaries
- scoped list filtering
- no cross-role leakage in core pages
- unauthorized redirect behavior

Outcome:

- safer multi-role regression coverage

---

## Phase 3: Workflow Deep Regression

Goal:

Cover the complicated workflows that break across multiple pages.

Coverage:

- bulk upload preview to finalize
- comprehension authoring flow
- review queue claim, review, recheck, moderation
- builder section flows
- exam lifecycle and publish readiness

Outcome:

- high-confidence workflow automation for operational teams

---

## Phase 4: Analytics And Filters

Goal:

Protect decision-support UIs from silent regressions.

Coverage:

- results workspace filters
- leaderboard and attempts navigation
- analysis drilldowns
- family-specific analytics rendering
- cross-exam portfolio views

Outcome:

- stable analytics UX and drilldown confidence

---

## Phase 5: Visual And Cross-Browser Hardening

Goal:

Catch layout regressions and browser-specific issues once the workflow suite is stable.

Coverage:

- key admin, institute, teacher, and student screens
- mobile-width checks for selected workflows
- Chromium first, then Firefox and WebKit for selected suites
- visual baselines for high-value pages only

Outcome:

- stronger UI stability and browser confidence

---

## Technology Strategy

Recommended stack:

- `Playwright` test runner
- `TypeScript`
- repo-local fixtures and helpers
- environment-based base URLs
- seeded test data where practical

Recommended integration:

- run smoke suite on every PR
- run broader suites on main or nightly
- keep visual baselines separate from smoke reliability

Do not begin with:

- huge full-regression suites
- unstable screenshot-heavy coverage everywhere
- browser matrix on every commit

Start small and reliable.

---

## Recommended Suite Structure

High-level structure:

- `smoke`
- `role-scope`
- `workflow`
- `analytics`
- `visual`

Suggested organization:

- shared auth helpers
- shared seeded-user fixtures
- stable selectors and test ids for key controls
- portal-specific helper abstractions

The platform should not depend on fragile CSS selectors for core tests.

---

## CI Strategy

### PR pipeline

Run:

- Playwright Phase 1 smoke tests
- only Chromium
- fail fast on core workflow breakage

### Main branch pipeline

Run:

- smoke tests
- selected workflow tests
- selected role-scope tests

### Nightly pipeline

Run:

- deeper workflow regression
- analytics checks
- broader browser coverage where stable

---

## Data Strategy

Playwright reliability depends heavily on data strategy.

Preferred order:

1. deterministic seeded data
2. role-based fixture accounts
3. idempotent setup helpers
4. minimal dependence on manually created environments

Avoid:

- tests that depend on random existing data
- tests that assume a portal is empty or unchanged
- brittle sequences that only pass after manual prep

---

## Exit Criteria By Phase

### Phase 1 is complete when:

- 5 to 8 core smoke journeys pass consistently
- failures clearly indicate workflow breakage
- tests are fast enough for PR use

### Phase 2 is complete when:

- role access and scoping regressions are covered in critical paths
- unauthorized and wrong-role behavior is intentional and tested

### Phase 3 is complete when:

- high-friction multi-step workflows are protected
- review operations and builder workflows have reliable browser coverage

### Phase 4 is complete when:

- analytics drilldowns and filters are protected against UI regressions

### Phase 5 is complete when:

- selected key surfaces have visual and cross-browser confidence

---

## Recommended Starting Point

The best first Playwright phase for this platform is:

`Phase 1: Critical Smoke Journeys`

Reason:

- fastest value
- lowest test-maintenance risk
- highest release confidence
- directly protects the business-critical portal flows

---

## High-Level Recommendation

Playwright should be treated as:

`the browser-level workflow safety net for the assessment platform`

In plain terms:

- Django protects logic
- TypeScript protects compile safety
- Playwright protects real user journeys

That combination is the right automation foundation for this architecture.
