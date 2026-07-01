# Economy and Question-Bank P1 Execution Plan

## Purpose

This document converts the current `P1` backlog into one practical execution order.

It is the bridge between:

- the now-mostly-closed `P0` economy/question-bank hardening work
- the next production-ready productization layer for package commerce, licensed authoring, and support visibility

References:

- [FINAL_ECONOMY_QUESTION_BANK_GAP_BACKLOG.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/FINAL_ECONOMY_QUESTION_BANK_GAP_BACKLOG.md:1)
- [REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md:1)
- [QUESTION_BANK_PACKAGE_AND_ENTITLEMENT_SCHEMA_SPEC.md](/Users/ansh/Documents/Eductech/docs/reference/QUESTION_BANK_PACKAGE_AND_ENTITLEMENT_SCHEMA_SPEC.md:1)
- [FINAL_QUESTION_BANK_SUBSCRIPTION_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/FINAL_QUESTION_BANK_SUBSCRIPTION_IMPLEMENTATION_PLAN.md:1)

---

## Current Position

The platform is now in a good `P0` state for the commercial question-bank lane:

- package catalog and scope management exist
- entitlements can be granted, paused, revoked, and renewed
- institute request to operator approval to entitlement activation exists
- linked shared-library authoring is quota-aware
- publish readiness is quota-aware
- operator reporting/export exists at package summary level

What is still missing is not the core business path.

What is missing is the production-ready experience layer:

- product presentation
- workflow clarity
- support-friendly operational visibility
- finance-facing reconciliation maturity

---

## Recommended Order

Recommended `P1` execution order:

1. `P1-1` marketplace experience
2. `P1-2` private upload plus licensed-library workflow hardening
3. `P1-3` deeper institute package reporting and auditability
4. `P1-4` finance and economy reporting maturity

Why this order:

- `P1-1` should come first because package access must become understandable before scaling sales or onboarding.
- `P1-2` should come second because once packages are visible as products, the authoring workflow must feel safe and unambiguous.
- `P1-3` should come third because support and institute operators need clearer history once real usage starts increasing.
- `P1-4` should come last because it depends on the operational events and workflow signals becoming stable first.

---

## P1-1 Marketplace Experience

### Goal

Make package access understandable as a product, not just a backend entitlement structure.

### Why this matters now

Today the package layer is operational, but still feels internal:

- package names and codes are visible
- scope exists
- plan links exist

But the product still does not explain package value clearly enough for:

- institute buyers
- platform operators onboarding institutes
- support teams explaining what a plan unlocks

### Scope

Build a marketplace-style package presentation layer for platform admin and institute admin.

### Deliverables

- package catalog cards with:
  - package name
  - package type
  - access mode
  - ownership label
  - public/private posture
- package coverage cards with:
  - class/program coverage
  - subject coverage
  - topic coverage
  - scope count
- commercial framing labels such as:
  - included
  - optional add-on
  - trial
  - quota-limited
  - full scope
- plan comparison visibility:
  - which plans carry which package lanes
  - what is default vs optional
- recommended grouping by family:
  - school
  - competitive
  - certification
  - language

### UX Surfaces

- `/admin/economy`
- `/institute/economy`
- optionally a dedicated package catalog route if the current workspace becomes too dense

### Acceptance

- an institute admin can understand what a plan/package gives them without needing operator explanation
- a platform admin can explain package value using product UI rather than raw scope rows

### Suggested Ticket Breakdown

1. package catalog card model and shared presenter
2. plan-to-package comparison table
3. family grouping and recommendation labels
4. institute-facing package catalog section
5. operator QA and copy pass

---

## P1-2 Private Upload Plus Licensed-Library Workflow Hardening

### Goal

Make authoring predictable when private and licensed content mix.

### Why this matters now

The system already supports:

- institute-owned questions
- teacher-owned questions
- linked shared-library questions
- licensed package-gated reuse

But real users will still get confused when they ask:

- can I edit this question?
- is this my copy or a linked licensed item?
- what happens if package access is paused later?
- why is one shared question reusable and another blocked?

### Scope

Strengthen source-state clarity across teacher and institute question-bank workflows.

### Deliverables

- clearer ownership and source labels:
  - local institute question
  - teacher-authored private question
  - linked platform question
  - shared-library access paused
  - licensed but quota-near
- clearer reuse and edit restrictions:
  - editable
  - read-only linked
  - access paused
  - no new linking allowed
