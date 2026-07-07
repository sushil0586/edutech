# Stage Performance Test Commands

These commands are prepared for the current stage environment:

- base URL: `https://learn.accerio.in`
- student password: `Demo@12345`

## Shared Stage Credentials

Use these first for browser sanity and route validation before running `k6`:

- `demo-platform-admin` / `Demo@12345`
- `demo-institute-admin` / `Demo@12345`
- `demo-teacher` / `Demo@12345`
- `demo-student` / `Demo@12345`

These are not the main high-concurrency pool. They are the Wave 1 validation accounts for:

- stage login confirmation
- role-shell confirmation
- student exam visibility confirmation
- institute and teacher results/reviews/live/analysis route confirmation

## Available Student Pool

Current seeded pilot student users:

- `psi603031-student01` to `psi603031-student10`
- `psi603032-student01` to `psi603032-student10`
- `psi603033-student01` to `psi603033-student10`

That gives a total pool of `30` students for controlled stage load tests.

## 1. Install k6

```bash
brew install k6
```

## 2. Export The Shared User Pool

```bash
export K6_BASE_URL="https://learn.accerio.in"

export K6_USER_CREDENTIALS_JSON='[
  {"username":"psi603031-student01","password":"Demo@12345"},
  {"username":"psi603031-student02","password":"Demo@12345"},
  {"username":"psi603031-student03","password":"Demo@12345"},
  {"username":"psi603031-student04","password":"Demo@12345"},
  {"username":"psi603031-student05","password":"Demo@12345"},
  {"username":"psi603031-student06","password":"Demo@12345"},
  {"username":"psi603031-student07","password":"Demo@12345"},
  {"username":"psi603031-student08","password":"Demo@12345"},
  {"username":"psi603031-student09","password":"Demo@12345"},
  {"username":"psi603031-student10","password":"Demo@12345"},
  {"username":"psi603032-student01","password":"Demo@12345"},
  {"username":"psi603032-student02","password":"Demo@12345"},
  {"username":"psi603032-student03","password":"Demo@12345"},
  {"username":"psi603032-student04","password":"Demo@12345"},
  {"username":"psi603032-student05","password":"Demo@12345"},
  {"username":"psi603032-student06","password":"Demo@12345"},
  {"username":"psi603032-student07","password":"Demo@12345"},
  {"username":"psi603032-student08","password":"Demo@12345"},
  {"username":"psi603032-student09","password":"Demo@12345"},
  {"username":"psi603032-student10","password":"Demo@12345"},
  {"username":"psi603033-student01","password":"Demo@12345"},
  {"username":"psi603033-student02","password":"Demo@12345"},
  {"username":"psi603033-student03","password":"Demo@12345"},
  {"username":"psi603033-student04","password":"Demo@12345"},
  {"username":"psi603033-student05","password":"Demo@12345"},
  {"username":"psi603033-student06","password":"Demo@12345"},
  {"username":"psi603033-student07","password":"Demo@12345"},
  {"username":"psi603033-student08","password":"Demo@12345"},
  {"username":"psi603033-student09","password":"Demo@12345"},
  {"username":"psi603033-student10","password":"Demo@12345"}
]'
```

## 3. Smoke Run: Login And Exam Discovery

Good first check:

- validates auth
- validates student-exam listing
- low risk

```bash
K6_VUS=10 \
K6_ITERATIONS=10 \
k6 run performance/k6/student-login-and-exam-discovery.js
```

## 4. Ramp Run: Login And Exam Discovery

Good first real stage load:

```bash
K6_STAGES_JSON='[
  {"duration":"1m","target":10},
  {"duration":"2m","target":20},
  {"duration":"2m","target":30},
  {"duration":"1m","target":0}
]' \
k6 run performance/k6/student-login-and-exam-discovery.js
```

Important note:

- the backend login throttle is currently `10/minute`
- this ramp shape reuses the same student identities repeatedly
- on the current script shape, the test can start returning `429` before it becomes a clean pure-capacity signal
- if you want a clean higher-scale auth test, either:
  - temporarily raise the stage login throttle for the validation window
  - increase the unique user pool enough that repeated logins per identity stay below the throttle window
  - switch the scenario shape so the same authenticated session is reused instead of relogging every loop

## 4.1 Ramp Run: Reuse Session And Exam Discovery

Use this when you want a cleaner higher-scale discovery test without repeatedly logging the same identity on every loop:

```bash
K6_STAGES_JSON='[
  {"duration":"1m","target":10},
  {"duration":"2m","target":20},
  {"duration":"2m","target":30},
  {"duration":"1m","target":0}
]' \
k6 run performance/k6/student-session-and-exam-discovery.js
```

What this measures better:

- authenticated session reuse
- `/auth/me/` behavior under repeated access
- student exam discovery under higher concurrency

What this does not measure directly:

- repeated login throughput per loop

Current observed signal on the `2 vCPU` stage host:

- a controlled interrupted run reached `11` active VUs cleanly
- `0%` request failures
- `http_req_duration` about:
  - `avg 277ms`
  - `p90 325ms`
  - `p95 369ms`

Treat this as the current best higher-scale session-discovery baseline before the instance resize.

## 5. Smoke Run: Exam Runtime

