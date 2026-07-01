# Nexora Referral Wallet Subscription Next Implementation Plan

## Purpose

This document defines the next implementation phase for Nexora's connected economy system.

It is the execution companion to:

- [REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md:1)
- [NEXORA_ECONOMY_PHASE_2_FRONTEND_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/NEXORA_ECONOMY_PHASE_2_FRONTEND_PLAN.md:1)
- [REGISTRATION_AND_SUBSCRIPTION_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/REGISTRATION_AND_SUBSCRIPTION_IMPLEMENTATION_PLAN.md:1)

This plan is based on the current repository state, not on an imagined greenfield design.

Operator runbook:

- [ECONOMY_OPERATOR_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/ECONOMY_OPERATOR_RUNBOOK.md:1)
- [ECONOMY_GOVERNANCE_BOUNDARY_NOTE.md](/Users/ansh/Documents/Eductech/docs/content-question-bank/ECONOMY_GOVERNANCE_BOUNDARY_NOTE.md:1)

## Current Status Summary

### Strong already

- backend economy data model in `apps.economy`
- ledger-backed wallet accounting
- student wallet page
- student subscriptions page
- star pack order request creation
- subscription order request creation
- admin star grants
- admin order confirmation
- admin order confirmation queue in `/admin/economy`
- institute-admin economy support lane in `/institute/economy`
- unlock evaluation and star-spend flow
- command-driven economy seed defaults
- public student onboarding now triggers canonical signup reward wiring
- public student onboarding now triggers canonical referral reward wiring
- student referral code visibility is live in profile and wallet
- mutable Playwright coverage exists for:
  - referral onboarding to wallet visibility
  - admin order confirmation
  - student settled-state visibility after admin confirmation

### Partial

- platform and institute economy governance are still backend-command-led rather than UI-managed
- final policy ownership for platform-vs-institute settlement is not fully hardened yet
- operator-facing runbook/documentation has started but still needs broader governance notes
- subscription and wallet settled-state visibility is verified by tests, but support documentation can still be tightened

### Not in current scope

- automated payment gateway callbacks
- refund automation
- complete billing provider reconciliation
- full no-code catalog governance for plans, packs, and referral programs

## Product Goal For The Next Phase

Complete the real Phase 1.5 to Phase 2 economy lifecycle so that:

- referral becomes truly functional end to end
- wallet becomes fully trustworthy as the central learner economy surface
- subscriptions become operationally complete for operator-settled usage
- admin support flows are clear enough for real usage
- all behavior remains config-first and extensible

## Guiding Principles

- do not replace the current ledger model
- do not hardcode new commerce assumptions into frontend logic
- do not pretend settlement is instant
- do not build payment-provider complexity before the operator flow is airtight
- finish the real lifecycle before adding shiny catalog-management UI

## Implementation Tracks

## Track 1. Referral Lifecycle Completion

### Status

Core runtime implementation is now complete.

### What was completed

- public registration captures `referral_code`
- onboarding completion is the canonical student-economy hook
- signup rewards run from that hook
- referral rewards run from that hook
- referral code generation is guaranteed for eligible students
- student profile and wallet now surface referral context more clearly
- mutable end-to-end Playwright coverage validates registration to onboarding to wallet visibility

### Remaining focus

- keep referral operator/support wording clean
- preserve this lane while future platform-vs-institute governance rules are clarified

### Why this came first

Referral is the biggest gap between intended product behavior and current runtime behavior.

The engine exists, but the real user journey is incomplete.

### Current reality

- referral runtime is now live end to end for the public student onboarding flow
- lifecycle and Playwright coverage now protect the wiring
- the remaining work is mostly operational clarity and broader admin-scope hardening

### Goal

When a valid referred learner becomes a real student in institute scope:

- referral program is validated
- a referral event is created once
- referrer and referee get wallet credits if policy allows
- wallet ledger reflects the reward
- referral code usage count is updated

### Work items

1. Preserve the canonical onboarding hook as the only public referral orchestration point.
2. Keep idempotency and same-institute validation covered as other onboarding flows expand.
3. Retain referral visibility in wallet/profile as wallet information architecture evolves.
4. Extend operator documentation for support handling and referral troubleshooting.

### Recommended implementation posture

- apply referral only after a real `StudentProfile` exists
- do not issue referral rewards at raw account-shell creation time
- preserve pending registration context until profile completion resolves institute and learner identity cleanly

### Acceptance criteria

- valid referral code produces one referral event only
- invalid referral code blocks referral reward but does not corrupt onboarding state
- self-referral is rejected
- cross-institute referral is rejected
- wallet ledger shows referral credits clearly
- referral code appears on student profile and wallet when active

## Track 2. Signup Reward Wiring

### Status

Core runtime implementation is now complete.

### Why this matters

The signup reward processor exists, but it is not clearly part of the guaranteed public onboarding lifecycle.

### Goal

When a real student onboarding flow completes:

- matching signup reward rules are evaluated
- reward event is created once
- wallet ledger is credited once

### Work items

1. Preserve onboarding completion as the canonical student signup-reward moment.
2. Keep signup reward visibility understandable in wallet as surfaces evolve.
3. Expand documentation so operators understand signup reward side effects and ledger traces.

### Acceptance criteria

- signup reward does not double-credit
- signup reward appears in wallet reward history
- signup reward source is readable and not hidden behind internal naming

## Track 3. Wallet Trust And Clarity Pass

### Why this matters

The wallet is already strong, but this is the central user trust surface.

It needs to be operationally complete, not just technically present.

### Goal

Make `/app/wallet` the single truthful learner economy hub.

### Work items

