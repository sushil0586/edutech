# UI/UX Audit

## Scope

Read-only inspection of web and mobile UI source. No visual browser run was performed in this discovery pass.

## UI Surface Summary

| Product surface | Evidence | State |
| --- | --- | --- |
| Marketing | `edutech_web/src/app/(marketing)`, `src/lib/site-content.ts` | Static / Placeholder-oriented |
| Auth | `edutech_web/src/app/(auth)`, auth components | Partial / Not Verified |
| Admin console | `edutech_web/src/app/(admin)/admin`, `src/components/admin` | Partial / Not Verified |
| Institute console | `edutech_web/src/app/(institute)/institute` | Partial / Not Verified |
| Teacher console | `edutech_web/src/app/(teacher)/teacher` | Partial / Not Verified |
| Student web app | `edutech_web/src/app/(student)/app`, `src/components/ui/student-*` | Partial / Not Verified |
| Parent portal | `edutech_web/src/app/(parent)/parent`, `src/components/parent` | Partial / Not Verified |
| Mobile app | `nexora_student_mobile/app`, `src/components`, `src/theme` | Partial / Not Verified |

## Positive UI Evidence

- Role-specific layouts exist for admin, institute, teacher, student, and parent.
- Student navigation covers dashboard, tests, results, practice, attempts, analytics, reports, weak areas, alerts, wallet, subscriptions, profile, and settings.
- Operator routes include dense workflows for institutes, people, academic setup, economy, exams, question bank, results, reviews, reports, security, settings, and search.
- Components exist for state panels, page headers, filters, result reports, question prompts, attempt controls, import workspaces, and mobile shells.
- Accessibility/keyboard workflow specs exist under `edutech_web/tests/e2e/workflow/accessibility-keyboard-workflows.spec.ts`.

## UX Risks And Gaps

| Priority | Finding | Evidence | Classification |
| --- | --- | --- | --- |
| P0 | Student exam availability can fail after provisioning/assignment. | Latest Playwright error context shows "This exam is not available in your workspace." | Broken |
| P1 | Broad UI surface has no current passing visual/accessibility evidence in this audit. | Many visual specs exist, but last-run artifact is failed. | Not Verified |
| P1 | Placeholder styling and skeleton-like UI are used in many pages. | `placeholderDot`, `placeholderPanel`, `placeholderGrid` in app source/CSS. | Partial / Placeholder |
| P1 | Marketing content is static and product-claim heavy. | `edutech_web/src/lib/site-content.ts`. | Placeholder/Mock |
| P1 | Some pages may degrade to configuration-required states when API base URL is missing. | Several pages and API clients check `API_BASE_URL`. | Partial |
| P2 | Large route surface increases navigation consistency risk. | 125 page routes across role groups. | Not Verified |
| P2 | Mobile UX not execution-verified. | Mobile screens and Maestro scripts exist, but no current result artifacts found. | Not Verified |

## Navigation Audit

Implemented route groups:

- Public: `/`, `/[slug]`
- Auth: `/login`, `/register`, `/signup`, `/complete-profile`
- Admin: `/admin/*`
- Institute: `/institute/*`
- Teacher: `/teacher/*`
- Student: `/app/*`
- Parent: `/parent/*`

Broken/disconnected navigation was not exhaustively browser-tested in this pass. Source evidence shows many anchor links to intra-page sections and many role-specific pages. These require a route crawl with network and console capture before release.

## Static / Dummy / Placeholder Areas

Confirmed static or placeholder-oriented evidence:

- Marketing copy and testimonials in `edutech_web/src/lib/site-content.ts`.
- Placeholder CSS/classes in `edutech_web/src/app/globals.css`.
- Several student/report pages render placeholder dots and empty-state cards.
- Question blueprint folders for class 8/9/10 explicitly indicate placeholder future expansion.

Not all placeholders are defects; some are loading/empty-state UI. They must be separated during visual certification into valid skeletons vs unfinished product content.

## Accessibility And Responsive Design

Evidence:

- Accessibility test file exists.
- Mobile/operator visual specs exist.
- Web uses semantic routes and many role/button labels in Playwright selectors.

Not verified:

- Current WCAG pass/fail.
- Keyboard completion across all CRUD and attempt workflows.
- Mobile viewport clipping/overlap.
- Screen-reader naming consistency.

P1 certification requirement: run accessibility/keyboard suite and a responsive visual crawl for student, teacher, institute, admin, and parent critical paths.

## Recommended UI/UX Certification Sequence

1. Route crawl all 125 pages by role with authenticated fixtures.
2. Capture console, network, 404/500, hydration, and layout errors.
3. Validate P0 student exam lifecycle UI after backend fix.
4. Run role-specific mobile viewport smoke.
5. Run accessibility keyboard workflows.
6. Run visual snapshot specs only after functional smoke passes.
7. Review static marketing and placeholder states against product requirements.
