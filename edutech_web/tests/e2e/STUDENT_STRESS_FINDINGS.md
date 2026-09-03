# Student Stress Findings

This document captures the current findings from the student-module stress and moderate-load validation runs executed on Saturday, August 1, 2026 and Sunday, August 2, 2026.

Use this together with:

- [STUDENT_STRESS_TEST_PLAN.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/STUDENT_STRESS_TEST_PLAN.md)
- [PLAYWRIGHT_FULL_RUNBOOK.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/PLAYWRIGHT_FULL_RUNBOOK.md)

## Current Summary

The student module is functionally stable under the currently exercised load levels. The current evidence now separates two different conclusions:

- the student module itself is healthy at `48` VUs when sessions are reused
- the remaining performance concern is repeated fresh-login concurrency, not the student discovery path

Observed pattern:

- no browser-flow correctness failures in the current student core Playwright pack
- no request-failure issue in the validated session-reuse student slice
- the broad red lane shifted away from discovery once auth and session costs were isolated
- results/history remains the next most likely student-module optimization target
- analytics is still a later cold-path candidate, but not the primary blocker for current student confidence

## Validated Run Snapshot

### Phase 1 baseline

Executed on Saturday, August 1, 2026.

- student core Playwright pack: `26 passed`
- results timing probe:
  - `results-open 989ms`
  - `results-filter-apply 968ms`
  - `results-filter-reset 269ms`
- summary timing probe: passed, route-state timing unavailable in seeded state
- review timing probe: passed, route-state timing unavailable in seeded state

Low-load k6 results:

- discovery at `10` VUs:
  - `http_req_failed 0.00%`
  - `p95 1.84s`
- results/history at `10` VUs:
  - `http_req_failed 0.00%`
  - `p95 1.2s`
- analytics at `10` VUs:
  - `http_req_failed 0.00%`
  - `p95 659ms`

### Phase 2 moderate load

Executed on Saturday, August 1, 2026.

At `48` VUs:

- discovery:
  - `http_req_failed 0.00%`
  - `p95 9.02s`
  - threshold failed
- results/history:
  - `http_req_failed 0.00%`
  - `p95 6.32s`
  - threshold failed

At `50` VUs:

- discovery:
  - `http_req_failed 0.00%`
  - `p95 9.0s`
  - threshold failed
- results/history:
  - `http_req_failed 0.00%`
  - `p95 3.75s`
  - threshold failed
- analytics:
  - `http_req_failed 0.00%`
  - `p95 2.77s`
  - threshold failed

### Phase 2 follow-up after discovery and session-path optimizations

Executed on Saturday, August 1, 2026.

Changes applied before rerun:

- SQL-side narrowing for student discovery visibility and source filtering in [edutech_backend/apps/accounts/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/accounts/views/__init__.py:471)
- short response caching on `/api/v1/auth/me/` in [edutech_backend/apps/accounts/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/accounts/views/__init__.py:209)
- fast-path referral-code lookup in [edutech_backend/apps/economy/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/economy/services.py:147)

Rerun results for the current session-chain discovery probe:

- discovery chain at `10` VUs:
  - `http_req_failed 0.00%`
  - `p95 1.85s`
  - healthy again and back near the original low-load expectation
- discovery chain at `48` VUs:
  - `http_req_failed 0.00%`
  - `p95 16.02s`
  - login timeout failures removed, but latency still far above target
- discovery chain at `50` VUs:
  - `http_req_failed 0.00%`
  - `p95 15.8s`
  - threshold still failed

Interpretation:

- low-load degradation was partly caused by session-path overhead, especially `/api/v1/auth/me/`
- the prior `48` VU login instability was mitigated
- the moderate-load bottleneck remains unresolved and is still dominated by the full session chain
- the current discovery k6 script measures `login -> me -> available exams`, not the discovery endpoint in isolation

## Findings By Priority

## 1. Discovery is the highest-impact performance risk

Endpoint:

- `/api/v1/student/exams/available/`

Primary backend entry point:

