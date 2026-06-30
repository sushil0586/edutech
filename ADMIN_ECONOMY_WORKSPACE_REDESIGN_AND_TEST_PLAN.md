# Admin Economy Workspace Redesign And Test Plan

## Objective

Redesign `/admin/economy` into a beautiful, high-signal, operator-friendly workspace that:

- is easy to understand without product tribal knowledge
- keeps maximum useful information visible without overwhelming the operator
- separates planning/configuration from daily operations
- supports platform-admin workflows end to end
- has explicit Playwright coverage for each functional lane

## Current Problem Summary

The current page mixes too many responsibilities into one long scroll:

- seed/bootstrap planning
- catalog governance
- question-bank package commerce
- subscriptions
- referral programs
- reward rules
- content access policies
- unlock rules
- operator policy settings
- student/institute support operations
- analytics and recent usage

Result:

- operators do not know where to start
- the page feels heavy and hard to scan
- the same context is repeated in multiple forms
- live actions and planning actions are mixed together
- testing coverage is harder to reason about because the UX is not segmented

## Design Goal

The page should feel like an operations console, not a dump of all economy-related components.

The redesign should optimize for:

- fast first action
- clear mental model
- shallow navigation
- strong summaries before deep forms
- visible status and counts
- grouped actions by business responsibility
- reduced repeated input

## Recommended Information Architecture

Use one economy shell with tabs.

### Primary Tabs

1. `Overview`
2. `Catalog`
3. `Access Control`
4. `Question Bank Commerce`
5. `Support Ops`
6. `Bootstrap`

### Why This Split

- `Overview` answers: what is happening now?
- `Catalog` answers: what are we selling/offering?
- `Access Control` answers: who can unlock what and under what rule?
- `Question Bank Commerce` answers: what content packages exist and how are they granted?
- `Support Ops` answers: what operator actions need intervention today?
- `Bootstrap` answers: how does platform seed/setup the economy model?

## Proposed Route Structure

### Option A. Single Route With Tabs

- `/admin/economy`
- tab state in query params, for example:
  - `/admin/economy?tab=overview`
  - `/admin/economy?tab=catalog`
  - `/admin/economy?tab=access`
  - `/admin/economy?tab=question-bank`
  - `/admin/economy?tab=support`
  - `/admin/economy?tab=bootstrap`

### Option B. Section Routes

- `/admin/economy`
- `/admin/economy/catalog`
- `/admin/economy/access`
- `/admin/economy/question-bank`
- `/admin/economy/support`
- `/admin/economy/bootstrap`

### Recommendation

Use `Option A` first for faster rollout with minimal disruption.

Later, if the workspace keeps growing, move to `Option B`.

## Shared Context Bar

Add one sticky filter/action bar at the top for all tabs.

### Shared Filters

- institute
- subject
- program
- active/inactive
- date range where relevant

### Shared Actions

- refresh current tab
- clear filters
- open audit/activity log

### Benefit

The operator chooses context once instead of re-entering institute or subject repeatedly across forms.

## Visual Design Direction

The UI should feel modern and information-dense, but calm.

### Design Principles

- strong section headers
- compact KPI cards
- one primary data table/list per tab
- secondary actions in drawers or modals
- forms collapsed by default until create/edit is chosen
- badges for state:
  - `Active`
  - `Draft`
  - `Paused`
  - `Expired`
  - `Pending Review`
  - `Needs Attention`
- summary before details

### Visual Layout

- top header with:
  - page title
  - health status
  - pending actions count
  - quick links
- below header:
  - sticky context filter bar
- below that:
  - horizontal tabs
- within each tab:
  - summary cards
  - primary workspace table
  - side panel or modal for create/edit/view details

## Tab-by-Tab Functional Plan

## 1. Overview

### Purpose

Give platform admin immediate clarity on economy health.

### Content

- total active star packs
- total active subscription plans
- pending institute subscription requests
- active question-bank packages
- active entitlements
- recent usage events
- recent student support actions
- top warning states

### Core Widgets

- KPI strip
- pending action queue
- recent package usage
- recent support activity
- “where to go next” shortcuts

### Actions

- open pending requests
- open support ops
- open question-bank commerce

## 2. Catalog

### Purpose

Manage the things that are sold, granted, or promoted.

### Included Lanes

- star packs
- referral programs
- reward rules
- subscription plans
- catalog active/inactive governance

### Screen Structure

- top summary:
  - active packs
  - active plans
  - active referral programs
  - active reward rules
- sub-tabs:
  - `Star Packs`
  - `Plans`
  - `Referral`
  - `Rewards`
  - `Catalog Rollout`

### Actions

- create/edit/deactivate star pack
- create/edit/deactivate subscription plan
- attach package links to plan
- create/edit/deactivate referral program
- create/edit/deactivate reward rules
- toggle catalog item status

## 3. Access Control

### Purpose

Control how learners gain access to premium or gated content.

### Included Lanes

- content access policies
- unlock rules
- operator policy settings

### Screen Structure

- summary:
  - free policies
  - star-gated policies
  - entitlement-only policies
  - active unlock rules
- sub-tabs:
  - `Content Policies`
  - `Unlock Rules`
  - `Operator Policy`

### Actions

- create/edit policy
- create/edit unlock rule
- toggle admin override
- configure institute-admin support permissions

## 4. Question Bank Commerce

### Purpose

Manage package-based monetization of question banks.

### Included Lanes

- question-bank package management
- package visibility and entitlement review
- package usage reporting
- plan-to-package linkage review

### Screen Structure

- summary:
  - active packages
  - active entitlements
  - quota-alert packages
  - most-used packages
- sub-tabs:
  - `Packages`
  - `Entitlements`
  - `Usage`
  - `Plan Links`

