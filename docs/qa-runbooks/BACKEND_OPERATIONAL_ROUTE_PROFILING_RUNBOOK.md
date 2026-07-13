# Backend Operational Route Profiling Runbook

Last updated: 2026-07-07

## Purpose

Use this runbook to measure backend route performance for the operational surfaces we hardened after the analytics read paths:

- institute dashboard summary
- teacher exam list
- teacher results summary
- review queue summary
- master question library
- student exam discovery and student result lists
- student wallet and subscription surfaces
- admin economy catalog and entitlement surfaces
- notifications
- parent dashboard and parent alerts

This runbook complements:

- [BACKEND_ANALYTICS_PERFORMANCE_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/BACKEND_ANALYTICS_PERFORMANCE_RUNBOOK.md)
- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
- [STAGE_IMPORT_VALIDATION_WINDOW_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_IMPORT_VALIDATION_WINDOW_CHECKLIST.md)

## Profiler Command

Run:

```bash
cd /Users/ansh/Documents/Eductech/edutech_backend
./.venv/bin/python manage.py profile_operational_routes --repeat 1
```

Default demo users:

- `demo-institute-admin`
- `demo-teacher`
- `demo-platform-admin`
- `demo-student`
- `demo-parent`

Override usernames if needed:

```bash
./.venv/bin/python manage.py profile_operational_routes \
  --institute-admin-username demo-institute-admin \
  --teacher-username demo-teacher \
  --platform-admin-username demo-platform-admin \
  --student-username demo-student \
  --parent-username demo-parent \
  --repeat 3
```

Profile one route at a time when narrowing the next optimization:

```bash
./.venv/bin/python manage.py profile_operational_routes \
  --route-label master_question_library \
  --repeat 1
```

Include captured SQL samples when you need to see which queries make up the route budget:

```bash
./.venv/bin/python manage.py profile_operational_routes \
  --route-label master_question_library \
  --repeat 1 \
  --include-query-sql
```

Profile the teacher leaderboard route directly when narrowing the remaining results-workspace hotspot:

```bash
./.venv/bin/python manage.py profile_operational_routes \
  --route-label teacher_results_leaderboard \
  --repeat 1 \
  --include-query-sql
```

## What It Measures

For each supported route, the profiler records:

- cold elapsed time
- warm elapsed time
- SQL query count
- response size hint
- optional SQL samples for each measured run

Current route set:

- `GET /api/v1/institute/dashboard/summary/`
- `GET /api/v1/teacher/exams/?page=1&page_size=10&filter=all&sort=recommended`
- `GET /api/v1/teacher/results/summary/`
- `GET /api/v1/results/exam/{teacher_exam_id}/leaderboard/?page=1&page_size=6`
- `GET /api/v1/attempts/review-tasks/summary/`
- `GET /api/v1/question-bank/master-library/?page=1&page_size=10`
- `GET /api/v1/student/exams/available/`
- `GET /api/v1/student/attempts/`
- `GET /api/v1/student/results/`
- `GET /api/v1/economy/wallet/`
- `GET /api/v1/economy/subscriptions/`
- `GET /api/v1/notifications/?page=1&page_size=10&ordering=newest`
- `GET /api/v1/notifications/unread-count/`
- `GET /api/v1/economy/admin/catalog-overview/`
- `GET /api/v1/economy/admin/question-bank-packages/`
- `GET /api/v1/economy/admin/question-bank-entitlements/`
- `GET /api/v1/economy/admin/institute-question-bank-entitlements/`
- `GET /api/v1/parent/dashboard/summary/`
- `GET /api/v1/parent/alerts/`

New focused route labels for one-at-a-time profiling:

- `question_bank_questions_compact`
- `question_bank_passages_list`
- `teacher_results_leaderboard`
- `student_available_exams`
- `student_exam_detail`
- `student_attempt_list`
- `student_attempt_detail`
- `student_attempt_summary`
- `student_attempt_review`
- `student_result_list`
- `student_wallet`
- `student_subscriptions`
- `admin_economy_catalog_overview`
- `admin_question_bank_packages`
- `admin_question_bank_entitlements`
- `institute_scoped_question_bank_entitlements`

If a route is not available for the seeded user or feature configuration, it is reported as `skipped`.

Note:

- parent routes may be skipped if the selected parent user has no active linked child in the current demo data

## When To Use It

Use this command when:

- a backend hardening pass lands on an institute, admin, teacher, notification, or parent read path
- a backend hardening pass lands on student discovery, student history, or economy support read paths
- a route feels slower than expected even though tests are green
- we want proof before changing confidence on the performance lane

## Suggested Workflow

