# Phase 3 Institute Administrator Closure

Date: 2026-11-19  
Verdict: PASS WITH P2 VISUAL FOLLOW-UP  
Candidate: dirty working tree at `2221b9193b781fc22dac3e7684d199a06a4c8c7f`  
Source-content fingerprint: `2dfde068fe7c8acf84fcf2010650d3c51e6c11590d27f335e4658f90f8802937`

## Authorized scope

Execute `EDU-IADM-001` through `EDU-IADM-016` in an isolated PostgreSQL/Redis environment, repair necessary test/fixture contracts, retain browser/API/database/audit evidence, and perform exact campaign cleanup. No staging mutation, deployment, commit, or push was authorized.

## Environment

- Compose project: `edutech-phase3-20261119`.
- PostgreSQL 16.15 database: `phase3_cert`.
- Redis 7.4; Django email backend was in-memory.
- Production-built Next.js and Django images served only through `127.0.0.1:39300`.
- Synthetic `DLI001` institute, role identities, public donor library, feature entitlements, and exact test-owned rows.
- One Playwright worker for all mutable execution.

## Repairs and admission corrections

- Rebuilt the Next.js image with the Phase 3 public API origin instead of reusing the Phase 2 port compiled into the earlier image.
- Corrected the temporary gateway so Django receives `/api/v1/*` while authenticated Next.js BFF routes continue through Next.js.
- Updated the import blocked-state test to identify the accessible entitlement status rather than depend on one hyphen glyph in display copy.
- Exposed PostgreSQL on campaign-owned loopback port `39301` so existing management-command helpers used the certified database instead of an unrelated local schema.
- Seeded the supported `PUB001` public donor library and one exact synthetic institute question tag required by the tested workflows.

Application business behavior was not changed.

## Execution results

| Execution | Result |
|---|---:|
| Distinct Chromium functional scenarios | 31 passed |
| Firefox/WebKit institute shell | 2 passed |
| Mobile Chrome/Safari functional scenarios | 4 passed |
| Institute keyboard-accessibility scenarios | 2 passed |
| Final desktop/mobile retained visual captures | 6 passed executions |
| Django/PostgreSQL domain regression | 91 passed |
| TypeScript | PASS |
| Production Next.js build | PASS, 158 routes generated |
| Django system check | PASS, 0 issues |
| Migration drift | PASS, no changes detected |

The initial browser campaign retained 3 environment/test-contract failures and 2 gated skips. After the documented corrections, every affected scenario passed unchanged at the business-acceptance layer. Failed attempts remain in the evidence package.

## Exact scenario verdicts

| IDs | Verdict | Evidence |
|---|---|---|
| `EDU-IADM-001`..`004` | PASS | Academic year, program, cohort and subject create/edit/archive/restore with API and PostgreSQL regression |
| `EDU-IADM-005` | PASS | Program-subject-topic dependency lookup and academic catalog consistency |
| `EDU-IADM-006` | PASS | Synthetic teacher create/read and exact cleanup |
| `EDU-IADM-007` | PASS | Synthetic student create/read and exact cleanup |
| `EDU-IADM-008` | PASS | Teacher assignment create/edit/archive/restore and rejection coverage |
| `EDU-IADM-009` | PASS | Question validation, create/update/delete, duplicate prefill, tags and attachment lifecycle |
| `EDU-IADM-010` | PASS | Comprehension create/update/link plus preview/finalize browser states |
| `EDU-IADM-011` | PASS | CSV entitlement state, preview, mapping and finalize behavior |
| `EDU-IADM-012` | PASS | Malformed input retry and partial-success recovery |
| `EDU-IADM-013` | PASS | Shared-library entitlement denial, direct link and package-activation link flows |
| `EDU-IADM-014` | PASS | Invalid academic/import references rejected without false persistence |
| `EDU-IADM-015` | PASS | Tenant-scoped backend authorization and institute security workspace evidence |
| `EDU-IADM-016` | PASS | Search/filter URL state, empty/security states, audit attribution and browser paging controls |

Phase 3 register: **16 PASS, 0 CONDITIONAL, 0 FAIL, 0 BLOCKED, 0 NOT RUN**.

Frozen global register after Phase 3: **32 PASS, 0 CONDITIONAL, 0 FAIL, 2 BLOCKED, 78 NOT RUN**. The two Phase 2 Product/QA contract blockers remain unchanged.

## Database and audit reconciliation

- 45 audit rows were present after execution; 40 were attributed to `demo-institute-admin`.
- Observed institute actions included question create/update/delete, comprehension create/update/delete, login and monitored exam refresh behavior.
- PostgreSQL regression covered academic scoping, teachers, students, bulk imports, master-library sharing and audit/health behavior.
- Rejected import and mapping operations displayed truthful errors and did not report false success.
- No external email, SMS or webhook delivery was configured.

## Visual and accessibility review

Desktop, Firefox, WebKit, mobile Chrome and mobile Safari executions passed. Keyboard reachability passed for the institute live monitor and exam-detail jump controls. Retained screenshots were visually inspected.

Two P2 visual follow-ups remain:

1. The compact mobile global-search placeholder clips at the right edge.
2. The mobile comprehension-authoring hero uses oversized type and cramped badge/headline spacing.

These findings do not impair the tested CRUD workflows and are not P0/P1 certification gates, but they prevent a claim that every rendered state is visually polished.

## Confidence

Using the frozen `35F + 25S + 15U + 15D + 10O` model: functional 1.00, security 1.00, UI/accessibility 0.85, data/audit 1.00, operations/cleanup 1.00. Phase 3 confidence: **97.75/100**, subject to the two P2 visual follow-ups and the local-candidate boundary.

## Evidence

Sanitized logs, retained failed attempts, final browser logs, reviewed screenshots and checksums: `docs/qa/evidence/phase3-institute-admin-20261119/`.

## Cleanup

The ownership dry-run identified only the five campaign containers, three campaign volumes and one campaign network. `docker compose down -v --remove-orphans` removed that exact project. Post-cleanup verification found **0 containers, 0 volumes and 0 networks** owned by `edutech-phase3-20261119`. The loopback ports are no longer published and no external messages were sent.

This is local candidate certification, not staging or production certification. Phase 4 requires separate authorization.
