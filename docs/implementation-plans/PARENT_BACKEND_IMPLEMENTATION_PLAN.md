# Parent Backend Implementation Plan

## Purpose

This document converts the parent relationship and API design into an implementation-ready backend plan.

It should be used together with:

- `PARENT_CHILD_RELATIONSHIP_AND_ACCESS_MODEL.md`
- `PARENT_BACKEND_CONTRACT_SPEC.md`
- `NEXORA_PARENT_MODULE_SOURCE_OF_TRUTH.md`
- `NEXORA_FINAL_IMPLEMENTATION_SOURCE_OF_TRUTH.md`

## Recommendation

Use a dedicated backend domain:

- `apps/parents`

This is the recommended direction because parent scope is not just an auth-role flag.

It needs:

- family relationships
- approval workflows
- parent-safe child summaries
- alerts
- persisted parent preferences

That deserves a clean module boundary rather than overloading `apps/accounts`.

## Why `apps/parents` Is Better Than Extending `apps/accounts`

`apps/accounts` should remain primarily responsible for:

- authentication
- registration
- session identity
- login management
- core role routing

`apps/parents` should own:

- parent profile domain data
- parent-child relationship rules
- parent-scoped serializers
- parent-scoped views
- parent summary services
- parent preferences

This separation keeps the auth layer clean and makes future parent expansion easier.

## Final Backend Module Structure

Recommended structure:

- `apps/parents/models.py`
- `apps/parents/serializers/__init__.py`
- `apps/parents/views/__init__.py`
- `apps/parents/urls/__init__.py`
- `apps/parents/admin/__init__.py`
- `apps/parents/services.py`
- `apps/parents/tests/`
- `apps/parents/migrations/`

## Phase 1 Scope

### Must implement

- `ParentProfile`
- `ParentChildRelationship`
- parent-scoped query helpers or services
- parent child-list endpoint
- parent dashboard summary endpoint
- parent preferences endpoints

### Should implement if feasible in same phase

- parent alerts endpoint

### Can wait for later

- parent wallet visibility endpoint
- parent weekly digest delivery
- parent self-serve link claim flow

## Current Backend Status

The recommended backend direction is now implemented in the current project for:

- `apps/parents`
- `ParentProfile`
- `ParentChildRelationship`
- `ParentAlert`
- parent session context exposure
- parent children endpoint
- parent dashboard summary endpoint
- parent progress endpoint
- parent alerts endpoint
- parent alert status update endpoint
- parent preferences persistence endpoints

Still intentionally deferred:

- parent wallet visibility endpoint
- weekly digest delivery jobs or delivery tracking
- self-serve parent link claim workflows

## Final Model Structure

### 1. ParentProfile

Recommended fields:

- `institute`
- `account_profile`
- `first_name`
- `last_name`
- `full_name`
- `phone`
- `alternate_phone`
- `email`
- `preferred_language`
- `notification_preferences`
- `metadata`
- `is_active`

Recommended rules:

- one-to-one with `AccountProfile`
- institute-scoped
- full name derived like student and teacher patterns
- notification preferences stored as JSON object initially

Recommended indexes:

- `institute`
- `full_name`
- `is_active`

### 2. ParentChildRelationship

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

Recommended constraints:

- unique active relationship per `parent_profile + student + relationship_type`
- institute consistency with student and parent profile

Recommended indexes:

- `institute`
- `parent_profile`
- `student`
- `status`
- `is_active`

### 3. ParentAlert

Recommended first-phase decision:

- create this model in `apps/parents` only if we want persisted parent alerts now
- otherwise expose generated alerts via services first and add persistence later

Preferred approach:

- start with persisted alerts because the parent module is alert-driven

Recommended fields:

- `institute`
- `parent_profile`
- `student`
- `relationship`
- `alert_type`
- `severity`
- `title`
- `message`
- `status`
- `source_type`
- `source_reference`
- `metadata`
- `read_at`
- `resolved_at`
- `is_active`

Recommended statuses:

- `new`
- `read`
- `resolved`
- `dismissed`

## Enum Recommendations

### Relationship Type

- `mother`
- `father`
- `guardian`
- `grandparent`
- `sibling_guardian`
- `other`

### Relationship Status

- `pending`
- `active`
- `suspended`
- `revoked`

### Alert Type

- `score_drop`
- `inactivity`
- `milestone`
- `result_published`
- `exam_risk`

### Alert Severity

- `info`
- `warning`
- `high`

