# Admin Economy Workspace Functionality And Test Cases

## Purpose

This document explains how the platform-admin `/admin/economy` workspace should be operated after the lane-based redesign, and what should be tested for each lane.

The goal is to make the economy workspace:

- easier to understand at first glance
- easier to operate without missing support requests
- easier to validate with Playwright and manual QA

## Workspace Structure

The economy workspace is now split into six lanes:

1. `Overview`
2. `Catalog`
3. `Access Control`
4. `Question Bank Commerce`
5. `Support Ops`
6. `Bootstrap`

---

## 1. Overview

### What this lane is for

This is the command view for platform-admin.

It should answer:

- how many exams currently have economy policies
- how much star-gated and entitlement-gated coverage exists
- whether question-bank usage is happening
- where licensed content is being consumed
- what platform-admin can and cannot control from this workspace

### Functional expectations

- Hero section loads with economy status and platform scope summary
- Metric cards show:
  - exams with economy policy
  - star-gated exams
  - entitlement-linked exams
  - total configured star cost
  - question-bank usage events
  - shared links created
- Policy coverage panel lists exams with:
  - title
  - policy type
  - subject label
  - star cost or entitlement code
  - exam code
- Current boundary panel explains control scope
- Recent package-consumption evidence lists latest usage
- Usage concentration panel summarizes institute/package concentration

### Playwright test cases

1. Loads `/admin/economy?tab=overview` successfully
2. Shows the tab shell and highlights `Overview`
3. Renders hero status label without crashing
4. Shows six metric cards
5. If economy data exists, renders at least one policy row
6. If no usage exists, renders the empty-state copy instead of breaking
7. Switching away and back to overview preserves correct lane selection

---

## 2. Catalog

### What this lane is for

This lane manages commercial catalog structures that students and institutes eventually experience:

- catalog activation state
- star packs
- referral programs
- reward rules
- subscription plans

Note:
Subscription-plan creation and plan-to-package linking are still part of the question-bank commerce workflow as well, because those plans directly grant question-bank access.

### Functional expectations

#### 2.1 Catalog Governance

- Load catalog overview groups
- Show counts for active/inactive items
- Allow pause/activate on catalog rows
- Reflect change in UI after status update

#### 2.2 Star Pack Governance

- Create new star pack
- Edit existing pack
- Toggle active state through edit flow
- Validate institute, code, stars, price, currency, and ordering

#### 2.3 Referral Governance

- Create referral program
- Edit referral program
- Configure:
  - referrer stars
  - referee stars
  - reward side
  - date window
  - metadata

#### 2.4 Reward Governance

- Create reward rule
- Edit reward rule
- Configure:
  - rule type
  - stars awarded
  - thresholds
  - priority
  - validity window

### Playwright test cases

1. Loads `/admin/economy?tab=catalog`
2. Shows highlighted `Catalog` lane
3. Catalog governance card loads overview counts
4. Pausing a catalog item updates its visible state
5. Creating a star pack succeeds and appears in list
6. Editing a star pack persists changed fields
7. Creating a referral program succeeds
8. Editing a referral program persists changes
9. Creating a reward rule succeeds
10. Editing a reward rule persists changes
11. Required-field validation blocks invalid submissions

---

## 3. Access Control

### What this lane is for

This lane governs who can unlock what, and under which rules.

It contains:

- content access policies
- unlock rules
- global economy policy settings

### Functional expectations

#### 3.1 Access Governance

- Create content access policy
- Edit content access policy
- Configure:
  - institute
  - subject
  - content target
  - policy type
  - star cost
  - entitlement code
  - priority

#### 3.2 Unlock Governance

- Create unlock rule
- Edit unlock rule
- Configure:
  - content target
  - rule type
  - required star balance
  - required entitlement
  - completion threshold
  - score threshold
  - admin override allowed

#### 3.3 Economy Policy Settings

- Load singleton policy config
- Update institute-admin support limits
- Show latest audit item
- Show audit history list

### Playwright test cases

1. Loads `/admin/economy?tab=access-control`
2. Shows highlighted `Access Control` lane
3. Creating a content access policy succeeds
4. Editing a content access policy persists values
5. Creating an unlock rule succeeds
6. Editing an unlock rule persists values
7. Saving policy settings updates values
8. Policy settings audit trail shows latest change
9. Validation prevents malformed thresholds or missing required fields

---

## 4. Question Bank Commerce

### What this lane is for

This is the heaviest business lane.

It should allow platform-admin to:

- define packages
- attach package scope
- inspect institute entitlements
- inspect feature entitlements
- inspect usage
- connect package access with subscription plans

