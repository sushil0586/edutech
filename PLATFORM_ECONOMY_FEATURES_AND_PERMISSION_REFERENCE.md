# Platform Economy Features And Permission Reference

## Purpose

This document explains Nexora economy from the `platform admin` point of view.

It answers:

- what exists today in economy
- what each feature controls
- which actions are platform-only
- which actions can be delegated to institute admins
- what is controlled by role
- what is controlled by policy
- what is controlled by subscription/package entitlements
- what is still not granular yet

This is intended to be the practical master reference for product, operations, QA, and future permission hardening.

References:

- [ECONOMY_OPERATOR_RUNBOOK.md](/Users/ansh/Documents/Eductech/ECONOMY_OPERATOR_RUNBOOK.md:1)
- [ECONOMY_GOVERNANCE_BOUNDARY_NOTE.md](/Users/ansh/Documents/Eductech/ECONOMY_GOVERNANCE_BOUNDARY_NOTE.md:1)
- [QUESTION_BANK_PACKAGE_AND_ENTITLEMENT_SCHEMA_SPEC.md](/Users/ansh/Documents/Eductech/QUESTION_BANK_PACKAGE_AND_ENTITLEMENT_SCHEMA_SPEC.md:1)
- [ROLE_ACCESS_MATRIX.md](/Users/ansh/Documents/Eductech/ROLE_ACCESS_MATRIX.md:1)

## Core Idea

Economy in Nexora is not just wallet or payments.

It currently includes five connected layers:

1. `Commercial catalog`
   - star packs
   - subscription plans
   - referral programs
   - reward rules

2. `Runtime access control`
   - content access policies
   - unlock rules
   - operator policy

3. `Question-bank commercialization`
   - question-bank packages
   - package scopes
   - subscription-plan package links
   - institute entitlements
   - feature entitlements
   - usage evidence

4. `Support operations`
   - student wallet inspection
   - pending order confirmation
   - manual star grants
   - unlock refresh
   - institute subscription request approval

5. `Bootstrap and rollout`
   - seed execution
   - default setup
   - demo/commercial rollout preparation

## Permission Model Overview

Nexora economy currently uses four different permission layers together.

### 1. Role permission

This is the first gate.

- `platform admin`
  - highest authority
  - cross-institute visibility
  - platform-owned governance
- `institute admin`
  - institute-scoped support and request operations
- `teacher`
  - no direct economy governance lane
  - affected indirectly through question-bank feature and package access
- `student`
  - wallet, subscriptions, orders, rewards, unlock outcomes

### 2. Operator policy permission

This is where platform can delegate or restrict institute-admin support powers.

Current live policy controls:

- `institute_admin_can_confirm_orders`
- `institute_admin_max_confirm_order_amount`
- `institute_admin_can_grant_stars`
- `institute_admin_max_grant_stars`

This means institute-admin support power is not only role-based.
It is role plus platform policy.

### 3. Commercial entitlement permission

This controls what an institute is allowed to use commercially.

Main objects:

- `SubscriptionPlan`
- `SubscriptionPlanQuestionBankPackage`
- `InstituteQuestionEntitlement`
- `InstituteQuestionFeatureEntitlement`

This is the layer that answers:

- which institute bought or received which package
- whether access is active, paused, revoked, or expired
- which feature bundle is enabled
- what quota remains

### 4. Scope permission

This controls what data a non-platform user can see or operate on.

Examples:

- institute admin can only inspect students in their own institute
- institute-scoped question-bank entitlement APIs are filtered to the institute
- platform admin can see cross-institute data

## High-Level Ownership Model

### Platform-owned today

These are platform-governed features and should be treated as central controls:

- star-pack creation and update
- subscription-plan creation and update
- applying subscription plans directly to institutes
- reviewing institute subscription requests
- referral-program creation and update
- reward-rule creation and update
- content-access-policy creation and update
- unlock-rule creation and update
- economy operator policy configuration
- economy catalog active/paused status governance
- question-bank package creation and update in the commercial workspace
- institute entitlement adjustment in the question-bank lane
- feature entitlement adjustment in the question-bank lane
- bootstrap and seed operations

### Institute-allowed today

These are operationally available to institute admins, subject to policy and scope:

- inspect selected student wallet state
- inspect selected student orders
- inspect selected student rewards
- refresh selected student unlock states
- confirm pending orders for their own students
- grant stars to their own students
- view requestable subscription plans
- submit institute subscription requests
- inspect institute-scoped question-bank entitlements and usage

