# Full Stack Performance Optimization Plan

Last updated: 2026-07-06

Current working phase: `Phase 3 - Frontend Baseline And Route Profiling`

## Purpose

This document is the master phase-wise plan for end-to-end product performance optimization across:

- backend read paths
- backend write and mutation paths
- frontend route and render performance
- API payload efficiency
- cache strategy and invalidation correctness
- load, concurrency, and stage realism
- observability and regression prevention

Use this plan to answer:

1. What performance work is already complete?
2. What is still pending?
3. What is the next phase?
4. How do we update status after each phase?

Related documents:

- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
- [BACKEND_ANALYTICS_PERFORMANCE_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/BACKEND_ANALYTICS_PERFORMANCE_RUNBOOK.md)
- [BACKEND_OPERATIONAL_ROUTE_PROFILING_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/BACKEND_OPERATIONAL_ROUTE_PROFILING_RUNBOOK.md)
- [FRONTEND_STUDENT_ROUTE_TRACING_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FRONTEND_STUDENT_ROUTE_TRACING_RUNBOOK.md)
- [FRONTEND_INSTITUTE_ROUTE_TRACING_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FRONTEND_INSTITUTE_ROUTE_TRACING_RUNBOOK.md)
- [FRONTEND_TEACHER_ROUTE_TRACING_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FRONTEND_TEACHER_ROUTE_TRACING_RUNBOOK.md)
- [STAGE_PERFORMANCE_MONITORING_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_PERFORMANCE_MONITORING_CHECKLIST.md)

---

## Status Model

Use these phase states:

- `not started`
- `in progress`
- `partially complete`
- `complete`
- `validated on stage`

Use these task states inside each phase:

- `done`
- `pending`
- `blocked`
- `deferred`

Use these evidence tags when updating progress:

- `code`
- `local benchmark`
- `browser test`
- `stage benchmark`
- `load test`
- `dashboard`

---

## Execution Rules

- Update this document at the end of every completed phase and every meaningful sub-phase.
- Do not mark a phase `complete` until evidence is captured in the phase log.
- If a phase is partially done across only a few modules, keep the phase as `partially complete` and update the module coverage table instead of overstating completion.
- Use the same route/page names across backend, frontend, and load-testing sections so evidence stays comparable.
- When a hotspot is deferred, record the reason explicitly:
  - low business priority
  - blocked on architecture
  - blocked on stage data
  - blocked on frontend dependency
  - correctness risk too high for current wave

---

## Current Snapshot

### Overall performance status

- Baseline and coverage inventory: `complete`
- Backend high-value read-path hardening: `partially complete`
- Backend mutation and concurrency hardening: `not started`
- Frontend route and render optimization: `in progress`
- Stage and load validation: `not started`
- Observability and regression guardrails: `partially complete`

### What is already done

- Analytics service-level profiling exists.
- Operational route-level profiling exists.
- Route-level SQL sampling exists.
- Operational route profiler now includes student discovery/history and economy admin/support read labels.
- First local measurements now exist for the student and economy read-path expansion.
- `admin_question_bank_packages` now has a measured first optimization pass with a strong query-count reduction.
- `student_available_exams` now has a measured first optimization pass with a strong query-count and latency reduction.
- `admin_question_bank_entitlements` now has a measured first optimization pass with a strong query-count and latency reduction.
- `student_attempt_list` now has a measured first optimization pass with a clear query-count and latency reduction.
- `student_wallet`, `student_subscriptions`, and `institute_scoped_question_bank_entitlements` now have fresh local baselines showing they are already healthy on current demo data.
- `question_bank_questions_compact` and `question_bank_passages_list` now have fresh local baselines showing the local question-bank list routes are already healthy on current demo data.
- `student_exam_detail` and `student_attempt_detail` now have fresh local baselines, and `student_exam_detail` has a measured first query-reduction pass.
- `student_exam_detail` now has a measured payload-shaping pass that materially reduced both query count and response size.
- `student_attempt_summary` and `student_attempt_review` now have direct local baselines showing they are already healthy on current demo data.
- Frontend student-route trace commands and a dedicated tracing runbook now exist for the first Phase 3 browser baseline pass.
- The first local Chromium student Phase 3 trace pass now executes cleanly across exam detail, attempt runtime, post-submit summary, and review routes.
- The first local student trace findings now point to dense Next.js RSC prefetch churn as the clearest frontend optimization target before bundle work.
- A first link-prefetch hardening pass is in place, but trace evidence still shows that student-route RSC churn is not solved yet.
- A shared student workspace link policy now exists, and the runtime route improved, but result/review browser churn is still open.
- The first institute Chromium trace baseline now exists, and it shows exams and results as the heaviest operator-side browser churn targets.
- A first institute operator link-policy pass is green, but the browser-churn reduction is modest and does not justify more blind local link edits.
- A reusable teacher route tracing runbook now exists for the first teacher/operator Phase 3 browser baseline pass.
- The first teacher Chromium trace baseline now exists, and it shows results and reviews as the heaviest teacher-side browser churn targets.
- The teacher deep question-bank trace spec now tolerates legitimate empty filtered datasets, so the profiling bundle stays green without assuming seeded question rows.
- A first teacher operator link-policy pass is green, but the browser-churn reduction is still modest and does not justify more blind teacher link edits.
- A shared workspace-shell brand-link cleanup is green and improves role-home navigation defaults, but it does not materially reduce the main teacher results bottleneck.
- Draft backend API route inventory now exists by module.
- Draft frontend route inventory now exists by role/module.
- Draft module classification by read/write/concurrency profile now exists.
- Draft journey-to-browser-scenario mapping now exists.
- Exact benchmark and scenario command mapping now exists for priority journeys.
- Major backend read-path hotspots have been reduced locally:
  - analytics services
  - institute dashboard summary
  - teacher exam list
  - teacher results summary
  - review queue summary
  - master question library
  - notification list
  - notification unread count
  - parent dashboard and parent alerts
- Shared-library, exam-policy, and notification metadata caches now have explicit invalidation paths.
- Several backend performance runbooks already exist and are usable.

### What is not yet done

- Stage-validated route-to-SLA coverage for every critical workflow
- Stage-like frontend performance baseline
- Backend write-path profiling and optimization program
- Load and concurrency testing for exam-day style flows
- Production-like data validation
- Frontend bundle, hydration, and interaction-performance hardening
- Long-term regression budgets and automated checks

---

## Phase Summary

| Phase | Title | Status | Primary outcome | Done now | Still pending |
| --- | --- | --- | --- | --- | --- |
| 0 | Baseline And Coverage Inventory | `complete` | One unified inventory of modules, routes, pages, and test scenarios | master plan doc created, module view exists, backend route inventory exists, frontend page inventory exists, classification exists, journey mapping exists, benchmark linkage exists | later phases must now replace draft budgets with measured evidence |
| 1 | Backend Read Path Optimization | `partially complete` | Critical read APIs profiled and locally hardened | analytics, dashboard, teacher exams, shared library, notifications, parent, `student_available_exams`, `student_attempt_list`, first economy-admin package pass, first economy-admin entitlement pass | student runtime/results detail reads, remaining economy/admin heavy reads, question-bank local reads, payload-size tracking |
| 2 | Backend Write Path Optimization | `pending` | Heavy mutations measured and optimized | analytics result critical section shortened | exam lifecycle mutations, runtime writes, bulk finalize hotspots |
| 3 | Frontend Baseline And Route Profiling | `in progress` | Page-level load, render, and interaction bottlenecks identified | functional browser suites exist, student route trace commands exist, student tracing runbook exists | route timings, Web Vitals, waterfalls, bundle baselines |
| 4 | Frontend Optimization | `pending` | Route, component, and bundle performance improved | no formal optimization wave completed yet | route splits, client-fetch cleanup, virtualization, hydration/render improvements |
| 5 | Payload And API Contract Optimization | `pending` | Over-fetching and oversized payloads reduced | some backend list paths already trimmed | systematic payload audit and compact contracts |
| 6 | Concurrency And Load Testing | `pending` | Stage/load behavior proven under realistic traffic | profiler groundwork exists, early k6 direction exists | realistic stage scenarios, thresholds, saturation proof |
| 7 | Observability And Regression Guardrails | `partially complete` | Metrics, budgets, and repeatable checks in place | local profilers and runbooks exist | dashboards, route budgets, scheduled smoke checks, frontend telemetry |
| 8 | Final Stage Validation And Signoff | `pending` | Full-stack performance confidence upgraded with stage proof | none yet | populated stage proof across backend, frontend, and concurrency |

---

## Phase 0: Baseline And Coverage Inventory

### Objective

Build a single coverage map of all major product modules, routes, pages, and workflows so performance work is not driven by memory or ad hoc routing.

### Already done

- We have partial route inventories through backend profiling commands.
- We have confidence documents that identify major business modules.
- We have browser workflow catalogs that can be reused as performance-journey inputs.
- We have a first-pass module coverage table in this document.
- We now have draft backend API and frontend route inventories in this document.

