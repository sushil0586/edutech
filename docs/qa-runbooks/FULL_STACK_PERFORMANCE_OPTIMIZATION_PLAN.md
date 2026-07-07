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
- [PLAYWRIGHT_PERFORMANCE_PENETRATION_MASTER_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_PERFORMANCE_PENETRATION_MASTER_PLAN.md)
- [STAGE_PERFORMANCE_MONITORING_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_PERFORMANCE_MONITORING_CHECKLIST.md)
- [STAGE_PERFORMANCE_TEST_COMMANDS.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_PERFORMANCE_TEST_COMMANDS.md)
- [STAGE_SCALE_UP_VALIDATION_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SCALE_UP_VALIDATION_RUNBOOK.md)
- [STAGE_SCALE_UP_RESULTS_TEMPLATE.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SCALE_UP_RESULTS_TEMPLATE.md)

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
- Backend mutation and concurrency hardening: `partially complete`
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
- A follow-up local student exam read-path pass is now complete:
  - `StudentExamDetailView` and related student exam views now preload active sections with `subject`
  - duplicate `student_assignments` prefetching was removed from the detail and access-key detail paths
  - section linked-question counts now reuse prefetched `exam_questions` instead of triggering per-section `COUNT(*)` queries
  - on current demo data, `student_exam_detail` improved again from about `15` warm queries and `~28.3ms` to about `8` warm queries and `~15.4ms`
  - `student_available_exams` also now sits at about `11` warm queries and `~12.4ms` on the same local profiler pass
- A follow-up local student attempt detail pass is now complete:
  - the attempt workspace queryset now preloads active exam questions, source teacher, and active integrity events in the shape the detail serializer already expects
  - attempt media-context helpers now reuse prefetched attachments instead of issuing fallback attachment queries
  - on current demo data, `student_attempt_detail` improved from about `16` warm queries and `~16.4ms` to about `6` warm queries and `~13.4ms`
- `student_attempt_summary` and `student_attempt_review` now have direct local baselines showing they are already healthy on current demo data.
- Auth login validation now avoids the old double-password-hash path on successful login, and the login response now reuses a `select_related` account-profile fetch before serialization.
- Stage auth revalidation now shows a meaningful improvement after that patch:
  - direct stage login timing moved down to about `1.25s` to `1.50s`
  - the `10 VU / 10 iteration` student login-and-discovery smoke improved from the earlier `~14.47s p95` run to about `7.27s p95`
  - the route is still above the `p95 < 2s` target, so further login-payload and profile-serialization work remains open
- A follow-up `/auth/me/` hardening pass is now in place:
  - `MeView` now hydrates the session profile with `select_related(...)` before serialization
  - student program-subject discovery now fetches subject names directly instead of hydrating full `Subject` rows
  - steady-state direct stage timings now show roughly `login ~1.2s` and `me ~0.6s`
  - the warm rerun of the same `10 VU / 10 iteration` smoke now lands around `6.88s p95`, which points more to concurrency queueing than a single remaining read-path hotspot
- A stage-only gunicorn concurrency experiment is now documented:
  - baseline stage host is `2 vCPU`, `~1.9 GB RAM`
  - baseline `5` sync workers showed host CPU pegged near `100%` during the auth smoke, with elevated run queue depth
  - trial config `--workers 2 --threads 4 --worker-class gthread --timeout 120` reduced memory footprint and improved median/average request time slightly
  - the same `10 VU / 10 iteration` smoke still landed around `6.91s p95`, so the main constraint remains CPU saturation on the current stage size
  - after the comparison, stage was reverted to the prior live config `--workers 5 --timeout 120`
- A broader stage auth ramp with the `30`-student pool surfaced a second constraint:
  - the current login throttle (`10/minute`) starts producing `429` responses before the full ramp becomes a clean infrastructure-capacity signal
  - the current `ramping-vus` auth script shape relogs the same identities repeatedly, so it is not yet suitable for a pure higher-scale auth benchmark without either a larger pool, a looser stage throttle, or session reuse
- A new session-reuse discovery load shape now exists and is validated on the current stage:
  - `performance/k6/student-session-and-exam-discovery.js` logs in once per VU and reuses the access token
  - a controlled interrupted ramp on the current `2 vCPU` stage reached `11` active VUs cleanly with `0%` request failures
  - that interrupted run produced about `p95 369ms`, `p90 325ms`, and `avg 277ms` across the authenticated session-discovery path
  - this is now the cleaner higher-scale discovery test for before/after infra comparisons when repeated-login throttling would otherwise pollute the signal
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
- The shared operator search surface now also follows the no-prefetch workspace-link policy:
  - [workspace-search-results.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/workspace-search-results.tsx) now uses [operator-workspace-link.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/operator-workspace-link.tsx)
  - this closes an architectural gap on institute, teacher, and admin search-route navigation before dedicated search trace measurement
- The shared operator results workspace now scopes heavy data fetching by active sub-view:
  - [results-workspace/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/features/results-workspace/page.tsx) no longer preloads attempts, topic analytics, question analytics, and intervention notes on the overview route
  - this is the first institute-results-specific architectural reduction in the shared results page, even though the current workflow trace bundle still mixes in many cross-route fetches
- Dedicated institute timing probes now exist for the results hotspot, the shared shell, and the institute question-bank workspace:
  - [institute-results-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/institute-results-timing.spec.ts)
  - [institute-shell-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/institute-shell-timing.spec.ts)
  - [institute-question-bank-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/institute-question-bank-timing.spec.ts)
  - current local timing evidence says institute results and the shared shell are healthy in isolation, while institute question bank is the stronger isolated institute-side frontend hotspot
- A dedicated admin economy timing probe now exists:
  - [admin-economy-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-economy-timing.spec.ts)
  - this gives Phase 3 a direct browser timing harness for `/admin/economy` overview, catalog, question-bank, and support-ops transitions
- The first institute question-bank list render reduction is now in place:
  - [question-bank/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(institute)/institute/question-bank/page.tsx) no longer performs four extra quality-summary list queries during first render
  - the main list route also no longer fetches comprehension previews on initial load
  - current local evidence says the create-question entry path remains the clearest next question-bank target
- The first institute question-bank create bootstrap reduction is now in place:
  - [question-bank/new/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(institute)/institute/question-bank/new/page.tsx) now loads only core first-paint editor data up front
  - [teacher-question-editor.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/teacher-question-editor.tsx) now hydrates institute-scoped subjects, topics, and comprehension sets on demand through [create-lookups/route.ts](/Users/ansh/Documents/Eductech/edutech_web/src/app/api/institute/question-bank/create-lookups/route.ts)
  - current local evidence says `question-bank-create-open` improved from about `540ms` to about `428ms`
- A follow-up institute question-bank route-shell streaming pass is now in place:
  - [question-bank/new/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(institute)/institute/question-bank/new/page.tsx) now streams a lightweight create-question shell before the full editor dependencies finish loading
  - [question-bank/import/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(institute)/institute/question-bank/import/page.tsx) now streams a lightweight import shell and resolves entitlement plus template fetches in parallel
  - current build verification is green, and this pass specifically targets the `question-bank-create-open` and `question-bank-import-open` timing transitions
- Institute question-bank runtime hardening is now slightly more defensive:
  - [question-bank/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(institute)/institute/question-bank/page.tsx) now normalizes fetched collection payloads before route-level filter and summary work
  - this cleared at least one landing-page runtime failure class in the timing probe, but the route family is still not stable enough for consistent timing capture
- A follow-up institute question-bank metadata-cache trial is now explicitly ruled out:
  - a shared short-lived cache for option-catalog and question-type-registry bootstrap fetches did not improve local institute or teacher create-route timings on rerun
  - that experiment was removed so the next pass stays focused on structural payload and route-shape reductions instead of unproven helper-layer caching
- Dedicated teacher timing probes now exist for the two clearest remaining teacher hotspots:
  - [teacher-results-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/teacher-results-timing.spec.ts)
  - [teacher-question-bank-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/teacher-question-bank-timing.spec.ts)
  - current local timing evidence says teacher results remains heavy on filter apply and leaderboard transitions, while teacher question bank is now clearly concentrated on create/import bootstrap cost
- The first teacher question-bank create bootstrap reduction is now in place:
  - [question-bank/new/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(teacher)/teacher/question-bank/new/page.tsx) now loads only core first-paint editor data up front
  - [create-lookups/route.ts](/Users/ansh/Documents/Eductech/edutech_web/src/app/api/teacher/question-bank/create-lookups/route.ts) now serves teacher-scoped subjects, topics, and passages on demand for the shared [teacher-question-editor.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/teacher-question-editor.tsx)
  - current local evidence says `question-bank-create-open` improved from about `606ms` to about `351ms`
- A follow-up teacher question-bank import parallel-fetch cleanup is now in place:
  - [question-bank/import/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(teacher)/teacher/question-bank/import/page.tsx) now resolves feature entitlements and the import template in parallel instead of serially
  - current local evidence says this is a safe cleanup, but not a major measured timing win on its own
- The first teacher results overview leaderboard trim is now in place:
  - [results-workspace/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/features/results-workspace/page.tsx) now fetches only a minimal leaderboard payload on the overview route while keeping full leaderboard loading for the dedicated leaderboard and analysis views
  - current local evidence says `overview-filter-apply` improved from about `1095ms` to about `551ms`
- The first teacher results subview sidebar compaction is now in place:
  - [results-workspace/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/features/results-workspace/page.tsx) now keeps the full exam browser only on overview while using a compact exam-context sidebar on leaderboard, live, attempts, and analysis
  - current local evidence says `leaderboard-open` improved only modestly from about `867ms` to about `858ms`, while `analysis-open` improved more clearly from about `614ms` to about `473ms`
- The first teacher results top-shell compaction is now in place:
  - [results-workspace/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/features/results-workspace/page.tsx) now keeps the heavy outcome-control hero and five-card summary grid on overview only
  - current local evidence says this made the route family structurally lighter but did not materially improve `leaderboard-open`, which now looks locally plateaued for teacher-results-specific micro-trims
- A follow-up shared results compact-bootstrap pass is now in place:
  - [results-workspace/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/features/results-workspace/page.tsx) now keeps the full exam inventory bootstrap on overview only while using a compact paginated exam feed for leaderboard, live, attempts, and analysis routes
  - current local evidence says the clearest measured win is teacher-side `leaderboard-open`, which dropped from about `858ms` to about `389ms` on a warm rerun, while the broader route family stayed mixed enough that follow-up measurement remains necessary
