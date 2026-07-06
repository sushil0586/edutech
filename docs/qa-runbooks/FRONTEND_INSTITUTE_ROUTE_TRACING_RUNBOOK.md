# Frontend Institute Route Tracing Runbook

Last updated: 2026-07-06

## Purpose

Use this runbook to capture repeatable frontend browser traces for the highest-value institute operator routes:

- dashboard
- exams workspace
- exam detail
- results workspace
- reviews workspace
- question bank workspace

This is the institute/operator companion to the student Phase 3 tracing pass.

It complements:

- [FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md)
- [FRONTEND_STUDENT_ROUTE_TRACING_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FRONTEND_STUDENT_ROUTE_TRACING_RUNBOOK.md)

## Command

Run from:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
```

Trace the institute starter bundle:

```bash
npm run test:e2e:trace:institute-phase3
```

## Current Spec Set

- `tests/e2e/workflow/institute-dashboard-workspace.spec.ts`
- `tests/e2e/workflow/institute-exams-workspace.spec.ts`
- `tests/e2e/workflow/institute-exam-detail-workspace.spec.ts`
- `tests/e2e/workflow/institute-results-workspace.spec.ts`
- `tests/e2e/workflow/institute-reviews-workspace.spec.ts`
- `tests/e2e/workflow/institute-question-bank-workspace.spec.ts`

## What To Capture

- route name
- visible settled-state timing
- slowest route transition or filter apply step
- repeated or duplicate fetches
- whether a route looks backend-bound or frontend-bound
- whether dense operator controls trigger unnecessary follow-up route work

## Latest Local Execution

- Date: 2026-07-06
- Command: `npm run test:e2e:trace:institute-phase3`
- Result: `6 passed (24.6s)`
- Covered specs:
  - `institute-dashboard-workspace.spec.ts`
  - `institute-exams-workspace.spec.ts`
  - `institute-exam-detail-workspace.spec.ts`
  - `institute-results-workspace.spec.ts`
  - `institute-reviews-workspace.spec.ts`
  - `institute-question-bank-workspace.spec.ts`

## First Local Trace Findings

- Date: 2026-07-06
- Environment: local Chromium trace pass
- High-level result:
  - the institute starter bundle is stable and passed cleanly on the first trace run
  - the heaviest browser churn is concentrated on operator list and results pages, not exam detail
- Route-level fetch evidence:
  - `institute-dashboard-workspace`: `234` fetch entries, `182` aborted requests
  - `institute-exams-workspace`: `667` fetch entries, `533` aborted requests
  - `institute-exam-detail-workspace`: `88` fetch entries, `72` aborted requests
  - `institute-results-workspace`: `571` fetch entries, `463` aborted requests
  - `institute-reviews-workspace`: `178` fetch entries, `139` aborted requests
  - `institute-question-bank-workspace`: `279` fetch entries, `201` aborted requests
- Duplicate-fetch patterns observed:
  - repeated `_rsc` prefetches for adjacent institute shell destinations such as `dashboard`, `exams`, `results`, `reviews`, `question-bank`, `people`, `academic-setup`, `reports`, `settings`, and `economy`
  - repeated `_rsc` prefetches for institute exams authoring handoffs such as `new`, `advanced`, and `preset-packs`
  - repeated `_rsc` prefetches for exam-scoped results and follow-up destinations inside the results workspace
- Interpretation:
  - institute exam detail is comparatively healthy
  - institute exams and results should be the first operator-side frontend hardening targets
- Recommended next action:
  - audit repeated action-link clusters and always-visible workspace handoff links on institute exams and results pages before touching lower-value routes

## First Operator Link Policy Pass

- Date: 2026-07-06
- What changed:
  - added a shared operator workspace link wrapper that disables eager prefetch by default
  - moved institute exams and the shared results workspace onto that operator link policy
- Validation:
  - `npm run test:e2e:trace:institute-phase3` -> `6 passed (25.3s)`
- Observed trace direction:
  - `institute-results-workspace`: fetch `571 -> 569`, aborted `463 -> 456`
  - `institute-dashboard-workspace`: fetch `234 -> 234`, aborted `182 -> 173`
  - `institute-exams-workspace`: fetch `667 -> 665`, aborted `533 -> 531`
- Interpretation:
  - the operator link policy is safe
  - it helps a little, but not enough to call exams or results hardened
  - institute shell and dense route structure are still doing most of the browser work
- Best next move:
  - stop broad local institute link edits here
  - move next to teacher profiling or stage-density validation unless a very specific institute route cluster is isolated
