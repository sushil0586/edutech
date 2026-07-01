# Question Bank Subscription and Exam Visibility Implementation Plan

## Purpose

This document defines how Nexora should operate when:

- the platform owns canonical question banks
- institutes subscribe to question access
- institutes and teachers create exams from licensed questions
- platform-created exams are visible more broadly than institute-created exams

This is written from the current repo perspective, with emphasis on:

- what is already implemented
- what is partially implemented
- what is still missing

## Product Intent

Target operating model:

1. question banks are independent and canonical
2. platform can load high-quality question libraries by class, subject, topic, and difficulty
3. institutes buy access to those libraries through subscription or package rules
4. institute users can create exams only from questions they are allowed to use
5. exam visibility depends on exam ownership:
   - platform exam -> broader eligible audience
   - institute exam -> only that institute audience
   - teacher exam -> same institute audience unless promoted by institute/platform policy

## Current Code Reality

## 1. What Is Already Implemented

### 1.1 Canonical master question layer exists

The backend already has a canonical shared question model:

- [MasterQuestion](/Users/ansh/Documents/Eductech/edutech_backend/apps/question_bank/models.py:61)
- [MasterQuestionOption](/Users/ansh/Documents/Eductech/edutech_backend/apps/question_bank/models.py:158)
- [MasterQuestionAttachment](/Users/ansh/Documents/Eductech/edutech_backend/apps/question_bank/models.py:190)

This is already the right base for:

- platform-owned question libraries
- institute-owned authored questions
- teacher-authored question sources

### 1.2 Ownership/source typing already exists

Current master question source types:

- `platform`
- `institute`
- `teacher`

This is already represented in:

- `MasterQuestion.source_type`

### 1.3 Visibility primitives already exist

Current master question visibility values:

- `private`
- `shared_by_request`
- `public`

This is already represented in:

- `MasterQuestion.visibility`

### 1.4 Sync from operational question to master exists

The service already supports promoting an institute question into the canonical master layer:

- [sync_master_question_from_institute_question](/Users/ansh/Documents/Eductech/edutech_backend/apps/question_bank/services.py:305)

This means:

- authored institute questions can become master questions
- platform/public-hub questions can already behave like canonical shared content

### 1.5 Institute access-link model already exists

There is already an institute-to-master-question access model:

- [InstituteQuestionAccess](/Users/ansh/Documents/Eductech/edutech_backend/apps/question_bank/models.py:521)

This already stores:

- target institute
- target local subject/topic scope
- request status
- approval actor
- linked operational question

### 1.6 Request/approve/link flow already exists

Services already exist for:

- requesting access
- approving/linking access
- materializing operational institute copies

Key functions:

- [request_master_question_access](/Users/ansh/Documents/Eductech/edutech_backend/apps/question_bank/services.py:352)
- [link_master_question_to_institute](/Users/ansh/Documents/Eductech/edutech_backend/apps/question_bank/services.py:374)
- `materialize_master_question_for_source_institute`

Command support also exists:

- [link_master_questions_to_institute.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/question_bank/management/commands/link_master_questions_to_institute.py:1)
- [seed_master_question_library.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/question_bank/management/commands/seed_master_question_library.py:1)

### 1.7 Test coverage already exists for question sharing

There is already real test coverage for the master-sharing flow:

- [test_master_sharing.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/question_bank/tests/test_master_sharing.py:1)

This is very important because it means the core sharing model is not theoretical.

### 1.8 Exam source ownership already exists

Exams already support source ownership:

- `platform`
- `institute`
- `teacher`

This already exists in:

- [Exam.source_type](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/models.py:180)
- [resolve_exam_source_metadata](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/services.py:362)

### 1.9 Institute exam scope already exists

Exam scope validation is already institute-aware through:

- academic year
- program
- cohort
- subject
- selected students

This means institute-only visibility is already structurally natural in the current system.

### 1.10 Role-based exam creation already substantially exists

The codebase already supports:

- platform-level exam source
- institute-level exam source
- teacher-level exam source

So the three-role exam creation direction is already aligned with the model.

## 2. What Is Partially Implemented

These areas exist, but not yet as a polished product workflow.

### 2.1 Platform master library is present technically, not yet productized fully

The system can represent platform questions now, especially through:

- public content hub
- `MasterQuestion.source_type = platform`

But what is still missing is a true product-facing canonical library workflow such as:

- bulk loading by catalog package
- subject/topic licensing bundles
- quality audit dashboards
- admin catalog browsing and release flow

### 2.2 Institute access exists, but as request/link mechanics rather than subscription entitlement

Current access flow is basically:

- request
- approve
- link operational copy

But the target product needs:

- automatic access based on active subscription/package
- quota-aware or family-aware entitlements
- institute-level package resolution without manual approval for every question

### 2.3 Subscription system exists, but not yet tied to question-bank entitlement

The economy/subscription foundation is already strong, as documented in:

- [REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md:1)

But current subscriptions are not yet the authoritative controller for:

- which question banks an institute may access
- how many questions can be linked
- which families/topics are included

### 2.4 Exam source exists, but audience visibility policy is still implicit

Today, source typing exists.
What is still missing is a fully explicit exam audience contract like:

- `platform_global`
- `platform_selected_institutes`
- `institute_private`
- `teacher_private`

Right now the behavior is mostly driven by institute scoping, assignments, and source metadata rather than one canonical audience policy object.

## 3. Main Gaps

These are the real implementation gaps.

### Gap 1. No first-class subscription-to-question-bank entitlement model

Current problem:

- subscriptions exist
- question sharing exists
- but there is no canonical bridge saying:
  - this subscription plan gives access to these subjects/topics/question families

Needed:

- package-level entitlement model
- policy resolution service
- expiration-aware access behavior

### Gap 2. Access is question-row oriented, not package/topic oriented

Current `InstituteQuestionAccess` is useful, but too granular to serve as the primary subscription catalog model by itself.

For a platform library with `500` questions per topic, we also need access at levels like:

- program
- subject
- topic
- exam family
- package

Recommended addition:

- a higher-level entitlement model above per-question access

### Gap 3. No “licensed question selection” gate in exam creation flow

Current exam creation can use institute questions in scope.
What is still missing is a firm guardrail like:

- if a question comes from platform master library, confirm institute has active entitlement before use

Needed:

- exam builder source filtering
- backend validation at save/publish time

### Gap 4. No explicit audience policy field on exams

Current source ownership is helpful but not enough as the final audience rule.

Needed:

- explicit exam audience policy, for example:
  - `platform_all_eligible`
  - `platform_selected_institutes`
  - `institute_only`
  - `teacher_same_institute`

This avoids ambiguity later.

### Gap 5. No platform catalog packaging layer

We need a product object that defines things like:

- `Class 7 Math Full Bank`
- `NEET Biology Topic Pack`
- `JEE Algebra Premium`
- `AWS Certification Practice Set Bundle`

This package object should map to:

- question entitlement scope
- subscription plans
- wallet unlock rules if needed

### Gap 6. No usage accounting for licensed question consumption

If subscription plans later include:

- monthly question usage caps
- exam creation caps
- premium-topic limits

then we need usage tracking for:

- linked questions
- exam creation from licensed questions
- maybe attempt-based or active-exam-based usage

### Gap 7. No complete UI/admin workflow for catalog to entitlement to exam usage

Pieces exist individually, but the operator flow is not yet a single polished lane:

1. create master bank
2. package it
3. attach package to subscription
4. institute purchases subscription
5. entitlement activates
6. institute sees allowed questions in builder
7. exam publish obeys audience rules

## 4. Recommended Product Architecture

## Layer A. Canonical question layer

Use `MasterQuestion` as the source of truth for:

- platform-owned question banks
- shared institute banks
- teacher-contributed canonical content if approved

Rule:

- canonical content should live here first

