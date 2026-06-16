# Parent Backend Contract Spec

## Purpose

This document defines the backend contract required for the real parent product experience.

It does not assume that every endpoint already exists.

Instead, it separates:

- what exists now
- what must be added
- what the parent frontend should depend on

This file should be used together with:

- `PARENT_CHILD_RELATIONSHIP_AND_ACCESS_MODEL.md`
- `NEXORA_PARENT_MODULE_SOURCE_OF_TRUTH.md`
- `PARENT_PHASE_WISE_IMPLEMENTATION_PLAN.md`

## Current Backend Reality

### Already Available

- parent role in `AccountProfile`
- parent public registration
- parent login and session routing
- parent registration context fields
- institute-scoped account storage

### Missing For Real Parent Product

- dedicated `ParentProfile`
- relationship records linking parent to student
- parent-safe child list endpoint
- parent dashboard summary endpoint
- parent alert endpoint
- parent settings persistence endpoint
- parent wallet visibility endpoint

## Design Principle

Parent frontend should not call student-only endpoints directly.

Even if the backend data source eventually comes from student services, the API contract exposed to parent should be:

- parent-safe
- relationship-scoped
- intentionally reduced

## Recommended Backend Domain Direction

Two valid patterns are acceptable:

### Option A. Extend `apps/accounts`

Use `apps/accounts` for:

- parent profile
- parent relationship management
- parent summary endpoints

### Option B. Add `apps/parents`

Create a dedicated `apps/parents` domain for:

- parent profile
- relationship models
- parent serializers
- parent views
- parent services

Recommended direction:

- prefer `apps/parents` if parent scope is expected to grow significantly
- otherwise `apps/accounts` is acceptable for the first parent phase

## Required Model Contracts

### ParentProfile

Must support:

- one-to-one mapping to `AccountProfile`
- institute scope
- contact details
- notification preferences
- active state

### ParentChildRelationship

Must support:

- one parent to many children
- one child to many parents
- relationship type and status
- permission flags
- approval metadata
- auditability

## Required Serializer Contracts

### 1. Parent Session Serializer

Returned by `/api/v1/auth/me/` for parent accounts.

Should include:

- parent display name
- parent profile id
- linked child count
- high-level parent context

Suggested shape:

```json
{
  "id": "account-profile-id",
  "role": "parent",
  "display_name": "Rakesh Sharma",
  "institute": "institute-id",
  "parent_context": {
    "parent_profile_id": "parent-profile-id",
    "linked_children_count": 2,
    "has_active_links": true
  }
}
```

### 2. Linked Children List Serializer

Endpoint example:

- `GET /api/v1/parent/children/`

Should include:

- child identity
- relationship label
- relationship permissions
- academic context
- lightweight status

Suggested fields:

- `relationship_id`
- `student_id`
- `student_name`
- `admission_no`
- `program_name`
- `academic_year_name`
- `cohort_name`
- `relationship_type`
- `is_primary_contact`
- `permissions`
- `is_active`

### 3. Parent Dashboard Summary Serializer

Endpoint example:

- `GET /api/v1/parent/dashboard/summary/?child_id=<id>`

Should include:

- child identity
- recent progress snapshot
- recent exam summary
- weak-area summary
- unread or active alert counts

Suggested fields:

- `child`
- `recent_results`
- `progress_summary`
- `weak_subjects`
- `weak_topics`
- `alert_summary`

### 4. Parent Progress Serializer

Endpoint example:

- `GET /api/v1/parent/progress/?child_id=<id>`

Should include:

- recent results
- trend lines or aggregated metrics
- subject-wise performance
- weak-area movement

This endpoint should not expose excessive attempt-detail data unless explicitly approved.

### 5. Parent Alerts Serializer

Endpoint example:

- `GET /api/v1/parent/alerts/?child_id=<id>`

Should include:

- alert type
- severity
- child id
- message
- created_at
- status
- metadata needed for parent display

Suggested alert types:

- `score_drop`
- `inactivity`
- `milestone`
- `result_published`
- `exam_risk`

### 6. Parent Preferences Serializer

Endpoint example:

- `GET /api/v1/parent/preferences/`
- `PATCH /api/v1/parent/preferences/`

Suggested fields:

- `score_drops`
- `inactivity`
- `milestones`
- `weekly_summary`
- `result_published`
- `high_risk_exam_integrity`

### 7. Parent Wallet Visibility Serializer

Endpoint example:

- `GET /api/v1/parent/wallet/?child_id=<id>`

This endpoint is optional and should only exist if product approves parent visibility into wallet and access state.

Suggested fields:

- `available_stars`
- `active_subscription_summary`
- `recent_unlocks`
- `pending_access_constraints`

This should be visibility-only in the first parent phase.

## Required Endpoint Set

Minimum recommended parent endpoint set:

- `GET /api/v1/parent/children/`
- `GET /api/v1/parent/children/<child_id>/`
- `GET /api/v1/parent/dashboard/summary/`
- `GET /api/v1/parent/progress/`
- `GET /api/v1/parent/alerts/`
- `GET /api/v1/parent/preferences/`
- `PATCH /api/v1/parent/preferences/`

Optional later endpoint:

- `GET /api/v1/parent/wallet/`

Admin linking endpoints should also exist, likely under admin or institute domains:

- `POST /api/v1/admin/parent-links/`
- `PATCH /api/v1/admin/parent-links/<id>/`
- approval and revoke actions as needed

## Permission Rules

All parent endpoints must require:

- authenticated user
- active `AccountProfile`
- role = `parent`
- active `ParentProfile`

Any child-scoped response must additionally require:

- an active parent-child relationship
- same institute scope where applicable
- feature permission flags to allow that visibility

## Scope Service Requirement

Create a reusable service or queryset helper such as:

- `scope_parent_child_relationship_queryset(user)`
- `scope_parent_student_queryset(user)`

The parent frontend should never depend on ad hoc filtering in every view.

## Recommended Service Layer Responsibilities

Implement logic in services, not scattered in views:

- resolve linked children
- resolve selected-child access
- build parent dashboard summary
- build parent alert list
- persist parent preferences
- enforce visibility flags

## Notification Generation Direction

Parent alerts should come from backend business rules, not frontend inference.

Potential producers:

- result publication
- score drop detection
- inactivity thresholds
- improvement milestones
- exam integrity risk summaries if approved

## Backward Compatibility Rule

Until these endpoints exist:

- parent dashboard remains informational only
- parent settings remain local-only or clearly temporary
- no frontend screen should pretend live child data exists

## Delivery Sequence

Recommended backend implementation order:

1. models
2. serializers
3. scoped query helpers
4. children list endpoint
5. dashboard summary endpoint
6. preferences endpoint
7. alerts endpoint
8. optional wallet visibility endpoint

## Definition Of Ready For Parent Frontend

The frontend parent implementation can move beyond foundation mode when:

- relationship model exists
- parent-safe child list endpoint exists
- dashboard summary endpoint exists
- preferences persistence endpoint exists
- permission enforcement is tested
