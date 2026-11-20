# Phase 15 Logout Replay Repair Deployment

Date: 2026-11-20

## Scope and authorization

The authorized scope was the logout metadata/session-lifecycle repair, deployment to `https://learn.accerio.in`, candidate-specific staging verification, creation and exact cleanup of one synthetic account, and shared-host health verification. No commit, push, DNS change, provider delivery, or unrelated-data mutation was performed.

## Candidate and runtime

- Git HEAD: `2221b9193b781fc22dac3e7684d199a06a4c8c7f`
- Dirty candidate source fingerprint: `bb4ab5a4333645d75c741c6cb048dd8a91ce588a7e081ede6e693d05da62b9ef`
- Active release: `/srv/saas/projects/learning-portal/releases/phase15r-20261120T083022Z`
- Backend image: `sha256:e82ef852b5bafe817bd81f9e6dbc2d1f9378caaef20299cc7b0373f25ef8174d`
- Web image: `sha256:a6aee3f47ce8f960b9a27c6cd52f710dfea09eb22c3b9318a4426a80c737f1bd`
- Runtime health build: `2221b9193b781fc22dac3e7684d199a06a4c8c7f`
- Runtime health artifact: `bb4ab5a4333645d75c741c6cb048dd8a91ce588a7e081ede6e693d05da62b9ef`

The repository was dirty before this repair. Existing tracked and untracked work was preserved. Candidate identity therefore uses the documented deterministic source fingerprint in addition to HEAD.

## Repair

- Added durable `AccountSession` state and migration `accounts.0007_accountsession`.
- Added a per-session `sid` to access and refresh JWTs.
- Enforced live, non-revoked, non-expired session validation for access and refresh.
- Added atomic logout revocation and audit creation.
- Changed the web logout server action to revoke the backend session before clearing cookies; unknown revocation fails closed.
- Added bounded expired-session cleanup.
- Pre-repair tokens without `sid` intentionally require one re-login.

## Pre-deployment verification

- Focused PostgreSQL token lifecycle: 11 passed.
- Broader account regression: 90 passed.
- Django system check: passed.
- Migration drift check: passed.
- Web ESLint and TypeScript: passed.
- Independent source QA and Security reviews: PASS.

## Deployment and qualification

1. A fresh encrypted backup was recorded at `/srv/saas/backups/learning-portal/20261120T082814Z`.
2. The first inactive candidate was rejected because `.env.local` was transferred. Its build was stopped before activation and its exact inactive release/image were removed. The active Phase 13 release remained unchanged.
3. Retry release `phase15r-20261120T083022Z` admitted 2,204 source files and zero `.env*` files.
4. Both images qualified as `linux/amd64`, non-root user `nexora`; health, security headers, Django checks, migration graph, and disposable cleanup passed.
5. `accounts.0007_accountsession` applied successfully. Only the learning-portal backend, web, and gateway were recreated.
6. Public health passed before promotion, then `current` was atomically promoted to the retry release. The previous Phase 13 release remains available for rollback.

## Staging lifecycle results

Scenario `P15-LOGOUT-REPLAY-01` used one receipt-owned synthetic platform administrator and two independent sessions.

| Assertion | Result |
| --- | --- |
| Browser login through public UI | PASS |
| Browser Logout control redirects to `/login` | PASS |
| Access, refresh, and profile cookies cleared | PASS |
| Session A access replay | PASS: `401` |
| Session A refresh replay | PASS: `401` |
| Session B access after Session A logout | PASS: `200` |
| Session B refresh after Session A logout | PASS: `200` |
| Session B explicit logout | PASS: `200` |
| Session B access replay | PASS: `401` |
| Session B refresh replay | PASS: `401` |
| Browser console errors | PASS: 0 |
| Database session reconciliation | PASS: 2 sessions, both revoked |
| Audit reconciliation | PASS: 2 login and 2 logout events |

The first browser attempt is retained as NOT RUN for lifecycle assertions because its login-button selector timed out before login. The corrected selector exercised the rendered accessible label and passed.

## Cleanup and preservation

The cleanup transaction removed the exact synthetic user, profile, two sessions, and four audit events. Receipt printing then failed because UUID audit IDs were not JSON serializable; the transaction had already committed. A direct post-cleanup query verified zero users, profiles, sessions, and audits. The helper serialization was corrected and the failed receipt was preserved.

Post-certification checks returned HTTP `200` for:

- `https://learn.accerio.in/`
- `https://learn.accerio.in/api/v1/health/`
- `https://hrms.accerio.in/`
- `https://accerio.in/`

All learning-portal and shared platform containers were healthy; HRMS workers remained running. No sibling service was restarted.

## Evidence

Evidence is retained under `docs/qa/evidence/phase15-logout-repair-deployment-20261120/`. `evidence-files.sha256` freezes the package contents. Tokens, passwords, cookies, and secret environment files are excluded; token values are represented only by truncated SHA-256 identifiers.

## Verdict

Technical and staging lifecycle verdict: **PASS**.

Independent read-only QA: **PASS**. Independent read-only Security: **PASS**, with no P0/P1 findings.

Residual limitations are Chromium-only staging UI coverage, no staging network-failure presentation test, no staging simultaneous refresh/logout race injection, and no Phase 15-specific restore rehearsal. These do not contradict the exercised logout replay acceptance result but remain outside this campaign's evidence.

This verdict is candidate-specific and does not represent a clean-tree release, a commit/push, or statistical reliability proof.
