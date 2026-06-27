# Referral, Wallet, and Subscription Product Plan

## Purpose

This document defines how `referral`, `wallet`, and `subscription` should work in Nexora from the current project perspective.

It is not a generic fintech plan.
It is an assessment-platform economy plan built around:

- student progression
- premium exam and practice unlocks
- institute-configurable commercial rules
- truthful operator-settled purchase flows

References:

- [NEXORA_FINAL_IMPLEMENTATION_SOURCE_OF_TRUTH.md](/Users/ansh/Documents/Eductech/NEXORA_FINAL_IMPLEMENTATION_SOURCE_OF_TRUTH.md:1)
- [NEXORA_ECONOMY_PHASE_2_FRONTEND_PLAN.md](/Users/ansh/Documents/Eductech/NEXORA_ECONOMY_PHASE_2_FRONTEND_PLAN.md:1)
- [NEXORA_ECONOMY_SEED_MATRIX.md](/Users/ansh/Documents/Eductech/NEXORA_ECONOMY_SEED_MATRIX.md:1)
- [REGISTRATION_AND_SUBSCRIPTION_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/REGISTRATION_AND_SUBSCRIPTION_IMPLEMENTATION_PLAN.md:1)
- [ECONOMY_OPERATOR_RUNBOOK.md](/Users/ansh/Documents/Eductech/ECONOMY_OPERATOR_RUNBOOK.md:1)
- [ECONOMY_GOVERNANCE_BOUNDARY_NOTE.md](/Users/ansh/Documents/Eductech/ECONOMY_GOVERNANCE_BOUNDARY_NOTE.md:1)

## Current Delivery Note

As of `2026-06-26`, the product intent in this document is no longer only conceptual for the main student flow.

Already live in the current repo:

- canonical student onboarding hook for economy initialization
- signup reward lifecycle wiring
- referral reward lifecycle wiring
- student referral code visibility in profile and wallet
- admin operator confirmation flow in `/admin/economy`
- institute-admin economy support flow in `/institute/economy`
- mutable end-to-end coverage for:
  - referral onboarding to wallet visibility
  - admin order confirmation
  - institute-admin economy workspace access and support actions
  - student settled-state visibility after admin confirmation

Still pending relative to the full product vision:

- broader governance and policy decisions around which economy actions should remain platform-controlled
- governance hardening and wider config audit across learner surfaces

## 1. Product Position

Nexora should treat these three features as one connected economy system:

1. referral brings new learners in
2. wallet stores learner value in stars
3. subscriptions and star packs add recurring or one-time value into that wallet

The important product rule is:

- `stars` are the main learner-facing value unit
- `wallet` is the main visibility and tracking surface
- `subscriptions` normally credit stars rather than bypass the economy
- `referrals` are a growth and reward layer, not a separate commerce product

## 1.1 Config-First Extension Rule

Everything in this area should stay configurable so the platform can expand later without structural rewrites.

That means we should prefer:

- database-driven rules over code constants
- policy objects over special-case UI logic
- configurable labels and metadata over family-specific hardcoding
- service-layer resolution over duplicated frontend calculations

### What must remain configurable

- referral reward amounts
- referral reward side:
  - referrer
  - referee
  - both
- referral campaign validity windows
- referral usage limits
- signup rewards
- exam completion rewards
- score-threshold rewards
- star-pack catalog
- subscription plan catalog
- subscription cycles
- subscription credit rules
- order states and settlement flow
- content access policies
- unlock rules
- institute-specific overrides
- future family-specific premium packaging

### What should not be hardcoded in product code

- prices
- star costs
- reward values
- entitlement codes
- unlock conditions
- plan names as logic keys
- billing interval assumptions
- “this family always needs this pack” assumptions
- referral campaign rules

### Extension principle

If we want to add later:

- new exam families
- new premium bundles
- new pricing experiments
- institute-specific campaigns
- seasonal referral campaigns
- family subscriptions
- certification bundles

we should be able to do that mainly through:

- config
- seed data
- admin/operator controls
- service-layer policy interpretation

not through broad frontend rewrites.

## 2. What Already Exists

The project already has meaningful foundations.

### Backend

The backend already supports real economy models in `apps.economy`, including:

- `StudentEconomyProfile`
- `StarLedger`
- `RewardRule`
- `ReferralProgram`
- `ReferralCode`
- `ReferralEvent`
- `StarPack`
- `PaymentOrder`
- `SubscriptionPlan`
- `SubscriptionPlanCycle`
- `SubscriptionStarCreditRule`
- `StudentSubscription`
- `ContentAccessPolicy`
- `UnlockRule`
- `UnlockState`

### Existing student surfaces

The web student product already has:

- `/app/wallet`
- `/app/subscriptions`
- wallet visibility in dashboard
- unlock-aware states in dashboard, exams, practice, attempts, and results
- referral code visibility in wallet and profile

### Existing registration support

