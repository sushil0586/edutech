# Nexora Learn Architecture Notes

## Current Goal

Nexora Learn is in a pilot-hardening phase. The current architecture should stay education-product focused and extensible without expanding into ERP-style modules.

Current product areas:

- academic setup
- question bank
- exams
- student attempts
- results
- analytics
- notifications
- teacher/student workflows
- rich content questions
- mobile/web experience

Future education-product modules may be added as adjacent domains:

- homework
- content library
- report cards
- parent app
- live classes
- attendance

ERP modules remain explicitly out of scope for the current architecture phase:

- fees
- transport
- hostel
- payroll

## Backend Shape

The backend remains a modular Django monolith with domain apps. This is intentional for pilot speed, cross-domain consistency, and easier operations.

Core conventions:

- domain apps own models, serializers, views, tests, and services
- shared cross-cutting logic belongs in `common/`
- workflow orchestration belongs in service modules, not model `save()` methods
- tenant scoping belongs in account scope helpers, not duplicated raw object fetches
- action endpoints should prefer explicit service calls plus audit logging

Key hardening additions in this phase:

- capability helpers in `apps/accounts/capabilities.py`
- scoped object lookup helpers in `apps/accounts/scopes.py`
- standardized action responses in `common/responses.py`
- soft-delete viewset mixin in `common/viewsets.py`

## Frontend Shape

The frontend remains feature-sliced by domain with shared app/router/network layers.

Core conventions:

- repositories isolate API details and normalization
- providers should be narrowly scoped and `autoDispose` where practical
- very large pages should gradually extract dialogs, refresh helpers, and selection helpers
- UI structure should stay stable during hardening; extraction is for maintainability, not redesign

This phase extracted refresh/selection helpers from the largest admin-facing pages to reduce repetition before future module growth.

## Service-Layer Conventions

Use services for:

- workflow execution
- notification dispatch
- analytics/result generation
- publish/cancel flows
- bulk actions
- audit-log emitting orchestration

Avoid:

- model `save()` methods that create notifications or trigger cross-app workflows
- hidden side effects that make tests and future modules harder to reason about

## API Response Conventions

Preferred response rules:

- list endpoints return `{ "count": <int>, "results": [...] }`
- detail endpoints return the serialized object directly
- action endpoints return `{ "success": <bool>, "message": <string>, "data": ... }`

Normalization should be gradual and backward-conscious. Repository-layer parsing is preferred over broad UI rewrites.

## Future Module Guidance

Future modules should be added as education-focused siblings, not as a generalized school ERP foundation.

Before adding a new module:

- confirm tenant ownership and institute boundaries
- define capability usage before view wiring
- keep workflows in services
- prefer `is_active` lifecycle handling for core academic records
- avoid embedding unrelated concerns into existing apps like `results` or `reports`

## Non-Goals

This hardening phase does not introduce:

- microservices
- a full RBAC platform
- ERP modules
- AI-first workflows
- a broad UI redesign