1. Seed demo data if needed.
2. Save a before snapshot.
3. Make one backend hardening change.
4. Re-run the profiler.
5. Compare cold and warm query counts and elapsed time.

Example:

```bash
./.venv/bin/python manage.py profile_operational_routes --repeat 3 \
  > /tmp/operational-routes-before.json

# apply change

./.venv/bin/python manage.py profile_operational_routes --repeat 3 \
  > /tmp/operational-routes-after.json
```

## First Local Signal

On local demo data with `--repeat 1`, the first useful operational baseline was:

- `institute_dashboard_summary`: cold `13` queries, warm `1`
- `teacher_results_summary`: cold `1` query
- `review_queue_summary`: cold `1` query
- `notification_unread_count`: cold `1` query
- `master_question_library`: originally the slowest measured route in this operational set

After the master-library pagination-first hardening pass, the same route improved materially:

- `master_question_library`: cold `26.75ms`, warm `23.13ms`
- query count stayed low at `7` cold and `6` warm

After a follow-up shared-library feature-entitlement cache pass, the same route improved again on repeat access:

- `master_question_library`: warm query count dropped from `6` to `5`
- warm route time moved to about `21.7ms`
- targeted SQL sampling showed the cached query that disappeared was the shared-library feature entitlement `.exists()` check

After moving `access_status` into the paginated master-question query as a subquery annotation, the route improved once more:

- `master_question_library`: warm query count dropped from `5` to `4`
- warm route time stayed around `21.88ms`
- targeted SQL sampling showed the standalone `InstituteQuestionAccess` query disappeared from the warm path

After caching the active question-bank entitlement snapshot with prefetched active scopes inside the bulk access-summary path, the route tightened again:

- `master_question_library`: warm query count dropped from `4` to `2`
- warm-route SQL is now essentially just paginator `COUNT` plus paginated page fetch
- local warm route time in the sampled run was about `26.56ms`, so the query reduction is clear even though one-off latency can still move around

After caching notification-list summary and filter-bucket metadata per user, the notification route also moved close to its local floor:

- `notification_list`: warm query count dropped from `5` to `2`
- warm route time moved to about `1.51ms`
- targeted SQL sampling showed the summary aggregate plus both filter-bucket queries disappeared from the warm path, leaving only paginator `COUNT` and page fetch

After the teacher exam-list access-policy hydration fix, that route also improved materially:

- `teacher_exam_list`: query count dropped from `24` to `4`
- local measured route time moved to about `46.8ms` cold and `26.25ms` warm on the same seeded page

After a follow-up serializer-side memoization pass for exam source metadata, result visibility policy, and security policy, the same route improved again without changing SQL volume:

- `teacher_exam_list`: local measured route time moved again to about `36.55ms` cold and `25.34ms` warm
- query count stayed flat at `4`, which suggests the remaining work is mostly serializer or payload overhead rather than extra database access

After caching the active exam access-policy snapshot and reusing a shared hydration helper across teacher and exam view paths, that route improved again on repeat access:

- `teacher_exam_list`: warm query count dropped from `4` to `3`
- warm route time stayed in roughly the `25-26ms` range on local demo data
- targeted SQL sampling showed the `ContentAccessPolicy` query disappeared from the warm path, leaving paginator `COUNT`, exam page fetch, and section prefetch

That means both of the first obvious local operational hotspots have now been reduced, and the next route-level pass should be chosen from fresh profiler output instead of older intuition.

## First Expanded Student And Economy Baseline

On `2026-07-06`, after expanding the profiler to student and economy read paths, the first local baseline on demo data was:

- `student_available_exams`
  - cold `36.71ms` average, warm `25.94ms` average
  - warm query count `42`
  - SQL samples show repeated assignment and attempt lookups, making this the clearest current student-read hotspot
- `student_result_list`
  - cold `10.27ms` average, warm `4.78ms` average
  - query count `6`
  - this route looks healthy on current local demo data
- `admin_economy_catalog_overview`
  - cold `12.04ms` average, warm `6.23ms` average
  - query count `13`
  - this route looks acceptable locally, though it still deserves stage re-checking on denser catalog data
- `admin_question_bank_packages`
  - cold `544.91ms` average, warm `507.30ms` average
  - query count `34`
  - result size `27` items on the sampled run
  - SQL samples show package rows followed by scope/program/subject/topic hydration work, making this the clearest current economy-read hotspot

After prefetching `usage_entries` for the package list route and memoizing serializer-side scope and count summaries per package row, that route improved materially:

- `admin_question_bank_packages`
  - query count dropped from `34` to `8`
  - cold average moved from about `544.91ms` to `435.25ms`
  - warm average moved from about `507.30ms` to `473.17ms`
  - SQL samples show the route is no longer dominated by one query per package usage-count lookup
  - the remaining cost is mostly payload and Python-side serialization over the prefetched package/scope graph rather than obvious query fan-out

After prefetching student assignments for the student-exam discovery path, caching assignment checks inside the serializer, and reusing hydrated exam access policies during economy-access evaluation, that route also improved materially:

- `student_available_exams`
  - warm query count dropped from `42` to `22`
  - cold average moved from about `36.71ms` to `27.23ms`
  - warm average moved from about `25.94ms` to `18.55ms`
  - focused regression validation passed with `./.venv/bin/python manage.py test apps.accounts.tests.test_auth_access.AuthenticationAccessControlTestCase.test_student_available_exam_list_works_and_is_scoped --keepdb`
  - remaining SQL samples suggest the next likely savings are in notification side effects and any remaining per-exam unlock-state work rather than repeated assignment lookups

After prefetching active package scopes for entitlement rows and reusing cached scope and usage-entry lookups inside the quota-summary helpers, the entitlement list route improved even more materially:

- `admin_question_bank_entitlements`
  - query count dropped from `103` to `4`
  - cold average moved from about `106.07ms` to `20.13ms`
  - warm average moved from about `111.19ms` to `19.94ms`
  - focused regression validation passed with `./.venv/bin/python manage.py test apps.economy.tests.test_api.EconomyApiTestCase.test_platform_admin_can_view_question_bank_packages_and_entitlements --keepdb`
  - targeted SQL sampling now shows one entitlement query, one active-scope prefetch, and two usage-ledger queries on the sampled dataset instead of repeated per-row scope hydration

After prefetching nested attempt answers, exam-question media data, and active integrity events for the student attempt list route, plus reusing those prefetched objects inside serializer helpers, that route improved materially too:

- `student_attempt_list`
  - query count dropped from `43` to `26`
  - cold average moved from about `38.22ms` to `28.51ms`
  - warm average moved from about `25.26ms` to `19.65ms`
  - focused regression validation passed with `./.venv/bin/python manage.py test apps.accounts.tests.test_auth_access.AuthenticationAccessControlTestCase.test_student_cannot_see_another_students_attempts_or_results --keepdb`
  - targeted SQL sampling still shows nested answer and exam-question hydration work, so the remaining work is more about how much of the full attempt payload should stay on the list route than about obvious N+1 failures

Immediate local optimization order from this baseline:

1. `student_wallet`
2. `student_subscriptions`
3. `institute_scoped_question_bank_entitlements`
4. `student_attempt_list` payload trimming or list/detail split if this surface needs another pass

Follow-up measurements on `2026-07-06` showed that the next three candidate routes are already locally healthy on current demo data:

- `student_wallet`
  - warm average `1.52ms`
  - warm query count `4`
  - no immediate local hardening needed unless stage data shows a denser ledger or unlock-state shape
- `student_subscriptions`
  - warm average `0.94ms`
  - warm query count `1`
  - no immediate local hardening needed
- `institute_scoped_question_bank_entitlements`
  - warm average `6.46ms`
  - warm query count `4`
  - no immediate local hardening needed on the sampled `1`-row payload

That leaves `student_attempt_list` as the biggest remaining measured student-side read route in this wave, but the remaining work there now looks more like payload trimming or route-shape simplification than classic N+1 cleanup.

Follow-up profiling on `2026-07-08` exposed a newer student-side hotspot on the denser seeded account:

- `student_result_list`
  - sampled before the latest fix at warm `24.55ms` with `65` queries on a `41`-row payload
  - SQL samples showed two avoidable fan-out patterns:
    - repeated exam source metadata hydration because the route selected only `exam` but not the nested source owner graph used by the serializer
    - repeated unresolved review-task `.exists()` checks via `attempt_has_pending_manual_review()`

After switching the route to the list serializer, selecting the exam source graph up front, prefetching unresolved review tasks on each attempt, and reusing that prefetched data inside `attempt_has_pending_manual_review()`, the route improved materially:

- `student_result_list`
  - query count dropped from `65` to `2`
  - cold average moved from about `31.74ms` to `20.80ms`
  - warm average moved from about `24.55ms` to `14.11ms`
  - targeted SQL sampling now shows one result-list query plus one unresolved-review-task prefetch query instead of per-row review and source-owner fan-out
  - focused regression checks passed:
    - `./.venv/bin/python manage.py test apps.accounts.tests.test_auth_access.AuthenticationAccessControlTestCase.test_student_cannot_see_another_students_attempts_or_results --keepdb`
    - `./.venv/bin/python manage.py test apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_submitted_attempt_creates_unpublished_result_for_pending_release_modes --keepdb`

