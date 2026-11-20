# Phase 1 Candidate and Surface Inventory

Date: 2026-11-19  
Scope: read-only discovery and documentation  
Phase verdict: PASS (inventory and traceability only)

## Candidate identity

| Identity field | Frozen value |
|---|---|
| Repository HEAD | `2221b9193b781fc22dac3e7684d199a06a4c8c7f` |
| Working tree | Dirty; all pre-existing tracked and untracked changes preserved |
| Deployed release | `phase10-20261119T032758Z` |
| Public origin | `https://learn.accerio.in` |
| Deployed source fingerprint | `753647ea9dde4376612446b04947ccace08bb330dd88841a5e6cf894221356ba` |
| Discovery-tree fingerprint | `1d869cd35fec02a0e21cc6791de6620f01d6c255022345bf262c41f1910778e6` |
| Backend image | `sha256:a852e396883dd62880eb7f6387910a1998e7be65347eb5733f1f210a97454087` |
| Web image | `sha256:b67c0a9c85c6a41283c0f02dc2649da92e88094f6729b033a1c274b7ef7ac5e9` |
| Gateway image | `caddy@sha256:78bd35025c7ba85961dd149ae670315129954e77abe2383ac47c89106b35ade9` |
| DNS change | `/change/C1040242295GT69BOQ6WV` (`INSYNC`) |

The discovery fingerprint covers files beneath `edutech_backend`, `edutech_web`, and `deployment/lightsail-shared`, excluding dependency caches, build output, virtual environments, and Python bytecode. It does not replace the deployed fingerprint. Functional execution must either use the deployed candidate or deliberately deploy and refreeze a new candidate.

## Surface denominator

| Surface | Current count | Notes |
|---|---:|---|
| Next.js pages | 130 | Historical matrix recorded 125; current inventory adds five routes and supersedes that denominator for future discovery |
| Platform-admin pages | 16 | `/admin/*` |
| Institute-admin pages | 37 | `/institute/*` |
| Teacher pages | 28 | `/teacher/*` |
| Student pages | 32 | `/app/*` |
| Parent pages | 6 | `/parent/*` |
| Authentication pages | 6 | Login, registration, profile completion, password recovery/reset |
| Public/marketing pages | 5 | Home, dynamic content, privacy, support, terms |
| Next.js API bridge routes | 93 | 55 admin, 11 teacher, 8 question-bank, 6 exams, 5 institute, 4 student, 3 parent, 1 public |
| Django domain URL packages | 12 | Academics, accounts, attempts, economy, exams, institutes, parents, question bank, reports, results, students, teachers |
| Django model classes | 160 | Includes concrete and abstract/supporting models |
| Django migrations | 92 | 13 migration-bearing domains |
| Playwright spec files | 441 | Inventory only; not executed in Phase 1 |
| Backend test files | 65 | Inventory only; not executed in Phase 1 |

Migration counts by domain: academics 12, accounts 6, attempts 14, economy 11, exams 15, geography 1, institutes 8, parents 2, question bank 12, reports 3, results 3, students 4, teachers 1.

## Contract map

- Browser requests pass through authenticated Next.js server/API helpers to Django. Backend authorization remains authoritative.
- Role surfaces are platform administrator, institute administrator, teacher, student, parent, authenticated profile completion, and public content.
- Tenant-sensitive domains include institutes, academics, people, assignments, question ownership/licensing, exams, attempts, results, reports, economy, notifications, and parent-child visibility.
- Audit-bearing behavior exists in the reports `AuditLog`, notification state changes, exam publication/slot changes, account administration, onboarding, economy, imports, attempts, and integrity events. Each mutating scenario must prove attribution and tenant scope rather than infer it from UI feedback.
- In-app notifications are implemented. Phase 1 found no certified external-delivery worker contract; external email/SMS/webhook behavior remains excluded until a supported implementation and sandbox route are identified.

## Safety boundary for execution phases

Future mutating phases require an explicitly authorized PostgreSQL-backed target, synthetic tenant IDs, role fixtures, provider suppression, before/after database evidence, exact cleanup ownership, and interruption recovery. Public staging must not be used for destructive or cross-tenant tests without separate authorization. No fixtures, tests, deployments, database commands, or external messages were run in Phase 1.

## Open discovery risks

1. The current source tree differs from the deployed fingerprint; execution evidence must name which candidate it exercises.
2. The page denominator changed from 125 to 130 and needs route-by-route browser reconciliation in role phases.
3. Historical PASS evidence establishes useful regression coverage but is not promoted to current-candidate PASS.
4. Parent workflows require valid linked-child fixtures; empty seeded accounts cannot establish privacy or progress correctness.
5. Shared-host performance and recovery remain separate hard gates.
6. External notification delivery is not part of the currently proven contract.

