# Student Load Test Plan

This plan is the student-first load-testing path for the current product.

It exists because the student experience is the most concurrency-sensitive part of the system:

- many learners can log in at once
- many learners can open exam discovery at once
- many learners can load results and analytics together
- many learners can save and submit attempts in the same time window

Admin and institute performance still matter, but student traffic should be validated first.

## Primary Goal

Prove that the student section stays functional and reasonably responsive under controlled scale at:

- `10`
- `50`
- `100`
- `500`

using a staged progression rather than jumping directly to the highest number.

## Route Priority

### Priority 1: Student Discovery

These are the first routes to load test:

- `/api/v1/auth/login/`
- `/api/v1/auth/me/`
- `/api/v1/student/exams/available/`

Why first:

- this is the front door for exam-day traffic
- failures here block the whole student journey
- this catches auth bottlenecks and list-query bottlenecks early

Primary script:

- [student-session-and-exam-discovery.js](/Users/ansh/Documents/Eductech/performance/k6/student-session-and-exam-discovery.js:1)

Related browser timing context:

- [student-summary-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/student-summary-timing.spec.ts:1)

### Priority 2: Student Results

These should be tested next:

- `/api/v1/student/results/`
- `/api/v1/attempts/{attemptId}/summary/`
- `/api/v1/attempts/{attemptId}/review/`

Why second:

- results are a high-frequency read surface after exams
- review and summary often reveal query fan-out problems

Primary script:

- [student-results-history.js](/Users/ansh/Documents/Eductech/performance/k6/student-results-history.js:1)

Related browser timing context:

- [student-results-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/student-results-timing.spec.ts:1)
- [student-review-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/student-review-timing.spec.ts:1)

### Priority 3: Student Analytics

These are the next read-heavy targets:

- `/api/v1/student/insights/summary/`
- `/api/v1/student/insights/question-analytics/`

Why third:

- analytics queries are often more expensive than simple list endpoints
- these routes expose aggregation and join pressure quickly

Primary script:

- [student-analytics-routes.js](/Users/ansh/Documents/Eductech/performance/k6/student-analytics-routes.js:1)

Related browser timing context:

- [student-analytics-deep.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/student-analytics-deep.spec.ts:1)

### Priority 4: Student Exam Runtime

These are the highest-risk write paths:

- `/api/v1/attempts/start/`
- `/api/v1/attempts/{attemptId}/`
- `/api/v1/attempts/{attemptId}/save-answer/`
- `/api/v1/attempts/{attemptId}/submit/`

Why fourth:

- this is the most stateful part of the student experience
- write-path correctness matters more than raw concurrency
- shared test data collisions are more likely here, so it is safer after read-flow validation

Primary script:

- [student-exam-runtime.js](/Users/ansh/Documents/Eductech/performance/k6/student-exam-runtime.js:1)

## Recommended Execution Order

Run in this order:

1. discovery
2. results
3. analytics
4. runtime

For each scenario, progress like this:

1. `10`
2. `50`
3. `100`
4. `500`

Only move to the next level if the current one is stable.

## Environment Strategy

### Dev

Use dev for:

- `10`
- `20`
- `50`
- sometimes `100`

Treat `500` on dev as an optional crash/stability check only.

Use:

- [DEV_LOAD_TEST_COMMANDS.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/DEV_LOAD_TEST_COMMANDS.md:1)

### Stage

Use stage for:

- `50`
- `100`
- `500`

Use:

- [STAGE_PERFORMANCE_TEST_COMMANDS.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_PERFORMANCE_TEST_COMMANDS.md:1)

## Student Data Requirements

Minimum:

- `10` unique student users for `10` VUs
- `50` unique student users preferred for `50` VUs
- realistic seeded exams
- realistic result history
- realistic analytics data

Strong recommendation:

- discovery tests can tolerate user reuse
- runtime tests should avoid reusing the same student across many VUs
- result and analytics tests should include multiple students with varied attempt histories

