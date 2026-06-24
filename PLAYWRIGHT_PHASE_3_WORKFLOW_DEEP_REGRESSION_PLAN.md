# Playwright Phase 3 Workflow Deep Regression Plan

## Purpose

This document defines the first implementation slice of Playwright Phase 3.

Phase 3 is where the suite moves from:

- route smoke confidence
- access-boundary confidence

into:

- real multi-step operational workflows
- preview, validation, and authoring continuity
- workflow state that can silently break even when pages still load

---

## Phase 3 Goal

Protect high-value workflows that span multiple UI states and backend interactions.

Execution principle:

`prefer workflow truth over page-load truth`

---

## First Slice

The first Phase 3 slice intentionally starts with teacher question-bank workflows.

Why:

- authoring is one of the highest-frequency operations in the portal
- comprehension and import flows are complex enough to regress silently
- these workflows already have dedicated surfaces and stable user-facing controls
- they do not depend on the full exam runtime being present

---

## Implemented In This Slice

### 1. Question-bank filter submission workflow

Coverage:

- teacher login
- question-bank workspace entry
- filter input update
- filter submission
- URL and query-state persistence
- filtered-state chip visibility

Why it matters:

- protects the server-driven search and filter continuity that operational users rely on every day
- catches regressions beyond simple workspace load

### 2. Native question detail disclosure workflow

Coverage:

- question-bank card expansion
- disclosure open and close state
- inline helper-detail visibility

Why it matters:

- protects a real multi-step browsing workflow that helps teachers inspect bank rows without leaving the inventory page

---

## Data Strategy

This slice uses two different data modes on purpose.

### Baseline workflow strategy

For question-bank workflows in this slice:

- use seeded teacher bank content
- prefer server-driven and native disclosure interactions first
- keep assertions on visible user state, URL continuity, and disclosure state

Reason:

- this gives stable workflow depth without depending on fragile demo-data assumptions
- it still protects operational continuity beyond simple page loads

---

## Known Blockers Discovered During Phase 3

Two richer workflows were investigated but are not yet reliable enough for always-on automation:

- question preview modal interaction in the teacher question bank
- question import preview interaction in the teacher import workspace

Observed behavior in the current environment:

- the static page renders correctly
- some client-heavy interactions do not complete in automation even though simpler native controls do

These should be treated as product hardening items, not hidden by brittle test workarounds.

Recommended next debugging track:

- inspect question-bank client hydration and event binding end to end
- add stable test ids on preview and import controls
- verify no silent client-side render mismatch is preventing those workflows from becoming interactive

---

## Next Phase 3 Candidates

Recommended next additions:

- teacher question preview modal once the current interactivity issue is resolved
- teacher question import preview once the current interactivity issue is resolved
- teacher comprehension authoring once seeded academic lanes are guaranteed in demo data
- teacher standalone question creation
- teacher comprehension CSV preview and finalize
- institute question-bank import preview
- exam builder section add/remove flow
- question link and rapid-attach flow
- review queue claim and submit flow

---

## Exit Criteria For This Phase 3 Foundation

This first Phase 3 foundation is considered healthy when:

- workflow tests pass locally with seeded demo users
- tests are independent from local files
- selectors rely on user-facing controls, not layout structure
- the suite stays reliable under the current single-worker account model
