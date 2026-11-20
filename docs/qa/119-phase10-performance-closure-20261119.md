# Phase 10 Performance Closure

Date: 2026-11-19  
Candidate: `2221b9193b781fc22dac3e7684d199a06a4c8c7f` plus preserved dirty working tree  
Verdict: **PASS**

## Repairs

Two measurement defects were corrected without weakening the frozen thresholds:

1. Shared-host isolation now uses host-local HTTPS through the production Caddy routes. External probes remain mandatory availability checks, with two consecutive failures required to distinguish service unavailability from the demonstrated observer-network instability.
2. Sibling p95 uses consecutive non-overlapping 20-sample windows. Earlier six-sample overlapping windows made p95 equal the maximum and counted one outlier twice.

Synchronized evidence showed direct Finacc web p95 of 4 ms and host-local Caddy p95 of 40 ms while the original external observer fluctuated. Under ten-VU load, host load later reached 5.24 and sibling windows genuinely regressed. The shared Caddy CPU ceiling was therefore increased from 0.5 to 2.0 CPUs. No application, database, Redis, worker or application-container configuration changed.

Rollback files retained on the host:

- `/srv/saas/platform/compose/compose.yml.phase10-20261119T161039Z.bak` (0.5 CPU)
- `/srv/saas/platform/compose/compose.yml.phase10-20261119T162803Z-1cpu.bak` (1 CPU)

## Final campaign

Fresh 2-CPU baseline: HRMS 55 ms p95; Finacc 45 ms p95.

| Stage | Requests | Errors | Eductech p95 | HRMS p95 | Finacc p95 | Maximum load | Result |
|---|---:|---:|---:|---:|---:|---:|---|
| 1 VU / 3 min | 180 | 0 | 183 ms | 56 ms | 49 ms | 0.53 | PASS |
| 5 VU / 5 min | 1,500 | 0 | 143 ms | 63 ms | 49 ms | 3.25 | PASS |
| 10 VU / 5 min | 3,000 | 0 | 175 ms | 69 ms | 55 ms | 2.82 | PASS |

No stage produced two consecutive sibling-regression windows. Available memory remained above 12.1 GiB, swap remained approximately 0.9 MiB, CPU/memory full pressure remained zero, and no container became unhealthy.

Browser navigation closure used 20 samples per route:

- Anonymous home: 139 ms p95.
- Authenticated platform-admin institutes: 273 ms p95.
- Browser errors: zero.

Both are below the 2.5-second browser threshold. API p95 remained below 750 ms and the request error rate was zero.

## Recovery and cleanup

The ten-minute recovery completed without a stop. HRMS returned to 53 ms p95 and Finacc to 39 ms p95; maximum recovery load was 0.66. The exact synthetic user was deleted and verified at residual count zero. Final primary containers were healthy and no campaign process remained.

## Scenario verdicts

- `EDU-PERF-001`: PASS.
- `EDU-PERF-002`: PASS.
- `EDU-PERF-003`: PASS.
- `EDU-PERF-004`: PASS.

Historical failed attempts remain preserved in reports 117 and 118. They are not overwritten or represented as passing executions.

Evidence: `docs/qa/evidence/phase10-finacc-latency-root-cause-20261119/`.

Phase 11 remains separately gated and was not started.
