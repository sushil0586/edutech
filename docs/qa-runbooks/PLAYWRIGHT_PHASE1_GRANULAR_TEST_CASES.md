# Playwright Phase 1 Granular Test Cases

Last updated: 2026-07-06

## Purpose

This document defines granular browser test cases for the current Phase 1 Playwright hardening work.

It is intentionally detailed.

The goal is not only to test that actions work, but also that the UI tells the truth clearly through:

- visible labels
- buttons and action availability
- dialogs
- toasts and success banners
- empty states
- state badges
- panel hierarchy
- grouped sections
- filter chips
- stale-state recovery
- layout and visual clarity

This document is the detailed execution companion to:

- [PLAYWRIGHT_BROWSER_9_BENCHMARK_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_BROWSER_9_BENCHMARK_PLAN.md)
- [PLAYWRIGHT_BROWSER_PHASE1_EXECUTION_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_BROWSER_PHASE1_EXECUTION_CHECKLIST.md)

## Test Design Rule

Every important test case should try to cover four layers:

1. functional truth
2. visible UI truth
3. recovery behavior
4. no contradictory controls

Example:

- not only "disable login API succeeds"
- also:
  - disable action is visible before click
  - enable action is not visible before click
  - success feedback is truthful after click
  - row or panel state changes visibly
  - contradictory controls do not remain visible

## Status Legend

- `must`
  - required for the section to move toward `9/10`
- `should`
  - valuable depth and polish coverage
- `later`
  - good expansion, but not blocking Phase 1

## Area 1: Admin Institutes

### A. Route Entry And Baseline Visualization

#### TC-AI-001

- priority: `must`
- title: institutes workspace header and layout render truthfully
- steps:
  1. open `/admin/institutes`
  2. wait for heading and primary table
- assert:
  - route heading is visible
  - selected-profile area is visible
  - institute-admin login section is visible
  - search input is visible
  - active-only toggle is visible
  - institute table is visible
  - add and edit entry points are visible
- visualization detail:
  - selected profile panel should appear visually separate from directory table
  - account-control panel should not be visually merged into search/filter controls

#### TC-AI-002

- priority: `should`
- title: no broken or contradictory initial institute detail state
- steps:
  1. select a visible institute
  2. inspect detail panel
- assert:
  - institute name is visible in detail card
  - institute identity values like code or email are visible
  - account-control area is visible
  - at least one valid account action family is present
  - impossible combination is not present:
    - `create login` together with `reset password`
    - `enable login` together with `disable login`

### B. Add Institute Dialog

#### TC-AI-003

- priority: `must`
- title: add institute dialog visual contract is correct
- steps:
  1. click `Add institute`
- assert:
  - dialog opens
  - dialog heading is correct
  - required fields are visible
  - save button is visible
  - close or cancel control is visible
- visualization detail:
  - title must be specific, not generic like `Dialog`
  - save action should be visually stronger than secondary close action

#### TC-AI-004

- priority: `must`
- title: add institute required-field validation is explicit
- steps:
  1. open add dialog
  2. submit empty form
- assert:
  - form-level validation message appears
  - field-level errors for institute name and code appear
  - dialog remains open
  - entered values are not silently lost if partial input existed
- visualization detail:
  - validation messages should be close enough to fields to be interpretable
  - error text should not be hidden below fold in default desktop viewport

### C. Edit Institute Dialog

#### TC-AI-005

- priority: `must`
- title: edit dialog is prefilled and visually trustworthy
- steps:
  1. select institute
  2. click `Edit selected`
- assert:
  - dialog heading indicates edit mode
  - visible fields are prefilled with current values
  - helper copy or subtext describes the edit scope truthfully

#### TC-AI-006

- priority: `must`
- title: edit institute empty-submit validation stays truthful
- steps:
  1. clear required fields in edit dialog
  2. submit
- assert:
  - required-field errors appear
  - dialog does not close
  - unchanged saved record remains unaffected

### D. Disposable Institute Creation And Detail Truth

#### TC-AI-007

- priority: `must`
- title: disposable institute create flow persists and redirects correctly
- steps:
  1. create a disposable institute
  2. wait for POST response
- assert:
  - creation response succeeds
  - URL includes institute query selection
  - detail card shows created institute name
  - detail card shows created code
  - detail card shows created email if provided
  - detail card shows created description if provided
- visualization detail:
  - updated institute should be visible in the selected detail panel without requiring manual refresh

#### TC-AI-008

- priority: `must`
- title: disposable institute edit visibly updates the selected detail card
- steps:
  1. edit the created institute
  2. wait for PATCH response
- assert:
  - updated name, code, email, and description are visible in the detail card
  - stale old values are not still visible in the selected panel

### E. Institute Account-Control States

#### TC-AI-009

