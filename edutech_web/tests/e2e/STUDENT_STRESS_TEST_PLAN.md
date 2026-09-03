# Student Stress Test Plan

This plan defines how to stress test the student module in `edutech_web` in a phased, repeatable way. It is focused on realistic student workflows, measurable thresholds, and fast triage when the system degrades.

## Goal

Measure how the student module behaves under higher concurrency, longer runtimes, and degraded backend conditions without losing correctness in:

- exam discovery
- exam entry
- active attempt runtime
- answer save behavior
- exam submission
- results retrieval
- analytics and review follow-up flows

## Scope

The first stress-testing wave should focus on the student web module only:

- dashboard and exam discovery
- exam detail and exam key entry
- attempt runtime and post-submit flow
- results, review, and practice history
- analytics deep routes
- notifications and utility surfaces

Out of scope for the first wave:

- mobile-specific stress
- visual-only stress
- teacher, institute, or admin actor load
- full multi-role end-to-end contention

## Test Types

Use four complementary stress styles.

### 1. Baseline

Purpose:
Capture clean low-load timings before pushing concurrency.

Use for:

- first-run route timing
- API latency comparison
- page readiness comparison

### 2. Sustained Load

Purpose:
Verify that the student module remains stable under repeated normal traffic for an extended period.

Use for:

- dashboard discovery
- results history
- analytics route browsing

### 3. Spike Load

Purpose:
Verify that sudden bursts do not break core student experiences.

Use for:

- exam discovery
- exam detail open
- results opening after submission windows

### 4. Soak / Long Session

Purpose:
Verify that long-lived student sessions do not drift into stale or corrupt state.

Use for:

- active attempts
- answer save flow
- resume behavior
- review and results revisit

## Priority Journeys

These are the highest-value student flows to stress first.

### Priority A: Discovery

- login
- dashboard load
- exam discovery
- practice workspace load

### Priority B: Entry

- exam detail open
- exam key entry
- attempt launch

### Priority C: Runtime

- active attempt navigation
- answer save cycles
- review panel access
- long session continuity

### Priority D: Completion

- submit or end test
- post-submit summary
- pending vs published result state

### Priority E: Follow-up

- results workspace
- review workspace
- analytics deep drilldowns
- notifications and utility entry points

## Existing Commands To Reuse First

Run these before adding any new scripts.

Auth-mode note:

- default local stress runs should keep normal auth hashing so browser-like behavior stays realistic
- when the goal is to isolate student-module read latency from repeated login cost, enable `ENABLE_FAST_AUTH_FOR_LOAD_TESTS=True` in the backend environment before running the split session probe
- this toggle is dev-only and must never be used as a production setting

### Playwright timing checks

```bash
npm run test:e2e:timing:student-results
npm run test:e2e:timing:student-summary
npm run test:e2e:timing:student-review
```

### Existing k6 low-load probes

```bash
npm run test:load:dev:student-discovery:10
npm run test:load:dev:results:10
npm run test:load:dev:analytics:10
```

### Optional higher-load follow-ups

```bash
npm run test:load:dev:student-discovery:48
npm run test:load:dev:student-discovery:50
npm run test:load:dev:student-discovery:100
npm run test:load:dev:results:48
npm run test:load:dev:results:50
npm run test:load:dev:results:100
npm run test:load:dev:analytics:50
```

### Split session diagnosis

Use these when you need to separate `login`, `/api/v1/auth/me/`, and `/api/v1/student/exams/available/` latency.

```bash
npm run test:load:dev:student-session-breakdown:10
npm run test:load:dev:student-session-breakdown:48
npm run test:load:dev:student-session-breakdown:50
```

### Session-reuse diagnosis

Use these when you want to measure student module latency after one pre-authentication pass per user instead of paying login cost during the measured load window.

```bash
npm run test:load:dev:student-session-reuse-breakdown:10
npm run test:load:dev:student-session-reuse-breakdown:48
npm run test:load:dev:student-session-reuse-breakdown:50
```

## Phase Plan

## Phase 1: Baseline And Observability

Objective:
Establish clean numbers before meaningful stress.

Tasks:

- run the current student core pack once
- run the three student timing Playwright checks
- run the three k6 probes at the `10` user level
- collect browser timing, API latency, and error rates

Commands:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 npm run test:e2e:release:student-core
PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 npm run test:e2e:timing:student-results
PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 npm run test:e2e:timing:student-summary
PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 npm run test:e2e:timing:student-review
npm run test:load:dev:student-discovery:10
npm run test:load:dev:results:10
npm run test:load:dev:analytics:10
```

Exit criteria:

- core pack still green
- no meaningful error spikes at low load
- baseline metrics captured for p50 and p95

## Phase 2: Moderate Sustained Load

Objective:
Find degradation under normal but continuous usage.

Tasks:

- run discovery at `48` and `50`
- run results at `48` and `50`
- run analytics at `50`
- compare against baseline

Commands:

```bash
npm run test:load:dev:student-discovery:48
npm run test:load:dev:student-discovery:50
npm run test:load:dev:results:48
npm run test:load:dev:results:50
npm run test:load:dev:analytics:50
```

Exit criteria:

- no correctness failures
- no material save or routing failures
- p95 remains within acceptable tolerance of baseline

## Phase 3: High-Load And Spike Validation

Objective:
Find burst-capacity limits and recovery behavior.

Tasks:

- run discovery at `100`
- run results at `100`
- if stable, consider discovery at `500`
- immediately rerun low-load checks after the burst

Commands:

```bash
npm run test:load:dev:student-discovery:100
npm run test:load:dev:results:100
npm run test:load:dev:student-discovery:500
npm run test:load:dev:student-discovery:10
npm run test:load:dev:results:10
```

Exit criteria:

- no persistent degradation after burst
- recovery run returns close to baseline
- no broken student route or login state after load

## Phase 4: Runtime And Session Resilience

Objective:
Stress the most correctness-sensitive student flow: active attempts.

Tasks:

- target attempt runtime and long-session scenarios
- validate save persistence and resume correctness
- confirm submit/end-test still transitions cleanly

Recommended supporting suites:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 npx playwright test \
tests/e2e/workflow/student-attempt-runtime-workspace.spec.ts \
tests/e2e/workflow/student-post-submit-workspace.spec.ts \
tests/e2e/workflow/student-review-workspace.spec.ts \
--project=chromium
```

