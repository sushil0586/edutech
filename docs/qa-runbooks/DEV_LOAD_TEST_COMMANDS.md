# Dev Load Test Commands

This runbook is the safe local/dev companion to the stage performance docs.

Use it when you want to:

- sanity-check that student APIs do not fall over under small concurrency
- compare before/after route optimizations on your dev stack
- catch obvious crashes, throttling, timeouts, or N+1 query patterns early

Do not use dev numbers as production capacity proof.

## What Dev Is Good For

- `10` user smoke checks
- `20-50` user controlled local ramps
- API regression detection after performance changes
- comparing relative changes between two branches on the same machine

## What Dev Is Not Good For

- deciding true `100` or `500` user production readiness
- infra sizing
- final p95 or p99 commitments
- realistic full-stack latency if your laptop is also running DB, backend, frontend, browser, and IDE

## Prerequisites

1. Install `k6`

```bash
brew install k6
```

2. Run production-style app processes where possible

Frontend:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
npm run build
npm run start
```

Backend:

- run the backend in the closest non-debug configuration you can safely use on dev

3. Export the target base URL

Examples:

```bash
export K6_BASE_URL="http://localhost:3000"
```

or if the backend host is what should be hit directly:

```bash
export K6_BASE_URL="http://localhost:8000"
```

4. Export a student pool

Minimum example:

```bash
export K6_USER_CREDENTIALS_JSON='[
  {"username":"student01","password":"Demo@12345"},
  {"username":"student02","password":"Demo@12345"},
  {"username":"student03","password":"Demo@12345"},
  {"username":"student04","password":"Demo@12345"},
  {"username":"student05","password":"Demo@12345"},
  {"username":"student06","password":"Demo@12345"},
  {"username":"student07","password":"Demo@12345"},
  {"username":"student08","password":"Demo@12345"},
  {"username":"student09","password":"Demo@12345"},
  {"username":"student10","password":"Demo@12345"}
]'
```

Important:

- for `10` VUs, try to use at least `10` distinct students
- for `50+` VUs on dev, reuse is acceptable for smoke checks, but it makes the test less realistic
- if login throttling is aggressive, prefer session-reuse scripts

## Recommended Dev Sequence

Run these in order:

1. `10` users
2. `20` users
3. `50` users
4. only then try `100`
5. treat `500` as an optional stress crash test, not a benchmark

## Best Starter Scenario

Use session-reuse discovery first because it is the safest high-signal script on dev:

- script: `performance/k6/student-session-and-exam-discovery.js`
- behavior:
  - logs in once per VU
  - reuses token
  - calls `/auth/me/`
  - calls `/student/exams/available/`

## NPM Shortcuts

From `edutech_web`:

```bash
npm run test:load:dev:student-discovery:10
npm run test:load:dev:student-discovery:50
npm run test:load:dev:student-discovery:100
npm run test:load:dev:student-discovery:500
```

Additional route-heavy checks:

```bash
npm run test:load:dev:results:10
npm run test:load:dev:results:50
npm run test:load:dev:results:100

npm run test:load:dev:analytics:10
npm run test:load:dev:analytics:50
```

Safe ramp:

```bash
npm run test:load:dev:smoke-ramp
```

## Direct Commands

If you want manual control instead of npm scripts:

```bash
K6_VUS=10 K6_ITERATIONS=10 k6 run performance/k6/student-session-and-exam-discovery.js
K6_VUS=20 K6_ITERATIONS=20 k6 run performance/k6/student-session-and-exam-discovery.js
K6_VUS=50 K6_ITERATIONS=50 k6 run performance/k6/student-session-and-exam-discovery.js
K6_VUS=100 K6_ITERATIONS=100 k6 run performance/k6/student-session-and-exam-discovery.js
K6_VUS=500 K6_ITERATIONS=500 k6 run performance/k6/student-session-and-exam-discovery.js
```

## Route Mix To Use

### Discovery

Use for:

- login sanity
- session reuse
- student exam visibility

Script:

- [student-session-and-exam-discovery.js](/Users/ansh/Documents/Eductech/performance/k6/student-session-and-exam-discovery.js:1)

### Results

Use for:

- result history stress
- summary and review endpoint checks

Script:

- [student-results-history.js](/Users/ansh/Documents/Eductech/performance/k6/student-results-history.js:1)

### Analytics

Use for:

- analytics-heavy read pressure
- slow summary routes

Script:

- [student-analytics-routes.js](/Users/ansh/Documents/Eductech/performance/k6/student-analytics-routes.js:1)

## Suggested Success Criteria On Dev

Use these as rough sanity checks only:

- request failure rate under `1%`
- no cascading `500` or `502` errors
- no login collapse at `10-20` users
- no runaway memory growth
- no severe DB lock contention

## What To Record For Each Step

For each of `10`, `20`, `50`, `100`, and optional `500`, record:

- average latency
- p95 latency
- failure rate
- app CPU
- app memory
- DB CPU
- DB slow queries
- any throttling or connection exhaustion

## Practical Advice

- if `10` fails, stop and fix correctness first
- if `50` fails, dev already exposed a meaningful bottleneck
- if `100` passes on dev, that is encouraging but still not stage-proof
- if `500` fails on dev, that may only prove your laptop is saturated

## Recommended Next Step After Dev

Once the local/dev path is stable, move the same scripts to stage for:

- `50`
- `100`
- `500`

using the stage-specific commands in:

- [STAGE_PERFORMANCE_TEST_COMMANDS.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_PERFORMANCE_TEST_COMMANDS.md:1)