- The backend operational profiler now includes a dedicated teacher leaderboard route:
  - [profile_operational_routes.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/reports/management/commands/profile_operational_routes.py) now exposes `teacher_results_leaderboard`
  - current local backend evidence says the teacher leaderboard API is healthy in isolation at about `6.96ms` warm with `3` queries, which points the remaining `leaderboard-open` cost back toward frontend route/render overhead
- A follow-up teacher results subview exam-payload trial is now explicitly ruled out:
  - switching non-overview teacher results routes to a paginated exam-list source did not improve local leaderboard, live, or analysis timings
  - that experiment was removed so the next pass stays focused on stronger route-structure hypotheses instead of speculative exam-source branching
- Dedicated student timing probes now exist for the main post-submit route family:
  - [student-results-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/student-results-timing.spec.ts)
  - [student-summary-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/student-summary-timing.spec.ts)
  - [student-review-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/student-review-timing.spec.ts)
  - current local timing evidence says results, summary, and review are all healthy in isolation, so student post-submit routes are no longer the strongest local frontend hardening target
- The next frontend hardening queue is now concrete at file level:
  - student result and review churn is concentrated in [summary/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/[attemptId]/summary/page.tsx), [review/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/[attemptId]/review/page.tsx), [results/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/results/page.tsx), and [attempts/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/page.tsx)
  - institute and teacher result churn is concentrated in the shared [results-workspace/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/features/results-workspace/page.tsx)
  - both shared link wrappers are already in place at [student-workspace-link.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/student-workspace-link.tsx) and [operator-workspace-link.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/operator-workspace-link.tsx), so the next pass should focus on route structure and repeated action surfaces rather than another broad prefetch-default sweep
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
- The first local backend attempt write-path profiler now exists:
  - `./.venv/bin/python manage.py profile_attempt_write_path --repeat 2`
  - it measures disposable `start_attempt`, `save_answer`, and `submit_attempt` flows while rolling back the created dataset afterward
  - current early local signal on disposable data is roughly:
    - `start_attempt`: now improved from `22` queries down to about `15`, with local elapsed time around `~6.8ms to 10.3ms`
    - `save_answer`: now improved from `19` queries down to about `11`, with local elapsed time around `~5.9ms to 8.3ms`
    - `submit_attempt`: now improved from `13` queries down to about `9`, with local elapsed time around `~5.0ms to 10.5ms`
  - this is now the baseline tool for Phase 2 attempt-write-path hardening
- The first local backend exam lifecycle write-path profiler now exists:
  - `./.venv/bin/python manage.py profile_exam_write_path --repeat 1`
  - it measures disposable serializer-backed `create_exam`, serializer-backed `update_exam`, and service-level `publish_exam` flows while rolling back the created dataset afterward
  - current early local signal on disposable data is roughly:
    - `create_exam`: about `10ms to 12ms` and `17` queries
    - `update_exam`: about `3.8ms to 4.4ms` and `9` queries
    - `publish_exam`: improved from about `34.67ms` and `23` queries to about `28.59ms` and `22` queries after reusing the same exam-question payload across readiness and usage checks
  - this is now the baseline tool for Phase 2 exam lifecycle mutation hardening
- The first local backend result workflow write-path profiler now exists:
  - `./.venv/bin/python manage.py profile_result_write_path --repeat 1`
  - it measures disposable `generate_results_for_exam`, `calculate_exam_ranks`, and `publish_exam_results` flows on a submitted-attempt dataset while rolling the data back afterward
  - current early local signal on disposable data is roughly:
    - `generate_results_for_exam`: improved from about `32.24ms` and `55` queries to a repeat-3 local baseline of about `12.44ms` to `19.66ms` and `36` queries after collapsing repeated summary aggregates, skipping the extra post-insert result update, reusing one reward-rule query, and reusing preloaded attempt answers and exam questions across both topic-performance and section-performance analytics
    - `calculate_exam_ranks`: improved from about `4.00ms` to `4.95ms` and `12` queries down to about `1.02ms` to `1.81ms` and `4` queries after replacing per-row validated saves with one `bulk_update`
    - `publish_exam_results`: improved from the earlier `27`-query / `8.88ms` baseline down to about `18` queries / `6.92ms` to `8.68ms` after reusing readiness inputs instead of refetching the same result rows
  - this is now the baseline tool for Phase 2 result-generation and result-publish hardening
- The first local backend review workflow write-path profiler now exists:
  - `./.venv/bin/python manage.py profile_review_write_path --repeat 1`
  - it measures disposable `claim_review_task_for_teacher`, `review_manual_answer`, `request_review_recheck`, `bulk_request_recheck_two_tasks`, `bulk_moderate_two_tasks`, and `moderate_review_task` flows on submitted essay-review datasets while rolling the data back afterward
  - current early local signal on disposable data is roughly:
    - `claim_review_task_for_teacher`: improved from about `9.76ms` and `24` queries to a repeat-2 local baseline of about `3.68ms` to `4.72ms` and `16` queries after replacing validated task saves with a direct update on already-scoped review-task rows
    - `review_manual_answer`: improved from about `23.23ms` and `57` queries to a repeat-2 local baseline of about `6.20ms` to `7.51ms` and `23` queries after replacing validated answer, review-task, and attempt score saves with direct updates while preserving explicit institute checks
    - `request_review_recheck`: improved from about `12.95ms` to `14.52ms` and `35` queries down to about `4.04ms` to `4.23ms` and `18` queries after replacing validated answer and task saves with direct updates while preserving explicit institute checks
    - `bulk_request_recheck_two_tasks`: improved from about `8.21ms` to `8.38ms` and `36` queries down to about `5.07ms` to `6.68ms` and `17` queries after switching bulk recheck to one service-level batch that directly updates answers and tasks and bulk-creates review events
    - `bulk_moderate_two_tasks`: first improved from about `26.16ms` to `26.64ms` and `88` queries down to about `19.30ms` to `20.35ms` and `65` queries after batching attempt score recalculation and result regeneration once per attempt inside bulk moderation, then improved again to about `13.55ms` to `13.77ms` and `48` queries after buffering moderation review events and bulk-creating them once per batch, then down to `32` queries after replacing duplicate lazy task hydration with one preloaded review-task batch, then to `30` queries after flattening the batch into one outer transaction instead of per-task transaction boundaries, and now to `22` queries with about `16.61ms` to `17.32ms` after preloading result-side exam subject / institute context and replacing validated existing-result saves with direct updates
    - `moderate_review_task`: improved from about `26.21ms` and `63` queries to a repeat-2 local baseline of about `6.44ms` to `8.23ms` and `26` queries using the same direct-update pattern on answer, task, and attempt score writes
  - this is now the baseline tool for Phase 2 review-write and descriptive-grading hardening
- The first local backend economy-admin mutation profiler now exists:
  - `./.venv/bin/python manage.py profile_economy_admin_write_path --repeat 1`
  - it measures disposable reward-rule and content-access-policy create/update flows while rolling the data back afterward
  - current early local signal on disposable data is roughly:
    - `create_reward_rule`: about `2.50ms` to `6.10ms` and `6` queries
    - `update_reward_rule`: about `1.40ms` to `1.95ms` and `3` queries
    - `create_content_access_policy`: about `1.79ms` to `6.01ms` and `4` queries
    - `update_content_access_policy`: about `0.86ms` to `1.03ms` and `1` query
  - this is now the baseline tool for Phase 2 economy-admin and access-policy mutation hardening
- The first local backend question-bank entitlement mutation profiler now exists:
  - `./.venv/bin/python manage.py profile_question_bank_entitlement_write_path --repeat 1`
  - it measures disposable package-entitlement grant/status update and feature-entitlement grant/status update flows while rolling the data back afterward
  - current early local signal on disposable data is roughly:
    - `grant_question_bank_entitlement`: improved to about `2.50ms` to `7.80ms` and `5` queries after replacing validated create-path saves for the entitlement row and usage-ledger row with direct inserts inside the service-owned grant flow
    - `update_question_bank_entitlement_status`: improved to about `1.42ms` to `2.05ms` and `4` queries after replacing validated status-transition saves with direct updates inside the service
    - `grant_feature_entitlement`: improved to about `1.21ms` to `3.37ms` and `4` queries after replacing validated create-path saves in the feature-entitlement grant flow with direct inserts and direct restore-path updates
    - `update_feature_entitlement_status`: improved to about `1.54ms` to `1.65ms` and `5` queries after replacing validated status-transition saves with direct updates inside the service
  - this is now the baseline tool for Phase 2 package-entitlement and feature-entitlement mutation hardening
- The first local backend subscription-request mutation profiler now exists:
  - `./.venv/bin/python manage.py profile_subscription_request_write_path --repeat 1`
  - it measures disposable institute subscription-request creation plus platform-admin approve/reject review flows while rolling the data back afterward
  - current early local signal on disposable data is roughly:
    - `create_subscription_request`: improved to about `2.81ms` to `6.86ms` and `6` queries after replacing validated request creation with a direct insert plus explicit service-level checks
    - `approve_subscription_request`: improved to about `4.07ms` to `8.99ms` and `9` queries after replacing validated subscription-request review saves with direct updates and flattening nested transaction wrappers around entitlement application
    - `reject_subscription_request`: improved to about `2.05ms` to `2.20ms` and `4` queries after the same direct request-row update pattern
  - this is now the baseline tool for Phase 2 subscription-request and operator-review mutation hardening
- The first local backend unlock-rule mutation profiler now exists:
  - `./.venv/bin/python manage.py profile_unlock_rule_write_path --repeat 1`
  - it measures disposable unlock-rule create and update flows while rolling the data back afterward
  - current early local signal on disposable data is roughly:
    - `create_unlock_rule`: about `1.43ms` to `5.74ms` and `3` queries
    - `update_unlock_rule`: about `0.68ms` to `1.68ms` and `1` query
  - this is now the baseline tool for Phase 2 unlock-rule mutation hardening, and the first local signal is already healthy enough to defer optimization