This changes the current student-read optimization order again:

1. `student_attempt_list` if we want another local payload-shape pass
2. stage or load-test validation for student discovery plus result-history routes under denser concurrent access
3. only then another local micro-optimization pass if fresh profiling still justifies it

The first local baselines for the local question-bank read routes also came back healthy on current demo data:

- `question_bank_questions_compact`
  - cold average `31.63ms`
  - warm average `13.02ms`
  - warm query count `2`
  - SQL sampling shows the route is essentially paginator `COUNT` plus the compact page fetch
- `question_bank_passages_list`
  - cold average `4.82ms`
  - warm average `2.53ms`
  - warm query count `1`
  - current demo payload is empty, so this should still be rechecked on denser stage data before calling it fully done

That means the currently measured local question-bank list routes do not justify another local optimization pass right now.

The first direct student-detail baselines also make the next detail-route priority clear:

- `student_exam_detail`
  - first baseline: warm average `28.15ms`, warm query count `38`
  - after the first detail-route pass: warm average `26.74ms`, warm query count `30`
  - after a follow-up reuse pass for economy policy and prefetched count fields: warm query count improved again to `28`
  - after trimming the student-facing serializer down to the fields the student exam page actually uses, the route improved materially again to warm average `17.81ms` and warm query count `15`
  - response shape also tightened from `78` top-level keys to `50`, which confirms that the latest win came from payload shaping as well as query reduction
  - focused regression validation passed with `./.venv/bin/python manage.py test apps.accounts.tests.test_auth_access.AuthenticationAccessControlTestCase.test_student_can_resolve_exam_by_access_key --keepdb`
- `student_attempt_detail`
  - first baseline: warm average `12.94ms`, warm query count `22`
  - this route is meaningfully lighter than `student_exam_detail` on current demo data, so it is not the immediate next hardening target
- `student_attempt_summary`
  - first direct baseline: warm average `10.95ms`, warm query count `12`
  - this route already looks locally healthy on current demo data
- `student_attempt_review`
  - first direct baseline: warm average `13.24ms`, warm query count `13`
  - this route also looks locally healthy on current demo data

That means the main student-detail payload shaping win is now in place locally, and the remaining student detail surfaces are already in a healthy range on current demo data. The next likely value comes from stage-density validation and frontend tracing rather than more local backend cleanup.

Revised immediate local optimization order from the currently measured routes:

1. stage validation for wallet, subscriptions, scoped entitlements, local question-bank list routes, and student detail routes on denser data
2. frontend tracing on the student exam detail page to confirm that render cost now matches the backend gains
3. local question-bank detail routes only if stage or UI traces show heavier payloads than the compact lists suggest
4. Phase 3 frontend route profiling for student exam and attempt pages

## Stage Teacher Question-Bank Timing Signal

On `2026-07-07`, the focused stage browser timing pass for teacher and institute operational routes showed that the teacher question-bank surface is now the clearest remaining read-latency hotspot on the shared authoring side.

Stage timing highlights from `PLAYWRIGHT_BASE_URL=https://learn.accerio.in npm run test:e2e:stage-performance`:

- `teacher-question-bank-initial`: about `2250ms`
- `teacher-question-bank-search-apply`: about `1787ms`
- `teacher-question-bank-empty-search`: about `1067ms`
- `teacher-question-bank-import-open`: about `4378ms`
- `teacher-question-bank-create-open`: about `3060ms`
- `teacher-results-overview-initial`: about `1572ms`
- `institute-question-bank-create-open`: about `1643ms`
- `institute-results-overview-return`: about `1564ms`

Interpretation:

- the current local question-bank API baselines are healthy, so this stage slowdown does not look like a compact list-query problem
- the heaviest teacher transitions are the routes that still depend on multi-call server bootstrap or feature-entitlement hydration
- `teacher/question-bank/import` is especially important because its route shape is small on paper, so a `4.3s` stage open strongly suggests real backend or auth-scope cost rather than just client rendering noise
- `teacher/question-bank/new` remains a secondary hotspot even after the earlier local lookup-deferral pass, which means the remaining cost is probably stage data volume, entitlement reads, or repeated scoped lookup fetches

Current teacher question-bank architectural observations:

- `/teacher/question-bank` still performs a large server fan-out before first render:
  - option catalog
  - programs
  - tags
  - passage page
  - institute-scoped package entitlements
  - institute-scoped feature entitlements
  - subjects
  - topics
  - question page
  - shared master-library page when feature access is enabled
  - four extra `fetchTeacherQuestionPage(...page_size=1)` calls for quality counters
