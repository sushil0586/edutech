# Final Question Bank Subscription Implementation Plan

## Purpose

This is the final implementation plan for making Nexora work with:

- independent canonical question banks
- platform-shared question libraries
- institute-private and teacher-private question uploads
- configurable subscription-based question access
- role-based exam creation
- audience-scoped exam visibility

This plan assumes:

- platform questions can be shared
- institute and teacher questions remain private by default
- subscriptions must stay highly configurable

References:

- [QUESTION_BANK_SUBSCRIPTION_AND_EXAM_VISIBILITY_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/QUESTION_BANK_SUBSCRIPTION_AND_EXAM_VISIBILITY_IMPLEMENTATION_PLAN.md:1)
- [REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md:1)

## Final Product Rules

### Rule 1. Question bank is independent

Question banks must not belong only to one institute by design.

Canonical source of truth:

- `MasterQuestion`

Operational usage copy:

- `Question`

### Rule 2. Platform, institute, and teacher content behave differently

- `platform` content
  - shareable
  - licensable by subscription/package
  - can be used across institutes
- `institute` content
  - private to that institute by default
  - not publicly visible
  - not cross-institute unless explicitly promoted later
- `teacher` content
  - private to that teacher’s institute by default
  - not publicly visible
  - not cross-institute unless explicitly promoted later

### Rule 3. Subscription controls entitlement, not hardcoded access

Subscriptions should determine:

- which packages are active
- which question scopes are allowed
- which features are enabled
- which usage limits apply

### Rule 4. Exam ownership and exam audience are separate

Exam source tells who created it.

Exam audience tells who can see it.

Examples:

- platform-created exam for all eligible learners
- platform-created exam for selected institutes only
- institute-created exam for only that institute
- teacher-created exam for only that institute

### Rule 5. Institute and teacher uploads do not become public automatically

Anything uploaded by institute admin or teacher should remain private by default.

Promotion into shared library, if ever needed, should be an explicit reviewed platform workflow.

## Role Model

### Platform Admin

Can:

- create and manage canonical question banks
- create question packages
- create subscription-access rules
- grant platform-wide or selected-institute exam visibility
- review and optionally promote selected private content later

Cannot:

- automatically expose institute/teacher private content to other institutes

### Institute Admin

Can:

- upload institute-private questions
- access licensed platform question banks
- create institute exams
- manage teacher usage inside institute scope

Cannot:

- make institute content public globally by default
- use platform questions beyond active entitlement

### Teacher

Can:

- upload teacher questions
- use institute-private and licensed platform content available in their institute
- create teacher-source exams inside institute scope

Cannot:

- expose their content publicly by default
- create cross-institute exam visibility by default

### Student

Can:

- see only exams visible to their scope

Student should see:

- platform exams released to them
- institute exams from their institute
- teacher exams assigned within their institute

## Target Architecture

## Layer 1. Canonical library layer

Already largely present:

- `MasterQuestion`
- `MasterQuestionOption`
- `MasterQuestionAttachment`

This remains the platform’s canonical library layer.

## Layer 2. Entitlement and packaging layer

New layer to add:

- `QuestionBankPackage`
- `QuestionBankPackageScope`
- `FeatureEntitlement`
- `InstituteQuestionEntitlement`
- `InstituteQuestionUsageLedger`

Purpose:

- map subscriptions to actual usable content scope
- avoid per-question manual approval as the main business path

## Layer 3. Operational institute layer

Existing and should remain:

- `Question`

Purpose:

- institute-local operational usage
- linking or materialized copies from master library
- teacher/institute private authoring
- exam assembly

## Layer 4. Exam audience layer

Add explicit audience policy on top of existing exam source typing.

Suggested values:

- `platform_all_eligible`
- `platform_selected_institutes`
- `institute_only`
- `teacher_same_institute`

## What Already Exists

These foundations already exist in repo and should be reused:

- canonical `MasterQuestion` layer
- source type and visibility on master questions
- institute question access link model
- request/approve/link services
- master sharing test coverage
- platform/institute/teacher exam source typing
- institute exam scoping
- subscription/economy foundations

So this implementation is mostly:

- integration
- productization
- governance hardening

not a from-scratch build.

## Main Gaps To Implement

### Gap A. Package model for question banks

Need:

- package catalog for question access
- package-level metadata and configurability

### Gap B. Subscription-to-entitlement resolution

Need:

- a clean bridge from subscription plans to question bank entitlements

### Gap C. Entitlement-aware builder filtering

Need:

- only show licensed platform content to institute and teacher users

### Gap D. Entitlement-aware save/publish validation

Need:

- backend enforcement so unlicensed content cannot be used in exams

### Gap E. Explicit exam audience policy

Need:

- formal exam visibility contract separate from source ownership

### Gap F. Usage accounting

