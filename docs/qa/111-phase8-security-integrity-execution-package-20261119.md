# Phase 8 Security and Integrity Execution Package

Date: 2026-11-19
Status: AUTHORIZED / PRE-EXECUTION
Candidate HEAD: `2221b9193b781fc22dac3e7684d199a06a4c8c7f`
Candidate state: dirty; all pre-existing tracked and untracked changes are preserved.

## Authorized scope

Phase 8 security and integrity only. Phase 9, staging/public mutation, commit, push and deployment are not authorized.

## Frozen scenarios

| ID | Contract | Acceptance evidence |
|---|---|---|
| EDU-SEC-001 | Role-based authorization matrix | Authenticated role allow/deny responses, browser denial, PostgreSQL non-mutation |
| EDU-SEC-002 | Tenant isolation and IDOR resistance | Cross-tenant object probes remain concealed or denied with no mutation |
| EDU-SEC-003 | Access-token lifecycle | Expired/revoked access denial, refresh rotation/reuse behavior, logout invalidation |
| EDU-SEC-004 | CSRF and CORS boundaries | Trusted-origin behavior, untrusted-origin denial and cookie/session boundary evidence |
| EDU-SEC-005 | Upload controls | Extension, MIME, size, malformed content and filename/path handling |
| EDU-SEC-006 | Secret and external-provider isolation | No runtime secret disclosure and no real external delivery in the campaign |
| EDU-SEC-007 | Stale-write protection | Stale version rejected with authoritative state unchanged |
| EDU-SEC-008 | Concurrent mutation integrity | Bounded competing writes preserve uniqueness and valid final state |
| EDU-SEC-009 | Replay and idempotency | Duplicate submit/payment/grant operations produce no duplicate side effect |
| EDU-SEC-010 | Rejected-operation non-mutation and audit attribution | Denied operations do not mutate; accepted operations retain actor, tenant and target audit data |

## Isolated environment

- PostgreSQL container: `edutech-phase8-postgres-20261119`
- Database: `phase8_security_cert`
- Database role: `phase8_security`
- Backend: `127.0.0.1:39842`
- Production frontend: `127.0.0.1:39840`
- Synthetic tenant scope only
- Email backend: in-memory; no provider credentials
- Redis/Celery and external providers: not started
- Cleanup: exact task-owned database container, processes and ports

## Execution order

1. Verify effective PostgreSQL identity and migration graph.
2. Run focused backend authorization, token, upload, concurrency, replay and audit tests.
3. Start the isolated production frontend/backend and run Chromium role-scope/security browser checks.
4. Run Firefox/WebKit security-critical denial checks admitted by Chromium.
5. Run Django checks, migration drift, TypeScript, targeted ESLint and production build.
6. Reconcile failures without weakening assertions, then remove only task-owned resources.

## Stop gates

Stop on tenant disclosure, unauthorized state mutation, duplicate financial/result side effects, secret exposure, external delivery, ambiguous database identity, cleanup ownership mismatch, or any unresolved P0/P1 finding.
