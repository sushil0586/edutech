# P0 Economy and Question-Bank Implementation Tickets

## Purpose

This document converts the final `P0` gaps into concrete engineering tickets.

It is the execution companion to:

- [FINAL_ECONOMY_QUESTION_BANK_GAP_BACKLOG.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/FINAL_ECONOMY_QUESTION_BANK_GAP_BACKLOG.md:1)
- [FINAL_QUESTION_BANK_SUBSCRIPTION_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/FINAL_QUESTION_BANK_SUBSCRIPTION_IMPLEMENTATION_PLAN.md:1)
- [REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md:1)

## Current P0 Goal

Before we call the question-bank subscription layer production-ready, we still need:

1. institute package lifecycle clarity
2. institute-facing package visibility
3. stronger package-management workflow
4. quota and usage enforcement basics
5. a clean purchase/request to entitlement activation path

## Delivery Rules

- keep everything config-first
- do not hardcode exam-family packaging logic
- preserve private institute and teacher content boundaries
- preserve student exam-discovery contract independent from authoring entitlements
- prefer service-layer resolution over frontend branching

---

## Ticket P0-1. Institute Entitlement Lifecycle Model

### Goal

Make institute question-bank entitlement lifecycle operationally explainable.

### Why this is still needed

We already have entitlement rows and status mutation, but the lifecycle is still too thin for production support.

We need:

- start state
- active state
- paused state
- expired state
- reactivated state
- operator notes and timeline

### Backend scope

- extend entitlement lifecycle service helpers
- add explicit lifecycle transition rules
- add transition metadata and audit capture
- add expiry resolution helpers
- add reactivation safety rules

### API scope

- support explicit lifecycle actions, not just generic patching
- expose timeline/history for entitlement state changes
- expose current status reason and operator notes cleanly

### Frontend scope

- admin entitlement card should show:
  - current status
  - start/end dates
  - latest operator note
  - lifecycle timeline
- institute visibility surface should show:
  - active
  - paused
  - expired
  - renewal pending or renewal needed

### Test scope

- backend tests for:
  - active -> paused
  - paused -> active
  - active -> expired
  - invalid transitions
- Playwright tests for:
  - admin lifecycle action visibility
  - institute lifecycle visibility

### Acceptance

- operator can explain why a package is active, paused, or expired
- lifecycle changes are auditable without DB inspection

---

## Ticket P0-2. Institute Licensed-Access Summary Workspace

### Goal

Give institute admins a truthful package-access summary.

### Why this is still needed

The runtime rules are working, but institute admins still need a clean answer to:

- what do we have
- what does it cover
- what is blocked
- what is about to expire

### Backend scope

- add institute-facing summary serializer/service
- aggregate:
  - package name/code
  - status
  - subject/topic/program coverage
  - linked subscription plan
  - starts_at / ends_at
  - entitlement notes

### API scope

- add institute-facing package summary endpoint
- support package filtering by:
  - status
  - package type
  - program/subject/topic

### Frontend scope

- expand `/institute/economy`
- add licensed-content card with:
  - package list
  - scope summary
  - status badge
  - expiry summary
  - plan/package relation

### Test scope

- backend contract tests for package summary response
- Playwright workflow:
  - institute admin can inspect active and paused package states
  - institute admin can see scope summary truthfully

### Acceptance

- institute admin can identify active package coverage without support help

---

## Ticket P0-3. Package Management Workflow Maturity

### Goal

Turn package support into a safe operator workflow.

### Why this is still needed

We have the model and some visibility, but package authoring and maintenance still need a more complete product lane.

### Backend scope

- validate scope overlap and malformed scope combinations
- add package update helpers for safe scope replacement
- add package activation/inactivation guardrails

### API scope

- improve package CRUD with:
  - scope row creation
  - scope row editing
  - package status updates
  - package search/filter support

### Frontend scope

- admin package management card or workspace should support:
  - create package
  - edit package
  - add/remove scope rows
  - activate/deactivate package
  - filter by institute/type/status

### Test scope

- backend tests for:
  - valid and invalid scope combinations
  - package deactivation behavior
- Playwright tests for:
  - package create/edit
  - scope add/remove
  - status toggling

### Acceptance

- platform admin can manage package catalog safely without manual DB support

---

## Ticket P0-4. Usage Ledger and Quota Enforcement Basics

### Goal

Add real commercial limits beyond binary access.

### Why this is still needed

Without usage and quota enforcement, package access is commercially incomplete for many real plans.

### First quota slice

Implement only the smallest useful P0 quotas:

- max linked questions
- max shared-library materializations
- max publish operations using licensed shared content

### Backend scope

- finish usage ledger write path
- define quota evaluation helpers
- enforce limits in:
  - shared question link/materialize path
  - exam publish path where licensed usage should count

### API scope

- expose quota state:
  - total allowance
  - current usage
  - remaining usage
  - over-limit reason

### Frontend scope

- institute and teacher shared-library lanes should show:
  - remaining quota where relevant
  - blocked reason when exhausted
- institute economy/package summary should show current usage

### Test scope

- backend tests for:
  - usage increment
  - over-limit block
  - remaining quota math
- Playwright tests for:
  - quota-exhausted shared-library block
  - visible quota summary

### Acceptance

- package quota can block usage deterministically
- UI explains why a link or publish action is blocked

---

## Ticket P0-5. Purchase/Request to Entitlement Activation Flow

### Goal

Provide one clean business path from commercial request to institute package activation.

### Why this is still needed

We already support:

- subscription plans
- plan-to-package links
- manual application

But the business path is still not polished enough as a complete product flow.

### Minimum P0 target

Support a clear operator-settled flow:

1. institute requests package-bearing plan
2. request becomes visible to operator
3. operator confirms the request
4. entitlement becomes active
5. institute sees the activated package

### Backend scope

- formalize service that materializes package entitlements from confirmed plan activation
- guard against duplicate entitlement creation
- ensure renewal or repeated confirmation behaves safely

### API scope

- expose enough order/plan/entitlement linkage in admin surfaces
- expose institute-facing activated-result state

### Frontend scope

- admin economy should show:
  - plan request
  - linked package outcome
  - entitlement activation result
- institute economy should show:
  - request submitted
  - active package now available

### Test scope

- backend tests for:
  - plan confirmation creates entitlement
  - repeated confirmation does not duplicate entitlement
- Playwright tests for:
  - request -> confirm -> entitlement visible

### Acceptance

- one operator-settled plan flow can activate package access end to end

---

## Recommended Execution Order

### Step 1

`P0-2` institute licensed-access summary workspace

Reason:

- highest immediate user clarity

### Step 2

`P0-1` entitlement lifecycle model

Reason:

- makes support and visibility truthful

### Step 3

`P0-4` usage ledger and quota basics

Reason:

- biggest commercial control gap

### Step 4

`P0-5` purchase/request to entitlement activation flow

Reason:

- completes the business path

### Step 5

`P0-3` package-management workflow maturity

Reason:

- important, but can build in parallel after lifecycle and summary contracts are stable

## Suggested First Engineering Slice

If we want the safest next implementation sprint:

1. institute licensed-access summary endpoint
2. institute economy UI card for package visibility
3. entitlement lifecycle display fields
4. Playwright institute package-visibility contract

That slice creates immediate operator and customer value without introducing quota complexity too early.
