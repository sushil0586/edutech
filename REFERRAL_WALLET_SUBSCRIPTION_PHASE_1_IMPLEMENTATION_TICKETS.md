# Referral Wallet Subscription Phase 1 Implementation Tickets

## Purpose

This document converts the next economy implementation plan into an execution backlog.

It focuses on the highest-value near-term work:

- referral lifecycle completion
- signup reward lifecycle wiring
- wallet trust hardening
- subscription operational completion
- admin/operator readiness
- config and governance audit

References:

- [REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md](/Users/ansh/Documents/Eductech/REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md:1)
- [REFERRAL_WALLET_SUBSCRIPTION_NEXT_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/REFERRAL_WALLET_SUBSCRIPTION_NEXT_IMPLEMENTATION_PLAN.md:1)
- [NEXORA_ECONOMY_PHASE_2_FRONTEND_PLAN.md](/Users/ansh/Documents/Eductech/NEXORA_ECONOMY_PHASE_2_FRONTEND_PLAN.md:1)
- [ECONOMY_OPERATOR_RUNBOOK.md](/Users/ansh/Documents/Eductech/ECONOMY_OPERATOR_RUNBOOK.md:1)

## Delivery Intent

The goal of this ticket set is not to add payment-provider automation or full catalog-governance UI.

The goal is to complete the real economy lifecycle already implied by the current backend foundation.

## Priority Order

### P0

- referral lifecycle completion
- signup reward lifecycle completion
- end-to-end reward and wallet verification

### P1

- wallet clarity hardening
- subscription lifecycle hardening
- operator support runbook

### P2

- config audit
- governance boundary notes
- deeper automation expansion

## Ticket Format

Each ticket includes:

- objective
- scope
- dependencies
- acceptance criteria

## Execution Update

As of `2026-06-26`, the biggest Phase 1 runtime gaps are no longer theoretical backlog items.

Implemented already:

- canonical public student onboarding economy hook
- signup reward lifecycle wiring
- referral reward lifecycle wiring
- referral code generation and visibility in student profile and wallet
- admin operator queue for confirming pending orders from `/admin/economy`
- institute-admin economy workspace verification from `/institute/economy`
- mutable Playwright coverage for:
  - referral onboarding to wallet visibility
  - admin order confirmation
  - institute-admin workspace access and support actions
  - student settled-state visibility after admin confirmation

Still meaningfully pending:

- broader policy decision on which economy actions should remain platform-owned
- broader hardcoding/governance audit across learner surfaces

## Phase 1A. Referral And Signup Lifecycle

### Phase status

Core runtime implementation is complete. Remaining work in this phase is preservation, support clarity, and parity expansion.

### ECON-P0-01 Canonical student economy onboarding hook

#### Objective

Define and implement the single canonical lifecycle point where a learner becomes a real student for economy purposes.

#### Scope

- identify the real student-profile creation or profile-completion hook
- decide the exact orchestration point for:
  - signup reward processing
  - referral reward processing
- ensure this hook runs only when a real `StudentProfile` exists

#### Dependencies

- current public registration flow
- current student onboarding completion flow

#### Acceptance criteria

- there is one documented orchestration point for student economy initialization
- reward/referral processing no longer depends on ad hoc test-only invocation

#### Status

Implemented.

### ECON-P0-02 Wire signup reward into real onboarding lifecycle

#### Objective

Ensure signup rewards are applied automatically for real student onboarding.

#### Scope

- call `process_signup_rewards` from the canonical onboarding hook
- preserve idempotency
- ensure reward events and ledger entries are created once

#### Dependencies

- `ECON-P0-01`

#### Acceptance criteria

- a newly completed student onboarding can create signup reward credits
- repeating the same completion action does not create duplicate reward credits
- wallet reward history shows the signup reward clearly

#### Status

Implemented.

### ECON-P0-03 Wire referral reward into real onboarding lifecycle

#### Objective

Make referral actually functional end to end.

#### Scope

- use stored `referral_code` from registration context or acquisition context
- call `apply_referral_code_for_student_signup` from the canonical student hook
- ensure same-institute validation remains enforced
- ensure self-referral remains blocked
- ensure reward issuance happens only once

#### Dependencies

- `ECON-P0-01`

#### Acceptance criteria

