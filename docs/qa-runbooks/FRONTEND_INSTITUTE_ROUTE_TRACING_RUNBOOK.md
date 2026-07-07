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

Capture focused institute-results route timings:

```bash
npm run test:e2e:timing:institute-results
```

Capture focused institute shell transition timings:

```bash
npm run test:e2e:timing:institute-shell
```

Capture focused institute question-bank timings:

```bash
npm run test:e2e:timing:institute-question-bank
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

## Dedicated Timing Probe

- Script:
  - `npm run test:e2e:timing:institute-results`
- Spec:
  - `tests/e2e/workflow/institute-results-timing.spec.ts`
- Scope:
  - overview initial render
  - overview filter apply
  - overview reset
  - leaderboard transition
  - overview return
  - live monitor transition
  - analysis transition
- Why this exists:
  - the broad institute Phase 3 trace bundle is useful for route-churn patterns
  - it is not a clean timing-only signal for the institute results hotspot because that workflow intentionally touches many adjacent operator routes

## Dedicated Shell Timing Probe

- Script:
  - `npm run test:e2e:timing:institute-shell`
- Spec:
  - `tests/e2e/workflow/institute-shell-timing.spec.ts`
- Scope:
  - dashboard initial render
  - sidebar transitions to exams, results, reviews, question bank, and people
  - return transition back to dashboard
- Why this exists:
  - it isolates operator shell and sidebar navigation timing from the deeper page-specific workflows
  - it helps distinguish shared chrome cost from results-workspace-specific server-render cost

## Dedicated Question Bank Timing Probe

- Script:
  - `npm run test:e2e:timing:institute-question-bank`
- Spec:
  - `tests/e2e/workflow/institute-question-bank-timing.spec.ts`
- Scope:
  - question bank initial render
  - filter search apply
  - empty-search recovery
  - filter reset
  - import route transition
  - create-question route transition
  - create-question dependent selector enablement
- Why this exists:
  - it isolates the institute question-bank workspace from broader operator workflow churn
  - it helps determine whether question-bank list and authoring entry routes are the next real institute-side frontend bottleneck

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

## Shared Results Workspace Structural Pass

- Date: 2026-07-06
- What changed:
  - reduced repeated shared results-workspace action surfaces and filter-link matrices
  - removed duplicated builder handoffs where the same destination was already present in the hero lane
  - converted the question-risk board filter row into a compact GET form
  - folded student question filtering into the existing search form instead of keeping a separate chip matrix
  - removed duplicate live-monitor lane handoff buttons where richer attempt inspection actions already existed higher in the same view
- Validation:
  - `npm run test:e2e:trace:institute-phase3` -> `6 passed (33.4s)`
- Interpretation:
  - the shared results workspace remains behavior-safe after the structural cleanup pass
  - the institute results route continues to be the most important operator-side verification target for this shared workspace
  - the next step should be trace-artifact comparison and route-noise measurement, not another blind link-wrapper sweep

## Shared Results Workspace Trace Comparison

- Date: 2026-07-06
- Environment: local Chromium trace artifact comparison after the shared workspace structural pass
- Compared routes:
  - `institute-results-workspace`: fetch `571 -> 572`, aborted `463 -> 466`
  - `institute-reviews-workspace`: fetch `178 -> 160`, aborted `139 -> 130`
- Interpretation:
  - the shared workspace pass did not materially improve the main institute results route
  - institute reviews improved modestly, which suggests some shared-route cleanup is helping but not enough to move the top hotspot
  - the biggest remaining operator-side frontend bottleneck is still institute results, not teacher results anymore
- Best next move:
  - stop treating shared results cleanup as proven enough for institute results
  - shift the next frontend hardening pass toward institute-results-specific churn or back to institute exams, whichever trace inspection isolates more clearly

## Institute Exams Quick-Filter Reduction

- Date: 2026-07-06
- What changed:
  - reduced the institute exams quick-filter chip row from a broad shortcut matrix down to the highest-value shortcuts only
  - kept the full exam filter form intact, so teacher, status, sort, group, and page-size control still live in one primary place
- Validation:
  - `npm run test:e2e:trace:institute-phase3` -> `6 passed (27.3s)`
- Trace direction:
  - `institute-exams-workspace`: fetch `667 -> 660`, aborted `533 -> 543`
  - `institute-results-workspace`: fetch `571 -> 571`, aborted `463 -> 454`
  - `institute-reviews-workspace`: fetch `178 -> 175`, aborted `139 -> 140`
- Interpretation:
  - the institute exams quick-filter reduction is behavior-safe
  - it only reduced fetch volume slightly on the exams route and did not improve aborted route churn
  - institute results is still the clearest remaining institute-side browser bottleneck
- Best next move:
  - stop spending more local passes on cosmetic exams quick-filter trimming alone
  - isolate institute-results-specific churn next, because that route continues to dominate the institute trace family

## Dedicated Institute Results Timing Baseline

- Date: 2026-07-06
- Command: `npm run test:e2e:timing:institute-results`
- Result: `1 passed (3.5s)`
- Focused timing output:
  - `overview-initial`: `324ms`
  - `overview-filter-apply`: `277ms`
  - `overview-reset`: `143ms`
  - `leaderboard-open`: `366ms`
  - `overview-return`: `267ms`
  - `live-open`: `246ms`
  - `analysis-open`: `259ms`
- Interpretation:
  - the institute results route family is locally fast enough in isolation after the shared view-scoped fetch reduction
  - the broad Phase 3 churn seen in trace bundles now looks more like workspace-wide route noise than a slow institute-results server render by itself
  - the slowest focused transition in this first probe is `leaderboard-open`, not the overview render
- Best next move:
  - shift the next institute frontend pass toward shared shell or navigation-route noise reduction
  - keep this timing probe as the before/after check for any future shared results workspace change

## Dedicated Institute Shell Timing Baseline

- Date: 2026-07-06
- Command: `npm run test:e2e:timing:institute-shell`
- Result: `1 passed (2.7s)`
- Focused timing output:
  - `dashboard-initial`: `70ms`
  - `sidebar-exams`: `182ms`
  - `sidebar-results`: `268ms`
  - `sidebar-reviews`: `214ms`
  - `sidebar-question-bank`: `375ms`
  - `sidebar-people`: `154ms`
  - `sidebar-dashboard-return`: `103ms`
- Interpretation:
  - the shared institute shell is also locally healthy in isolation
  - the slowest visible shell transition in this first probe is `sidebar-question-bank`, with `sidebar-results` second
  - this lowers confidence that shared sidebar chrome itself is the main source of the broad Phase 3 route-churn totals
- Best next move:
  - stop assuming the remaining frontend issue is general shell latency
  - use focused timing probes plus trace inspection to target the next specific heavy workspace, likely institute question bank or broader workflow-level route hopping rather than institute results overview itself

## Dedicated Institute Question Bank Timing Baseline

- Date: 2026-07-06
- Command: `npm run test:e2e:timing:institute-question-bank`
- Result: `1 passed (3.2s)`
- Focused timing output:
  - `question-bank-initial`: `459ms`
  - `question-bank-search-apply`: `278ms`
  - `question-bank-empty-search`: `283ms`
  - `question-bank-reset`: `79ms`
  - `question-bank-import-open`: `135ms`
  - `question-bank-create-open`: `433ms`
  - `question-create-program-select`: `25ms`
- Interpretation:
  - the institute question-bank workspace is a stronger isolated frontend hotspot than institute results or the shared shell
  - the heaviest transitions in this first probe are the initial list render and the create-question entry route
  - this makes question bank the best next institute-side optimization target before returning to broader workflow-level route-hopping analysis
- Best next move:
  - profile or simplify the initial institute question-bank list render and the create-question entry path next
  - only return to broad operator trace totals after this heavier isolated workspace has a first optimization pass

## Institute Question Bank List Render Reduction

- Date: 2026-07-06
- What changed:
  - removed four extra quality-summary list queries from the initial institute question-bank render
  - replaced those summary cards with counts derived from the visible page slice instead of separate backend fetches
  - removed the comprehension-preview fetch from the main list route so the initial workspace load stays focused on the core question inventory
- Validation:
  - `cd edutech_web && npx eslint 'src/app/(institute)/institute/question-bank/page.tsx'`
  - `npm run test:e2e:timing:institute-question-bank` -> `1 passed (3.3s)`
- Focused timing output after the pass:
  - `question-bank-initial`: `498ms`
  - `question-bank-search-apply`: `291ms`
  - `question-bank-empty-search`: `281ms`
  - `question-bank-reset`: `92ms`
  - `question-bank-import-open`: `125ms`
  - `question-bank-create-open`: `540ms`
  - `question-create-program-select`: `16ms`
- Interpretation:
  - the list route remains one of the heavier institute pages, but the cleaner rerun keeps it in the same general band instead of showing a structural slowdown
  - the create-question entry path now stands out more clearly than the list route as the slowest question-bank transition
  - the next question-bank optimization pass should move from the list page to `/institute/question-bank/new`
- Best next move:
  - inspect the create-question page bootstrap and trim what it loads before the editor becomes interactive
  - keep the dedicated question-bank timing probe as the before/after check for both the list route and create route

## Institute Question Bank Create Bootstrap Reduction

- Date: 2026-07-06
- What changed:
  - trimmed the institute create-question page bootstrap down to the core first-paint data
  - moved institute-scoped subject, topic, and comprehension-set lookups behind a small internal lookup endpoint so they load on demand after program and subject selection
  - kept duplicate-question mode hydrated by loading the scoped lookups only when an existing question already defines the academic lane
- Validation:
  - `cd edutech_web && npx eslint 'src/app/(institute)/institute/question-bank/new/page.tsx' 'src/components/ui/teacher-question-editor.tsx' 'src/app/api/institute/question-bank/create-lookups/route.ts'`
  - `npm run test:e2e:timing:institute-question-bank` -> `1 passed (3.1s)`
- Focused timing output after the pass:
  - `question-bank-initial`: `473ms`
  - `question-bank-search-apply`: `294ms`
  - `question-bank-empty-search`: `284ms`
  - `question-bank-reset`: `90ms`
  - `question-bank-import-open`: `124ms`
  - `question-bank-create-open`: `428ms`
  - `question-create-program-select`: `19ms`
- Interpretation:
  - the create-question entry path improved materially from the earlier `540ms` timing to about `428ms`
  - the institute question-bank workspace is still one of the heavier isolated routes, but the slowest transition is now narrower and better understood
  - the next question-bank pass should focus only if we want to push the editor bootstrap lower still; otherwise this workspace is now materially better characterized and partially hardened
- Best next move:
  - keep this timing probe as the regression check for future question-bank editor work
  - if another institute-side frontend pass is needed, decide between deeper editor bootstrap trimming and moving to the next heavy operator workspace

## Institute Question Bank Metadata Cache Trial

- Date: 2026-07-06
- What was tested:
  - tried adding a short-lived shared metadata cache for the option-catalog and question-type-registry fetches used by the create-question bootstrap path
- Validation:
  - `cd edutech_web && npx eslint src/lib/api/teacher-builder.ts 'src/app/(institute)/institute/question-bank/new/page.tsx'`
  - `cd edutech_web && npm run test:e2e:timing:institute-question-bank`
  - `cd edutech_web && npm run test:e2e:timing:teacher-question-bank`
- Focused timing output during the trial:
  - institute `question-bank-create-open`: `687ms`, then `738ms`
  - teacher `question-bank-create-open`: `588ms`
- Interpretation:
  - this trial did not improve the measured create-route bootstrap on local repeat runs
  - the extra cache complexity was not justified by the observed timings, so the experiment was removed
- Best next move:
  - do not revisit this metadata-cache idea unless stage evidence later shows repeated identical bootstrap fetches dominating the route
  - keep future institute question-bank work focused on real payload reduction, server-component structure, or editor route decomposition
