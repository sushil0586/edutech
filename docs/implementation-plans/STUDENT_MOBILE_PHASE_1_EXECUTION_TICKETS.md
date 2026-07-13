# Student Mobile Phase 1 Execution Tickets

## Purpose

This document turns the student mobile phased coverage plan into implementation-ready tickets.

Phase 1 should stay narrowly focused on the core mobile exam runtime:

- start
- resume
- section switching
- save and revisit
- submit
- refresh continuity

Related documents:

- [STUDENT_MOBILE_PHASED_COVERAGE_PLAN.md](./STUDENT_MOBILE_PHASED_COVERAGE_PLAN.md)
- [STUDENT_MOBILE_ENHANCEMENT_PLAN.md](./STUDENT_MOBILE_ENHANCEMENT_PLAN.md)
- [PLAYWRIGHT_AUTOMATION_PHASED_ROADMAP.md](./PLAYWRIGHT_AUTOMATION_PHASED_ROADMAP.md)

---

## Execution Principle

The safest order is:

1. confirm the student mobile exam runtime data contract
2. add or tighten stable mobile selectors
3. implement start / resume / submit coverage
4. add section-switch and refresh-continuity checks
5. keep one shared helper path for mobile navigation and auth

Do not start with broad mobile CRUD expansion before the runtime path is stable.

---

## Ticket Group A: Runtime Contract Review

## Ticket A1: Audit mobile exam runtime entry states

### Goal

Confirm the exact mobile entry states we need to support for students.

### Deliverables

- list of reachable mobile exam entry states
- list of start / resume / locked / unavailable states
- note any route differences between desktop and mobile shells

### Acceptance criteria

- the exam runtime entry contract is documented before new tests are added

---

## Ticket A2: Audit mobile attempt persistence behavior

### Goal

Confirm which attempt states survive refresh, resume, and section switching.

### Deliverables

- refresh behavior notes
- attempt resume behavior notes
- section-switch persistence notes

### Acceptance criteria

- the tests can assert behavior that the product actually guarantees

---

## Ticket Group B: Selector And Helper Hardening

## Ticket B1: Add stable mobile runtime selectors where needed

### Goal

Remove selector brittleness from the student mobile runtime tests.

### Deliverables

- accessible labels or `data-testid` for key runtime controls
- stable hooks for:
  - start attempt
  - resume attempt
  - section switch
  - answer input
  - submit action

### Acceptance criteria

- mobile runtime tests do not rely on layout-specific selectors

---

## Ticket B2: Create shared student mobile runtime helper

### Goal

Avoid repeating mobile login and route recovery logic across several specs.

### Deliverables

- helper for student mobile auth and workspace readiness
- helper for mobile exam detail entry
- helper for retrying a route after transient shell loading issues

### Acceptance criteria

- at least two mobile specs use the shared helper

---

## Ticket Group C: Core Runtime Coverage

## Ticket C1: Add mobile attempt start coverage

### Goal

Verify a student can open an exam detail and start an attempt on mobile.

### Suggested spec

- `tests/e2e/workflow/student-mobile-attempt-runtime.spec.ts`

### Assertions

- exam detail opens on mobile
- start action is visible
- attempt shell loads
- initial question state is visible

### Acceptance criteria

- mobile start flow is covered by browser automation

---

## Ticket C2: Add mobile attempt resume coverage

### Goal

Verify an in-progress attempt can be resumed on mobile.

### Suggested spec

- `tests/e2e/workflow/student-mobile-attempt-resume.spec.ts`

### Assertions

- resumed attempt opens successfully
- existing answer state is preserved
- section and question context are restored

### Acceptance criteria

- resume flow is covered without relying on desktop-only behavior

---

## Ticket C3: Add mobile section switching coverage

### Goal

Verify section switching works on a small viewport.

### Suggested spec

- `tests/e2e/workflow/student-mobile-section-switching.spec.ts`

### Assertions

- section tabs or controls are visible
- switching sections updates the visible question context
- the current state remains truthful after switching

### Acceptance criteria

- multi-section exams are usable on mobile

---

## Ticket C4: Add mobile submit confirmation coverage

### Goal

Verify final submission has a clear mobile confirmation path.

### Suggested spec

- `tests/e2e/workflow/student-mobile-submit-confirmation.spec.ts`

### Assertions

- submit summary is visible
- warning or confirmation text is readable
- submission success state is visible
- result handoff is reachable after submit

### Acceptance criteria

- students can complete an exam confidently on mobile

---

## Ticket Group D: Continuity And Recovery

## Ticket D1: Add refresh continuity coverage

### Goal

Verify the mobile runtime behaves truthfully after a reload.

### Suggested spec

- `tests/e2e/workflow/student-mobile-refresh-continuity.spec.ts`

### Assertions

- refresh does not lose the user into an invalid state
- the page restores or explains its current status
- the runtime remains navigable after reload

### Acceptance criteria

- refresh behavior is covered for the student mobile runtime

---

## Ticket D2: Add attempt error recovery coverage

### Goal

Verify the student sees truthful fallback states when attempt data is missing or unavailable.

### Suggested spec

- `tests/e2e/workflow/student-mobile-attempt-fallback.spec.ts`

### Assertions

- missing attempt route shows the right fallback
- unavailable exam route shows the right fallback
- recovery links remain visible

### Acceptance criteria

- missing-data behavior is covered on mobile, not only desktop

---

## Ticket Group E: Validation And Packaging

## Ticket E1: Run the mobile runtime pack in Chromium

### Goal

Validate the new mobile runtime coverage as a pack.

### Deliverables

- run order for the new mobile runtime tests
- stable local command for the pack

### Acceptance criteria

- the mobile runtime pack is runnable from a single command

---

## Ticket E2: Add release-gate notes for student mobile coverage

### Goal

Document what the mobile suite does and does not prove.

### Deliverables

- updated coverage notes
- explicit list of missing Phase 2 and Phase 3 areas

### Acceptance criteria

- the mobile runtime suite can be used as a release-confidence signal without overstating coverage

