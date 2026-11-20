# Phase 10 Measurement Repair and Stage B Result

Date: 2026-11-19  
Candidate: preserved dirty candidate at `2221b9193b781fc22dac3e7684d199a06a4c8c7f`  
Verdict: **FAIL - HOST-LOCAL FINACC GATE BREACHED AT FIVE VIRTUAL USERS**

## Root cause of the first Stage A result

The original sibling regression assertion used Node fetch timings from the Mac execution controller. That measurement included the uncontrolled observer network path. Retained no-load evidence showed simultaneous HRMS/Finacc spikes of 1,167/1,071 ms while host load and pressure remained normal.

A five-minute four-hop probe then measured 57 successful samples:

| Hop | p95 | Maximum |
|---|---:|---:|
| Finacc public route from the source host | 44 ms | 45 ms |
| Host-local Caddy route | 39 ms | 43 ms |
| Direct Finacc web container | 4 ms | 5 ms |
| Direct Finacc backend health route | 29 ms | 34 ms |

The first Stage A failure is therefore classified as a **test-observer boundary defect**. Its evidence and FAIL record remain preserved; they were not overwritten or waived.

## Corrected measurement contract

The harness now uses host-local HTTPS requests through the same Caddy virtual hosts for the 125% sibling-latency stop decision. External HRMS and Finacc requests remain mandatory availability probes and are retained as diagnostic evidence, but external latency does not decide shared-host isolation. No application, container, Caddy, database or cloud configuration changed.

Fresh no-load baseline:

- Host-local HRMS p95: 58.129 ms.
- Host-local Finacc p95: 44.031 ms.
- External HRMS p95: 396.578 ms.
- External Finacc p95: 291.795 ms.

## Corrected execution

### Stage A: one virtual user

- Result: PASS for bounded stage admission.
- Requests: 180/180 successful; zero errors.
- Eductech p50/p95/p99: 84/137/294 ms.
- Host-local HRMS p95: 51 ms.
- Host-local Finacc p95: 41 ms.

### Stage B: five virtual users

- Result: STOPPED / FAIL for the frozen sibling gate.
- Requests completed before stop: 300; zero errors.
- Eductech p50/p95/p99: 94/154/317 ms.
- Host-local HRMS p95: 70 ms.
- Host-local Finacc p95: 61 ms.
- Frozen Finacc threshold: 55.039 ms.
- Stop reason: Finacc host-local p95 exceeded 125% of baseline in two rolling windows.

Stage C at ten virtual users was not run.

## Recovery and cleanup

The exact campaign user was deleted immediately after Stage B; the residual count was zero. A subsequent ten-minute no-load recovery completed without a stop:

- Host-local HRMS p95: 56 ms.
- Host-local Finacc p95: 43 ms.
- External probes remained successful.

No services were restarted or reconfigured. No deployment, commit, DNS, cloud, database-schema or provider-delivery action occurred.

## Current disposition

- `EDU-PERF-001`: BLOCKED pending the unexecuted browser-navigation portion.
- `EDU-PERF-002`: BLOCKED because the ten-VU ceiling was not admitted.
- `EDU-PERF-003`: FAIL due the corrected host-local Finacc regression at five VUs.
- `EDU-PERF-004`: PASS for recovery and exact fixture cleanup.

The shared Caddy container has a 0.5 CPU limit, but current evidence does not prove this limit caused the Stage B regression. Shared infrastructure must not be changed without a correlated Caddy/direct-container comparison during the failing five-VU window and a separately authorized remediation.

Evidence: `docs/qa/evidence/phase10-finacc-latency-root-cause-20261119/`.

Phase 11 remains not authorized and not started.
