# Question Bank Package and Entitlement Schema Spec

## Purpose

This document defines the backend schema and product contract for:

- configurable question-bank packages
- institute-level question entitlements
- subscription-to-package mapping
- optional usage accounting

This is the concrete schema step for:

- `P0-2` package models
- `P0-3` entitlement models

References:

- [FINAL_QUESTION_BANK_SUBSCRIPTION_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/FINAL_QUESTION_BANK_SUBSCRIPTION_IMPLEMENTATION_PLAN.md:1)
- [QUESTION_BANK_SUBSCRIPTION_P0_P1_P2_EXECUTION_TICKETS.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/QUESTION_BANK_SUBSCRIPTION_P0_P1_P2_EXECUTION_TICKETS.md:1)

## Important Current-Reality Note

The current economy subscription models are primarily student-facing:

- `SubscriptionPlan`
- `SubscriptionPlanCycle`
- `StudentSubscription`

For question-bank licensing, we should add a separate institute-facing entitlement layer.

That means:

- do not overload `StudentSubscription` for institute question-bank access
- keep question-bank licensing explicitly institute-scoped

## Current Implementation Status

As of `2026-06-27`, the core P0 schema in this document is already implemented in the repo.

Already live:

- `QuestionBankPackage`
- `QuestionBankPackageScope`
- `SubscriptionPlanQuestionBankPackage`
- `InstituteQuestionEntitlement`
- enum support for:
  - package type
  - ownership type
  - access mode
  - package grant mode
  - entitlement status
  - entitlement grant mode
  - usage action type
- admin APIs and serializers for:
  - package visibility
  - package scope visibility
  - institute entitlement visibility
  - subscription-plan package linking
  - apply-to-institute entitlement materialization
- service-layer apply flow for plan-linked package entitlements
- shared-library runtime enforcement in institute and teacher authoring flows

Still not implemented from the broader design:

- `InstituteQuestionFeatureEntitlement`
- `InstituteQuestionUsageLedger`
- full quota accounting and package usage evidence
- richer commercialization taxonomy beyond package metadata and scope rows

## Design Principles

### 1. Config-first

No hardcoded school/neet/jee/aws package assumptions in code.

### 2. Institute entitlement is separate from question rows

Entitlement should decide whether an institute may use a bank.
Question rows are only the operational usage layer.

### 3. Package scope should be broad enough for future growth

It must support:

- school class/subject/topic packages
- exam-family packages
- certification bundles
- custom institute bundles

### 4. Source ownership and entitlement are separate

- a master question may exist
- a package may include it
- an institute may or may not be entitled to use it

## Implemented And Planned Models

## Model 1. `QuestionBankPackage`

Represents a sellable or grantable package of question access.

### Purpose

- package platform content into reusable commercial units
- support subscription and operator-granted access

### Implemented fields

- `institute`
  - FK to `Institute`
  - recommended meaning:
    - for platform/global packages, use the public content hub institute
    - for private institute-only bundles later, allow private institute scope too
- `name`
- `code`
- `description`
- `package_type`
  - suggested choices:
    - `subject_library`
    - `topic_bundle`
    - `exam_family_bundle`
    - `custom_bundle`
    - `feature_bundle`
- `ownership_type`
  - suggested choices:
    - `platform`
    - `institute`
- `access_mode`
  - suggested choices:
    - `full_scope`
    - `quota_limited`
    - `link_on_demand`
    - `materialize_on_entitlement`
- `is_public_catalog`
  - whether it is visible in sellable package catalog
- `sort_order`
- `metadata`
  - for flexible commercial labels, marketing tags, family mapping, etc.

### Constraints

- unique `(institute, code)`

### Notes

This model should be lightweight and configurable.
It should not directly store every usage rule inline if a child scope model can hold it better.

Current implementation note:

- platform-owned packages are validated against the public content hub institute
- institute-owned packages are blocked from using the public content hub institute

## Model 2. `QuestionBankPackageScope`

Represents the actual content scope granted by a package.

### Purpose

- define what the package contains

### Implemented fields

- `package`
  - FK to `QuestionBankPackage`
- `program`
  - nullable FK to `Program`
- `subject`
  - nullable FK to `Subject`
- `topic`
  - nullable FK to `Topic`
- `question_source_type`
  - suggested choices:
    - `platform_only`
    - `platform_and_institute`
    - `platform_and_teacher`
    - `all`
- `difficulty_level`
  - nullable