## Benchmark Matrix

| Level | Best environment | Goal | Pass expectation |
| --- | --- | --- | --- |
| `10` | dev or stage | smoke stability | `0-1%` failures, no crashes |
| `50` | dev or stage | first bottleneck detection | acceptable p95, no cascading errors |
| `100` | preferably stage | meaningful concurrency signal | stable auth, stable reads, no major write collapse |
| `500` | stage | stress and scale proof | controlled degradation only, no systemic failure |

## Suggested Thresholds

These are reasonable starting thresholds, not final SLAs:

- discovery p95 under `1500 ms`
- results p95 under `2000 ms`
- analytics p95 under `2500 ms`
- attempt detail p95 under `2000 ms`
- save-answer p95 under `2000 ms`
- submit p95 under `3000 ms`
- failure rate under `1%`

## What To Measure

For each run, capture:

- p50 latency
- p95 latency
- p99 latency
- failure rate
- requests per second
- app CPU
- app memory
- DB CPU
- DB memory
- DB slow queries
- DB connection pressure
- any `429`, `500`, `502`, or timeout spikes

## Run Plan By Scenario

### 1. Discovery

Start here every time:

Dev:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
npm run test:load:dev:student-discovery:10
npm run test:load:dev:student-discovery:50
npm run test:load:dev:student-discovery:100
```

Optional dev stress:

```bash
npm run test:load:dev:student-discovery:500
```

### 2. Results

After discovery is stable:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
npm run test:load:dev:results:10
npm run test:load:dev:results:50
npm run test:load:dev:results:100
```

### 3. Analytics

After results is stable:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
npm run test:load:dev:analytics:10
npm run test:load:dev:analytics:50
```

For `100` and `500`, prefer stage unless your local/dev setup is unusually strong.

### 4. Runtime

Use this last:

Smoke:

```bash
cd /Users/ansh/Documents/Eductech
K6_BASE_URL="http://localhost:3000" \
K6_VUS=5 \
K6_ITERATIONS=5 \
K6_SAVE_COUNT=5 \
K6_SUBMIT_AT_END=true \
k6 run performance/k6/student-exam-runtime.js
```

Moderate:

```bash
cd /Users/ansh/Documents/Eductech
K6_BASE_URL="http://localhost:3000" \
K6_STAGES_JSON='[
  {"duration":"1m","target":5},
  {"duration":"2m","target":10},
  {"duration":"2m","target":20},
  {"duration":"1m","target":0}
]' \
K6_SAVE_COUNT=10 \
K6_SUBMIT_AT_END=true \
k6 run performance/k6/student-exam-runtime.js
```

## Decision Rules

- if discovery fails at `10`, stop immediately and fix correctness first
- if discovery fails at `50`, investigate auth, throttles, and exam list queries
- if results fail before analytics, prioritize summary/review query profiling
- if analytics fail early, prioritize aggregation and indexing work
- if runtime fails early, prioritize write-path correctness and DB locking analysis

## Recommended First Week Sequence

Day 1:

- discovery `10`
- discovery `50`

Day 2:

- results `10`
- results `50`

Day 3:

- analytics `10`
- analytics `50`

Day 4:

- runtime smoke
- runtime moderate

Day 5:

- stage discovery `100`
- stage results `100`
- stage analytics `100`

Then:

- stage controlled `500`

## Where To Record Findings

Use or extend:

- [STAGE_SCALE_UP_RESULTS_TEMPLATE.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SCALE_UP_RESULTS_TEMPLATE.md:1)
- [PERFORMANCE_TEST_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PERFORMANCE_TEST_PLAN.md:1)

## Summary

If only one area gets serious load validation first, it should be the student section.

Recommended order:

1. discovery
2. results
3. analytics
4. runtime

Recommended scale path:

1. `10`
2. `50`
3. `100`
4. `500`
