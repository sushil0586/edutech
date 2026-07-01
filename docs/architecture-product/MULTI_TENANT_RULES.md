# Nexora Learn Multi-Tenant Rules

## Ownership Model

The institute is the primary tenant boundary for the current product.

Most core education entities must be directly tenant-owned or derivable through a tenant-owned parent:

- academic years
- programs
- cohorts
- subjects
- topics
- students
- teachers
- questions
- exams
- attempts
- results
- notifications

## Access Model

Use scoped querysets first, then resolve objects from those querysets.

Expected access behavior:

- `platform_admin`: full access
- `institute_admin`: access only within their institute
- `teacher`: access only within their institute and only where the capability allows
- `student`: access only to their own records and student-visible workflows
- `parent`: reserved for future expansion; do not over-grant by default

## Endpoint Rules

Every workflow/action endpoint must follow these rules:

1. Determine caller profile and active status.
2. Build the scoped queryset for the relevant model.
3. Resolve the object from the scoped queryset.
4. Apply capability checks.
5. Execute the workflow through a service.
6. Return a normalized response.

Do not:

- fetch tenant-owned objects by UUID from unrestricted managers
- trust frontend filtering for access control
- let teacher routes imply teacher write access everywhere

## Lifecycle Policy

Core academic entities should prefer archive-style lifecycle handling through `is_active`.

Default expectation:

- disable/archive core academic records rather than hard-delete them
- preserve history for attempts, results, analytics, and future report-card style workflows

Hard delete is acceptable only for:

- temporary imports
- non-critical transient artifacts
- explicitly disposable helper records with no reporting/history value

## Service-Layer Rule

Cross-app actions should happen through services, not model hooks.

Examples:

- question save should not directly create notifications inside the model
- publish flows should call notifications/audit services explicitly
- analytics recomputation should remain a deliberate workflow action

## Future Expansion Guidance

Modules such as homework, content library, report cards, parent app, live classes, and attendance should follow the same tenant/capability/lifecycle rules.

ERP areas such as fees, transport, hostel, and payroll are long-term possibilities only and should not influence current ownership or permission decisions.