## Account Integration Rules

### Current State

Today `AccountProfile` supports the `parent` role but has no dedicated `parent_profile` field.

### Recommended Change

Use a single one-to-one from `ParentProfile` to `AccountProfile`:

- `ParentProfile.account_profile`

This avoids redundant circular identity links while still allowing:

- `account_profile.parent_profile` through Django reverse access
- parent session context
- parent-scoped lookup from the logged-in user

Recommended rule:

- `role == parent` should resolve to a valid `ParentProfile` once the relationship system is live

## Serializer Strategy

### Update `AccountProfileSerializer`

For parent users, include:

- `parent_context`

Suggested fields:

- `parent_profile_id`
- `linked_children_count`
- `has_active_links`

### Add Parent-Specific Serializers

Create serializers for:

- parent child list
- parent child detail
- parent dashboard summary
- parent preferences
- parent alerts

## View And URL Strategy

Recommended public parent routes:

- `GET /api/v1/parent/children/`
- `GET /api/v1/parent/children/<child_id>/`
- `GET /api/v1/parent/dashboard/summary/`
- `GET /api/v1/parent/progress/`
- `GET /api/v1/parent/alerts/`
- `GET /api/v1/parent/preferences/`
- `PATCH /api/v1/parent/preferences/`

Optional later:

- `GET /api/v1/parent/wallet/`

Recommended admin or institute routes for link management:

- `POST /api/v1/accounts/parent-links/`
- `PATCH /api/v1/accounts/parent-links/<id>/`
- approval and revoke actions

If keeping account-management URLs separate is cleaner, those routes can live under:

- `apps.accounts.management_urls`

## Service Layer Responsibilities

Implement these in `apps/parents/services.py`:

- `get_parent_profile_for_user(user)`
- `get_active_parent_relationships(user)`
- `get_parent_visible_students(user)`
- `resolve_parent_child_access(user, child_id)`
- `build_parent_dashboard_summary(parent_profile, student)`
- `build_parent_progress_summary(parent_profile, student)`
- `build_parent_alerts(parent_profile, student=None)`
- `update_parent_preferences(parent_profile, payload)`

## Query Scope Helpers

Recommended scope helpers:

- `scope_parent_relationship_queryset(queryset, user)`
- `scope_parent_student_queryset(queryset, user)`
- `scope_parent_alert_queryset(queryset, user)`

These may live in:

- `apps.parents.services`

or, if consistency is preferred:

- `apps.accounts.scopes`

Recommended direction:

- keep parent-specific scope logic inside `apps.parents` if the app is created

## Summary Data Sources

Parent dashboard and progress should reuse existing data where possible.

Likely source domains:

- `apps.results`
- `apps.attempts`
- `apps.exams`
- `apps.economy` only when parent wallet visibility is explicitly approved

Important rule:

- parent responses should be transformed into parent-safe summaries
- do not expose student or teacher raw operational payloads directly

## Alert Generation Strategy

Recommended first implementation:

- generate parent alerts from backend services
- persist them in `ParentAlert`

Potential producers:

- result publication
- score drop relative to prior performance
- student inactivity threshold
- improvement milestone
- high-risk integrity event if product approves that visibility

## Migration Sequence

Recommended order:

1. create `apps/parents`
2. add `ParentProfile`
3. add `ParentChildRelationship`
4. add `ParentAlert` if included in first phase
5. add `AccountProfile.parent_profile`
6. update serializers and permissions
7. add parent endpoints
8. add tests

## Permission Model

Add or extend permissions to include:

- `IsParent`
- parent-child scoped access checks

Parent endpoints should check:

- authenticated user
- active account profile
- role is `parent`
- active parent profile
- active qualifying relationship to requested child

## Admin Surface

Django admin should support early operational control for:

- parent profiles
- parent-child links
- parent alerts

This helps bootstrap the parent product before a dedicated institute UI for linking is built.

## Test Plan

Minimum backend tests:

- parent registration still works
- parent login returns parent context
- child list only returns linked children
- unauthorized child access is denied
- parent preferences persist correctly
- alerts only return allowed child data
- institute boundary is enforced

## Definition Of Backend-Ready

The parent frontend can move beyond foundation mode when:

- `ParentProfile` exists
- `ParentChildRelationship` exists
- parent context is exposed from session/profile APIs
- child list endpoint works
- dashboard summary endpoint works
- preferences persistence endpoint works
- parent visibility permissions are tested
