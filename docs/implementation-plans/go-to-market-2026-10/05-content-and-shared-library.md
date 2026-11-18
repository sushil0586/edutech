# Content and shared library

Workstream W05 · Created 21 October 2026 · Status: In progress

## Execution checkpoint — 21 October 2026

W05.01 has a finite candidate offer and is ready for academic approval: assisted Class 7 CBSE/NCERT-first institutes, English, Math and Science, 25 named topics, 50 source questions per topic and four auto-scored question types. See the [offer contract](../../content-question-bank/PILOT_CLASS7_MATH_SCIENCE_OBJECTIVE_OFFER.md) and [selection evidence](../../qa/80-w05-first-content-offer-selection-20261021.md). Docker contains no deployed records from this curated seed batch, so academic approval and controlled provisioning remain pilot gates.

W05.02 automated review is complete, including six source corrections. The content remains pending academic and rights approval because 171 questions belong to number-normalized template families and none of the 1,250 questions records source-rights or human-review metadata. See the [quality audit](../../qa/81-w05-content-quality-audit-20261021.md) and [academic signoff](../../content-question-bank/PILOT_CONTENT_ACADEMIC_SIGNOFF.md).

W05.03 is complete. A marked synthetic Docker tenant received all 1,250 candidate questions, exposed none outside its private scope and was removed with a marker-guarded purge leaving zero residue. See the [isolation and cleanup evidence](../../qa/82-w05-content-isolation-and-cleanup-20261021.md).

W05.05 is complete. Teachers can report content defects and institute/platform reviewers resolve them by publishing traceable revisions. Historical attempts retain the original question and answer meaning. Review ownership, service targets and catalog expansion criteria are defined in the [maintenance policy](../../content-question-bank/PILOT_CONTENT_MAINTENANCE_POLICY.md) and demonstrated in the [verification record](../../qa/83-w05-content-maintenance-verification-20261021.md).

Every curriculum and question package offered at launch has complete, reviewed content and predictable access behavior.

[Return to the high level plan](00-HIGH-LEVEL-PLAN.md)

## Ownership and dependencies

- Accountable owner: Academic lead.
- Supporting roles: Backend engineer, content reviewers and QA.
- Entry dependencies: D01 first customer segment and curriculum.
- Planning effort: 3–6 engineering days plus curriculum review effort. This is effort, not a guaranteed elapsed duration.
- Audit findings: CONTENT01, SHARE01. See the [audit findings](../../qa/evidence/market-audit-20261021/summary.json).

## Implementation areas

- `edutech_backend/apps/academics/`
- `edutech_backend/apps/question_bank/`
- `edutech_backend/question_blueprints/`
- `edutech_backend/apps/economy/`
- `docs/content-question-bank/`

Paths identify existing areas to inspect; they do not imply every listed file requires a change. Keep related existing contracts and reuse working implementation.

## Execution order

1. W05.01 — Select the first content offer. Gate: Pilot.
2. W05.02 — Approve curriculum completeness and quality. Gate: Pilot.
3. W05.03 — Separate customer content from test fixtures. Gate: Pilot.
4. W05.04 — Certify shared content acquisition. Gate: Shared-library sales release.
5. W05.05 — Set content maintenance ownership. Gate: Pilot.

## W05 01 Select the first content offer

**Required for:** Pilot. **Status:** In progress; candidate ready for academic approval.

**Dependencies:** Workstream entry decisions; can begin once scoped.

**Work**

- [x] Choose one institute segment, class/program, subjects, language and supported assessment types.
- [x] List exact chapters/topics and exam bundles promised to pilot users.
- [x] Identify institute-owned versus platform-licensed content and its accountable reviewer role.

**Acceptance criteria**

- [x] A finite pilot inventory exists; unsupported curricula/families are absent from the offer.
- [ ] Each offered topic has a minimum content quantity and review standard agreed by the academic lead.

**Verification and evidence**

- Review the launch inventory with product, teachers and the academic owner.

## W05 02 Approve curriculum completeness and quality

**Required for:** Pilot. **Status:** In progress; automated audit complete, academic signoff pending.

**Dependencies:** W05.01.

**Work**

- [x] Run catalog/content audits on the intended release source data rather than demo totals.
- [ ] Review correctness, explanations, difficulty, duplicates, accessibility of media and curriculum mapping.
- [ ] Resolve empty active topics; record content source/rights and review dates.

**Acceptance criteria**

- [ ] Every advertised topic meets the agreed inventory and editorial standards.
- [ ] No known incorrect answer, unlicensed item or test placeholder remains in offered content.

**Verification and evidence**

- Retain topic coverage report, reviewer signoff and sampled scoring/rendering checks.

## W05 03 Separate customer content from test fixtures

**Required for:** Pilot. **Status:** Complete.

**Dependencies:** W05.02.

**Work**

- [x] Use explicit synthetic fixture identifiers and isolated QA tenants.
- [x] Prevent seeded QA names/questions/packages from appearing in customer discovery.
- [x] Provide dry-run inventory and exact fixture cleanup with ownership checks.

**Acceptance criteria**

- [x] Customer catalogs contain no records from the unapproved curated seed batch.
- [x] Automated tests clean only marked fixture records and verify residue rather than accepting best-effort archive as purge.

**Verification and evidence**

- Compare pre/post catalog inventory and execute one disposable lifecycle cleanup.

## W05 04 Certify shared content acquisition

**Required for:** Shared-library sales release. **Status:** Not started.

**Dependencies:** W02.03, W05.02.

**Work**

- [ ] Run teacher request → institute/platform approval → local link → exam attach/publish.
- [ ] Verify licensed copy edit restrictions and plain-language requested/approved/linked states.
- [ ] Test duplicate requests, matching scope and entitlement expiry/revocation/quota exhaustion.

**Acceptance criteria**

- [ ] A valid institute can use the purchased package; an invalid one cannot bypass restrictions.
- [ ] The treatment of already-published exams after expiry/revocation is explicit and regression-tested.

**Verification and evidence**

- Execute direct API and populated browser package/entitlement tests with reconciliation of usage.

## W05 05 Set content maintenance ownership

**Required for:** Pilot. **Status:** Complete.

**Dependencies:** W05.02.

**Work**

- [x] Define how teachers report incorrect questions and how reviewers resolve them.
- [x] Version corrections so existing attempt/result interpretation remains stable.
- [x] Set periodic content review and catalog expansion criteria.

**Acceptance criteria**

- [x] A reported content defect has an owner and a traceable correction path.
- [x] Question edits do not silently change the meaning or score of past attempts.

**Verification and evidence**

- Rehearsed one synthetic content correction in Docker/PostgreSQL and confirmed historical question and selected-option references remain unchanged.

## Completion and handoff

The accountable owner records the candidate SHA, environment, test outcomes, evidence links and remaining exclusions in the execution tracker. QA verifies the acceptance criteria for the features entering the release. A task is complete only when its stated outcome is demonstrated; an existing model, route or test file is not sufficient.

If an API, schema, authorization rule, assessment policy or paid-access rule changes, document compatibility, any required migration, affected clients and rollback limits before promotion. Changes to saved answers, grades and historical results require explicit preservation checks.