- `question_type`
  - nullable
- `master_visibility`
  - nullable filter if needed
- `max_questions_total`
  - nullable
- `max_questions_per_topic`
  - nullable
- `is_active`
- `metadata`
  - exam family tags
  - package labels
  - custom resolver hints

### Recommended interpretation

If `topic` is set:

- package grants access to that topic

If only `subject` is set:

- package grants access to all matching topics under that subject

If only `program` is set:

- package grants broad program/class-level content access

### Constraints

Suggested uniqueness:

- unique `(package, program, subject, topic, difficulty_level, question_type)`

Current implementation note:

- the live uniqueness constraint also includes `master_visibility`
- validation already enforces same-institute package/program/subject/topic ownership
- validation already enforces at least one of `program`, `subject`, or `topic`

## Model 3. `SubscriptionPlanQuestionBankPackage`

Bridge between subscription plans and question-bank packages.

### Purpose

- let subscription plans activate package access

### Why a bridge is needed

Current subscription models already exist and should stay reusable.
We should map plans to packages rather than embedding package logic in code.

### Implemented fields

- `institute`
  - FK to `Institute`
- `subscription_plan`
  - FK to `SubscriptionPlan`
- `question_bank_package`
  - FK to `QuestionBankPackage`
- `grant_mode`
  - suggested choices:
    - `included`
    - `optional_addon`
    - `trial`
- `is_default`
- `metadata`

### Constraints

- unique `(subscription_plan, question_bank_package)`

## Model 4. `InstituteQuestionEntitlement`

Represents an institute’s active or historical access to a package.

### Purpose

- become the real institute-facing access source of truth

### Implemented fields

- `institute`
  - target institute receiving access
- `question_bank_package`
- `status`
  - suggested choices:
    - `draft`
    - `active`
    - `paused`
    - `expired`
    - `revoked`
- `granted_via`
  - suggested choices:
    - `subscription`
    - `admin_grant`
    - `trial`
    - `migration`
- `subscription_plan`
  - nullable FK to `SubscriptionPlan`
- `subscription_plan_cycle`
  - nullable FK to `SubscriptionPlanCycle`
- `starts_at`
- `ends_at`
- `granted_by`
  - nullable user FK
- `revoked_by`
  - nullable user FK
- `notes`
- `metadata`

### Important behavior

This model should not mean “one row per question.”
It should mean “institute is entitled to this package.”

### Constraints

Recommended:

- multiple historical rows allowed
- only one active entitlement per `(institute, package)` at a time

This can be enforced via:

- unique conditional constraint on active statuses

Current implementation note:

- the live uniqueness rule covers `draft`, `active`, and `paused`
- historical `expired` and `revoked` rows can coexist over time

## Model 5. `InstituteQuestionFeatureEntitlement`

Optional but recommended.

Current status:

- not implemented yet
- still a real product gap if non-content premium features need their own licensing posture

### Purpose

- control non-content premium features separately from content package scope

Examples

- advanced exam builder
- premium analytics
- proctoring
- export/report access

### Suggested fields

- `institute`
- `feature_code`
- `status`
- `source_package`
  - nullable FK to `QuestionBankPackage`
- `source_subscription_plan`
  - nullable FK to `SubscriptionPlan`
- `starts_at`
- `ends_at`
- `metadata`

### Why separate this

Not every subscription benefit is content scope.
Feature control should not be mixed into topic rows.

## Model 6. `InstituteQuestionUsageLedger`

Optional for P0, but strongly recommended for P2.

Current status:

- action-type enum support exists
- the ledger model itself is not implemented yet
- quota-limited package access is therefore only partially product-ready

### Purpose

- track how package access is consumed

### Suggested fields

- `institute`
- `question_bank_package`
- `entitlement`
  - nullable FK to `InstituteQuestionEntitlement`
- `action_type`
  - suggested choices:
    - `question_linked`
    - `question_materialized`
    - `exam_created`
    - `exam_published`
    - `question_unlinked`
    - `entitlement_override`
- `master_question`
  - nullable FK
- `question`
  - nullable FK
- `exam`
  - nullable FK
- `quantity`
  - integer, default `1`
- `performed_by`
  - nullable user FK
- `effective_at`
- `metadata`

### Why this matters

Needed later for:

- quotas
- usage reporting
- support history
- package billing evidence

## Recommended Enums

### `QuestionBankPackageType`

