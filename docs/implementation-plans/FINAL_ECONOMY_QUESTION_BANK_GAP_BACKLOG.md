# Final Economy and Question-Bank Gap Backlog

## Purpose

This document converts the remaining economy, subscription, and question-bank gaps into one practical execution backlog.

It is the close-out view after:

- economy governance hardening
- shared-library entitlement enforcement
- student visibility contract validation
- unlock-refresh reversible runtime validation

References:

- [REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md:1)
- [FINAL_QUESTION_BANK_SUBSCRIPTION_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/FINAL_QUESTION_BANK_SUBSCRIPTION_IMPLEMENTATION_PLAN.md:1)
- [QUESTION_BANK_PACKAGE_AND_ENTITLEMENT_SCHEMA_SPEC.md](/Users/ansh/Documents/Eductech/docs/reference/QUESTION_BANK_PACKAGE_AND_ENTITLEMENT_SCHEMA_SPEC.md:1)
- [QUESTION_BANK_SUBSCRIPTION_P0_P1_P2_EXECUTION_TICKETS.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/QUESTION_BANK_SUBSCRIPTION_P0_P1_P2_EXECUTION_TICKETS.md:1)
- [ECONOMY_QUESTION_BANK_SUBSCRIPTION_SPEC_MATRIX.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/ECONOMY_QUESTION_BANK_SUBSCRIPTION_SPEC_MATRIX.md:1)

## Current Position

What is already in a good place:

- operator-settled wallet and subscription flow
- admin and institute economy runtime controls
- policy-bounded institute support actions
- question-bank package and entitlement foundations
- admin plan-to-package mapping
- institute licensed-access summary and plan/package visibility
- operator-managed institute entitlement lifecycle windows
- institute and teacher shared-library enforcement
- student exam-discovery contract independent from package entitlements
- reversible unlock-refresh runtime verification

What remains is mostly productization and operational maturity.

Operational note:

- the repo now includes repeatable mutable QA commands for the commercial question-bank lane:
  - `npm run test:e2e:mutable:subscription-request`
  - `npm run test:e2e:mutable:shared-library-enforcement`
  - `npm run test:e2e:mutable:shared-library-workflow`
  - `npm run test:e2e:mutable:commercialization-bundle`

## Priority Model

### `P0`

Must-have before calling the commercial question-bank subscription layer production-ready.

### `P1`

Production-ready workflow maturity for operators and institutes.

### `P2`

Scale-up, automation, and commercial-operating maturity.

---

## P0 Must-Have

### P0-1. Complete institute package lifecycle model

Goal:

- make package access lifecycle operationally safe

Status:

- done for the current operator surface

Implemented:

- operator lifecycle editing for `status`, `starts_at`, `ends_at`, and `notes`
- safer lifecycle validation for invalid date windows
- revoke flow now auto-stamps an end boundary when one is missing
- operator-facing lifecycle window copy in the admin question-bank visibility workspace
- audit visibility for lifecycle field changes

Acceptance:

- an operator can explain exactly why an institute currently has or lost package access

### P0-2. Institute-facing licensed access summary

Goal:

- let institute admins clearly understand what they own

Status:

- done for the current institute economy workspace

Implemented:

- package list by institute
- visible subject/topic coverage summary
- plan/package relationship summary
- active/paused/expired state visibility
- expiry and renewal posture copy

Acceptance:

- institute admin can answer:
  - what packages are active
  - what they cover
  - what is blocked
  - what is expiring

### P0-3. Full package management workflow for platform admin

Goal:

- move from schema/runtime support to usable package operations

Still needed:

- create/edit package workflow maturity
- scope editing without raw/manual operator dependence
- cleaner package filtering and inspection
- package activation/inactivation workflow
- safer validation around overlapping or broken scopes

Acceptance:

- platform admin can manage package catalog safely without DB intervention

### P0-4. Quota and usage rule implementation for real commercial limits

Goal:

- support paid packaging beyond binary access

Status:

- partially done

Implemented:

- question-link quota configuration at package-scope level
- quota exhaustion enforcement for shared-library linking
- truthful blocked-state messaging for institute and teacher authoring
- package usage ledger evidence for:
  - `question_linked`
  - `exam_created`
  - `exam_published`
  - `entitlement_override`