- The first local backend master-library link mutation profiler now exists:
  - `./.venv/bin/python manage.py profile_master_library_write_path --repeat 1`
  - it measures disposable master-library request, first link, and relink flows while rolling the data back afterward
  - current local signal on disposable data is roughly:
    - `request_master_question_access`: first improved to about `9.12ms` to `15.01ms` and `15` queries after replacing `update_or_create` with a flatter direct save path, then improved again to about `14.52ms` to `15.79ms` and `14` queries after switching the matcher to the cached entitlement snapshot and prefetched active scopes
    - `link_master_question_to_institute`: first improved to about `21.88ms` to `23.33ms` and `35` queries after replacing nested `update_or_create` write paths, reusing the existing access row, and passing the resolved entitlement into usage logging, then improved again to about `23.40ms` to `25.52ms` and `29` queries after reusing the cached entitlement snapshot instead of rebuilding package-scope scans
    - `relink_master_question_to_institute`: improved to about `14.85ms` to `22.09ms` and `30` queries with linked-question reuse preserved
  - this is now the baseline tool for Phase 2 shared-library mutation hardening, and the remaining cost is concentrated more on model-validation foreign-key existence checks than on entitlement matching
- The first local backend roster-import mutation profiler now exists:
  - `./.venv/bin/python manage.py profile_roster_import_write_path --repeat 1 --rows 5`
  - it measures disposable bulk roster finalize flows for student imports without login, student imports with login, and teacher imports with login while rolling the data back afterward
  - current local signal on disposable data is roughly:
    - `finalize_student_import_without_login`: improved from about `11.80ms` to `29.92ms` and `40` queries down to about `3.46ms` to `7.06ms` and `6` queries after batching no-login profile inserts and bypassing repeated model-level full-clean work already covered by preview validation
    - `finalize_student_import_with_login`: improved from about `973.72ms` to `981.47ms` and `95` queries down to about `972.57ms` to `996.68ms` and `30` queries after flattening profile creation and removing redundant account-profile existence checks, with elapsed time still dominated by password hashing and per-row user creation
    - `finalize_teacher_import_with_login`: improved from about `971.82ms` to `987.77ms` and `77` queries down to about `954.95ms` to `967.45ms` and `27` queries after the same profile-insert and account-profile flattening
  - this is now the baseline tool for Phase 2 roster-import mutation hardening, and the remaining latency cost is primarily CPU-bound login creation rather than database chatter

### What is not yet done

- Stage-validated route-to-SLA coverage for every critical workflow
- Stage-like frontend performance baseline
- Backend write-path profiling and optimization program beyond the first attempt-mutation benchmark
- Load and concurrency testing for exam-day style flows
- Production-like data validation
- Frontend bundle, hydration, and interaction-performance hardening
- Long-term regression budgets and automated checks

### Immediate next move

Before the instance change, the next performance-confidence step is `Pre-Scale Local Hardening Wave 1`.

The goal of this wave is to finish the highest-value work that does not require bigger stage compute:

- close the remaining obvious local read-path gaps on auth, student runtime, results detail, and heavy institute/admin reads
- start the backend write-path measurement program so we are not waiting on infra to find mutation bottlenecks
- turn the existing frontend tracing evidence into concrete route-level optimization tasks
- tighten payload-size discipline on the heaviest authenticated routes
- prepare clean local benchmarks so the later stage resize compares infra effects instead of mixed code-and-infra changes

After this local wave is complete, move to `Stage Performance Wave 1` plus auth-path revalidation:

- validate shared stage role logins on `https://learn.accerio.in`
- confirm student exam visibility with the current demo and pooled student accounts
- run stage host monitoring on `3.106.125.117`
- execute student login/discovery smoke and ramp `k6` runs
- redeploy the backend auth optimization and compare login endpoint latency before and after the patch
- measure and harden queueing behavior on the stage gunicorn stack, including worker model, worker count, and request concurrency profile
- either raise stage compute capacity or lower expected concurrency for this stage profile before expecting green auth/discovery p95s
- execute a student runtime smoke run only if visible startable attempts exist

Use:

- [STAGE_PERFORMANCE_TEST_COMMANDS.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_PERFORMANCE_TEST_COMMANDS.md)
- [STAGE_PERFORMANCE_MONITORING_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_PERFORMANCE_MONITORING_CHECKLIST.md)
- [STAGE_SCALE_UP_VALIDATION_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SCALE_UP_VALIDATION_RUNBOOK.md)

Do not mark Phase 6 started or raise performance confidence until measured stage evidence is captured from this wave.

### Pre-Scale Local Hardening Queue

Complete these in order before the instance-type change.

#### Track A: Backend read-path closure

1. Profile the remaining authenticated read endpoints that still matter for perceived slowness:
   - `/api/v1/auth/login/`
   - `/api/v1/auth/me/`
   - student exam runtime/detail reads
   - student results detail/review reads
   - institute/admin heavy entitlement and reporting reads
2. Capture local query counts, timing, and payload size for each route.
3. Apply only low-risk local fixes before the resize:
   - `select_related` and `prefetch_related` closure
   - serializer memoization
   - compact nested serializer variants
   - values-only fetches where object hydration is unnecessary
4. Re-run local profiling and log the delta in this plan.

#### Track B: Backend write-path kickoff

1. Start Phase 2 locally instead of waiting for bigger stage infra.
2. Profile the highest-risk mutations:
   - exam create/update/publish
   - student attempt start
   - save-answer
   - submit
   - review score save/finalize
   - bulk roster import finalize
3. Record:
   - transaction time
   - query count
   - repeated aggregates
   - synchronous post-write work that can move out of the critical path
4. Prioritize any mutation that blocks exam-day scale or operator productivity.

#### Track C: Payload and API contract cleanup

1. Add payload-size measurement for the routes already under profiling.
2. Identify oversized auth and student session payloads first.
3. Split “full” versus “compact” response contracts where the client does not need deep nested data on first paint.
4. Record which routes are intentionally left verbose for correctness or compatibility.

#### Track D: Frontend route optimization prep

1. Use the existing trace runbooks to convert browser churn findings into concrete route tasks.
2. Prioritize:
   - student results and review routes
   - institute exams and results routes
   - teacher results and reviews routes
3. For each route, decide whether the next optimization is mainly:
   - prefetch policy cleanup
   - client-fetch reduction
   - server component tree slimming
   - table/list virtualization
   - bundle split or dynamic import
4. Only after that route diagnosis, start targeted frontend edits.

#### Track D Route Queue

Use this queue for the next targeted frontend hardening wave.

##### Student queue

1. [summary/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/[attemptId]/summary/page.tsx)
   - status: `pending targeted edit`
   - why:
     - multiple result, review, and attempts follow-up links remain visible together
     - repeated filter-variant href generation is still present in the main post-submit lane
   - likely optimization:
     - reduce simultaneous follow-up route variants
     - collapse lower-priority actions behind a smaller decision surface
     - keep passive anchors for tertiary destinations

2. [review/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/[attemptId]/review/page.tsx)
   - status: `pending targeted edit`
   - why:
     - review traces are still among the noisiest student routes
     - summary, results, attempts, analytics, and practice follow-up actions are rendered together in several sections
   - likely optimization:
     - trim repeated action clusters
     - keep only one primary return path and one primary follow-up path above the fold
     - demote the rest to passive or deferred navigation

3. [results/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/results/page.tsx)
   - status: `pending targeted edit`
   - why:
     - the route still exposes many status, sort, and grouping link variants at once
     - result cards also expose summary, review, wallet, weak-area, and practice follow-up routes
   - likely optimization:
     - replace some link-based filter chips with form controls or explicit submit actions
     - reduce repeated card-level follow-up destinations
     - keep only the most common next action visible per result card

4. [attempts/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/page.tsx)
   - status: `pending targeted edit`
   - why:
     - this page still contains several filter chips plus summary, runtime, retry, practice, wallet, analytics, and results handoffs
   - likely optimization:
     - tighten card action density
     - avoid rendering too many alternate follow-up routes on every list item

##### Shared operator queue

1. [results-workspace/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/features/results-workspace/page.tsx)
   - status: `pending structural investigation`
   - why:
     - this shared route backs both teacher and institute results surfaces
     - the file has a very high density of route-mutating links across overview, attempts, leaderboard, live, and analysis views
     - broad wrapper-level prefetch cleanup was safe but only modestly effective
   - likely optimization:
     - reduce link-based filter matrices
     - move some filter transitions to forms or explicit submit controls
     - split dense view sections so all action clusters are not rendered at once
     - consider dynamic or conditional rendering for lower-priority panels

2. [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(institute)/institute/exams/page.tsx)
   - status: `pending follow-up after shared results pass`
   - why:
     - institute exams traces were among the heaviest operator pages
     - route-level evidence suggests some churn is still coming from exams-to-results handoff density
   - likely optimization:
     - inspect authoring handoff cards and always-visible next-step destinations after the shared results workspace pass

3. [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(teacher)/teacher/reviews/page.tsx)
   - status: `pending follow-up after shared results pass`
   - why:
     - teacher reviews remains one of the highest-noise operator routes
     - some waste may remain local to the review queue even after shared results cleanup
   - likely optimization:
     - isolate review-only action clusters after the shared results workspace is reduced

#### Track E: Local benchmark discipline

1. For every local hardening pass, keep one before/after record:
   - route
   - cold time
   - warm time
   - query count
   - payload size if relevant
2. Avoid mixing multiple unrelated optimizations into one benchmark note.
3. Freeze the local code shape before the instance resize validation wave, so the infra comparison stays clean.

### Pre-Scale Exit Criteria

We are ready for the instance-type change only after most of these are true:

- the next local auth-path optimizations are either complete or clearly blocked by stage-only behavior
- at least one meaningful Phase 2 write-path profiling pass exists
- the heaviest frontend traced routes each have a concrete next optimization hypothesis
- payload-size notes exist for the main authenticated student/session routes
- the resize comparison can focus mostly on infra headroom instead of unresolved obvious local inefficiencies

---

## Phase Summary