This runs:

- login
- fetch available exams
- start or resume attempt
- load attempt detail
- save answers
- submit

Use this only after confirming the stage student accounts really have visible startable exams.

```bash
K6_VUS=5 \
K6_ITERATIONS=5 \
K6_SAVE_COUNT=5 \
K6_SUBMIT_AT_END=true \
k6 run performance/k6/student-exam-runtime.js
```

## 6. Moderate Runtime Run

For a stronger but still controlled pass:

```bash
K6_STAGES_JSON='[
  {"duration":"1m","target":5},
  {"duration":"3m","target":10},
  {"duration":"3m","target":15},
  {"duration":"1m","target":0}
]' \
K6_SAVE_COUNT=10 \
K6_SUBMIT_AT_END=true \
k6 run performance/k6/student-exam-runtime.js
```

## 7. Save-Pressure Run Without Submit

Useful when you want to stress `save-answer` without consuming all test attempts too quickly:

```bash
K6_STAGES_JSON='[
  {"duration":"1m","target":5},
  {"duration":"4m","target":10},
  {"duration":"1m","target":0}
]' \
K6_SAVE_COUNT=15 \
K6_SUBMIT_AT_END=false \
k6 run performance/k6/student-exam-runtime.js
```

## 8. Submission Spike Run

Use this only after confirming enough unique student accounts still have available attempts:

```bash
K6_STAGES_JSON='[
  {"duration":"30s","target":5},
  {"duration":"30s","target":15},
  {"duration":"30s","target":25},
  {"duration":"30s","target":0}
]' \
K6_SAVE_COUNT=2 \
K6_SUBMIT_AT_END=true \
k6 run performance/k6/student-exam-runtime.js
```

## 9. Recommended Execution Order

Run these in order:

1. login/discovery smoke
2. login/discovery ramp
3. runtime smoke
4. runtime moderate
5. save-pressure or submission-spike depending on what you want to study

## 10. What To Watch During The Run

Server side:

- app CPU
- app memory
- DB CPU
- DB memory
- DB connections
- nginx / gateway error rate
- backend 4xx / 5xx rate

User-flow side:

- login failures
- no exam available failures
- attempt start failures
- save-answer failures
- submit failures

## 11. Important Safety Notes

- Do not run high-concurrency runtime tests with reused students beyond the available attempt allowance.
- The runtime script can consume real attempts.
- If required, refresh or reseed the stage exam state before repeating many runtime runs.
- Prefer login/discovery load first, because it is cheaper and safer.

## 12. Practical Recommendation For Today

For today, the safest first two commands are:

```bash
K6_VUS=10 \
K6_ITERATIONS=10 \
k6 run performance/k6/student-login-and-exam-discovery.js
```

```bash
K6_VUS=5 \
K6_ITERATIONS=5 \
K6_SAVE_COUNT=5 \
K6_SUBMIT_AT_END=true \
k6 run performance/k6/student-exam-runtime.js
```

## 13. Stage Performance Wave 1

Run this exact order for the next performance-confidence step:

1. Browser sanity with the shared demo accounts
2. Host monitoring setup on `3.106.125.117`
3. Student login/discovery smoke load
4. Student login/discovery ramp
5. Student runtime smoke load only if the demo or pooled students have visible startable exams

### 13.1 Browser sanity

Confirm each login manually first:

- platform admin -> `/admin`
- institute admin -> `/institute/dashboard`
- teacher -> `/teacher/dashboard`
- student -> `/app/dashboard`

Then confirm these high-value stage routes load cleanly:

- student:
  - `/app/exams`
  - one exam detail route if visible
  - `/app/results`
  - `/app/analytics`
- institute:
  - `/institute/results`
  - `/institute/reviews`
  - `/institute/results/live`
  - `/institute/results/analysis`
- teacher:
  - `/teacher/results`
  - `/teacher/reviews`
  - `/teacher/results/live`
  - `/teacher/results/analysis`

Do not start `k6` if:

- login fails for any required account
- student exam visibility is empty for all candidate users
- results or review shells are crashing before load begins

### 13.2 Host monitoring

Open one SSH session and follow:

```bash
ssh -i ~/Downloads/bansalsushil05.pem ubuntu@3.106.125.117
htop
```

Also keep these ready in separate tabs:

```bash
sudo journalctl -u nexora-learn-backend -f
```

```bash
sudo tail -f /var/log/nginx/error.log
```

```bash
watch -n 10 'df -h && echo "---" && free -h && echo "---" && sudo -u postgres psql -c "select count(*) from pg_stat_activity;"'
```

### 13.3 Wave 1 success criteria

Count Wave 1 as a good first pass if:

- shared stage logins work
- student login/discovery smoke passes without unusual auth failures
- ramp run completes without sustained `5xx` growth
- backend and frontend services stay up throughout the run
- disk usage stays below the current danger zone
- no obvious DB connection runaway appears during the run

### 13.4 Record after each run

Write down:

- date and time
- command used
- VU or stage shape
- p95 and p99 latency
- failure rate
- host CPU and memory readout
- peak DB connection count
- nginx `5xx` count or absence of `5xx`
- whether the student exam pool had enough visible/startable attempts
