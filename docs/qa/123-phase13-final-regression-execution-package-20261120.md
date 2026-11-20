# Phase 13 Final Regression Execution Package

Date: 2026-11-20  
Status: **COMPLETE / BLOCKED**  
Authorization: user instruction `Go ahead` following Phase 12 closure

## Candidate Boundary

- Preserve the existing dirty working tree and all historical evidence.
- Exercise the current local source candidate for static, backend and isolated-browser regression.
- Reconcile the deployed public candidate independently by immutable image identity and read-only public smoke checks.
- Do not mutate shared staging data, send provider notifications, deploy, commit or push.

## Isolated Runtime

- PostgreSQL container: `edutech-phase13-postgres-20261120`
- Database: `phase13_final_regression`
- Role: `phase13_final`
- PostgreSQL port: `40131`
- Email: Django in-memory backend
- External provider credentials: absent
- Browser/backend ports: task-owned ports only if browser execution is admitted
- Cleanup: exact container, task-owned processes, ports and generated fixtures

## Mandatory Gates

1. Freeze HEAD, dirty state, source-content fingerprint, migration graph and relevant test/config hashes.
2. Prove effective PostgreSQL vendor, server version, database, role and port before tests.
3. Run complete Django tests, system checks and migration-drift checks.
4. Run frontend lint, TypeScript and production build.
5. Run the admitted final Playwright regression across Chromium, Firefox and WebKit, including accessibility-critical coverage.
6. Run read-only public Eductech smoke and sibling HRMS/Finacc health checks.
7. Preserve every failure and rerun without weakening assertions.
8. Remove only exact task-owned resources and verify absence.

## Stop Conditions

Stop on an ambiguous database target, shared or production database identity, external provider routing, tenant disclosure, unauthorized mutation, unresolved P0/P1 regression, sibling-service degradation, or cleanup ownership mismatch.

Phase 14 is not authorized by this package.

Closure: `124-phase13-final-regression-closure-20261120.md`.
