# Playwright Phase 1 Implementation Tickets

## Purpose

This document converts the Playwright Phase 1 plan into execution-ready tickets.

Phase 1 should stay focused on:

- foundation setup
- stable testability support
- critical smoke journeys
- CI-ready browser regression safety

Related documents:

- [PLAYWRIGHT_AUTOMATION_PHASED_ROADMAP.md](./PLAYWRIGHT_AUTOMATION_PHASED_ROADMAP.md)
- [PLAYWRIGHT_PHASE_1_IMPLEMENTATION_PLAN.md](./PLAYWRIGHT_PHASE_1_IMPLEMENTATION_PLAN.md)
- [PLAYWRIGHT_TEST_BOUNDARY_AND_ENGINEERING_RULES.md](./PLAYWRIGHT_TEST_BOUNDARY_AND_ENGINEERING_RULES.md)

---

## Execution Principle

The correct order is:

1. foundation
2. shared helpers
3. seeded workflow support
4. base smoke tests
5. CI integration

Do not start by writing many end-to-end tests before the foundation is stable.

---

## Ticket Group A: Foundation Setup

## Ticket A1: Install Playwright in `edutech_web`

### Goal

Add Playwright as a first-class frontend automation dependency.

### Deliverables

- install `@playwright/test`
- add Playwright browsers
- confirm local execution works

### Acceptance criteria

- `npx playwright test --list` works
- project has a valid Playwright installation

---

## Ticket A2: Add base Playwright config

### Goal

Create a stable initial Playwright configuration for local and CI use.

### Deliverables

- `playwright.config.ts`
- base URL from env
- Chromium project
- retry and trace rules
- failure screenshots

### Acceptance criteria

- config runs locally without custom manual patching
- smoke suite can be filtered and executed cleanly

---

## Ticket A3: Add npm scripts for e2e runs

### Goal

Make Playwright execution simple and consistent.

### Deliverables

- `test:e2e`
- `test:e2e:smoke`
- `test:e2e:headed`

### Acceptance criteria

- scripts are documented and runnable

---

## Ticket Group B: Test Architecture

## Ticket B1: Create Playwright folder structure

### Goal

Create clean separation between smoke tests, helpers, fixtures, and auth utilities.

### Deliverables

- `tests/e2e/smoke`
- `tests/e2e/helpers`
- `tests/e2e/fixtures`
- `tests/e2e/auth`

### Acceptance criteria

- structure is present
- first tests do not mix setup, helpers, and assertions in one file

---

## Ticket B2: Create shared auth helper

### Goal

Avoid rewriting login logic across every smoke test.

### Deliverables

- reusable login helper by role
- support for institute, teacher, and student base sessions

### Acceptance criteria

- at least one smoke test uses shared login helper

---

## Ticket B3: Create shared navigation and assertion helpers

### Goal

Reduce repetition and improve test readability.

### Deliverables

- helper for visiting key routes
- helper for waiting on dashboard/workspace readiness
- helper for common success checks

### Acceptance criteria

- smoke suite avoids duplicated fragile navigation logic

---

## Ticket Group C: Testability Support

## Ticket C1: Audit critical pages for stable selectors

### Goal

Identify where Playwright needs stable hooks.

### Deliverables

- audit of key buttons, forms, filters, and panels
- list of missing `data-testid` or accessibility labels

### Acceptance criteria

- top Phase 1 pages are reviewed
- required gaps are documented

---

## Ticket C2: Add minimal testability hooks

### Goal

Add only the smallest product changes needed for stable smoke testing.

### Deliverables

- `data-testid` on critical actions
- stable empty-state markers
- accessible labels for key form fields and page sections

### Acceptance criteria

- no business logic changes are introduced
- selectors in smoke tests rely on stable hooks

---

## Ticket Group D: Test Data Support

## Ticket D1: Define Phase 1 fixture accounts and seed expectations

### Goal

Make smoke tests deterministic.

### Deliverables

- documented institute admin user
- documented teacher user
- documented student user
- documented minimal expected seeded entities

### Acceptance criteria

- test suite can describe which accounts and baseline data it expects

---

## Ticket D2: Add Playwright environment documentation

### Goal

Make local setup reproducible for any developer.

### Deliverables

- required env vars
- startup order for backend and frontend
- expected seed state

