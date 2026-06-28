# Stage Performance Test Commands

These commands are prepared for the current stage environment:

- base URL: `https://learn.accerio.in`
- student password: `Demo@12345`

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