- priority: `must`
- title: no-login state visual contract is correct
- steps:
  1. inspect newly created institute before login creation
- assert:
  - `create login` is visible
  - `reset password` is not visible
  - `disable login` is not visible
  - `enable login` is not visible
  - panel text explains `no linked login` or equivalent truth
- visualization detail:
  - state label must be easy to scan
  - no-success state should not use green or completion-style language

#### TC-AI-010

- priority: `must`
- title: create-login transition updates visible controls truthfully
- steps:
  1. click `create login`
  2. wait for success
- assert:
  - create-login action disappears
  - reset-password action appears
  - disable-login action appears
  - success message references login creation truthfully
  - contradictory controls are absent

#### TC-AI-011

- priority: `must`
- title: reset-password dialog contract is correct
- steps:
  1. click `reset password`
- assert:
  - password dialog heading is correct
  - auto-generate control is visible
  - submit action is visible
  - cancel or close action is visible
- visualization detail:
  - the dialog must make it obvious whether password is typed manually or generated

#### TC-AI-012

- priority: `must`
- title: reset-password success feedback is truthful
- steps:
  1. complete reset-password flow
- assert:
  - success message references password reset
  - account panel stays in active-login state afterward

#### TC-AI-013

- priority: `must`
- title: disable-login transition updates visible state truthfully
- steps:
  1. click `disable login`
  2. wait for success
- assert:
  - disable action disappears
  - enable action appears
  - reset-password remains visible only if product expects it in disabled state
  - success feedback references disabled login truthfully

#### TC-AI-014

- priority: `must`
- title: enable-login transition restores active-login state truthfully
- steps:
  1. click `enable login`
  2. wait for success
- assert:
  - enable action disappears
  - disable action appears
  - success feedback references enabled login truthfully

#### TC-AI-015

- priority: `should`
- title: inactive institute vs active institute action clarity
- steps:
  1. create or identify inactive-state institute path if supported
  2. inspect account actions
- assert:
  - UI does not present impossible controls
  - copy does not imply the institute is active if it is not

### F. Cleanup And Recovery

#### TC-AI-016

- priority: `must`
- title: disposable institute cleanup succeeds without leaving stale selection failure
- steps:
  1. delete disposable institute through cleanup path
- assert:
  - delete succeeds
  - no broken selected detail panel remains
  - route does not stay stuck on missing-resource state

## Area 2: Admin People

### A. Workspace Visualization

#### TC-AP-001

- priority: `must`
- title: people workspace baseline visual contract is correct
- steps:
  1. open `/admin/people`
- assert:
  - institute selector is visible
  - student and teacher view switches are visible
  - create and import actions for current view are visible
  - search field is visible
  - login-status filter is visible
  - sort control is visible
  - roster table is visible

#### TC-AP-002

- priority: `should`
- title: active view and current action set stay visually aligned
- steps:
  1. switch between student and teacher views
- assert:
  - current view is visually active
  - create/import buttons match the selected view
  - no student-only action remains visible in teacher view
  - no teacher-only action remains visible in student view

### B. Teacher Create Dialog

#### TC-AP-003

- priority: `must`
- title: teacher create dialog visual contract is correct
- steps:
  1. open `Create teacher`
- assert:
  - dialog heading is specific
  - employee code, first name, last name, email, phone, specialization fields are visible
  - create-login toggle is visible
  - primary submit action is visible

#### TC-AP-004

- priority: `must`
- title: teacher create required validation is explicit
- steps:
  1. submit empty teacher dialog
- assert:
  - form-level validation appears
  - employee-code required message appears
  - first-name required message appears
  - dialog remains open

#### TC-AP-005

- priority: `should`
- title: teacher invalid-format validation is truthful when supported
- steps:
  1. enter invalid email or invalid phone if product validates it
  2. submit
- assert:
  - error message appears near the field or as clear form feedback
  - invalid value is preserved for correction

### C. Teacher Mutable Account-State Truth

#### TC-AP-006

- priority: `must`
- title: disposable teacher row in no-login state has correct controls
- steps:
  1. create teacher without login
  2. search created teacher row
- assert:
  - `create login` visible
  - `reset password` not visible
  - `disable login` not visible
  - `enable login` not visible
  - row shows truthful access state like `pending access`

#### TC-AP-007

- priority: `must`
- title: create-teacher-login transition updates row truthfully
- steps:
  1. create login for disposable teacher
  2. reload or re-open row through UI
- assert:
  - `create login` disappears
  - `reset password` appears
  - `disable login` appears
  - row shows truthful active access state

#### TC-AP-008

- priority: `must`
- title: disable and enable teacher login update row truthfully
- steps:
  1. disable teacher login
  2. inspect row
  3. enable teacher login
  4. inspect row again
