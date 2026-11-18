# Onboarding and customer trust

Workstream W07 · Created 21 October 2026 · Status: In progress

## Execution checkpoint — 21 October 2026

W07.01 is complete. Assisted institute provisioning remains the pilot path, public web accounts complete role-specific profiles before protected workspaces open, and the native app admits complete student accounts only. See the [onboarding contract](../../qa-runbooks/W07_PILOT_ONBOARDING.md) and [verification record](../../qa/84-w07-role-onboarding-verification-20261021.md).

W07.02 is complete. Web recovery uses neutral responses, throttled single-use expiring tokens and password-change session revocation; the student app links to the same flow. SMTP deployment settings and the assisted fallback are documented in the [recovery runbook](../../qa-runbooks/W07_ACCOUNT_RECOVERY.md) and [verification record](../../qa/85-w07-account-recovery-verification-20261021.md).

W07.03 is complete for the assisted pilot. Public policy/support routes, accountable operators, scoped request handling and reviewed deletion-versus-retention rules are defined in the [data and support policy](../../customer-trust/PILOT_DATA_SUPPORT_POLICY.md) and demonstrated in the [verification record](../../qa/87-w07-customer-policy-support-verification-20261021.md).

Customers understand the offer, can enter and recover their account, and have clear support/privacy procedures.

[Return to the high level plan](00-HIGH-LEVEL-PLAN.md)

## Ownership and dependencies

- Accountable owner: Product owner and web engineer.
- Supporting roles: Backend engineer, founder and support/content owners.
- Entry dependencies: D01 customer scope, D06 offer and W02 role/access contract.
- Planning effort: 5–9 engineering days plus business review. This is effort, not a guaranteed elapsed duration.
- Audit findings: AUTH03, TRUST01, MKT01, MKT02, UX04. See the [audit findings](../../qa/evidence/market-audit-20261021/summary.json).

## Implementation areas

- `edutech_web/src/components/auth/`
- `edutech_web/src/lib/site-content.ts`
- `edutech_web/src/app/(marketing)/`
- `edutech_backend/apps/accounts/`
- `nexora_student_mobile/app/(auth)/`

Paths identify existing areas to inspect; they do not imply every listed file requires a change. Keep related existing contracts and reuse working implementation.

## Execution order

1. W07.01 — Complete role onboarding and first use. Gate: Pilot.
2. W07.02 — Add account recovery. Gate: Public self-serve; assisted fallback acceptable for pilot.
3. W07.03 — Publish customer policies and support routes. Gate: Pilot.
4. W07.04 — Replace internal marketing content. Gate: Public acquisition.
5. W07.05 — Measure activation and support friction. Gate: Pilot.

## W07 01 Complete role onboarding and first use

**Required for:** Pilot. **Status:** Complete.

**Dependencies:** W02.01.

**Work**

- [x] Define assisted institute provisioning plus public student/teacher/parent web onboarding where included.
- [x] Route accounts to the correct profile-completion and first-use task.
- [x] On native apps accept student accounts only; give other roles a clear web destination without exposing their protected data.

**Acceptance criteria**

- [x] An incomplete profile cannot strand a user or route them into another role.
- [x] A newly provisioned pilot student can reach their first assigned exam.

**Verification and evidence**

- Ran the backend fresh-account/profile suite and verified guarded role redirects plus the student dashboard-to-assigned-exam handoff; native device cases join W08.03.

## W07 02 Add account recovery

**Required for:** Public self-serve; assisted fallback acceptable for pilot. **Status:** Complete.

**Dependencies:** W07.01.

**Work**

- [x] Implement secure time-limited, single-use password reset with neutral account-existence messaging and rate limits.
- [x] Handle delivery failure, expiry, reuse and session invalidation consistently.
- [x] Document a verified support recovery fallback for pilot users.

**Acceptance criteria**

- [x] A legitimate user can recover access; an attacker cannot enumerate or take over accounts via recovery.
- [x] Recovery behavior is consistent across student web and native entry points.

**Verification and evidence**

- Tested expired/replayed tokens, wrong identity, throttling, provider delivery failure and post-reset sessions in Docker/PostgreSQL.

## W07 03 Publish customer policies and support routes

**Required for:** Pilot. **Status:** Complete for pilot.

**Dependencies:** W07.01, W06.01.

**Work**

- [x] Create usable privacy/terms/support destinations and link them from signup, footer and native settings.
- [x] Assign owners for child/guardian handling, data export/deletion, retention, complaints and pilot payment terms.
- [x] Define student deletion versus institute academic record retention and require business/legal approval before broader launch.

**Acceptance criteria**

- [x] Policy and support links resolve; the named procedures have an accountable operator.
- [x] Requests can be fulfilled without unauthorized data exposure or inconsistent deletion claims.

**Verification and evidence**

- Checked web/mobile links and rehearsed a tenant-scoped synthetic export/support resolution; the same reviewed workflow applies to deletion requests.

## W07 04 Replace internal marketing content

**Required for:** Public acquisition. **Status:** Not started.

**Dependencies:** W05.01, W06.01.

**Work**

- [ ] Replace design commentary and generic positioning with actual first-segment outcomes and supported workflows.
- [ ] Substantiate or remove user counts, satisfaction percentages and testimonials.
- [ ] Provide a concrete institute contact/demo journey or supported student checkout; do not label an undefined offer a free trial.

**Acceptance criteria**

- [ ] Every visible claim has supporting business evidence or is removed.
- [ ] Primary calls to action reach a working, appropriately scoped destination.

**Verification and evidence**

- Review landing, pricing, resources, contact and signup on desktop/mobile; test every primary conversion link.

## W07 05 Measure activation and support friction

**Required for:** Pilot. **Status:** Ready for human observation.

**Dependencies:** W07.01, W07.03, W04.04.

**Work**

- [x] Instrument minimal privacy-reviewed events for signup/profile completion, first assigned exam, start, save failure, submit and support request.
- [x] Use role/platform and release identity to distinguish web, Android and iOS failures without collecting answer text or credentials.
- [x] Prepare an activation/support dashboard and a weekly owner review.
- [ ] Observe unfamiliar pilot users completing teacher question find/add, student wallet-history and learner signup/first-action tasks without coaching; record time, errors and abandonment points.

**Acceptance criteria**

- [x] The team can identify where pilot users stop and which failures affect assessment completion.
- [x] Event collection respects the published data practices.

**Verification and evidence**

- Run a synthetic journey and reconcile expected events; inspect payloads for sensitive fields.
- Pair synthetic event reconciliation with the unfamiliar-user task observation carried from W04.02 and W04.04; do not treat automated browser checks as human usability evidence.

Checkpoint: [activation measurement verification](../../qa/88-w07-activation-measurement-verification-20261021.md), [measurement contract](../../customer-trust/PILOT_ACTIVATION_MEASUREMENT.md) and [human observation runbook](../../qa-runbooks/W07_UNFAMILIAR_USER_OBSERVATION.md). Instrumentation, privacy enforcement, scoped reporting and weekly review are complete; the human observation remains open.

## Completion and handoff

The accountable owner records the candidate SHA, environment, test outcomes, evidence links and remaining exclusions in the execution tracker. QA verifies the acceptance criteria for the features entering the release. A task is complete only when its stated outcome is demonstrated; an existing model, route or test file is not sufficient.

If an API, schema, authorization rule, assessment policy or paid-access rule changes, document compatibility, any required migration, affected clients and rollback limits before promotion. Changes to saved answers, grades and historical results require explicit preservation checks.
