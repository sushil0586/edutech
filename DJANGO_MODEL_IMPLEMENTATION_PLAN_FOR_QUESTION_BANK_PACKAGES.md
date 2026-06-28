# Django Model Implementation Plan For Question Bank Packages

## Purpose

This document translates the question-bank package and entitlement schema into a Django implementation plan.

It covers:

- app placement
- concrete model list
- migration order
- service-layer additions
- admin/API additions
- rollout sequence

References:

- [QUESTION_BANK_PACKAGE_AND_ENTITLEMENT_SCHEMA_SPEC.md](/Users/ansh/Documents/Eductech/QUESTION_BANK_PACKAGE_AND_ENTITLEMENT_SCHEMA_SPEC.md:1)
- [FINAL_QUESTION_BANK_SUBSCRIPTION_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/FINAL_QUESTION_BANK_SUBSCRIPTION_IMPLEMENTATION_PLAN.md:1)

## Placement Recommendation

Recommended app:

- `apps.economy`

Reason:

- subscription and entitlement logic already lives here
- `ContentAccessPolicy` and `UnlockRule` are already entitlement-oriented
- admin/API patterns already exist for catalog-style models

Do **not** place the package/entitlement models in:

- `apps.question_bank`

Reason:

- the question bank app should remain focused on content itself
- package and subscription entitlement are commercial access concerns

## New Model Set

Implement these models in `apps.economy.models`.

## 1. `QuestionBankPackage`

### Goal

- represent a sellable or grantable package of question-bank access

### Suggested Django fields

- `institute = models.ForeignKey(Institute, ...)`
- `name = models.CharField(max_length=255)`
- `code = models.CharField(max_length=80)`
- `description = models.TextField(blank=True)`
- `package_type = models.CharField(max_length=40, choices=...)`
- `ownership_type = models.CharField(max_length=20, choices=...)`
- `access_mode = models.CharField(max_length=40, choices=...)`
- `is_public_catalog = models.BooleanField(default=True)`
- `sort_order = models.PositiveIntegerField(default=100)`
- `metadata = models.JSONField(default=dict, blank=True)`

### Constraints

- unique `(institute, code)`

### Indexes

- `(institute, code)`
- `(institute, package_type)`
- `(is_public_catalog, is_active)`

## 2. `QuestionBankPackageScope`

### Goal

- represent the content scope granted by a package

### Suggested Django fields

- `institute = models.ForeignKey(Institute, ...)`
- `package = models.ForeignKey(QuestionBankPackage, related_name="scopes", ...)`
- `program = models.ForeignKey(Program, blank=True, null=True, ...)`
- `subject = models.ForeignKey(Subject, blank=True, null=True, ...)`
- `topic = models.ForeignKey(Topic, blank=True, null=True, ...)`
- `question_source_type = models.CharField(max_length=30, choices=...)`
- `difficulty_level = models.CharField(max_length=20, blank=True, choices=TopicDifficulty.choices)`
- `question_type = models.CharField(max_length=30, blank=True, choices=QuestionType.choices)`
- `master_visibility = models.CharField(max_length=30, blank=True, choices=MasterQuestionVisibility.choices)`
- `max_questions_total = models.PositiveIntegerField(blank=True, null=True)`
- `max_questions_per_topic = models.PositiveIntegerField(blank=True, null=True)`
- `metadata = models.JSONField(default=dict, blank=True)`

### Validation rules

- package must belong to same institute
- program/subject/topic must belong to same institute
- topic must belong to subject if both are provided
- subject must belong to program if both are provided and subject has program
- if `max_questions_per_topic` is set, it should be positive
- if `max_questions_total` is set, it should be positive

### Constraints

Recommended uniqueness:

- unique `(package, program, subject, topic, difficulty_level, question_type, master_visibility)`

### Indexes

- `(package, is_active)`
- `(institute, subject, topic)`
- `(institute, question_source_type)`

## 3. `SubscriptionPlanQuestionBankPackage`

### Goal

- map existing `SubscriptionPlan` rows to question-bank packages

### Suggested Django fields

- `institute = models.ForeignKey(Institute, ...)`
- `subscription_plan = models.ForeignKey(SubscriptionPlan, related_name="question_bank_packages", ...)`
- `question_bank_package = models.ForeignKey(QuestionBankPackage, related_name="subscription_plan_links", ...)`
- `grant_mode = models.CharField(max_length=30, choices=...)`
- `is_default = models.BooleanField(default=True)`
- `metadata = models.JSONField(default=dict, blank=True)`

### Validation rules

- plan must belong to institute
- package must belong to same institute

### Constraints

- unique `(subscription_plan, question_bank_package)`

### Indexes

- `(institute, subscription_plan)`
- `(institute, question_bank_package)`
- `(grant_mode, is_active)`

## 4. `InstituteQuestionEntitlement`

### Goal

- represent active or historical institute access to a package

### Suggested Django fields