### Not directly institute-owned today

These are not currently delegated as full governance powers:

- creating or editing star packs
- creating or editing platform subscription plans
- creating or editing referral programs
- creating or editing reward rules
- creating or editing content access policies
- creating or editing unlock rules
- approving institute subscription requests
- changing global operator policy

## Economy Workspace Structure

The platform economy workspace currently has these main lanes:

### 1. Overview

Purpose:

- command view for economy posture
- see what is live before operating

Key outcomes:

- exams with economy policy
- star-gated exam counts
- entitlement-linked exam counts
- configured star cost summary
- question-bank usage concentration

Platform meaning:

- this is not mainly a CRUD lane
- this is the decision-making and diagnosis lane

### 2. Catalog

Purpose:

- define the sellable and incentive-facing economy catalog

Includes:

- star packs
- referral programs
- reward rules
- catalog governance toggle view

### 3. Access Control

Purpose:

- define how premium content is gated and unlocked

Includes:

- content access policies
- unlock rules
- operator policy settings
- policy audit history

### 4. Question Bank Commerce

Purpose:

- control the commercial question-bank model

Includes:

- package management
- package visibility and entitlement operations
- subscription-plan package linking
- institute subscription request review

### 5. Support Ops

Purpose:

- handle day-to-day student and institute economy operations

Includes:

- student wallet support
- order confirmation
- manual grants
- unlock refresh
- institute subscription request queue

### 6. Bootstrap

Purpose:

- rollout and seed support

Includes:

- seed group visibility
- scenario coverage
- environment/bootstrap helper workflows

## Feature Reference

## A. Star Packs

### What it is

A star pack is a one-time purchasable wallet offer.

It defines:

- institute
- pack name and code
- credited stars
- price and currency
- active/paused state
- ordering/sort

### Who controls it

- `platform admin` only

### What permission it creates

It does not directly unlock content.
It increases a student’s wallet purchasing power after order confirmation.

### Downstream effect

- student requests star pack
- operator confirms order
- wallet ledger gets purchase credit
- available stars increase
- star-gated content may become usable

## B. Subscription Plans

### What it is

A subscription plan is the recurring commercial wrapper.

It defines:

- institute
- plan name and code
- description
- active/paused state
- cycles
- optional star credit rules
- linked question-bank packages

### Platform-only controls

- create plan
- update plan
- configure billing cycles
- configure activation/renewal star credits
- attach question-bank packages
- choose grant mode for linked packages
- apply plan directly to an institute

### Important linked commercial meaning

A plan can grant:

- wallet credit behavior
- question-bank package access
- feature access through package/entitlement chains

### Grant mode concept

Current package link grant modes are used to describe commercial behavior such as:

- `included`
- `optional_addon`
- `trial`

This is important because not every linked package must mean “always active by default”.

## C. Institute Subscription Requests

### What it is

Institute-facing commercial request workflow.

Institute admin can:

- view requestable plans
- submit a request for a plan cycle
- include requested grant modes
- include notes

Platform admin can:

- approve request
- reject request
- see activation summary
- see which package entitlements were materialized

### Who controls final activation

- `platform admin` only

### What permission it creates

Approval can materialize institute package entitlements for the requested institute.

## D. Referral Programs

### What it is

Referral campaign definition at institute level.

It defines:

- institute
- campaign/program name
- reward side
  - both
  - referrer only
  - referee only
- referrer stars
- referee stars
- validity window
- active/paused state

### Who controls it

- `platform admin` only

### What permission it creates

It controls who becomes eligible for referral rewards and what the reward amount is.

It does not grant operational admin permissions.

## E. Reward Rules

### What it is

Reward rules turn learning events into wallet credits.

Current rule model supports:

- institute
- optional subject scope
- rule name
- rule type
  - signup
  - exam completion
  - score threshold
  - streak
  - topic mastery
  - admin campaign
- stars awarded
- score threshold
- completion threshold
- streak threshold
- priority
- validity window
- active/paused state

### Who controls it

- `platform admin` only

### What permission it creates

It creates reward eligibility, not operator access.

### Platform importance

This is one of the most sensitive economy behaviors because it affects wallet inflation and reward fairness.

## F. Content Access Policies

### What it is

Content access policy decides whether a content target is free or gated.

Current policy types:

- `free`
- `stars_only`
- `entitlement_only`
- `stars_or_entitlement`

