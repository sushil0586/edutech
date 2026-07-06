# Backend Operational Route Profiling Runbook

Last updated: 2026-07-06

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

## Good Review Questions

- Did the route get faster cold, or only warm?
- Did query count fall for the route we intended to improve?
- Did a list view improve while its summary companion still lagged?
- Is the bottleneck now DB work, serializer work, or payload size?
- Are we at the point where stage `k6` validation is more valuable than more local cleanup?