- valid referral code creates a real `ReferralEvent`
- referrer and referee are credited according to active program policy
- wallet ledger reflects both sides where applicable
- duplicate onboarding completion does not double-credit referral rewards

#### Status

Implemented.

### ECON-P0-04 Guarantee referral code creation for active students

#### Objective

Ensure real students who can participate in referral flows always have a usable referral code.

#### Scope

- define when `get_or_create_student_referral_code` runs
- guarantee code visibility on student profile and wallet
- ensure inactive or ineligible students do not create messy duplicate codes

#### Dependencies

- `ECON-P0-03`

#### Acceptance criteria

- eligible student accounts have a stable referral code
- wallet and profile surfaces can resolve the code reliably

#### Status

Implemented.

### ECON-P0-05 Add lifecycle-level backend test coverage

#### Objective

Move confidence from service-only tests to real onboarding lifecycle tests.

#### Scope

- add backend tests for:
  - onboarding completion triggers signup rewards
  - onboarding completion triggers referral rewards
  - duplicate completion remains idempotent
  - cross-institute referral is rejected
  - self-referral is rejected

#### Dependencies

- `ECON-P0-02`
- `ECON-P0-03`

#### Acceptance criteria

- tests fail if signup/referral wiring is removed
- tests assert ledger, reward event, and referral event side effects

#### Status

Implemented.

## Phase 1B. Wallet Trust Hardening

### Phase status

Partially complete. Runtime truth is strong; the remaining work is mostly wording polish, support clarity, and broader surface audit.

### ECON-P1-01 Wallet information architecture audit

#### Objective

Align `/app/wallet` more tightly with the product-plan intent.

#### Scope

- review section order
- verify reward, ledger, unlocks, packs, subscriptions, and order history all have clear presence
- reduce any ambiguity in what the wallet can and cannot do

#### Dependencies

- none

#### Acceptance criteria

- wallet remains backend-driven
- wallet reads as the central economy hub, not just a balance page

### ECON-P1-02 Wallet pending and processed state wording pass

#### Objective

Make order and settlement state language fully honest and easy to understand.

#### Scope

- tighten copy for:
  - pending star-pack requests
  - processed but not yet linked states
  - credited states
  - unlock-after-spend outcomes

#### Dependencies

- none

#### Acceptance criteria

- no page suggests successful payment before settlement
- no page suggests premium unlock before unlock state changes

### ECON-P1-03 Wallet unlock outcome visibility hardening

#### Objective

Make premium spend outcomes easier to trace.

#### Scope

- verify latest unlock state is visible enough
- improve linkage between star debit and unlocked content outcome
- ensure unlock messages remain backend-resolved

#### Dependencies

- none

#### Acceptance criteria

- after star spend, student can understand:
  - what was debited
  - what got unlocked
  - why it is now accessible

### ECON-P1-04 Wallet hardcoding audit

#### Objective

Confirm wallet has no hidden static commercial assumptions.

#### Scope

- verify prices, star values, and plan previews come from backend records
- verify no fallback constants act like real production commercial values

#### Dependencies

- none

#### Acceptance criteria

- wallet is clean of hardcoded pricing assumptions
- any fallback UI remains clearly non-commercial and non-authoritative

## Phase 1C. Subscription Operational Completion

### Phase status

Partially complete. The request -> admin confirm -> student settled-state loop is now covered. Remaining work is mostly UI clarity polish, documentation, and parity expansion.

### ECON-P1-05 Subscription lifecycle verification pass

#### Objective

Verify the request to confirm to activate to credit flow is operationally coherent.

#### Scope

- validate the full path:
  - student creates request
  - admin confirms request
  - subscription record becomes active
  - billing event is recorded
  - wallet ledger is credited

#### Dependencies

- existing order confirmation flow

#### Acceptance criteria

- one confirmed subscription request creates the expected downstream state
- student subscription page reflects the lifecycle clearly

#### Status

Implemented at runtime and covered by mutable Playwright.

### ECON-P1-06 Subscription UI clarity hardening

#### Objective

Make `/app/subscriptions` more operationally explicit.

#### Scope

- tighten visibility of:
  - active periods
  - latest billing event
  - latest credit linkage
  - pending request states
- preserve operator-settled truthfulness

#### Dependencies

- `ECON-P1-05`

#### Acceptance criteria