| Phase | Title | Status | Primary outcome | Done now | Still pending |
| --- | --- | --- | --- | --- | --- |
| 0 | Baseline And Coverage Inventory | `complete` | One unified inventory of modules, routes, pages, and test scenarios | master plan doc created, module view exists, backend route inventory exists, frontend page inventory exists, classification exists, journey mapping exists, benchmark linkage exists | later phases must now replace draft budgets with measured evidence |
| 1 | Backend Read Path Optimization | `partially complete` | Critical read APIs profiled and locally hardened | analytics, dashboard, teacher exams, shared library, notifications, parent, `student_available_exams`, `student_attempt_list`, first economy-admin package pass, first economy-admin entitlement pass | student runtime/results detail reads, remaining economy/admin heavy reads, question-bank local reads, payload-size tracking |
| 2 | Backend Write Path Optimization | `partially complete` | Heavy mutations measured and optimized | analytics result critical section shortened, disposable attempt write-path profiler exists, exam lifecycle, result, review, economy-admin, entitlement, subscription-request, unlock-rule, master-library, and roster-import mutation profilers now exist, with measured local reductions recorded across the heaviest write paths | remaining login-creation CPU cost in roster imports, any last shared-library validation-trim decision, stage concurrency proof |
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
- A disposable local attempt write-path profiler now exists:
  - `./.venv/bin/python manage.py profile_attempt_write_path --repeat 2`
- The first local attempt mutation pass is now measured:
  - `start_attempt`: about `22 -> 15` queries
  - `save_answer`: about `19 -> 11` queries
  - `submit_attempt`: about `13 -> 9` queries
- A disposable local exam lifecycle write-path profiler now exists:
  - `./.venv/bin/python manage.py profile_exam_write_path --repeat 1`
- The first local exam lifecycle mutation pass is now measured:
  - `create_exam`: about `17` queries and `~10ms to 12ms`
  - `update_exam`: about `9` queries and `~3.8ms to 4.4ms`
  - `publish_exam`: improved from about `23` queries and `~34.67ms` to about `22` queries and `~28.59ms`
- A disposable local result workflow write-path profiler now exists:
  - `./.venv/bin/python manage.py profile_result_write_path --repeat 1`
- The first local result workflow mutation pass is now measured:
  - `generate_results_for_exam`: improved from about `55` queries and `~32.24ms` to a repeat-3 local baseline of `36` queries and roughly `12.44ms` to `19.66ms`
  - `calculate_exam_ranks`: improved from about `12` queries and `~4.00ms to 4.95ms` to about `4` queries and `~1.02ms to 1.81ms`
  - `publish_exam_results`: improved from about `27` queries and `~8.88ms` to about `18` queries and `~6.92ms to 8.68ms`

### Pending

- Profile and optimize:
  - exam access-policy update
  - start attempt
  - save answer
  - submit attempt
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
| 2.1 | `partial` | exam create and edit mutation profiling |
| 2.2 | `partial` | publish, access-policy, and assignment mutation profiling |
| 2.3 | `pending` | student runtime writes: start, save, submit |
| 2.4 | `partial` | review, result generation, and publish writes |
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

### Current route-level queue

- Student:
  - [summary/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/[attemptId]/summary/page.tsx)
  - [review/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/[attemptId]/review/page.tsx)
  - [results/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/results/page.tsx)
  - [attempts/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/page.tsx)
- Shared operator:
  - [results-workspace/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/features/results-workspace/page.tsx)
- Follow-up operator pages after the shared results pass:
  - [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(institute)/institute/exams/page.tsx)
  - [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(teacher)/teacher/reviews/page.tsx)
- Admin-first frontend hardening order:
  - [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/economy/page.tsx)
  - [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/reports/page.tsx)
  - [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/institutes/page.tsx)
  - [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/people/page.tsx)
  - [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/security/page.tsx)
  - [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/settings/page.tsx)
  - Current state: first isolated local timing coverage now exists for all six main admin surfaces.

### Admin page hardening status

| Route | Status | Current signal | Next action |
| --- | --- | --- | --- |
| `/admin/economy` | `partially complete` | dedicated timing probe is green; the default overview now lands on a lighter policy subsection and the latest warm local timings are about `overview 0.22s`, `catalog 0.22s`, `question-bank 0.92s`, and `support-ops 0.13s` | keep question-bank commerce as the only still-notable admin economy lane, but the remaining work is now a smaller follow-up rather than a broad route-family concern |
| `/admin/reports` | `partially complete` | first dedicated timing baseline is healthy at about `open 0.38s`, `publication 0.25s`, `weak-topics 0.21s`, and `students 0.24s` | keep as a lower-priority follow-up and move the active admin hardening wave to `/admin/institutes` |
| `/admin/institutes` | `partially complete` | first dedicated timing baseline is healthy at about `open 0.39s`, `switch-selected 0.31s`, and `switch-back 0.20s` | keep as a lower-priority follow-up and move the active admin hardening wave to `/admin/people` |
| `/admin/people` | `partially complete` | first dedicated timing baseline is healthy at about `students-open 0.18s`, `teachers-open 0.24s`, and `students-return 0.21s` | keep as a lower-priority follow-up and move the active admin hardening wave to `/admin/security` |
| `/admin/security` | `partially complete` | first dedicated timing baseline is healthy at about `open 0.80s`, `watch-exam 0.32s`, and `critical-filter 0.87s` | keep as a lower-priority follow-up and move the active admin hardening wave to `/admin/settings` |
| `/admin/settings` | `partially complete` | first dedicated timing baseline is healthy at about `open 0.58s`, `return-from-people 0.49s`, and `return-from-academics 0.36s` | keep as a lower-priority follow-up and return the active frontend hardening queue to shared institute and teacher hotspots plus `/admin/economy` overview |

### What is already decided

- Another broad `prefetch={false}` sweep is not the best next lever.
- The shared student and operator link wrappers already exist and are the right default.
- The next local wave should focus on:
  - repeated action-card surfaces
  - link-based filter matrices
  - view splitting and conditional rendering on dense pages

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

- Phase 2 status: `partially complete` -> `partially complete` on 2026-07-06 because the first master-library write-path profiler now exists, and the first service flattening pass reduced request/link/relink flows from `19/45/38` queries to `15/35/33` without changing linking behavior.

- Phase 2 status: `partially complete` -> `partially complete` on 2026-07-06 because the shared-library entitlement matcher now reuses the cached entitlement snapshot and prefetched active scopes, reducing request/link/relink flows again from `15/35/33` queries to `14/29/30`.

- Phase 2 status: `partially complete` -> `partially complete` on 2026-07-06 because the first roster-import write-path profiler now exists, and the first finalize-path flattening pass reduced 5-row student no-login imports from `40` queries to `6`, student login-enabled imports from `95` to `30`, and teacher login-enabled imports from `77` to `27` while preserving import behavior.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because institute question-bank create and import routes now stream lightweight shells immediately, targeting the slowest measured institute question-bank transitions without changing the underlying editor or import workflows.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because institute question-bank and admin economy timing probes now expose an operator-side blocker clearly: both routes still hit intermittent app-level runtime load failures before stable browser timing can be trusted.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the admin-first hardening order is now fixed at `/admin/economy` -> `/admin/reports` -> `/admin/institutes` -> `/admin/people` -> `/admin/security` -> `/admin/settings`, and `/admin/economy` is now build-green again after defensive route-shape fixes even though the catalog timing probe still fails on an app-level runtime boundary.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the dedicated `/admin/economy` timing probe is green again on a fresh local dev server after route-shape hardening and probe-alignment fixes, and the route family is now clearly measurable as slow rather than blocked by a runtime boundary.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because `/admin/economy` now fetches data by active tab instead of preloading every lane on every request, and the refreshed local timing probe dropped from roughly `6.6s/7.0s/7.1s/6.7s` to about `5.1s/0.2s/6.6s/0.15s` across overview, catalog, question-bank, and support-ops.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because `/admin/economy` question-bank data now loads by subsection instead of always pulling package, visibility, and plan datasets together, and the focused local timing probe reduced `question-bank-open` again from about `6.6s` to about `1.4s` while keeping `catalog-open` and `support-ops-open` fast.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because `/admin/economy` overview now reuses one economy-gated teacher exam summary call instead of issuing three separate filter requests, improving the focused local `overview-open` timing from about `8.8s` to about `6.9s` while keeping the build green.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because `/admin/economy` now defaults the overview lane to the lighter policy subsection, uses a cheap student count for boundary posture, and defers question-bank usage hydration until the usage subsection is explicitly opened, bringing warm local timings to about `0.16s/0.19s/0.95s/0.17s` across overview, catalog, question-bank, and support-ops.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because a dedicated `/admin/reports` timing probe now exists for the main route plus publication, weak-topic, and student lanes, setting up the first isolated admin reports baseline before deeper route trimming.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the first isolated `/admin/reports` timing baseline came back healthy at roughly `0.38s/0.25s/0.21s/0.24s` across the main, publication, weak-topic, and student lanes, so this route no longer looks like the next admin-side hardening priority.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because a dedicated `/admin/institutes` timing probe now exists for route open and selected-institute switching, setting up the first isolated local baseline for the next admin surface in the queue.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the first isolated `/admin/institutes` timing baseline came back healthy at roughly `0.39s/0.31s/0.20s` for open, institute switch, and switch-back transitions, so this route no longer looks like the next admin-side hardening priority.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because a dedicated `/admin/people` timing probe now exists for student open, teacher open, and student return transitions, setting up the first isolated local baseline for the next admin roster surface in the queue.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the first isolated `/admin/people` timing baseline came back healthy at roughly `0.18s/0.24s/0.21s` for student open, teacher open, and return transitions, so this route no longer looks like the next admin-side hardening priority and the active queue now moves to `/admin/security`.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because a dedicated `/admin/security` timing probe now exists for route open, selected-exam watch transition, and critical-attempt filtering, setting up the first isolated local baseline for the next admin governance surface in the queue.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the first isolated `/admin/security` timing baseline came back healthy at roughly `0.80s/0.32s/0.87s` for route open, watch-exam, and critical-filter transitions, so this route no longer looks like the next admin-side hardening priority and the active queue now moves to `/admin/settings`.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because a dedicated `/admin/settings` timing probe now exists for initial route load plus return loads from the page's main governance handoff routes, setting up the final isolated local baseline in the admin-first frontend hardening wave.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the first isolated `/admin/settings` timing baseline came back healthy at roughly `0.58s/0.49s/0.36s` for initial load and return loads, which means first-pass local timing coverage now exists across all six main admin surfaces and the active frontend queue can move back to shared institute and teacher hotspots plus the still-heavy `/admin/economy` overview lane.

