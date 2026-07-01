# Parent Final Model Structure

## Purpose

This document captures the final recommended database structure for the parent domain.

It is intentionally concise and model-focused so implementation can follow it directly.

It should be used with:

- `PARENT_CHILD_RELATIONSHIP_AND_ACCESS_MODEL.md`
- `PARENT_BACKEND_CONTRACT_SPEC.md`
- `PARENT_BACKEND_IMPLEMENTATION_PLAN.md`

## Recommended App

- `apps/parents`

## Model 1. ParentProfile

### Ownership

- one `ParentProfile` belongs to one `AccountProfile`
- one `ParentProfile` belongs to one `Institute`

### Fields

- `id`
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
- `created_at`
- `updated_at`
- `is_active`

### Notes

- `full_name` should be derived
- `notification_preferences` can start as JSON
- `email` should mirror account-level identity but still be queryable here

## Model 2. ParentChildRelationship

### Ownership

- many relationships can point to one parent
- many relationships can point to one student

### Fields

- `id`
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
- `created_at`
- `updated_at`
- `is_active`

### Notes

- `relationship_label` supports custom display naming when needed
- `linked_by`, `approved_by`, and `revoked_by` should point to auth users
- approval trail should not depend only on freeform metadata

## Model 3. ParentAlert

### Ownership

- one alert belongs to one parent profile
- one alert can optionally reference one student and one relationship

### Fields

- `id`
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
- `created_at`
- `updated_at`
- `is_active`

### Notes

- alerts should be queryable by parent, child, type, status, and severity
- this model supports both generated alerts and future manual support alerts

## AccountProfile Integration

Do not add a second identity link back from `AccountProfile`.

Use:

- `ParentProfile.account_profile = OneToOneField(AccountProfile, related_name="parent_profile")`

This keeps the identity graph simple while still allowing reverse access from account to parent profile.

## Why This Structure

This model set supports:

- real family linking
- scoped visibility
- multiple children per parent
- multiple guardians per child
- persisted preferences
- alert workflows

without forcing parent logic into unrelated student or account fields.

## Current Implementation Note

This model structure is now aligned with the implemented backend domain in `apps/parents`, including:

- `ParentProfile`
- `ParentChildRelationship`
- `ParentAlert`

The currently deferred parent features are not blocked by the model structure:

- wallet visibility
- weekly digest delivery
- self-serve parent link claim workflows
