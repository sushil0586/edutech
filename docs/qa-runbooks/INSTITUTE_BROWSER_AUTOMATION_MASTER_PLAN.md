# Institute Browser Automation Master Plan

## Goal

Create a complete end-user browser automation strategy for the institute section using Playwright.

This plan is not limited to element visibility. It is meant to validate:

- real user journeys
- real data interpretation
- grid, filter, search, and pagination correctness
- form validation and mutation safety
- UI clarity and layout quality
- broken flows, confusing behaviors, and usability gaps

## Scope

Institute routes currently in scope:

- `/institute/dashboard`
- `/institute/people`
- `/institute/academic-setup`
- `/institute/teacher-assignments`
- `/institute/exams`
- `/institute/exams/new`
- `/institute/exams/advanced`
- `/institute/exams/preset-packs`
- `/institute/exams/[examId]`
- `/institute/exams/[examId]/builder`
- `/institute/question-bank`
- `/institute/question-bank/linked`
- `/institute/question-bank/library-linker`
- `/institute/question-bank/new`
- `/institute/question-bank/import`
- `/institute/question-bank/[questionId]`
- `/institute/question-bank/comprehension/new`
- `/institute/question-bank/comprehension/import`
- `/institute/question-bank/comprehension/[passageId]`
- `/institute/results`
- `/institute/results/attempts`
- `/institute/results/leaderboard`
- `/institute/results/analysis`
- `/institute/results/live`
- `/institute/reports`
- `/institute/reviews`
- `/institute/economy`
- `/institute/security`
- `/institute/settings`
- `/login`

## Testing Principles

Every institute page must be tested from five views:

1. Route health
2. End-user task completion
3. Data correctness
4. UI and usability quality
5. Failure and edge-case behavior

## Required Coverage Model

### 1. Page-level coverage

For every page:

- route opens without console-breaking or visible runtime failure
- heading, context labels, tabs, breadcrumbs, buttons, cards, grids, and filters are usable
- loading state is truthful
- empty state is meaningful
- success and failure messages are understandable
- layout remains readable at normal desktop width and smaller laptop width
- no clipped labels, collapsed controls, overlapping text, hidden CTA, or broken spacing

### 2. Filter coverage

For every filter:

- default value is correct
- single filter use works
- multiple filters together work
- reset/clear restores expected state
- no-result state is meaningful
- URL and summary pills stay truthful where expected
- dropdowns, search inputs, date pickers, and multi-selects are keyboard-usable

### 3. Search coverage

For every search box:

- exact match
- partial match
- lowercase and uppercase
- special characters
- blank input
- no-result state
- result count and visible rows remain correct

### 4. Pagination coverage

For every paginated list or grid:

- first page
- next
- previous
- first/last if available
- page size changes
- total result counts
- last page with fewer rows
- no duplicated or missing rows across pages
- filter + pagination
- search + pagination
- sorting + pagination

### 5. Grid and card-list coverage

For every grid/list:

- column or card headings
- sorting
- row actions
- bulk actions
- long-text handling
- dates, statuses, counts, marks, ranks, and numeric formatting
- meaningful empty state
- horizontal/vertical overflow behavior

### 6. Form coverage

For every create/edit/import/config form:

- required field validation
- invalid value validation
- duplicate data handling
- save/cancel behavior
- success and failure toast or banner
- existing values load correctly in edit flow
- saved record becomes visible in detail/grid/page context

### 7. User journey coverage

Core institute journeys:

- login and logout
- dashboard to people
- dashboard to academic setup
- dashboard to exams
- question authoring
- linked-library review
- shared-library linking
- exam creation via wizard
- exam creation via advanced builder
- exam detail review
- results review and drilldown
- reviews queue operations
- reports navigation
- economy support actions

### 8. Negative coverage

- invalid route
- unauthenticated access
- wrong-role access
- expired session
- no-data state
- no-result filter state
- API failure banner handling
- large dataset behavior
- revoked or paused entitlements

## End-User Execution Order

Run institute coverage in this order:

### P0

- login
- dashboard
- people
- academic setup
- exams list
- exam detail
- exam builder
- question bank
- linked questions
- results

### P1

- question import/export
- comprehension authoring
- reviews
- reports
- teacher assignments
- economy

### P2

- security
- settings
- smaller-screen responsive pass
- network failure and large-data lanes

## Playwright Structure Standard

Institute automation should move toward this structure:

- `tests/e2e/page-objects/institute/`
- `tests/e2e/helpers/`
- `tests/e2e/workflow/institute-*.spec.ts`

Rules:

- page objects should expose user actions, not implementation details
- tests should read like user behavior
- selectors should prefer roles, labels, and stable names
- no hard-coded waits
- assertions should validate user-visible outcomes
- screenshots on failure must stay enabled
- videos on failure are recommended for deep institute workflows

## Recommended Spec Grouping

### Shell and access

- login
- route protection
- sidebar and topbar navigation

### Operational pages

- dashboard
- people
- academic setup
- teacher assignments
- settings

### Assessment pages

- exams list
- quick create
- advanced builder
- preset packs
- exam detail
- builder

### Question-bank pages

- local question inventory
- linked question inventory
- shared library linker
- new question
- import
- detail pages
- comprehension pages

### Results pages

- results overview
- attempts
- leaderboard
- analysis
- live monitor
- reviews

### Governance pages

- economy
- reports
- security

## Reporting Standard

Every issue must include:

- page
- scenario
- steps
- actual result
- expected result
- severity
- category
- screenshot or video path
- suggested fix

Severity:

- Critical
- High
- Medium
- Low

Category:

- Functional
- UI
- UX
- Validation
- Performance
- Pagination
- Filter
- Search
- Data

## Current Reality

The repo already has broad institute coverage, but it is still distributed across many workflow specs. The next improvement is not only more tests, but better organization:

- clearer page-wise ownership
- explicit filter/search/pagination ownership
- dedicated linked-question coverage
- better bug reporting outputs
- page objects for institute-first maintainability

## Deliverables From This Institute Phase

- complete institute browser testing plan
- page-wise institute checklist
- institute Playwright case matrix
- institute bug and usability report template
- first institute page-object structure
- first page-object based institute regression spec