If mutable runtime validation is needed later:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 npm run test:e2e:mutable:student-attempt-core
```

Runtime k6 targeting note:

- `performance/k6/lib/helpers.js` now supports:
  - `K6_EXAM_CODE_REGEX` to explicitly include only matching exam codes
  - `K6_EXAM_CODE_EXCLUDE_REGEX` to override the default exclusion pattern
- the default exclusion pattern is `RESULT`, which helps keep runtime stress focused on editable attempt lanes instead of result-ready follow-up fixtures
- for family-specific repeatable runtime verification, prefer an explicit exam-code filter instead of relying on the first available exam

Example:

```bash
K6_BASE_URL=http://127.0.0.1:9013 \
K6_USER_CREDENTIALS_JSON='[{"username":"demo-aws-student","password":"Demo@12345"}]' \
K6_EXAM_CODE_REGEX='DMO-AWS-PRACTICE-01' \
K6_VUS=1 \
K6_ITERATIONS=1 \
k6 run ../performance/k6/student-exam-runtime.js
```

Exit criteria:

- no lost answers
- no duplicate submission
- no broken resume state
- no stale result-state transition after submission

## Phase 5: Failure-Mode Simulation

Objective:
Validate student safety under degraded backend conditions.

Examples:

- delayed save responses
- delayed results publication
- intermittent analytics API slowness
- partial route timeout and recovery

What to verify:

- user sees a recoverable state
- saved work is not lost
- retry paths work
- module returns to a healthy state after recovery

## Metrics To Capture

Record these for every run:

- total requests
- success rate
- error rate
- timeout rate
- p50 latency
- p95 latency
- p99 latency
- page interactive / ready timing where available
- number of retries or recoveries triggered

For attempt runtime specifically:

- save round-trip latency
- frequency of save confirmation
- resume correctness after refresh
- submit completion time
- result availability delay

## Failure Triage Matrix

### Severity 1

- answer loss
- duplicate submission
- broken attempt resume
- corrupted results state

Immediate action:

- stop scaling further
- isolate exact failing journey
- retain artifacts, traces, and backend logs

### Severity 2

- persistent p95 regression
- repeated route timeout
- analytics or results unusable under moderate load

Immediate action:

- compare with baseline
- identify route family and slowest API

### Severity 3

- cosmetic slowness
- tolerable page delay with correct results
- degraded but recoverable non-critical utility flows

Immediate action:

- document and watch
- do not block the whole module unless trend worsens

## Acceptance Thresholds

Initial recommended thresholds for the student module:

- `0` correctness failures in core student flows
- `0` answer-loss events
- `0` duplicate-submit events
- `0` broken result-state transitions
- p95 should not regress beyond an agreed tolerance from baseline
- low-load rerun after spike should return near baseline behavior

If exact numeric SLOs are needed later, define them after Phase 1 baseline capture.

## Deliverables

Each stress cycle should produce:

- run date and environment
- commands executed
- concurrency level
- baseline vs stressed metrics
- failure list
- artifact links
- go / watch / block recommendation

## Recommended First Execution Order

1. `npm run test:e2e:release:student-core`
2. `npm run test:e2e:timing:student-results`
3. `npm run test:e2e:timing:student-summary`
4. `npm run test:e2e:timing:student-review`
5. `npm run test:load:dev:student-discovery:10`
6. `npm run test:load:dev:results:10`
7. `npm run test:load:dev:analytics:10`
8. `npm run test:load:dev:student-discovery:50`
9. `npm run test:load:dev:results:50`
10. `npm run test:load:dev:analytics:50`

## Next Expansion

After the first student-only stress cycle is stable, expand into:

- mobile student stress
- student mutable runtime stress
- multi-role contention with teacher and institute traffic
- backend saturation correlation with student save and result routes

## Baseline Ledger

Update this section after each executed stress phase so the current student resilience picture is visible without reconstructing terminal history.

### Saturday, August 1, 2026: Phase 1 Baseline

Student Playwright core checkpoint:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 npm run test:e2e:release:student-core
```

Result:

- `26 passed (4.6m)`

Student timing probes:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 npm run test:e2e:timing:student-results
PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 npm run test:e2e:timing:student-summary
PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 npm run test:e2e:timing:student-review
```

Result:

- `student-results-timing`: passed with
  - `results-open 989ms`
  - `results-filter-apply 968ms`
  - `results-filter-reset 269ms`
- `student-summary-timing`: passed, but route state was `unavailable` in the current seeded environment, so no numeric timing metrics were emitted
- `student-review-timing`: passed, but route state was `unavailable` in the current seeded environment, so no numeric timing metrics were emitted

Low-load k6 baselines:

Important setup correction:

- the current npm wrappers are not sufficient by themselves for the student k6 scripts
- these scripts require:
  - `K6_BASE_URL`
  - `K6_USER_CREDENTIALS_JSON`
- for the current local environment, the working API-origin baseline was:
  - `K6_BASE_URL=http://127.0.0.1:9001`
- using the frontend origin `http://localhost:3000` caused `404` on `/api/v1/auth/login/`

Discovery baseline:

```bash
K6_BASE_URL=http://127.0.0.1:9001 K6_USER_CREDENTIALS_JSON='[{"username":"demo-student","password":"Demo@12345"}]' npm run test:load:dev:student-discovery:10
```

Result:

- passed
- `http_req_failed: 0.00%`
- `http_req_duration p95: 1.84s`
- `iteration_duration avg: 3.54s`

Results/history baseline:

```bash
K6_BASE_URL=http://127.0.0.1:9001 K6_USER_CREDENTIALS_JSON='[{"username":"demo-student","password":"Demo@12345"}]' npm run test:load:dev:results:10
```

Result:

- passed
- `http_req_failed: 0.00%`
- `http_req_duration p95: 1.2s`
- `iteration_duration avg: 3.82s`

Analytics baseline:

```bash
K6_BASE_URL=http://127.0.0.1:9001 K6_USER_CREDENTIALS_JSON='[{"username":"demo-student","password":"Demo@12345"}]' npm run test:load:dev:analytics:10
```

Result:

- passed
- `http_req_failed: 0.00%`
- `http_req_duration p95: 659ms`
- `iteration_duration avg: 2.03s`

Phase 1 baseline takeaway:

- the core student Playwright web checkpoint is green
- the low-load API-level discovery, results, and analytics probes are green
- no low-load error-rate issue surfaced in the current environment
- the next recommended step is Phase 2 moderate sustained load at `48` and `50`

### Sunday, August 2, 2026: Phase 4 Attempt Runtime Verification

Student attempt browser correctness checkpoint:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:9001 npx playwright test \
tests/e2e/workflow/student-attempt-runtime-workspace.spec.ts \
tests/e2e/workflow/student-post-submit-workspace.spec.ts \
tests/e2e/workflow/student-review-workspace.spec.ts \
--project=chromium
```

Result:

- `3 passed (50.4s)`

Attempt-runtime stress harness correction:

- `performance/k6/student-exam-runtime.js` was updated to use `/api/v1/attempts/{attemptId}/detail/`
- the previous `/{attemptId}/` endpoint shape was stale for runtime-question harvesting

Attempt-runtime fixture findings:

- the family demo suites intentionally create two lanes:
  - one live runtime lane
  - one result-ready published lane
- NEET, JEE, and GRE full-runtime lanes are single-attempt and become non-repeatable once consumed
- the same seeded student can still have an editable or resumable-looking `RESULT` lane unless the stress harness targets a specific exam family carefully
- AWS practice is currently the cleanest repeatable student attempt lane among the seeded demo families

Direct runtime stress observation:

```bash
K6_BASE_URL=http://127.0.0.1:9013 \
K6_USER_CREDENTIALS_JSON='[{"username":"demo-neet-student","password":"Demo@12345"},{"username":"demo-jee-student","password":"Demo@12345"},{"username":"demo-gre-student","password":"Demo@12345"},{"username":"demo-aws-student","password":"Demo@12345"}]' \
K6_VUS=4 \
K6_ITERATIONS=4 \
k6 run ../performance/k6/student-exam-runtime.js
```

Result:

- runtime traffic reached the real attempt path
- `attempt detail` and `submit` remained healthy
- `save-answer` failures were traced to fixture-state selection, not a generic transport failure
- `http_req_failed: 21.95%`
- `http_req_duration p95: 2.97s`

Manual verification findings:

- `DMO-*-RESULT-01` attempts can surface as resumable runtime candidates after the corresponding single-attempt full exam has already been consumed
- those result-lane attempts often return runtime detail but are already `submitted`, so `save-answer` correctly returns:
  - `Answers cannot be changed after the attempt is submitted.`
- a fresh AWS practice attempt remained healthy end-to-end:
  - detail returned question payloads
  - all answer saves returned `200`

Phase 4 takeaway:

- browser-level student attempt correctness is currently strong
- runtime-load verification is partially validated but still fixture-limited for NEET, JEE, and GRE
- the next reliable stress step is to expand repeatable student attempt fixtures:
  - either more dedicated practice users
  - or a seeded multi-user practice lane per family

### Sunday, August 2, 2026: Phase 4 Repeatable Family Runtime Check

Repeatable fixture correction:

- `seed_demo_neet_suite.py`
- `seed_demo_jee_suite.py`
- `seed_demo_gre_suite.py`

The live runtime exam in each family was updated from single-attempt behavior to `UNLIMITED_PRACTICE` so the seeded student lane can be stressed more than once without falling back into the published result-only path.

Runtime harness correction:

- `performance/k6/student-exam-runtime.js` now switches sections before saving answers in later blocks
- this was required because NEET and GRE attempt detail payloads include later-section questions while the backend still enforces active-section access rules during save

Family-specific attempt stress verification:

NEET:

```bash
K6_BASE_URL=http://127.0.0.1:9013 \
K6_USER_CREDENTIALS_JSON='[{"username":"demo-neet-student","password":"Demo@12345"}]' \
K6_EXAM_CODE_REGEX='DMO-NEET-FULL-01' \
K6_VUS=1 \
K6_ITERATIONS=1 \
k6 run ../performance/k6/student-exam-runtime.js
```

Result:

- passed
- `http_req_failed: 0.00%`
- `http_req_duration p95: 128.39ms`

JEE:

```bash
K6_BASE_URL=http://127.0.0.1:9013 \
K6_USER_CREDENTIALS_JSON='[{"username":"demo-jee-student","password":"Demo@12345"}]' \
K6_EXAM_CODE_REGEX='DMO-JEE-FULL-01' \
K6_VUS=1 \
K6_ITERATIONS=1 \
k6 run ../performance/k6/student-exam-runtime.js
```

Result:

- passed
- `http_req_failed: 0.00%`
- `http_req_duration p95: 247.39ms`

GRE:

```bash
K6_BASE_URL=http://127.0.0.1:9013 \
K6_USER_CREDENTIALS_JSON='[{"username":"demo-gre-student","password":"Demo@12345"}]' \
K6_EXAM_CODE_REGEX='DMO-GRE-QUANT-01' \
K6_VUS=1 \
K6_ITERATIONS=1 \
k6 run ../performance/k6/student-exam-runtime.js
```

Result:

- passed
- `http_req_failed: 0.00%`
- `http_req_duration p95: 130.1ms`

AWS:

```bash
K6_BASE_URL=http://127.0.0.1:9013 \
K6_USER_CREDENTIALS_JSON='[{"username":"demo-aws-student","password":"Demo@12345"}]' \
K6_EXAM_CODE_REGEX='DMO-AWS-PRACTICE-01' \
K6_VUS=1 \
K6_ITERATIONS=1 \
k6 run ../performance/k6/student-exam-runtime.js
```

Result:

- passed
- `http_req_failed: 0.00%`
- `http_req_duration p95: 249.97ms`

Phase 4 repeatable-family takeaway:

- the student attempt runtime lane is now verified across AWS, NEET, JEE, and GRE at targeted single-user load
- the next best confidence step is a mixed multi-family runtime pack, followed by results/review soak

### Sunday, August 2, 2026: Mixed Results And Review Follow-up Check

Cross-family post-submit verification:

```bash
K6_BASE_URL=http://127.0.0.1:9013 \
K6_USER_CREDENTIALS_JSON='[{"username":"demo-neet-student","password":"Demo@12345"},{"username":"demo-jee-student","password":"Demo@12345"},{"username":"demo-gre-student","password":"Demo@12345"},{"username":"demo-aws-student","password":"Demo@12345"}]' \
K6_VUS=4 \
K6_ITERATIONS=8 \
k6 run ../performance/k6/student-results-breakdown.js
```

Result:

- passed
- `http_req_failed: 0.00%`
- `results_duration p95: 169.77695ms`
- `attempt_summary_duration p95: 107.7206ms`
- `attempt_review_duration p95: 90.8208ms`
- `insight_duration p95: 91.3862ms`
- `analytics_duration p95: 45.32345ms`

Student follow-up takeaway:

- post-submit student flows are healthy across results, summary, review, insights, and analytics under mixed family load
- student confidence is now strong across both:
  - active attempt runtime
  - post-submit follow-up surfaces

### Sunday, August 2, 2026: Mixed Runtime Soak Check

Longer mixed-family attempt stability verification:

```bash
K6_BASE_URL=http://127.0.0.1:9013 \
K6_USER_CREDENTIALS_JSON='[{"username":"demo-neet-student","password":"Demo@12345"},{"username":"demo-jee-student","password":"Demo@12345"},{"username":"demo-gre-student","password":"Demo@12345"},{"username":"demo-aws-student","password":"Demo@12345"}]' \
K6_EXAM_CODE_EXCLUDE_REGEX='RESULT' \
K6_VUS=4 \
K6_ITERATIONS=20 \
k6 run ../performance/k6/student-exam-runtime.js
```

Result:

- passed
- `20/20` iterations completed
- `http_req_failed: 0.00%`
- `http_req_duration p95: 168.17ms`

Student soak takeaway:

- no runtime drift appeared during repeated mixed-family attempt cycles
- save, section-switch, and submit stayed stable under longer repeated use
- student stress confidence is now strong across:
  - targeted family runtime checks
  - mixed-family runtime checks
  - mixed-family follow-up checks
  - short soak stability