### Pending

- Build a single module-by-module performance coverage matrix.
- Tag every module as:
  - read-heavy
  - write-heavy
  - mixed
  - high-concurrency sensitive
  - low-priority
- Inventory critical API endpoints by area:
  - institute
  - teacher
  - student
  - admin
  - parent
  - economy
  - reports
- Inventory critical frontend routes by area.
- Define target P95/P99 latency goals for key route families.
- Define target frontend budgets:
  - route load
  - interaction latency
  - bundle size
  - long tasks

### Sub-phase checklist

| Step | Status | What it covers |
| --- | --- | --- |
| 0.1 | `done` | create one master performance plan |
| 0.2 | `done` | list major modules and mark initial coverage status |
| 0.3 | `done` | inventory critical backend routes by module |
| 0.4 | `done` | inventory critical frontend routes by module |
| 0.5 | `done` | define top user journeys and concurrency-sensitive flows |
| 0.6 | `done` | define performance targets and budgets |

### Deliverables

- One performance coverage matrix doc
- API route inventory
- frontend page inventory
- top user-journey list
- performance SLA target table

### Exit criteria

- No major module is unclassified.
- Every critical workflow has an owner route/page list.
- Every later phase can point back to this inventory.

### Backend API inventory

| Module | API prefix or family | Critical route families | Performance profile | Current coverage |
| --- | --- | --- | --- | --- |
| Auth and identity | `/api/v1/auth/*`, `/api/v1/accounts/*` | login, refresh, me, register, profile completion, login management | mixed, low-concurrency except login spikes | `pending` |
| Student exam discovery | `/api/v1/student/exams/*` | available exams, resolve key, exam detail | read-heavy, high-concurrency sensitive | `pending` |
| Student attempts | `/api/v1/attempts/*` and `/api/v1/student/attempts/` | start attempt, attempt detail, save answer, submit, summary, review | mixed, highest concurrency sensitivity | `pending` |
| Student results and insights | `/api/v1/student/results/`, `/api/v1/student/insights/*`, `/api/v1/results/*` | result list, analytics summaries, question analytics, topic performance, performance summaries | read-heavy with some heavy post-submit writes | `partial` |
| Institute dashboard and onboarding | `/api/v1/institute/dashboard/summary/`, `/api/v1/institutes/*`, `/api/v1/academics/presets/*` | dashboard summary, onboarding profiles/runs, academic preset apply | mixed | `partial` |
| Teacher exams and insights | `/api/v1/teacher/exams/`, `/api/v1/teacher/results/summary/`, `/api/v1/teacher/insights/summary/` | exam list, result summary, teacher insight summary | read-heavy | `done` |
| Teacher and institute question bank | `/api/v1/teacher/questions/*`, `/api/v1/question-bank/questions/*`, `/api/v1/question-bank/passages/*`, `/api/v1/question-bank/options/*`, `/api/v1/question-bank/tags/*`, `/api/v1/question-bank/attachments/*` | local bank list/detail/create/update, bulk import, comprehension flows, tag actions | mixed, operator-heavy | `partial` |
| Shared library | `/api/v1/question-bank/master-library/*` | master library list/detail, access resolution, bulk linking | read-heavy with bulk link writes | `done` |
| Exams and builder | `/api/v1/exams/*` | exam CRUD, advanced templates, preset packs, sections, questions, publish logs | mixed, write-heavy on create/publish | `partial` |
| Reviews and moderation | `/api/v1/attempts/review-tasks/*` | review queue, assignment, scoring, moderation transitions | mixed | `partial` |
| Parents | `/api/v1/parent/*` | children, dashboard, progress, alerts, mark-all-read, preferences | read-heavy | `done` |
| Notifications | `/api/v1/notifications/*` | list, unread count, mark read, mark all read | read-heavy with small writes | `done` |
| Academics catalog | `/api/v1/academics/*` | families, years, programs, cohorts, subjects, topics, option catalog, preset preview/apply | read-heavy with admin/institute writes | `pending` |
| Student and teacher management | `/api/v1/students/*`, `/api/v1/teachers/*`, `/api/v1/accounts/* management` | people lists, assignments, create login, reset password, enable/disable | mixed | `pending` |
| Economy student surfaces | `/api/v1/economy/wallet/*`, `ledger`, `rewards`, `orders`, `subscriptions`, `spend-stars` | wallet, ledger, unlocks, order create, subscriptions | mixed | `pending` |
| Economy admin surfaces | `/api/v1/economy/admin/*` | catalog overview, package lists, entitlements, usage ledger, plans, policies, grants, student support views | read-heavy and operator-dense with targeted writes | `partial` |

### Frontend route inventory

| Role or shell | Route families | Critical pages | Performance profile | Current coverage |
| --- | --- | --- | --- | --- |
| Marketing and auth | `/`, `/{slug}`, `/login`, `/register`, `/signup`, `/complete-profile` | landing, content pages, auth entry, profile completion | moderate first-load sensitivity | `pending` |
| Student shell | `/app/*` | dashboard, exams, exam detail, enter-key, attempts, attempt runtime, summary, review, results, analytics, wallet, notifications | highest real-user sensitivity, mobile-sensitive, concurrency-sensitive | `pending` |
| Parent shell | `/parent/*` | dashboard, children, progress, alerts, search, settings | read-heavy | `pending` |
| Teacher dashboard and search | `/teacher/dashboard`, `/teacher/search` | dashboard, global search | read-heavy | `pending` |
| Teacher exams | `/teacher/exams/*` | list, new, advanced, detail, builder | mixed | `pending` |
| Teacher question bank | `/teacher/question-bank/*` | list, create, detail, import, comprehension authoring | mixed, dense client UI | `pending` |
| Teacher results and reviews | `/teacher/results/*`, `/teacher/reviews` | results overview, attempts, leaderboard, live, analysis, reviews | read-heavy and chart-heavy | `pending` |
| Institute dashboard and search | `/institute/dashboard`, `/institute/search` | dashboard, global search | read-heavy | `pending` |
| Institute exams | `/institute/exams/*` | list, new, preset packs, advanced, detail, builder | mixed | `pending` |
| Institute question bank | `/institute/question-bank/*` | local list, linked list, library linker, create, detail, import, comprehension | mixed, dense client UI | `pending` |
| Institute results and reviews | `/institute/results/*`, `/institute/reviews` | results overview, attempts, leaderboard, live, analysis, review queue | read-heavy and chart-heavy | `pending` |
| Institute people and settings | `/institute/people`, `/institute/teacher-assignments`, `/institute/academic-setup`, `/institute/economy`, `/institute/security`, `/institute/settings`, `/institute/reports` | people, assignments, academic setup, economy, security, reports | mixed, operator-dense | `pending` |
| Admin shell | `/admin/*` | dashboard, institutes, people, academic setup, economy, security, settings, reports, exams, search | read-heavy, operator-dense, some heavy tables | `pending` |

### Priority user journeys

| Journey | Backend families | Frontend surfaces | Concurrency sensitivity | Status |
| --- | --- | --- | --- | --- |
| Student discovers and starts exam | student exams, attempts, economy unlock checks | `/app/exams`, `/app/exams/[examId]`, `/app/attempts/[attemptId]` | `high` | `identified` |
| Student saves answers and submits | attempts, answers, results generation, analytics invalidation | `/app/attempts/[attemptId]`, `/app/attempts/[attemptId]/summary` | `highest` | `identified` |
| Institute creates, configures, and publishes exam | exams, question bank, economy access policy, academics | `/institute/exams/*` | `medium` | `identified` |
| Teacher reviews descriptive answers | review tasks, attempts, results publish | `/teacher/reviews`, `/teacher/results/*` | `medium` | `identified` |
| Institute monitors live exam and results | dashboard, results live, leaderboard, analysis | `/institute/dashboard`, `/institute/results/live`, `/institute/results/analysis` | `high` | `identified` |
| Shared-library browse and bulk link | master library, bulk link, package entitlements | `/institute/question-bank/library-linker`, `/institute/question-bank/linked` | `medium` | `identified` |
| Admin manages economy and entitlements | economy admin routes, institutes, reports | `/admin/economy`, `/admin/institutes`, `/admin/reports` | `low` to `medium` | `identified` |
| Parent checks progress and alerts | parent dashboard, alerts, progress | `/parent/dashboard`, `/parent/alerts`, `/parent/progress` | `low` | `identified` |

### Draft SLA and budget targets