- `/teacher/question-bank/import` now fetches entitlements and template in parallel, but still blocks first render on both
- `/teacher/question-bank/new` already moved subjects, topics, and passages behind `/api/teacher/question-bank/create-lookups`, but the route still depends on option catalog, type registry, programs, and optional duplicate question detail before paint

That means the next frontend/backend hardening value is not another generic list optimization. It is targeted reduction of teacher question-bank route composition and proof of which supporting endpoints dominate on stage.

## Local Import Write-Path Baseline

On `2026-07-07`, the disposable backend import profiler was re-run with a slightly denser payload:

```bash
cd /Users/ansh/Documents/Eductech/edutech_backend
./.venv/bin/python manage.py profile_question_import_write_path --repeat 1 --rows 25
```

Local baseline:

- `preview_passage_import`
  - about `35.92ms`
  - `53` queries
- `finalize_passage_import`
  - about `65.28ms`
  - `202` queries
- `preview_question_import`
  - about `39.97ms`
  - `78` queries
- `finalize_question_import`
  - about `322.57ms`
  - `533` queries

Follow-up scaling checks on the same day:

- with `--rows 100`
  - `preview_passage_import`: about `83.66ms`, `203` queries
  - `finalize_passage_import`: about `160.38ms`, `802` queries
  - `preview_question_import`: about `73.50ms`, `303` queries
  - `finalize_question_import`: about `549.56ms`, `2108` queries
- with `--rows 250`
  - `preview_passage_import`: about `196.46ms`, `503` queries
  - `finalize_passage_import`: about `346.41ms`, `2002` queries
  - `preview_question_import`: about `189.11ms`, `753` queries
  - `finalize_question_import`: about `1089.76ms`, `5258` queries

Interpretation:

- the question import write path is still acceptable for small local demo batches, but query growth is already obvious even at `25` rows
- preview is not the dominant problem locally; finalize is the real scaling concern
- finalize question import is doing enough per-row work that `100` and `250` row checks are required before we call the bulk path safe for broader teacher and institute usage
- the follow-up `100` and `250` row runs confirm that this is not a one-off blip: query growth is close to row-bound, especially on question finalize
- local elapsed time is still under control through `250` rows, but `5258` queries for `250` questions is exactly the kind of shape that will get much more expensive on stage data, under colder caches, or under concurrent use
- the stage teacher import page slowdown is therefore likely a combination of route bootstrap and backend import support cost, not just one isolated frontend problem

## Next Hardening Order

Use this order for the next performance pass:

1. Stage-measure teacher and institute import support endpoints directly.
2. Run local import write-path profiling at `--rows 100` and `--rows 250`.
3. Trim teacher question-bank base-route fan-out before first paint.
4. Re-check stage teacher question-bank timings after that route-shape reduction.
5. Only then move to concurrency or k6-style waves for the import path.

Concrete execution plan:

1. Stage timing and route attribution
   - capture teacher and institute timings for:
     - `/teacher/question-bank`
     - `/teacher/question-bank/import`
     - `/teacher/question-bank/new`
     - `/institute/question-bank/import`
     - `/institute/question-bank/new`
   - if possible, pair this with backend logs or timing headers so each page open can be mapped to the slowest API dependency

2. Local bulk-path scaling proof
   - run:
     - `./.venv/bin/python manage.py profile_question_import_write_path --repeat 1 --rows 100`
     - `./.venv/bin/python manage.py profile_question_import_write_path --repeat 1 --rows 250`
   - watch specifically for:
     - finalize-question elapsed time
     - total query count
     - repeated tag, duplicate-check, and lookup queries

3. Teacher question-bank route-shape reduction
   - strongest current candidates:
     - defer quality-summary mini-count calls until after first render
     - defer recent passage card data until after first render
     - avoid loading shared master-library preview on initial inventory load unless the user explicitly opens that lane
     - reduce entitlement hydration to a smaller feature snapshot if the page only needs boolean gating

4. Backend support-endpoint tightening
   - strongest current candidates:
     - profile institute-scoped feature-entitlement and package-entitlement endpoints on stage-sized data
     - inspect `finalize_question_import` for per-row duplicate checks and tag creation lookups that can be batched further
     - confirm whether teacher question create/import routes are paying for avoidable auth or institute-scope resolution overhead

5. Scale validation
   - after route-shape and finalize-path improvements, repeat:
     - stage timing pass
     - local `100` and `250` row import profiling
   - only escalate to larger-machine or concurrency waves after the single-user route shape is clean enough to trust

## Phase 1 Progress Update

Status: `completed on local codebase, pending stage re-measure`

What was changed in this phase:

- teacher question-bank SSR bootstrap was reduced so the page no longer blocks first render on:
  - shared master-library preview fetch
  - four extra quality mini-count fetches
  - passage preview card fetch
- shared master-library preview now hydrates after first paint from the existing teacher API proxy route
- question-bank summary cards for revision and quality now reflect visible-page counts instead of paying for extra server count calls before render
- the comprehension summary card was simplified so the route no longer waits on a passage preview payload before the main inventory is usable

Files changed in this phase:

- [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(teacher)/teacher/question-bank/page.tsx)
- [teacher-question-bank-workspace.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/teacher-question-bank-workspace.tsx)

Local validation completed:

- file-level ESLint passed on the two touched frontend files
- focused local Playwright timing probe passed:
  - `./node_modules/.bin/playwright test tests/e2e/workflow/teacher-question-bank-timing.spec.ts --project=chromium`
  - measured snapshot after the route-shape trim:
    - `question-bank-initial`: `610ms`
    - `question-bank-search-apply`: `486ms`
    - `question-bank-empty-search`: `333ms`
    - `question-bank-reset`: `77ms`
    - `question-bank-import-open`: `515ms`
    - `question-bank-create-open`: `360ms`
    - `question-create-program-select`: `34ms`

Known validation gap:

- full `tsc --noEmit` for `edutech_web` still fails because of pre-existing unrelated test-file type errors outside this hardening change

Next measurement step:

1. deploy this pass to stage
2. rerun `PLAYWRIGHT_BASE_URL=https://learn.accerio.in npm run test:e2e:stage-performance`
3. compare:
   - `teacher-question-bank-initial`
   - `teacher-question-bank-import-open`
   - `teacher-question-bank-create-open`
4. if stage improves materially, move to Phase 2: backend import finalize-path batching and institute-scoped entitlement profiling

## Phase 1 Stage Re-Measurement

Status: `completed`

Validation command:

```bash
PLAYWRIGHT_BASE_URL=https://learn.accerio.in npm run test:e2e:stage-performance
```

Stage teacher question-bank comparison:

- earlier stage baseline
  - `question-bank-initial`: `2250ms`
  - `question-bank-search-apply`: `1787ms`
  - `question-bank-empty-search`: `1067ms`
  - `question-bank-import-open`: `4378ms`
  - `question-bank-create-open`: `3060ms`
- after Phase 1 route-shape trim
  - `question-bank-initial`: `2247ms`
  - `question-bank-search-apply`: `1770ms`
  - `question-bank-empty-search`: `2179ms`
  - `question-bank-import-open`: `4479ms`
  - `question-bank-create-open`: `3095ms`

Supporting stage timings from the same run:

- `teacher-results overview-initial`: `1380ms`
- `teacher-results leaderboard-open`: `844ms`
- `institute-question-bank-initial`: `1121ms`
- `institute-question-bank-import-open`: `837ms`
- `institute-question-bank-create-open`: `1578ms`

Interpretation:

- the Phase 1 frontend route-shape trim was behavior-safe, but it did not materially improve the stage teacher question-bank hotspot
- `question-bank-initial` and `question-bank-search-apply` stayed essentially flat
- `question-bank-import-open` remained the clearest outlier and even drifted slightly worse on this run
- `question-bank-create-open` also stayed effectively flat
- because the same pass was locally healthy and stage-only gains did not appear, the remaining bottleneck is now much more likely to be backend dependency cost, stage data density, or institute-scoped entitlement/support endpoint overhead rather than just server-render fan-out in the Next.js page

Decision:

- treat Phase 1 as a useful cleanup, but not the real stage fix
- move to Phase 2 immediately

## Phase 2 Direction

Priority order:

1. profile backend support endpoints that feed teacher question-bank import and create
2. inspect and reduce institute-scoped entitlement and feature-entitlement read cost
3. batch or trim question import finalize-path work
4. only then re-run stage teacher question-bank timing

Immediate Phase 2 targets:

- `/api/v1/economy/admin/institute-question-bank-entitlements/`
- `/api/v1/economy/admin/institute-question-bank-feature-entitlements/`
- `/api/v1/question-bank/questions/import-template/`
- teacher question create lookup support path
- `finalize_question_import` duplicate-check and tag-creation flow

## Phase 2 Progress Update

Status: `in progress`

### Support Endpoint Profiling

The first backend support-endpoint pass showed that the institute-scoped entitlement reads are not the main local bottleneck:

- `institute_scoped_question_bank_entitlements`
  - warm average about `9.35ms`
  - warm query count `5`
  - sampled payload size `4`
- `institute_scoped_question_bank_feature_entitlements`
  - warm average about `2.42ms`
  - warm query count `1`
  - sampled payload size `2`

Interpretation:

