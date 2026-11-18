# Parent Coverage Matrix

Last updated: 2026-09-01

## Current Read

- Parent role has a dedicated family workspace in the Next.js app.
- Current-cycle parent release coverage is green for a seeded linked-child demo workspace.
- Desktop browser coverage is green for the main parent workspace routes.
- Firefox and WebKit coverage is green for the main parent workspace routes.
- Compact mobile coverage is green for the parent dashboard, alerts, and settings surfaces.
- Parent API/boundary coverage is green for children, dashboard, progress, alerts, preferences, invalid filter rejection, and invalid child-scope denial.

## Browser Proof

- `tests/e2e/workflow/parent-browser-coverage.spec.ts`
- `tests/e2e/workflow/parent-api-audit.spec.ts`
- `tests/e2e/workflow/parent-mobile-workflow.spec.ts`

Repeatable command:

- `npm run test:e2e:release:parent-core`

## Covered Routes

- `/parent/dashboard`
- `/parent/children`
- `/parent/progress`
- `/parent/alerts`
- `/parent/settings`
- `/parent/search`

## Confidence

- Parent shell and core family-workspace actions: high
- Parent settings mutation path: high
- Parent alert mutation and child-scope boundary checks: high
- Parent mobile compact layout: high
- Parent long-tail alert/progress edge states: medium-high
- Parent cross-browser shell and route coverage: high

## Remaining Gaps

- More multi-child and relationship-permission variants
- More recovery edge cases for relationship-empty states
