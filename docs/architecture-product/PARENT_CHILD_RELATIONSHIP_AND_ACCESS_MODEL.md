# Parent Child Relationship And Access Model

## Purpose

This document defines the family relationship model that must exist before the full parent product is implemented.

It is the bridge between:

- parent registration
- parent login
- linked-child visibility
- parent-safe student summaries
- parent notifications

This file should be followed together with:

- `NEXORA_PARENT_MODULE_SOURCE_OF_TRUTH.md`
- `PARENT_PHASE_WISE_IMPLEMENTATION_PLAN.md`
- `ROLE_ACCESS_MATRIX.md`
- `NEXORA_FINAL_IMPLEMENTATION_SOURCE_OF_TRUTH.md`

## Current Reality

The current backend already supports:

- `AccountProfile.role = parent`
- parent public registration
- parent login
- parent-specific registration context values such as:
  - `child_class_level`
  - `child_board`
  - `parent_focus`

The current backend does not yet support:

- a real parent profile model
- a parent-to-child relationship table
- child-link approval workflow
- parent-safe child summary endpoints
- backend-saved parent notification preferences

Because of this, the current parent role is only identity-level, not family-relationship-complete.

## Core Rule

Parent access must be relationship-based, not inferred from loose student fields such as:

- `guardian_name`
- `guardian_phone`
- student email overlap
- same institute alone

Those fields may help operational workflows, but they must not be the security or authorization source of truth.

## Final Relationship Principles

### 1. Explicit Link Records

Each parent-to-child connection must be represented by an explicit database record.

### 2. Institute Scope Must Still Apply

Parents should only see children within the institute scope allowed by their relationship records.

### 3. One Parent Can Link To Multiple Children

The system must support:

- one parent linked to many children
- one child linked to many parents or guardians where appropriate

This is required for realistic family structures.

### 4. Relationship State Must Be Trackable

Each link must have a lifecycle such as:

- pending
- active
- suspended
- revoked

### 5. Parent Visibility Must Be Narrower Than Student Ownership

Parents need useful visibility, but not unrestricted access to every student operation.

The relationship layer must explicitly decide what parents can:

- view
- receive notifications about
- acknowledge

## Recommended Data Model

### A. ParentProfile

Create a dedicated parent-profile model instead of relying only on `AccountProfile.registration_context`.

Recommended fields:

- `institute`
- `account_profile`
- `first_name`
- `last_name`
- `phone`
- `alternate_phone`
- `email`
- `preferred_language`
- `notification_preferences`
- `metadata`
- `is_active`

### B. ParentChildRelationship

Create a dedicated relationship model as the main access-control record.

Recommended fields:

- `institute`
- `parent_profile`
- `student`
- `relationship_type`
- `relationship_label`
- `is_primary_contact`
- `can_view_progress`
- `can_view_results`
- `can_view_wallet`
- `can_receive_alerts`
- `can_receive_weekly_summary`
- `status`
- `linked_by`
- `linked_at`
- `approved_by`
- `approved_at`
- `revoked_by`
- `revoked_at`
- `metadata`
- `is_active`

## Recommended Enumerations

### Relationship Type

Suggested values:

- `mother`
- `father`
- `guardian`
- `grandparent`
- `sibling_guardian`
- `other`

### Relationship Status

Suggested values:

- `pending`
- `active`
- `suspended`
- `revoked`

## Access Policy Model

Relationship records should be the main source for parent authorization.

### Parent Can Access A Child Only When

- the parent account is active
- the parent profile is active
- the relationship record is active
- the relationship status is `active`
- the child is still in visible scope

### Parent Access Must Be Denied When

- no relationship record exists
- relationship is pending but not approved
- relationship is revoked or suspended
- the institute scope does not match
- the requested feature exceeds granted relationship permissions

## Visibility Layers

Parent access should be feature-scoped, not all-or-nothing.

### Minimum Visibility

All active parent-child links should usually allow:

- child identity
- class/program/cohort visibility
- dashboard summary visibility

### Optional Visibility Flags

Per relationship, the system should be able to allow or deny:

- progress visibility
- result visibility
- weak-area visibility
- wallet visibility
- alert visibility
- weekly summary eligibility

This avoids overexposing sensitive data by default.

## Linking Flows

The system should support more than one linking flow.

### Flow 1. Institute-Managed Linking

Institute admin creates or approves the link.

Best for:

- school-managed onboarding
- known guardian records
- lower fraud risk

### Flow 2. Parent Claim And Approval

Parent submits a claim request and the institute approves it.

Best for:

- public onboarding
- later-stage family linking

### Flow 3. Student-Assisted Linking

Later, if desired, a student-safe invite or consent flow can be added.

This is future scope and not required for the initial parent phase.

## Recommended Initial Rollout

For the first parent implementation, prefer:

- institute-managed linking
- explicit approval states
- no self-serve unrestricted child claims

This keeps security and data correctness simpler at launch.

## Relationship With Existing Student Fields

Current student fields such as:

- `guardian_name`
- `guardian_phone`

should be treated as informational and potentially useful for prefill or operational validation.

They should not be used alone as:

- login identity
- relationship authorization
- parent access proof

## Notification Preference Model

Parent notification preferences should not stay in browser local storage.

Persist them on the backend, preferably in `ParentProfile.notification_preferences`.

Suggested preference keys:

- `score_drops`
- `inactivity`
- `milestones`
- `weekly_summary`
- `result_published`
- `high_risk_exam_integrity`

## Audit Requirements

The relationship layer must be auditable.

Important events to log:

- parent link requested
- parent link approved
- parent link revoked
- parent preference changed
- parent child visibility denial

## Security Rules

- do not authorize by matching phone numbers alone
- do not authorize by registration context alone
- do not expose child wallet or detailed results unless explicitly allowed
- do not allow cross-institute child visibility
- do not assume one parent maps to one child

## Implementation Dependencies

Before the parent frontend becomes real, backend should provide:

1. `ParentProfile`
2. `ParentChildRelationship`
3. approval and status rules
4. parent-safe serializer contracts
5. parent-safe scoped endpoints

Without these, the parent frontend should remain clearly labeled as foundation-only.
