# Frontend Teacher Route Tracing Runbook

Last updated: 2026-07-06

## Purpose

Use this runbook to capture repeatable frontend browser traces for the highest-value teacher operator routes:

- dashboard shell
- exams workspace
- exam detail
- question bank workspace
- results workspace
- live monitor
- results analysis
- reviews workspace

This is the teacher/operator companion to the student and institute Phase 3 tracing passes.

It complements:

- [FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md)
- [FRONTEND_STUDENT_ROUTE_TRACING_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FRONTEND_STUDENT_ROUTE_TRACING_RUNBOOK.md)
- [FRONTEND_INSTITUTE_ROUTE_TRACING_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FRONTEND_INSTITUTE_ROUTE_TRACING_RUNBOOK.md)

## Command

Run from:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
```

Trace the teacher starter bundle:

```bash
npm run test:e2e:trace:teacher-phase3
```

## Current Spec Set

- `tests/e2e/workflow/teacher-cross-browser-shell.spec.ts`
- `tests/e2e/workflow/teacher-exam-detail-workspace.spec.ts`
- `tests/e2e/workflow/teacher-results-workspace.spec.ts`
- `tests/e2e/workflow/teacher-reviews-workspace.spec.ts`
- `tests/e2e/workflow/question-bank-deep.spec.ts`
- `tests/e2e/workflow/teacher-results-live-workspace.spec.ts`
- `tests/e2e/workflow/teacher-results-analysis-workspace.spec.ts`

## What To Capture

- route name
- visible settled-state timing
- slowest route transition or filter apply step
- repeated or duplicate fetches
- whether a route looks backend-bound or frontend-bound
- whether always-visible teacher handoff links are generating unnecessary route churn

## Latest Local Execution

- Date: 2026-07-06
- Command: `npm run test:e2e:trace:teacher-phase3`
- Result: `7 passed (27.1s)`
- Covered specs:
  - `teacher-cross-browser-shell.spec.ts`
  - `teacher-exam-detail-workspace.spec.ts`
  - `teacher-results-workspace.spec.ts`
  - `teacher-reviews-workspace.spec.ts`
  - `question-bank-deep.spec.ts`
  - `teacher-results-live-workspace.spec.ts`
  - `teacher-results-analysis-workspace.spec.ts`

## First Local Trace Findings

- Date: 2026-07-06
- Environment: local Chromium trace pass
- High-level result:
  - the teacher starter bundle is now stable and passes cleanly
  - the heaviest browser churn is concentrated on results and reviews, not exam detail or live monitor
- Route-level fetch evidence:
  - `teacher-cross-browser-shell`: `123` fetch entries, `74` aborted requests
  - `teacher-exam-detail-workspace`: `100` fetch entries, `46` aborted requests
  - `teacher-results-workspace`: `629` fetch entries, `355` aborted requests
  - `teacher-reviews-workspace`: `419` fetch entries, `217` aborted requests
  - `question-bank-deep`: `225` fetch entries, `90` aborted requests
  - `teacher-results-live-workspace`: `96` fetch entries, `47` aborted requests
  - `teacher-results-analysis-workspace`: `267` fetch entries, `156` aborted requests
- Duplicate-fetch patterns observed:
  - repeated `_rsc` prefetches for adjacent teacher shell destinations such as `dashboard`, `exams`, `question-bank`, `results`, and `reviews`
  - repeated `_rsc` prefetches for results subroutes such as `attempts`, `leaderboard`, `live`, and `analysis`
  - repeated `_rsc` prefetches for teacher authoring handoffs such as `new exam` and `new question`
- Interpretation:
  - teacher results is the clearest next operator-side frontend hardening target
  - teacher reviews is the second-best target because it inherits the same dense workspace handoff behavior
  - teacher exam detail and live monitor are comparatively healthy on this local dataset
- Test stability note:
  - `question-bank-deep.spec.ts` was hardened to allow either a visible first question details accordion or a valid empty-state message, because the current local teacher dataset can legitimately return zero rows after filtering
- Recommended next action:
  - isolate teacher results and teacher reviews for the next local operator link-policy pass before touching lighter teacher routes

## First Teacher Link Policy Pass

- Date: 2026-07-06
- What changed:
  - moved teacher sidebar navigation onto the shared operator workspace link policy
  - moved teacher reviews workspace links onto the shared operator workspace link policy
- Validation:
  - `npm run test:e2e:trace:teacher-phase3` -> `7 passed (27.1s)`
- Observed trace direction:
  - `teacher-results-workspace`: fetch `629 -> 629`, aborted `355 -> 348`
  - `teacher-reviews-workspace`: fetch `419 -> 417`, aborted `217 -> 214`
  - `teacher-results-analysis-workspace`: fetch `267 -> 267`, aborted `156 -> 142`
  - `teacher-results-live-workspace`: fetch `96 -> 96`, aborted `47 -> 43`
- Interpretation:
  - the teacher operator link policy is safe
  - it reduces some aborted RSC churn, especially on analysis and live monitor
  - the largest teacher results-route fetch volume is still structurally high, so this is not enough to call teacher results hardened
- Best next move:
  - stop broad teacher link edits here unless a narrower teacher results subcluster is isolated
  - if we continue locally, focus only on the densest teacher results cards and action clusters
  - otherwise move to stage-density validation or a shared results-workspace structural pass

## Shared Workspace Shell Cleanup

- Date: 2026-07-06
- What changed:
  - moved teacher sidebar brand navigation to `/teacher/dashboard` instead of `/`
  - added explicit role-home brand destinations to the shared workspace sidebar for student, institute, admin, and parent shells
  - disabled eager brand-link prefetch on the shared workspace sidebar
- Validation:
  - `npm run test:e2e:trace:teacher-phase3` -> `7 passed (26.5s)`
- Observed trace direction:
  - `teacher-cross-browser-shell`: aborted `74 -> 72`, root-route `_rsc` count `10 -> 8`
  - `teacher-results-live-workspace`: aborted `43 -> 39`
  - `teacher-results-workspace`: essentially flat at `629` fetch entries with aborted requests `348 -> 356`
  - `teacher-reviews-workspace`: essentially flat at `417 -> 419` fetch entries and `214 -> 215` aborted requests
- Interpretation:
  - this is a safe shared shell cleanup and a better role-home navigation default
  - it helps a little on shell and live-monitor churn, but it does not materially change the main teacher results bottleneck
  - the largest remaining waste is still inside dense results/reviews route behavior rather than brand-link routing alone
- Best next move:
  - stop using local shell-level link cleanup as the main teacher optimization lever
  - move next either to stage-density validation or to a deeper shared results-workspace structural investigation