Each policy can define:

- institute
- optional subject scope
- content type
- content key
- content label
- policy type
- star cost
- entitlement code
- priority
- active/paused state

### Who controls it

- `platform admin` only

### What permission it creates

It defines learner access conditions.

Examples:

- a mock exam is free
- a premium test requires stars
- a protected practice lane requires entitlement
- either stars or entitlement can open it

## G. Unlock Rules

### What it is

Unlock rules define what learner state must be true before content becomes available.

Current rule types:

- `stars_balance`
- `entitlement`
- `exam_completion`
- `score_threshold`
- `admin_approval`
- `composite`

Each rule can define:

- institute
- optional subject scope
- content type
- content key
- content label
- rule type
- required star balance
- required entitlement code
- required completion count
- required score percentage
- whether admin override is allowed
- priority
- active/paused state

### Who controls it

- `platform admin` only

### What permission it creates

It determines runtime availability conditions for learners.

### Why it matters

This is the most direct feature-to-access rule engine in economy.

## H. Operator Policy Settings

### What it is

This is the platform control panel for institute-admin support powers.

Current fields:

- institute admin can grant stars
- max stars per grant
- institute admin can confirm orders
- max order amount
- audit history

### Who controls it

- `platform admin` only

### What permission it creates

This is the main “assignable admin permission” surface in today’s economy system.

It allows platform to decide:

- whether institute admins may grant stars at all
- whether institute admins may confirm payment orders at all
- maximum risk amount for each action

### Important reality

Current assignment is global policy for all institute admins.
It is not yet per institute, per user, or per action template.

## I. Student Support Operations

### What it is

These are runtime economy actions on a student account.

Current live actions:

- inspect wallet
- inspect rewards
- inspect payment orders
- confirm order
- grant stars
- refresh unlocks

### Who can do it

- `platform admin`
- `institute admin` within scope, subject to policy

### What permission controls this

Role:

- platform admin has full support power
- institute admin has institute-only support scope

Policy:

- grant stars may be blocked or capped
- order confirmation may be blocked or capped

## J. Question-Bank Packages

### What it is

A question-bank package is the commercial unit for licensed question access.

Core package fields:

- institute owner
- name
- code
- description
- package type
- ownership type
- access mode
- public catalog visibility
- sort order
- scope rows

### Important package dimensions

#### Package type

Current model supports package types such as:

- `subject_library`
- `topic_bundle`
- `exam_family_bundle`
- `custom_bundle`
- `feature_bundle`

#### Ownership type

- `platform`
- `institute`

Meaning:

- platform-owned package = monetizable central catalog content
- institute-owned package = private commercial or operational bundle

#### Access mode

Current supported modes include:

- `full_scope`
- `quota_limited`
- `link_on_demand`
- `materialize_on_entitlement`

Meaning:

- `full_scope`
  - broad unrestricted access to the defined scope
- `quota_limited`
  - scope is available but usage is capped
- `link_on_demand`
  - institute/teacher can link items as needed from the library
- `materialize_on_entitlement`
  - entitlement can materialize usable local rows from the master/content source

### Who controls it

- package catalog creation and update in economy workspace is `platform admin` controlled

### What permission it creates

Packages do not grant access by themselves.
They become effective when tied to entitlements.

## K. Package Scope Rows

### What it is

Package scope rows define what content a package actually covers.

Each scope can include:

- program
- subject
- topic
- question source type
- difficulty level
- question type
- master visibility
- max questions total
- max questions per topic

### Commercial meaning

This is where package permissions become precise.

Examples:

- full Class 7 Science package
- only one subject library
- only one topic bundle
- quota-limited chapter access

## L. Institute Question Entitlements

### What it is

This is the real institute-access source of truth.

An entitlement tells us:

- which institute has access
- to which package
- current status
- how access was granted
- linked subscription plan if any
- start/end dates
- notes
- quota summary
- scope summary

### Common statuses

- active
- paused
- revoked
- expired

### Common grant paths

- direct plan apply
- request approval flow
- operator grant

### Who controls it

- `platform admin` can inspect and update centrally
- institute-scoped views can read in institute authoring flows where allowed

### What permission it creates

This is the institute’s actual license to use package-covered question-bank content.

## M. Feature Entitlements

### What it is

Separate from content-package scope, some feature flags can also be entitled.

Examples:

- shared-library related feature access
- export/import or workflow unlocks
- specialized authoring capabilities