| Surface | Target | Draft budget |
| --- | --- | --- |
| Critical backend reads | P95 under `300ms`, P99 under `600ms` on stage-like data | dashboard, lists, summaries, exam discovery |
| Critical backend writes | P95 under `500ms`, P99 under `1200ms` excluding intentional async follow-up work | attempt save, submit, publish, review score, bulk operator writes |
| Student runtime save/submit | visible confirmation under `400ms` for save, under `1200ms` for submit acknowledgement | protect perceived exam continuity first |
| Frontend operator route load | first useful render under `2.5s` on common desktop broadband | exams, question bank, results, economy pages |
| Frontend student route load | first useful render under `2.0s` on realistic mobile-web conditions | dashboard, exams, attempt summary, results |
| Route transition latency | under `700ms` for common in-app transitions | list to detail, results tabs, analytics drill-down |
| JS bundle budget | keep critical route initial JS under `350KB` compressed where practical | tighten densest operator and student routes first |
| Long tasks | avoid tasks over `200ms` on critical interactive pages | runtime, results analysis, dense tables |

### Module classification matrix

| Module | Primary profile | Read intensity | Write intensity | Concurrency sensitivity | Priority |
| --- | --- | --- | --- | --- | --- |
| Auth and identity | `mixed` | `medium` | `medium` | `medium` | `medium` |
| Student exam discovery | `read-heavy` | `high` | `low` | `high` | `critical` |
| Student attempts runtime | `mixed` | `medium` | `highest` | `highest` | `critical` |
| Student results and analytics | `read-heavy` | `high` | `medium` | `high` | `critical` |
| Institute dashboard and onboarding | `mixed` | `high` | `medium` | `medium` | `high` |
| Teacher exams workspace | `mixed` | `high` | `medium` | `medium` | `high` |
| Exams builder and publish lifecycle | `write-heavy` | `medium` | `high` | `medium` | `critical` |
| Teacher and institute question bank local | `mixed` | `high` | `high` | `medium` | `high` |
| Shared library and linker | `read-heavy` | `high` | `medium` | `medium` | `high` |
| Reviews and moderation | `mixed` | `medium` | `high` | `medium` | `high` |
| Notifications | `read-heavy` | `high` | `low` | `medium` | `medium` |
| Parent surfaces | `read-heavy` | `medium` | `low` | `low` | `medium` |
| Academics catalog and preset setup | `mixed` | `medium` | `medium` | `low` | `medium` |
| Student and teacher management | `mixed` | `medium` | `medium` | `low` | `medium` |
| Economy student surfaces | `mixed` | `medium` | `medium` | `medium` | `high` |
| Economy admin and institute support | `mixed` | `high` | `medium` | `low` | `high` |
| Admin shell and reporting | `read-heavy` | `high` | `low` | `low` | `medium` |

### Journey to evidence mapping

| Journey | Existing evidence | Primary files or suites | Next performance use |
| --- | --- | --- | --- |
| Student discovers and starts exam | `browser test` | `edutech_web/tests/e2e/workflow/student-exam-detail-workspace.spec.ts`, `edutech_web/tests/e2e/workflow/student-question-bank-entitlement-visibility-contract.mutable.spec.ts` | use for frontend route timings and backend student-availability profiling |
| Student saves answers and submits | `browser test` | `edutech_web/tests/e2e/workflow/institute-results-mutable.spec.ts`, family release mutable suites under `edutech_web/tests/e2e/workflow/` | use for write-path profiling, submit concurrency, and runtime route baselines |
| Institute creates, configures, and publishes exam | `browser test` | `edutech_web/tests/e2e/EXAM_CREATION_SCENARIO_CATALOG.md`, institute/admin family release mutable suites | use for exam create/publish mutation profiling and frontend builder timing baselines |
| Teacher reviews descriptive answers | `browser test` | `edutech_web/tests/e2e/workflow/institute-results-descriptive-multi-role.mutable.spec.ts`, teacher review mutable suites | use for review queue read/write profiling |
| Institute monitors live exam and results | `browser test` | `edutech_web/tests/e2e/workflow/institute-results-live-populated.mutable.spec.ts`, `edutech_web/tests/e2e/workflow/institute-results-analysis-populated.mutable.spec.ts` | use for results/live frontend baseline and backend summary route profiling |
| Shared-library browse and bulk link | `browser test` | `edutech_web/tests/e2e/workflow/institute-question-bank-shared-library-workspace.spec.ts`, `edutech_web/tests/e2e/workflow/institute-question-bank-shared-library-link.mutable.spec.ts`, `edutech_web/tests/e2e/workflow/institute-shared-library-builder-flow.mutable.spec.ts` | use for shared-library frontend route timings and bulk-link mutation profiling |
| Admin manages economy and entitlements | `browser test` | `edutech_web/tests/e2e/ECONOMY_QUESTION_BANK_SUBSCRIPTION_SPEC_MATRIX.md`, `edutech_web/tests/e2e/workflow/admin-economy-workspace.spec.ts`, `edutech_web/tests/e2e/workflow/admin-economy-mutable.spec.ts` | use for admin economy route baselines and entitlement-write profiling |
| Parent checks progress and alerts | `browser test` | parent workspace suites under `edutech_web/tests/e2e/workflow/` plus existing parent backend tests | use for frontend parent baselines and route-latency guardrails |

### Journey command map

| Journey | Backend measurement command | Frontend or browser command | Load or concurrency command |
| --- | --- | --- | --- |
| Student discovers and starts exam | `cd edutech_backend && ./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label student_available_exams` once added, or use targeted auth/accounts route profiling in the next Phase 1 pass | `cd edutech_web && npx playwright test tests/e2e/workflow/student-exam-detail-workspace.spec.ts --project=chromium` | `k6 run performance/k6/student-login-and-exam-discovery.js` with `K6_BASE_URL` and `K6_USER_CREDENTIALS_JSON` from [STAGE_PERFORMANCE_TEST_COMMANDS.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_PERFORMANCE_TEST_COMMANDS.md) |
| Student saves answers and submits | targeted write-path profiler to be added in Phase 2 for `start`, `save-answer`, and `submit`; use analytics profiler after submit-side changes: `cd edutech_backend && ./.venv/bin/python manage.py profile_analytics_services --repeat 5` | `cd edutech_web && npx playwright test tests/e2e/workflow/institute-results-mutable.spec.ts --project=chromium` | `k6 run performance/k6/student-exam-runtime.js` with `K6_SAVE_COUNT` and `K6_SUBMIT_AT_END=true` |
| Institute creates, configures, and publishes exam | Phase 2 targeted mutation profiling on `/api/v1/exams/*`; current read-side follow-up can use `cd edutech_backend && ./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label teacher_exam_list` | `cd edutech_web && npx playwright test tests/e2e/workflow/institute-family-release-happy-path.mutable.spec.ts tests/e2e/workflow/institute-family-release-state.mutable.spec.ts --project=chromium` | reuse Playwright for correctness under light concurrency first; no dedicated k6 authoring script exists yet |
| Teacher reviews descriptive answers | current read-side follow-up through `cd edutech_backend && ./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label review_queue_summary` | `cd edutech_web && npx playwright test tests/e2e/workflow/institute-results-descriptive-multi-role.mutable.spec.ts --project=chromium` | no dedicated load script yet; add review-queue write scenario in Phase 6 after Phase 2 profiling |
| Institute monitors live exam and results | `cd edutech_backend && ./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label institute_dashboard_summary` plus analytics profiler for heavy insight routes | `cd edutech_web && npx playwright test tests/e2e/workflow/institute-results-live-populated.mutable.spec.ts tests/e2e/workflow/institute-results-analysis-populated.mutable.spec.ts --project=chromium` | after student runtime load runs, observe dashboard/results latency on stage during the same event window |
| Shared-library browse and bulk link | `cd edutech_backend && ./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label master_question_library --include-query-sql` | `cd edutech_web && npm run test:e2e:mutable:shared-library-workflow` | add bulk-link write pressure in Phase 2 or Phase 6 after mutation profiling |
| Admin manages economy and entitlements | economy admin route profiling to be added in next Phase 1 expansion; current evidence comes from backend tests plus route inventories | `cd edutech_web && npx playwright test tests/e2e/workflow/admin-economy-workspace.spec.ts tests/e2e/workflow/admin-economy-mutable.spec.ts --project=chromium` | no dedicated k6 economy script yet; lower priority than student runtime load |
| Parent checks progress and alerts | `cd edutech_backend && ./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label parent_dashboard_summary && ./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label parent_alerts` | parent browser suite command to be finalized when selecting exact parent workspace spec set in Phase 3 | no dedicated load script needed in current wave |

---

## Phase 1: Backend Read Path Optimization

### Objective

Profile and optimize the highest-value backend read paths first.

### Already done

- Service-level profiler added for analytics flows.
- Operational route profiler added for institute, teacher, parent, notifications, and master library.
- SQL sample capture added to the operational profiler.
- Route filtering added to isolate one route at a time.

Completed backend read-path hardening already includes:

- Analytics
  - shortened critical result-generation sections
  - batched `StudentTopicPerformance` writes
  - versioned short-TTL caches for analytics summaries
  - analytics-oriented indexes
- Institute/admin/teacher/parent/notification surfaces
  - institute dashboard cache and aggregate cleanup
  - teacher results summary preload cleanup
  - review queue summary lighter queryset and aggregation cleanup
  - parent alert and dashboard reuse/aggregate cleanup
  - notification mark-all-read correctness
  - notification list metadata caching
