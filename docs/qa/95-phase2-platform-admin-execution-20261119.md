# Phase 2 Platform Administrator Execution

Date: 2026-11-19  
Verdict: FAIL  
Reason: confirmed P1 production-image dependency defect prevents authentication

## Candidate and environment

- Source HEAD: `2221b9193b781fc22dac3e7684d199a06a4c8c7f`, dirty tree preserved.
- Discovery fingerprint: `1d869cd35fec02a0e21cc6791de6620f01d6c255022345bf262c41f1910778e6`.
- Fresh production builds succeeded: Next.js compiled 158 routes and TypeScript passed.
- Backend image: `edutech-phase2-backend:20261119` (`sha256:718d4c86972bdcc7390062955a18ebd44ac269103ab0596aa682f0d756be7a9a`).
- Web image: `edutech-phase2-web:20261119` (`sha256:26dbd5f65efbf2fc4075312779004e0c631d93c8a5d49ff42969b3cc0d953fa8`).
- Effective database: PostgreSQL, database `phase2_cert`, isolated task-owned volume.
- Redis: isolated task-owned Redis 7.4 container.
- Email: Django `locmem` backend; no provider credentials or external delivery.
- Browser origin: local-only `http://127.0.0.1:39200`.

## Attempted scenarios

| Scenario | Browser result | API/database result | Verdict |
|---|---|---|---|
| `EDU-AUTH-001` platform-admin login | Three admin tests received truthful visible `Auth request failed with 500`; no false success | `/api/v1/auth/login/` returned 500 before authentication; no institute mutation | FAIL |
| `EDU-AUTH-007` student and teacher registration entry | Both remained on role signup routes instead of profile completion | Registration authentication path hit the same cache initialization failure; no synthetic user persisted | FAIL |
| `EDU-PADM-001`..`016` | Business assertions not reached | No task-created institute persisted | NOT RUN |

Browser execution: **0 passed, 5 failed, 0 skipped**, Chromium, one worker, no retries. Screenshots and error contexts are retained under `docs/qa/evidence/phase2-platform-admin-20261119/browser/`.

## Confirmed defect

`config.settings.base` configures Django's Redis cache whenever `REDIS_CACHE_URL` is set. The production backend image installs `edutech_backend/requirements.txt`, which does not include the Python `redis` client. Authentication throttling accesses the cache and raises:

```text
ModuleNotFoundError: No module named 'redis'
```

Gunicorn therefore returns HTTP 500 for login and registration authentication paths. This is a production packaging defect, not a Playwright timing or local HTTP issue. Severity: **P1**, because normal authenticated access is unavailable whenever the supported Redis configuration is enabled.

No application fix was authorized or made in this phase. Required correction: add and lock a compatible Redis client dependency, rebuild the exact candidate, rerun backend cache/authentication tests, then repeat this browser slice before broader Phase 2 execution.

## Integrity and cleanup

- Before cleanup: one synthetic admin user/profile and one migration-created `NEXORA-PUBLIC` institute; no task-created institute.
- Rejected/failed operations produced no unintended institute mutation.
- External messages sent: zero.
- Cleanup removed the entire exact Compose project and its PostgreSQL, media, and static volumes.
- Verified remaining task-owned resources: 0 containers, 0 volumes, 0 networks.

## Counts

Frozen register after this execution: **0 PASS, 0 CONDITIONAL, 2 FAIL, 0 BLOCKED, 110 NOT RUN**.

Phase 2 cannot continue or certify while this P1 remains unresolved. Fixing the dependency requires separate implementation authorization.

