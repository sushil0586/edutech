# Role Visual QA Matrix

## Purpose

This matrix defines the browser-based visual contract for teacher and institute workspaces.
The goal is professional release quality:

- no misaligned buttons
- no broken card spacing
- no clipped headings
- no collapsed filter bars
- no malformed modal or queue layouts
- no visual drift in the most important decision surfaces

## Visual QA Principles

- Every major workspace must have at least one desktop visual contract.
- Every high-density filter surface must have a dedicated screenshot assertion.
- Every page with primary KPI cards or queue cards must snapshot at least one representative card region.
- Empty states and loaded states should be treated as separate valid visual modes.
- Route handoff tests and visual tests should complement each other.
- Screenshot baselines are allowed to change only when the UI change is intentional.

## Teacher Section

### Teacher Dashboard

Route: `/teacher/dashboard`

Visual zones:
- dashboard filter controls card
- KPI summary grid
- first dashboard panel or insight lane
- quick filter row

Functional visual checks:
- combobox alignment
- quick filter chip wrapping
- KPI card vertical rhythm
- panel heading and body spacing

### Teacher Exams

Route: `/teacher/exams`

Visual zones:
- exam filters card
- first exam card
- empty-state card when filters return zero items

Functional visual checks:
- CTA alignment for `Quick Create`, `Advanced Builder`
- status pill alignment inside cards
- grouped and ungrouped list spacing

### Teacher Results

Route: `/teacher/results`

Visual zones:
- results filter controls
- readiness summary strip
- first workflow card or result card

Functional visual checks:
- grouped action links alignment
- publish readiness sections
- leaderboard and live-monitor handoff cards

### Teacher Reviews

Route: `/teacher/reviews`

Visual zones:
- review filters form
- first review task card
- scoped queue header when exam-scoped

Functional visual checks:
- filter row alignment
- pagination control layout
- review task CTA alignment

### Teacher Question Bank

Route: `/teacher/question-bank`

Visual zones:
- workspace header
- filter and search controls
- first question card or table row
- authoring entry CTA group

Functional visual checks:
- search and filter density
- card action consistency
- library/import/create CTA balance

## Institute Section

### Institute Dashboard

Route: `/institute/dashboard`

Visual zones:
- dashboard focus filter card
- KPI grid
- first priority lane card
- quick filter strip

Functional visual checks:
- focus and sort controls alignment
- lane card spacing
- dashboard command links alignment

### Institute Exams

Route: `/institute/exams`

Visual zones:
- exam filters card
- first exam card
- empty-state or no-match state

Functional visual checks:
- teacher selector alignment
- status/sort/group/page-size control row
- card meta and badge balance

### Institute Results

Route: `/institute/results`

Visual zones:
- results filter controls
- readiness summary strip
- first result card or grouped card

Functional visual checks:
- grouped publication layout
- exam/result readiness card spacing
- cross-route navigation utility alignment

### Institute Reviews

Route: `/institute/reviews`

Visual zones:
- review filters form
- first review card
- exam-scoped queue header

Functional visual checks:
- assignment and status filter alignment
- search box width and button spacing
- queue card CTA consistency

### Institute Reports

Route: `/institute/reports`

Visual zones:
- reports filter controls
- summary hero or KPI strip
- first report card/table region

Functional visual checks:
- filter-to-action alignment
- export/report controls consistency

### Institute Question Bank

Route: `/institute/question-bank`

Visual zones:
- filter/search controls
- first question card or row
- authoring entry CTA cluster

Functional visual checks:
- dense content layout stability
- import/create/library controls
- question metadata spacing

## Recommended Playwright Layers

### Layer 1: Release Visual Contracts

Small, high-signal screenshots for:
- filter cards
- KPI strips
- first primary content card

### Layer 2: Workspace Browser Coverage

Behavior and truthfulness checks for:
- filter hydration
- quick filters
- reset flows
- empty-state correctness

### Layer 3: Mobile Visual Contracts

For dense pages only:
- reviews
- reports
- question bank
- practice/results-heavy dashboards

## Current Focus

Immediate browser-based visual contract pack:
- teacher dashboard
- teacher exams
- teacher reviews
- institute dashboard
- institute exams
- institute reviews

Next expansion:
- teacher results
- teacher question bank
- institute results
- institute reports
- institute question bank

## Completed On July 18, 2026

The following teacher and institute desktop visual contracts are now implemented and verified through Playwright:

- teacher dashboard
- teacher exams
- teacher reviews
- teacher results overview and lane surfaces
- teacher question bank
- institute dashboard
- institute exams
- institute reviews
- institute reports
- institute question bank

Verification status:
- Playwright desktop visual contract pack passed
- Current result: `10 passed`

## Next Best Phase

After this visual test milestone, continue the same contract style for the remaining dense operator pages.

### Phase 1: Teacher Dense Detail Pages

- `teacher/results/live`
- `teacher/exams/[id]`
- `teacher/question-bank/detail`

Expected visual contract targets:
- header and action strip alignment
- workflow/status banners
- dense detail cards
- side panels, evidence panels, or metadata rails
- footer CTA groups

### Phase 2: Institute Dense Detail Pages

- `institute/results/*`
- `institute/exams/[id]`
- `institute/question-bank/detail`

Expected visual contract targets:
- filter and scope controls
- hero/action lane
- readiness or KPI strips
- dense result/detail cards
- drilldown and navigation consistency

### Phase 3: Mobile Visual Contracts

Apply the same visual contract depth to mobile for the highest-density operator pages:

- teacher dense detail pages
- institute dense detail pages
- reviews-heavy flows
- results-heavy flows
- question-bank detail and action-heavy flows

Expected mobile checks:
- stacked control alignment
- button wrapping and spacing
- card padding consistency
- no clipped labels, pills, or CTAs
- no horizontal overflow

## Working Note

These phases are intentionally sequenced after the completed teacher/institute desktop pack so the next effort starts from a stable visual baseline rather than reopening already verified surfaces.
