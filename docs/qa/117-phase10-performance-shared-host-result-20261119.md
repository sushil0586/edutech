# Phase 10 Performance and Shared-Host Result

Date: 2026-11-19  
Candidate HEAD: `2221b9193b781fc22dac3e7684d199a06a4c8c7f` plus preserved dirty working tree  
Target: `https://learn.accerio.in` on shared Lightsail `saas-staging-02-quarantine`  
Verdict: **FAIL - SIBLING LATENCY GATE BREACHED**

Continuation: the external-observer boundary was repaired and the bounded campaign was rerun. Stage A passed, but the corrected host-local Finacc gate failed at five virtual users. See `118-phase10-measurement-repair-and-stage-b-result-20261119.md`. The overall Phase 10 verdict remains FAIL.

## Scenario results

| ID | Result | Evidence-backed disposition |
|---|---|---|
| `EDU-PERF-001` | BLOCKED | Stage A Eductech GET traffic completed 34/34 requests with zero errors, 81 ms p50, 153 ms p95 and 200 ms p99. Full browser-navigation evidence was not executed because the P0 sibling stop condition fired. |
| `EDU-PERF-002` | BLOCKED | One-VU Stage A began at one request/second. The campaign stopped before five- and ten-VU stages, as required by the safety contract. |
| `EDU-PERF-003` | FAIL | Finacc public p95 reached 909 ms versus its immediate 275 ms baseline and exceeded 125% in two rolling windows. Eductech had zero errors, but sibling-isolation acceptance failed. |
| `EDU-PERF-004` | PASS | A full ten-minute no-load recovery completed with 120/120 monitoring samples, no stop condition, healthy containers, no CPU/memory full pressure, at least 12.1 GiB available memory, stable swap and exact fixture cleanup. |

Phase result: **1 PASS, 0 CONDITIONAL, 1 FAIL, 2 BLOCKED, 0 NOT RUN**.

## Valid execution

The final uninterrupted campaign used a fresh five-minute immediate baseline:

- HRMS baseline p95: 374 ms.
- Finacc baseline p95: 275 ms.
- Host baseline: at least 12.14 GiB available memory, maximum load 0.30, zero CPU/memory full pressure, zero unhealthy containers.

Stage A then generated one request per second from one synthetic platform-administrator virtual user across the public home page, authenticated identity endpoint and bounded institute directory endpoint.

- Requests: 34.
- Errors: 0.
- Eductech p50/p95/p99: 81/153/200 ms.
- Maximum host load: 0.62.
- Minimum available memory: 12.16 GiB.
- Maximum container memory utilization: 42.14%.
- CPU and memory full pressure: zero.
- Unhealthy/restarting containers: zero.
- HRMS p95: 325 ms, within its baseline threshold.
- Finacc p95: 909 ms, exceeding the 343 ms threshold.

The controller stopped Stage A immediately. Stages B and C were not started.

## Recovery and cleanup

The final ten-minute recovery window completed without generated load:

- Monitoring samples: 120.
- HRMS p95: 368 ms.
- Finacc p95: 317 ms.
- Minimum available memory: 12.13 GiB.
- Maximum load: 1.29, below the stop threshold.
- Swap: approximately 0.9 MiB with no material growth.
- CPU/memory full pressure: zero.
- Unhealthy containers: zero.
- Maximum container memory utilization: 42.25%.

All campaign usernames were checked together after cleanup: residual count `0`. Final public probes for Eductech, HRMS and Finacc returned HTTP 200. No container was restarted or reconfigured, and no deployment, provider delivery, commit or cloud mutation occurred.

## Preserved failed attempts

1. Initial Stage A stopped when one strict SSH monitoring sample failed. The harness added bounded same-sample transport retries without removing any safety assertion.
2. A rerun was interrupted when the local Mac slept for 15 minutes; the impossible 900-second request sample and cleanup evidence are retained.
3. A later Stage A stopped on an older HRMS/Finacc comparison baseline. A ten-minute no-load observation showed the external baseline had shifted, so the final campaign recomputed a fresh immediate baseline.
4. The final uninterrupted Stage A still failed the Finacc sibling-latency gate and is the authoritative result.

## Root-cause boundary

The evidence does **not** show CPU, memory, swap, disk, PID, PostgreSQL, Redis or container-health exhaustion. It shows intermittent public-path Finacc latency, including outliers during both baseline/recovery and Stage A. The available evidence cannot yet distinguish Finacc application latency, shared Caddy behavior, network/TLS variability or the external observer path. Therefore the P0 acceptance violation remains unresolved and must not be waived as mere network noise.

## Evidence

Preparation: `docs/qa/evidence/phase10-preparation-20261119/`  
Execution: `docs/qa/evidence/phase10-performance-20261119/`

Key current evidence:

- `immediate-baseline-final-5m.jsonl`
- `stage-a-uninterrupted-1vu-3m.jsonl`
- `final-recovery-after-fail-10m.jsonl`
- `final-cleanup-and-health.txt`
- `SHA256SUMS`

## Required continuation

Before any five- or ten-VU rerun:

1. Correlate external timing with host-local Caddy-to-Finacc and Finacc-backend timing using identical five-second windows.
2. Review bounded Caddy and Finacc request timing around the retained failure timestamp without exposing request data or secrets.
3. Identify whether the outlier is gateway, frontend/backend, database or external-network time.
4. Repair only a supported root cause, then repeat a fresh baseline and Stage A.
5. Escalate to Stages B/C only after Stage A satisfies every frozen gate.

Phase 11 is not authorized or started.
