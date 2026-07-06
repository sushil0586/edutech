# Institute Playwright Case Matrix

## Purpose

This matrix turns the institute browser plan into executable Playwright lanes.

## Core execution lanes

### Lane A: Shell and access

- login success
- login failure
- logout
- route protection
- wrong-role protection
- session persistence
- session expiry fallback

### Lane B: Dashboard and navigation

- dashboard filters
- quick chips
- hero handoffs
- sidebar route sanity
- topbar route sanity

### Lane C: People and academic setup

- roster filters
- roster search
- add/edit validation
- export
- import
- academic setup section switching
- academic setup create/edit/archive/restore
- teacher assignments

### Lane D: Exams

- exam grid filters
- exam grouping
- exam sorting
- exam pagination
- create exam wizard
- advanced builder
- preset pack flow
- exam detail actions
- exam builder actions

### Lane E: Question bank

- local inventory filters and search
- linked inventory filters and search
- linked-only UX
- library linker workflow
- create question
- question detail
- import flow
- comprehension routes
- bulk actions

### Lane F: Results and reviews

- results overview filters
- leaderboard filters and pagination
- attempts filters and pagination
- live monitor
- analysis route
- review queue

### Lane G: Governance

- reports filters
- economy policy visibility
- economy support actions
- security route
- settings route

## Test case naming pattern

Use:

- `@workflow institute <page> <behavior>`
- `@mutable institute <page> <mutation>`
- `@responsive institute <page> <layout>`
- `@negative institute <page> <failure mode>`

## Required assertions per case

Every new case should assert:

- route correctness
- user-visible state change
- truthful filter/search/grid result
- stable CTA visibility
- no fallback or hidden error copy

## Filter matrix template

For each page with filters:

- defaults
- one filter
- two filters together
- reset
- no-result
- filter + pagination
- filter + search
- filter + sort

## Search matrix template

For each searchable page:

- exact term
- partial term
- lowercase
- uppercase
- special chars
- blank input
- unmatched input

## Pagination matrix template

For each paginated page:

- first page
- next
- previous
- last
- page size
- filtered pagination
- searched pagination
- sorted pagination

## Reporting output per spec run

Each institute spec group should generate:

- failed-step screenshot
- trace on retry
- human-readable test title
- route and scenario ownership

## Current ownership suggestion

### Existing specs that can be retained and deepened

- `institute-dashboard-workspace.spec.ts`
- `institute-exams-workspace.spec.ts`
- `institute-question-bank-workspace.spec.ts`
- `institute-question-bank-detail-workspace.spec.ts`
- `institute-question-bank-shared-library-*.spec.ts`
- `institute-results-*.spec.ts`
- `institute-reports-workspace.spec.ts`
- `institute-reviews-workspace.spec.ts`
- `institute-economy-*.spec.ts`
- `institute-academic-setup-mutable.spec.ts`
- `institute-roster-*.spec.ts`

### New page-object based suites recommended

- `institute-end-user-shell.spec.ts`
- `institute-end-user-exams.spec.ts`
- `institute-end-user-question-bank.spec.ts`
- `institute-end-user-results.spec.ts`
- `institute-end-user-governance.spec.ts`

## Priority order for execution expansion

1. question bank linked/local split
2. exams list/detail/builder
3. results overview/leaderboard/attempts
4. people and academic setup
5. economy and reports
6. responsive and failure-mode lanes
