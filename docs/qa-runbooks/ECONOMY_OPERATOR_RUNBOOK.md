# Economy Operator Runbook

## Purpose

This is the practical operator runbook for Nexora's currently live economy support actions.

Use it when you need to:

- inspect a student's wallet state
- confirm a pending star-pack request
- confirm a pending subscription request
- grant stars manually for a support case
- refresh unlock states after a policy or wallet change

This runbook is intentionally limited to what is live today in the repo.

It does not describe future payment-provider automation, refund automation, or full catalog-governance UI.

References:

- [REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md:1)
- [REFERRAL_WALLET_SUBSCRIPTION_NEXT_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/REFERRAL_WALLET_SUBSCRIPTION_NEXT_IMPLEMENTATION_PLAN.md:1)
- [REFERRAL_WALLET_SUBSCRIPTION_PHASE_1_IMPLEMENTATION_TICKETS.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/REFERRAL_WALLET_SUBSCRIPTION_PHASE_1_IMPLEMENTATION_TICKETS.md:1)

## Current Scope

### Live today

- student can create star-pack requests from `/app/wallet`
- student can create subscription requests from `/app/subscriptions`
- platform admin can inspect a selected student's economy state from `/admin/economy`
- platform admin can confirm pending student orders from `/admin/economy`
- platform admin can grant stars manually from `/admin/economy`
- platform admin can refresh unlock states from `/admin/economy`
- institute admin can inspect a selected student's economy state from `/institute/economy`
- institute admin can confirm pending student orders from `/institute/economy`
- institute admin can grant stars manually from `/institute/economy`
- institute admin can refresh unlock states from `/institute/economy`
- student wallet and subscriptions pages reflect settled outcomes after admin confirmation

### Not part of this runbook

- automatic provider callbacks
- refunds and reversals
- expiry workflows
- no-code CRUD for referral programs, star packs, plans, or unlock rules
- final policy hardening on which economy actions should remain platform-only versus institute-allowed

## Operator Role Boundary

### Current default posture

- `platform admin` and `institute admin` are both verified web operator lanes for wallet inspection, order confirmation, manual star grants, and unlock refresh
- catalog governance for packs, plans, referral programs, and seed execution remains platform/backend-command-led

### Why this matters

The backend permission model and web proxy layer now align for both admin roles, and institute scope has direct workspace coverage.

What still needs separate governance signoff is not access parity, but policy choice:

- whether every institute should be allowed to confirm orders directly
- whether some settlement actions should remain centrally controlled
- whether higher-risk catalog actions should stay platform-only

## Operator Entry Point

Primary workspace:

- `/admin/economy`
- `/institute/economy`

This page currently provides:

- selected student picker
- live wallet state
- recent reward events
- operator queue for pending student order requests
- star grant action
- unlock refresh action

## Standard Operating Principles

1. Treat wallet and subscriptions as truthful state surfaces, not optimistic payment surfaces.
2. Confirm an order only when settlement is intentionally approved in the current operator process.
3. Use manual grants only for explicit support or approved correction scenarios.
4. After any operator action, verify the downstream learner-facing state before closing the case.
5. Prefer explaining changes through ledger and status outcomes rather than memory or assumptions.

## Flow 1. Inspect Student Wallet State

### When to use

- learner says balance is wrong
- learner says pack/subscription was requested but not reflected
- learner says premium access is still locked
- support needs to confirm latest reward visibility

### Steps

1. Log in as platform admin or institute admin.
2. Open `/admin/economy` or `/institute/economy`.
3. Use the `Student` selector to choose the learner.
4. Review:
   - `Available stars`
   - `Lifetime earned`
   - `Lifetime spent`
   - `Admin grants`
   - `Paid credits`
   - `Subscription credits`
5. Review recent reward events for context.
6. Review the operator queue for pending student order requests.

### Expected interpretation

- `Available stars` is the current usable balance.
- `Paid credits` should grow after confirmed star-pack purchases.
- `Subscription credits` should grow after confirmed subscription billing credits.
- recent reward events explain reward-driven growth such as signup or exam rewards.

## Flow 2. Confirm Pending Star-Pack Request

### When to use

- student created a star-pack request
- operator has approved manual settlement
- support needs to move a pending pack into credited wallet state

### Steps

1. Log in as platform admin or institute admin.
2. Open `/admin/economy` or `/institute/economy`.
3. Select the target student.
4. In `Pending order requests for the selected student`, identify the `Star Pack` row.
5. Confirm that the row is still pending and not already completed.
6. Click `Confirm Order`.

### Expected backend side effects

- payment order status becomes `completed`
- a captured payment transaction is created
- wallet ledger receives a `purchase` credit entry
- student economy profile increases:
  - `available_stars`
  - `paid_credited_stars`

