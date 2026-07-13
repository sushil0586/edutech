# Student Mobile Phase 2 Execution Tickets

## Purpose

This document turns the student mobile phased coverage plan into execution-ready tickets for the student operations surfaces.

Phase 2 should cover the parts of the mobile app students use outside the live exam runtime:

- profile
- wallet
- subscription
- notifications
- analytics
- results revisit

Related documents:

- [STUDENT_MOBILE_PHASED_COVERAGE_PLAN.md](./STUDENT_MOBILE_PHASED_COVERAGE_PLAN.md)
- [STUDENT_MOBILE_PHASE_1_EXECUTION_TICKETS.md](./STUDENT_MOBILE_PHASE_1_EXECUTION_TICKETS.md)
- [STUDENT_MOBILE_ENHANCEMENT_PLAN.md](./STUDENT_MOBILE_ENHANCEMENT_PLAN.md)

---

## Execution Principle

The safest order is:

1. confirm which student operation screens already exist
2. add stable selectors for the account and operations surfaces
3. cover profile and wallet/subscription reads first
4. cover notifications and analytics next
5. expand to edit / CRUD-like flows only after the read surfaces are stable

Do not jump straight into broad CRUD assertions if the read-only surfaces are still incomplete.

---

## Ticket Group A: Surface Inventory

## Ticket A1: Audit student mobile profile surface

### Goal

Confirm the mobile profile route and its visible controls.

### Deliverables

- route inventory for profile
- list of visible profile read and edit controls
- note any missing labels or selectors

### Acceptance criteria

- profile surface scope is documented before tests are added

---

## Ticket A2: Audit student mobile wallet and subscription surfaces

### Goal

Confirm what students can currently see about wallet and subscriptions on mobile.

### Deliverables

- route inventory for wallet and subscription
- list of balance, usage, plan, and entitlement markers
- note any missing labels or selectors

### Acceptance criteria

- wallet and subscription visibility expectations are documented

---

## Ticket A3: Audit student mobile analytics and notifications surfaces

### Goal

Confirm what analytics and notifications already expose on mobile.

### Deliverables

- analytics route inventory
- notifications route inventory
- summary of mobile-only gaps

### Acceptance criteria

- the suite knows which operations routes are present and stable enough to test

---

## Ticket Group B: Selector And Helper Hardening

## Ticket B1: Add stable selectors for profile and account actions

### Goal

Make profile and account action selectors stable on mobile.

### Deliverables

- accessible labels or `data-testid` for:
  - profile fields
  - save action
  - wallet summary
  - subscription summary

### Acceptance criteria

- the tests do not depend on layout-specific controls

---

## Ticket B2: Create shared student mobile operations helper

### Goal

Reduce repeated login and route verification logic across operations tests.

### Deliverables

- helper for mobile student auth and workspace readiness
- helper for opening the profile / wallet / analytics / notifications routes
- helper for asserting common page shells

### Acceptance criteria

- at least two operations specs use the shared helper

---

## Ticket Group C: Core Operations Coverage

## Ticket C1: Add profile view coverage

### Goal

Verify the student profile page is readable and complete on mobile.

### Suggested spec

- `tests/e2e/workflow/student-mobile-profile.spec.ts`

### Assertions

- profile route opens
- identity summary is visible
- key account fields are readable
- edit entry point is visible if supported

### Acceptance criteria

- students can inspect their profile on mobile

---

## Ticket C2: Add wallet and subscription visibility coverage

### Goal

Verify the student can understand their wallet and plan state on mobile.

### Suggested spec

- `tests/e2e/workflow/student-mobile-wallet-subscription.spec.ts`

### Assertions

- wallet route or panel opens
- balance / entitlement summary is visible
- plan name or quota is visible when applicable
- lock / access status is truthful

### Acceptance criteria

- students can understand their access state on mobile

---

## Ticket C3: Add notifications coverage

### Goal

Verify notification and utility surfaces remain reachable on mobile.

### Suggested spec

- `tests/e2e/workflow/student-mobile-notifications.spec.ts`

### Assertions

- notifications route opens
- empty and populated states are truthful
- primary next actions are visible

### Acceptance criteria

- the student can see or confirm notification state on mobile

---

## Ticket C4: Add analytics drilldown coverage

### Goal

Verify analytics drilldown and comparison remain usable on a mobile viewport.

### Suggested spec

- `tests/e2e/workflow/student-mobile-analytics-drilldown.spec.ts`

### Assertions

- analytics route opens
- a summary card or trend panel is visible
- drilldown or comparison action is reachable

### Acceptance criteria

- analytics are usable enough for mobile decision support

---

## Ticket Group D: Results Revisit Coverage

## Ticket D1: Expand mobile results revisit checks

### Goal

Verify the student can revisit results and review paths from the mobile results flow.

### Suggested spec

- extend `tests/e2e/workflow/student-mobile-results-review-workflow.spec.ts`

### Assertions

- summary to review handoff is readable
- review state is stable on small screens
- back navigation returns to results cleanly

### Acceptance criteria

- mobile results revisit behavior is covered end to end

---

## Ticket Group E: Validation And Packaging

## Ticket E1: Add a student mobile operations pack

### Goal

Create a single command that runs the student mobile operations checks.

### Deliverables

- package script for the operations pack
- documented run order

### Acceptance criteria

- the student mobile operations suite is runnable as a unit

---

## Ticket E2: Add release-gate notes for Phase 2

### Goal

Document what Phase 2 proves and what remains out of scope.

### Deliverables

- updated coverage notes
- explicit callout that runtime exam execution stays in Phase 1

### Acceptance criteria

- Phase 2 can be used as a reliable confidence signal without overstating runtime coverage