- better mixed-source filter controls:
  - local only
  - linked only
  - shared active
  - shared paused
- better guidance and empty/error states in:
  - teacher question-bank workspace
  - institute question-bank workspace
- edge-case hardening for:
  - paused entitlement after linking
  - quota exhausted mid-authoring
  - mixed local + linked exam composition

### Acceptance

- teacher and institute users can predict whether a question is editable, reusable, or blocked
- support questions about question source state reduce materially

### Suggested Ticket Breakdown

1. source-state vocabulary normalization
2. question card and preview ownership clarity
3. mixed-source filter and chip refinement
4. blocked-state and paused-access copy hardening
5. regression automation for mixed-source authoring

---

## P1-3 Deeper Institute Package Reporting and Auditability

### Goal

Reduce support dependence for package-access questions.

### Why this matters now

Current reporting is good for package summary and operator export, but not yet deep enough for repeated support operations like:

- when exactly was package access granted?
- who changed entitlement status?
- what changed between active and paused?
- which package was actually used by this institute over time?

### Scope

Add institute-history and entitlement-history visibility for support and operator use.

### Deliverables

- package access history per institute
- entitlement change history:
  - status changes
  - lifecycle window changes
  - operator notes
  - reviewer identity
- usage summary by package and institute over time
- support-friendly filters for:
  - institute
  - package
  - plan
  - status
  - date range
- export support for history views

### Suggested Backend Shape

Prefer to build from:

- existing audit logs
- existing entitlement metadata
- existing usage ledger

instead of adding a parallel history model unless truly necessary.

### Acceptance

- common support questions can be answered from product surfaces
- operators do not need DB inspection for standard package-history cases

### Suggested Ticket Breakdown

1. institute package history API
2. entitlement change history API
3. history filters and export
4. support-oriented institute detail panel
5. audit copy and reconciliation pass

---

## P1-4 Finance and Economy Reporting Maturity

### Goal

Strengthen reconciliation and operator trust across stars, orders, subscriptions, and rewards.

### Why this matters now

The economy already works functionally, but finance/support maturity still depends too much on code-level understanding.

This becomes riskier when:

- order count rises
- manual settlement volume grows
- referral campaigns expand
- subscription crediting scales

### Scope

Add operator-facing finance and economy reconciliation visibility.

### Deliverables

- clearer wallet ledger reporting
- order settlement reporting
- subscription credit reporting
- referral reward reporting
- cross-checking between:
  - confirmed orders
  - credited stars
  - active subscriptions
  - resulting unlockable value

### Suggested Views

- platform economy reporting dashboard
- student economy drilldown consistency checks
- operator-side reconciliation widgets

### Acceptance

- support/finance teams can reconcile key economy events without code inspection
- mismatches are visible as reportable operational exceptions

### Suggested Ticket Breakdown

1. order-to-wallet reconciliation view
2. subscription credit audit view
3. referral reward campaign reporting
4. economy exception summary
5. export and audit closeout

---

## Cross-Lane Rules

These should apply across all `P1` work:

### Keep package logic config-driven

Do not hardcode:

- family assumptions
- plan value assumptions
- package descriptions as business logic
- special UI branching by package code

### Reuse current truth sources

Prefer building on:

- `QuestionBankPackage`
- `QuestionBankPackageScope`
- `InstituteQuestionEntitlement`
- `InstituteSubscriptionRequest`
- `InstituteQuestionUsageLedger`
- `AuditLog`

### Keep operator and institute views aligned

The same commercial truth should show up in:

- admin economy
- institute economy
- teacher/institute authoring workspaces where relevant

### Favor read-model improvements before new state models

Before adding new database tables, first check whether:

- serializer enrichment
- metadata normalization
- audit projections
- report endpoints

can solve the need with lower risk.

---

## Recommended Immediate Next Step

Start with `P1-1` marketplace experience.

Reason:

- it has the highest product clarity impact
- it improves onboarding and sales conversations
- it makes all later package workflows easier to understand
- it does not require destabilizing the newly-completed `P0` logic

Recommended first implementation slice:

1. package catalog cards in admin economy
2. institute-facing package catalog summary
3. plan-to-package comparison presentation
4. family grouping labels

---

## Success Definition

`P1` is complete when:

- package access feels like a product, not an internal system
- authoring with mixed local/licensed content feels predictable
- support can answer package-history questions from product surfaces
- finance/economy reconciliation becomes operationally trustworthy

Until then, the system is commercially functional, but not yet fully productized.
