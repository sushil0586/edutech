# Phase 11 Backup and Recovery Closure

Date: 2026-11-19  
Target: Eductech learning portal on `saas-staging-02-quarantine`  
Verdict: **PASS**

## Scenario Results

| Scenario | Result | Evidence |
|---|---|---|
| `EDU-REC-001` database backup | PASS | PostgreSQL 16 custom-format dump is encrypted before publication; encrypted checksum passed. |
| `EDU-REC-002` media backup | PASS | Media archive is encrypted before publication; checksum and restored member inventory passed. Current media contains zero files. |
| `EDU-REC-003` isolated restore/reconciliation | PASS | 97 table counts, all row digests, logical schema, 110 migrations, 68 audit rows, media and Django checks passed. |
| `EDU-REC-004` RPO/RTO rehearsal | PASS | Daily persistent timer establishes a design RPO of at most 24 hours. Final measured full rehearsal was 9.448 seconds; database restore was 852 ms. |

## Operational Backup

- Schedule: daily at 01:30 UTC with up to ten minutes randomized delay; missed runs are persistent.
- Retention: 14 days.
- Encryption: AES-256-CBC with PBKDF2 and 200,000 iterations, using the existing root-only recovery key without exposing its value.
- Publication: an incomplete hidden directory is used until encrypted files and checksums pass; only then is the set atomically published.
- Custody: backup directories are `root:root 0700`; files are `root:root 0600`.
- Monitoring: `learning-portal-backup.timer` is enabled and active; the latest service result is `success` with exit status 0. Phase 12 owns external alert delivery and operator alert rehearsal.
- First retained set: `/srv/saas/backups/learning-portal/20261119T170829Z`.

Installed artifact hashes:

| Artifact | SHA-256 |
|---|---|
| `/usr/local/sbin/learning-portal-backup` | `cdddc4c86116a4060114623694459be5681526448b8865364f8284519d05b820` |
| `learning-portal-backup.service` | `9622b8b219245905bd56d532cbb75852c215f91521473b7c246df79fb8c73fcf` |
| `learning-portal-backup.timer` | `2a86259423d475ceea5d88a0bc3d8dc8c436bfd7878d62003c153fc36e9d97f2` |

## Restore Evidence

The direct restore used a disposable PostgreSQL 16 container with no network. It reconciled:

- 97 public tables and exact row counts.
- Order-independent digest of every table's rows.
- Logical columns, constraints and index properties.
- 110 Django migration records.
- Source and restored media file count of zero.

The initial physical catalog comparison correctly retained two failed attempts. PostgreSQL restore compacted historical dropped-column ordinal gaps and rendered two equivalent partial-index predicates differently. The final assertion compares logical schema and index properties while retaining the original physical diff; no data mismatch was suppressed.

Two subsequent rehearsals decrypted the actual scheduled artifact into a new PostgreSQL 16 container on a Docker `--internal` network. The pinned backend image `sha256:a852e396883dd62880eb7f6387910a1998e7be65347eb5733f1f210a97454087` reported:

- `System check identified no issues (0 silenced).`
- All migrations applied.
- 97 tables, 110 migration rows and 68 audit rows.
- Encrypted database and media checksums valid.
- Final database restore: 852 ms.
- Final full rehearsal: 9.448 seconds.

## Recovery Objectives

- Recorded design RPO: no more than 24 hours while the daily timer remains healthy.
- Recorded technical RTO evidence: 9.448 seconds for artifact verification, isolated restore and application-level checks at the current 19 MB database size.
- Operational recovery objective: 30 minutes for the current deployment, allowing operator admission, service wiring and health checks. This was not a traffic-cutover exercise and does not measure DNS or incident-decision latency.

## Cleanup And Preservation

- Temporary PostgreSQL and backend containers: zero residuals.
- Temporary internal Docker networks: zero residuals.
- Transient environment file: removed by trap; it was never stored in evidence.
- Existing learning portal containers remained healthy and were not restarted.
- Live database and media were read for backup only; no production/staging rows were modified.
- Historical failed attempts and their diagnostic outputs remain preserved.

## Evidence

- `docs/qa/evidence/phase11-recovery-20261119/run-isolated-recovery.sh`
- `docs/qa/evidence/phase11-recovery-20261119/qualify-scheduled-backup.sh`
- `docs/qa/evidence/phase11-recovery-20261119/host-receipts/`
- `docs/qa/evidence/phase11-recovery-20261119/execution-console-r3.txt`
- `docs/qa/evidence/phase11-recovery-20261119/execution-console-r4.txt`
- `docs/qa/evidence/phase11-recovery-20261119/scheduled-qualification-console-r2.txt`
- `docs/qa/evidence/phase11-recovery-20261119/scheduled-qualification-console-r3.txt`

## Boundary

Phase 12 operations and monitoring was not started. External alert routing, certificate/capacity alerts, reboot recovery, failed-deployment rollback and the single-administrator runbook remain Phase 12 work requiring separate authorization.
