# Performance Test Plan

This document defines the practical performance-testing approach for the current Nexora Learn stack.

The goal is not to start with massive synthetic scale. The goal is to prove the exam-day flow under controlled staged load, find the first bottlenecks, and size infrastructure based on evidence.

## What Performance Testing Should Cover

The most business-critical learner journey is:

1. student login
2. fetch available exams
3. start or resume attempt
4. load attempt workspace
5. save multiple answers
6. submit attempt

This is the flow that matters most for:

- morning exam start rush
- active exam runtime pressure
- final submission spike

## What Tool To Use For What

### Playwright

Use Playwright for:

- correctness under light concurrency
- UI/runtime issues
- browser rendering and navigation problems
- exam-day functional regression

Do not use Playwright as the primary high-scale load tool.

### k6

Use `k6` for:

- API concurrency
- latency measurement
- throughput measurement
- error-rate detection
- exam start / save / submit traffic simulation

This repository now includes starter `k6` scripts in:

- [performance/k6/student-login-and-exam-discovery.js](/Users/ansh/Documents/Eductech/performance/k6/student-login-and-exam-discovery.js:1)
- [performance/k6/student-exam-runtime.js](/Users/ansh/Documents/Eductech/performance/k6/student-exam-runtime.js:1)

## Recommended Test Environments

Run these in order:

1. local or dev sanity
2. stage with production-like seed data
3. pilot infra before real institute load

Do not first-run high-volume load tests directly against production.

## Minimum Data Prerequisites

Before running meaningful performance tests, prepare:

- at least `1` institute with `50-200` students
- at least `1` live exam with `50` questions
- ideally multiple student credentials
- ideally one unique student account per VU

Strong recommendation:

- do not reuse the same student account across many VUs for full-lifecycle tests
- use a user pool large enough to prevent attempt-state collisions

## Test Scenarios

### Scenario A. Login And Exam Discovery Rush

Purpose:

- simulate students logging in and opening exam list before exam start

Primary API pressure:

- `/api/v1/auth/login/`
- `/api/v1/student/exams/available/`

Starter script:

- `performance/k6/student-login-and-exam-discovery.js`

### Scenario B. Exam Runtime Flow

Purpose:

- simulate students entering the attempt workspace and saving answers

Primary API pressure:

- `/api/v1/attempts/start/`
- `/api/v1/attempts/{attemptId}/`
- `/api/v1/attempts/{attemptId}/save-answer/`
- `/api/v1/attempts/{attemptId}/submit/`

Starter script:

- `performance/k6/student-exam-runtime.js`

### Scenario C. Submission Spike

Purpose:

- simulate many students submitting near the end of the exam window

Implementation note:

- reuse the runtime script with:
  - low save count
  - `submit_at_end=true`
  - a short high-concurrency ramp

### Scenario D. Active Exam Save Pressure

Purpose:

- simulate frequent answer saves during the active attempt window

Implementation note:

- reuse the runtime script with:
  - higher `K6_SAVE_COUNT`
  - `K6_SUBMIT_AT_END=false`
  - moderate sustained VU count

## Recommended Execution Order

### Pass 1. Smoke Load

- `10-20` VUs
- validate success/failure behavior
- validate stage data assumptions

### Pass 2. Pilot Load

- `50-100` VUs
- identify first obvious app or DB bottlenecks

### Pass 3. Controlled Scale-Up

- `200-300` VUs
- monitor DB and web nodes closely

### Pass 4. Event Simulation

- dedicated start-rush test
- dedicated submission-spike test

## Metrics To Watch

### Application Metrics

- request success rate
- p50 latency
- p95 latency
- p99 latency
- requests per second
- timeout count
- 4xx / 5xx count

### Business Flow Metrics

- login success rate
- exam-list fetch latency
- attempt start success rate
- attempt detail load latency
- save-answer latency
- submit latency

### Infrastructure Metrics

- app CPU
- app memory
- DB CPU
- DB memory
- DB connections
- disk IOPS
- network throughput

### Database Signals

- slow query log
- query count during spikes
- lock contention
- replication lag if replicas exist

## Threshold Guidance

Suggested initial thresholds:

- login p95 under `1500 ms`
- exam-list p95 under `1500 ms`
- attempt detail p95 under `2000 ms`
- save-answer p95 under `2000 ms`
- submit p95 under `3000 ms`
- failure rate under `1%`

These are practical starting thresholds, not absolute final SLAs.

## How To Install k6

Examples:

```bash
brew install k6
```

or follow the official package instructions for your OS.

## How To Run The Included Scripts

### 1. Login And Exam Discovery

```bash
K6_BASE_URL=https://learn.accerio.in \
K6_USER_CREDENTIALS_JSON='[{"username":"student01","password":"Demo@12345"},{"username":"student02","password":"Demo@12345"}]' \
k6 run performance/k6/student-login-and-exam-discovery.js
```

### 2. Exam Runtime Flow

```bash
K6_BASE_URL=https://learn.accerio.in \
K6_USER_CREDENTIALS_JSON='[{"username":"student01","password":"Demo@12345"},{"username":"student02","password":"Demo@12345"}]' \
K6_SAVE_COUNT=10 \
K6_SUBMIT_AT_END=true \
k6 run performance/k6/student-exam-runtime.js
```

### 3. Ramp Test Example

```bash
K6_BASE_URL=https://learn.accerio.in \
K6_USER_CREDENTIALS_JSON='[{"username":"student01","password":"Demo@12345"},{"username":"student02","password":"Demo@12345"},{"username":"student03","password":"Demo@12345"}]' \
K6_STAGES_JSON='[{"duration":"2m","target":20},{"duration":"5m","target":50},{"duration":"2m","target":0}]' \
k6 run performance/k6/student-login-and-exam-discovery.js
```

## Important Constraints

- Full-lifecycle scripts should ideally use one unique student per VU.
- If many VUs reuse the same student, results can become invalid due to shared active-attempt state.
- For high-concurrency stage tests, prepare dedicated test accounts first.
- Keep seed data stable before comparing two runs.

## Practical First Recommendation

Start with these two runs:

1. login and exam-discovery rush at `20-50` VUs
2. runtime flow at `10-20` VUs with `50` question exams

After that:

- inspect error rates
- inspect DB health
- inspect save-answer and submit latency
- only then increase concurrency

## What This Does Not Replace

These scripts do not replace:

- frontend UAT
- Playwright workflow validation
- security testing
- long-duration soak testing
- true production-scale capacity planning

They are the first practical layer of evidence for exam-day readiness.
