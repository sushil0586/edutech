# Phase 2 Platform Administrator Blocker Closure

Date: 2026-11-19  
Verdict: PASS  
Candidate HEAD: `2221b9193b781fc22dac3e7684d199a06a4c8c7f` plus preserved dirty working tree

## Authorized scope

Resolve the two outstanding Phase 2 blockers only: `EDU-PADM-005` institute stale-write protection and `EDU-PADM-015` institute-directory sorting/pagination. No deployment, commit, push or shared-environment mutation was authorized or performed.

## Changes

- Added optional `expected_updated_at` optimistic-concurrency input to institute mutation.
- Locked the current PostgreSQL institute row during update and returned HTTP 409 `stale_update` when the supplied version was stale.
- Preserved legacy API compatibility when clients omit the optional precondition; the platform-admin web editor now always supplies it.
- Added directory sort controls for active/name, descending name, code and recently updated.
- Added 5/10/25 page-size options, previous/next controls, page reset on filter/sort changes and safe clamping for stale page numbers.
- Added exact browser regressions for conflict feedback/non-mutation and all supported sort/page boundaries.

No schema migration or new business status was introduced.

## Execution environment

- Exact PostgreSQL container: `edutech-blockers-postgres-20261119`, PostgreSQL 16, database `edutech_blockers_cert`.
- Loopback-only backend: `127.0.0.1:39402`.
- Production-built Next.js: `127.0.0.1:39400`, 158 routes generated.
- In-memory email backend; no external delivery.
- Synthetic institutes used exact `PWC`/`PWD` identifiers and unique timestamp seeds.

## Results

| Evidence | Result |
|---|---:|
| Focused PostgreSQL stale-update test | 1 passed |
| Django institute/auth regression | 53 passed |
| Chromium blocker scenarios | 2 passed |
| Firefox/WebKit blocker scenarios | 4 passed |
| TypeScript | PASS |
| Targeted ESLint | PASS |
| Production build | PASS, 158 routes |
| Django system check | PASS, 0 issues |
| Migration drift | PASS, no changes |

Three browser attempts were retained as failed diagnostic evidence before the final pass: the first exposed a cleanup status mismatch, the second an ambiguous search locator, and the third an over-broad fixture search that included archived rows. None was a product acceptance failure; each test contract was narrowed to the actual API and exact campaign seed.

## Scenario verdicts

| ID | Verdict | Evidence |
|---|---|---|
| `EDU-PADM-005` | PASS | Two edits used the same version token; the first persisted, the second returned 409, displayed accurate conflict feedback and did not overwrite the authoritative PostgreSQL value. |
| `EDU-PADM-015` | PASS | Search plus active filter retained; all four supported sort modes passed; seven exact-seed rows produced two pages at page size five; first/last disabled states and stale-page reset passed. |

Phase 2 is now **16 PASS, 0 CONDITIONAL, 0 FAIL, 0 BLOCKED**. Frozen global status through Phase 3 is **34 PASS, 0 CONDITIONAL, 0 FAIL, 0 BLOCKED, 78 NOT RUN**.

## Candidate integrity

Changed-file SHA-256 values:

- serializers: `75421d2466478ea5b3d2a49d06ca6985cebcda163a6fc4980c8c824a64d025e7`
- view: `91ee6f27816b0bfed9375385b4ebd99bfbeb0345b58df82fff9a49f3a4f660d0`
- backend regression: `64f5dfc96fd2e1cf5697653acb82ec747b683d4191b4d1805b7e31f9d724571f`
- workspace UI: `8dcc8cf7d5765304c008d727a3a970e69fd110295afb6162ebc835dfae6f53cf`
- browser regression: `c5e268295a6c79a44a00f3e0c7de18390f45efad9a470ebb9097880bd97be8aa`

Pre-existing tracked and untracked changes were preserved. No source-control or deployment action occurred.

## Cleanup

Browser fixtures were archived through the governed API. Failed-attempt rows remained only inside the disposable campaign database for diagnostic preservation. Final infrastructure cleanup removed the exact PostgreSQL container and its anonymous volume after the loopback servers were stopped; post-cleanup checks are recorded in the evidence receipt.