- `institute = models.ForeignKey(Institute, ...)`
- `question_bank_package = models.ForeignKey(QuestionBankPackage, related_name="institute_entitlements", ...)`
- `status = models.CharField(max_length=20, choices=...)`
- `granted_via = models.CharField(max_length=20, choices=...)`
- `subscription_plan = models.ForeignKey(SubscriptionPlan, blank=True, null=True, ...)`
- `subscription_plan_cycle = models.ForeignKey(SubscriptionPlanCycle, blank=True, null=True, ...)`
- `starts_at = models.DateTimeField(blank=True, null=True)`
- `ends_at = models.DateTimeField(blank=True, null=True)`
- `granted_by = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, related_name="granted_question_entitlements", ...)`
- `revoked_by = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, related_name="revoked_question_entitlements", ...)`
- `notes = models.TextField(blank=True)`
- `metadata = models.JSONField(default=dict, blank=True)`

### Validation rules

- package must belong to same institute namespace source being used
- plan/plan_cycle must belong to same institute if populated
- `ends_at` must be after `starts_at` if both exist
- `subscription_plan_cycle.plan_id` should match `subscription_plan_id` if both are set

### Constraints

Recommended:

- allow historical duplicates
- add conditional uniqueness so only one active-like entitlement exists for `(institute, question_bank_package)`

Suggested active statuses:

- `draft`
- `active`
- `paused`

### Indexes

- `(institute, status)`
- `(question_bank_package, status)`
- `(subscription_plan, status)`
- `(starts_at, ends_at)`

## 5. `InstituteQuestionFeatureEntitlement`

### Goal

- represent non-content feature access for institutes

### Suggested Django fields

- `institute = models.ForeignKey(Institute, ...)`
- `feature_code = models.CharField(max_length=80)`
- `status = models.CharField(max_length=20, choices=...)`
- `source_package = models.ForeignKey(QuestionBankPackage, blank=True, null=True, ...)`
- `source_subscription_plan = models.ForeignKey(SubscriptionPlan, blank=True, null=True, ...)`
- `starts_at = models.DateTimeField(blank=True, null=True)`
- `ends_at = models.DateTimeField(blank=True, null=True)`
- `metadata = models.JSONField(default=dict, blank=True)`

### Constraints

- unique active row per `(institute, feature_code)` recommended

### Indexes

- `(institute, feature_code, status)`
- `(source_package, status)`

## 6. `InstituteQuestionUsageLedger`

### Goal

- track package usage for analytics and quotas

### Suggested Django fields

- `institute = models.ForeignKey(Institute, ...)`
- `question_bank_package = models.ForeignKey(QuestionBankPackage, ...)`
- `entitlement = models.ForeignKey(InstituteQuestionEntitlement, blank=True, null=True, ...)`
- `action_type = models.CharField(max_length=40, choices=...)`
- `master_question = models.ForeignKey(MasterQuestion, blank=True, null=True, ...)`
- `question = models.ForeignKey(Question, blank=True, null=True, ...)`
- `exam = models.ForeignKey("exams.Exam", blank=True, null=True, ...)`
- `quantity = models.PositiveIntegerField(default=1)`
- `performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, ...)`
- `effective_at = models.DateTimeField()`
- `metadata = models.JSONField(default=dict, blank=True)`

### Validation rules

- package must belong to same institute namespace source
- question/exam must belong to target institute if set
- quantity must be positive

### Indexes

- `(institute, question_bank_package, effective_at)`
- `(entitlement, effective_at)`
- `(action_type, effective_at)`

## Enum Definitions

Add these as `TextChoices` near the economy model enums.

### `QuestionBankPackageType`

- `SUBJECT_LIBRARY = "subject_library"`
- `TOPIC_BUNDLE = "topic_bundle"`
- `EXAM_FAMILY_BUNDLE = "exam_family_bundle"`
- `CUSTOM_BUNDLE = "custom_bundle"`
- `FEATURE_BUNDLE = "feature_bundle"`

### `QuestionBankOwnershipType`

- `PLATFORM = "platform"`
- `INSTITUTE = "institute"`

### `QuestionBankAccessMode`

- `FULL_SCOPE = "full_scope"`
- `QUOTA_LIMITED = "quota_limited"`
- `LINK_ON_DEMAND = "link_on_demand"`
- `MATERIALIZE_ON_ENTITLEMENT = "materialize_on_entitlement"`

### `QuestionBankPackageGrantMode`

- `INCLUDED = "included"`
- `OPTIONAL_ADDON = "optional_addon"`
- `TRIAL = "trial"`

### `InstituteQuestionEntitlementStatus`

- `DRAFT = "draft"`
- `ACTIVE = "active"`
- `PAUSED = "paused"`
- `EXPIRED = "expired"`
- `REVOKED = "revoked"`

### `InstituteQuestionEntitlementGrantMode`

