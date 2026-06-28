# Question Bank Subscription P0 P1 P2 Execution Tickets

## Purpose

This document breaks the final question-bank subscription plan into practical execution lanes:

- `P0` = must-have foundation
- `P1` = usable product workflow
- `P2` = hardening, scale, and operator maturity

References:

- [FINAL_QUESTION_BANK_SUBSCRIPTION_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/FINAL_QUESTION_BANK_SUBSCRIPTION_IMPLEMENTATION_PLAN.md:1)
- [QUESTION_BANK_SUBSCRIPTION_AND_EXAM_VISIBILITY_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/QUESTION_BANK_SUBSCRIPTION_AND_EXAM_VISIBILITY_IMPLEMENTATION_PLAN.md:1)

## Size Summary

Overall size:

- `Moderate`

This is not a rewrite.
This is mostly:

- adding package/entitlement models
- connecting them to existing subscription and master-question systems
- tightening exam visibility and access controls

## P0 Goals

P0 should make the system commercially and technically valid.

At the end of P0:

- platform question banks can be packaged
- institute subscriptions can grant question access
- institute and teacher can still upload private questions
- exam builder can enforce licensed platform usage
- exam visibility rules are explicit enough for safe release

## P0 Tickets

### P0-1. Freeze canonical content policy

Goal:

- finalize ownership and visibility rules

Scope:

- platform questions are canonical and shareable
- institute questions are private by default
- teacher questions are private by default
- private content is not cross-institute by default

Acceptance:

- product rules written and approved

### P0-2. Add package models

Goal:

- represent sellable/licensable question-bank packages

Suggested models:

- `QuestionBankPackage`
- `QuestionBankPackageScope`

Fields should support:

- package code
- label
- description
- package type
- active flag
- package metadata
- program/class scope
- subject scope
- topic scope
- family scope

Acceptance:

- platform admin can define a package in DB/admin

### P0-3. Add entitlement models

Goal:

- represent which institute currently has access to which package

Suggested models:

- `InstituteQuestionEntitlement`
- `FeatureEntitlement`

Acceptance:

- active entitlements can be created, updated, expired, and audited

### P0-4. Connect subscriptions to entitlements

Goal:

- make active subscription generate usable content access

Scope:

- subscription plan maps to one or more packages
- active institute subscription activates package entitlements
- expired/cancelled subscription deactivates them

Acceptance:

- institute package access changes when subscription changes

### P0-5. Add entitlement resolution service

Goal:

- centralize content access decision logic

Service should answer:

- can this institute use this master question?
- can this institute use this package?
- what scopes are active for this institute?

Acceptance:

- one backend service becomes the source of truth for content access checks

### P0-6. Enforce content access in exam creation

Goal:

- stop unlicensed platform content use

Scope:

- builder filtering
- server-side save validation
- server-side publish validation

Important rule:

- institute and teacher private questions remain usable inside their own institute even without platform entitlement

Acceptance:

- unlicensed platform question use is blocked
- institute/teacher private content still works

### P0-7. Add explicit exam audience policy

Goal:

- separate source ownership from student visibility

Suggested values:

- `platform_all_eligible`
- `platform_selected_institutes`
- `institute_only`
- `teacher_same_institute`

Acceptance:

- audience policy is stored and respected in student-visible exam filtering

### P0-8. Add backend tests for new rules

Goal:

- protect the business boundary

Test areas:

- entitlement grant/revoke
- package scope resolution
- institute private question isolation
- teacher private question isolation
- platform exam audience visibility
- institute exam visibility

Acceptance:

- strong regression coverage around the new access rules

## P1 Goals

P1 should make the workflow usable by operators and institutes without manual DB support.

At the end of P1:

- platform admin can manage packages and entitlements
- institute admins can understand what they have access to
- question-library usage is visible in the builder and support tools

## P1 Tickets

### P1-1. Admin UI for question-bank packages

Goal:

- allow platform admin to create and manage packages cleanly

Scope:

- package list
- package detail
- scope mappings
- active/inactive status

### P1-2. Admin UI for entitlement mapping

Goal:

- allow platform admin/operator to grant/revoke institute access

Scope:

- institute entitlement list
- filter by institute/package/status
- activate/suspend/end access
- notes and audit metadata

### P1-3. Subscription-to-package configuration UI

Goal:

- make package access configurable through plan setup

Scope:

- attach packages to subscription plans
- attach feature flags to subscription plans
- control defaults and overrides

### P1-4. Institute visibility UI

Goal:

- let institute admins understand their licensed content

Scope:

- visible packages
- allowed subjects/topics
- plan name
- access expiry / renewal state

### P1-5. Builder UX for content source clarity

Goal:

- make source and entitlement visible during exam creation

Scope:

- show whether a question is:
  - platform
  - institute
  - teacher
- show whether it is:
  - licensed
  - private
  - locked

### P1-6. Support actions for linking/private promotion workflows

Goal:

- keep legacy sharing flows usable where needed

Scope:

- request access
- approve access
- link questions
- revoke link

Important note:

- this is secondary to subscription entitlement, but still useful for exceptions

### P1-7. Exam audience controls in authoring UI

Goal:

- make visibility explicit for exam creators

Scope:

- platform admin can choose global or selected-institute audience
- institute admin sees institute-only audience by default
- teacher sees teacher/institute-safe audience options only

## P2 Goals

P2 should make the system mature, scalable, and audit-friendly.

At the end of P2:

- usage can be measured
- premium limits can be enforced
- support and analytics are production-strong

## P2 Tickets

### P2-1. Usage ledger and quota accounting

Goal:

- track how licensed content is consumed

Suggested model:

- `InstituteQuestionUsageLedger`

Track:

- linked questions
- materialized questions
- exam publishes
- maybe attempts or active exams if product needs it

### P2-2. Quota-aware plan behavior

Goal:

- support premium commercial rules later

Examples:

- max linked questions per cycle
- max active exams from premium bank
- max teacher seats
- max student seats

### P2-3. Canonical library quality audit tools

Goal:

- protect content quality as library grows

Scope:

- duplicate audit
- top-repeat concentration audit
- topic coverage audit
- metadata quality audit

### P2-4. Promotion workflow for private content

Goal:

- optionally let platform review private institute/teacher content and promote selected items into canonical library

Important rule:

- promotion must be explicit and reviewed
- nothing private becomes public automatically

### P2-5. Reporting and analytics

Goal:

- make content monetization measurable

Metrics:

- package usage by institute
- exam creation by source type
- question usage by package/topic
- revenue-to-content usage mapping

### P2-6. Access audit and support timeline

Goal:

- improve operational support

Support should be able to answer:

- which institute had access
- when it started
- what package granted it
- what exams were created from it

## Recommended Build Sequence

Use this sequence:

1. `P0-1` policy freeze
2. `P0-2` package models
3. `P0-3` entitlement models
4. `P0-4` subscription integration
5. `P0-5` entitlement resolution service
6. `P0-6` exam creation enforcement
7. `P0-7` explicit exam audience policy
8. `P0-8` backend tests
9. `P1` admin/operator and builder UX
10. `P2` analytics, quotas, and promotion workflow

## Effort Estimate

### P0

- `medium`

Rough shape:

- 1 to 2 weeks backend core
- around 1 additional week for enforcement and tests

### P1

- `medium to medium-high`

Rough shape:

- 1 to 2 weeks depending on UI polish expectations

### P2

- `incremental hardening`

Rough shape:

- can be delivered in slices after core launch

## Release Recommendation

### Release 1

Ship:

- P0 only

This gives:

- canonical platform question library
- subscription-based institute access
- safe exam creation boundaries
- explicit enough exam visibility rules

### Release 2

Ship:

- P1

This gives:

- admin usability
- institute clarity
- cleaner operator workflow

### Release 3

Ship:

- P2

This gives:

- monetization analytics
- quota control
- content promotion governance

## Final Practical Assessment

This should be treated as:

- `a controlled product integration program`

not:

- `a large unknown architecture rewrite`

Most of the deep foundation already exists.
The key work now is to formalize packages, entitlements, enforcement, and visibility.
