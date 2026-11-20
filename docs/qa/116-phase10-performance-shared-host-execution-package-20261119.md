# Phase 10 Performance and Shared-Host Execution Package

Date: 2026-11-19  
Stage authorized: contract preparation and read-only baseline only  
Candidate HEAD: `2221b9193b781fc22dac3e7684d199a06a4c8c7f` plus preserved dirty working tree  
Public candidate: `https://learn.accerio.in`  
Shared host: `saas-staging-02-quarantine`, `xlarge_3_1`, 4 vCPU, 16 GB RAM, 320 GB SSD  
Current verdict: **IN PROGRESS - LOAD EXECUTION NOT YET ADMITTED**

## Authorization boundary

This stage authorized non-mutating discovery, contract preparation, three ordinary public GET samples per hosted application, and read-only AWS/host/container observations. It did not authorize concurrency generation, authenticated staging fixtures, database queries, configuration changes, container restarts, provider delivery, deployment, commit or cleanup of pre-existing resources.

## Frozen scenario contracts

| ID | Priority | Acceptance contract | Current status |
|---|---|---|---|
| `EDU-PERF-001` | P1 | For frozen representative anonymous and authenticated routes, record browser navigation and API p50/p95/p99, HTTP outcomes and error rate. Warm API p95 must be at most 750 ms, browser route p95 at most 2.5 s, and error rate below 1%; no timeout or false success is allowed. | NOT RUN |
| `EDU-PERF-002` | P1 | Execute bounded synthetic concurrency in admitted steps with one worker/controller, fixed duration and exact request count. At the admitted ceiling, Eductech must preserve the `PERF-001` error contract, avoid duplicate state changes, and remain within its existing CPU/memory/PID limits. | NOT RUN |
| `EDU-PERF-003` | P0 | During bounded Eductech load, HRMS and Finacc health probes must remain successful; sibling p95 must not regress by more than 25% from the immediately preceding baseline; host memory available must stay above 4 GiB; swap growth must stay below 256 MiB; CPU pressure full must remain zero; root disk must remain below 80%; PostgreSQL/Redis health must remain intact. | NOT RUN |
| `EDU-PERF-004` | P1 | After the bounded load stops, Eductech and sibling services must remain healthy and CPU, pressure and memory must return within 20% of the pre-load baseline within 10 minutes. No abandoned test process, queued synthetic job, duplicate mutation or task-owned fixture may remain. | NOT RUN |

Thresholds are certification gates for this campaign, not general service-level guarantees. A later measured baseline may tighten them, but they must not be weakened after failures merely to obtain PASS.

## Read-only baseline

AWS identity and resource readback matched account `227022022984`, region `ap-south-1`, instance `saas-staging-02-quarantine`, bundle `xlarge_3_1`, Ubuntu 24.04 AMD64 and static IPv4 `65.0.231.86`.

Observed at approximately 13:15 UTC:

- Load average: `0.10 / 0.14 / 0.16` on 4 vCPU.
- Memory: 15 GiB total, 3.2 GiB used, 12 GiB available; swap use below 1 MiB.
- Disk: 309 GiB usable, 25 GiB used, 285 GiB available (8%).
- CPU, memory and I/O full pressure: `0.00` over the reported windows.
- Lightsail one-hour CPU: normal five-minute averages approximately 3.8-4.1%; highest sampled average 7.55%, highest sampled maximum 11.29%.
- Burst capacity percentage: 100% throughout the sampled hour.
- Thirteen containers were running. Eductech backend, web and gateway were healthy; primary HRMS, Finacc and shared platform containers were healthy where health checks are configured.
- Eductech one-shot usage: backend 237 MiB, web 112.8 MiB, gateway 10.18 MiB; aggregate observed CPU below 0.1% at the snapshot.
- Three unauthenticated GET samples each returned HTTP 200 for `learn.accerio.in`, `hrms.accerio.in` and `accerio.in`.

Configured container CPU ceilings sum beyond the four physical vCPUs. This is intentional elastic sharing but means hard limits alone do not establish sibling isolation. Live contention and recovery evidence remain mandatory.

## Admitted load design

The next execution, if separately authorized, will use synthetic-only identities and this staged ceiling:

1. Baseline: 5 minutes, no generated load; sample host and all sibling health every 5 seconds.
2. Stage A: 1 virtual user for 3 minutes.
3. Stage B: 5 virtual users for 5 minutes.
4. Stage C: 10 virtual users for 5 minutes only if A and B pass every stop condition.
5. Recovery: 10 minutes with no generated load.

Each virtual user is rate-limited to at most one request per second. The first campaign is read-heavy and uses frozen anonymous/authenticated routes; mutating exactly-once behavior, if required, uses campaign-owned synthetic records and a separately admitted fixture/cleanup contract. No unrestricted stress, spike, soak, destructive, payroll, payment or provider-delivery traffic is included.

## Immediate stop conditions

The controller must stop new traffic immediately on any of these observations:

- Any sibling health probe fails twice consecutively or returns 5xx.
- Eductech or sibling error rate reaches 1% in a completed rolling window.
- Sibling p95 exceeds 125% of its immediate baseline for two consecutive windows.
- Host available memory falls below 4 GiB or swap grows by 256 MiB.
- Host CPU full pressure becomes non-zero, load average exceeds 6 for 60 seconds, or Lightsail burst capacity falls below 80%.
- Any container becomes unhealthy, restarts unexpectedly, reaches 90% of its memory limit or hits its PID limit.
- Root disk reaches 80%, PostgreSQL/Redis health fails, or monitoring/evidence becomes unavailable.
- Target identity, candidate build, synthetic ownership or side-effect isolation differs from the admitted contract.

Stop means terminate only the task-owned load process, retain evidence, take read-only recovery samples, and do not restart or reconfigure shared services without separate authorization.

## Evidence and next authorization

Evidence directory: `docs/qa/evidence/phase10-preparation-20261119/`

- `shared-host-baseline.txt`: host, pressure, container, limit and one-shot usage evidence.
- `lightsail-metrics-one-hour.json.txt`: AWS CPU, burst and network observations.
- `public-baseline.txt`: ordinary public GET timing samples.

Required next authorization:

> Authorize Phase 10 bounded staging performance execution against `learn.accerio.in` using synthetic-only identities, the 1/5/10 virtual-user stages, one request/second/user ceiling, five-second shared-host monitoring, the frozen stop conditions above, and exact task-owned cleanup. Permit no configuration changes, restarts, provider delivery, deployment, commit or unrelated data access.

Until that authorization and environment/fixture admission are complete, `EDU-PERF-001` through `004` remain **NOT RUN**.