### Actions

- create/edit package
- define package scope
- inspect entitlement status
- pause/revoke entitlement
- inspect quota usage
- verify linked plan behavior

## 5. Support Ops

### Purpose

Handle day-to-day operator intervention.

### Included Lanes

- institute subscription request queue
- student wallet inspection
- reward history
- order confirmation
- unlock refresh
- controlled star grant

### Screen Structure

- summary:
  - pending requests
  - wallet support actions today
  - pending order confirmations
- sub-tabs:
  - `Institute Requests`
  - `Student Wallet`
  - `Orders`
  - `Manual Actions`

### Actions

- approve/reject institute request
- inspect student wallet
- inspect reward history
- confirm order
- refresh unlocks
- grant stars with reason

## 6. Bootstrap

### Purpose

Keep seed/bootstrap/planning workflows separate from live operations.

### Included Lanes

- seed scenario review
- backend command references
- setup readiness
- environment/bootstrap documentation

### Note

This should not be the first thing shown on the main economy landing.

## Recommended Delivery Phases

## Phase 0. IA And Layout Restructure

- create economy shell
- add tabs
- move bootstrap out of default first view
- move support ops into first-class tab
- keep old card logic intact initially

Acceptance:

- operators can reach the right lane in one click
- page is no longer a single stacked scroll

## Phase 1. Shared Context And Summaries

- add shared filter bar
- add tab-specific summary cards
- reduce repeated institute/subject selection where possible

Acceptance:

- operator does not repeatedly re-enter the same context
- each tab has a clear summary section

## Phase 2. Form And Table Cleanup

- standardize create/edit flows
- move forms into drawers/modals where appropriate
- make tables the main primary surface
- collapse secondary explanatory text

Acceptance:

- primary action per lane is obvious
- forms are visible only when needed

## Phase 3. Deep Workflow Hardening

- add audit affordances
- add status badges and warnings
- add quota/usage alerts
- tighten empty/loading/error states

Acceptance:

- all tabs have clear system feedback
- operational risk states are visible

## Functionality-To-Test Matrix

## Overview

### Functionalities

- page loads with summary cards
- recent activity panels render correctly
- quick navigation actions open intended tabs/routes

### Test Cases

- loads overview with KPIs
- empty-state when datasets unavailable
- quick action buttons navigate correctly

## Catalog

### Star Packs

- list packs
- create pack
- edit pack
- deactivate/reactivate pack
- validate required fields

### Subscription Plans

- list plans
- create plan
- edit plan
- add billing cycle
- add star credit rule
- attach question-bank packages
- apply plan to institute

### Referral Programs

- list programs
- create program
- edit program
- activate/deactivate program

### Reward Rules

- list rules
- create rule
- edit rule
- activate/deactivate rule
- validate rule-type-specific fields

### Catalog Governance

- toggle active/inactive status for supported catalog items

## Access Control

### Content Access Policies

- list policies
- create policy
- edit policy
- filter by institute/subject
- validate policy fields

### Unlock Rules

- list rules
- create rule
- edit rule
- toggle admin override
- validate rule-type-specific inputs

### Operator Policy

- load policy config
- edit grant/confirm limits
- persist changes
- audit entry updates after save

## Question Bank Commerce

### Packages

- list packages
- create package
- edit package
- define package scope
- validate required package fields

### Entitlements

- view entitlement list
- inspect package-linked entitlements
- update entitlement status
- review feature entitlements

### Usage

- load usage list
- filter usage
- inspect package usage details

### Plan Links

- verify plan-package links render correctly
- verify default link state
- verify applied plan creates correct access result

## Support Ops

### Institute Requests

- list pending requests
- approve request
- reject request
- verify request state updates

### Student Wallet

- load student wallet
- load rewards
- load orders
- grant stars
- refresh unlocks
- confirm order

## Bootstrap

### Functionalities

- show seed scenario matrix
- show command references
- separate planning from live operations

### Test Cases

- bootstrap tab loads
- command list visible
- no live mutation action mixed into bootstrap planning lane

## Playwright Coverage Plan

## P0 Test Suites

1. `admin-economy-overview.spec.ts`
- load overview
- verify summary cards
- verify quick nav

2. `admin-economy-catalog-star-packs.spec.ts`
- list
- create
- edit
- deactivate/reactivate

3. `admin-economy-catalog-subscription-plans.spec.ts`
- list
- create
- attach package
- apply to institute

4. `admin-economy-access-policies.spec.ts`
- create/edit content access policy
- create/edit unlock rule
- operator policy save

5. `admin-economy-question-bank-commerce.spec.ts`
- package management
- entitlement visibility
- usage visibility

6. `admin-economy-support-ops.spec.ts`
- approve/reject institute request
- inspect wallet
- grant stars
- refresh unlocks
- confirm order

## P1 Test Suites

1. filtering across tabs
2. empty states
3. error states
4. loading states
5. inactive-status governance
6. audit history behavior

## Non-Functional Checks

- tab switch performance
- large-list usability
- responsiveness on 1280px and laptop view
- keyboard accessibility for tabs and forms
- visual hierarchy under real data

## Open Design Decisions

1. Keep one route with tabs or split into child routes?
2. Should support ops be visible only to highest-scope admin users?
3. Should question-bank commerce remain inside economy or become `/admin/question-bank-commerce` later?
4. Should bootstrap be hidden for non-platform environments?

## Recommended Immediate Next Step

Start with Phase 0 and Phase 1 only:

1. create the tabbed shell
2. move bootstrap out of default view
3. move support ops into dedicated tab
4. add shared filter bar
5. preserve existing business logic underneath

This gives the biggest usability gain with the lowest business-risk change.