- these two backend reads are locally healthy and do not justify a dedicated optimization pass right now
- stage teacher import/create slowness is therefore more likely tied to route composition under stage data, auth/environment cost, or the import/finalize backend path rather than these specific entitlement serializers

Note on `question_bank_import_template` profiling:

- the new focused profiler label was added, but the local demo teacher currently returns `403` because bulk-import feature access is not enabled in the sampled local user setup
- the endpoint implementation itself is lightweight in code: it returns static template columns plus generated CSV content after feature gating
- this means the bigger backend scaling risk remains the import preview/finalize service path, not template generation

### Import Finalize Hardening

What changed:

- replaced per-question master synchronization in `import_bulk_questions` with a batch master-question and master-option materialization path for newly imported questions
- kept the existing notification behavior intact after the batched master creation

Files changed:

- [services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/question_bank/services.py)
- [profile_operational_routes.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/reports/management/commands/profile_operational_routes.py)
- [test_profile_operational_routes_command.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/reports/tests/test_profile_operational_routes_command.py)

Validation completed:

- `./.venv/bin/python manage.py test apps.question_bank.tests.test_bulk_workflows --keepdb`
- `./.venv/bin/python manage.py test apps.reports.tests.test_profile_operational_routes_command --keepdb`

### Import Write-Path Improvement

Before the batch master-materialization pass:

- `25` rows
  - `finalize_question_import`: `322.57ms`, `533` queries
- `100` rows
  - `finalize_question_import`: `549.56ms`, `2108` queries
- `250` rows
  - `finalize_question_import`: `1089.76ms`, `5258` queries

After the batch master-materialization pass:

- `25` rows
  - `finalize_question_import`: `61.81ms`, `86` queries
- `100` rows
  - `finalize_question_import`: `188.83ms`, `311` queries
- `250` rows
  - `finalize_question_import`: `363.18ms`, `761` queries

Interpretation:

- this is a major backend improvement on the finalize path
- query growth is still row-sensitive, but the curve is materially flatter than before
- the local finalize path is now much less likely to become the first blocker when we move to denser stage import validation
- preview paths are still row-bound and may become the next import-specific backend optimization candidate if larger stage runs still feel heavy

### Next Phase 2 Move

1. stage-validate teacher and institute import preview/finalize timings with larger-row samples
2. if import UI is still slow on stage, trace the remaining cost between:
   - teacher question-bank landing route
   - import page navigation
   - preview/finalize API calls
3. only return to entitlement-read optimization if stage data shows denser payload behavior than local profiling did

### Current Stage Constraint Read

On `2026-07-07`, the latest stage import-validation pass showed:

- institute import route is available on stage after granting `QUESTION_BANK_BULK_IMPORT` to `DLI001`
  - instrumented browser output reported:
    - `{"lane":"question","result":"available"}`
    - `{"lane":"comprehension","result":"available"}`
- teacher import route is also available on stage under the same institute entitlement
  - instrumented browser output reported:
    - `{"lane":"question","result":"available"}`
    - `{"lane":"comprehension","result":"available"}`
- a dedicated larger-row stage preview spec now exists:
  - [institute-question-import-preview-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/institute-question-import-preview-timing.spec.ts)
- a dedicated larger-row stage finalize spec now exists:
  - [institute-question-import-finalize-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/institute-question-import-finalize-timing.spec.ts)
- the controlled validation window now produced real stage import measurements:
  - institute larger-row preview timing passed on `2026-07-07`
    - `25` rows: `874ms`
    - `100` rows: `1883ms`
    - `250` rows: `2379ms`
    - follow-up expanded preview sweep on the same day also passed:
      - `25` rows: `942ms`
      - `100` rows: `1366ms`
      - `250` rows: `2384ms`
      - `500` rows: `3405ms`
    - repeatability sweep `A` after cooldown spacing also passed:
      - `25` rows: `937ms`
      - `100` rows: `2355ms`
      - `250` rows: `2425ms`
      - `500` rows: `3511ms`
    - repeatability sweep `B` after cooldown spacing also passed:
      - `25` rows: `938ms`
      - `100` rows: `1346ms`
      - `250` rows: `2363ms`
      - `500` rows: `3430ms`
  - institute mutable import finalize passed on `2026-07-07`
  - teacher mutable import finalize passed on `2026-07-07`
  - dedicated institute `500`-row finalize timing also passed on `2026-07-07`
    - preview `500`: `3946ms`
    - finalize `500`: `8750ms`
    - full run including cleanup completed in about `3.0m`
  - first small two-user concurrency wave also passed on `2026-07-07`
    - lane A: institute preview sweep in parallel
      - `25` rows: `878ms`
      - `100` rows: `1855ms`
      - `250` rows: `2902ms`
      - `500` rows: `3900ms`
    - lane B: teacher disposable finalize in parallel
      - passed in about `9.6s`

