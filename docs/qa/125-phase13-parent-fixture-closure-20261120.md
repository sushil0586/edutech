# Phase 13 Parent Fixture Closure

Date: 2026-11-20  
Verdict: **PASS** for the bounded parent/connected rerun  
Parent Phase 13 verdict: remains **BLOCKED** pending deployment verification

## Authorized Scope

Recreate the missing Phase 6 parent fixture contract in a fresh isolated PostgreSQL campaign, rerun the fixture-dependent parent and connected-lifecycle checks, reconcile state independently, and remove exact campaign-owned resources. No deployment, commit, public mutation, Phase 14 execution, or provider delivery was authorized.

## Environment

- PostgreSQL container: `edutech-phase13-parent-postgres-20261120`
- Database: `phase13_parent_closure`
- Role: `phase13_parent`
- PostgreSQL: 16.15
- Host port: `40141`; backend: `40142`; production-built Next.js: `40143`
- Notification delivery: Django in-memory email backend
- Fixture marker: `phase13-parent-closure-20261120`

The fixture receipt records exact UUIDs for two child records, two parent-child relationships, one alert, and one published result. The fixture helper SHA-256 and receipt SHA-256 are retained in `input-sha256.txt`.

## Results

| Check | Result |
|---|---|
| Parent browser workflows, Chromium | 6/6 PASS |
| Parent browser workflows, Firefox | 6/6 PASS |
| Parent browser workflows, WebKit | 6/6 PASS |
| Revoked-scope transition, Chromium | 1/1 PASS |
| Total browser assertions | **19/19 PASS** |
| API behavior observed through browser | PASS: authenticated children, progress, alerts, preferences and dashboard requests returned expected 200 responses; invalid child scope returned expected 403 |
| PostgreSQL reconciliation | PASS: two relationships restored active, one tenant, alert read persisted, result remained published |

The 18-test cross-browser run covered:

- independent visibility and progress scoping for Aarav and Mira;
- alert read-state persistence after refresh and filtered navigation;
- notification preference persistence;
- recoverable forbidden child-scope behavior;
- 320px reflow and keyboard navigation;
- connected published-result readback.

The separate revoked-scope run changed only the two receipt-owned relationship UUIDs to `revoked`, confirmed the empty parent scope, and restored those exact UUIDs to `active`.

## Preserved Attempts

- The first fixture invocation failed before mutation because its relative script path was incorrect.
- The second invocation failed before mutation because the external script directory did not include the backend on `PYTHONPATH`.
- The first revoke wrapper completed the browser test but then encountered zsh's read-only `status` variable. The two exact relationships were immediately restored and verified before a corrected full revoke/test/restore rerun. All logs and restoration receipts are retained.

These harness failures did not change product source and are not represented as application defects.

## Cleanup

- Exact container ID `c3dde84035879ff15b29eb3179d81443ca9b30de52e1bb420446eea655212c9a` was removed.
- Container inventory returned zero matching resources.
- Ports `40141`, `40142`, and `40143` were verified closed.
- No provider delivery, shared database, deployed candidate, or sibling workload was touched.

## Closure Effect

The first blocking item in `124-phase13-final-regression-closure-20261120.md` is closed by current candidate-specific evidence. Phase 13 remains BLOCKED because the repaired local candidate is not deployed or publicly verified. The eight shared-authentication scenarios remain NOT RUN and belong to separately authorized Phase 14 execution.

## Evidence

Evidence is retained under `docs/qa/evidence/phase13-parent-closure-20261120/`, including failed attempts, fixture and state receipts, browser logs, PostgreSQL reconciliation, cleanup verification, and SHA-256 custody records.
