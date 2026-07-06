# Institute Page-Wise Browser Checklist

## How to use this checklist

Run this checklist page by page as manual QA guidance and as automation acceptance criteria.

## Current prerequisite note

- confirm one valid institute login works locally before treating Playwright route failures as product bugs
- if login fails on `/login` with `Invalid credentials`, record it as an auth/test-data blocker first
- only after login is stable should route-level observations be marked against institute pages

## `/login`

- page opens without runtime error
- username and password fields are visible and usable
- invalid login shows clear error
- valid institute login redirects to institute workspace
- password show/hide works
- enter key submits correctly
- wrong-role login does not land in institute route incorrectly

## `/institute/dashboard`

- page heading and workspace context are visible
- dashboard filters work
- quick chips update state truthfully
- cards and sections load without overlap
- handoffs to people, academic setup, exams, and reviews work
- empty or missing data surfaces are understandable
- cards remain readable on smaller widths

## `/institute/people`

- students and teachers views are visible
- search works
- institute-scoped filters work
- status filters work
- create dialogs open and validate properly
- export action works if available
- import action works if available
- row actions open correct panels
- pagination behaves correctly
- no clipped controls in roster tables

## `/institute/academic-setup`

- section switching works
- academic years, programs, cohorts, subjects, topics render correctly
- filters and institute scope stay truthful
- add/edit/archive flows validate correctly
- default tab, master defaults, and onboarding blocks are readable
- date fields and dropdowns are aligned
- no compressed labels on dense forms

## `/institute/teacher-assignments`

- create assignment dialog opens
- edit assignment dialog preloads values
- required field validation works
- archive/restore if available works
- row state updates correctly

## `/institute/exams`

- list opens without route error
- filters work individually and together
- quick filter chips work
- zero-state wording is useful
- sorting is correct
- grouping is correct
- pagination is correct
- card actions open exam detail and builder
- quick create, advanced builder, preset library handoffs work
- no broken card spacing or overflow

## `/institute/exams/new`

- wizard loads correctly
- required fields validate
- dependent fields enable/disable correctly
- step navigation is clear
- save/create path shows clear result
- cancel/back behavior is safe

## `/institute/exams/advanced`

- advanced builder opens correctly
- entitlement gating is truthful
- stage rail is understandable
- stage transitions work
- presets and templates behave correctly
- buttons are placed clearly
- no dense or confusing control clusters

## `/institute/exams/preset-packs`

- preset list loads
- filters and search work
- open preset actions work
- empty state is meaningful
- pagination and sorting are correct if present

## `/institute/exams/[examId]`

- details load without mismatch
- exam metadata is visible and readable
- readiness cards are truthful
- action buttons work
- publish/access controls behave correctly
- history and status panels are readable
- no misleading status copy

## `/institute/exams/[examId]/builder`

- builder loads current exam
- section management works
- linked question handoff works
- save/update behavior is clear
- no lost-state confusion
- preview or export actions behave correctly if present

## `/institute/question-bank`

- page loads correctly
- search works across text and case combinations
- all filters work
- reset works
- local rows render correctly
- details expand/collapse works
- pagination works
- bulk actions validate correctly
- create/import/comprehension actions navigate correctly
- no clutter or visually confusing filter density

## `/institute/question-bank/linked`

- linked-only page shows separate context clearly
- open shared library linker handoff works
- back to local bank works
- create local question works
- linked-only filters behave correctly
- no local-authoring-only bulk actions appear
- linked row explanation is clear
- read-only linked state is understandable
- duplicate/create-editable-copy flow is understandable

## `/institute/question-bank/library-linker`

- page opens only when allowed
- entitlement state is truthful
- filters and search work
- topic-wise linking flow is understandable
- link action confirms success/failure clearly
- quota exhausted and paused states show meaningful guidance
- pagination works

## `/institute/question-bank/new`

- form opens cleanly
- program/subject/topic dependencies work
- validation is clear
- save/cancel behavior works
- saved question appears in inventory

## `/institute/question-bank/import`

- CSV import UI is understandable
- template/download actions work if available
- invalid file handling is clear
- preview/finalize flow is safe
- success and failure messaging is clear

## `/institute/question-bank/[questionId]`

- detail opens correctly
- metadata formatting is readable
- edit/copy actions work
- linked/local state is clear

## Comprehension routes

- new comprehension page validates correctly
- import page handles file/preview/finalize safely
- detail page loads passage and child questions clearly

## `/institute/results`

- overview loads
- summary KPIs are truthful
- exam/result filters work
- grouped views are correct
- publish-readiness messaging is understandable
- drilldowns to attempts/leaderboard/analysis work
- no broken summary cards

## `/institute/results/attempts`

- attempts filters work
- paging works
- inspect attempt route works
- empty-state behavior is meaningful
- no duplicate rows across pagination

## `/institute/results/leaderboard`

- leaderboard loads
- filters and sort work
- pagination works
- rank/marks/attempt formatting is consistent
- empty state is meaningful

## `/institute/results/analysis`

- analysis view loads
- filters and subject switches work
- charts/cards remain readable
- drilldowns remain scoped correctly

## `/institute/results/live`

- live route opens
- exam/attempt focus works
- live panels are understandable
- no stale action buttons
- empty live state is truthful

## `/institute/reviews`

- queue loads
- pending/reviewed filters work
- paging works
- open task works
- review action updates state correctly
- validation is clear for marks/comments if applicable

## `/institute/reports`

- page opens correctly
- filters and quick chips work
- report cards and sections are understandable
- drilldowns and handoffs work
- formatting of metrics is consistent

## `/institute/economy`

- page loads without broken cards
- institute-scoped support actions are understandable
- order/support/wallet sections are readable
- policy state is truthful
- action buttons are enabled only when allowed

## `/institute/security`

- page opens correctly
- filters work
- grouped sections are understandable
- watch or live state is truthful
- layout remains readable under dense data

## `/institute/settings`

- page opens correctly
- profile/defaults/settings controls load
- forms validate properly
- saved state persists correctly
- layout is readable and not squeezed