Need:

- usage ledger if plans later include:
  - max linked questions
  - max exam publishes
  - quota-based bank access

## Final Implementation Phases

## Phase 1. Canonical policy lock

Goal:

- finalize business rules without major schema change

Tasks:

- freeze private/public rules for platform/institute/teacher content
- freeze exam source vs exam audience rules
- freeze package-first configurable subscription approach

Output:

- approved product policy
- no ambiguity on ownership/visibility

Acceptance:

- all role rules documented and agreed

## Phase 2. Package and entitlement models

Goal:

- introduce configurable subscription-driven access control

Tasks:

- add `QuestionBankPackage`
- add `QuestionBankPackageScope`
- add `InstituteQuestionEntitlement`
- add `FeatureEntitlement`
- add optional `InstituteQuestionUsageLedger`

Config examples:

- Class 7 Math Foundation Pack
- School Premium Question Bank
- NEET Biology Core Package
- JEE Algebra Advanced Package

Acceptance:

- package can target class/program/subject/topic/family
- institute entitlement can be activated/deactivated without code changes

## Phase 3. Subscription integration

Goal:

- make subscription drive question bank access

Tasks:

- map subscription plans to package entitlements
- activate entitlements on subscription start
- deactivate or downgrade on expiry/cancellation
- support institute-specific overrides

Acceptance:

- changing active subscription changes accessible packages predictably

## Phase 4. Builder and access enforcement

Goal:

- ensure only licensed content is usable

Tasks:

- filter platform question selection by entitlement
- validate on exam draft save
- validate on publish
- keep institute/teacher private content always available within their own institute

Acceptance:

- institute cannot create exam from unlicensed platform bank
- institute can always use own private content

## Phase 5. Exam audience implementation

Goal:

- make visibility deterministic

Tasks:

- add explicit audience policy
- update student-visible exam filtering
- update platform/institute/teacher exam creation forms
- add tests for audience combinations

Acceptance:

- platform exam can be global or selected-institute
- institute exam is visible only in that institute
- teacher exam is visible only in that institute unless promoted by policy

## Phase 6. Admin and operator workflows

Goal:

- make the system manageable by non-developer operators

Tasks:

- package management UI
- entitlement management UI
- subscription-to-package mapping UI
- institute access audit views
- support actions for revoke/approve/suspend/override

Acceptance:

- platform admin can manage access without DB work

## Phase 7. Hardening and analytics

Goal:

- make the system production-safe

Tasks:

- usage reporting
- duplicate-control audit on canonical banks
- access audit logs
- entitlement history
- exam-source and audience analytics

Acceptance:

- support team can answer:
  - who had access
  - when they got it
  - which package granted it
  - which exams used licensed content

## Data Model Recommendation

### 1. `QuestionBankPackage`

Should store:

- code
- label
- description
- owner type
- active flag
- package type
- audience metadata
- configuration JSON

### 2. `QuestionBankPackageScope`

Should store:

- package
- program
- subject
- topic
- exam family
- difficulty filter if needed
- scope metadata

### 3. `InstituteQuestionEntitlement`

Should store:

- institute
- package
- source subscription plan / subscription row
- active window
- status
- rule metadata

### 4. `FeatureEntitlement`

Should store:

- institute
- feature code
- source package / plan
- active status
- config payload

### 5. `InstituteQuestionUsageLedger`

Should store:

- institute
- package
- action type
- linked question count
- exam publish count
- usage metadata

## Max Configurability Rules

Subscriptions and packages must be configurable for:

- program/class coverage
- subject coverage
- topic coverage
- exam family coverage
- pricing
- cycle
- quota
- institution type
- number of teachers
- number of students
- feature set
- validity windows
- promotional overrides
- family-specific premium access

What should not be hardcoded:

- which family belongs to which plan
- max questions per plan
- fixed school/neet/jee/aws assumptions
- pricing tiers as logic constants

## Recommended Build Order

Use this order:

1. policy freeze
2. package and entitlement schema
3. subscription integration
4. exam builder/content enforcement
5. exam audience policy
6. operator/admin workflows
7. analytics and hardening

## Practical MVP Recommendation

If we want the fastest useful release:

- keep current master question and institute link flows
- add package + entitlement layer first
- use institute-only audience as default for non-platform exams
- use global or selected-institute audience only for platform exams
- keep institute/teacher uploaded content private by default

This gives us:

- a commercially usable shared question library
- subscription-driven access
- clear tenant boundaries
- minimal disruption to current architecture

## Final Assessment

This feature set is highly feasible with the current codebase.

The repo already has the hard foundation pieces.

What remains is mainly:

- packaging
- entitlement resolution
- audience formalization
- admin/operator workflows

So the final implementation should be treated as:

- a controlled product integration program

not:

- a full platform rewrite
