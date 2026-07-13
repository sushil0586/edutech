# Current Student Load Execution Sheet

This sheet is the practical run companion for the current workspace.

It assumes you want to validate the student section first, beginning from the current local/dev environment and then moving to stage only after the student APIs are stable.

## Current Environment Defaults

Frontend base URL:

- `http://localhost:3000`

Possible backend base URL when hitting backend directly:

- `http://localhost:8000`

Recommended first target for current local setup:

- `http://localhost:3000`

Why:

- the existing `k6` helper supports the frontend-host base URL directly
- this is closest to what the student browser actually uses

## Known Student Credentials In Repo

The repo currently documents this shared student login:

- `demo-student` / `Demo@12345`

This is referenced in:

- [tests/e2e/README.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/README.md:18)
- [seed_demo_academic_data.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/results/management/commands/seed_demo_academic_data.py:127)

Important:

- one shared student account is enough for smoke checks
- one shared student account is not enough for realistic concurrency
- do not use only `demo-student` for higher concurrency runtime tests

## Verified Local Student Pool

Verified on the current local backend:

- total student-role accounts: `58`
- active student-role accounts: `58`
- accounts confirmed to accept `Demo@12345`: `48`

That means:

- `10` users is ready now
- `50` users is almost ready now, but you should cap at the validated `48` unless you reseed two more accounts or reset the invalid ones
- `100` and `500` are not realistic on the current local credential pool without reseeding or account generation

Validated local usernames using `Demo@12345`:

```text
demo-aws-student
demo-certification-student
demo-competitive-student
demo-gre-student
demo-jee-student
demo-language-student
demo-neet-student
demo-student
opbms.pilot.1782996054302.01
opbms.pilot.1782996054302.02
opbms.pilot.1782996054302.03
opbms.pilot.1782998073244.01
opbms.pilot.1782998073244.02
opbms.pilot.1782998073244.03
opbms.pilot.1783103683289.01
opbms.pilot.1783103683289.02
opbms.pilot.1783103683289.03
opbms.pilot.1783104138290.01
opbms.pilot.1783104138290.02
opbms.pilot.1783104138290.03
opbms.pilot.1783104594252.01
opbms.pilot.1783104594252.02
opbms.pilot.1783104594252.03
opbms.pilot.1783105858449.01
opbms.pilot.1783105858449.02
opbms.pilot.1783105858449.03
opbms.pilot.1783130225478.01
opbms.pilot.1783130225478.02
opbms.pilot.1783130225478.03
opbms.student.1782980020099.01
opbms.student.1782980020099.02
opbms.student.1782980020099.03
pcr08543.student.01
pcr08543.student.02
pcr09348.student.01
pcr09348.student.02
pcr11415.student.01
pcr11415.student.02
pcr15330.student.01
pcr15330.student.02
pcr38903.student.01
pcr38903.student.02
pcr59255.student.01
pcr59255.student.02
pcr79463.student.01
pcr79463.student.02
pcr82413.student.01
pcr82413.student.02
```

## Optional Expanded Student Pool

If your local or stage environment also contains the seeded pilot users from the stage runbook, the known pool is:

- `psi603031-student01` to `psi603031-student10`
- `psi603032-student01` to `psi603032-student10`
- `psi603033-student01` to `psi603033-student10`

All with:

- `Demo@12345`

Reference:

- [STAGE_PERFORMANCE_TEST_COMMANDS.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_PERFORMANCE_TEST_COMMANDS.md:1)

If these users are not seeded in your local environment, stay with the smoke path until you create or seed a larger pool.

## Export Commands For Current Local Run

Minimum smoke setup:

```bash
export K6_BASE_URL="http://localhost:3000"
export K6_USER_CREDENTIALS_JSON='[
  {"username":"demo-student","password":"Demo@12345"}
]'
```

Validated `10`-user local pool:

```bash
export K6_BASE_URL="http://localhost:3000"
export K6_USER_CREDENTIALS_JSON='[
  {"username":"demo-student","password":"Demo@12345"},
  {"username":"demo-jee-student","password":"Demo@12345"},
  {"username":"demo-neet-student","password":"Demo@12345"},
  {"username":"demo-gre-student","password":"Demo@12345"},
  {"username":"demo-competitive-student","password":"Demo@12345"},
  {"username":"demo-certification-student","password":"Demo@12345"},
  {"username":"demo-language-student","password":"Demo@12345"},
  {"username":"demo-aws-student","password":"Demo@12345"},
  {"username":"opbms.pilot.1782996054302.01","password":"Demo@12345"},
  {"username":"opbms.pilot.1782996054302.02","password":"Demo@12345"}
]'
```