- `SUBSCRIPTION = "subscription"`
- `ADMIN_GRANT = "admin_grant"`
- `TRIAL = "trial"`
- `MIGRATION = "migration"`

### `InstituteQuestionUsageActionType`

- `QUESTION_LINKED = "question_linked"`
- `QUESTION_MATERIALIZED = "question_materialized"`
- `EXAM_CREATED = "exam_created"`
- `EXAM_PUBLISHED = "exam_published"`
- `QUESTION_UNLINKED = "question_unlinked"`
- `ENTITLEMENT_OVERRIDE = "entitlement_override"`

## Migration Plan

Use incremental migrations instead of one large migration.

### Migration 1

Add:

- enums
- `QuestionBankPackage`
- `QuestionBankPackageScope`
- `SubscriptionPlanQuestionBankPackage`

Reason:

- package catalog can be built first

### Migration 2

Add:

- `InstituteQuestionEntitlement`
- `InstituteQuestionFeatureEntitlement`

Reason:

- active institute access comes after package definition

### Migration 3

Add:

- `InstituteQuestionUsageLedger`

Reason:

- usage accounting can be introduced after core entitlement flow

## Service Layer Additions

Implement in `apps.economy.services`.

## Service 1. `resolve_institute_question_packages`

Purpose:

- return active packages for an institute

Inputs:

- institute
- optional at_time

## Service 2. `resolve_institute_question_entitlements`

Purpose:

- return active entitlements for an institute

Inputs:

- institute
- optional package
- optional at_time

## Service 3. `institute_can_use_master_question`

Purpose:

- central access decision

Inputs:

- institute
- master_question
- optional at_time

Rules:

- platform content requires entitlement
- institute private content is allowed only inside same institute
- teacher private content is allowed only inside same institute

## Service 4. `grant_question_package_entitlements_for_subscription`

Purpose:

- activate entitlements from a plan/package mapping

Inputs:

- institute
- subscription_plan
- subscription_plan_cycle
- starts_at
- ends_at

## Service 5. `revoke_question_package_entitlements_for_subscription`

Purpose:

- deactivate or expire linked entitlements

## Service 6. `record_question_usage_event`

Purpose:

- write to usage ledger from linking/materialization/exam flows

## Integration Points

### 1. `apps.question_bank.services`

Update:

- `link_master_question_to_institute`

Add:

- entitlement check before linking platform content
- usage recording after successful linking

### 2. exam builder save/publish path

Update:

- advanced builder and exam create flows

Add:

- validate institute can use all platform-origin questions included in the exam

### 3. subscription lifecycle

Update:

- wherever subscription activation/cancellation is handled in economy

Add:

- package entitlement grant/revoke hooks

## Admin Plan

Implement in `apps.economy.admin`.

Add admins for:

- `QuestionBankPackage`
- `QuestionBankPackageScope`
- `SubscriptionPlanQuestionBankPackage`
- `InstituteQuestionEntitlement`
- `InstituteQuestionFeatureEntitlement`
- `InstituteQuestionUsageLedger`

Recommended admin UX:

- package admin with inline scopes
- subscription plan admin with inline package mappings
- entitlement admin with filters by institute/package/status

## Serializer Plan

Implement in `apps.economy.serializers`.

Need:

- admin serializers for package and entitlement CRUD
- read serializers for institute-facing visibility

### Admin serializers

- `AdminQuestionBankPackageSerializer`
- `AdminQuestionBankPackageScopeSerializer`
- `AdminSubscriptionPlanQuestionBankPackageSerializer`
- `AdminInstituteQuestionEntitlementSerializer`
- `AdminInstituteQuestionFeatureEntitlementSerializer`

### Institute-facing serializers

- `InstituteQuestionBankPackageSerializer`
- `InstituteQuestionEntitlementSummarySerializer`

## View/API Plan

Implement in `apps.economy.views`.

### Admin endpoints

- list/create/update packages
- list/create/update package scopes
- list/create/update plan-to-package mappings
- list/create/update entitlements

### Institute endpoints

- list active accessible packages
- view entitled scope summary

## Test Plan

Add tests in:

- `apps.economy.tests`
- `apps.question_bank.tests`
- `apps.exams.tests`

### Must-cover cases

- package creation and validation
- scope validation
- plan-to-package mapping
- entitlement activation and expiry
- platform question access allowed only with entitlement
- institute private question always usable in same institute
- teacher private question always usable in same institute
- exam create/publish blocked for unlicensed platform content

## Implementation Order

Use this order:

1. models + migration 1
2. models + migration 2
3. economy services
4. question-bank integration checks
5. exam-builder enforcement
6. admin serializers/views
7. institute read endpoints
8. usage ledger migration and hooks

## Final Recommendation

Build the first implementation in `apps.economy`, not `apps.question_bank`.

That keeps the architecture clean:

- `question_bank` owns content
- `economy` owns commercial access to content
- `exams` owns how entitled content becomes assessable