### Expected learner-facing effects

Student `/app/wallet` should show:

- higher `Available Stars`
- recent ledger activity with purchase-related credit
- truthful order state progression rather than still-only-pending language

## Flow 3. Confirm Pending Subscription Request

### When to use

- student created a subscription request
- operator has approved manual settlement
- support needs to activate the subscription and credit recurring value

### Steps

1. Log in as platform admin or institute admin.
2. Open `/admin/economy` or `/institute/economy`.
3. Select the target student.
4. In `Pending order requests for the selected student`, identify the `Subscription` row.
5. Confirm that the request is still pending and not already completed.
6. Click `Confirm Order`.

### Expected backend side effects

- payment order status becomes `completed`
- captured payment transaction is created
- student subscription becomes `active`
- subscription billing event is created
- if plan credit rules apply, wallet ledger receives a `subscription` credit entry
- student economy profile increases:
  - `available_stars`
  - `subscription_credited_stars`

### Expected learner-facing effects

Student `/app/subscriptions` should show:

- active subscription record
- activation state
- current period details
- billing event visibility
- credit linkage state such as `Credited` or linked-to-credit wording

Student `/app/wallet` should show:

- higher `Available Stars` if the plan credits stars on activation
- recent ledger visibility for subscription-driven credits

## Flow 4. Grant Stars Manually

### When to use

- support correction
- approved goodwill adjustment
- migration/manual balancing case
- non-payment operator correction

### Steps

1. Log in as platform admin or institute admin.
2. Open `/admin/economy` or `/institute/economy`.
3. Select the target student.
4. Fill:
   - `Stars to grant`
   - `Reason`
   - `Reference` (ticket or approval id, if available)
5. Click `Grant Stars`.

### Expected backend side effects

- wallet ledger receives an `admin_grant` credit entry
- student economy profile increases:
  - `available_stars`
  - `admin_granted_stars`

### Expected learner-facing effects

Student `/app/wallet` should show:

- higher `Available Stars`
- updated ledger truth on next load

### Guardrails

- do not use manual grants to simulate successful payment unless the support process explicitly allows that
- always enter a meaningful reason
- use a reference whenever a support case or approval artifact exists

## Flow 5. Refresh Unlock States

### When to use

- wallet balance changed but access still looks stale
- content access policy changed
- support needs to force a fresh unlock evaluation

### Steps

1. Log in as platform admin or institute admin.
2. Open `/admin/economy` or `/institute/economy`.
3. Select the target student.
4. Click `Refresh Unlocks`.
5. Review the returned unlock-state output.

### Expected backend side effects

- existing student unlock states are re-evaluated against current policy and wallet conditions

### Expected learner-facing effects

Student premium access surfaces should reflect the recalculated state on next load, such as:

- exam detail
- practice
- wallet-linked premium availability

## What To Verify After Each Action

### After confirming a star-pack order

- admin economy page shows updated wallet values
- student wallet balance increases
- learner-facing order/request state no longer looks only pending

### After confirming a subscription order

- active subscription record becomes visible
- billing event appears
- wallet credit appears when plan rules credit on activation

### After granting stars

- admin economy wallet metrics increase immediately after reload
- student wallet reflects the change

### After refreshing unlocks

- changed access state is visible in operator output or learner-facing premium routes

## Troubleshooting Guide

### No pending order row appears in `/admin/economy` or `/institute/economy`

Check:

- student actually created the request from wallet or subscriptions
- selected student is correct
- order may already be completed
- request may belong to a different student scope than expected

### Student still sees pending language after confirmation

Check:

- refresh the student wallet or subscriptions page
- confirm the payment order is completed
- confirm a payment transaction exists
- confirm a ledger entry or billing event exists where expected

### Subscription confirmed but stars did not increase

Possible reasons:

- the plan cycle has no activation credit rule
- the subscription is active but not configured to credit stars immediately
- the issue is with plan configuration, not with settlement

### Premium content is still locked after credit

Check:

- run `Refresh Unlocks`
- verify the relevant content policy actually allows star-based or entitlement-based access
- verify the learner has enough available stars if the content is star-gated

### Referral questions

Remember:

- referral onboarding is a separate growth/reward lifecycle
- referral credits should be explained through reward and ledger state, not through pack/subscription settlement language

## Current Operational Limits

- payment capture is still operator-settled, not provider-automated
- refund/reversal procedures are not defined here yet
- full economy catalog governance still remains backend-command-led
- mixed-ownership policy rules between platform and institute operators are not fully formalized yet

## Recommended Near-Term Follow-Up

1. Reuse this runbook as the basis for support-team onboarding.
2. Add explicit policy notes for when settlement should stay platform-owned versus institute-owned.
3. Extend this document later with refund, reversal, and provider-callback procedures when those are implemented.