Validated `48`-user local pool:

```bash
export K6_BASE_URL="http://localhost:3000"
export K6_USER_CREDENTIALS_JSON='[
  {"username":"demo-aws-student","password":"Demo@12345"},
  {"username":"demo-certification-student","password":"Demo@12345"},
  {"username":"demo-competitive-student","password":"Demo@12345"},
  {"username":"demo-gre-student","password":"Demo@12345"},
  {"username":"demo-jee-student","password":"Demo@12345"},
  {"username":"demo-language-student","password":"Demo@12345"},
  {"username":"demo-neet-student","password":"Demo@12345"},
  {"username":"demo-student","password":"Demo@12345"},
  {"username":"opbms.pilot.1782996054302.01","password":"Demo@12345"},
  {"username":"opbms.pilot.1782996054302.02","password":"Demo@12345"},
  {"username":"opbms.pilot.1782996054302.03","password":"Demo@12345"},
  {"username":"opbms.pilot.1782998073244.01","password":"Demo@12345"},
  {"username":"opbms.pilot.1782998073244.02","password":"Demo@12345"},
  {"username":"opbms.pilot.1782998073244.03","password":"Demo@12345"},
  {"username":"opbms.pilot.1783103683289.01","password":"Demo@12345"},
  {"username":"opbms.pilot.1783103683289.02","password":"Demo@12345"},
  {"username":"opbms.pilot.1783103683289.03","password":"Demo@12345"},
  {"username":"opbms.pilot.1783104138290.01","password":"Demo@12345"},
  {"username":"opbms.pilot.1783104138290.02","password":"Demo@12345"},
  {"username":"opbms.pilot.1783104138290.03","password":"Demo@12345"},
  {"username":"opbms.pilot.1783104594252.01","password":"Demo@12345"},
  {"username":"opbms.pilot.1783104594252.02","password":"Demo@12345"},
  {"username":"opbms.pilot.1783104594252.03","password":"Demo@12345"},
  {"username":"opbms.pilot.1783105858449.01","password":"Demo@12345"},
  {"username":"opbms.pilot.1783105858449.02","password":"Demo@12345"},
  {"username":"opbms.pilot.1783105858449.03","password":"Demo@12345"},
  {"username":"opbms.pilot.1783130225478.01","password":"Demo@12345"},
  {"username":"opbms.pilot.1783130225478.02","password":"Demo@12345"},
  {"username":"opbms.pilot.1783130225478.03","password":"Demo@12345"},
  {"username":"opbms.student.1782980020099.01","password":"Demo@12345"},
  {"username":"opbms.student.1782980020099.02","password":"Demo@12345"},
  {"username":"opbms.student.1782980020099.03","password":"Demo@12345"},
  {"username":"pcr08543.student.01","password":"Demo@12345"},
  {"username":"pcr08543.student.02","password":"Demo@12345"},
  {"username":"pcr09348.student.01","password":"Demo@12345"},
  {"username":"pcr09348.student.02","password":"Demo@12345"},
  {"username":"pcr11415.student.01","password":"Demo@12345"},
  {"username":"pcr11415.student.02","password":"Demo@12345"},
  {"username":"pcr15330.student.01","password":"Demo@12345"},
  {"username":"pcr15330.student.02","password":"Demo@12345"},
  {"username":"pcr38903.student.01","password":"Demo@12345"},
  {"username":"pcr38903.student.02","password":"Demo@12345"},
  {"username":"pcr59255.student.01","password":"Demo@12345"},
  {"username":"pcr59255.student.02","password":"Demo@12345"},
  {"username":"pcr79463.student.01","password":"Demo@12345"},
  {"username":"pcr79463.student.02","password":"Demo@12345"},
  {"username":"pcr82413.student.01","password":"Demo@12345"},
  {"username":"pcr82413.student.02","password":"Demo@12345"}
]'
```

