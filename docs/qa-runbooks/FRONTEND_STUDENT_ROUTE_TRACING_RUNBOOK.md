# Frontend Student Route Tracing Runbook

Last updated: 2026-07-06

## Purpose

Use this runbook to capture repeatable frontend browser traces for the highest-value student routes after backend hardening:

- exam detail
- attempt runtime
- post-submit summary
- answer review

This runbook is the first practical entry point for Phase 3 frontend profiling.

It complements:

- [FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md)
- [BACKEND_OPERATIONAL_ROUTE_PROFILING_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/BACKEND_OPERATIONAL_ROUTE_PROFILING_RUNBOOK.md)

## What To Use

Use Playwright traces for:

- route load timing
- navigation sequencing
- obvious duplicate fetches
- long page waits caused by client rendering or backend dependencies
- checking whether frontend route timing improved after backend API hardening

Do not treat Playwright traces as high-scale load evidence. Use them for route-level browser truth, not concurrency proof.

## Commands

Run from:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
```

Trace the student exam detail page:

```bash
npm run test:e2e:trace:student-exam-detail
```

Trace the student attempt flow pages:

```bash
npm run test:e2e:trace:student-attempt-flow
```

Trace the full student Phase 3 starter set in one pass:

```bash
npm run test:e2e:trace:student-phase3
```

Focused timing probes:

```bash
npm run test:e2e:timing:student-results
npm run test:e2e:timing:student-summary
npm run test:e2e:timing:student-review
```

## Current Spec Set

The current Phase 3 starter traces use:

- `tests/e2e/workflow/student-exam-detail-workspace.spec.ts`
- `tests/e2e/workflow/student-attempt-runtime-workspace.spec.ts`
- `tests/e2e/workflow/student-post-submit-workspace.spec.ts`
- `tests/e2e/workflow/student-review-workspace.spec.ts`

These are the first browser routes to compare against the backend gains on:

- `student_exam_detail`
- `student_attempt_detail`
- `student_attempt_summary`
- `student_attempt_review`

## Where Artifacts Land

Playwright writes the useful local artifacts into:

- `edutech_web/test-results/`
- `edutech_web/playwright-report/`

Open the HTML report after a run:

```bash
npx playwright show-report
```

Open an individual trace:

```bash
npx playwright show-trace path/to/trace.zip
```

## What To Capture

For each route, record:

- route name
- Playwright spec name
- whether the trace came from local, stage, or pilot
- visible time to settled page state
- slowest navigation or action step
- duplicate or unexpected API requests
- whether route time appears backend-bound or frontend-bound

## Recommended Review Questions

- Did the page become interactive noticeably faster after backend API hardening?
- Is the slowest step waiting on one backend call or on multiple client-side render phases?
- Are we fetching data that the page never visibly uses?
- Are there duplicate requests after hydration or route transitions?
- Does the route feel CPU-bound, network-bound, or blocked by large payload rendering?

## Initial Student Route Order

Use this order when tracing:

1. student exam detail
2. student attempt runtime
3. student post-submit summary
4. student answer review

This order mirrors the highest-value learner journey:

1. discover exam
2. open exam detail
3. enter attempt
4. submit
5. inspect summary or review

## Evidence Notes

Current local backend evidence already shows:

- `student_exam_detail` improved materially after payload shaping
- `student_attempt_detail` is locally healthy
- `student_attempt_summary` is locally healthy
- `student_attempt_review` is locally healthy

So the next question is no longer only "Can backend query count drop more?"

The next question is:

- "Does the browser route now feel proportionally faster?"

## Suggested Logging Template

When recording a trace result, use:

```text
Date:
Environment:
Route:
Spec:
Trace file:
Observed settled state time:
Slowest step:
Backend-bound or frontend-bound:
Duplicate fetches:
Next action:
```

## Latest Local Execution

- Date: 2026-07-06
- Command: `npm run test:e2e:trace:student-phase3`
- Result: `4 passed (7.1s)`
- Covered specs:
  - `student-exam-detail-workspace.spec.ts`
  - `student-attempt-runtime-workspace.spec.ts`
  - `student-post-submit-workspace.spec.ts`
  - `student-review-workspace.spec.ts`
- Follow-up:
  - inspect generated traces for settled-state timing and duplicate fetches
  - extend the same pattern to institute and teacher route families

## First Local Trace Findings

- Date: 2026-07-06
- Environment: local Chromium trace pass
- High-level result:
  - the four student baseline specs are green and the route journeys feel locally healthy at test level
  - the dominant browser-side waste is not slow business API response on these traces
  - the dominant browser-side waste is repeated Next.js RSC prefetch traffic around student workspace navigation
- Route-level evidence:
  - `student-exam-detail-workspace`: `106` fetch entries in trace, with `79` aborted prefetch requests
  - `student-attempt-runtime-workspace`: `83` fetch entries in trace, with `60` aborted prefetch requests
  - `student-post-submit-workspace`: `199` fetch entries in trace, with `157` aborted prefetch requests
  - `student-review-workspace`: `232` fetch entries in trace, with `184` aborted prefetch requests
- Duplicate-fetch patterns observed:
  - repeated `_rsc` prefetches for shell routes such as `dashboard`, `results`, `attempts`, `analytics`, `wallet`, `settings`, and `subscriptions`
  - repeated `_rsc` prefetches for student attempts filter variants in the post-submit trace
  - repeated `_rsc` prefetches for linked follow-up routes in the review trace
- Interpretation:
  - backend hardening is helping, because the direct route documents are not the obvious local bottleneck
  - the next frontend optimization target should be prefetch discipline on dense student shells and result/review journeys
  - stage or denser data may still expose route-render cost later, but the first local waste signal is route-prefetch churn
- Recommended next action:
  - inspect student shell `Link` usage and route-prefetch defaults before moving to bundle trimming

## Follow-Up Hardening Attempt

- Date: 2026-07-06
- What changed:
  - disabled eager `prefetch` on workspace sidebar links
  - disabled eager `prefetch` on student topbar, footer, and support links
  - disabled eager `prefetch` on student exams, attempts, and results quick-filter chips
  - stabilized the student runtime trace spec so it waits for active or locked route state after navigation
- Validation:
  - `npm run test:e2e:trace:student-phase3` still passes after the link-behavior change
- Honest readout:
  - the traces remain noisy and do not yet show a clear enough fetch-count reduction to call this optimization wave complete
  - that means the remaining RSC churn is likely coming from broader dense-route link surfaces, repeated revisit patterns inside the tests, or framework-level route prefetch behavior beyond the first shell controls
- Next action:
  - audit student route cards and repeated action-link clusters on exams, attempts, summary, and review pages
  - if needed, introduce a stricter student-workspace link policy instead of patching individual surfaces one by one

## Shared Link Policy Pass

- Date: 2026-07-06
- What changed:
  - added a shared student workspace link wrapper that disables eager prefetch by default
  - moved dense student operational pages onto the shared wrapper:
    - exams
    - attempts
    - results
    - attempt summary
    - attempt review
- Validation:
  - `npm run test:e2e:trace:student-phase3` -> `4 passed (7.4s)`
- Observed trace direction:
  - `student-attempt-runtime-workspace` improved meaningfully on the latest pass:
    - fetch entries `108 -> 76`
    - aborted requests `86 -> 61`
  - the other student traces still show heavy repeated `_rsc` churn, especially on:
    - attempt filter variants in post-submit flow
    - repeated review/summary/results revisit patterns in review flow
    - always-visible follow-up destinations like weak areas, wallet, subscriptions, and settings
- Interpretation:
  - a page-level shared link policy is better than one-off patches and it already helped the runtime path
  - the remaining noise is now concentrated in revisit-heavy result/review journeys and dense action-card surfaces
- Next action:
  - audit repeated links rendered inside result, summary, and review cards
  - consider reducing repeated route variants exposed at once on dense pages, not just disabling prefetch

## Passive Link Experiment

- Date: 2026-07-06
- What changed:
  - added a passive student navigation link component for lower-priority follow-up actions
  - switched tertiary summary, review, and results follow-up actions away from app-router links and onto plain anchors
- Validation:
  - `npm run test:e2e:trace:student-phase3` -> `4 passed (7.5s)`
- Observed trace direction:
  - `student-post-submit-workspace` improved modestly:
    - fetch entries `207 -> 195`
  - the review and shell-adjacent churn did not materially collapse on the same pass
- Interpretation:
  - passive anchors can trim some route noise on follow-up flows
  - they are not enough by themselves to solve the remaining repeated `_rsc` traffic

## Dedicated Student Timing Probes

- Date: 2026-07-06
- Added focused timing probes:
  - `tests/e2e/workflow/student-results-timing.spec.ts`
  - `tests/e2e/workflow/student-summary-timing.spec.ts`
  - `tests/e2e/workflow/student-review-timing.spec.ts`
- Validation:
  - `npm run test:e2e:timing:student-results` -> `1 passed (2.4s)`
  - `npm run test:e2e:timing:student-summary` -> `1 passed (3.0s)`
  - `npm run test:e2e:timing:student-review` -> `1 passed (2.7s)`
- Measured timings:
  - `student-results`
    - `results-open`: `135ms`
    - `results-filter-apply`: `248ms`
    - `results-filter-reset`: `91ms`
    - `results-open-summary`: `137ms`
    - `results-open-review`: `203ms`
  - `student-summary`
    - `summary-open`: `173ms`
    - `summary-open-attempts`: `270ms`
    - `summary-return`: `157ms`
    - `summary-open-results`: `268ms`
    - `summary-open-review`: `96ms`
  - `student-review`
    - `review-open`: `177ms`
    - `review-open-results`: `183ms`
    - `review-return`: `249ms`
    - `review-open-summary`: `125ms`
- Interpretation:
  - the student post-submit route family is locally healthy in isolation
  - the earlier student trace noise was real browser churn, but these isolated timings do not support summary, review, or results as the strongest current local frontend bottlenecks
  - this means the next performance wave should prioritize modules with materially higher isolated timings instead of spending more local effort on student post-submit pages
- Best next move:
  - stop local micro-optimization work on student post-submit routes for now
  - use these probes as regression baselines and shift the next frontend pass toward modules with heavier isolated route timings
- Best next move:
  - stop broad student link experiments for now
  - either move to stage-density validation or start the same frontend profiling pass for institute and teacher routes
