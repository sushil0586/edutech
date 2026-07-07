# Stage Scale-Up Results Template

Last updated: 2026-07-06

Use this sheet immediately before and immediately after the stage instance resize.

Goal:

- keep the comparison apples-to-apples
- capture the exact evidence needed to decide whether the scale-up materially improved performance
- make it easy to update the master confidence docs after each validation wave

Related documents:

- [STAGE_SCALE_UP_VALIDATION_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SCALE_UP_VALIDATION_RUNBOOK.md)
- [STAGE_PERFORMANCE_TEST_COMMANDS.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_PERFORMANCE_TEST_COMMANDS.md)
- [FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md)
- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)

---

## Run Metadata

| Field | Before resize | After resize |
| --- | --- | --- |
| Run date |  |  |
| Tester |  |  |
| Stage URL | `https://learn.accerio.in` | `https://learn.accerio.in` |
| Instance type |  |  |
| vCPU count |  |  |
| RAM |  |  |
| Root volume size |  |  |
| Backend service config | `gunicorn --workers 5 --timeout 120` | `gunicorn --workers 5 --timeout 120` |
| Frontend service status |  |  |
| Backend service status |  |  |
| Notes |  |  |

## Direct Timing Samples

Capture three warm samples for each path, then summarize the median.

| Metric | Before resize | After resize | Delta | Outcome |
| --- | --- | --- | --- | --- |
| `login` sample 1 |  |  |  |  |
| `login` sample 2 |  |  |  |  |
| `login` sample 3 |  |  |  |  |
| `login` median |  |  |  |  |
| `me` sample 1 |  |  |  |  |
| `me` sample 2 |  |  |  |  |
| `me` sample 3 |  |  |  |  |
| `me` median |  |  |  |  |

Success guidance:

- `login` should move materially below the current `~1.2s` steady-state baseline
- `me` should stay at or below the current `~0.6s` steady-state baseline

## Auth Smoke Comparison

Command:

```bash
K6_BASE_URL=https://learn.accerio.in \
K6_USER_CREDENTIALS_JSON='[{"username":"demo-student","password":"Demo@12345"}]' \
K6_VUS=10 \
K6_ITERATIONS=10 \
k6 run performance/k6/student-login-and-exam-discovery.js
```

| Metric | Before resize | After resize | Delta | Outcome |
| --- | --- | --- | --- | --- |
| `http_req_duration avg` |  |  |  |  |
| `http_req_duration p90` |  |  |  |  |
| `http_req_duration p95` |  |  |  |  |
| `http_req_duration max` |  |  |  |  |
| request failures |  |  |  |  |
| observed host CPU |  |  |  |  |
| observed run queue |  |  |  |  |

Current baseline anchor:

- current steady run is about `6.9s to 7.1s p95`
- host CPU has been near `100%` during this smoke on the `2 vCPU` stage

## Session-Reuse Ramp Comparison

Command:

```bash
K6_BASE_URL=https://learn.accerio.in \
K6_USER_CREDENTIALS_JSON='[{"username":"psi603031-student01","password":"Demo@12345"},{"username":"psi603031-student02","password":"Demo@12345"},{"username":"psi603031-student03","password":"Demo@12345"},{"username":"psi603031-student04","password":"Demo@12345"},{"username":"psi603031-student05","password":"Demo@12345"},{"username":"psi603031-student06","password":"Demo@12345"},{"username":"psi603031-student07","password":"Demo@12345"},{"username":"psi603031-student08","password":"Demo@12345"},{"username":"psi603031-student09","password":"Demo@12345"},{"username":"psi603031-student10","password":"Demo@12345"},{"username":"psi603032-student01","password":"Demo@12345"},{"username":"psi603032-student02","password":"Demo@12345"},{"username":"psi603032-student03","password":"Demo@12345"},{"username":"psi603032-student04","password":"Demo@12345"},{"username":"psi603032-student05","password":"Demo@12345"},{"username":"psi603032-student06","password":"Demo@12345"},{"username":"psi603032-student07","password":"Demo@12345"},{"username":"psi603032-student08","password":"Demo@12345"},{"username":"psi603032-student09","password":"Demo@12345"},{"username":"psi603032-student10","password":"Demo@12345"},{"username":"psi603033-student01","password":"Demo@12345"},{"username":"psi603033-student02","password":"Demo@12345"},{"username":"psi603033-student03","password":"Demo@12345"},{"username":"psi603033-student04","password":"Demo@12345"},{"username":"psi603033-student05","password":"Demo@12345"},{"username":"psi603033-student06","password":"Demo@12345"},{"username":"psi603033-student07","password":"Demo@12345"},{"username":"psi603033-student08","password":"Demo@12345"},{"username":"psi603033-student09","password":"Demo@12345"},{"username":"psi603033-student10","password":"Demo@12345"}]' \
K6_STAGES_JSON='[{"duration":"1m","target":10},{"duration":"2m","target":20},{"duration":"2m","target":30},{"duration":"1m","target":0}]' \
k6 run performance/k6/student-session-and-exam-discovery.js
```

| Metric | Before resize | After resize | Delta | Outcome |
| --- | --- | --- | --- | --- |
| highest clean active VUs observed |  |  |  |  |
| `http_req_duration avg` |  |  |  |  |
| `http_req_duration p90` |  |  |  |  |
| `http_req_duration p95` |  |  |  |  |
| request failures |  |  |  |  |
| observed host CPU |  |  |  |  |
| observed run queue |  |  |  |  |

Current baseline anchor:

- controlled interrupted run reached `11` active VUs cleanly
- `avg 277ms`
- `p90 325ms`
- `p95 369ms`
- `0%` failures

## Host Snapshot Comparison

Capture during or immediately after each smoke/ramp run.

| Metric | Before resize | After resize | Delta | Outcome |
| --- | --- | --- | --- | --- |
| `nproc` |  |  |  |  |
| memory used |  |  |  |  |
| load average |  |  |  |  |
| backend process count |  |  |  |  |
| hottest gunicorn worker CPU |  |  |  |  |
| swap usage |  |  |  |  |

## Decision Summary

| Question | Answer |
| --- | --- |
| Did direct auth timings improve materially? |  |
| Did auth smoke `p95` improve materially? |  |
| Did session-reuse concurrency headroom improve? |  |
| Is CPU saturation reduced enough to justify keeping the larger instance? |  |
| Is another code-level optimization wave still required before more infra changes? |  |

## Required Doc Updates After This Run

After filling this sheet, update these documents:

1. [FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md)
2. [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
3. [STAGE_SCALE_UP_VALIDATION_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SCALE_UP_VALIDATION_RUNBOOK.md)

Minimum update rules:

- record actual before/after numbers
- mark the relevant phase as `validated on stage` only if measured evidence supports it
- keep any still-open bottleneck explicitly yellow until the next wave proves otherwise