Student registration already carries optional `referral_code`, and backend tests already exist for applying valid referral codes during signup.

## 3. Core Product Rules

These should stay true across implementation.

### Rule A. Wallet is ledger-based, not just balance-based

We should never build the wallet as only:

- `current balance`

We should always preserve:

- credits
- debits
- reason
- source type
- source reference
- balance after transaction

Why:

- learner trust
- operator auditability
- support clarity
- future refund and adjustment support

### Rule B. Referral should reward learning entry, not random sharing

Referral in Nexora should be tied to:

- real student signup
- institute context
- active referral program

That means:

- a student cannot use their own code
- a code must belong to the same institute context where required by policy
- rewards should be issued only after a valid signup event

### Rule C. Subscription should normally credit value, not create hidden bypasses

Default Nexora posture:

- subscription gives recurring star value
- star value is then used across premium content

Only special cases should bypass normal spending, through:

- `entitlement_only`
- `stars_or_entitlement`

This keeps the system explainable and avoids a messy mix of hidden access rules.

### Rule D. Payment settlement must stay truthful

Current project posture is correct and should stay:

- wallet and subscription pages may create order requests
- final crediting or activation depends on operator settlement flow
- the UI should not pretend money or stars were instantly settled

This is especially important while full payment-provider automation is not yet active.

### Rule E. Configuration must resolve behavior, not just decorate it

Configuration in Nexora should not be treated as display-only metadata.

It should actually drive:

- reward issue decisions
- star credit calculations
- unlock decisions
- entitlement checks
- purchase and subscription visibility
- family-specific premium recommendations

If the UI still needs hidden hardcoded branching to behave correctly, the configuration model is not finished enough.

## 4. How Each Feature Should Work

## 4.1 Referral

### Product goal

Use referrals to grow student acquisition while rewarding both the inviter and the joining learner.

### Student-facing behavior

The student should be able to:

- see their referral code in wallet and profile
- optionally enter a referral code during signup
- later see referral rewards in wallet reward history and ledger

### Recommended UX

During registration:

- `Referral code (optional)`
- helper copy:
  - `Have a code from your institute or a friend? Add it here for any active joining reward.`

Inside wallet:

- show `Your referral code`
- show `Latest referral reward`
- show `How referral rewards work`

### Business rules

- reward should come from `ReferralProgram`
- reward can apply to:
  - referrer
  - referee
  - both
- default seed posture:
  - both get rewarded
- code usage limits should remain configurable
- campaign naming and campaign metadata should remain configurable so institutes can evolve referral posture later

### Recommended default behavior

- student enters referral code at signup
- registration succeeds normally
- economy service validates and applies code
- both students get ledger credits if policy allows
- wallet reflects:
  - reward event
  - ledger entry
  - updated available stars

### What not to do

- do not make referral a separate “coupon” system
- do not apply referral rewards without a real student record
- do not show referral rewards as guaranteed if the program is inactive or expired

## 4.2 Wallet

### Product goal

Wallet is the learner’s economy control center.

It should answer:

- how many stars do I have
- how did I earn them
- where did I spend them
- what premium content is unlocked
- what is still pending

### Wallet should contain

1. current balance
2. earned vs spent summary
3. reward history
4. ledger history
5. unlock history
6. star packs
7. subscription previews
8. order/request history

### Recommended information architecture

Section order:

1. `Balance`
2. `How stars work`
3. `Referral and rewards`
4. `Recent wallet activity`
5. `Unlocked content`
6. `Buy stars`
7. `Subscription value`
8. `Pending requests`

### Wallet behavior rules

- all values come from backend APIs
- no hardcoded pack prices
- no hardcoded subscription values
- no fake “instant credit” promises
- unlock history must explain why content is unlocked or locked
- reward, pack, and subscription sections should render from available backend records, not from fixed assumptions about catalog size or plan count

### Recommended Nexora copy posture

- truthful
- learner-friendly
- low jargon

Good:

- `Order created. It will stay pending until confirmed by your institute or platform operator.`
- `Stars are available for premium unlocks.`
- `Unlock decisions appear here after backend policy is applied.`

Bad:

- `Payment successful` when it is only a request
- `Premium unlocked` before unlock state is actually updated

## 4.3 Subscriptions

### Product goal

Subscriptions are the recurring-value path for serious learners.

In Nexora, subscriptions should usually mean:

- regular star credits
- possible access inclusion for selected premium lanes
- better recurring value than buying one-time packs repeatedly

### Student-facing behavior

The learner should be able to:

- compare plans
- compare cycles
- understand stars credited on activation and renewal
- create a subscription order request
- see active or pending subscription records

### Recommended UX structure

Sections:

1. `Why subscribe`
2. `Your current subscriptions`
3. `Available plans`
4. `Pending subscription orders`
5. `Billing and credit history`

### Subscription rules

