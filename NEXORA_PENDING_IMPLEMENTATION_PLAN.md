# Nexora Pending Implementation Plan

## Purpose

This file converts the current source-of-truth direction into an actionable pending implementation plan.

We should use this file to decide:

- what is already done
- what is still pending
- what we should implement next
- what must wait until later

This plan reflects the current repo reality:

- backend work is continuing in `edutech_backend`
- web frontend work is currently continuing in `edutech_web`
- teacher, parent, institute, and admin surfaces remain in the same repo
- payment provider integration is intentionally deferred for now

## Execution Rule

Implementation should proceed only against items in this file unless we explicitly revise the plan.

## Current Status Snapshot

## Already Implemented Or Largely In Place

### Backend Foundation

- `apps/economy` exists
- economy schema migration exists
- wallet, ledger, unlock, star-pack, order, subscription-plan, subscription, spend, and admin economy APIs exist
- Django admin registration for economy models exists
- service-layer economy orchestration exists
- economy tests exist

### Student Frontend Foundation

- shared student shell exists
- global design system and common shell styling are in place
- dashboard exists
- wallet exists
- subscriptions page exists
- exams catalog exists
- exam detail exists
- attempt runtime exists
- attempt summary and review exist
- results exists
- analytics exists
- weak areas exists
- notifications exists
- profile exists
- settings exists

### Auth And Identity

- public registration/login surfaces exist
- backend-driven registration options are wired
- student session and workspace routing are wired

### Secure Assessment Base

- browser-based attempt security guard exists
- attempt resilience panel exists
- webcam proctoring is still intentionally out of scope

## Pending Workstreams

The remaining work should be executed in the following order.

## Workstream 1. Normalize The Official Implementation Path

### Why This Is Pending

The source-of-truth says the student frontend should move to a new frontend repo, but the actual implementation is actively progressing inside `edutech_web`.

This mismatch should be resolved before deeper implementation continues.

### Required Decision

Pick one official path:

1. continue student implementation in `edutech_web`
2. extract student frontend into a new dedicated repo later

### Recommended Path

Continue in `edutech_web` for now, because:

- the student frontend is already substantially implemented here
- teacher, parent, institute, and admin surfaces still need shared CSS and shared shell primitives
- switching repos now would slow implementation without improving product truth

### Exit Criteria

- source-of-truth documents reflect the same official frontend path
- no conflicting repo-direction instructions remain in active planning docs

## Workstream 2. Complete The Reward Engine

### Why This Is Pending

The plan requires a full configurable reward engine, but current implementation still needs final end-to-end completion and validation for all reward types.

### Remaining Scope

- finalize signup reward issuance through configurable `RewardRule`
- finalize exam-completion reward issuance through configurable `RewardRule`
- finalize score-threshold reward issuance through configurable `RewardRule`
- ensure de-duplication through `StudentRewardEvent`
- ensure all reward credits write into `StarLedger`
- ensure reward history is inspectable by admin/operator users

### Backend Deliverables

- reward-rule CRUD through Django admin
- service functions for reward evaluation and issuance
- clear event keys to prevent duplicate rewards
- tests for signup reward, completion reward, and score-threshold reward

### Exit Criteria

- a new student gets signup stars only once
- completion reward is issued only once per qualifying event
- score-based reward follows database rules, not hardcoded thresholds
- all reward credits are visible in wallet and ledger

## Workstream 3. Build The Referral Engine

### Why This Is Pending

The final model structure includes:

- `ReferralProgram`
- `ReferralCode`
- `ReferralEvent`

but this is still pending from the implementation point of view.

### Remaining Scope

- create referral models
- create referral services
- generate referral code per eligible student
- track referral attribution at registration/onboarding
- issue referrer reward through ledger
- issue referred-student reward through ledger if policy allows
- prevent duplicate or self-referral abuse

### Backend Deliverables

- referral models and migration
- referral admin configuration
- referral issuance services
- tests for valid referral, duplicate referral, and self-referral rejection

### Frontend Deliverables

- subtle referral entry field in registration flow
- optional referral visibility in wallet or profile later

### Exit Criteria

- referral bonus comes from DB rules
- both referrer and referred learner rewards are auditable
- invalid referrals do not credit stars

## Workstream 4. Finish Unlock And Spend Integration Across Content

### Why This Is Pending

The economy APIs exist, but the full product still needs consistent spend and unlock behavior across the actual student catalog and detail flows.

### Remaining Scope

- map actual content keys and content types for student-facing catalog items
- attach `ContentAccessPolicy` and `UnlockRule` evaluation to real exam/catalog items
- show clear lock reason on every locked item
- allow spend flow from appropriate item detail or action point
- update unlock state immediately after successful spend
- make unlock states visible in dashboard, catalog, and detail pages

### Backend Deliverables

- stable content-key strategy for exams, practice items, bundles, and future packs
- unlock evaluation service finalization
- spend-to-unlock service finalization
- tests for locked, unlocked, free, entitlement, and insufficient-star scenarios