- assert:
  - disabled state shows `enable login` and not `disable login`
  - re-enabled state restores `disable login`
  - contradictory controls are never visible together

### D. Student Create Dialog

#### TC-AP-009

- priority: `must`
- title: student create dialog visual contract is correct
- steps:
  1. open `Create student`
- assert:
  - admission number, first name, academic year, program, cohort, guardian fields are visible
  - create-login toggle is visible
  - submit action is visible

#### TC-AP-010

- priority: `must`
- title: student create required validation is explicit
- steps:
  1. submit empty student dialog
- assert:
  - form-level validation appears
  - admission number required message appears
  - first-name required message appears
  - academic-year required message appears
  - program required message appears

### E. Student Mutable Account-State Truth

#### TC-AP-011

- priority: `must`
- title: disposable student row in no-login state has correct controls
- steps:
  1. create student without login
  2. search created student row
- assert:
  - `create login` visible
  - other account controls hidden
  - row shows truthful pending-access state

#### TC-AP-012

- priority: `must`
- title: student login lifecycle updates row truthfully
- steps:
  1. create login
  2. inspect active row state
  3. disable login
  4. inspect disabled row state
  5. enable login
  6. inspect active row state again
- assert:
  - each transition updates visible actions
  - row access label remains truthful
  - no contradictory action pair appears together

### F. Import Dialogs And Validation

#### TC-AP-013

- priority: `must`
- title: student import dialog guardrails are visually correct before file selection
- steps:
  1. open student import dialog
- assert:
  - download template visible
  - preview disabled before file attach
  - import disabled before preview

#### TC-AP-014

- priority: `must`
- title: invalid student import preview shows failed-row truth clearly
- steps:
  1. upload invalid student CSV
  2. preview import
- assert:
  - preview generated message appears
  - invalid row count is visible
  - exact field error text is visible
  - import-valid-rows action remains blocked or truthful

#### TC-AP-015

- priority: `must`
- title: invalid teacher import preview shows failed-row truth clearly
- steps:
  1. upload invalid teacher CSV
  2. preview import
- assert:
  - preview generated message appears
  - invalid row count is visible
  - exact field error text is visible

### G. CSV Export

#### TC-AP-016

- priority: `should`
- title: export action remains scoped to current view
- steps:
  1. export students CSV
  2. switch to teachers
  3. export teachers CSV
- assert:
  - filenames match selected roster type
  - no student filename is returned from teacher view

## Area 3: Admin Economy

### A. Workspace Visualization

#### TC-AE-001

- priority: `must`
- title: economy workspace lane structure renders truthfully
- steps:
  1. open `/admin/economy`
  2. switch between major tabs
- assert:
  - overview, catalog, access-control, question-bank, support-ops, bootstrap lanes are reachable
  - lane navigation visibly reflects active lane
  - lane-specific panels render without blank or collapsed dead area

#### TC-AE-002

- priority: `should`
- title: focus query and lane handoff remain visually truthful
- steps:
  1. open `focus` deep links
- assert:
  - active lane matches focus target
  - highlighted panel or intended section is visible

### B. Reversible Entitlement Mutation

#### TC-AE-003

- priority: `must`
- title: entitlement narrowing or pause mutation changes visible UI state
- steps:
  1. choose disposable or reversible entitlement target
  2. perform pause or narrowing mutation
- assert:
  - row or panel status changes visibly
  - success feedback is visible
  - updated badge or status text is truthful
  - stale prior state is not still shown

#### TC-AE-004

- priority: `must`
- title: entitlement restore mutation returns visible UI to original state
- steps:
  1. restore the mutated entitlement
- assert:
  - original visible state is restored
  - success message references restore truthfully
  - row does not remain visually stale

### C. Reversible Policy Mutation

#### TC-AE-005

- priority: `must`
- title: reversible policy mutation updates visible summary truth
- steps:
  1. change a policy in a reversible way
  2. refresh lane if needed
- assert:
  - summary panels or policy rows reflect the new value
  - success toast or banner is visible
  - contradictory previous labels are gone

#### TC-AE-006

- priority: `must`
- title: policy restore returns summary and detail panels to original truth
- steps:
  1. restore policy
- assert:
  - UI returns to original policy state
  - success feedback is truthful

### D. Visualization And Stale-State Protection

#### TC-AE-007

- priority: `must`
- title: economy mutation does not leave stale panel data
- steps:
  1. mutate a reversible economy target
  2. inspect summary and row panel
- assert:
  - old and new states are not shown together
  - refreshed row values match the new truth
  - lane remains operable after mutation

## Area 4: Teacher Comprehension

### A. Create Dialog And Visualization

#### TC-TC-001