### Who controls it

- currently managed centrally in the platform question-bank commerce lane

### What permission it creates

Feature-level operational rights, separate from raw content access.

## N. Usage Ledger

### What it is

Evidence layer for package consumption.

It tracks actions such as:

- question linked
- question materialized
- exam created
- exam published
- question unlinked
- entitlement override

### Why it matters

This is critical for:

- quota accounting
- support diagnosis
- commercial auditing
- renewal decisions

## O. Catalog Governance

### What it is

This is the control for active/paused status across catalog items.

Current supported item families include:

- reward rules
- referral programs
- star packs
- subscription plans

### Who controls it

- `platform admin` only

### What permission it creates

It does not change role power directly.
It changes whether a commercial/governance object is live.

## What Platform Admin Can Assign Today

This is the practical answer to “what permissions can be assigned?”

## 1. Institute-admin support permissions

Platform can assign these globally through operator policy:

- can confirm orders: yes/no
- max order amount
- can grant stars: yes/no
- max stars per action

## 2. Institute commercial content permissions

Platform can assign these through subscription and entitlement flows:

- which plan an institute can request
- which packages a plan includes
- which grant modes apply
- whether a package is active for an institute
- whether an entitlement is active, paused, revoked, or expired
- feature entitlements tied to package access

## 3. Learner access permissions

Platform can assign these through content access and unlock rules:

- free vs premium content
- stars-gated content
- entitlement-gated content
- mixed access content
- unlock threshold requirements

## 4. Catalog availability permissions

Platform can assign these by active/paused state:

- star pack live or paused
- referral program live or paused
- reward rule live or paused
- subscription plan live or paused

## 5. Question-bank visibility and licensing permissions

Platform can assign these through packages:

- program/subject/topic coverage
- ownership model
- access mode
- quota limits
- public vs hidden catalog visibility

## What Is Not Granular Yet

The system is already configurable, but it is not yet fully granular in these areas:

### 1. No per-institute custom operator policy

Current institute-admin support limits are global policy values, not per institute.

### 2. No per-user sub-role economy ACL

There is no dedicated fine-grained permission matrix like:

- user A can approve subscription requests
- user B can only inspect wallet
- user C can grant stars up to 50

Current control is mainly by:

- role
- institute scope
- global operator policy

### 3. No teacher economy governance lane

Teachers can be affected by package and feature access in question-bank flows, but they do not have first-class economy administration permissions.

### 4. No institute-owned commercial catalog governance UI

Institute admins do not currently get independent CRUD for:

- star packs
- subscription plans
- referral programs
- reward rules
- access policies
- unlock rules

### 5. No finance-grade approval chain

There is not yet:

- dual approval
- reversal approval
- refund workflow
- high-value threshold routing

## Current API-Level Permission Boundary

At backend level, the main patterns are:

- `IsStudent`
  - student wallet, rewards, orders, subscriptions
- `IsPlatformAdmin`
  - platform-owned governance CRUD and approvals
- `IsPlatformOrInstituteAdmin`
  - support operations and institute request flows
- `CanManageQuestionBank`
  - institute-scoped question-bank entitlement views
- `CanBuildExams`
  - institute-scoped feature entitlement visibility used by authoring flows

This is important because the UI should stay honest to the backend boundary.

## Practical Platform Policy Recommendation

For current production use, platform should treat economy as:

### Platform keeps ownership of

- all commercial design
- all cross-institute policy
- all package catalog design
- all entitlement lifecycle governance
- all subscription request approval
- all reward/access rule configuration

### Institute admin gets delegated only for

- institute-scoped support turnaround
- order confirmation within policy limits
- star grants within policy limits
- wallet/reward/order visibility within institute scope
- unlock refresh for institute learners
- subscription request initiation

## Bottom Line

Today, economy is already strong in configurability, but the configurability sits in three different places:

1. `role and scope`
2. `operator policy`
3. `commercial package/entitlement configuration`

So the correct platform understanding is:

- `platform admin` owns economy design
- `platform admin` can delegate selected support actions
- `platform admin` can grant or revoke institute commercial access through plans and entitlements
- `platform admin` can define how content becomes free, paid, or entitled
- `platform admin` can decide whether institute admins are operationally strong or tightly restricted

The biggest current limitation is not missing economy features.
It is that permission delegation is still mostly global and role-driven, not yet per institute, per operator, or per action template.