- Question bank/shared library
  - batched access resolution
  - paginate-first access enrichment
  - shared-library feature cache
  - shared-library access-status annotation
  - entitlement-and-scope snapshot cache
- Economy admin entitlements
  - active scope prefetch for package entitlements
  - scope and usage-entry helper reuse for quota-summary computation
- Teacher exams
  - annotated counts
  - section prefetch
  - access-policy hydration batching
  - access-policy snapshot cache
  - serializer helper memoization
  - count-query shape cleanup
- Student discovery
  - assignment prefetch reuse
  - serializer-side assignment memoization
  - hydrated access-policy reuse during economy-access evaluation
- Student attempts
  - nested answer prefetching
  - exam-question media prefetching
  - integrity-event reuse inside serializer helpers
- Bulk import
  - batched duplicate checks
  - batched academic lookup
  - finalize-path preload reuse

### Pending

- Cover student-facing read routes in the same rigor:
  - exam detail
  - attempt summary/detail
  - results detail
  - analytics drill-down routes
- Cover heavier admin/economy read routes:
  - catalog management
  - entitlement lists
  - package audit/reporting pages
- Cover question-bank local routes, not just shared-library routes.
- Extend route profiler coverage to remaining critical pages.
- Capture payload size trends in addition to latency and query count.

### Sub-phase checklist

| Step | Status | What it covers |
| --- | --- | --- |
| 1.1 | `done` | analytics service profiling command and first baselines |
| 1.2 | `done` | operational route profiler with SQL sampling and expanded student/economy route labels |
| 1.3 | `done` | institute, teacher, notifications, review, parent, and shared-library read-path cleanup |
| 1.4 | `in progress` | student-facing read-path profiling and optimization, with first `student_available_exams` pass complete |
| 1.5 | `in progress` | admin/economy heavy read-path profiling and optimization, with first package and entitlement passes complete |
| 1.6 | `pending` | local question-bank read-path optimization beyond shared library |
| 1.7 | `in progress` | payload-size measurement alongside latency/query counts |

### Deliverables

- Expanded operational profiler route set
- before/after snapshots for each hardened route
- top remaining backend read bottlenecks list

### Exit criteria

- All critical read routes are at least locally profiled.
- Major route families have either:
  - a measured optimization pass, or
  - an explicit reason they are deferred.

---

## Phase 2: Backend Write Path Optimization

### Objective

Measure and optimize mutation-heavy paths, especially the ones that matter under exam-day or operator-heavy usage.

### Already done

- Analytics result-generation critical sections were shortened.
- Some summary/rank recomputation work was moved out of the main write block.

### Pending

- Profile and optimize:
  - exam create/update
  - exam publish
  - exam access-policy update
  - start attempt
  - save answer
  - submit attempt
  - review score submission
  - result generation
  - result publish
  - bulk question-bank link flows
  - bulk roster import finalize flows at higher volume
- Check for:
  - lock contention
  - duplicate work inside transactions
  - N+1 writes
  - unnecessary synchronous side effects
  - repeated recomputation

### Sub-phase checklist

| Step | Status | What it covers |
| --- | --- | --- |
| 2.1 | `pending` | exam create and edit mutation profiling |
| 2.2 | `pending` | publish, access-policy, and assignment mutation profiling |
| 2.3 | `pending` | student runtime writes: start, save, submit |
| 2.4 | `pending` | review, result generation, and publish writes |
| 2.5 | `pending` | bulk import/link high-volume mutation passes |
| 2.6 | `pending` | transaction-shortening and side-effect extraction pass |

### Deliverables

- mutation profiler commands or scripted benchmarks
- top mutation hotspot report
- safe transaction-shortening opportunities list

### Exit criteria

- Core exam lifecycle mutations are profiled.
- High-frequency writes have measured latency and correctness checks.

---

## Phase 3: Frontend Baseline And Route Profiling

### Objective

Build the first real frontend performance baseline across desktop and mobile operator/student routes.

### Already done

- Browser coverage exists for many functional workflows.
- Some UX and shell routes are already browser-proven.
- Dedicated Playwright trace commands now exist for the first student-route baseline set.
- A reusable student route tracing runbook now exists for the first Phase 3 browser pass.
- Dedicated institute and teacher route tracing runbooks now also exist for operator shells.

### Pending

- Measure frontend performance for:
  - institute dashboard
  - institute exams workspace
  - question bank workspaces
  - admin economy pages
  - student exam runtime routes
- Capture:
  - page load time
  - time to interactive
  - route-transition latency
  - long tasks
  - hydration cost
  - slow component mounts
  - network waterfalls
  - duplicate client fetches
  - bundle size by route

### Sub-phase checklist

| Step | Status | What it covers |
| --- | --- | --- |
| 3.1 | `complete` | collect route timing baseline for institute and teacher operator shells |
| 3.2 | `in progress` | collect route timing baseline for student runtime and results routes |
| 3.3 | `in progress` | capture waterfalls and duplicate fetches on dense routes |
| 3.4 | `pending` | collect mobile and small-viewport baseline |
| 3.5 | `pending` | bundle analysis by critical route family |

### Deliverables

- frontend route baseline report
- bundle analysis report
- top 20 slowest frontend routes/components

### Exit criteria

- Every critical page has a baseline measurement.
- Slow pages are ranked by actual user impact.

---

## Phase 4: Frontend Optimization

### Objective

Reduce render, hydration, and network overhead on the heaviest pages.

### Already done

- No structured performance-hardening wave has been completed yet.

### Pending

- Reduce duplicate client-side fetches.
- Defer non-critical panels.
- Split bulky routes into lighter fetch boundaries.
- Virtualize large lists/tables where needed.
- Reduce repeated derived state work.
- Optimize expensive charts and evidence boards.
- Improve mobile/small viewport rendering on dense pages.
- Trim oversized route bundles.
- Convert heavy client-only paths into more balanced server/client contracts where appropriate.

### Sub-phase checklist

| Step | Status | What it covers |
| --- | --- | --- |
| 4.1 | `pending` | remove duplicate fetches and noisy client effects |
| 4.2 | `pending` | split dense routes into lighter fetch/render boundaries |
| 4.3 | `pending` | optimize tables, lists, and virtualization candidates |
| 4.4 | `pending` | optimize charts, evidence boards, and derived-state work |
| 4.5 | `pending` | reduce route bundles and hydration cost |

### Deliverables

- page-by-page frontend optimization log
- before/after Web Vitals and route timing report

### Exit criteria

- Highest-impact frontend pages materially improve.
- No major route remains slow due to obvious client-side waste.

---

## Phase 5: Payload And API Contract Optimization

### Objective

Reduce over-fetching and oversized API responses that slow both frontend and backend.

### Already done

- Some list serializers already use lighter payloads.
- Shared-library access enrichment was made page-aware.

### Pending

- Review list vs detail API contracts across all major modules.
- Remove fields unused by current clients where safe.
- Introduce compact payload modes where needed.
- Split expensive metadata from list endpoints when not always needed.
- Reduce repeated nested objects in high-volume responses.
- Measure payload size before/after optimization.

### Sub-phase checklist

| Step | Status | What it covers |
| --- | --- | --- |
| 5.1 | `pending` | list-vs-detail payload audit by module |
| 5.2 | `pending` | trim unused fields and repeated nested objects |
| 5.3 | `pending` | add compact modes or split optional metadata |
| 5.4 | `pending` | document payload-size improvements with route evidence |

### Deliverables

- payload audit report
- compact-contract recommendations
- updated API shapes for heavy routes

### Exit criteria

- Top heavy payloads are identified and trimmed.
- Frontend routes do not routinely fetch detail-grade payloads for list contexts.

---

## Phase 6: Concurrency And Load Testing

### Objective

Move from local single-user optimization to realistic concurrency proof.

### Already done

- Route and service profilers exist for local evidence.
- Some early `k6` direction already exists in repo, but not yet used as a full program.

### Pending

- Build realistic stage scenarios for:
  - many students viewing available exams
  - concurrent attempt start
  - concurrent answer save
  - concurrent submit
  - result publish spikes
  - notification spikes
  - teacher/institute dashboard access during active exams
  - shared-library browsing under wider catalog data
- Measure:
  - throughput
  - P50/P95/P99 latency
  - error rate
  - DB saturation
  - lock contention
  - cache hit/miss behavior
  - queue or side-effect lag

### Sub-phase checklist

| Step | Status | What it covers |
| --- | --- | --- |
| 6.1 | `pending` | prepare seeded stage-like data and traffic assumptions |
| 6.2 | `pending` | create read-heavy traffic scenarios |
| 6.3 | `pending` | create write-heavy exam-day scenarios |
| 6.4 | `pending` | execute load runs and capture DB/cache saturation signals |
| 6.5 | `pending` | tune thresholds and re-run after fixes |

### Deliverables

