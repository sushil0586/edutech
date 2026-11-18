# Payments and entitlements

Workstream W06 · Created 21 October 2026 · Status: In progress

## Execution checkpoint — 21 October 2026

W06.01 is complete for the pilot billing decision. The assisted institute pilot is INR 0, student purchases are disabled, and audited grants are classified as included pilot access. The exact paid offer, provider, tax and refund contract remains a prerequisite for W06.02. See the [commercial contract](../../commercial/PILOT_COMMERCIAL_CONTRACT.md) and [verification record](../../qa/86-w06-pilot-commercial-contract-verification-20261021.md).

A successful verified purchase grants the right access once, and failed, expired or refunded transactions are handled predictably.

[Return to the high level plan](00-HIGH-LEVEL-PLAN.md)

## Ownership and dependencies

- Accountable owner: Backend engineer responsible for commerce.
- Supporting roles: Founder, web/mobile engineer, finance operations and QA.
- Entry dependencies: D06 commercial offer and provider; D07 native purchase model; W02 and W05 access/content contracts.
- Planning effort: 8–14 engineering days excluding provider onboarding. This is effort, not a guaranteed elapsed duration.
- Audit findings: PAY01, MKT02, SHARE01. See the [audit findings](../../qa/evidence/market-audit-20261021/summary.json).

## Implementation areas

- `edutech_backend/apps/economy/`
- `edutech_web/src/app/api/`
- `edutech_web/src/app/(student)/app/wallet/`
- `edutech_web/src/app/(student)/app/subscriptions/`
- `nexora_student_mobile/`

Paths identify existing areas to inspect; they do not imply every listed file requires a change. Keep related existing contracts and reuse working implementation.

## Execution order

1. W06.01 — Freeze the commercial contract. Gate: Pilot billing decision; complete commercial contract before paid launch.
2. W06.02 — Implement provider payment verification. Gate: Public paid launch.
3. W06.03 — Make entitlement lifecycle consistent. Gate: Public paid launch.
4. W06.04 — Complete finance and support operations. Gate: Public paid launch.
5. W06.05 — Approve a controlled paid release. Gate: Public paid launch.

## W06 01 Freeze the commercial contract

**Required for:** Pilot billing decision; complete commercial contract before paid launch. **Status:** Complete for pilot; paid offer deferred.

**Dependencies:** Workstream entry decisions; can begin once scoped.

**Work**

- [x] Choose assisted INR 0 institute access for the pilot; direct student purchases and the first paid offer are excluded.
- [x] Define pilot price/currency, term, cancellation and zero-refund behavior; require founder/finance approval of tax, invoice and paid entitlement terms before W06.02.
- [x] Keep native apps consumption-only for the pilot and require a current store-rule review before adding any purchase path.

**Acceptance criteria**

- [x] Each pilot channel has a documented access path and entitlement owner; no purchase channel is represented as supported.
- [x] Pilot grants are explicitly included access and cannot masquerade as automated payment.

**Verification and evidence**

- Reviewed the pilot commercial state diagram and sample zero-price grant/exit records; paid purchase/refund records remain a W06.02–W06.05 gate.

## W06 02 Implement provider payment verification

**Required for:** Public paid launch. **Status:** Not started.

**Dependencies:** W06.01.

**Work**

- [ ] Create provider orders on the server and use approved client checkout components.
- [ ] Verify callback signatures, amounts, currency, order ownership and event replay/idempotency.
- [ ] Keep provider secrets server-side and isolate sandbox from live configuration.

**Acceptance criteria**

- [ ] Only verified settlement can grant paid access.
- [ ] Repeated callbacks and client retries do not create duplicate ledger credits or subscriptions.

**Verification and evidence**

- Run signed/invalid/duplicate/out-of-order sandbox webhook and checkout cases.

## W06 03 Make entitlement lifecycle consistent

**Required for:** Public paid launch. **Status:** Not started.

**Dependencies:** W06.02.

**Work**

- [ ] Apply purchase activation, allowance consumption, renewal, expiry, cancellation and refund/revocation to the chosen policies.
- [ ] Keep exam purchase eligibility separate from institute question-bank authoring rights.
- [ ] Use the same authoritative decisions on student web and native clients.

**Acceptance criteria**

- [ ] The student sees the same current balance, subscription and exam access on all supported devices.
- [ ] A locked or exhausted resource cannot be started via direct API.

**Verification and evidence**

- Compare API/ledger/subscription state through purchase, use, expiry and reversal fixtures.

## W06 04 Complete finance and support operations

**Required for:** Public paid launch. **Status:** Not started.

**Dependencies:** W06.03.

**Work**

- [ ] Add reconciliation, order lookup, transaction audit, refund/cancellation handling and safe support tools.
- [ ] Represent pending, failed, abandoned, disputed and refunded states truthfully.
- [ ] Require audited operator action and prevent privilege escalation in manual adjustments.

**Acceptance criteria**

- [ ] Finance can reconcile provider transactions to internal records and explain discrepancies.
- [ ] Support can resolve a purchase without duplicate grants or undocumented balance changes.

**Verification and evidence**

- Rehearse failed settlement, late callback, refund and reconciliation mismatch in sandbox.

## W06 05 Approve a controlled paid release

**Required for:** Public paid launch. **Status:** Not started.

**Dependencies:** W06.04, W07.03, W09.05.

**Work**

- [ ] Execute the full purchase → unlock → exam → result path on the attested release.
- [ ] Use an authorized controlled live transaction only after provider setup and business approval.
- [ ] Verify receipts/support contacts and customer cancellation/refund guidance.

**Acceptance criteria**

- [ ] Provider and internal records agree; access is granted exactly once.
- [ ] No unresolved critical payment or entitlement defect remains.

**Verification and evidence**

- Retain redacted transaction/reconciliation evidence and finance signoff.

## Completion and handoff

The accountable owner records the candidate SHA, environment, test outcomes, evidence links and remaining exclusions in the execution tracker. QA verifies the acceptance criteria for the features entering the release. A task is complete only when its stated outcome is demonstrated; an existing model, route or test file is not sufficient.

If an API, schema, authorization rule, assessment policy or paid-access rule changes, document compatibility, any required migration, affected clients and rollback limits before promotion. Changes to saved answers, grades and historical results require explicit preservation checks.
