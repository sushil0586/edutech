# Access and tenant policies

Workstream W02 · Created 21 October 2026 · Status: In progress

Each role can act only on the agreed institute, learner and content scope, including after tenant suspension.

[Return to the high level plan](00-HIGH-LEVEL-PLAN.md)

## Ownership and dependencies

- Accountable owner: Backend engineer.
- Supporting roles: Product owner and security QA.
- Entry dependencies: D03 teacher collaboration, D04 archive behavior and D05 public exam model.
- Planning effort: 5–9 engineering days. This is effort, not a guaranteed elapsed duration.
- Audit findings: AUTH01, AUTH02, EXAM01. See the [audit findings](../../qa/evidence/market-audit-20261021/summary.json).

## Implementation areas

- `edutech_backend/apps/accounts/`
- `edutech_backend/apps/exams/`
- `edutech_backend/apps/attempts/`
- `edutech_backend/apps/results/`
- `edutech_backend/apps/parents/`

Paths identify existing areas to inspect; they do not imply every listed file requires a change. Keep related existing contracts and reuse working implementation.

## Execution order

1. W02.01 — Freeze the access contract. Gate: Pilot.
2. W02.02 — Enforce tenant and account state. Gate: Pilot.
3. W02.03 — Align teacher and parent scope. Gate: Pilot for teacher; parent gate if offered.
4. W02.04 — Resolve public exam eligibility. Gate: Public web if platform exams are offered.
5. W02.05 — Certify authorization on the release candidate. Gate: Pilot.

## W02 01 Freeze the access contract

**Required for:** Pilot. **Status:** Ready for QA.

**Dependencies:** Workstream entry decisions; can begin once scoped.

**Work**

- [x] Define platform, institute, teacher, student and parent read/write scope for roster, questions, exams, attempts, grades and money.
- [x] Choose institute-wide teacher collaboration or assignment-limited access explicitly.
- [x] Separate archive/hide, suspend access and delete semantics; define effects on active attempts and parent visibility.

**Acceptance criteria**

- [ ] A reviewed role/resource matrix states both permitted and denied operations.
- [ ] Suspension behavior preserves saved answers and defines whether active attempts may finish.

**Verification and evidence**

- Review examples with two teachers, two cohorts, two institutes, two students and a linked/unlinked parent.

## W02 02 Enforce tenant and account state

**Required for:** Pilot. **Status:** Ready for QA.

**Dependencies:** W02.01.

**Work**

- [x] Apply the agreed tenant-state checks centrally to protected reads/writes.
- [x] Handle login, refresh and existing sessions consistently when an institute is suspended.
- [x] Preserve the audit trail and provide an explicit recovery/reactivation action.

**Acceptance criteria**

- [ ] A suspended tenant cannot continue ordinary protected operations through an old session.
- [ ] Active exam behavior matches the approved interruption policy; reactivation is controlled and audited.

**Verification and evidence**

- Use synthetic active/suspended tenants to test password login, refresh, existing access token and direct API calls.
- Verify no saved answers are destroyed by suspension.

## W02 03 Align teacher and parent scope

**Required for:** Pilot for teacher; parent gate if offered. **Status:** Ready for QA.

**Dependencies:** W02.01.

**Work**

- [x] Apply the chosen teacher contract to collections, detail routes, CRUD, builder, grading, monitoring, reports and exports.
- [x] Check parent relationship status and per-child permissions on every child-specific endpoint.
- [x] Replace UI wording that claims narrower scope than the API enforces.

**Acceptance criteria**

- [ ] Two disjoint teacher assignments behave exactly as the chosen contract specifies.
- [ ] Revoked, suspended or unrelated parent links do not expose child information.

**Verification and evidence**

- Execute direct API and browser negative matrices, including forged identifiers and exports.

## W02 04 Resolve public exam eligibility

**Required for:** Public web if platform exams are offered. **Status:** Deferred.

**Dependencies:** W02.01, W05.01.

**Work**

- [ ] Choose institute-local copies or a controlled cross-institute platform-exam access path.
- [ ] Define academic mapping, assignment, entitlement, reporting ownership and allowed learner populations.
- [ ] Implement the selected path without weakening ordinary tenant isolation.

**Acceptance criteria**

- [ ] A private-institute learner can discover, unlock if required, take and review an eligible platform exam.
- [ ] An ineligible learner is rejected at discovery/detail/start, and results remain learner-scoped.

**Verification and evidence**

- Run a fresh public-hub plus private-institute fixture through the complete result lifecycle.

## W02 05 Certify authorization on the release candidate

**Required for:** Pilot. **Status:** Ready for QA.

**Dependencies:** W02.02, W02.03.

**Work**

- [x] Bind the agreed access matrix to executable cases and the release SHA.
- [x] Include stale sessions, inactive profiles/assignments, exports, manual grade actions and economy mutations.
- [ ] Run the public-exam cases separately when W02.04 enters release scope.

**Acceptance criteria**

- [ ] No unresolved critical access defect exists for a feature included in the release.
- [ ] Every exclusion is reflected in route/API availability and customer promises.

**Verification and evidence**

- Run focused backend denial tests and real HTTPS browser role/tenant tests.

## Completion and handoff

The accountable owner records the candidate SHA, environment, test outcomes, evidence links and remaining exclusions in the execution tracker. QA verifies the acceptance criteria for the features entering the release. A task is complete only when its stated outcome is demonstrated; an existing model, route or test file is not sufficient.

If an API, schema, authorization rule, assessment policy or paid-access rule changes, document compatibility, any required migration, affected clients and rollback limits before promotion. Changes to saved answers, grades and historical results require explicit preservation checks.

## Local execution — 21 October 2026

Implemented and verified on candidate `fb4c806053c202cb665fc0941c149a4aaa184ef3`: 160 backend tests, 70 direct HTTPS probes and 11 browser cases passed across runs. Teacher collaboration and finish-existing-attempt suspension were confirmed by the product owner. Ready for independent release QA; cross-institute public exams remain deferred from the pilot. One transient provisioning connection reset and a Gunicorn control-service filesystem error remain tracked under W09.02. Public staging certification remains pending.

[Access contract and compatibility](../../qa-runbooks/W02_ACCESS_CONTRACT.md) · [Execution report and evidence](../../qa/64-w02-access-and-tenant-verification-20261021.md)
