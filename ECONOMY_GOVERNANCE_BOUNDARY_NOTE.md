# Economy Governance Boundary Note

## Purpose

This note defines the recommended ownership split between `platform admin` and `institute admin` for Nexora's current economy system.

It is meant to remove ambiguity in operations before we build broader economy governance UI.

References:

- [REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md](/Users/ansh/Documents/Eductech/REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md:1)
- [REFERRAL_WALLET_SUBSCRIPTION_NEXT_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/REFERRAL_WALLET_SUBSCRIPTION_NEXT_IMPLEMENTATION_PLAN.md:1)
- [ECONOMY_OPERATOR_RUNBOOK.md](/Users/ansh/Documents/Eductech/ECONOMY_OPERATOR_RUNBOOK.md:1)
- [NEXORA_ECONOMY_SEED_MATRIX.md](/Users/ansh/Documents/Eductech/NEXORA_ECONOMY_SEED_MATRIX.md:1)

## Current Verified Runtime

As of `2026-06-26`:

- `platform admin` can operate economy support actions from `/admin/economy`
- `institute admin` can operate economy support actions from `/institute/economy`
- both roles are verified for:
  - wallet inspection
  - pending order confirmation
  - manual star grants
  - unlock refresh

This means technical parity exists for support-side runtime actions.

The remaining question is governance policy, not route access.

## Recommended Ownership Model

### Platform-owned lanes

These should remain platform-owned for now:

- economy seed execution
- star-pack catalog definition
- subscription plan definition
- subscription cycle definition
- referral program master setup
- reward-rule master setup
- unlock-rule template governance
- cross-institute economy policy rollout
- high-risk ledger correction policy
- future refund and reversal approval policy

### Institute-allowed lanes

These are reasonable to allow in institute scope today:

- inspect student wallet state for their own institute
- inspect reward and order history for their own institute
- confirm pending student pack requests for their own institute
- confirm pending subscription requests for their own institute
- grant stars for approved local support cases
- refresh unlock states for their own institute learners

### Shared-but-audited lanes

These can be allowed in both roles, but should be governed carefully:

- order confirmation
- manual star grants
- unlock refresh after support intervention

For these lanes, the product should preserve:

- ledger traceability
- operator identity
- timestamps
- reason/reference capture

## Decision Rule

Use this rule when deciding whether a capability belongs to platform admin or institute admin:

### Keep it platform-owned if it can:

- affect multiple institutes at once
- redefine commercial policy
- redefine reward or access rules globally
- create catalog drift between institutes accidentally
- require finance-grade review later

### Allow it to institute admin if it is:

- scoped to students in that institute only
- operational support rather than product-governance design
- reversible through traceable ledger or policy review later
- needed for day-to-day student support turnaround

## Recommended Policy For Current Project Stage

For the current Nexora stage, the simplest safe policy is:

1. Keep all catalog and seed governance platform-owned.
2. Allow institute admins to perform institute-scoped support actions.
3. Keep every support action ledger-backed and attributable.
4. Require clear reason/reference text for manual grants.
5. Avoid building institute-facing CRUD for packs, plans, referral programs, or unlock catalogs yet.

## What This Means In Practice

### Safe today

- an institute admin confirms a student's pending star-pack request after local payment verification
- an institute admin confirms a student's pending subscription request after local settlement verification
- an institute admin grants a small star correction with a support ticket reference
- an institute admin refreshes unlocks after a support correction

### Keep centralized for now

- creating a new `NEET Crash Pack`
- changing a subscription from `299/month` to `399/month`
- launching a festival referral campaign across many institutes
- changing default unlock rules for premium exam families
- importing new master economy defaults through seed commands

## Future Hardening Options

If we need tighter control later, we can add:

- per-action institute permission flags
- approval thresholds for manual grants
- confirmation limits by amount or plan type
- dual approval for reversal/refund actions
- audit dashboards for cross-role economy operations

## Current Configurable Policy Knobs

The current backend already supports these deployment-level controls:

- `ECONOMY_INSTITUTE_ADMIN_CAN_CONFIRM_ORDERS`
- `ECONOMY_INSTITUTE_ADMIN_MAX_CONFIRM_ORDER_AMOUNT`
- `ECONOMY_INSTITUTE_ADMIN_CAN_GRANT_STARS`
- `ECONOMY_INSTITUTE_ADMIN_MAX_GRANT_STARS`

This means institute-admin support access is no longer just role-based.
It is now role-based plus policy-bounded.

## Immediate Product Guidance

Until broader governance UI exists:

- document runtime support actions as available to both admin roles
- document catalog governance as platform-owned
- avoid implying that institute admins own commercial policy design
- keep UI wording honest about command-led governance

## Bottom Line

Nexora is ready for a split model:

- `platform admin` owns economy design and cross-institute governance
- `institute admin` owns institute-scoped support operations

That is the cleanest policy for the current codebase and the least risky path to production use.