- [edutech_backend/apps/accounts/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/accounts/views/__init__.py:471)

Related frontend client entry point:

- [edutech_web/src/lib/api/student.ts](/Users/ansh/Documents/Eductech/edutech_web/src/lib/api/student.ts:181)

Observed behavior:

- this route family produced the worst latency in the original moderate-load wave
- endpoint-local discovery filtering was improved, but the session-chain rerun still remained around `15.8s-16.02s` at `48-50` VUs
- that means the broad discovery problem is not only the final exam-list filtering path

Likely causes:

- large queryset assembly with multiple `select_related` and `prefetch_related` branches
- Python-side post-query filtering instead of narrowing the result set fully in SQL
- non-compact mode loads richer section and exam metadata before final eligibility is known
- serializer payload size likely amplifies the cost once the full list is materialized

Concrete code signals:

- Python-side filtering happens after queryset evaluation:
  - `is_exam_assigned_to_student(exam, student)`
  - `filter_student_visible_exams_by_source(...)`
- non-compact mode also runs `ensure_exam_window_notifications(student, exams)`

Updated hypothesis after rerun:

- the available-exams route is still a real hotspot, but the student session chain also carries meaningful auth/session overhead
- moderate-load latency is now best treated as a combined `login + me + available exams` performance problem until endpoint-split measurements prove otherwise

First fix checks:

- move assignment and source scoping into SQL where possible
- compare compact and non-compact payload cost with query-count and serializer timing
- inspect the cost of [StudentExamAvailabilitySerializer](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py:2015) and [StudentExamFollowUpSerializer](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py:2392)
- use the split session probe to measure `login`, `me`, and `available exams` independently before the next backend optimization wave

## 2. Results/history is stable but still overfetching

Endpoint:

- `/api/v1/student/results/`

Primary backend entry point:

- [edutech_backend/apps/accounts/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/accounts/views/__init__.py:751)

Related serializer:

- [edutech_backend/apps/results/serializers/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/results/serializers/__init__.py:91)

Related frontend client entry point:

- [edutech_web/src/lib/api/student.ts](/Users/ansh/Documents/Eductech/edutech_web/src/lib/api/student.ts:208)

Observed behavior:

- no request failures under moderate load
- p95 rose to `6.32s` at `48` VUs and `3.75s` at `50` VUs

Likely causes:

- list endpoint fetches related exam, institute, teacher, attempt, and review-task context for each row
- unresolved review-task prefetch may be unnecessary for all history-card renders
- serializer likely emits a richer history payload than the list surface strictly needs

Most likely root-cause hypothesis:

- this route is correctness-safe but too expensive for a broad list view because it carries drill-in metadata on every result row

First fix checks:

- profile query count and payload size for the history list
- verify whether unresolved review-task data can move to a drill-in fetch
- introduce a slimmer list serializer if the current one is serving too many surface needs at once

## 3. Analytics has good cache intent but an expensive miss path

Endpoints:

- `/api/v1/student/insights/summary/`
- `/api/v1/student/insights/question-analytics/`

Primary backend entry points:

- [edutech_backend/apps/accounts/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/accounts/views/__init__.py:778)
- [edutech_backend/apps/accounts/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/accounts/views/__init__.py:787)

Primary service builders:

- [edutech_backend/apps/results/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/results/services.py:1429)
- [edutech_backend/apps/results/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/results/services.py:1687)

Observed behavior before the latest concurrency fixes:

- analytics remained correct under the exercised load
- analytics still exceeded threshold at `50` VUs with `p95 2.77s`

Likely causes:

- `build_student_question_analytics(...)` uses a window function to compute latest answers per question
- it then builds multi-scope peer benchmarks across school, city, state, and program
- `build_student_insight_summary(...)` combines results, topics, attempts, and answer-level aggregation
- cache TTL is currently short enough that moderate-load waves can still pay expensive rebuild cost

Most likely root-cause hypothesis before the latest fix:

- the route is architecturally sound for correctness, but the cache-miss and partial-cache-miss path does too much work per request