- learner can distinguish request, processed, and credited states
- active subscription records are understandable without backend knowledge

#### Status

Mostly implemented; wording and support clarity can still improve.

### ECON-P1-07 Subscription end-to-end automation

#### Objective

Add real automated confidence for the subscription lane.

#### Scope

- automate:
  - create subscription order request
  - confirm via admin
  - verify student subscription visibility
  - verify wallet credit visibility

#### Dependencies

- `ECON-P1-05`

#### Acceptance criteria

- test covers the real operator-settled subscription path

#### Status

Implemented.

## Phase 1D. Admin And Operator Readiness

### Phase status

Partially complete. Runtime admin support actions are now stronger, but documentation and boundary clarity still need follow-through.

### ECON-P1-08 Economy operator runbook

#### Objective

Document the real operational flow for support and settlement.

#### Scope

- write runbook for:
  - star-pack confirmation
  - subscription confirmation
  - support grants
  - unlock refresh
- include expected model and ledger side effects

#### Dependencies

- `ECON-P1-05`

#### Acceptance criteria

- operator can follow a repeatable process without code reading

### ECON-P1-09 Admin economy workspace review

#### Objective

Review current admin economy wording and scope boundaries.

#### Scope

- verify the workspace does not imply missing capabilities
- verify platform-only versus institute-available actions are clear
- ensure the UI matches the actual current governance model

#### Dependencies

- none

#### Acceptance criteria

- admin UI stays honest about command-led governance and runtime capabilities

### ECON-P1-10 Permission and audit posture review

#### Objective

Confirm economy operations are safe from a role-scope point of view.

#### Scope

- review who can:
  - grant stars
  - confirm orders
  - refresh unlock states
- confirm auditability of support changes

#### Dependencies

- none

#### Acceptance criteria

- support operations are scoped intentionally
- audit trail is sufficient for phase-1 rollout

## Phase 1E. Config And Governance Hardening

### ECON-P2-01 Economy config audit across learner surfaces

#### Objective

Audit the product for hidden commercial assumptions.

#### Scope

- review:
  - dashboard
  - exams
  - exam detail
  - results
  - attempts
  - wallet
  - subscriptions
- confirm pricing, star costs, and access outcomes are backend-driven

#### Dependencies

- none

#### Acceptance criteria

- no hidden frontend assumptions remain in key learner economy surfaces

### ECON-P2-02 Governance boundary note

#### Objective

Make the current governance model explicit and stable.

#### Scope

- document what stays command-driven for now:
  - referral program catalog
  - star-pack catalog
  - subscription plan catalog
  - unlock-rule catalog
- document what is live runtime operator behavior versus seed-driven setup

#### Dependencies

- none

#### Acceptance criteria

- team can distinguish:
  - runtime operations
  - seed/governance setup
  - future admin CRUD opportunities

### ECON-P2-03 Future admin CRUD readiness note

#### Objective

Prepare for future admin-managed governance without building it prematurely.

#### Scope

- identify which model groups are best candidates for later UI governance
- capture the service boundaries that should remain authoritative

#### Dependencies

- `ECON-P2-02`

#### Acceptance criteria

- future CRUD planning can proceed without redesigning core services

## Recommended Execution Sequence

### Sprint 1

- `ECON-P0-01`
- `ECON-P0-02`
- `ECON-P0-03`
- `ECON-P0-05`

### Sprint 2

- `ECON-P0-04`
- `ECON-P1-01`
- `ECON-P1-02`
- `ECON-P1-03`

### Sprint 3

- `ECON-P1-05`
- `ECON-P1-06`
- `ECON-P1-07`
- `ECON-P1-08`

### Sprint 4

- `ECON-P1-09`
- `ECON-P1-10`
- `ECON-P2-01`
- `ECON-P2-02`
- `ECON-P2-03`

## Definition Of Done For This Backlog

This backlog can be considered complete when:

- referral is truly functional for real student onboarding
- signup reward is part of the real lifecycle
- wallet stays truthful and easy to understand
- subscriptions are operationally complete for operator-settled use
- admin support flows are documented and safe
- key learner surfaces are free from hidden commercial hardcoding

## Bottom Line

The first implementation push should not be broad.

It should be disciplined:

- close the referral and signup lifecycle gap
- harden wallet and subscription trust
- complete the operator story
- preserve the config-first architecture already present in the project