- priority: `must`
- title: comprehension create route exposes clear authoring structure
- steps:
  1. open teacher comprehension authoring flow
- assert:
  - page heading is specific to comprehension authoring
  - title field is visible
  - passage content editor is visible
  - linked-question section or related authoring area is visible
  - primary save action is visible

#### TC-TC-002

- priority: `should`
- title: comprehension authoring layout remains scannable
- steps:
  1. inspect page before editing
- assert:
  - title and passage editor are visually separated
  - linked question area is distinguishable from passage editor
  - destructive actions are not visually stronger than primary save action

### B. Validation Truth

#### TC-TC-003

- priority: `must`
- title: missing required comprehension inputs fail clearly
- steps:
  1. try to save with missing title or missing passage body
- assert:
  - field or form error is visible
  - error text is understandable
  - editor remains open
  - partially entered text is preserved

### C. Persistence Truth

#### TC-TC-004

- priority: `must`
- title: comprehension create visibly persists title and content
- steps:
  1. create disposable comprehension
  2. reload or revisit detail view
- assert:
  - title persists
  - passage content persists
  - linked visibility or linked count is truthful if shown

#### TC-TC-005

- priority: `must`
- title: comprehension update visibly persists changed content
- steps:
  1. edit created comprehension
  2. save
  3. revisit
- assert:
  - updated content is visible
  - old content is not still shown in the editor or preview

### D. Deterministic Metadata Truth

#### TC-TC-006

- priority: `must`
- title: comprehension assertions do not depend on unstable incidental tags
- steps:
  1. inspect metadata and linked details after save
- assert:
  - test relies on persisted authored values
  - test does not rely on unrelated seeded tag surprises

### E. Optional Archive Or Delete

#### TC-TC-007

- priority: `should`
- title: archive or delete path remains truthful if product supports it
- steps:
  1. archive or delete disposable comprehension
- assert:
  - success feedback visible
  - removed item no longer appears as active content

## Area 5: Institute Descriptive Scoring Mutation

### A. Review Target Visualization

#### TC-ID-001

- priority: `must`
- title: institute descriptive scoring target page clearly distinguishes scoring context
- steps:
  1. open institute descriptive review target
- assert:
  - learner identity is visible
  - exam or attempt identity is visible
  - descriptive answer area is visible
  - score entry control is visible
  - save or submit score action is visible

#### TC-ID-002

- priority: `should`
- title: scoring page hierarchy is understandable from UI alone
- steps:
  1. inspect scoring page
- assert:
  - question content, learner response, and scoring controls are visually distinct
  - current scoring state is visible
  - moderation or publication context is not visually hidden

### B. Scoring Mutation

#### TC-ID-003

- priority: `must`
- title: institute descriptive score save updates visible state truthfully
- steps:
  1. enter or change descriptive score
  2. save
- assert:
  - success feedback is visible
  - saved score is visible after save
  - stale prior score is not still shown

#### TC-ID-004

- priority: `must`
- title: institute descriptive score persists after revisit
- steps:
  1. reopen the same review target
- assert:
  - saved score remains visible
  - moderation or review state matches saved outcome

### C. Publication Or Review-State Continuity

#### TC-ID-005

- priority: `must`
- title: institute-side scoring leaves downstream state truthful
- steps:
  1. save institute-side score
  2. inspect handoff route or summary route
- assert:
  - updated review or publication state reflects the mutation
  - queue or summary does not still show stale pre-score state

## Visualization-Specific Checklist

Apply these checks whenever they fit the route:

### Headers And Titles

- page heading matches the route purpose
- dialog title matches the action
- edit mode and create mode are visually distinguishable

### Buttons And Actions

- primary action is visible and discoverable
- destructive actions are not visually dominant unless intended
- contradictory controls are never visible together
- disabled actions look intentionally disabled, not broken

### Status Badges And Labels

- current state badge matches real state
- disabled state does not use active styling
- no-login state does not use success styling
- success copy does not describe a different outcome than the one executed

### Empty And Error States

- empty state explains why the list is empty
- filtered-empty and true-empty states are not visually identical if they mean different things
- error states expose recovery action when possible

### Panels And Hierarchy

- summary panel and detail panel remain visually separate
- identity information is not mixed into action controls
- advanced controls do not visually compete with the primary task

### Stale-State Protection

- after mutation, old and new truths are not shown together
- toasts and panels agree with each other
- refresh or rerender does not regress visible truth

## Immediate Next Execution Slice

If we follow this document in the current order, the next concrete coverage slice should be:

1. `TC-AP-006` to `TC-AP-012`
2. `TC-TC-001` to `TC-TC-006`
3. `TC-ID-001` to `TC-ID-005`
4. `TC-AE-003` to `TC-AE-007`

That sequence gives the best benchmark movement for the least wasted overlap.
