# Release and deployment

Workstream W01 · Created 21 October 2026 · Status: In progress

One clean source revision produces the same identifiable web and API release that QA certifies on HTTPS staging.

[Return to the high level plan](00-HIGH-LEVEL-PLAN.md)

## Current execution

The clean local candidate and artifact, migration reconstruction, TLS routing, secure cookies, exam lifecycle and isolated restore checks are verified. Live staging access and dependent release gates remain open. See the [21 October execution report](../../qa/62-w01-release-foundation-20261021.md).

## Ownership and dependencies

- Accountable owner: Engineering lead and release engineer.
- Supporting roles: Backend engineer, web engineer and QA.
- Entry dependencies: Launch scope decisions D01 and D02.
- Planning effort: 4–7 engineering days. This is effort, not a guaranteed elapsed duration.
- Audit findings: REL01, REL02, REL03, HYGIENE01. See the [audit findings](../../qa/evidence/market-audit-20261021/summary.json).

## Implementation areas

- `Jenkinsfile`
- `deployment/`
- `edutech_backend/config/`
- `edutech_web/next.config.ts`

Paths identify existing areas to inspect; they do not imply every listed file requires a change. Keep related existing contracts and reuse working implementation.

## Execution order

1. W01.01 — Declare the active release sources. Gate: Pilot.
2. W01.02 — Build reproducible release artifacts. Gate: Pilot.
3. W01.03 — Correct and verify HTTPS routing. Gate: Pilot.
4. W01.04 — Certify the deployed assessment lifecycle. Gate: Pilot.
5. W01.05 — Rehearse promotion and rollback. Gate: Pilot.

## W01 01 Declare the active release sources

**Required for:** Pilot. **Status:** In progress.

**Dependencies:** Workstream entry decisions; can begin once scoped.

**Work**

- [x] Declare edutech_backend, edutech_web and nexora_student_mobile as active roots; retain Flutter and the nested mirror as archives until removal is separately scoped.
- [ ] Record current local/main/stage SHAs, lockfiles, runtime versions and migration inventories without copying secrets.
- [x] Create an integration branch and review the existing dirty changes; preserve the stage-applied economy migration and its model fields.

**Acceptance criteria**

- [ ] A clean integration commit contains the required main/candidate histories and preserves applied migrations.
- [ ] The active release manifest identifies code, dependencies and configuration ownership.

**Verification and evidence**

- Compare migration files and applied history against an isolated staging database clone.
- Run system checks, model/migration checks and focused migration/route regressions.

## W01 02 Build reproducible release artifacts

**Required for:** Pilot. **Status:** Passed.

**Dependencies:** W01.01.

**Work**

- [x] Run backend, web and mobile static gates from the clean commit.
- [x] Build one immutable release artifact with source SHA, dependency digests and environment identity.
- [x] Expose matching non-secret provenance in backend health and web response headers.

**Acceptance criteria**

- [x] CI refuses dirty or unidentified candidates and records artifact digests.
- [x] Web and API runtime identity matches the requested candidate; no build reports local.

**Verification and evidence**

- Execute release-manifest/pipeline contract tests.
- Compare the running headers/health with the archived manifest.

Local runtime and artifact acceptance passed. The Jenkins job itself has not been run; live candidate promotion is tracked separately.

## W01 03 Correct and verify HTTPS routing

**Required for:** Pilot. **Status:** In progress.

**Dependencies:** W01.02.

**Work**

- [ ] Review effective shared-host nginx configuration before applying the existing remediations.
- [ ] Verify intended hostname, redirects, API routes, schema/docs and Django-admin separation.
- [ ] Verify certificate, trusted origins, cookie attributes and unknown-host rejection.

**Acceptance criteria**

- [ ] Expected routes resolve without loops; unknown hosts do not reach an unintended application.
- [ ] Login and refresh work through HTTPS with the intended cookie and origin policies.

**Verification and evidence**

- Run deployment entrypoint checks and focused browser provenance/security gates.
- Retain sanitized headers and effective configuration digest.

## W01 04 Certify the deployed assessment lifecycle

**Required for:** Pilot. **Status:** Blocked.

**Dependencies:** W01.03, W02.02, W03.01.

**Work**

- [ ] Run the disposable institute/account/import/build/assign/start/save/submit/result journey on the exact HTTPS candidate.
- [ ] Include anonymous, draft, inactive assignment, unassigned student, future/expired window, cross-student and cross-tenant denials.
- [ ] Clean up exact synthetic fixtures and record both archive behavior and any deliberate purge.

**Acceptance criteria**

- [ ] Correct score, rank and result visibility agree across browser/API/database.
- [ ] No critical negative path fails and fixture cleanup is independently verified.

**Verification and evidence**

- Retain trace, screenshots, API/database assertions and candidate manifest together.
- Require the deployed result, not a local-only pass.

## W01 05 Rehearse promotion and rollback

**Required for:** Pilot. **Status:** Blocked.

**Dependencies:** W01.04, W09.04.

**Work**

- [ ] Run a staged promotion and health verification using the release runbook.
- [x] Rehearse rollback in an isolated environment with a migration-compatible database strategy.
- [ ] Record recovery owner, trigger, elapsed recovery time and known rollback limits.

**Acceptance criteria**

- [ ] A release can be identified, promoted and recovered using the runbook.
- [ ] Pilot release approval references the exact candidate and its test evidence.

**Verification and evidence**

- Perform the rollback rehearsal without affecting real learners.
- Verify web/API/data consistency after recovery.

## Completion and handoff

The accountable owner records the candidate SHA, environment, test outcomes, evidence links and remaining exclusions in the execution tracker. QA verifies the acceptance criteria for the features entering the release. A task is complete only when its stated outcome is demonstrated; an existing model, route or test file is not sufficient.

If an API, schema, authorization rule, assessment policy or paid-access rule changes, document compatibility, any required migration, affected clients and rollback limits before promotion. Changes to saved answers, grades and historical results require explicit preservation checks.

## Full service recovery continuation

Database, referenced media, Gunicorn and standalone Next.js rollback/forward recovery pass on the synthetic local fixture. W01 remains in progress because the documented stage is unreachable and the available cloud identity cannot inspect that target region. See the execution report for exact evidence and the external recovery requirement.