- `subject_library`
- `topic_bundle`
- `exam_family_bundle`
- `custom_bundle`
- `feature_bundle`

### `QuestionBankOwnershipType`

- `platform`
- `institute`

### `QuestionBankAccessMode`

- `full_scope`
- `quota_limited`
- `link_on_demand`
- `materialize_on_entitlement`

### `InstituteQuestionEntitlementStatus`

- `draft`
- `active`
- `paused`
- `expired`
- `revoked`

### `InstituteQuestionEntitlementGrantMode`

- `subscription`
- `admin_grant`
- `trial`
- `migration`

## Relationship Map

Recommended relationships:

- `SubscriptionPlan` -> many `SubscriptionPlanQuestionBankPackage`
- `QuestionBankPackage` -> many `QuestionBankPackageScope`
- `Institute` -> many `InstituteQuestionEntitlement`
- `InstituteQuestionEntitlement` -> one `QuestionBankPackage`
- `InstituteQuestionEntitlement` -> optional `SubscriptionPlan` and `SubscriptionPlanCycle`
- `InstituteQuestionUsageLedger` -> points back to package and entitlement

## How Resolution Should Work

When institute wants to use a platform or shared-library question:

1. identify the `MasterQuestion`
2. determine its package eligibility via `QuestionBankPackageScope`
3. check active `InstituteQuestionEntitlement`
4. if entitled:
   - allow linking/materialization/use
5. if not entitled:
   - block platform content use
   - still allow institute/teacher private content inside institute scope

## Current Authoring Contract

This is the practical role contract the current repo is now enforcing.

### Platform admin

- owns platform/shared question-bank packages
- maps subscription plans to packages
- grants or materializes institute entitlements
- reviews lifecycle, scope, reconciliation, and remediation state

### Institute admin

- may upload and manage institute-private question content
- may create exams from private institute content without platform package entitlement
- may use platform/shared content only when matching active institute entitlement exists

### Teacher

- may upload and manage teacher or institute-scoped private content
- may use platform/shared library questions only when the institute has active matching entitlement
- should not continue linking or publishing shared-library-backed questions after entitlement becomes inactive

### Student

- does not directly receive question-bank package rights
- only sees downstream outcomes through exams, availability, and student-facing economy policies

## Important Separation Rule

Institute question-bank entitlement and student runtime entitlement are not the same system.

### Institute question-bank entitlement controls

- whether institute and teacher roles may use platform/shared questions for authoring and publishing

### Student runtime entitlement controls

- whether a learner may open premium content via:
  - stars
  - learner entitlement code
  - unlock rules

Both can exist in the same product, but they should not be collapsed into one schema concept.

## Recommended Storage Strategy

### Platform packages

Store under the public content hub institute.

Reason:

- fits current platform/public-hub pattern already present in repo

### Institute-private custom packages

Can later be stored under private institute if needed.

Reason:

- supports premium custom bundles without polluting global catalog

## Suggested Non-Goals For P0

Do not include in first schema iteration:

- automatic promotion workflow from private content to platform content
- advanced royalty/revenue sharing logic
- deep per-student licensing logic for question banks

## Remaining Backend And Product Gaps

The main remaining gaps after the implemented schema are:

1. `InstituteQuestionFeatureEntitlement`
   - needed if builder, analytics, export, or proctoring rights should be sold separately from content access

2. `InstituteQuestionUsageLedger`
   - needed for quotas, package consumption evidence, support audit, and future billing clarity

3. quota-limited access completion
   - the access mode exists
   - but full package consumption accounting is not yet closed

4. stronger package-family taxonomy
   - metadata works today
   - but school / neet / jee / certification product packaging still needs a cleaner long-term catalog structure

5. longer-term private-content promotion workflows
   - especially if institute or teacher private content later needs package inclusion or platform promotion

Those can come later.

## P0 Acceptance For Schema

P0 schema is good enough when:

- package can represent configurable content scope
- subscription can map to package
- institute can receive active entitlement
- backend can resolve entitlement for question usage
- exam creation can enforce entitled use of platform content

## Recommended Next Implementation Step

After approving this schema:

1. treat this document as the current schema source of truth
2. implement `InstituteQuestionFeatureEntitlement` when non-content licensing becomes product-critical
3. implement `InstituteQuestionUsageLedger` before broad quota-limited commercialization rollout
4. define stronger package taxonomy conventions for school / neet / jee / certification lanes
5. keep expanding mutable and contract coverage around entitlement drift and shared-library authoring
