# W04 high-volume pagination verification

21 October 2026. This checkpoint certifies the automated high-volume portion of W04.02 against an immutable backend candidate and the recovered local Docker PostgreSQL service.

## Outcome

The teacher question inventory and student wallet histories remained bounded and reachable with 225 matching records in each collection. Both transaction-isolated Django tests passed, and Django destroyed the disposable test database after the run.

| Surface | Empty case | High-volume case | Page boundary | Additional invariant |
| --- | --- | --- | --- | --- |
| Teacher question inventory | 0 matching rows | 225 questions | 20 rows on page 1; 5 on page 12 | Search scope retained; first/last IDs disjoint; first page at most 20 queries |
| Student wallet ledger | 0 rows | 225 entries | 5 rows on pages 1 and 45 | First/last IDs disjoint; first page at most 15 queries |
| Student wallet orders | 0 rows and 0 pending | 225 orders | 5 rows on pages 1 and 45 | Pending count stays 113 on both pages; first/last IDs disjoint; first page at most 20 queries |

The tests also assert response status, total count, next/previous boundaries and that the final records remain reachable. Fixtures use bulk creation only to keep setup cost controlled; API reads exercise the production endpoints and serializers.

## Candidate and environment

- Git candidate: `37e5e2302451cde7f219c6fb256777328ac07664`
- Backend test image: `edutech-w04-high-volume-backend:37e5e230`
- Source archive SHA-256: `c8225cff2b5dd6babe88ec31c6bc1893793c86982b479894fafa5e81ba770c99`
- Docker project: `edutech-w02-docker`
- Test command: `python manage.py test apps.question_bank.tests.test_high_volume_pagination apps.economy.tests.test_high_volume_pagination --verbosity 1`
- Result: 2 tests passed in 2.319 seconds; system checks reported no issues.

After the test, PostgreSQL, Redis, backend, web, expiry worker and nginx all reported healthy. `https://localhost:39123/` returned HTTP 200.

## Recovery note

The first attempt exposed host-storage exhaustion while PostgreSQL was creating the disposable test database. Superseded task-generated artifacts and Docker build cache were removed, Docker was relaunched, and the EduTech stack recovered healthy. A stale `test_edutech_w02` database from that interrupted attempt was explicitly dropped before the successful rerun. Production data was not used for fixtures or cleanup. The host had 45 GiB free after recovery.

## W04.02 disposition

The technical implementation and automated volume acceptance for W04.02 are complete. The workstream remains **In progress** because its stated verification also requires an unfamiliar teacher to find and add a question without coaching. That human observation cannot be inferred from automated API and browser checks. Broader keyboard, zoom, screen-reader and Firefox/WebKit coverage remains in W04.05.

## Changed files

- `edutech_backend/apps/question_bank/tests/test_high_volume_pagination.py`
- `edutech_backend/apps/economy/tests/test_high_volume_pagination.py`
- `docs/implementation-plans/go-to-market-2026-10/04-web-ui-and-ux.md`
- `docs/qa/71-w04-high-volume-pagination-verification-20261021.md`
- `docs/qa/evidence/w04-high-volume-pagination-20261021/release-manifest.json`
- `docs/qa/evidence/w04-high-volume-pagination-20261021/SHA256SUMS`

