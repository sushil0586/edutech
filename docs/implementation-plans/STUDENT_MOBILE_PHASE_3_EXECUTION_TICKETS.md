# Student Mobile Phase 3 Execution Tickets

## Purpose

This document turns the student mobile phased coverage plan into execution-ready tickets for reliability and scale confidence.

Phase 3 should harden the mobile student suite so we can trust the results:

- cross-browser confidence
- fallback truthfulness
- timing coverage
- repeatability under reload and revisit

Related documents:

- [STUDENT_MOBILE_PHASED_COVERAGE_PLAN.md](./STUDENT_MOBILE_PHASED_COVERAGE_PLAN.md)
- [STUDENT_MOBILE_PHASE_1_EXECUTION_TICKETS.md](./STUDENT_MOBILE_PHASE_1_EXECUTION_TICKETS.md)
- [STUDENT_MOBILE_PHASE_2_EXECUTION_TICKETS.md](./STUDENT_MOBILE_PHASE_2_EXECUTION_TICKETS.md)
- [PLAYWRIGHT_AUTOMATION_PHASED_ROADMAP.md](./PLAYWRIGHT_AUTOMATION_PHASED_ROADMAP.md)

---

## Execution Principle

The safest order is:

1. confirm the mobile pack is stable in Chromium
2. add cross-browser smoke only for the most valuable student mobile paths
3. add route-fallback and empty-state truth checks
4. add timing / performance checks for the core student mobile routes
5. keep the pack small enough to stay maintainable

Do not expand to all student flows before the critical ones are hardened.

---

## Ticket Group A: Cross-Browser Strategy

## Ticket A1: Identify mobile flows worthy of cross-browser coverage

### Goal

Choose the student mobile flows that are valuable enough to justify Firefox and WebKit coverage.

### Deliverables

- list of candidate mobile flows
- chosen “must cover” subset
- rationale for excluding lower-value flows

### Acceptance criteria

- cross-browser scope is intentionally limited

---

## Ticket A2: Add mobile browser matrix scripting

### Goal

Create a repeatable browser matrix for the mobile pack.

### Deliverables

- Chromium, Firefox, and WebKit command shape
- environment notes for each browser engine
- repeatable local command or script entry

### Acceptance criteria

- the chosen mobile flows can run in more than one browser engine

---

## Ticket Group B: Fallback Truthfulness

## Ticket B1: Add missing-exam mobile fallback assertions

### Goal

Verify the student sees truthful fallback states when an exam route is unavailable on mobile.

### Deliverables

- route-gap assertions for missing exam detail
- route-gap assertions for unavailable exam list state
- recovery link visibility checks

### Acceptance criteria

- mobile fallback pages are tested as truthful product states

---

## Ticket B2: Add missing-attempt mobile fallback assertions

### Goal

Verify the student sees truthful fallback states when an attempt route is unavailable on mobile.

### Deliverables

- route-gap assertions for missing attempt summary
- route-gap assertions for missing attempt review
- recovery link visibility checks

### Acceptance criteria

- missing attempt behavior is covered on mobile

---

## Ticket Group C: Timing And Performance Checks

## Ticket C1: Add dashboard timing checks

### Goal

Measure how long the mobile dashboard needs to become usable.

### Deliverables

- route timing spec for `/app/dashboard`
- document the “usable” readiness marker

### Acceptance criteria

- dashboard timing is measured, not assumed

---

## Ticket C2: Add exams timing checks

### Goal

Measure how long the mobile exams route needs to become usable.

### Deliverables

- route timing spec for `/app/exams`
- document the readiness marker for exam list and detail entry

### Acceptance criteria

- exams timing is measured on mobile viewport

---

## Ticket C3: Add results and review timing checks

### Goal

Measure how long the mobile results and review surfaces take to settle.

### Deliverables

- route timing spec for `/app/results`
- route timing spec for `/app/attempts/:id/summary`
- route timing spec for `/app/attempts/:id/review`

### Acceptance criteria

- results and review timing is visible in the suite

---

## Ticket Group D: Repeatability And Regression Guard

## Ticket D1: Add reload and revisit regression checks

### Goal

Verify mobile routes remain truthful after reload and back-navigation.

### Deliverables

- reload-based checks for key student mobile routes
- revisit-based checks for results and review paths

### Acceptance criteria

- the student mobile pack can tolerate normal browser usage patterns

---

## Ticket D2: Add mobile pack summary and run notes

### Goal

Document exactly what Phase 3 does and does not prove.

### Deliverables

- updated run notes
- explicit release-confidence caveats

### Acceptance criteria

- Phase 3 remains honest about coverage boundaries

