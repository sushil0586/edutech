# Phase 12 Operations And Monitoring Interim Result

Date: 2026-11-19  
Target: shared Lightsail `saas-staging-02-quarantine`  
Verdict: **BLOCKED**

## Scenario Results

| Scenario | Result | Evidence |
|---|---|---|
| `EDU-OPS-001` health and alerts | BLOCKED | Health checks and automatic local alerts passed. No approved off-host receiver is configured. |
| `EDU-OPS-002` certificate/capacity monitoring | BLOCKED | Certificate, disk, memory and backup freshness checks passed, including failure injection and recovery. Off-host delivery remains absent. |
| `EDU-OPS-003` failed deployment rollback | PASS | Invalid immutable image failed before migration; rollback restored exact images and healthy service. |
| `EDU-OPS-004` reboot/admin runbook | PASS | Single-admin commands passed; controlled reboot restored all 13 expected containers, timers, backups and public endpoints. |

## Installed Operations Controls

The versioned `learning-portal-ops` entry point supports:

- `status`: active release, immutable images, health, restart count, backup service and public endpoint.
- `logs`: bounded backend, web and gateway logs.
- `backup`: on-demand encrypted backup with service result.
- `releases`: active and available release inventory.
- `certificate`: public certificate identity and validity.

The five-minute monitor checks:

- Backend, web and API gateway running/health state.
- Public HTTPS response.
- Encrypted backup age, with a 36-hour maximum.
- TLS certificate validity, with a 21-day warning threshold.
- Root filesystem below 80%.
- At least 1 GiB available memory.

Failures create a root-only `0600` alert under `/srv/saas/projects/learning-portal/alerts` and a `daemon.alert` journal event.

## Alert Rehearsals

Executed failure cases:

1. Invalid public health URL.
2. Backup maximum age forced to zero.
3. Certificate warning threshold forced to 365 days.
4. Disk threshold forced below observed usage.

Each failed the monitor truthfully, created exactly one alert, cleared the injected configuration and returned the normal monitor to `Result=success`, `ExecMainStatus=0`.

Installed and repository hashes matched:

| Artifact | SHA-256 |
|---|---|
| `learning-portal-ops` | `9ae9a1468882c356d89d223fd2364ea0da91cece6d9c52fc3e6d58f28129ada8` |
| `learning-portal-monitor` | `5135489f70962ed29f697f5e71b6eceba8bf7f768a08f6cc6d462b33a60c6710` |
| `learning-portal-alert` | `7e37423fa7e6890143e39dc233b5de49773985076bcb93027c3d9da9566ffe31` |
| monitor service | `e5419b372be92f41182e5b3431bd840344ff1be69b6b987809f6d034bc50c094` |
| monitor timer | `011c62fae67f5436cfc3d561cab3722cee24aa0cfd7e1a400c46aaddbe8b4b84` |
| alert service | `e48fddca340737b359086203f8564c167c8a8f9f9dc6bd3bd01ca3efbde0b12e` |

## Failed Deployment And Rollback

A task-owned release referenced a deliberately nonexistent immutable backend image. Activation failed during image admission before migrations and before application replacement. The current rollback command then restored:

- Backend: `sha256:a852e396883dd62880eb7f6387910a1998e7be65347eb5733f1f210a97454087`
- Web: `sha256:b67c0a9c85c6a41283c0f02dc2649da92e88094f6729b033a1c274b7ef7ac5e9`
- Gateway: `sha256:78bd35025c7ba85961dd149ae670315129954e77abe2383ac47c89106b35ade9`

All three containers became healthy. The active release remained `phase10-20261119T032758Z`; the failed release directory was removed. Database rollback was neither needed nor attempted.

## Reboot Recovery

The first reboot preflight stopped before reboot because the unconfigured hostname `gst.accerio.in` did not resolve. This failed preflight is retained and no resource changed. The corrected gate used verified Eductech, HRMS and Finacc public endpoints.

- Pre-reboot boot ID: `00cefb8a-adc3-4f81-bf7a-7bcbda1a4082`.
- Post-reboot boot ID: `a20fba43-3100-4061-b3ea-6ffb398f3645`.
- SSH recovery: approximately 33 seconds.
- Running containers after recovery: 13.
- Container image IDs matched the pre-reboot inventory.
- Docker, backup timer and monitor timer: enabled and active.
- Latest encrypted backup checksums: PASS.
- TLS certificate: valid through 2027-02-17.
- Public Eductech, HRMS and Finacc probes: HTTP 200.
- Root disk: 8% used; approximately 13 GiB memory available after reboot.

## Remaining Blocker

On-host files and journal events are insufficient when the host or network is unavailable. Certification requires one approved off-host destination and an executed end-to-end delivery test. Acceptable options include a restricted AWS SNS topic/email subscription or an approved HTTPS webhook. No external message was sent and no cloud notification resource was created during this phase.

## Cleanup

- Failed task-owned release: removed.
- Temporary Phase 11 containers and networks: zero residuals.
- Normal monitor state: success.
- All 13 expected containers: running; health-enabled containers healthy.
- Historical synthetic alert evidence: retained intentionally.
- Existing application data, DNS and static IP: unchanged.

## Evidence

- `docs/qa/evidence/phase12-operations-20261119/pre-reboot.txt`
- `docs/qa/evidence/phase12-operations-20261119/post-reboot.txt`
- `docs/qa/evidence/phase12-operations-20261119/alert-rehearsals.txt`
- `docs/qa/evidence/phase12-operations-20261119/final-preservation.txt`

Phase 13 was not authorized or started.