## Layer B. Entitlement layer

Add a new package/entitlement layer for question-bank access.

Recommended new concepts:

- `QuestionBankPackage`
- `QuestionBankPackageScope`
- `InstituteQuestionEntitlement`
- `InstituteQuestionUsageLedger`

Package examples:

- `cls7_math_foundation_full`
- `neet_physics_mechanics_pack`
- `jee_algebra_advanced_bundle`

## Layer C. Operational institute layer

Use `Question` for:

- institute-local working copies
- teacher edits where allowed
- local tagging
- exam assembly

Question linking should happen:

- on approval
- on entitlement grant
- or lazily when first used in an exam

## Layer D. Exam ownership and audience layer

Extend exam behavior with a clearer audience policy.

Suggested values:

- `platform_all_eligible`
- `platform_selected_institutes`
- `institute_only`
- `teacher_same_institute`

Source ownership and audience should be separate.

Example:

- source = `platform`
- audience = `institute_only`

That would mean the platform authored the exam, but it is only released for a selected institute.

## 5. Recommended Implementation Phases

## Phase 1. Normalize the canonical model

Goal:

- use existing master-question layer properly

Tasks:

- define platform canonical library rules
- confirm all core subject/topic banks should be loaded as `MasterQuestion`
- define metadata conventions for:
  - class
  - subject
  - topic
  - exam family
  - package tags

Expected effort:

- low to moderate

## Phase 2. Add package and entitlement models

Goal:

- tie subscriptions to usable question scope

Tasks:

- create package models
- map package to topic/family scope
- create institute entitlement model
- activate/deactivate entitlements based on subscription state

Expected effort:

- moderate

## Phase 3. Enforce entitlement in question linking and exam creation

Goal:

- prevent unauthorized use of platform content

Tasks:

- add backend checks before linking master questions
- add backend checks before exam save/publish
- add builder filtering so institutes only see allowed content

Expected effort:

- moderate

## Phase 4. Add explicit exam audience policy

Goal:

- make exam visibility predictable and configurable

Tasks:

- add audience field or equivalent metadata contract
- update student-visible exam filtering
- update platform/institute/teacher authoring rules
- add tests for audience combinations

Expected effort:

- moderate

## Phase 5. Admin and operator workflow

Goal:

- turn technical features into an operable product

Tasks:

- package management UI
- entitlement management UI
- institute subscription-to-access visibility
- audit and support tools

Expected effort:

- moderate to high

## 6. Proposed Gap Summary

### Already in place

- master question model
- source ownership model
- visibility primitives
- request/approve/link flow
- institute operational copy model
- exam source typing
- institute exam scoping
- teacher exam source handling
- meaningful backend tests

### Partially in place

- platform public library workflow
- shared question linking workflow
- public content hub strategy
- exam source display and filtering

### Missing

- subscription-to-question entitlement model
- package catalog for question banks
- entitlement-aware exam builder filtering
- entitlement-aware exam publish validation
- explicit exam audience policy
- usage accounting for licensed question access
- polished admin/operator workflow

## 7. Recommended Immediate Next Steps

### Step 1

Create the canonical data model spec for:

- `QuestionBankPackage`
- `QuestionBankPackageScope`
- `InstituteQuestionEntitlement`
- `InstituteQuestionUsageLedger`

### Step 2

Define the audience policy contract for exams:

- platform
- institute
- teacher

with explicit audience visibility values

### Step 3

Map the existing subscription plans to package entitlements rather than direct content unlock shortcuts

### Step 4

Implement builder/backend checks so institutes only use licensed master-question content

## Final Assessment

Most of the difficult foundation work is already in place.

This area is **not** a greenfield build.

The current repo already has:

- the canonical/shared question model
- the institute linking model
- the exam ownership model
- the subscription/economy foundation

The main remaining work is to connect those foundations into one coherent product contract.

That means the project is closer to:

- `integration and governance hardening`

than:

- `from-scratch implementation`
