# Parent Coverage Matrix

Last updated: 2026-07-13

## Current Read

- Parent role has a dedicated family workspace in the Next.js app.
- Desktop browser coverage is now green for the main parent workspace routes.
- Firefox and WebKit coverage is also green for the main parent workspace routes.
- Compact mobile coverage is now green for the parent dashboard, alerts, and settings surfaces.

## Browser Proof

- `tests/e2e/workflow/parent-browser-coverage.spec.ts`
- `tests/e2e/workflow/parent-mobile-workflow.spec.ts`

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
- Parent mobile compact layout: high
- Parent long-tail alert/progress edge states: medium-high
- Parent cross-browser shell and route coverage: high

## Remaining Gaps

- More seeded child-link and alert-history variants
- More recovery edge cases for relationship-empty states