- stage load-test suite
- scenario seeds and data bootstrap docs
- pass/fail thresholds

### Exit criteria

- Core concurrency-sensitive journeys are stage-tested.
- No unacceptable collapse under expected pilot traffic.

---

## Phase 7: Observability And Regression Guardrails

### Objective

Make performance gains durable and visible.

### Already done

- Local backend profiler commands exist.
- Route-level SQL sampling exists.
- Several performance runbooks exist.

### Pending

- Stage dashboards for:
  - route latency
  - slow SQL
  - DB wait/lock signals
  - cache hit ratio
  - error rate by route family
- Frontend metrics:
  - route timing
  - Web Vitals
  - long task tracking
  - API waterfall visibility
- Regression guardrails:
  - repeatable benchmark scripts
  - bundle-size budgets
  - route budget checks for key APIs
  - scheduled stage performance smoke runs

### Sub-phase checklist

| Step | Status | What it covers |
| --- | --- | --- |
| 7.1 | `done` | local backend profiler commands and runbooks |
| 7.2 | `pending` | stage route latency and slow-SQL dashboard views |
| 7.3 | `pending` | cache, lock, and error-family visibility |
| 7.4 | `pending` | frontend timing, Web Vitals, and long-task telemetry |
| 7.5 | `pending` | automated budget and smoke-check routines |

### Deliverables

- performance dashboard checklist
- regression guardrail checklist
- route budget table

### Exit criteria

- Performance regressions are visible quickly.
- Major wins are no longer dependent on memory or manual spot-checks.

---

## Phase 8: Final Stage Validation And Signoff

### Objective

Upgrade confidence from local optimization to production-like proof.

### Already done

- Not started in a full-stack sense.

### Pending

- Re-run all critical backend route profiles on populated stage data.
- Re-run core frontend route profiling on stage.
- Execute concurrency suite.
- Verify cache invalidation correctness under live mutation flows.
- Verify no stale UI state after writes.
- Verify mobile/low-end device routes.
- Re-score the performance lane in the confidence matrix.

### Sub-phase checklist

| Step | Status | What it covers |
| --- | --- | --- |
| 8.1 | `pending` | re-profile backend critical routes on populated stage data |
| 8.2 | `pending` | re-profile frontend critical routes on stage |
| 8.3 | `pending` | execute and review concurrency results |
| 8.4 | `pending` | validate cache invalidation and stale-state behavior under writes |
| 8.5 | `pending` | update confidence matrix and remaining-risk summary |

### Deliverables

- final stage validation report
- before/after confidence update
- open-risk list

### Exit criteria

- Performance confidence can be raised with measured stage evidence, not local-only profiling.

---

## Module Coverage View

| Module | Backend read | Backend write | Frontend baseline | Load tested | Status |
| --- | --- | --- | --- | --- | --- |
| Institute onboarding | partial | pending | pending | pending | `partially complete` |
| Institute dashboard | done | n/a | pending | pending | `partially complete` |
| Teacher exams | done | pending | pending | pending | `partially complete` |
| Exam builder/create/publish | partial | pending | pending | pending | `pending` |
| Student exam runtime | pending | pending | pending | pending | `pending` |
| Question bank local | partial | pending | pending | pending | `pending` |
| Shared library | done | partial | pending | pending | `partially complete` |
| Results and analytics | done | partial | pending | pending | `partially complete` |
| Review workflows | done | pending | pending | pending | `partially complete` |
| Notifications | done | partial | pending | pending | `partially complete` |
| Parent views | done | n/a | pending | pending | `partially complete` |
| Economy/admin | partial | pending | pending | pending | `pending` |

### Coverage notes

- `done` means measured or hardened with explicit evidence already captured.
- `partial` means some important routes in that module are covered, but not the entire route family.
- `pending` means there is no meaningful performance evidence yet for that category.
- `n/a` means that category is not a primary concern for that module in the current wave.

---

## Update Checklist After Each Phase

Use this exact sequence every time a phase or sub-phase completes:

1. Update `Last updated`.
2. Update `Current working phase` if the active focus changed.
3. Update `Current Snapshot`.
4. Update the relevant phase summary row.
5. Move completed items from `Pending` to `Already done` in the phase section.
6. Update the phase `Sub-phase checklist`.
7. Update `Module Coverage View`.
8. Append one entry to `Phase Update Log`.
9. If the phase changes overall readiness, update [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md).

---

## Update Procedure After Each Phase

After every completed phase or major sub-phase, update this document in five places:

1. `Last updated`
2. `Current Snapshot`
3. the relevant phase section:
   - move completed work from `Pending` to `Already done`
4. `Module Coverage View`
5. add one entry to `Phase Update Log`

### Required update format

Use this template:

```md
## Phase Update Log

- Date: YYYY-MM-DD
  - Phase: Phase N name
  - Status change: from `old` to `new`
  - What was completed:
    - item
    - item
  - Evidence:
    - profiler command / test / stage run
  - Remaining work:
    - item
```

---

### Short update template

Use this one-line summary near the top of the document after each phase update:

```md
- Phase N status: `old` -> `new` on YYYY-MM-DD because <brief measured outcome>
```

### Evidence minimum by phase

- Phases 0 to 1:
  - route inventory, profiler output, before/after query or latency evidence
- Phase 2:
  - mutation timings, transaction-shape notes, correctness-safe optimization notes
- Phases 3 to 4:
  - route timings, Web Vitals, waterfall or bundle evidence
- Phase 5:
  - payload size before/after snapshots
- Phase 6:
  - concurrency metrics with P50/P95/P99 and error-rate evidence
- Phases 7 to 8:
  - dashboards, smoke automation, and stage-validation artifacts

## Phase Update Log

- Phase 3 status: `pending` -> `in progress` on 2026-07-06 because dedicated student-route trace commands and a frontend tracing runbook now exist for the first browser baseline pass.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the first local Chromium student-route trace starter set now runs green across four core learner routes in `7.1s`.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the first local student browser traces identify repeated Next.js RSC prefetch churn as the clearest frontend optimization target.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the first student link-prefetch hardening pass is green but still does not reduce browser-side RSC churn enough to close the issue.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because a shared student workspace link policy improved the runtime route, but result and review route churn still needs another pass.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because passive tertiary student links improved the post-submit route slightly, but the local browser trace signal is now plateauing.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the first institute trace bundle is green and now identifies exams and results as the heaviest operator-side browser churn targets.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the first institute operator link-policy pass is safe but only modestly reduces browser churn.

- Phase 1 status: `partially complete` -> `partially complete` on 2026-07-06 because `admin_question_bank_entitlements` now has a measured optimization pass, reducing query count from `103` to `4` and warm average latency from `111.19ms` to `19.94ms`.

- Phase 1 status: `partially complete` -> `partially complete` on 2026-07-06 because `student_attempt_list` now has a measured optimization pass, reducing query count from `43` to `26` and warm average latency from `25.26ms` to `19.65ms`.

- Phase 1 status: `partially complete` -> `partially complete` on 2026-07-06 because fresh local baselines show `student_wallet`, `student_subscriptions`, and `institute_scoped_question_bank_entitlements` are already healthy enough to defer until stage-density validation.

- Phase 1 status: `partially complete` -> `partially complete` on 2026-07-06 because fresh local baselines show `question_bank_questions_compact` and `question_bank_passages_list` are already healthy enough to defer until stage-density validation.

- Phase 1 status: `partially complete` -> `partially complete` on 2026-07-06 because direct student detail profiling now exists, and `student_exam_detail` has a measured first pass reducing warm query count from `38` to `28`.

- Phase 1 status: `partially complete` -> `partially complete` on 2026-07-06 because the student exam detail payload-shaping pass reduced warm query count further from `28` to `15` while shrinking the response from `78` to `50` top-level keys.

- Phase 1 status: `partially complete` -> `partially complete` on 2026-07-06 because the remaining measured student detail routes, `student_attempt_summary` and `student_attempt_review`, are already locally healthy enough to defer until stage-density validation.

- Phase 1 status: `partially complete` -> `partially complete` on 2026-07-06 because `student_available_exams` now has a measured optimization pass, reducing warm query count from `42` to `22` and warm average latency from `25.94ms` to `18.55ms`.

- Phase 1 status: `partially complete` -> `partially complete` on 2026-07-06 because the first optimization pass on `admin_question_bank_packages` reduced the route from `34` queries to `8`.

- Phase 1 status: `partially complete` -> `partially complete` on 2026-07-06 because first student and economy read-route baselines now exist, and they identify the next optimization targets clearly.

- Phase 1 status: `partially complete` -> `partially complete` on 2026-07-06 because the route profiler now covers student and economy read labels, making the next backend read pass measurable.

- Phase 0 status: `partially complete` -> `complete` on 2026-07-06 because command-level benchmark linkage now exists for the priority journeys and the baseline inventory is execution-ready.

- Phase 0 status: `partially complete` -> `partially complete` on 2026-07-06 because module classification and journey-to-evidence mapping are now documented for reuse in later phases.