First fix checks that were validated:

- measure cache hit rate during repeated runs
- separate correctness failures from cold-cache rebuild cost
- evaluate whether peer benchmark generation should be precomputed or protected from concurrent rebuilds

### Sunday, August 2, 2026 post-fix result

Applied backend fixes:

- imported `time` in [edutech_backend/apps/results/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/results/services.py) so the existing analytics lock-wait path no longer fails under contention
- kept cache-stampede protection in `build_student_question_analytics(...)`
- added cache-stampede protection to `/api/v1/student/results/` in [edutech_backend/apps/accounts/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/accounts/views/__init__.py)
- added cache-stampede protection to `build_student_insight_summary(...)` in [edutech_backend/apps/results/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/results/services.py)

Verified rerun against a dedicated backend on Sunday, August 2, 2026:

- test pack: `npm run test:load:dev:results-breakdown:48`
- `http_req_failed 0.00%`
- `results_duration p95 315.93ms`
- `insight_duration p95 399.42ms`
- `analytics_duration p95 304.27ms`
- `attempt_summary_duration p95 590.78ms`
- `attempt_review_duration p95 710.10ms`
- all `624/624` checks passed

Interpretation:

- the earlier analytics correctness failure under `48` concurrent users is resolved
- the earlier results-history and insight-summary latency spikes were primarily cache-stampede effects, not steady-state endpoint cost
- the student results and analytics bundle is now healthy at the exercised `48`-VU stress level

## 4. Summary and review routes are not the current red lane, but they remain second-wave candidates

Related attempt endpoints referenced in backend tests:

- `/api/v1/attempts/{id}/summary/`
- `/api/v1/attempts/{id}/review/`

Reference file:

- [edutech_backend/apps/attempts/tests/test_attempt_workspace_api.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/attempts/tests/test_attempt_workspace_api.py:2973)

Observed behavior:

- current timing probes passed
- seeded route-state timing was unavailable in the current environment
- these routes were not the main source of the present moderate-load threshold failures

Risk:

- once discovery and results are optimized, these detail-heavy attempt endpoints may become the next visible bottleneck

Next validation:

- run targeted profiling after discovery and results are reduced

## 5. The remaining hot path is fresh-login concurrency, not the student read endpoints alone

Validated on Saturday, August 1, 2026.

Additional changes applied before the latest split reruns:

- short response caching for `/api/v1/student/exams/available/` in [edutech_backend/apps/accounts/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/accounts/views/__init__.py:471)
- cache-stampede protection around the available-exams response build in [edutech_backend/apps/accounts/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/accounts/views/__init__.py:471)

Split session probe results:

- at `10` VUs:
  - `login_duration p95 609ms`
  - `me_duration p95 75ms`
  - `available_exams_duration p95 1.73s`
  - all thresholds passed
- at `48` VUs after cache-stampede protection:
  - `login_duration p95 3.15s`
  - `me_duration p95 306ms`
  - `available_exams_duration p95 695ms`
  - only the login threshold failed
- at `48` VUs after a login response-cache experiment:
  - `login_duration p95 3.42s`
  - `me_duration p95 283ms`
  - `available_exams_duration p95 915ms`
  - login remained the only threshold failure

Direct backend benchmark against the dev runtime settings:

- `authenticate()` average: about `201ms`
- `check_password()` average: about `238ms`
- configured dev hasher stack starts with Django `PBKDF2PasswordHasher`

Interpretation:

- the original discovery red lane is no longer the dominant unresolved problem
- `/api/v1/student/exams/available/` is now healthy enough even under the `48` VU split probe
- `/api/v1/auth/me/` is also no longer a material bottleneck
- the remaining stress issue is dominated by repeated fresh password verification during concurrent login waves

Operational takeaway:

- for realistic student browsing confidence, the module is in much better shape than the earlier broad-chain numbers suggested
- for strict stress-login testing, the next optimization decision should focus on auth strategy rather than more student endpoint tuning