- Phase 3 status: `pending` -> `in progress` on 2026-07-06 because dedicated student-route trace commands and a frontend tracing runbook now exist for the first browser baseline pass.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the first local Chromium student-route trace starter set now runs green across four core learner routes in `7.1s`.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the first local student browser traces identify repeated Next.js RSC prefetch churn as the clearest frontend optimization target.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the first student link-prefetch hardening pass is green but still does not reduce browser-side RSC churn enough to close the issue.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because a shared student workspace link policy improved the runtime route, but result and review route churn still needs another pass.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because passive tertiary student links improved the post-submit route slightly, but the local browser trace signal is now plateauing.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the first institute trace bundle is green and now identifies exams and results as the heaviest operator-side browser churn targets.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the first institute operator link-policy pass is safe but only modestly reduces browser churn.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the shared operator search surface now uses the no-prefetch workspace-link policy, closing a remaining architectural gap before dedicated search-route trace validation.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the shared operator results workspace now loads heavy datasets by active sub-view instead of preloading them all on the overview route.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because dedicated institute timing probes now show both the results route family and the shared institute shell are locally healthy in isolation, narrowing the next optimization target.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the first dedicated institute question-bank timing probe now identifies question bank as the stronger isolated institute-side frontend hotspot.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the first institute question-bank list render reduction is green, and the remaining question-bank hotspot is now concentrated more clearly on the create-question entry path.

- Phase 3 status: `in progress` -> `in progress` on 2026-07-06 because the first institute question-bank create bootstrap reduction is green and materially improves the slowest question-bank transition.

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
  - Phase: Phase 2 Backend Write Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - added a dedicated `profile_exam_write_path` management command for disposable exam lifecycle mutation profiling
    - captured the first local serializer-backed create/update baseline plus the first service-level publish baseline
    - reused the same active exam-question payload across publish-readiness and question-bank usage checks, trimming the first local `publish_exam` baseline from about `23` queries and `34.67ms` to about `22` queries and `28.59ms`
  - Evidence:
    - `edutech_backend/apps/reports/management/commands/profile_exam_write_path.py`
    - `edutech_backend/apps/reports/tests/test_profile_exam_write_path_command.py`
    - `edutech_backend/apps/exams/services.py`
    - `edutech_backend/apps/economy/services.py`
    - `cd edutech_backend && ./.venv/bin/python manage.py test apps.reports.tests.test_profile_exam_write_path_command`
    - `cd edutech_backend && ./.venv/bin/python manage.py profile_exam_write_path --repeat 1`
  - Remaining work:
    - inspect the remaining option and notification work inside `publish_exam` before deciding whether another local pass is worth it
    - extend Phase 2 profiling to access-policy, assignment, result publish, and review-write paths

- Date: 2026-07-06
  - Phase: Phase 2 Backend Write Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - added a dedicated `profile_result_write_path` management command for disposable result workflow mutation profiling
    - captured the first local `generate_results_for_exam`, `calculate_exam_ranks`, and `publish_exam_results` baselines on a submitted-attempt dataset
    - collapsed repeated exam result summary counts and score-distribution bucket queries into a single aggregate pass
    - improved the first local `generate_results_for_exam` baseline from about `55` queries and `32.24ms` to a repeat-3 local baseline of `36` queries and about `12.44ms` to `19.66ms`
    - reused result-publish readiness inputs inside `publish_exam_results` so the publish path no longer reloads the same active result rows twice
    - removed the extra update on newly created exam results by setting publish-state defaults before `get_or_create`
    - merged exam-completion and score-threshold reward-rule lookups into one active reward-rule query per result generation
    - reused preloaded attempt answers and exam questions during bulk result analytics refresh
    - replaced per-row rank saves with one `bulk_update` so rank recalculation no longer triggers model validation queries per result
    - reused preloaded exam questions and prefetched answer payloads inside section-performance summary generation, and stopped issuing the extra update after creating a new performance summary row
    - improved the local `publish_exam_results` baseline from about `27` queries and `8.88ms` to about `18` queries and `6.92ms` to `8.68ms`
  - Evidence:
    - `edutech_backend/apps/reports/management/commands/profile_result_write_path.py`
    - `edutech_backend/apps/reports/tests/test_profile_result_write_path_command.py`
    - `edutech_backend/apps/results/services.py`
    - `edutech_backend/apps/economy/services.py`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.reports.tests.test_profile_result_write_path_command apps.economy.tests.test_services apps.results.tests.test_smoke_flow`
    - `cd edutech_backend && ./.venv/bin/python manage.py profile_result_write_path --repeat 3`
  - Remaining work:
    - extend Phase 2 profiling to access-policy mutation families
    - inspect batch recheck and bulk moderation flows for the next review-write reduction

- Date: 2026-07-06
  - Phase: Phase 2 Backend Write Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - added a dedicated `profile_review_write_path` management command for disposable descriptive-grading mutation profiling
    - expanded the profiler to include `request_review_recheck`, `bulk_request_recheck_two_tasks`, and `bulk_moderate_two_tasks`
    - replaced validated `save()` calls with direct row updates in claim, review, recheck, moderation, and attempt-score refresh paths where service-level invariants were already enforced
    - added a batch moderation helper that groups tasks by attempt and recalculates attempt score plus result generation only once per attempt during bulk moderation
    - added a batch recheck helper that directly updates reviewed answers and tasks and bulk-creates review events during bulk recheck
    - fixed the failing integrity-threshold path by invalidating cached attempt integrity summaries before recomputing threshold state inside `log_integrity_event`
    - improved the local review-write baseline from `24` to `16` queries for task claim, from `57` to `23` queries for teacher review submission, from `35` to `18` queries for single-task recheck, from `36` to `17` queries for two-task bulk recheck, from `63` to `26` queries for moderation, and from `88` to `65` queries for two-task bulk moderation
  - Evidence:
    - `edutech_backend/apps/reports/management/commands/profile_review_write_path.py`
    - `edutech_backend/apps/reports/tests/test_profile_review_write_path_command.py`
    - `edutech_backend/apps/attempts/services.py`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.reports.tests.test_profile_review_write_path_command`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_teacher_can_submit_review_via_review_task_endpoint`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_institute_admin_can_assign_review_task_to_teacher`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_request_recheck_returns_task_to_pending_scoring`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_institute_admin_can_bulk_request_recheck`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_institute_admin_can_moderate_review_task`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_institute_admin_can_bulk_moderate_reviewed_tasks`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_integrity_event_endpoint_auto_submits_after_violation_threshold apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_integrity_event_threshold_respects_accommodation_allowance`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.attempts.tests.test_attempt_workspace_api`
    - `cd edutech_backend && ./.venv/bin/python manage.py profile_review_write_path --repeat 2`
  - Remaining work:
    - reduce duplicate exam/attempt/question loads inside `bulk_moderate_two_tasks`
    - extend the same full-pass confidence rerun habit to adjacent attempt/result suites after the next write-path changes

- Date: 2026-07-06
  - Phase: Phase 2 Backend Write Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - updated the bulk moderation path so `moderate_review_task` can buffer review events without calling validated per-row saves during batch execution
    - switched `bulk_moderate_review_tasks` to bulk-create the buffered moderation events once per batch instead of creating each event individually
    - reduced the local two-task moderation baseline from `65` queries and about `19.30ms` to `20.35ms` down to `48` queries and about `13.55ms` to `13.77ms`
  - Evidence:
    - `edutech_backend/apps/attempts/services.py`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_institute_admin_can_bulk_moderate_reviewed_tasks apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_institute_admin_can_moderate_review_task apps.reports.tests.test_profile_review_write_path_command`
    - `cd edutech_backend && ./.venv/bin/python manage.py profile_review_write_path --repeat 2`
  - Remaining work:
    - trim the duplicate pre-batch attempt and exam-question hydration that still shows up ahead of the moderation loop
    - decide whether the single-task moderation path should keep validated event saves or adopt the same buffering helper through a shared lower-level event factory

- Date: 2026-07-06
  - Phase: Phase 2 Backend Write Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - replaced duplicate lazy relation hydration in `bulk_moderate_review_tasks` with one `select_related(...)` review-task batch reload
    - removed an eager `setdefault(...)` pattern that was still causing duplicate exam-question fetch work during bulk moderation setup
    - reduced the local two-task moderation query count again from `48` down to `32`
  - Evidence:
    - `edutech_backend/apps/attempts/services.py`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_institute_admin_can_bulk_moderate_reviewed_tasks apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_institute_admin_can_moderate_review_task apps.reports.tests.test_profile_review_write_path_command`
    - `cd edutech_backend && ./.venv/bin/python manage.py profile_review_write_path --repeat 2`
  - Remaining work:
    - inspect why the lower-query moderation batch still shows variable local elapsed time instead of a matching latency drop
    - decide whether to continue squeezing review moderation or shift the next Phase 2 pass to another institute/admin mutation family

- Date: 2026-07-06
  - Phase: Phase 2 Backend Write Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - extracted the moderation core into a shared helper so batch moderation can run inside one outer `transaction.atomic()` block
    - removed the per-task transaction boundaries that the bulk moderation path was still paying while reusing the single-task moderated service wrapper for existing callers
    - reduced the local two-task moderation query count again from `32` down to `30`
  - Evidence:
    - `edutech_backend/apps/attempts/services.py`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_institute_admin_can_bulk_moderate_reviewed_tasks apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_institute_admin_can_moderate_review_task apps.reports.tests.test_profile_review_write_path_command`
    - `cd edutech_backend && ./.venv/bin/python manage.py profile_review_write_path --repeat 2`
  - Remaining work:
    - isolate and trim the result-generation portion that now dominates the remaining bulk moderation latency
    - decide whether another review-workflow reduction is worth it before switching the next Phase 2 pass to a different institute/admin mutation surface

- Date: 2026-07-06
  - Phase: Phase 2 Backend Write Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - preloaded `attempt__exam__subject` and `attempt__institute` context into the bulk moderation task hydration path so result generation can reuse them without extra lazy queries
    - replaced the existing-result update path in `generate_result_from_attempt` with a direct row update instead of a validated `save()`
    - reduced the local two-task moderation baseline again from `30` queries down to `22`, with elapsed time improving from about `17.51ms` to `18.69ms` down to about `16.61ms` to `17.32ms`
  - Evidence:
    - `edutech_backend/apps/attempts/services.py`
    - `edutech_backend/apps/results/services.py`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_institute_admin_can_bulk_moderate_reviewed_tasks apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_institute_admin_can_moderate_review_task apps.reports.tests.test_profile_review_write_path_command`
    - `cd edutech_backend && ./.venv/bin/python manage.py profile_review_write_path --repeat 2`
  - Remaining work:
    - decide whether the remaining reward-processing and result-publication queries are acceptable for Phase 2 or worth another special-case optimization
    - shift the next mutation-profiler pass toward the next highest-value institute/admin mutation family once this review-write path is judged sufficient

