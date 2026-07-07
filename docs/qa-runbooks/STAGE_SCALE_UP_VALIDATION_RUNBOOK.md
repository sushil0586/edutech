# Stage Scale-Up Validation Runbook

Last updated: 2026-07-06

## Purpose

Use this runbook after increasing stage compute capacity so we can answer one concrete question:

Does a larger stage instance materially reduce auth and exam-discovery latency under the same controlled load?

This runbook exists because the current stage evidence is already strong:

- current stage host: `2 vCPU`, `~1.9 GB RAM`
- current live backend config: `gunicorn --workers 5 --timeout 120`
- current auth-path code is materially improved already
- remaining `p95` tail is now better explained by CPU saturation than by one obvious serializer bottleneck

## Current Baseline

Use these as the comparison anchors before and after scale-up:

- direct steady-state stage timings:
  - `login ~1.2s`
  - `me ~0.6s`
- `k6` student login and exam discovery smoke:
  - `10 VU`
  - `10 iterations`
  - latest steady-state result: about `6.9s to 7.1s p95`
- host behavior during the same smoke:
  - CPU near `100%`
  - elevated run queue depth
  - no meaningful request failure rate

## Recommended Upgrade Goal

For the next validation wave, prefer one larger instance step instead of many tiny changes.

Recommended target:

- move from the current `2 vCPU` class to at least `4 vCPU`
- keep RAM proportional, ideally `>= 8 GB`

Recommended AWS-friendly target choices:

- minimum useful comparison target:
  - `t3.xlarge`
  - `4 vCPU`
  - `16 GB RAM`
- if you want a more compute-oriented validation target:
  - `c6i.xlarge`
  - `4 vCPU`
  - `8 GB RAM`

Practical recommendation:

- use `t3.xlarge` first for the next stage validation wave
- it gives a cleaner before/after comparison because CPU increases materially and memory headroom also improves
- avoid `t3.large` for this wave because it still keeps you at `2 vCPU`, which does not test the main saturation hypothesis

Do not change application code for this wave.

Do not change the live gunicorn model for this wave.

Keep the backend service config at:

```bash
--workers 5 --timeout 120
```

That keeps the comparison clean.

## Resize Procedure

Use the cloud provider control plane for the instance-type change.

Recommended order:

1. confirm the current stage instance is healthy
2. stop the stage instance
3. change instance type to the chosen `4 vCPU` target
4. start the instance again
5. confirm SSH, app services, and disk are healthy
6. run the validation flow in this document without changing app code

If the root volume or attached storage was already resized earlier, that does not need to be repeated just because the instance type changes.

Use this comparison sheet during the validation run:

- [STAGE_SCALE_UP_RESULTS_TEMPLATE.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SCALE_UP_RESULTS_TEMPLATE.md)

## Fast Post-Resize Sanity

Run these immediately after the instance starts:

```bash
ssh -i ~/Downloads/bansalsushil05.pem ubuntu@3.106.125.117
nproc
free -h
df -h
sudo systemctl status nexora-learn-backend --no-pager
sudo systemctl status nexora-learn-web --no-pager
curl -I https://learn.accerio.in/
```

Expected outcome:

- `nproc` should reflect the upgraded CPU count
- backend and frontend services should both be `active (running)`
- site should return a healthy HTTP response

## Pre-Scale Checklist

Before resizing the instance:

1. Confirm the backend service is on the baseline config.
2. Confirm disk free space is healthy.
3. Confirm shared demo logins still work.
4. Confirm the same `k6` credential pool is still valid.
5. Record one fresh baseline run if the environment changed since the last comparison.

## Exact Validation Order

Run these steps after the larger instance is live.

### 1. Confirm instance shape

```bash
ssh -i ~/Downloads/bansalsushil05.pem ubuntu@3.106.125.117
nproc
free -m
df -h
```

Record:

- vCPU count
- RAM
- available disk

### 2. Confirm backend service config

```bash
sudo systemctl status nexora-learn-backend --no-pager
ps -o pid,ppid,%cpu,%mem,cmd -C gunicorn
```

Record:

- gunicorn worker count
- worker class
- memory footprint

### 3. Confirm stage role logins

Manual browser sanity:

- `demo-platform-admin`
- `demo-institute-admin`
- `demo-teacher`
- `demo-student`

### 4. Measure direct auth timings

Run three steady-state samples:

```bash
python3 - <<'EOF'
import json, subprocess, time
base='https://learn.accerio.in'
for _ in range(3):
    login_cmd = "curl -k -s -H 'Content-Type: application/json' --data '{\"username\":\"demo-student\",\"password\":\"Demo@12345\"}' " + base + "/api/v1/auth/login/"
    start=time.perf_counter()
    login_raw=subprocess.check_output(login_cmd, shell=True, text=True)
    login_ms=round((time.perf_counter()-start)*1000,2)
    token=json.loads(login_raw)['access']
    me_cmd = "curl -k -s -H 'Authorization: Bearer " + token + "' " + base + "/api/v1/auth/me/"
    start=time.perf_counter()
    _=subprocess.check_output(me_cmd, shell=True, text=True)
    me_ms=round((time.perf_counter()-start)*1000,2)
    print({'login_ms': login_ms, 'me_ms': me_ms})
EOF
```

Record:

- direct `login` timing
- direct `me` timing

### 5. Run the exact same smoke load

```bash
K6_BASE_URL=https://learn.accerio.in \
K6_USER_CREDENTIALS_JSON='[{"username":"demo-student","password":"Demo@12345"}]' \
K6_VUS=10 \
K6_ITERATIONS=10 \
k6 run performance/k6/student-login-and-exam-discovery.js
```

Record:

- `avg`
- `median`
- `p90`
- `p95`
- `max`
- failure rate

Optional follow-up after the baseline comparison:

If you want a cleaner higher-scale discovery signal without repeated re-login per loop, also run:

```bash
K6_BASE_URL=https://learn.accerio.in \
K6_USER_CREDENTIALS_JSON='[{"username":"psi603031-student01","password":"Demo@12345"},{"username":"psi603031-student02","password":"Demo@12345"},{"username":"psi603031-student03","password":"Demo@12345"},{"username":"psi603031-student04","password":"Demo@12345"},{"username":"psi603031-student05","password":"Demo@12345"},{"username":"psi603031-student06","password":"Demo@12345"},{"username":"psi603031-student07","password":"Demo@12345"},{"username":"psi603031-student08","password":"Demo@12345"},{"username":"psi603031-student09","password":"Demo@12345"},{"username":"psi603031-student10","password":"Demo@12345"},{"username":"psi603032-student01","password":"Demo@12345"},{"username":"psi603032-student02","password":"Demo@12345"},{"username":"psi603032-student03","password":"Demo@12345"},{"username":"psi603032-student04","password":"Demo@12345"},{"username":"psi603032-student05","password":"Demo@12345"},{"username":"psi603032-student06","password":"Demo@12345"},{"username":"psi603032-student07","password":"Demo@12345"},{"username":"psi603032-student08","password":"Demo@12345"},{"username":"psi603032-student09","password":"Demo@12345"},{"username":"psi603032-student10","password":"Demo@12345"},{"username":"psi603033-student01","password":"Demo@12345"},{"username":"psi603033-student02","password":"Demo@12345"},{"username":"psi603033-student03","password":"Demo@12345"},{"username":"psi603033-student04","password":"Demo@12345"},{"username":"psi603033-student05","password":"Demo@12345"},{"username":"psi603033-student06","password":"Demo@12345"},{"username":"psi603033-student07","password":"Demo@12345"},{"username":"psi603033-student08","password":"Demo@12345"},{"username":"psi603033-student09","password":"Demo@12345"},{"username":"psi603033-student10","password":"Demo@12345"}]' \
K6_STAGES_JSON='[{"duration":"1m","target":10},{"duration":"2m","target":20},{"duration":"2m","target":30},{"duration":"1m","target":0}]' \
k6 run performance/k6/student-session-and-exam-discovery.js
```

Use this second result to study:

- session reuse under load
- `/auth/me/` plus exam-discovery behavior without colliding with repeated-login throttling

### 6. Monitor host behavior during the smoke

In a parallel SSH tab:

```bash
ps -o pid,ppid,%cpu,%mem,cmd -C gunicorn
vmstat 1 12
```

Record:

- whether CPU still pegs near `100%`
- whether run queue depth stays elevated
- whether swap activity appears

Populate the same observations into:

- [STAGE_SCALE_UP_RESULTS_TEMPLATE.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SCALE_UP_RESULTS_TEMPLATE.md)

### 7. Record the outcome in one place

Immediately after the run:

1. fill [STAGE_SCALE_UP_RESULTS_TEMPLATE.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SCALE_UP_RESULTS_TEMPLATE.md)
2. update the findings in this runbook
3. update the master plan and confidence matrix with the measured before/after evidence

Do not treat the wave as successful based only on subjective feel.

## Success Criteria

Treat the scale-up wave as a clear win if most of these are true:

- direct `login` drops meaningfully below the current `~1.2s`
- direct `me` drops meaningfully below the current `~0.6s`
- smoke `p95` drops materially below the current `~6.9s to 7.1s`
- host CPU no longer stays pinned near `100%` for most of the run
- failure rate stays at `0%`

Strong signal:

- `p95` improves by `30%+`
- CPU saturation materially relaxes

Weak signal:

- only median improves
- `p95` stays broadly unchanged
- CPU still pegs near `100%`

## Interpretation Guide

If the larger instance materially improves `p95`:

- the next constraint was infrastructure size
- keep the code improvements already made
- move next to broader stage load validation

If the larger instance does not materially improve `p95`:

- re-open backend queueing and downstream dependency analysis
- inspect database waits and nginx upstream timing
- expand endpoint-level timing instrumentation

## What To Update After The Run

After the scale-up validation wave, update:

- [FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md)
- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
- [STAGE_PERFORMANCE_TEST_COMMANDS.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_PERFORMANCE_TEST_COMMANDS.md)

Add:

- upgraded instance shape
- direct auth timings before and after
- `k6` smoke metrics before and after
- host CPU behavior before and after
- whether stage performance confidence should move

## Related Documents

- [STAGE_PERFORMANCE_TEST_COMMANDS.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_PERFORMANCE_TEST_COMMANDS.md)
- [STAGE_PERFORMANCE_MONITORING_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_PERFORMANCE_MONITORING_CHECKLIST.md)
- [FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md)
- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