Recommended next checks:

- decide whether the student load suite should reuse authenticated sessions when the intent is module stress rather than auth stress
- if fresh-login stress remains a requirement, consider a dev-only lower-cost password hasher profile for local load validation
- keep login and student-read measurements split so the discovery lane is not blamed for auth-only cost

### Follow-up validation with session reuse

Validated on Sunday, August 2, 2026.

Supporting setup completed before rerun:

- a refreshed local `48`-student credential export was rebuilt from current active accounts in [performance/k6/export-local-student-pool-48.sh](/Users/ansh/Documents/Eductech/performance/k6/export-local-student-pool-48.sh)
- a dedicated session-reuse probe was added in [performance/k6/student-session-reuse-breakdown.js](/Users/ansh/Documents/Eductech/performance/k6/student-session-reuse-breakdown.js)
- npm wrappers were added in [edutech_web/package.json](/Users/ansh/Documents/Eductech/edutech_web/package.json)

Session-reuse `48` VU result:

- `http_req_failed 0.00%`
- `me_duration p95 524.81ms`
- `available_exams_duration p95 850.25ms`

Interpretation:

- the student module passes at `48` VUs once repeated-login cost is removed from the measured load window
- `/api/v1/auth/me/` is also comfortably below target in the session-reuse model
- `/api/v1/student/exams/available/` remains below target in the session-reuse model
- this confirms that the student-module read path is now in a strong state for realistic authenticated browsing traffic

Operational takeaway:

- module-side student confidence is now strong
- fresh-login stress should be tracked as an auth-path benchmark, not as evidence that the student module itself is still failing

## 6. Test ergonomics and seeded-state coverage still need cleanup

Observed setup findings:

- k6 login must target backend auth directly
- using the frontend base URL for login caused auth-route mismatches
- some summary and review timing surfaces were unavailable in the current seeded environment
- the original discovery k6 script measures the whole session chain rather than the discovery endpoint in isolation

Impact:

- this is not a user-facing defect
- it does reduce confidence speed and makes repeated validation less efficient

Operational fixes:

- standardize `K6_BASE_URL=http://127.0.0.1:9001`
- standardize seeded student credentials in the load commands
- extend student seed coverage so summary and review timing probes always traverse real populated states
- use the split session probe `student-session-breakdown.js` when diagnosing whether auth/session or discovery payload work dominates latency

## Ranked Action List

## Phase A: Resolve the auth-vs-module boundary first

1. Keep the split session breakdown probe as the source of truth at `10`, `48`, and `50`
2. Treat `login`, `me`, and `available exams` as separate budgets
3. Keep the session-reuse probe as the source of truth for module-only student confidence
4. Decide whether release readiness should require reused-session confidence, fresh-login confidence, or both
5. If fresh logins remain in scope, tune auth cost in a dev-only stress profile before more student endpoint work

Success target:

- the combined chain should no longer fail because of auth cost alone, and the module-specific read paths should remain under target independently

## Phase B: Re-validate the fixed student results and analytics bundle

1. Keep `test:load:dev:results-breakdown:48` as the regression check for the repaired bundle
2. Re-run the same bundle at `10` and `50` VUs
3. Confirm the cache-stampede protection holds after any serializer or payload changes

Success target:

- `results`, `insight`, and `question-analytics` stay below threshold with `0.00%` request failure at the exercised concurrency bands

## Phase C: Re-validate the student module as one confidence pass

1. Re-run the student core Playwright pack
2. Re-run student timing probes
3. Re-run the moderate-load k6 wave
4. Only then consider higher-load or longer soak progression

## Confidence Statement

Current student confidence level:

- functional confidence: high for the currently exercised student browser flows
- module performance confidence under reused sessions: high
- whole-chain confidence with fresh login on every measured iteration: moderate
- production-readiness confidence for realistic authenticated student traffic: materially improved

The student module is not showing correctness collapse under the tested load. The remaining performance concern is concentrated in repeated fresh-login behavior rather than the student module read paths themselves.
