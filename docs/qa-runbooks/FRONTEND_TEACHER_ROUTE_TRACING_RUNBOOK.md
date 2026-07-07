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

Focused timing probes:

```bash
npm run test:e2e:timing:teacher-results
npm run test:e2e:timing:teacher-question-bank
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

## Shared Results Workspace Structural Pass

- Date: 2026-07-06
- What changed:
  - reduced repeated shared results-workspace action surfaces and filter-link matrices
  - removed duplicated builder handoffs where the same destination was already present in the hero lane
  - converted the question-risk board filter row into a compact GET form
  - folded student question filtering into the existing search form instead of keeping a separate chip matrix
  - removed duplicate live-monitor lane handoff buttons where richer attempt inspection actions already existed higher in the same view
- Validation:
  - `npm run test:e2e:trace:teacher-phase3` -> `7 passed (38.5s)`
- Interpretation:
  - the shared results workspace remains behavior-safe after the structural cleanup pass
  - this pass meaningfully reduced repeated route surfaces in the highest-noise teacher route family
  - the next step should be trace-artifact comparison, not more blind local deletion

## Shared Results Workspace Trace Comparison

- Date: 2026-07-06
- Environment: local Chromium trace artifact comparison after the shared workspace structural pass
- Compared routes:
  - `teacher-results-workspace`: fetch `629 -> 458`, aborted `355 -> 368`
  - `teacher-results-analysis-workspace`: fetch `267 -> 204`, aborted `156 -> 164`
  - `teacher-results-live-workspace`: fetch `96 -> 67`, aborted `47 -> 40`
- Interpretation:
  - the teacher results route saw a large fetch-volume reduction, which means the structural pass removed real browser churn
  - aborted `_rsc` traffic is still high on the main teacher results route, so the route family is improved but not yet clean
  - analysis and live monitor also improved enough to confirm the shared workspace pass had real effect beyond code cleanliness
- Trace note:
  - the latest `teacher-reviews-workspace` trace zip did not contain a raw `0-trace.network` file, so that route still needs a follow-up artifact comparison on the next pass
- Best next move:
  - keep teacher results inside the shared-results workspace as a valid optimization target
  - do not keep deleting links blindly; target the remaining dense institute-results churn next because that route stayed essentially flat

## Dedicated Teacher Timing Probes

- Date: 2026-07-06
- Added focused timing probes:
  - `tests/e2e/workflow/teacher-results-timing.spec.ts`
  - `tests/e2e/workflow/teacher-question-bank-timing.spec.ts`
- Validation:
  - `npm run test:e2e:timing:teacher-results` -> `1 passed (5.5s)`
  - `npm run test:e2e:timing:teacher-question-bank` -> `1 passed (3.6s)`
- Measured timings:
  - `teacher-results`
    - `overview-initial`: `594ms`
    - `overview-filter-apply`: `1095ms`
    - `overview-reset`: `38ms`
    - `leaderboard-open`: `863ms`
    - `overview-return`: `456ms`
    - `live-open`: `438ms`
    - `analysis-open`: `485ms`
  - `teacher-question-bank`
    - `question-bank-initial`: `305ms`
    - `question-bank-search-apply`: `386ms`
    - `question-bank-empty-search`: `320ms`
    - `question-bank-reset`: `74ms`
    - `question-bank-import-open`: `508ms`
    - `question-bank-create-open`: `606ms`
    - `question-create-program-select`: `26ms`
- Interpretation:
  - the broad teacher trace bundle was directionally right, but the isolated numbers sharpen the real priorities
  - teacher results is still the main shared-workspace hotspot, especially on filter apply and leaderboard transitions
  - teacher question bank also has a concrete create/import bootstrap issue, with `create question` currently the slowest isolated transition in that workspace
- Best next move:
  - harden the teacher question-bank create/import bootstrap before another broad teacher trace sweep
  - keep teacher results in the next shared-results structural pass because the isolated filter and leaderboard timings are still elevated

## Teacher Question-Bank Create Bootstrap Reduction

- Date: 2026-07-06
- What changed:
  - added `tests/e2e/workflow/teacher-question-bank-timing.spec.ts` as the dedicated teacher question-bank measurement loop
  - reduced the teacher create-question bootstrap so the page no longer loads full subjects, topics, and passages before first paint
  - added `/api/teacher/question-bank/create-lookups` so subject, topic, and passage options can hydrate on demand after program and subject selection
- Validation:
  - `npx eslint 'src/app/(teacher)/teacher/question-bank/new/page.tsx' 'src/app/api/teacher/question-bank/create-lookups/route.ts'`
  - `npm run test:e2e:timing:teacher-question-bank` -> `1 passed (3.4s)`
- Measured timing direction:
  - `question-bank-create-open`: `606ms -> 351ms`
  - `question-bank-import-open`: `508ms -> 409ms`
  - `question-create-program-select`: `26ms -> 22ms`
- Interpretation:
  - the teacher create-question route had the same architectural bootstrap gap as institute, and the on-demand lookup pattern removes a meaningful chunk of first-open cost
  - teacher question bank is now healthier, which makes teacher results the clearer remaining shared-workspace hotspot
- Best next move:
  - keep teacher results and shared results-workspace transitions as the next focused frontend hardening target
  - return to teacher question-bank only if import-entitlement/template loading remains elevated in a later isolated pass

## Teacher Question-Bank Import Parallel Fetch Cleanup

- Date: 2026-07-06
- What changed:
  - parallelized the teacher import-route entitlement lookup and CSV template fetch so first paint no longer waits for those two server reads serially
- Validation:
  - `npx eslint 'src/app/(teacher)/teacher/question-bank/import/page.tsx'`
  - `npm run test:e2e:timing:teacher-question-bank` -> `1 passed (3.4s)`
  - `npm run test:e2e:timing:teacher-question-bank` -> `1 passed (2.8s)`
- Measured timing direction:
  - `question-bank-import-open`: `468ms`, then `415ms`
  - `question-bank-create-open`: `454ms`, then `494ms`
- Interpretation:
  - the import-route cleanup is behavior-safe and keeps the route on a slightly cleaner server-read path
  - local timing did not show a strong enough improvement to treat this as a major hardening win
  - teacher question-bank no longer looks like the best place for additional local micro-passes right now
- Best next move:
  - keep this cleanup, but do not spend more local cycles on teacher import unless stage timings later show the same route still elevated
  - move the next performance pass to a module with a stronger remaining measured signal

## Teacher Results Overview Leaderboard Trim

- Date: 2026-07-06
- What changed:
  - reduced overview-route leaderboard fetching in the shared results workspace so overview now requests only the minimum leaderboard payload needed for readiness and badge signals
  - kept full leaderboard fetching intact for the dedicated leaderboard and analysis views
- Validation:
  - `npx eslint src/features/results-workspace/page.tsx`
  - `npm run test:e2e:timing:teacher-results` -> `1 passed (4.7s)`
- Timing note:
  - lint still reports two pre-existing warnings in `results-workspace/page.tsx` for unused `attemptTone` and `config`
- Measured timing direction:
  - `overview-filter-apply`: `1095ms -> 551ms`
  - `overview-initial`: `594ms -> 590ms`
  - `leaderboard-open`: `863ms -> 861ms`
- Interpretation:
  - the slow teacher overview filter path was paying for leaderboard work it did not need at full page size
  - this is a meaningful shared-results win because it cuts the heaviest isolated teacher overview transition roughly in half without changing leaderboard or analysis behavior
  - the remaining teacher-results hotspot is now more clearly concentrated on entering the dedicated leaderboard view
- Best next move:
  - inspect the dedicated leaderboard route and publication-checklist composition next
  - keep broad results-workspace changes narrow and measurement-led, because the overview path is now materially healthier

## Teacher Results Subview Sidebar Compaction

- Date: 2026-07-06
- What changed:
  - compacted the shared exam sidebar on non-overview result views so leaderboard, live, attempts, and analysis keep exam context and quick switching without rendering the full overview browsing surface
  - kept the full exam filter and browsing sidebar on overview, where it is most useful
- Validation:
  - `npx eslint src/features/results-workspace/page.tsx`
  - `npm run test:e2e:timing:teacher-results` -> `1 passed (4.5s)`
- Timing note:
  - lint now reports one remaining pre-existing warning in `results-workspace/page.tsx` for unused `attemptTone`
- Measured timing direction:
  - `leaderboard-open`: `867ms -> 858ms`
  - `analysis-open`: `614ms -> 473ms`
  - `overview-initial`: `567ms -> 524ms`
- Interpretation:
  - the dedicated leaderboard body itself was not the main issue, but the shared subview chrome was contributing avoidable route work
  - the leaderboard transition only improved modestly, which means the next residual hotspot is still inside broader shared results route composition rather than the backend leaderboard API
  - analysis benefited more clearly from the lighter subview shell than leaderboard did
- Best next move:
  - keep future shared-results work focused on route-level chrome and navigation composition, not backend leaderboard tuning
  - revisit the top-of-page results navigation and shared context blocks next if we want another teacher-results pass

## Teacher Results Top Shell Compaction

- Date: 2026-07-06
- What changed:
  - kept the full outcome-control hero and five-card summary grid on overview only
  - switched non-overview routes onto a lighter exam-context hero and compact lane switcher
- Validation:
  - `npx eslint src/features/results-workspace/page.tsx`
  - `npm run test:e2e:timing:teacher-results` -> `1 passed (5.1s)`
- Timing note:
  - lint still reports one pre-existing warning in `results-workspace/page.tsx` for unused `attemptTone`
- Measured timing direction:
  - `leaderboard-open`: `858ms -> 872ms`
  - `analysis-open`: `473ms -> 479ms`
  - `overview-filter-apply`: `592ms -> 574ms`
- Interpretation:
  - this confirms the remaining teacher leaderboard cost is not meaningfully solved by trimming the top shared shell alone
  - the route family is cleaner structurally, but the isolated leaderboard transition is now effectively plateaued on local frontend-only cuts
- Best next move:
  - stop spending more local micro-passes on teacher leaderboard shell compaction
  - pivot the next optimization wave either to student result/review routes or to a different shared workspace with stronger remaining timing signal

## Teacher Results Subview Exam-Payload Trial

- Date: 2026-07-06
- What was tested:
  - tried moving non-overview results subviews onto the paginated teacher exam list API so leaderboard, live, attempts, and analysis would stop loading the full exam payload
- Validation:
  - `npx eslint src/features/results-workspace/page.tsx`
  - `npm run test:e2e:timing:teacher-results`
- Focused timing output during the trial:
  - `overview-initial`: `726ms`
  - `overview-filter-apply`: `598ms`
  - `leaderboard-open`: `874ms`
  - `live-open`: `465ms`
  - `analysis-open`: `510ms`
- Interpretation:
  - this subview payload swap did not improve the measured teacher results transitions
  - the extra branching complexity was not justified by the observed timings, so the experiment was removed
- Best next move:
  - do not revisit this subview exam-list swap unless stage traces later show the full exam payload dominating these routes
  - keep future teacher results work focused on stronger route-shape evidence rather than speculative list-source changes