### Acceptance criteria

- another developer can run the smoke suite from docs alone

---

## Ticket Group E: Critical Smoke Tests

## Ticket E1: Institute login and results workspace smoke

### Goal

Protect institute portal entry and a high-value results route.

### Flow

- login as institute admin
- open institute dashboard or results page
- confirm workspace loads

### Acceptance criteria

- route loads without fatal error
- expected primary page markers are visible

---

## Ticket E2: Teacher question bank smoke

### Goal

Protect teacher authoring entry flow.

### Flow

- login as teacher
- open question bank
- open import or create-question entry point

### Acceptance criteria

- question-bank workspace loads
- import/create entry points are visible

---

## Ticket E3: Teacher exam builder smoke

### Goal

Protect exam and builder entry path.

### Flow

- login as teacher
- open exams list
- open one exam builder
- confirm builder core sections render

### Acceptance criteria

- builder route loads
- core builder controls are visible

---

## Ticket E4: Student attempt-start smoke

### Goal

Protect the beginning of the learner journey.

### Flow

- login as student
- open exams page
- open one available exam
- start attempt if eligible

### Acceptance criteria

- exam page loads
- start/resume action is visible and functional in known-safe fixture state

---

## Ticket E5: Student attempt workspace smoke

### Goal

Protect student runtime exam workspace rendering.

### Flow

- login as student
- enter active attempt
- confirm question area and submission controls render

### Acceptance criteria

- attempt workspace loads
- question and submit-related controls are visible

---

## Ticket E6: Teacher review queue smoke

### Goal

Protect review workflow entry.

### Flow

- login as teacher
- open review queue
- verify queue panel or valid empty state

### Acceptance criteria

- review page loads
- queue content or explicit empty state appears

---

## Ticket E7: Institute review queue smoke

### Goal

Protect moderation-side review access.

### Flow

- login as institute admin
- open institute review workspace
- verify queue panel or valid empty state

### Acceptance criteria

- institute review page loads
- moderation-side workspace renders correctly

---

## Ticket E8: Analytics analysis-page smoke

### Goal

Protect the main analytics workspace from fatal browser regressions.

### Flow

- login as teacher or institute admin
- open results analysis page
- verify hero, filters, and analysis blocks render

### Acceptance criteria

- analysis page loads
- no fatal render or hydration break
- key analytics blocks are visible

---

## Ticket Group F: CI Integration

## Ticket F1: Add CI workflow for smoke suite

### Goal

Run Playwright smoke tests automatically in CI.

### Deliverables

- CI workflow file
- frontend install
- browser install
- smoke command execution

### Acceptance criteria

- smoke suite runs on CI successfully

---

## Ticket F2: Add failure artifacts and reporting

### Goal

Make failures easy to debug.

### Deliverables

- Playwright report retention
- screenshot retention
- trace retention where appropriate

### Acceptance criteria

- CI failures produce usable artifacts

---

## Ticket Group G: Documentation And Handoff

## Ticket G1: Add local run guide

### Goal

Make Phase 1 sustainable for daily developer use.

### Deliverables

- commands to run locally
- expected app startup order
- fixture expectations

### Acceptance criteria

- local Playwright usage is documented clearly

---

## Ticket G2: Add troubleshooting guide

### Goal

Reduce friction when smoke tests fail.

### Deliverables

- common causes
- fixture problems
- selector issues
- environment mismatch notes

### Acceptance criteria

- developers can triage common failures quickly

---

## Recommended Implementation Order

Build in this order:

1. A1
2. A2
3. A3
4. B1
5. B2
6. B3
7. C1
8. C2
9. D1
10. D2
11. E1 to E8
12. F1
13. F2
14. G1
15. G2

Reason:

- infrastructure first
- reliability next
- smoke coverage after
- CI and docs after tests are real

---

## Definition Of Done

Phase 1 is done when:

- Playwright is installed and configured
- smoke suite exists and is stable
- base role workflows are covered
- tests use shared helpers
- selectors are stable
- CI runs the smoke suite
- local usage is documented

---

## High-Level Recommendation

The right way to deliver Playwright Phase 1 is:

`foundation first, then base smoke workflows, then CI`

This will give the platform the first real browser-level safety net without overbuilding too early.