1. Review wallet sections against the product plan ordering.
2. Tighten empty, pending, and error states.
3. Ensure reward, ledger, unlock, packs, subscriptions, and orders all render from backend records only.
4. Improve wording around:
   - pending requests
   - processed but not yet credited states
   - unlock results
5. Add explicit recent unlock outcome visibility when spend succeeds.
6. Verify no static prices or fixed commercial assumptions remain in wallet rendering.

### Acceptance criteria

- no optimistic success language before settlement
- no static pack or plan assumptions in UI
- unlock outcome is visible after spend
- latest reward and latest ledger activity are easy to understand

## Track 4. Subscription Operational Completion

### Why this matters

The subscription path already supports request creation and activation logic, but we should complete the operational story before payment automation.

### Goal

Make subscriptions production-usable in an operator-settled environment.

### Work items

1. Preserve and extend the now-tested create -> admin confirm -> student settled-state loop.
2. Tighten billing event visibility in `/app/subscriptions`.
3. Ensure active subscription records show:
   - activation state
   - current period
   - billing history
   - latest wallet credit linkage
4. Improve operator-facing documentation for confirming subscription orders.
5. Extend parity to institute-admin scope if policy allows it.

### Acceptance criteria

- subscription request stays truthful while pending
- confirmed subscription creates visible billing event
- credited subscription value appears in wallet ledger
- active subscription status is understandable to learner and operator

## Track 5. Admin And Operator Readiness

### Why this matters

The product already has partial admin support actions, but operating the economy cleanly is as important as student-facing UI.

### Goal

Make institute and platform support teams capable of handling normal economy operations safely.

### Work items

1. Document the real operator flow for:
   - star pack confirmation
   - subscription confirmation
   - support grants
   - unlock refresh
2. Review admin economy workspace wording and boundaries.
3. Add a short runbook for support actions and expected side effects.
4. Verify auditability of grants, confirmations, and unlock recalculations.
5. Decide whether institute admins can confirm orders directly in all policies or whether some flows remain platform-only.

### Acceptance criteria

- admin support actions are documented and repeatable
- operator can explain every balance change from backend state
- support flow does not require guessing hidden logic

## Track 6. Config And Governance Hardening

### Why this matters

The backend model is config-first, but governance is still mostly command-driven.

That is acceptable for now, but the next phase should harden what is already there.

### Goal

Keep the economy extensible without forcing early full CRUD UI for everything.

### Work items

1. Audit for remaining hardcoded commercial assumptions across wallet, subscriptions, dashboard, exams, and results.
2. Confirm all prices, star values, and plan cycles come from backend records.
3. Confirm referral program values remain database-driven.
4. Keep pack/plan/referral governance command-led for now, but standardize seed ownership and rollout steps.
5. Prepare the boundary for future admin CRUD without rewriting current services.

### Acceptance criteria

- no hidden frontend logic keys for prices or rewards
- no family-specific hardcoding in economy decisions
- command-driven governance remains documented and reliable

## Recommended Phase Order

### Phase A. Referral and signup completion

- Track 1
- Track 2

This is the highest-value correctness gap.

### Phase B. Wallet and subscription hardening

- Track 3
- Track 4

This makes the learner economy truly trustworthy.

### Phase C. Operator readiness and config audit

- Track 5
- Track 6

This prepares the system for broader controlled rollout.

## Suggested Ticket Breakdown

### Ticket Group A. Referral

1. Identify canonical referral application lifecycle hook.
2. Wire referral reward processing after real student-profile creation.
3. Add idempotent orchestration test coverage.
4. Ensure student referral code generation for active learners.
5. Add wallet reward visibility validation for referral credits.

### Ticket Group B. Signup reward

1. Wire signup reward processor into actual onboarding completion.
2. Add end-to-end test for signup reward ledger visibility.
3. Review source labels and learner-facing wording.

### Ticket Group C. Wallet

1. Wallet information architecture consistency pass.
2. Pending and processed order wording hardening.
3. Unlock outcome messaging pass.
4. Economy empty and error state consistency pass.

### Ticket Group D. Subscription

1. Subscription request to activation to ledger verification pass.
2. Billing-event UI tightening.
3. Subscription operator runbook.
4. End-to-end automation for subscription confirmation lifecycle.

### Ticket Group E. Admin support

1. Admin economy workflow runbook.
2. Payment confirmation operating notes.
3. Permission and audit review for institute versus platform actions.

### Ticket Group F. Config audit

1. Hardcoded economy assumption audit.
2. Seed-command ownership and rollout checklist.
3. Future admin-governance boundary note.

## Role Impact

### Student

- referral becomes real instead of just captured
- wallet becomes fully trustworthy
- subscriptions become clearer and more actionable

### Teacher

- little direct change
- continues to influence premium posture indirectly via content and access policy

### Institute admin

- gets a clearer support lane
- can more confidently confirm requests and assist learners

### Platform admin

- remains the owner of seed-governed configuration
- gains a clearer operational economy governance model

## Release Readiness Gate For This Plan

This implementation phase can be considered complete when:

- referral is fully wired for real learner onboarding
- signup rewards are truly lifecycle-connected
- wallet and subscriptions stay truthful under pending and confirmed flows
- admin/operator actions are documented and testable
- no material hardcoded commercial assumptions remain on the main learner surfaces

## Bottom Line

The next economy phase should not try to jump immediately to payment-provider automation or broad catalog-management UI.

The right next step is:

- finish referral and signup lifecycle wiring
- harden wallet and subscription clarity
- complete operator readiness
- preserve the config-first service-layer design already present in the codebase

That gives Nexora a production-credible learner economy without overbuilding too early.