### Frontend Deliverables

- locked badges and reason text
- truthful CTA states such as:
  - start now
  - unlock with stars
  - unavailable
  - already unlocked
- post-spend refresh of wallet and access state

### Exit Criteria

- student cannot silently enter locked content
- lock reason is always visible
- successful spend visibly changes availability

## Workstream 5. Finish Admin Economy Controls

### Why This Is Pending

The plan requires more than grants. Admin and institute operators need practical controls for exceptions and support.

### Remaining Scope

- confirm star grant flow is production-ready
- add controlled star deduction or adjustment flow if policy allows
- add manual unlock flow
- add manual lock/hide flow where product policy supports it
- add exception-based entitlement flow
- add inspection views for:
  - wallet
  - ledger
  - purchases
  - subscriptions
  - reward history

### Backend Deliverables

- admin APIs and/or reliable Django admin operations for the above
- proper audit metadata on all manual actions
- role-safe institute scoping

### Frontend Or Operator Deliverables

- for now, Django admin may remain the operator surface
- if needed, add minimal internal admin web surfaces later

### Exit Criteria

- admins can resolve access issues without direct database edits
- all admin actions are auditable in the ledger or related audit models

## Workstream 6. Harden Purchase And Settlement Layer Without Provider Integration

### Why This Is Pending

Payment provider integration is intentionally deferred, but the product still needs a clean purchase lifecycle.

### Remaining Scope

- finalize order lifecycle for star-pack purchase
- finalize order lifecycle for subscription purchase
- finalize admin/manual settlement confirmation path
- ensure `PaymentOrder`, `PaymentTransaction`, `StudentSubscription`, and `SubscriptionBillingEvent` stay consistent
- ensure no order can credit twice

### Backend Deliverables

- idempotent settlement service
- clear status transitions
- clear provider/admin confirmation metadata
- tests for duplicate confirmation and failed confirmation paths

### Frontend Deliverables

- show truthful order states only
- no fake “payment success” UX
- keep purchase CTA modular so provider integration can be added later

### Exit Criteria

- admin-confirmed star-pack order credits wallet once
- admin-confirmed subscription order activates subscription once
- subscription credit event writes to ledger correctly

## Workstream 7. Complete Student Frontend Truthfulness Pass

### Why This Is Pending

The frontend exists, but we still need a systematic truthfulness pass so all states match live backend behavior.

### Remaining Scope

- verify all student screens use backend data rather than display assumptions
- remove any stale placeholder copy that could confuse real users
- ensure all locked, unavailable, empty, and failed states are calm and explicit
- ensure wallet, subscriptions, and dashboard stay synchronized after economy actions
- finish responsive review for student screens

### Priority Screens

- dashboard
- wallet
- subscriptions
- exams catalog
- exam detail
- attempts
- results

### Exit Criteria

- no student screen implies access that backend does not grant
- no pricing, rewards, or unlock copy is hardcoded as business truth

## Workstream 8. QA And UAT

### Why This Is Pending

The final plan explicitly requires validation of economy logic, student journey, admin override behavior, and attempt compatibility.

### Required QA Scenarios

- new student gets signup stars correctly
- referred student and referrer get correct rewards
- student can buy configured star pack
- student can create subscription order and receive proper credits after confirmation
- student can spend stars on a priced item
- student cannot access locked content without valid access
- unlock reason is visible and correct
- admin grant immediately affects availability
- paid and earned stars remain distinguishable
- reward duplication is prevented
- tenant boundaries remain enforced
- attempt runtime, result publication, and reward issuance do not conflict

### Exit Criteria

- QA checklist is executed against real flows
- critical failures are resolved before broader rollout

## Do Not Start Yet

The following are intentionally not part of the immediate implementation push:

- real payment provider integration
- webcam proctoring
- full parent-child workflow expansion
- large new internal admin UI program
- ERP-style modules
- AI tutoring or course platform features

## Recommended Implementation Sequence

We should implement in this order:

1. finalize repo direction and update docs
2. complete reward engine
3. build referral engine
4. complete unlock and spend integration across actual content
5. complete admin economy controls
6. harden purchase and subscription settlement without payment provider integration
7. run frontend truthfulness pass
8. execute QA and UAT

## Immediate Next Sprint

The best next sprint is:

### Sprint Goal

Complete the economy-to-product bridge so stars, rewards, and unlocks behave truthfully in the actual student experience.

### Sprint Scope

- finalize reward engine
- build referral engine foundation
- wire unlock and spend behavior to actual exam/catalog content
- add missing admin economy exception flows needed for support

### Sprint Deliverables

- reward models and services fully validated
- referral models and services added
- catalog/detail screens show true lock reason and unlock actions
- admin can grant and manually resolve access issues safely

## Working Rule For Implementation

When implementing any pending item:

- no business-value hardcoding
- no cross-tenant unsafe fetches
- no fake purchase states
- no fake unlock states
- no frontend claims without backend support
- every star movement must remain auditable