Shortcut using the reusable export script:

```bash
source /Users/ansh/Documents/Eductech/performance/k6/export-local-student-pool-48.sh
```

If you have the 30-user pilot pool locally:

```bash
export K6_BASE_URL="http://localhost:3000"
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

## Current Recommended Run Order

### Phase 1: Discovery

Run first:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
npm run test:load:dev:student-discovery:10
npm run test:load:dev:student-discovery:50
npm run test:load:dev:student-discovery:100
```

Best current near-`50` local run:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
source ../performance/k6/export-local-student-pool-48.sh
npm run test:load:dev:student-discovery:48
```

Optional stress:

```bash
npm run test:load:dev:student-discovery:500
```

### Phase 2: Results

Run after discovery is stable:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
npm run test:load:dev:results:10
npm run test:load:dev:results:50
npm run test:load:dev:results:100
```

Best current near-`50` local follow-up:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
source ../performance/k6/export-local-student-pool-48.sh
npm run test:load:dev:results:48
```

### Phase 3: Analytics

Run after results is stable:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
npm run test:load:dev:analytics:10
npm run test:load:dev:analytics:50
```

For `100` and `500`, prefer stage or a stronger shared environment.

### Phase 4: Runtime

Only run after confirming:

- students can see a startable exam
- results and analytics smoke runs are already stable
- you have enough distinct students to avoid attempt collisions

Smoke runtime:

```bash
cd /Users/ansh/Documents/Eductech
K6_BASE_URL="http://localhost:3000" \
K6_VUS=5 \
K6_ITERATIONS=5 \
K6_SAVE_COUNT=5 \
K6_SUBMIT_AT_END=true \
k6 run performance/k6/student-exam-runtime.js
```

## Pass / Fail Checklist

### Discovery

| Step | Command | Pass if | Status |
| --- | --- | --- | --- |
| `10` | `npm run test:load:dev:student-discovery:10` | no crash, failure rate under `1%` | `TODO` |
| `50` | `npm run test:load:dev:student-discovery:50` | auth and exam listing still stable | `TODO` |
| `100` | `npm run test:load:dev:student-discovery:100` | acceptable p95, no repeated `500` or `502` | `TODO` |
| `500` | `npm run test:load:dev:student-discovery:500` | optional stress only | `TODO` |

### Results

| Step | Command | Pass if | Status |
| --- | --- | --- | --- |
| `10` | `npm run test:load:dev:results:10` | results/summary/review stable | `TODO` |
| `50` | `npm run test:load:dev:results:50` | no result collapse, no DB distress | `TODO` |
| `100` | `npm run test:load:dev:results:100` | still readable, no widespread timeout | `TODO` |

### Analytics

| Step | Command | Pass if | Status |
| --- | --- | --- | --- |
| `10` | `npm run test:load:dev:analytics:10` | summary and question analytics stable | `TODO` |
| `50` | `npm run test:load:dev:analytics:50` | aggregation routes still healthy | `TODO` |

### Runtime

| Step | Command | Pass if | Status |
| --- | --- | --- | --- |
| smoke | `k6 run performance/k6/student-exam-runtime.js` | start, load, save, submit all succeed | `TODO` |

## What To Record Each Time

- p50
- p95
- failure rate
- app CPU
- app memory
- DB CPU
- DB slow queries
- any `429`, `500`, `502`, or timeout spikes

## Decision Rules For Current Setup

- if `demo-student` login fails, fix seeding before load testing further
- if only `demo-student` exists, limit yourself to smoke discovery and smoke results checks
- if you want meaningful `50+` concurrency, seed a wider student pool first
- if runtime causes collisions, stop and switch to a unique-student pool

## Best Next Move

For the current environment, the cleanest first execution is:

1. export `demo-student`
2. run discovery `10`
3. run results `10`
4. confirm whether a wider seeded student pool exists
5. only then move to `50`

## Related Docs

- [STUDENT_LOAD_TEST_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STUDENT_LOAD_TEST_PLAN.md:1)
- [DEV_LOAD_TEST_COMMANDS.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/DEV_LOAD_TEST_COMMANDS.md:1)
- [STAGE_PERFORMANCE_TEST_COMMANDS.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_PERFORMANCE_TEST_COMMANDS.md:1)
