# Final Pending Execution Plan

## Purpose

This document is the current source of truth for the remaining commercial question-bank, shared-library, subscription, referral, and wallet work.

It replaces fragmented status reading across older planning files.

Use this document first when deciding:

- what is already stable
- what is still pending
- what is contract-only
- what should be executed next

References:

- [REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md](/Users/ansh/Documents/Eductech/REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md:1)
- [QUESTION_BANK_PACKAGE_AND_ENTITLEMENT_SCHEMA_SPEC.md](/Users/ansh/Documents/Eductech/QUESTION_BANK_PACKAGE_AND_ENTITLEMENT_SCHEMA_SPEC.md:1)
- [QUESTION_BANK_SUBSCRIPTION_AND_EXAM_VISIBILITY_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/QUESTION_BANK_SUBSCRIPTION_AND_EXAM_VISIBILITY_IMPLEMENTATION_PLAN.md:1)
- [QUESTION_BANK_SUBSCRIPTION_P0_P1_P2_EXECUTION_TICKETS.md](/Users/ansh/Documents/Eductech/QUESTION_BANK_SUBSCRIPTION_P0_P1_P2_EXECUTION_TICKETS.md:1)

## Current Position As Of 2026-06-28

### Implemented and stable enough

- wallet / referral / subscription backend foundation
- operator-settled economy flow
- admin subscription-plan to package mapping
- institute and teacher shared-library enforcement
- canonical shared-library demo seed/reset workflow
- scope-aware package matching for seeded shared-library lanes
- quota reset cleanup for seeded shared-library usage
- shared-library Playwright workflow coverage for:
  - no entitlement
  - quota exhausted
  - institute link flow
  - teacher request flow
  - institute builder reuse protection
  - institute builder update protection
  - teacher builder reuse protection
  - teacher builder update protection
  - institute publish-readiness warnings and blockers
  - institute activation bridge
  - teacher activation bridge

### Implemented but contract-limited

- teacher publish-readiness mutable specs no longer fail
- the 2 teacher publish-readiness cases currently resolve as intentional skips because the current teacher contract treats the seeded paused-only lane as not attachable in the builder, rather than attachable-but-publish-blocked

### Not yet operationally closed

- admin/operator usability for subscription and entitlement management still needs broader UI-level hardening
- commercial question-bank workflow coverage is still narrow compared with the full business model
- documentation is still spread across multiple older plan files
- deployment/runtime hardening is only partially documented, not yet fully productized

## Shared-Library Contract Freeze

These are the current expected role behaviors and should be treated as the active contract unless we explicitly change product direction.

### Institute admin

- can directly link entitled shared-library questions into the local bank
- linked licensed copies are readable but not editable as originals
- reuse in builder is allowed only while entitlement and package rules remain active
- paused entitlement or exhausted allowance can surface publish warnings or blockers

### Teacher

- is request-only for shared-library acquisition
- does not directly link platform shared-library questions from the shared shelf the way institute admin does
- may work with linked licensed copies already available within the institute context
- for the seeded paused-only lane, the current behavior is "question becomes unavailable for fresh attach" rather than "fresh attach succeeds and publish later blocks"

### Linked licensed copies

- remain visible locally
- should be treated as read-only licensed material
- should require duplicate-before-edit behavior where editing is needed

### Package and entitlement driven behavior

- no matching package: blocked / subscription required
- matching package with active coverage: available for the permitted role flow
- quota exhausted: visible but blocked with truthful quota messaging
- paused entitlement: linked rows may still be visible, but new reusable access should be treated as inactive
- publish warnings/blockers should come from package metadata, entitlement state, and usage ledger state rather than UI-only logic

## Verification Baseline

The current shared-library workflow baseline has been verified with:

```bash
cd edutech_web
npm run test:e2e:mutable:shared-library-workflow
```

Latest outcome:

- full command exits successfully
- all executable shared-library workflow segments pass
- only the 2 teacher publish-readiness cases remain intentional skips because of the current contract

## Final Gap Read

What is still truly pending from a product and stability perspective:

### P0

- freeze the teacher paused-only publish-readiness contract explicitly in specs/docs
- consolidate execution truth so engineers do not start from stale markdown files
- document canonical shared-library seed lanes, package codes, and expected states in one place
- define a simple support-grade deployment and health-check checklist for staging/production
- improve support visibility around package resolution, entitlement resolution, quota evaluation, and publish-block reasons

### P1

- admin/operator workflow hardening for:
  - applying plans to institutes
  - revoking or pausing entitlements
  - inspecting current institute package access
  - understanding package usage and publish allowance state without DB inspection
- question-bank commercial workflow verification for:
  - program scope
  - subject scope
  - topic scope
  - quota scope
  - publish allowance scope
  - platform-owned monetized content
  - institute-owned private uploads
  - teacher-owned private uploads
- broader automation for:
  - admin package management
  - admin entitlement visibility
  - subscription apply/revoke flows
  - institute commercial visibility after activation

### P2

- economy UI polish
- institute-facing subscription request UX refinement
- reporting and dashboards
- richer content onboarding workflow for real paid banks

## Recommended Execution Order

Follow this order so we avoid over-engineering:

1. Documentation/source-of-truth cleanup
2. Teacher publish-readiness contract freeze
3. Deployment/runtime checklist hardening
4. Admin subscription and entitlement workflow coverage
5. Question-bank commercial scope verification
6. Broader admin/business automation
7. UX polish and reporting

## What Not To Prioritize Yet

Do not spend time yet on:

- deeper abstraction in Playwright helpers
- advanced reporting dashboards
- broad UI polish in economy screens
- adding many more edge-case workflow tests before admin/business workflows are covered

## Practical Definition Of Done For This Lane

We can call this lane stable when:

- shared-library workflow baseline stays green on repeated seeded runs
- teacher paused-only behavior is explicit and no longer ambiguous
- admin/operator can inspect and manage plans, packages, and entitlements without DB help
- package scope and monetization rules are validated end to end against the intended business model
- the team uses this file, not older overlapping plans, as the current execution entry point