- Phase 0 status: `in progress` -> `partially complete` on 2026-07-06 because backend route inventory, frontend route inventory, and draft journey/SLA mapping are now documented.

- Phase 0 status: `pending` -> `in progress` on 2026-07-06 because the master full-stack performance plan and initial module coverage view are now documented.

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `pending` to `in progress`
  - What was completed:
    - added dedicated Playwright trace commands for student exam detail and student attempt-flow routes
    - documented a reusable frontend tracing workflow for the first student baseline pass
    - linked the frontend tracing entry point to the backend route wins already measured in Phase 1
  - Evidence:
    - `edutech_web/package.json`
    - `docs/qa-runbooks/FRONTEND_STUDENT_ROUTE_TRACING_RUNBOOK.md`
    - `edutech_web/tests/e2e/workflow/student-exam-detail-workspace.spec.ts`
    - `edutech_web/tests/e2e/workflow/student-attempt-runtime-workspace.spec.ts`
    - `edutech_web/tests/e2e/workflow/student-post-submit-workspace.spec.ts`
    - `edutech_web/tests/e2e/workflow/student-review-workspace.spec.ts`
  - Remaining work:
    - execute the new trace commands on local and stage-like data
    - capture settled-state timing, duplicate fetches, and obvious browser-side bottlenecks
    - decide whether the next frontend pass should prioritize route optimization, bundle trimming, or stage validation

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - executed the first local Chromium student trace bundle successfully across four learner routes
    - stabilized the post-submit and review browser specs so they reflect the current seeded UI contracts
    - confirmed the Phase 3 student baseline command is now a green entry point for further browser profiling
  - Evidence:
    - `npm run test:e2e:trace:student-phase3`
    - `npx playwright test tests/e2e/workflow/student-post-submit-workspace.spec.ts tests/e2e/workflow/student-review-workspace.spec.ts --project=chromium --trace on`
    - `edutech_web/tests/e2e/workflow/student-post-submit-workspace.spec.ts`
    - `edutech_web/tests/e2e/workflow/student-review-workspace.spec.ts`
    - `docs/qa-runbooks/FRONTEND_STUDENT_ROUTE_TRACING_RUNBOOK.md`
  - Remaining work:
    - inspect the generated trace artifacts for settled-state timing, duplicate requests, and obvious frontend bottlenecks
    - extend the same trace-and-stabilize pass to institute and teacher route families
    - decide whether the next optimization wave should focus on route waterfalls, bundle size, or stage-density validation

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - inspected the first local student trace artifacts instead of stopping at green test status
    - confirmed that student exam, attempt, summary, and review routes are locally healthy enough to shift focus from backend suspicion to browser request-shape analysis
    - identified repeated Next.js RSC prefetch churn on dense student shells as the first frontend optimization target
  - Evidence:
    - `docs/qa-runbooks/FRONTEND_STUDENT_ROUTE_TRACING_RUNBOOK.md`
    - `edutech_web/test-results/workflow-student-exam-deta-38430--surfaces-and-safe-handoffs-chromium/trace.zip`
    - `edutech_web/test-results/workflow-student-attempt-r-26482-ed-attempt-runtime-surfaces-chromium/trace.zip`
    - `edutech_web/test-results/workflow-student-post-subm-37663-conditional-review-surfaces-chromium/trace.zip`
    - `edutech_web/test-results/workflow-student-review-wo-d6416-nuity-and-follow-up-actions-chromium/trace.zip`
  - Remaining work:
    - audit student-shell and dense route `Link` prefetch behavior
    - decide where prefetch should be disabled, delayed, or narrowed to the most probable next actions
    - repeat the same trace analysis for institute and teacher route families after the student prefetch pass

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - added a passive student navigation link component for lower-priority follow-up actions
    - moved tertiary summary, review, and results follow-up actions off the app-router link path
    - revalidated the student Phase 3 trace suite after the passive-link rollout
  - Evidence:
    - `edutech_web/src/components/ui/student-passive-nav-link.tsx`
    - `edutech_web/src/app/(student)/app/attempts/[attemptId]/summary/page.tsx`
    - `edutech_web/src/app/(student)/app/attempts/[attemptId]/review/page.tsx`
    - `edutech_web/src/app/(student)/app/results/page.tsx`
    - `npm run test:e2e:trace:student-phase3`
  - Remaining work:
    - treat the local student link experiment as plateauing rather than solved
    - shift the next frontend pass either to stage-density validation or to institute and teacher browser profiling
    - avoid more broad local link churn unless new trace evidence isolates a specific route surface clearly

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - added a repeatable institute trace command and dedicated runbook for the operator baseline bundle
    - executed the first institute Chromium browser baseline across dashboard, exams, exam detail, results, reviews, and question bank
    - identified institute exams and institute results as the heaviest operator-side browser churn routes in the first local pass
  - Evidence:
    - `edutech_web/package.json`
    - `docs/qa-runbooks/FRONTEND_INSTITUTE_ROUTE_TRACING_RUNBOOK.md`
    - `npm run test:e2e:trace:institute-phase3`
    - `edutech_web/test-results/workflow-institute-dashboa-97492-se-command-surface-handoffs-chromium/trace.zip`
    - `edutech_web/test-results/workflow-institute-exams-w-02c0e--and-use-workspace-handoffs-chromium/trace.zip`
    - `edutech_web/test-results/workflow-institute-results-f51c2-igate-the-results-workspace-chromium/trace.zip`
  - Remaining work:
    - audit repeated action-link clusters and adjacent workspace handoff links on institute exams and results pages
    - decide whether institute needs its own shared operator link policy similar to the student workspace
    - extend the same profiling pattern to teacher routes after the first institute operator hardening pass

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - introduced a shared operator workspace link wrapper and applied it to institute exams plus the shared results workspace
    - revalidated the full institute Phase 3 bundle after the operator link-policy rollout
    - measured that the route churn reduction is real but modest, especially on results and dashboard, with exams still very heavy
  - Evidence:
    - `edutech_web/src/components/ui/operator-workspace-link.tsx`
    - `edutech_web/src/app/(institute)/institute/exams/page.tsx`
    - `edutech_web/src/features/results-workspace/page.tsx`
    - `npm run test:e2e:trace:institute-phase3`
    - `docs/qa-runbooks/FRONTEND_INSTITUTE_ROUTE_TRACING_RUNBOOK.md`
  - Remaining work:
    - avoid more broad local institute link edits without a tighter route hypothesis
    - move to teacher profiling or stage-density validation for better signal
    - revisit institute only if a narrower exams/results cluster becomes the clear next bottleneck

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - created the first dedicated teacher Phase 3 trace command and teacher route tracing runbook
    - executed the first teacher Chromium browser baseline across shell, exam detail, question bank, results, reviews, live monitor, and results analysis
    - hardened the deep teacher question-bank spec so empty filtered datasets do not fail the profiling bundle
    - identified teacher results and teacher reviews as the heaviest teacher-side browser churn routes in the first local pass
  - Evidence:
    - `edutech_web/package.json`
    - `edutech_web/tests/e2e/workflow/question-bank-deep.spec.ts`
    - `docs/qa-runbooks/FRONTEND_TEACHER_ROUTE_TRACING_RUNBOOK.md`
    - `npm run test:e2e:trace:teacher-phase3`
    - `edutech_web/test-results/workflow-teacher-results-w-c9260-igate-the-results-workspace-chromium/trace.zip`
    - `edutech_web/test-results/workflow-teacher-reviews-w-9d247-igate-the-reviews-workspace-chromium/trace.zip`
    - `edutech_web/test-results/workflow-teacher-results-a-be248--results-analysis-workspace-chromium/trace.zip`
  - Remaining work:
    - isolate teacher results and teacher reviews for the next operator link-policy pass
    - avoid touching teacher exam detail or live monitor first because they are comparatively healthy locally
    - use the teacher baseline to decide whether the shared results workspace should get the next frontend optimization wave before broader stage-density work

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - moved teacher sidebar navigation and teacher reviews workspace links onto the shared operator workspace link policy
    - revalidated the full teacher Phase 3 bundle after the teacher link-policy rollout
    - measured that teacher results and teacher reviews improved slightly, with the cleanest aborted-request reduction appearing on teacher analysis and live monitor routes
  - Evidence:
    - `edutech_web/src/components/ui/teacher-sidebar.tsx`
    - `edutech_web/src/app/(teacher)/teacher/reviews/page.tsx`
    - `npm run test:e2e:trace:teacher-phase3`
    - `docs/qa-runbooks/FRONTEND_TEACHER_ROUTE_TRACING_RUNBOOK.md`
  - Remaining work:
    - avoid more broad teacher link edits without a tighter teacher results hypothesis
    - decide whether the next pass should be a shared results-workspace structural change or stage-density validation
    - revisit teacher only if a narrower results/reviews action cluster becomes the clear next bottleneck

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - moved teacher brand navigation to the teacher dashboard and added explicit role-home brand destinations to the shared student, institute, admin, and parent sidebars
    - disabled eager brand-link prefetch on the shared workspace sidebar
    - revalidated the full teacher Phase 3 bundle after the shared shell cleanup
  - Evidence:
    - `edutech_web/src/components/ui/workspace-sidebar.tsx`
    - `edutech_web/src/components/ui/teacher-sidebar.tsx`
    - `edutech_web/src/app/(student)/app/layout.tsx`
    - `edutech_web/src/app/(institute)/institute/layout.tsx`
    - `edutech_web/src/app/(admin)/admin/layout.tsx`
    - `edutech_web/src/app/(parent)/parent/layout.tsx`
    - `npm run test:e2e:trace:teacher-phase3`
    - `docs/qa-runbooks/FRONTEND_TEACHER_ROUTE_TRACING_RUNBOOK.md`
  - Remaining work:
    - treat the shared shell cleanup as a navigation correctness improvement, not a complete teacher performance fix
    - stop relying on shell-level link changes as the main local teacher optimization lever
    - move next to stage-density validation or a deeper shared results-workspace investigation

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - disabled eager prefetch on the workspace sidebar plus student topbar, footer, support links, and quick-filter chips
    - revalidated the student Phase 3 trace suite and kept it green after the navigation-behavior change
    - stabilized the student runtime trace spec so it waits for visible route state after navigation
  - Evidence:
    - `edutech_web/src/components/ui/workspace-sidebar.tsx`
    - `edutech_web/src/components/ui/workspace-topbar.tsx`
    - `edutech_web/src/components/ui/student-app-footer.tsx`
    - `edutech_web/src/app/(student)/app/layout.tsx`
    - `edutech_web/src/app/(student)/app/exams/page.tsx`
    - `edutech_web/src/app/(student)/app/attempts/page.tsx`
    - `edutech_web/src/app/(student)/app/results/page.tsx`
    - `edutech_web/tests/e2e/workflow/student-attempt-runtime-workspace.spec.ts`
    - `npm run test:e2e:trace:student-phase3`
  - Remaining work:
    - inspect dense route cards and repeated action-link clusters because trace churn remains high
    - decide whether to introduce a stricter student workspace link policy instead of one-off `prefetch={false}` patches
    - hold off on claiming frontend prefetch success until the next trace pass shows a material reduction

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - introduced a shared student workspace link wrapper that disables eager prefetch by default
    - moved the dense student operational pages onto that shared link policy
    - revalidated the student Phase 3 trace suite after the wrapper rollout
  - Evidence:
    - `edutech_web/src/components/ui/student-workspace-link.tsx`
    - `edutech_web/src/app/(student)/app/exams/page.tsx`
    - `edutech_web/src/app/(student)/app/attempts/page.tsx`
    - `edutech_web/src/app/(student)/app/results/page.tsx`
    - `edutech_web/src/app/(student)/app/attempts/[attemptId]/summary/page.tsx`
    - `edutech_web/src/app/(student)/app/attempts/[attemptId]/review/page.tsx`
    - `npm run test:e2e:trace:student-phase3`
  - Remaining work:
    - audit repeated action-card links on post-submit and review flows because those traces remain the noisiest
    - decide whether the next reduction should come from fewer simultaneously rendered route variants rather than more prefetch flags
    - extend the same shared link policy approach to institute and teacher pages only after the student result/review traces improve