### Functional expectations

#### 4.1 Package Management

- Create package
- Edit package
- Configure:
  - ownership
  - access mode
  - public catalog visibility
  - commercial labels
  - recommended-for labels
  - package scope rows
  - package quotas

#### 4.2 Subscription Governance

- Create subscription plan
- Edit subscription plan
- Add cycles
- Add star credit rules
- Link question-bank packages
- Apply plan to institute

#### 4.3 Question-Bank Visibility

- Inspect package list
- Inspect entitlement list
- Inspect feature entitlement list
- Inspect usage entries
- Review package report filters
- Pause or update entitlement states where supported

### Playwright test cases

1. Loads `/admin/economy?tab=question-bank`
2. Shows highlighted `Question Bank Commerce` lane
3. Creating a package succeeds
4. Editing a package persists scope and metadata
5. Creating a subscription plan succeeds
6. Editing a subscription plan persists cycle/package-link changes
7. Applying a subscription plan to an institute succeeds
8. Visibility panel loads package rows
9. Visibility panel loads entitlement rows
10. Visibility panel loads feature entitlement rows
11. Visibility report/filter action succeeds
12. Package usage data renders without UI failure

---

## 5. Support Ops

### What this lane is for

This lane is for high-frequency operator work:

- review institute subscription requests
- inspect student wallet
- inspect reward history
- refresh unlocks
- confirm pending orders
- grant stars within policy limits

This is the lane most likely to be used daily by support/admin operations.

### Functional expectations

#### 5.1 Institute Subscription Request Queue

- Show pending/approved/rejected requests
- Approve request
- Reject request
- Save operator notes
- Show activation summary

#### 5.2 Student Support Workspace

- Select student
- Load wallet state
- Load rewards timeline
- Load pending orders
- Grant stars
- Refresh unlocks
- Confirm order if allowed
- Show policy block if action exceeds config

### Playwright test cases

1. Loads `/admin/economy?tab=support-ops`
2. Shows highlighted `Support Ops` lane
3. Subscription request queue loads rows
4. Approving a request succeeds
5. Rejecting a request succeeds
6. Selecting a student loads wallet data
7. Reward timeline loads for selected student
8. Grant stars action succeeds for valid input
9. Refresh unlocks action succeeds
10. Confirm pending order succeeds when eligible
11. Policy-blocked support action shows readable error/guardrail

---

## 6. Bootstrap

### What this lane is for

This lane keeps seed/bootstrap activity out of the main operator workflow.

It should be used for:

- rollout instructions
- seed grouping visibility
- command path visibility
- environment preparation

### Functional expectations

- Show audience-appropriate copy for platform-admin
- Show seed groups
- Show phase interpretation
- Show recommended command flow

### Playwright test cases

1. Loads `/admin/economy?tab=bootstrap`
2. Shows highlighted `Bootstrap` lane
3. Renders seed groups section
4. Renders phase interpretation section
5. Renders recommended command flow section

---

## Cross-Lane Navigation Cases

### Functional expectations

- Admin can move between all six lanes through tab navigation
- Each lane should be directly linkable by query param
- Reloading the page should preserve selected lane

### Playwright test cases

1. Clicking each lane tab changes URL query param
2. Direct URL visit for each `?tab=` value opens correct lane
3. Unknown tab value falls back to `overview`
4. Refreshing page keeps the selected valid lane

---

## Recommended Automation File Split

Suggested Playwright spec split:

- `tests/e2e/admin/economy-overview.spec.ts`
- `tests/e2e/admin/economy-catalog.spec.ts`
- `tests/e2e/admin/economy-access-control.spec.ts`
- `tests/e2e/admin/economy-question-bank-commerce.spec.ts`
- `tests/e2e/admin/economy-support-ops.spec.ts`
- `tests/e2e/admin/economy-bootstrap.spec.ts`
- `tests/e2e/admin/economy-navigation.spec.ts`

---

## What Is Not Covered Yet

These areas should still be treated as follow-up work:

- visual polish beyond the first lane split
- shared filters across multiple economy cards
- compact summary widgets inside each lane header
- lane-level unsaved-change warnings
- role-based operator analytics inside Support Ops
- export/reporting actions for economy data
- full Playwright implementation for all cases listed above
- deterministic seed data for every commercial workflow path

---

## Recommended Delivery Order

1. Stabilize the lane-based page shell
2. Add direct Playwright navigation coverage for all six lanes
3. Cover `Support Ops` and `Question Bank Commerce` first
4. Cover `Catalog` and `Access Control` next
5. Add final UX polish once operator feedback comes in