- Date: 2026-07-06
  - Phase: Phase 2 Backend Write Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - added a dedicated `profile_economy_admin_write_path` management command for disposable admin-economy mutation profiling
    - captured the first local baseline for reward-rule create/update and content-access-policy create/update
    - confirmed that this first admin-economy mutation slice is already locally healthy enough to defer optimization for now
  - Evidence:
    - `edutech_backend/apps/reports/management/commands/profile_economy_admin_write_path.py`
    - `edutech_backend/apps/reports/tests/test_profile_economy_admin_write_path_command.py`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.reports.tests.test_profile_economy_admin_write_path_command`
    - `cd edutech_backend && ./.venv/bin/python manage.py profile_economy_admin_write_path --repeat 2`
  - Remaining work:
    - extend the same profiler-first baseline coverage to the next institute/admin mutation family such as package entitlements, unlock rules, or subscription-request review
    - revisit reward-rule or content-access-policy optimization only if stage-density data later shows heavier real-world cost than the current local baseline

- Date: 2026-07-06
  - Phase: Phase 2 Backend Write Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - added a dedicated `profile_question_bank_entitlement_write_path` management command for disposable package-entitlement and feature-entitlement mutation profiling
    - captured the first local baseline for question-bank entitlement grant/update and feature-entitlement grant/update
    - reduced the two entitlement status-transition paths by replacing validated service-layer saves with direct updates while preserving cache invalidation and usage-ledger side effects
  - Evidence:
    - `edutech_backend/apps/reports/management/commands/profile_question_bank_entitlement_write_path.py`
    - `edutech_backend/apps/reports/tests/test_profile_question_bank_entitlement_write_path_command.py`
    - `edutech_backend/apps/economy/services.py`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.economy.tests.test_services.EconomyServicesTestCase.test_question_bank_feature_lookup_uses_cache_and_invalidates_on_revoke apps.economy.tests.test_services.EconomyServicesTestCase.test_bulk_master_question_access_summaries_cache_and_invalidate_entitlements apps.reports.tests.test_profile_question_bank_entitlement_write_path_command`
    - `cd edutech_backend && ./.venv/bin/python manage.py profile_question_bank_entitlement_write_path --repeat 2`
  - Remaining work:
    - decide whether `grant_question_bank_entitlement` is worth a deeper pass, since it remains the heaviest step in this entitlement family
    - extend profiler-first coverage to the next admin/operator mutation family after entitlements, likely unlock rules or subscription-request review

- Date: 2026-07-06
  - Phase: Phase 2 Backend Write Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - replaced validated create-path saves in `grant_institute_question_bank_entitlement` and `record_institute_question_usage` with direct inserts inside the service-owned entitlement grant flow
    - reduced `grant_question_bank_entitlement` from `15` queries down to `5`
    - reduced `update_question_bank_entitlement_status` further from `9` queries down to `4`
  - Evidence:
    - `edutech_backend/apps/economy/services.py`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.economy.tests.test_services.EconomyServicesTestCase.test_grant_institute_question_bank_entitlement_is_idempotent_for_live_row apps.economy.tests.test_services.EconomyServicesTestCase.test_question_bank_feature_lookup_uses_cache_and_invalidates_on_revoke apps.economy.tests.test_services.EconomyServicesTestCase.test_bulk_master_question_access_summaries_cache_and_invalidate_entitlements apps.reports.tests.test_profile_question_bank_entitlement_write_path_command`
    - `cd edutech_backend && ./.venv/bin/python manage.py profile_question_bank_entitlement_write_path --repeat 2`
  - Remaining work:
    - decide whether `grant_feature_entitlement` still deserves a similar create-path reduction or is already healthy enough to defer
    - move to the next uncovered admin/operator mutation family after this entitlement slice, likely unlock rules or subscription-request review

- Date: 2026-07-06
  - Phase: Phase 2 Backend Write Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - replaced validated create-path saves in `grant_institute_feature_entitlement` with a direct insert for the create branch and a direct update for the restore branch
    - reduced `grant_feature_entitlement` from `10` queries down to `4`
    - completed a broad entitlement-family hardening pass that now leaves all four measured entitlement mutations locally healthy
  - Evidence:
    - `edutech_backend/apps/economy/services.py`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.economy.tests.test_services.EconomyServicesTestCase.test_grant_institute_feature_entitlement_enables_feature_lookup apps.economy.tests.test_services.EconomyServicesTestCase.test_question_bank_feature_lookup_uses_cache_and_invalidates_on_revoke apps.reports.tests.test_profile_question_bank_entitlement_write_path_command`
    - `cd edutech_backend && ./.venv/bin/python manage.py profile_question_bank_entitlement_write_path --repeat 2`
  - Remaining work:
    - move to the next uncovered admin/operator mutation family after entitlements, likely unlock rules or subscription-request review
    - revisit entitlement flows only if stage-density data later shows higher real-world cost than the current local baseline

- Date: 2026-07-06
  - Phase: Phase 2 Backend Write Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - added a dedicated `profile_subscription_request_write_path` management command for disposable subscription-request create/approve/reject mutation profiling
    - replaced validated request creation and review saves with explicit service-level checks plus direct inserts/updates in the subscription-request workflow
    - reduced `create_subscription_request` from `10` queries down to `6`, `approve_subscription_request` from `20` down to `13`, and `reject_subscription_request` from `11` down to `4`
  - Evidence:
    - `edutech_backend/apps/reports/management/commands/profile_subscription_request_write_path.py`
    - `edutech_backend/apps/reports/tests/test_profile_subscription_request_write_path_command.py`
    - `edutech_backend/apps/economy/services.py`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.economy.tests.test_api.EconomyApiTestCase.test_platform_admin_can_review_subscription_request_and_apply_entitlements apps.reports.tests.test_profile_subscription_request_write_path_command`
    - `cd edutech_backend && ./.venv/bin/python manage.py profile_subscription_request_write_path --repeat 2`
  - Remaining work:
    - decide whether the remaining `approve_subscription_request` overhead is acceptable now that most of it is concentrated in entitlement application rather than request-row validation
    - extend profiler-first coverage to the next uncovered admin/operator mutation family after subscription review, likely unlock rules

- Date: 2026-07-06
  - Phase: Phase 2 Backend Write Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - added a dedicated `profile_unlock_rule_write_path` management command for disposable unlock-rule create/update mutation profiling
    - captured the first local baseline for unlock-rule create and update flows
    - confirmed this unlock-rule slice is already locally healthy enough to defer optimization for now
  - Evidence:
    - `edutech_backend/apps/reports/management/commands/profile_unlock_rule_write_path.py`
    - `edutech_backend/apps/reports/tests/test_profile_unlock_rule_write_path_command.py`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.reports.tests.test_profile_unlock_rule_write_path_command`
    - `cd edutech_backend && ./.venv/bin/python manage.py profile_unlock_rule_write_path --repeat 2`
  - Remaining work:
    - decide whether the remaining `approve_subscription_request` overhead is acceptable now that most of it is concentrated in entitlement application rather than request-row validation
    - extend profiler-first coverage to any remaining uncovered admin/operator mutation families after unlock rules