- Date: 2026-07-06
  - Phase: Phase 1 Backend Read Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - expanded the operational profiler to cover `student_attempt_summary` and `student_attempt_review`
    - captured direct local baselines for both remaining student detail surfaces
    - confirmed both routes are already locally healthy enough to defer until stage-density validation
  - Evidence:
    - `edutech_backend/apps/reports/management/commands/profile_operational_routes.py`
    - `edutech_backend/apps/reports/tests/test_profile_operational_routes_command.py`
    - `./.venv/bin/python manage.py test apps.reports.tests.test_profile_operational_routes_command`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label student_attempt_summary`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label student_attempt_review`
  - Remaining work:
    - move the student detail effort into stage-density validation and frontend tracing
    - use Phase 3 frontend profiling to confirm student exam and attempt pages benefit end-to-end from the backend reductions
    - reserve further backend changes for stage or browser evidence, not local intuition

- Date: 2026-07-06
  - Phase: Phase 1 Backend Read Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - trimmed `StudentExamDetailSerializer` to the student-facing fields actually used by the student exam page and access-key flow
    - removed unused exam-detail payload branches such as publish logs and other admin-oriented serializer fields from the student contract
    - re-profiled the route and confirmed a substantial second-stage improvement on both query count and response size
  - Evidence:
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label student_exam_detail`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 1 --route-label student_exam_detail --include-query-sql`
    - `./.venv/bin/python manage.py test apps.accounts.tests.test_auth_access.AuthenticationAccessControlTestCase.test_student_can_resolve_exam_by_access_key --keepdb`
  - Remaining work:
    - measure the remaining unprofiled student detail routes before leaving Phase 1
    - validate the student detail routes on stage-density data
    - confirm with frontend tracing that render time on the student exam detail page now tracks the backend reduction

- Date: 2026-07-06
  - Phase: Phase 1 Backend Read Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - expanded the operational profiler to cover `student_exam_detail` and `student_attempt_detail`
    - captured first direct local baselines for both student detail routes
    - reduced `student_exam_detail` query count by reusing prefetched exam-question media data, hydrated exam access policies, prefetched publish logs, and prefetched count data
  - Evidence:
    - `edutech_backend/apps/reports/management/commands/profile_operational_routes.py`
    - `edutech_backend/apps/reports/tests/test_profile_operational_routes_command.py`
    - `./.venv/bin/python manage.py test apps.reports.tests.test_profile_operational_routes_command`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label student_exam_detail`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 1 --route-label student_exam_detail --include-query-sql`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label student_attempt_detail`
    - `./.venv/bin/python manage.py test apps.accounts.tests.test_auth_access.AuthenticationAccessControlTestCase.test_student_can_resolve_exam_by_access_key --keepdb`
  - Remaining work:
    - decide whether `student_exam_detail` should keep the full readiness payload or split some data into a lighter detail contract
    - measure the remaining unprofiled student detail routes before leaving Phase 1
    - use stage-density validation to decide whether further local tuning is worthwhile or whether the remaining cost is justified by payload size

- Date: 2026-07-06
  - Phase: Phase 1 Backend Read Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - expanded the operational profiler to cover compact local question-bank list routes
    - captured fresh local baselines for `question_bank_questions_compact` and `question_bank_passages_list`
    - confirmed both routes are already locally healthy enough to defer further work unless denser stage data changes the picture
  - Evidence:
    - `edutech_backend/apps/reports/management/commands/profile_operational_routes.py`
    - `edutech_backend/apps/reports/tests/test_profile_operational_routes_command.py`
    - `./.venv/bin/python manage.py test apps.reports.tests.test_profile_operational_routes_command`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label question_bank_questions_compact`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 1 --route-label question_bank_questions_compact --include-query-sql`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label question_bank_passages_list`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 1 --route-label question_bank_passages_list --include-query-sql`
  - Remaining work:
    - shift Phase 1 attention to student detail and attempt-detail payload shaping
    - measure remaining unprofiled student detail routes
    - revisit local question-bank detail routes only if stage-density validation or frontend traces show heavier real payloads

- Date: 2026-07-06
  - Phase: Phase 1 Backend Read Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - captured fresh local baselines for `student_wallet`, `student_subscriptions`, and `institute_scoped_question_bank_entitlements`
    - confirmed those routes are already locally healthy enough to defer further work unless stage-density validation shows otherwise
  - Evidence:
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label student_wallet`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label student_subscriptions`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label institute_scoped_question_bank_entitlements`
  - Remaining work:
    - shift Phase 1 attention to local question-bank read routes and remaining student detail routes
    - revisit these three routes only during stage-density validation or if new payload requirements change them materially
    - continue the payload-size tracking pass for list versus detail APIs

- Date: 2026-07-06
  - Phase: Phase 1 Backend Read Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - prefetched nested answers, answer-question options, exam-question media data, and active integrity events for the student attempt list route
    - updated serializer helpers to reuse prefetched exam-question and integrity-event data instead of re-querying row by row
    - re-profiled the route and confirmed a meaningful query-count and latency drop
  - Evidence:
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label student_attempt_list`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 1 --route-label student_attempt_list --include-query-sql`
    - `./.venv/bin/python manage.py test apps.accounts.tests.test_auth_access.AuthenticationAccessControlTestCase.test_student_cannot_see_another_students_attempts_or_results --keepdb`
  - Remaining work:
    - decide whether `student_attempt_list` should keep the full attempt payload or split list versus detail payloads in a later payload-trimming pass
    - measure and optimize `student_wallet` and `student_subscriptions`
    - measure `institute_scoped_question_bank_entitlements`
    - extend profiling to local question-bank read routes and remaining student detail routes