- plan, cycle, and star credit rules must come from backend
- activation does not auto-complete unless settlement confirms it
- star credits from subscriptions must write into ledger
- subscription status alone should not silently bypass wallet unless the access policy explicitly says so
- plan comparison UI should tolerate future additional cycles, currencies, trial flags, and institute-specific availability without structural rewrite

### Recommended default commercial posture

- subscriptions should be best for repeat mock/practice users
- one-time star packs should remain available for lighter users
- plan messaging should focus on:
  - recurring value
  - convenience
  - learning continuity

## 5. How They Work Together In Nexora

This is the key project perspective.

### Flow 1. New learner joins with referral

1. student registers
2. student optionally enters referral code
3. backend creates student account
4. referral program is validated
5. referral rewards are issued into ledger
6. wallet balance increases
7. learner can later spend those stars on premium content

### Flow 2. Learner buys a star pack

1. learner opens wallet
2. chooses a star pack
3. system creates `PaymentOrder`
4. UI shows `pending` request
5. operator or provider confirms settlement
6. stars are credited into wallet ledger
7. learner can unlock content

### Flow 3. Learner subscribes

1. learner opens subscriptions
2. chooses a plan cycle
3. system creates subscription order request
4. order stays pending until confirmed
5. on settlement:
  - subscription becomes active
  - subscription billing event is recorded
  - stars are credited into ledger
6. learner uses credited stars or qualifying entitlement access

### Flow 4. Learner unlocks premium content

1. learner sees locked exam or practice set
2. UI reads `economy_access` from backend
3. if stars can unlock:
  - show star cost
  - allow spend
4. on successful spend:
  - ledger debit created
  - unlock state updated
  - content becomes available
5. wallet and content surface both reflect the change

## 6. Recommended Product Scope

## Phase 1: tighten what already exists

This should happen first.

- make wallet fully trustworthy
- make subscriptions decision-oriented and honest
- make referral more visible in wallet and registration
- improve unlock explanations across dashboard, exams, practice, and results
- ensure all pending / processing / credited states are clear

### Delivery targets

- student wallet polish
- student subscription polish
- better referral visibility
- better order-state wording
- better operator-state wording
- config audit to remove remaining hardcoded commercial assumptions

## Phase 2: complete the real lifecycle

- richer reward history
- better subscription billing visibility
- clearer unlock-reason explanation everywhere
- institute/admin operator tools for confirming and auditing requests
- stronger support flows for grants, deductions, and manual unlocks

## Phase 3: payment-provider integration

Only after the project wants true automated settlement.

- provider order mapping
- transaction callbacks
- automatic credit or activation
- refund support
- stronger payment audit trail

## 7. Role Perspective

### Student

- see value
- earn value
- request value
- spend value
- understand why content is locked or unlocked

### Teacher

- should mainly control content premium posture indirectly through exam/practice policy
- should not become a payments operator

### Institute admin

- should understand economy posture
- should be able to support students
- may confirm requests or grants depending on business policy

### Platform admin

- should configure plans, packs, reward rules, referral programs, and settlement actions
- should own audits and exception handling

## 8. Recommended UX Decisions

These are the product calls I would strongly recommend.

### Referral

- keep referral optional in registration
- surface referral code in wallet and profile
- show referral reward history in wallet
- do not make referral the homepage hero until the core loop is stable

### Wallet

- keep wallet as the main economy hub
- make ledger and rewards visible, not hidden behind extra clicks
- show pending orders clearly
- show unlock outcomes clearly

### Subscription

- position as recurring value, not as a complicated billing dashboard
- show stars credited prominently
- compare plans against one-time star packs
- keep activation truthful and operator-aware

## 9. What We Should Not Do

- do not build payment-first flows before economy clarity is complete
- do not hardcode prices, rewards, or star costs in frontend logic
- do not let subscriptions silently bypass all wallet logic by default
- do not show success states before settlement or unlock actually completes
- do not split referral, wallet, and subscriptions into separate disconnected systems

## 10. Recommended Next Tickets

1. Create one unified economy UX review for `/app/dashboard`, `/app/exams`, `/app/results`, `/app/wallet`, and `/app/subscriptions`
2. Tighten referral visibility in registration, wallet, and profile
3. Add clearer order-state language for star-pack and subscription requests
4. Audit all economy surfaces for hardcoded prices, reward values, entitlement assumptions, and fixed plan logic
5. Add institute/admin operator documentation for confirming orders and auditing ledger changes
6. Add end-to-end automation for:
   - referral signup reward visibility
   - wallet order creation
   - subscription order creation
   - unlock-after-spend behavior

## Bottom Line

From Nexora’s perspective:

- `referral` is a growth-and-reward input
- `wallet` is the central economy truth surface
- `subscription` is the recurring-value layer
- `stars` are the main learner-facing value unit

That means the right architecture is not:

- referral as marketing only
- wallet as cosmetic only
- subscription as a hidden entitlement switch

The right architecture is:

- one connected, ledger-backed learner economy where rewards, purchases, subscriptions, and premium unlocks all stay explainable from stored backend state.