Meaning:

- stage browser availability is now confirmed for both teacher and institute import lanes
- stage preview timing is measurable and scales reasonably through `500` rows on the current seeded window
- repeat preview timing stays stable enough across short cooldown-spaced waves to treat the lane as operationally trustworthy
- stage finalize behavior is healthy for both institute and teacher disposable import lanes
- dedicated `500`-row finalize timing is now measured end to end, including cleanup
- first small cross-user concurrency wave passed without obvious shared-route collapse
- the import-performance lane can now move from entitlement-unblock work to broader scale and repeatability validation

## Controlled Stage Import Window

Use this section when you are ready to run the next real stage import-performance pass.

### Why this is needed

- question import preview/finalize uses `BulkImportRateThrottle`
- that throttle is user-scoped and remains active when `DEBUG` is false
- local debug runs bypass the throttle, but stage does not
- repeated stage browser waves can therefore skip even when the product is healthy

### Pre-window checklist

1. Confirm which stage role should be used:
   - institute lane is currently available
   - teacher lane is currently available under the same enabled institute entitlement
2. Confirm cleanup strategy:
   - preview-only runs need no content cleanup
   - finalize runs should stay disposable and delete imported rows afterward where supported
3. Keep worker count at `1`
   - import cooldown is user-scoped, so parallel workers reduce signal quality
4. Avoid mixing roster-import and question-import waves in the same short window
   - they share the same bulk-import throttle family

### Recommended stage execution order

Run these in order, with cooldown spacing between them:

1. Availability check

```bash
PLAYWRIGHT_BASE_URL=https://learn.accerio.in \
./node_modules/.bin/playwright test tests/e2e/workflow/institute-question-import-export.spec.ts --project=chromium
```

Goal:

- verify that institute import is still enabled
- verify the route is not blocked by feature gating before doing heavier timing work

2. Institute larger-row preview timing

```bash
PLAYWRIGHT_BASE_URL=https://learn.accerio.in \
./node_modules/.bin/playwright test tests/e2e/workflow/institute-question-import-preview-timing.spec.ts --project=chromium
```

Goal:

- capture browser-visible preview timings for `25`, `100`, `250`, and `500` row payloads on the currently entitled lane

3. Institute disposable finalize flow

```bash
PLAYWRIGHT_BASE_URL=https://learn.accerio.in \
PLAYWRIGHT_ENABLE_MUTABLE_IMPORT_ACTIONS=1 \
./node_modules/.bin/playwright test tests/e2e/workflow/question-import-mutable.spec.ts --project=chromium --grep "institute can preview and finalize a disposable question import"
```

Goal:

- confirm that preview plus finalize still works end to end on stage after backend import-path hardening

4. Teacher disposable finalize flow only after entitlement enablement

```bash
PLAYWRIGHT_BASE_URL=https://learn.accerio.in \
PLAYWRIGHT_ENABLE_MUTABLE_IMPORT_ACTIONS=1 \
./node_modules/.bin/playwright test tests/e2e/workflow/question-import-mutable.spec.ts --project=chromium --grep "teacher can preview and finalize a disposable question import"
```

Goal:

- validate the teacher-specific lane only when stage feature configuration allows it

### Cooldown spacing rule

If any run shows:

- `request was throttled`
- `expected available in N seconds`
- a skip caused by import cooldown

then:

1. stop the next import run
2. wait for the reported cooldown plus a small safety buffer
3. rerun only the blocked import spec, not the whole pack

Practical rule:

- if no exact `N seconds` value is surfaced, wait at least `2` minutes before the next import-preview/finalize run on the same role

### Recording template

For each successful stage import run, record:

- date and time
- role used
- route used
- row count
- preview elapsed time
- finalize elapsed time if applicable
- whether throttle appeared
- whether cleanup succeeded

### Decision rules after the window

- if institute preview at `25`, `100`, `250`, and `500` rows is smooth and finalize remains stable, the backend import path is likely no longer the primary stage bottleneck
- if preview still degrades sharply while local profiling is healthy, shift focus to stage environment factors or frontend route handling
- if finalize regresses on stage despite the local backend gains, instrument the live preview/finalize responses next before making another code change

## Good Review Questions

- Did the route get faster cold, or only warm?
- Did query count fall for the route we intended to improve?
- Did a list view improve while its summary companion still lagged?
- Is the bottleneck now DB work, serializer work, or payload size?
- Are we at the point where stage `k6` validation is more valuable than more local cleanup?