- Date: 2026-07-06
  - Phase: Phase 2 Backend Write Path Optimization
  - Status change: from `partially complete` to `partially complete`
  - What was completed:
    - flattened nested transaction wrappers in the subscription approval flow by introducing shared internal helpers for entitlement grant/application and reusing them from the request-review path
    - reduced `approve_subscription_request` from `13` queries down to `9`
    - confirmed the subscription review family is now much closer to the locally healthy admin mutation slices
  - Evidence:
    - `edutech_backend/apps/economy/services.py`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.economy.tests.test_api.EconomyApiTestCase.test_platform_admin_can_review_subscription_request_and_apply_entitlements apps.reports.tests.test_profile_subscription_request_write_path_command`
    - `cd edutech_backend && ./.venv/bin/python manage.py profile_subscription_request_write_path --repeat 2`
  - Remaining work:
    - decide whether the remaining `approve_subscription_request` overhead is acceptable now that the path is down to `9` queries and mostly reflects actual entitlement work
    - extend profiler-first coverage to any still-unmeasured mutation families or shift Phase 2 attention toward stage-density validation for the already-profiled write paths

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

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - applied a shared results-workspace structural cleanup pass across the heaviest teacher and institute route family
    - reduced repeated builder and attempt-inspection handoffs inside `results-workspace/page.tsx`
    - replaced two dense filter-link matrices with compact GET forms inside the shared results analysis workspace
    - revalidated both operator trace bundles after the pass
  - Evidence:
    - `edutech_web/src/features/results-workspace/page.tsx`
    - `edutech_web/src/app/(student)/app/attempts/[attemptId]/summary/page.tsx`
    - `edutech_web/src/app/(student)/app/attempts/[attemptId]/review/page.tsx`
    - `edutech_web/src/app/(student)/app/results/page.tsx`
    - `cd edutech_web && npm run test:e2e:trace:teacher-phase3`
    - `cd edutech_web && npm run test:e2e:trace:institute-phase3`
  - Remaining work:
    - compare trace artifacts to confirm whether fetch churn dropped materially on shared results routes
    - continue only with evidence-backed shared workspace reductions instead of broad local link cleanup
    - decide whether the next frontend pass should stay on shared results or move to institute exams based on trace comparison

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - compared fresh shared-results trace artifacts against the earlier teacher and institute baselines
    - confirmed a meaningful reduction on teacher shared-results routes after the structural cleanup wave
    - confirmed that institute results itself remained essentially flat, while institute reviews improved only modestly
  - Evidence:
    - `edutech_web/test-results/workflow-teacher-results-w-c9260-igate-the-results-workspace-chromium/trace.zip`
    - `edutech_web/test-results/workflow-teacher-results-a-be248--results-analysis-workspace-chromium/trace.zip`
    - `edutech_web/test-results/workflow-teacher-results-l-42fac-o-an-attempt-when-available-chromium/trace.zip`
    - `edutech_web/test-results/workflow-institute-results-f51c2-igate-the-results-workspace-chromium/trace.zip`
    - `edutech_web/test-results/workflow-institute-reviews-f2456-igate-the-reviews-workspace-chromium/trace.zip`
    - `docs/qa-runbooks/FRONTEND_TEACHER_ROUTE_TRACING_RUNBOOK.md`
    - `docs/qa-runbooks/FRONTEND_INSTITUTE_ROUTE_TRACING_RUNBOOK.md`
  - Remaining work:
    - treat institute results as the top remaining operator-side frontend hotspot
    - decide whether the next pass should target institute-results-specific route churn or pivot back to institute exams
    - re-capture a comparable raw network artifact for `teacher-reviews-workspace`, because the latest trace zip did not include `0-trace.network`

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - applied a small institute-exams-specific quick-filter reduction pass
    - revalidated the full institute trace bundle after that pass
    - confirmed that the institute exams change was safe but only modestly effective
  - Evidence:
    - `edutech_web/src/app/(institute)/institute/exams/page.tsx`
    - `cd edutech_web && npm run test:e2e:trace:institute-phase3`
    - `edutech_web/test-results/workflow-institute-exams-w-02c0e--and-use-workspace-handoffs-chromium/trace.zip`
    - `docs/qa-runbooks/FRONTEND_INSTITUTE_ROUTE_TRACING_RUNBOOK.md`
  - Remaining work:
    - stop expecting small institute-exams quick-filter trimming alone to solve operator churn
    - keep institute results as the top remaining institute-side frontend hotspot
    - isolate institute-results-specific route behavior instead of broad shared or exams-level cleanup

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - aligned the shared workspace search surface with the existing operator no-prefetch link policy
    - removed the remaining raw `next/link` usage from the shared operator search-results component
    - validated the search component change with focused linting
  - Evidence:
    - `edutech_web/src/components/ui/workspace-search-results.tsx`
    - `edutech_web/src/components/ui/operator-workspace-link.tsx`
    - `cd edutech_web && npx eslint src/components/ui/workspace-search-results.tsx`
  - Remaining work:
    - capture dedicated institute or teacher search-route traces before claiming measurable browser-churn improvement there
    - continue treating institute results as the top remaining operator-side frontend hotspot

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - refactored the shared results workspace so overview, live, attempts, leaderboard, and analysis views only fetch the datasets they actually render
    - stopped preloading attempts, question-analysis, topic-performance, and intervention-note data on the overview route
    - kept the full institute Phase 3 bundle green after the fetch-gating change
  - Evidence:
    - `edutech_web/src/features/results-workspace/page.tsx`
    - `cd edutech_web && npx eslint src/features/results-workspace/page.tsx`
    - `cd edutech_web && npm run test:e2e:trace:institute-phase3`
  - Remaining work:
    - capture a dedicated timing-oriented institute results measurement, because the current workflow trace artifact still reflects many successful cross-route workspace fetches
    - decide whether the next institute-results pass should target shared shell navigation noise or server-component route timing next

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - added dedicated Playwright timing probes for the institute results route family and the shared institute shell
    - captured the first isolated local timings for both probes
    - confirmed that neither the institute results route family nor the shared institute shell is locally slow enough in isolation to explain the broad Phase 3 route-churn totals by themselves
  - Evidence:
    - `edutech_web/tests/e2e/workflow/institute-results-timing.spec.ts`
    - `edutech_web/tests/e2e/workflow/institute-shell-timing.spec.ts`
    - `cd edutech_web && npm run test:e2e:timing:institute-results`
    - `cd edutech_web && npm run test:e2e:timing:institute-shell`
    - `docs/qa-runbooks/FRONTEND_INSTITUTE_ROUTE_TRACING_RUNBOOK.md`
  - Remaining work:
    - shift the next institute-side frontend pass toward the next specific heavy workspace rather than generic institute results overview or shared shell cleanup
    - add the same timing-probe discipline to teacher-side shared workspaces if broad operator trace totals stay misleading there

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - added a dedicated institute question-bank timing probe and captured the first isolated local baseline
    - confirmed that institute question bank is currently heavier in isolation than institute results or the shared institute shell
    - narrowed the next institute-side frontend hardening target to the question-bank list and create-entry routes
  - Evidence:
    - `edutech_web/tests/e2e/workflow/institute-question-bank-timing.spec.ts`
    - `cd edutech_web && npm run test:e2e:timing:institute-question-bank`
    - `docs/qa-runbooks/FRONTEND_INSTITUTE_ROUTE_TRACING_RUNBOOK.md`
  - Remaining work:
    - inspect the institute question-bank page structure and data-loading shape for the first targeted optimization pass
    - after that pass, rerun the dedicated question-bank timing probe before returning to broader workflow-level route-hopping analysis

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - removed extra quality-summary fetches and comprehension-preview fetching from the initial institute question-bank list render
    - revalidated the focused institute question-bank timing probe after the list-path reduction
    - confirmed that question-bank create entry remains the strongest remaining transition inside this workspace
  - Evidence:
    - `edutech_web/src/app/(institute)/institute/question-bank/page.tsx`
    - `cd edutech_web && npx eslint 'src/app/(institute)/institute/question-bank/page.tsx'`
    - `cd edutech_web && npm run test:e2e:timing:institute-question-bank`
    - `docs/qa-runbooks/FRONTEND_INSTITUTE_ROUTE_TRACING_RUNBOOK.md`
  - Remaining work:
    - inspect `/institute/question-bank/new` for the next targeted frontend bootstrap reduction
    - rerun the dedicated question-bank timing probe after the create-route pass

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - reduced the institute create-question bootstrap by moving subject, topic, and comprehension-set loading behind an internal on-demand lookup endpoint
    - kept institute duplicate-question hydration intact while shrinking the default create-route payload
    - revalidated the dedicated institute question-bank timing probe and confirmed `question-bank-create-open` improved from about `540ms` to about `428ms`
  - Evidence:
    - `edutech_web/src/app/(institute)/institute/question-bank/new/page.tsx`
    - `edutech_web/src/components/ui/teacher-question-editor.tsx`
    - `edutech_web/src/app/api/institute/question-bank/create-lookups/route.ts`
    - `cd edutech_web && npm run test:e2e:timing:institute-question-bank`
    - `docs/qa-runbooks/FRONTEND_INSTITUTE_ROUTE_TRACING_RUNBOOK.md`
  - Remaining work:
    - apply the same focused timing-probe discipline to teacher-side hotspots before choosing the next shared operator pass
    - decide whether teacher question-bank bootstrap or teacher results subview transitions should be the next code-hardening target

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - tested a shared metadata-cache experiment for institute and teacher question-bank create bootstrap dependencies
    - revalidated the focused institute and teacher question-bank timing probes on the trial build
    - removed the experiment after it failed to improve the measured create-route timings
  - Evidence:
    - `edutech_web/src/lib/api/teacher-builder.ts`
    - `cd edutech_web && npx eslint src/lib/api/teacher-builder.ts 'src/app/(institute)/institute/question-bank/new/page.tsx'`
    - `cd edutech_web && npm run test:e2e:timing:institute-question-bank`
    - `cd edutech_web && npm run test:e2e:timing:teacher-question-bank`
    - `docs/qa-runbooks/FRONTEND_INSTITUTE_ROUTE_TRACING_RUNBOOK.md`
  - Remaining work:
    - keep future institute question-bank work focused on route decomposition, payload trimming, or stage-only repeated-fetch evidence
    - continue from the stronger remaining local hotspot instead of spending more time on helper-layer caching

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - added dedicated Playwright timing probes for the teacher results route family and the teacher question-bank workspace
    - captured the first isolated teacher-side local timings for both hotspots
    - confirmed that teacher results is still elevated on filter apply and leaderboard transitions, while teacher question bank is now more clearly concentrated on create/import bootstrap cost
  - Evidence:
    - `edutech_web/tests/e2e/workflow/teacher-results-timing.spec.ts`
    - `edutech_web/tests/e2e/workflow/teacher-question-bank-timing.spec.ts`
    - `cd edutech_web && npm run test:e2e:timing:teacher-results`
    - `cd edutech_web && npm run test:e2e:timing:teacher-question-bank`
    - `docs/qa-runbooks/FRONTEND_TEACHER_ROUTE_TRACING_RUNBOOK.md`
  - Remaining work:
    - inspect the teacher question-bank create/import pages for the next bootstrap reduction pass
    - keep teacher results in the shared-results workspace queue for a narrower follow-up on filter and leaderboard transitions

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - reduced the teacher create-question bootstrap by moving subject, topic, and passage loading behind an internal on-demand lookup endpoint
    - kept duplicate-question hydration intact while shrinking the default teacher create-route payload
    - revalidated the dedicated teacher question-bank timing probe and confirmed `question-bank-create-open` improved from about `606ms` to about `351ms`
  - Evidence:
    - `edutech_web/src/app/(teacher)/teacher/question-bank/new/page.tsx`
    - `edutech_web/src/app/api/teacher/question-bank/create-lookups/route.ts`
    - `edutech_web/src/components/ui/teacher-question-editor.tsx`
    - `cd edutech_web && npx eslint 'src/app/(teacher)/teacher/question-bank/new/page.tsx' 'src/app/api/teacher/question-bank/create-lookups/route.ts'`
    - `cd edutech_web && npm run test:e2e:timing:teacher-question-bank`
    - `docs/qa-runbooks/FRONTEND_TEACHER_ROUTE_TRACING_RUNBOOK.md`
  - Remaining work:
    - move the next shared frontend hardening pass back to teacher results and the shared results workspace
    - revisit teacher question-bank import only if later isolated timing still shows entitlement or template loading as a material residual cost

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - parallelized teacher question-bank import entitlement and template loading to remove one serial server-read step from that route
    - revalidated the dedicated teacher question-bank timing probe twice after the change
    - confirmed that the cleanup is safe but not a strong enough local win to justify more teacher-import micro-optimization work
  - Evidence:
    - `edutech_web/src/app/(teacher)/teacher/question-bank/import/page.tsx`
    - `cd edutech_web && npx eslint 'src/app/(teacher)/teacher/question-bank/import/page.tsx'`
    - `cd edutech_web && npm run test:e2e:timing:teacher-question-bank`
    - `docs/qa-runbooks/FRONTEND_TEACHER_ROUTE_TRACING_RUNBOOK.md`
  - Remaining work:
    - keep future teacher question-bank work for stage validation or a stronger isolated hotspot
    - move the next local hardening pass to a module with a clearer remaining measured bottleneck

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - reduced overview-route leaderboard fetching in the shared results workspace so the overview path no longer requests a full leaderboard page just to render readiness signals
    - revalidated the dedicated teacher results timing probe after the shared results change
    - confirmed `overview-filter-apply` improved from about `1095ms` to about `551ms`
  - Evidence:
    - `edutech_web/src/features/results-workspace/page.tsx`
    - `cd edutech_web && npx eslint src/features/results-workspace/page.tsx`
    - `cd edutech_web && npm run test:e2e:timing:teacher-results`
    - `docs/qa-runbooks/FRONTEND_TEACHER_ROUTE_TRACING_RUNBOOK.md`
  - Remaining work:
    - inspect the dedicated leaderboard route next because `leaderboard-open` remains the clearest isolated teacher-results residual hotspot
    - keep future shared-results changes narrow and timing-led so improvement remains attributable

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - compacted the shared exam sidebar on non-overview results routes so leaderboard, live, attempts, and analysis no longer render the full overview browsing surface
    - revalidated the dedicated teacher results timing probe after the shared sidebar compaction
    - confirmed that shared subview chrome was part of the residual cost, with the clearest gain appearing on analysis while leaderboard improved only modestly
  - Evidence:
    - `edutech_web/src/features/results-workspace/page.tsx`
    - `cd edutech_web && npx eslint src/features/results-workspace/page.tsx`
    - `cd edutech_web && npm run test:e2e:timing:teacher-results`
    - `docs/qa-runbooks/FRONTEND_TEACHER_ROUTE_TRACING_RUNBOOK.md`
  - Remaining work:
    - treat the backend leaderboard API as sufficiently healthy locally and keep the next pass on shared frontend route composition
    - inspect the remaining top-of-page shared navigation and context blocks if teacher-results route timing needs another local pass

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - compacted the shared top shell so non-overview result routes no longer render the full outcome-control hero and five-card overview summary grid
    - revalidated the dedicated teacher results timing probe after the top-shell reduction
    - confirmed that the isolated teacher leaderboard transition is now locally plateaued for these small shared-shell cuts
  - Evidence:
    - `edutech_web/src/features/results-workspace/page.tsx`
    - `cd edutech_web && npx eslint src/features/results-workspace/page.tsx`
    - `cd edutech_web && npm run test:e2e:timing:teacher-results`
    - `docs/qa-runbooks/FRONTEND_TEACHER_ROUTE_TRACING_RUNBOOK.md`
  - Remaining work:
    - stop spending more local micro-optimizations on the teacher leaderboard route unless a new stronger hypothesis appears
    - pivot the next frontend pass toward student result/review routes or another module with a clearer remaining timing signal

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - shifted `/admin/economy` overview to default to the lighter `policy` subsection instead of the fully expanded lane
    - replaced the overview boundary lane's full student-list dependency with a cheaper student count while keeping the full roster only for support operations
    - deferred question-bank usage hydration on overview until the usage subsection is explicitly selected
    - revalidated the dedicated admin economy timing probe twice and confirmed the warm local route family now lands around `overview 0.16s`, `catalog 0.19s`, `question-bank 0.95s`, and `support-ops 0.17s`
  - Evidence:
    - `edutech_web/src/app/(admin)/admin/economy/page.tsx`
    - `cd edutech_web && npm run build`
    - `cd edutech_web && npm run test:e2e:timing:admin-economy`
    - `docs/qa-runbooks/FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md`
  - Remaining work:
    - treat `question-bank-open` as the only still-notable admin economy transition inside this route family
    - move the active frontend queue back to shared operator hotspots unless a new admin economy regression appears

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - split admin economy question-bank package editor lookups out of the initial workspace payload so programs, subjects, and topics now load lazily only when the editor view is actually opened
    - set the admin question-bank package workspace to land on the lighter catalog view first, while preserving on-demand editor hydration through a dedicated internal lookup route
    - revalidated the dedicated admin economy timing probe and confirmed the latest warm local route family now lands around `overview 0.19s`, `catalog 0.23s`, `question-bank 1.49s`, and `support-ops 0.11s`
  - Evidence:
    - `edutech_web/src/app/(admin)/admin/economy/page.tsx`
    - `edutech_web/src/app/api/admin/economy/question-bank-package-lookups/route.ts`
    - `edutech_web/src/components/admin/economy-question-bank-admin-workspace.tsx`
    - `edutech_web/src/components/admin/economy-question-bank-package-management-card.tsx`
    - `cd edutech_web && npm run build`
    - `cd edutech_web && npm run test:e2e:timing:admin-economy`
    - `docs/qa-runbooks/FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md`
  - Remaining work:
    - keep `question-bank-open` as the only still-notable admin economy transition inside this route family
    - target the next pass at package-list payload size, package summary fan-out, or server-side route composition rather than editor bootstrap lookups

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - switched admin economy question-bank package route bootstrapping to a compact list payload on first load and preserved full package detail only for explicit edit actions
    - added compact-mode support to the backend question-bank package list endpoint and updated the frontend package editor to hydrate full package detail on demand
    - revalidated the dedicated admin economy timing probe and confirmed the latest warm local route family now lands around `overview 0.22s`, `catalog 0.22s`, `question-bank 0.92s`, and `support-ops 0.13s`
  - Evidence:
    - `edutech_backend/apps/economy/views/__init__.py`
    - `edutech_backend/apps/economy/serializers/__init__.py`
    - `edutech_backend/apps/economy/tests/test_api.py`
    - `edutech_web/src/app/(admin)/admin/economy/page.tsx`
    - `edutech_web/src/app/api/admin/economy/question-bank-packages/route.ts`
    - `edutech_web/src/components/admin/economy-question-bank-admin-workspace.tsx`
    - `edutech_web/src/components/admin/economy-question-bank-package-management-card.tsx`
    - `edutech_web/src/components/admin/economy-question-bank-visibility-card.tsx`
    - `cd edutech_backend && ./.venv/bin/python manage.py test --keepdb apps.economy.tests.test_api.EconomyApiTestCase.test_platform_admin_can_view_compact_question_bank_package_overview`
    - `cd edutech_web && npm run build`
    - `cd edutech_web && npm run test:e2e:timing:admin-economy`
    - `docs/qa-runbooks/FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md`
  - Remaining work:
    - keep `question-bank-open` as the only still-notable admin economy transition inside this route family
    - treat the next pass as a smaller package-visibility or plan-lane follow-up rather than another broad payload split

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - switched non-overview shared results routes to a compact exam bootstrap so leaderboard, live, attempts, and analysis no longer wait on the full exam inventory request path
    - revalidated the shared workspace with both teacher and institute timing probes plus a production build
    - confirmed the clearest measured gain on a warm teacher rerun is `leaderboard-open`, which dropped from about `858ms` to about `389ms`, while institute results remained healthy on the shared route after the same change
  - Evidence:
    - `edutech_web/src/features/results-workspace/page.tsx`
    - `cd edutech_web && npm run build`
    - `cd edutech_web && npm run test:e2e:timing:teacher-results`
    - `cd edutech_web && npm run test:e2e:timing:institute-results`
    - `docs/qa-runbooks/FRONTEND_TEACHER_ROUTE_TRACING_RUNBOOK.md`
    - `docs/qa-runbooks/FRONTEND_INSTITUTE_ROUTE_TRACING_RUNBOOK.md`
  - Remaining work:
    - keep the next shared-results pass focused on route-specific residuals instead of another broad bootstrap rewrite
    - move the active frontend queue back to `/admin/economy` overview or the strongest remaining shared operator hotspot

- Date: 2026-07-06
  - Phase: Phase 3 Frontend Baseline And Route Profiling
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - added dedicated Playwright timing probes for the student results workspace, post-submit summary route, and answer-review route
    - captured the first isolated student-side local timings across all three post-submit lanes
    - confirmed that student results, summary, and review are all locally healthy in isolation and should not be the next local frontend micro-optimization target
  - Evidence:
    - `edutech_web/tests/e2e/workflow/student-results-timing.spec.ts`
    - `edutech_web/tests/e2e/workflow/student-summary-timing.spec.ts`
    - `edutech_web/tests/e2e/workflow/student-review-timing.spec.ts`
    - `cd edutech_web && npm run test:e2e:timing:student-results`
    - `cd edutech_web && npm run test:e2e:timing:student-summary`
    - `cd edutech_web && npm run test:e2e:timing:student-review`
    - `docs/qa-runbooks/FRONTEND_STUDENT_ROUTE_TRACING_RUNBOOK.md`
  - Remaining work:
    - keep these student timing probes as regression baselines
    - pivot the next frontend hardening pass toward another module with materially heavier isolated route timings

- Date: 2026-07-06
  - Phase: Phase 1 Backend Baseline And Measurement Setup
  - Status change: from `in progress` to `in progress`
  - What was completed:
    - added a dedicated `teacher_results_leaderboard` route label to the backend operational profiler
    - updated the backend operational profiling runbook with a focused teacher leaderboard command
    - captured the first isolated local backend baseline for the teacher leaderboard API and confirmed it is not the main bottleneck
  - Evidence:
    - `edutech_backend/apps/reports/management/commands/profile_operational_routes.py`
    - `edutech_backend/apps/reports/tests/test_profile_operational_routes_command.py`
    - `docs/qa-runbooks/BACKEND_OPERATIONAL_ROUTE_PROFILING_RUNBOOK.md`
    - `cd edutech_backend && ./.venv/bin/python manage.py test apps.reports.tests.test_profile_operational_routes_command`
    - `cd edutech_backend && ./.venv/bin/python manage.py profile_operational_routes --route-label teacher_results_leaderboard --repeat 1 --include-query-sql`
  - Remaining work:
    - keep the next teacher leaderboard optimization pass on frontend route composition and render cost, not backend query tuning
    - add institute-side leaderboard profiling only if later frontend timing shows a role-specific backend difference worth isolating

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
