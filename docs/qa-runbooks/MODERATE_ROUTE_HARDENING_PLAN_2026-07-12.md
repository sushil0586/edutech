# Moderate Route Hardening Plan - 2026-07-12

## Purpose

This plan records how the last `Moderate` routes were closed and what optional expansion remains next.

Goal:

- record closure of the final first-wave moderate route
- close the biggest confidence gaps first
- avoid overlapping work by assigning one primary spec lane per route

## Current Moderate Routes

No first-wave moderate operator routes remain.

## Execution Principles

- Prefer one strong route-specific spec over multiple thin specs.
- Use API-audit specs for server-rendered, filter-driven pages.
- Use timing specs only where route performance is operationally important.
- Use mutable/finalize specs only when the route truly supports mutation.
- Keep disposable data cleanup inside the spec whenever a route needs seeded data.

## Route Plan

### Completed: `/institute/search`

- Status: `Completed`
- Implemented spec:
  - `tests/e2e/workflow/institute-search-api-audit.spec.ts`
- Outcome:
  - route now has browser coverage, workspace coverage, and API-audit parity
  - load/filter/group/reset flows stay browser-quiet

### Completed: `/institute/reports`

- Status: `Completed`
- Implemented specs:
  - `tests/e2e/workflow/institute-reports-timing.spec.ts`
  - `tests/e2e/workflow/institute-reports-api-audit.spec.ts`
- Outcome:
  - route now has workspace, browser-coverage, timing, and API-audit parity
  - load/filter/reset flows stay browser-quiet
  - route-open timing baselines are attached

### Completed: `/institute/academic-setup`

- Status: `Completed`
- Implemented spec:
  - `tests/e2e/workflow/institute-academic-setup-api-audit.spec.ts`
- Outcome:
  - route now has mutable lifecycle coverage plus API-audit parity
  - section switches stay browser-quiet and URL-driven

### Completed: `/institute/dashboard`

- Status: `Completed`
- Implemented spec:
  - `tests/e2e/workflow/institute-dashboard-browser-coverage.spec.ts`
- Outcome:
  - route now has workspace, shell, and browser-truthfulness coverage
  - focus and sort controls stay in sync with reset and quick filters
  - visible lane counts and people totals are asserted against the rendered UI
  - stale filter-state bug was fixed by remounting the GET form on URL-state changes

### Completed: `/teacher/dashboard`

- Status: `Completed`
- Implemented spec:
  - `tests/e2e/workflow/teacher-dashboard-browser-coverage.spec.ts`
- Outcome:
  - route now has workspace and browser-truthfulness coverage
  - filter state stays in sync with quick filters and reset
  - KPI and summary-count truthfulness is asserted

### Completed: `/teacher/exams`

- Status: `Completed`
- Implemented spec:
  - `tests/e2e/workflow/teacher-exams-browser-coverage.spec.ts`
- Outcome:
  - route now has workspace and browser-truthfulness coverage
  - filter state stays in sync with quick filters and reset
  - empty-state and summary-count truthfulness is asserted

### Completed: `/teacher/search`

- Status: `Completed`
- Implemented spec:
  - `tests/e2e/workflow/teacher-search-browser-coverage.spec.ts`
- Outcome:
  - route now has workspace and browser-truthfulness coverage
  - quick filters, no-result state, and summary-count truthfulness are asserted

### Completed: `/teacher/question-bank/comprehension/import`

- Status: `Completed`
- Implemented spec:
  - `tests/e2e/workflow/teacher-comprehension-import-finalize.mutable.spec.ts`
- Outcome:
  - route now has blocked-state, preview-validation, finalize, visibility, and cleanup depth
  - a disposable passage import is previewed through the browser, finalized, opened in teacher detail, and deleted in cleanup
  - the route now matches the create-preview-finalize-cleanup standard used for other import lanes

## Recommended Implementation Order

### Phase 1

1. Closed

## Definition Of Done

A moderate route should be upgraded to `Strong` only when:

- the new route-specific spec is implemented
- the spec passes reliably against the local environment
- disposable data is cleaned up where applicable
- route-status docs are updated to reflect the stronger depth
- the route’s remaining gap is no longer core behavior, only optional edge expansion

## Expected Outcome

With this plan completed:

- route surface stays `66/66` covered
- strong-route count now sits at `66/66`
- remaining confidence gaps become edge-case depth, not first-wave route risk
