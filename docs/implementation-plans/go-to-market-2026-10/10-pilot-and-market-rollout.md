# Pilot and market rollout

Workstream W10 · Created 21 October 2026 · Status: Planned

A small group of real institutes can operate the product successfully before sales, content and student-app scope expands.

[Return to the high level plan](00-HIGH-LEVEL-PLAN.md)

## Ownership and dependencies

- Accountable owner: Founder or product owner.
- Supporting roles: Customer success, academic lead, QA and engineering lead.
- Entry dependencies: Pilot gates across W01–W05, W07 and W09.
- Planning effort: 2–4 engineering support days plus two real assessment cycles. This is effort, not a guaranteed elapsed duration.
- Audit findings: UAT01, OPS01, MKT02. See the [audit findings](../../qa/evidence/market-audit-20261021/summary.json).

## Implementation areas

- `docs/qa/`
- `docs/user-manual/`
- `docs/qa-runbooks/`
- `docs/implementation-plans/go-to-market-2026-10/`

Paths identify existing areas to inspect; they do not imply every listed file requires a change. Keep related existing contracts and reuse working implementation.

## Execution order

1. W10.01 — Choose design partners and pilot promises. Gate: Pilot.
2. W10.02 — Run unfamiliar-user acceptance. Gate: Pilot.
3. W10.03 — Approve and run the web pilot. Gate: Pilot.
4. W10.04 — Expand to paid web and student app betas. Gate: Public web and student beta.
5. W10.05 — Operate a continuing release process. Gate: After pilot.

## W10 01 Choose design partners and pilot promises

**Required for:** Pilot. **Status:** Not started.

**Dependencies:** Workstream entry decisions; can begin once scoped.

**Work**

- [ ] Proposed initial cohort: 2–3 institutes, one curriculum, objective exams and assisted onboarding. Confirm actual learner numbers/capacity in W09.03.
- [ ] Agree pilot duration, contact, content ownership, support availability and known feature exclusions.
- [ ] Provide a concise onboarding checklist for institute admins, teachers and students.

**Acceptance criteria**

- [ ] Each pilot partner understands included features, limits and support channel.
- [ ] Pilot setup does not promise public marketplace, automated payments or native roles that are outside scope.

**Verification and evidence**

- Review the offer and task checklist with each designated institute contact.

## W10 02 Run unfamiliar-user acceptance

**Required for:** Pilot. **Status:** Not started.

**Dependencies:** W04.05, W05.02, W07.01.

**Work**

- [ ] Observe new admins import a roster and assign a teacher, teachers create/publish an exam, and students start/submit/review it.
- [ ] Include parent linking/visibility only if parent is part of the pilot offer.
- [ ] Record completion time, help requests, failed actions and misunderstood labels; fix the highest-impact friction.

**Acceptance criteria**

- [ ] All required tasks can be completed; no critical access, scoring or answer-loss issue remains.
- [ ] Proposed activation target: at least 80 percent of first-time participants complete their assigned core task without facilitator intervention. Confirm participant mix/sample size before interpreting the result.

**Verification and evidence**

- Retain anonymized task results and route-specific fixes rather than a general satisfaction score.

## W10 03 Approve and run the web pilot

**Required for:** Pilot. **Status:** Not started.

**Dependencies:** W01.05, W02.05, W03.05, W04.05, W05.05, W07.03, W07.05, W09.05, W10.02.

**Work**

- [ ] Approve the exact candidate, capacity cap, support roster and recovery plan.
- [ ] Run two real assessment cycles and review activation, completion, failed saves, content defects and support burden.
- [ ] Pause enrollment and apply the incident runbook if correctness, access/privacy or saved-answer safety fails.

**Acceptance criteria**

- [ ] Two cycles complete with zero unresolved critical incidents and reconciled scores/results.
- [ ] Proposed completion target: at least 95 percent of started attempts reach a valid final state; investigate every technical non-completion. Confirm the target against pilot context.

**Verification and evidence**

- Review event/API/database evidence and institute feedback after each cycle.

## W10 04 Expand to paid web and student app betas

**Required for:** Public web and student beta. **Status:** Not started.

**Dependencies:** W10.03.

**Work**

- [ ] Offer paid self-serve web only after the relevant payment, public-eligibility and support gates pass.
- [ ] Admit student Android/iOS beta users after W08.03; teacher/institute/admin/parent roles stay on web.
- [ ] Expand one curriculum/cohort at a time within the measured capacity envelope.
- [ ] Require W06.05 for paid checkout, W02.04 for cross-institute public exams, W05.04 for shared-package sales and W08.03 for student app beta; these gates apply only to the channel or feature being added.

**Acceptance criteria**

- [ ] Every new sales/channel promise has an owner and current evidence.
- [ ] Student apps can use the approved access model without requiring native operator workflows.

**Verification and evidence**

- Run channel-specific go/no-go reviews and cohort metrics; do not bundle mobile store approval into web readiness.

## W10 05 Operate a continuing release process

**Required for:** After pilot. **Status:** Not started.

**Dependencies:** W10.03.

**Work**

- [ ] Review incidents, support demand, conversion/activation, content quality and release regressions weekly.
- [ ] Schedule small releases with candidate identity, targeted regression and rollback readiness.
- [ ] Reassess broader question types, analytics, curricula and parent capabilities using explicit gates.

**Acceptance criteria**

- [ ] The next release has a bounded scope, owner, regression evidence and operational handoff.
- [ ] Customer feedback changes priorities without silently changing contracts or expanding mobile beyond students.

**Verification and evidence**

- Maintain one current release board and supersede dated readiness claims when evidence changes.

## Completion and handoff

The accountable owner records the candidate SHA, environment, test outcomes, evidence links and remaining exclusions in the execution tracker. QA verifies the acceptance criteria for the features entering the release. A task is complete only when its stated outcome is demonstrated; an existing model, route or test file is not sufficient.

If an API, schema, authorization rule, assessment policy or paid-access rule changes, document compatibility, any required migration, affected clients and rollback limits before promotion. Changes to saved answers, grades and historical results require explicit preservation checks.
