# W05 content isolation and cleanup verification

21 October 2026 · Docker environment `edutech-w02-docker`

## Result

W05.03 is complete. The selected 25-pack inventory was provisioned into one explicitly marked synthetic institute, remained private to that institute, and was removed through a marker-guarded purge with zero residue. No customer-like institute received the curated seed batch.

## Fixture contract

| Field | Value |
| --- | --- |
| Institute code | `W05QA20261021A` |
| Name | `W05 Synthetic Content Isolation` |
| `metadata.synthetic_fixture` | `true` |
| `metadata.fixture_namespace` | `W05.03` |
| Candidate source | Read-only mount of the current backend worktree |

Automated cleanup now supports `purge_institute_data CODE --require-synthetic-fixture`. With that flag, the command refuses any institute lacking `metadata.synthetic_fixture=true` before producing or applying a purge plan.

## Before cleanup

| Reconciliation | Result |
| --- | ---: |
| Institute questions | 1,250 |
| Verified and active | 1,250 |
| Math / Science | 350 / 900 |
| Topics | 25 |
| Mirrored master questions | 1,250 |
| Private institute-source masters | 1,250 |
| Shared access rows to fixture masters | 0 |
| Same curated seed batch outside fixture | 0 |
| Other institutes retained | 24 |

The complete snapshot is [before-cleanup.json](evidence/w05-content-isolation-20261021/before-cleanup.json). The dry-run plan is [guarded-purge-dry-run.txt](evidence/w05-content-isolation-20261021/guarded-purge-dry-run.txt).

## Cleanup and residue

Immediately before applying deletion, the run reasserted both the synthetic marker and the `W05.03` namespace. The guarded purge removed the fixture institute and its cascade-owned academic and question records.

Post-cleanup counts were:

- fixture institutes: 0
- fixture questions: 0
- fixture master questions: 0
- curated seed questions outside the fixture: 0
- other institutes: 24

Evidence: [guarded-purge-apply.txt](evidence/w05-content-isolation-20261021/guarded-purge-apply.txt) and [after-cleanup.json](evidence/w05-content-isolation-20261021/after-cleanup.json).

## Regression coverage

Two Django command tests pass:

1. guarded purge refuses a normal institute and preserves it;
2. guarded purge removes the marked fixture while preserving a separate normal institute.

The existing curated-seed idempotency test also passed during W05.02. Docker web, backend, worker, PostgreSQL, Redis and proxy services remained healthy after the lifecycle.

## Release boundary

This proves catalog isolation and safe QA cleanup. It does not approve the candidate content. W05.02 academic and rights signoff remains required before the 1,250 questions may be provisioned into a pilot customer institute.
