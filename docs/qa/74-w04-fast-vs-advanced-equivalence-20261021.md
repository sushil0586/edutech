# W04 guided and Advanced Builder equivalence verification

21 October 2026. This checkpoint certifies the objective-exam pilot contract produced by the teacher guided route and the entitlement-gated Advanced Builder route.

## Result

**Passed.** A transaction-isolated Django API regression created one objective mock exam through each route, then verified equivalent preview totals, saved delivery and scoring fields, publication readiness, objective question marks, assignment, and the assigned student's runtime access decision.

The regression runs in a disposable PostgreSQL test database. It grants the Advanced Builder entitlement only inside that database and destroys all created institutes, users, exams, assignments, questions, logs, and entitlements after the run. No commercial state was changed in the deployed pilot database.

## Contract certified

- Advanced preview resolved one available objective question and `2.00` total marks without blockers.
- Both saved exams had the same type, delivery mode, duration, marks, pass mark, schedule, timer, navigation, attempt, result, review, security, assignment, randomization, resume, and section-navigation values.
- Both routes produced one active single-choice question worth `2.00` marks with `0.25` negative marks.
- Both exams passed the shared publication-readiness service and were published as scheduled exams.
- The same explicitly assigned student received an allowed runtime decision, the same access mode, the same schedule window, and no block reason for either exam.

Advanced Builder metadata remains route-specific by design; it does not change the certified student delivery contract.

## Docker proof

- Test commit: `2d8ee3ac576301184e5288258f2a21fcacfbc560`
- Clean production artifact: `production-2d8ee3ac5763`
- Source archive SHA-256: `1c3fad0453c389d1c45ebfd5199cca2ea4e285b74bc0449950a7c512b21bb0b2`
- Immutable test image: `edutech-w04-equivalence-backend:2d8ee3ac`
- Image ID: `sha256:8612e53a7a93daa41e8d58f630440f1d2608d4265cac146c12663e23266ebb75`
- Exact-image regression: 1 test passed in 1.139 seconds; disposable database destroyed successfully.
- Existing Docker stack: all six services healthy; local TLS entry point returned HTTP 200.

## Finding carried forward

The guided endpoint creates a zero-mark shell before questions are attached. A positive passing mark therefore cannot be saved during initial shell creation; it must be set after question marks are synchronized. The current teacher lifecycle already follows that sequence, so this does not block the pilot, but the final authoring simplification should present pass marks only after question selection or explain when they become editable.

## W04.03 disposition

Both W04.03 acceptance criteria are now verified. W04.03 remains **In progress** because its product work list still requires the intended audience → questions → schedule → preview/publish ordering and final preset/publish-blocker simplification, including mobile verification.

## Changed files

- `edutech_backend/apps/exams/test_advanced_builder_api.py`
- `docs/implementation-plans/go-to-market-2026-10/04-web-ui-and-ux.md`
- `docs/qa/74-w04-fast-vs-advanced-equivalence-20261021.md`
- `docs/qa/evidence/w04-builder-equivalence-20261021/release-manifest.json`
- `docs/qa/evidence/w04-builder-equivalence-20261021/source-inventory.json`
- `docs/qa/evidence/w04-builder-equivalence-20261021/SHA256SUMS`