- operator and institute-visible usage counters by package/action mix
- machine-readable quota watch state and remaining-capacity visibility for admin, institute, and teacher package views
- near-limit warning posture derived from existing quota limits, with optional package/scope metadata override support
- publish-specific commercial policy support for shared-library packages via configurable `max_exam_publish_count` limits and readiness warnings/blockers
- platform-admin package report/export endpoint with package-level entitlement posture, usage action rollups, scope coverage, and CSV download support

Still needed:

- optional larger-scale reporting refinements such as scheduled exports, institute self-serve exports, or heavier historical analytics if operations outgrow the current operator report

Acceptance:

- quotas can be configured and enforced without ambiguous behavior

### P0-5. End-to-end package purchase/request to entitlement activation workflow

Goal:

- connect commercial intent to package activation in a more complete way

Still needed:

- optional payment-order coupling if institute package activation must always be tied to a commerce transaction rather than operator approval alone
- richer request history or queue analytics if review volume grows materially

Acceptance:

- one clean business path exists from subscription request to institute package activation

---

## P1 Production-Ready

### P1-1. Question-bank marketplace experience

Goal:

- make package access understandable as a product, not just a backend capability

Still needed:

- package catalog presentation
- package description and coverage cards
- class/subject/topic summary
- commercial labels and plan comparison
- recommended package grouping by family

Acceptance:

- operators and institutes can understand what is being sold or granted

### P1-2. Private upload plus licensed-library workflow hardening

Goal:

- make authoring predictable when private and licensed content mix

Still needed:

- clearer source-state presentation
- clearer reuse/edit restrictions for linked content
- better edge-case handling for private + shared + linked question flows
- stronger guidance in teacher and institute question-bank workspaces

Acceptance:

- institute and teacher users can reliably author exams without source confusion

### P1-3. Deeper institute package reporting and auditability

Goal:

- reduce support dependence

Still needed:

- package access history per institute
- entitlement change history
- usage summary by package
- support-friendly filters and exports

Acceptance:

- common support questions can be answered from product surfaces

### P1-4. Finance and economy reporting maturity

Goal:

- strengthen reconciliation and operator trust

Still needed:

- clearer ledger reporting
- order settlement reporting
- subscription credit reporting
- referral reward reporting
- cross-checking between confirmed orders and wallet movement

Acceptance:

- finance/support teams can reconcile key economy events without code inspection

---

## P2 Scale-Up

### P2-1. Payment-provider automation

Goal:

- reduce manual settlement dependence

Still needed:

- provider webhook lifecycle
- payment verification pipeline
- automated order completion
- refund/chargeback state model

Acceptance:

- operator settlement is optional, not the only live path

### P2-2. Large-scale content ingestion and curation tooling

Goal:

- support the planned high-volume question-bank model

Still needed:

- bulk import tooling
- dedupe support
- taxonomy cleanup workflow
- package assignment workflow
- content quality and release review tooling

Acceptance:

- platform can onboard large content banks repeatedly without ad hoc manual work

### P2-3. Commercial analytics for package business

Goal:

- understand package value and adoption

Still needed:

- package adoption metrics
- usage vs entitlement metrics
- institute conversion tracking
- renewal and churn signals

Acceptance:

- product and ops can evaluate package performance from data

---

## Recommended Execution Order

### Step 1

Finish the institute/package lifecycle and institute-facing licensed-access summary.

Reason:

- this closes the biggest production-readiness gap with the least conceptual risk

### Step 2

Complete package management workflow and quota/usage enforcement.

Reason:

- this turns current package support into a commercially defensible model

### Step 3

Build the end-to-end purchase/request to entitlement activation workflow.

Reason:

- this connects economy and question-bank product layers properly

### Step 4

Harden mixed private/shared authoring and reporting surfaces.

Reason:

- this reduces operator confusion and support burden

### Step 5

Move into automation and scale-up lanes.

Reason:

- these are valuable, but they should come after the package business flow is fully stable

## Practical Next Sprint Recommendation

If we want the single best next implementation slice, it should be:

1. institute package visibility workspace
2. entitlement lifecycle states and timeline
3. quota/usage ledger enforcement basics

That combination gives the biggest production-readiness gain without jumping straight into payment-provider automation.

## Bottom Line

The remaining work is no longer “can the foundations work?”

The remaining work is:

- can operators sell, activate, explain, limit, and support package access cleanly
- can institutes understand and use what they bought
- can the system scale beyond a demo-quality commercial workflow
