# Phase 7 Connected Lifecycle Execution Package

Date: 2026-11-19
Status: AUTHORIZED / PRE-EXECUTION
Candidate HEAD: `2221b9193b781fc22dac3e7684d199a06a4c8c7f`
Candidate state: dirty; all pre-existing tracked and untracked changes are preserved.

## Authorized scope

Phase 7 connected end-to-end lifecycle only. Phase 8, commit, deployment, staging mutation, and public-environment testing are not authorized.

## Frozen scenarios

| ID | Contract | Required evidence |
|---|---|---|
| EDU-E2E-001 | Institute academic scope supports the connected assessment | Browser, API and PostgreSQL identity |
| EDU-E2E-002 | Teacher creates, assigns and publishes the assessment | Browser actions, API responses, audit and assignment rows |
| EDU-E2E-003 | Student receives and starts the published assessment | Browser action, attempt identity and assignment reconciliation |
| EDU-E2E-004 | Student submits and teacher publishes the result | Browser actions, persisted attempt/result and notifications |
| EDU-E2E-005 | Parent sees the linked child's published result | Browser, relationship scope, API and PostgreSQL result reconciliation |
| EDU-E2E-006 | Lifecycle audit and notification records reconcile without duplicate side effects | PostgreSQL counts, exact types/actions and cleanup evidence |

## Isolated environment contract

- PostgreSQL container: `edutech-phase7-postgres-20261119`
- Database: `phase7_e2e_cert`
- Database role: `phase7_e2e`
- Backend: `127.0.0.1:39742`
- Production-built frontend: `127.0.0.1:39740`
- Fixture title/code prefix: `PW Cross Role Release` / `PWCRR`
- Parent relationship marker: `P7E2E-20261119`
- External notifications: disabled; no provider credentials supplied
- Redis/Celery: not started
- Cleanup: exact exam ID, campaign relationship, processes, ports and PostgreSQL container

## Admission and stop gates

1. Verify effective Django database vendor, database name, server identity and PostgreSQL version before mutation.
2. Apply the current migration graph and seed synthetic demo/family scope only.
3. Link `demo-parent` only to the selected synthetic family student with the campaign marker.
4. Run Chromium first with one worker; stop on any connected-chain failure.
5. Preserve the created exam temporarily only for bounded database reconciliation.
6. Run read-only cross-engine parent/result checks after Chromium admission.
7. Delete only the exact campaign exam and relationship, verify absence, stop owned processes and remove the owned database container.

## Evidence policy

The mutable chain writes a redacted identity receipt containing only campaign object IDs and display labels. Database evidence is collected before exact cleanup. Failed attempts, console/network errors and screenshots remain retained under the unique Phase 7 evidence directory.