- Date: 2026-07-06
  - Phase: Phase 1 Backend Read Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - prefetched active package scopes for the admin entitlement list and detail routes
    - cached active-scope and linked-usage lookups inside the shared quota-summary helpers
    - re-profiled the route and confirmed a major query-count and latency drop without the earlier CPU regression from list-wide usage prefetching
  - Evidence:
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label admin_question_bank_entitlements`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 1 --route-label admin_question_bank_entitlements --include-query-sql`
    - `./.venv/bin/python manage.py test apps.economy.tests.test_api.EconomyApiTestCase.test_platform_admin_can_view_question_bank_packages_and_entitlements --keepdb`
  - Remaining work:
    - measure and optimize `student_attempt_list`, `student_wallet`, and `student_subscriptions`
    - measure `institute_scoped_question_bank_entitlements`
    - decide whether the remaining two usage-ledger queries on the entitlement list are already good enough or worth collapsing further
    - extend profiling to local question-bank read routes and student detail routes

- Date: 2026-07-06
  - Phase: Phase 1 Backend Read Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - prefetched student assignments on the student available-exams route and reused them across list, detail, and access-key resolution paths
    - memoized assignment checks inside the student availability serializer
    - reused hydrated exam access policies during economy-access evaluation to avoid repeated policy resolution
    - re-profiled the route and confirmed a large query-count drop with lower cold and warm latency
  - Evidence:
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label student_available_exams`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 1 --route-label student_available_exams --include-query-sql`
    - `./.venv/bin/python manage.py test apps.accounts.tests.test_auth_access.AuthenticationAccessControlTestCase.test_student_available_exam_list_works_and_is_scoped --keepdb`
  - Remaining work:
    - inspect notification side effects and remaining unlock-state work on `student_available_exams`
    - measure and optimize `student_attempt_list`, `student_wallet`, and `student_subscriptions`
    - measure `admin_question_bank_entitlements` and `institute_scoped_question_bank_entitlements`
    - extend profiling to local question-bank read routes and student detail routes

- Date: 2026-07-06
  - Phase: Phase 1 Backend Read Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - prefetched `usage_entries` on the admin question-bank package list route
    - memoized serializer-side package scope and count summaries per row
    - re-profiled the route and confirmed a major query-count drop
  - Evidence:
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label admin_question_bank_packages`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 1 --route-label admin_question_bank_packages --include-query-sql`
    - `./.venv/bin/python manage.py test apps.economy.tests.test_api.EconomyApiTestCase.test_platform_admin_can_view_question_bank_packages_and_entitlements --keepdb`
  - Remaining work:
    - decide whether to trim payload volume or nested scope detail for this route
    - optimize `student_available_exams`
    - measure `admin_question_bank_entitlements`, `student_attempt_list`, `student_wallet`, and `student_subscriptions`
    - extend profiling to local question-bank read routes and student detail routes

- Date: 2026-07-06
  - Phase: Phase 1 Backend Read Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - captured first local baseline for `student_available_exams`
    - captured first local baseline for `student_result_list`
    - captured first local baseline for `admin_economy_catalog_overview`
    - captured first local baseline for `admin_question_bank_packages`
    - captured SQL samples for the two clearest hotspots
  - Evidence:
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label student_available_exams`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label student_result_list`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label admin_economy_catalog_overview`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 3 --route-label admin_question_bank_packages`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 1 --route-label student_available_exams --include-query-sql`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 1 --route-label admin_question_bank_packages --include-query-sql`
  - Remaining work:
    - optimize `admin_question_bank_packages`
    - optimize `student_available_exams`
    - measure `admin_question_bank_entitlements`, `student_attempt_list`, `student_wallet`, and `student_subscriptions`
    - extend profiling to local question-bank read routes and student detail routes

- Date: 2026-07-06
  - Phase: Phase 1 Backend Read Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - expanded `profile_operational_routes` coverage to student discovery/history routes
    - expanded `profile_operational_routes` coverage to economy admin/support routes
    - added command-level regression tests for the expanded route set
  - Evidence:
    - `edutech_backend/apps/reports/management/commands/profile_operational_routes.py`
    - `edutech_backend/apps/reports/tests/test_profile_operational_routes_command.py`
    - `./.venv/bin/python manage.py test apps.reports.tests.test_profile_operational_routes_command`
  - Remaining work:
    - run and capture before/after measurements on the newly added labels
    - optimize the slowest student and economy read routes from fresh profiler output
    - extend coverage to local question-bank routes and remaining student detail routes

- Date: 2026-07-06
  - Phase: Phase 0 Baseline And Coverage Inventory
  - Status change: from `partially complete` to `complete`
  - What was completed:
    - attached benchmark and scenario commands to the priority journeys
    - linked backend profilers, Playwright suites, and stage `k6` commands into one reusable execution map
    - made later Phase 1, Phase 2, Phase 3, and Phase 6 entry points explicit
  - Evidence:
    - `docs/qa-runbooks/STAGE_PERFORMANCE_TEST_COMMANDS.md`
    - `docs/qa-runbooks/PERFORMANCE_TEST_PLAN.md`
    - `docs/qa-runbooks/BACKEND_ANALYTICS_PERFORMANCE_RUNBOOK.md`
    - `docs/qa-runbooks/BACKEND_OPERATIONAL_ROUTE_PROFILING_RUNBOOK.md`
    - `edutech_web/package.json`
  - Remaining work:
    - replace draft targets with measured stage budgets in later phases
    - add missing student/economy route labels to the operational profiler
    - add dedicated mutation-profiler commands in Phase 2

- Date: 2026-07-06
  - Phase: Phase 0 Baseline And Coverage Inventory
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - classified major modules by read-heavy, write-heavy, mixed, and concurrency-sensitive profile
    - connected top journeys to existing browser scenario artifacts
    - clarified which suites can seed Phase 2, Phase 3, and Phase 6 measurement work
  - Evidence:
    - `edutech_web/tests/e2e/EXAM_CREATION_SCENARIO_CATALOG.md`
    - `edutech_web/tests/e2e/ECONOMY_QUESTION_BANK_SUBSCRIPTION_SPEC_MATRIX.md`
    - mutable browser suites under `edutech_web/tests/e2e/workflow/`
  - Remaining work:
    - convert draft SLA targets into measured budgets on stage-like data
    - attach exact benchmark commands or scripts to each journey
    - finalize low-priority vs deferred boundaries for non-critical modules

- Date: 2026-07-06
  - Phase: Phase 0 Baseline And Coverage Inventory
  - Status change: from `in progress` to `partially complete`
  - What was completed:
    - backend API route inventory added by module
    - frontend route inventory added by role and route family
    - top critical journeys mapped across backend and frontend
    - draft performance SLA and budget targets added
  - Evidence:
    - `edutech_backend/config/urls.py`
    - app url registries under `edutech_backend/apps/*/urls`
    - frontend route map under `edutech_web/src/app`
  - Remaining work:
    - complete module classification into read-heavy, write-heavy, mixed, and concurrency-sensitive buckets
    - validate SLA targets against stage-like data
    - tie each journey to explicit benchmark scripts and browser scenarios

- Date: 2026-07-06
  - Phase: Phase 0 Baseline And Coverage Inventory
  - Status change: from `pending` to `in progress`
  - What was completed:
    - master full-stack performance plan created
    - initial module coverage view added
    - phase-wise done vs pending tracking added
    - standard update workflow defined for future phase closures
  - Evidence:
    - `docs/qa-runbooks/FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md`
  - Remaining work:
    - full backend route inventory by module
    - full frontend route inventory by module
    - explicit performance budgets and SLA targets

- Date: 2026-07-06
  - Phase: Phase 1 Backend Read Path Optimization
  - Status change: from `in progress` to `partially complete`
  - What was completed:
    - analytics service profiling and hardening baseline
    - operational route profiling with SQL sampling
    - major local read-path optimization across dashboard, teacher exams, shared library, notifications, review queue, parent surfaces
    - shared-library route reduced to a `2`-query warm path
    - notification list reduced to a `2`-query warm path
    - teacher exam list reduced to a `3`-query warm path
  - Evidence:
    - `./.venv/bin/python manage.py profile_analytics_services --repeat 1`
    - `./.venv/bin/python manage.py profile_operational_routes --repeat 1`
    - focused backend test runs for accounts, reports, question-bank, economy, and analytics surfaces
  - Remaining work:
    - student-facing read route coverage
    - admin/economy heavy read route coverage
    - frontend route profiling
    - stage load and concurrency validation

---

## Recommended Immediate Next Order

1. Expand Phase 1 route profiler coverage for the still-unmeasured student and economy read routes.
2. Continue Phase 2 by profiling write-heavy paths:
   - attempt start
   - save answer
   - submit attempt
   - result generation
   - result publish
3. Start Phase 3 frontend baseline on:
   - institute dashboard
   - teacher exams
   - question bank
   - results analysis
4. Move to Phase 6 stage-like load testing once the top write paths are measured.
