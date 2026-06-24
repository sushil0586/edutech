# Exam Creation Scenario Catalog

## Purpose

This document defines the real-data scenario space for creating exams through:

- platform admin
- institute admin

And through each creation library:

- guided create wizard
- advanced builder
- preset pack library into advanced builder

This is a planning artifact only. It does not claim automated coverage.

## Goal

Verify that exams created through each supported authoring library:

- persist with the expected creation metadata
- are visible in the correct admin and institute workspaces
- can be assigned to students correctly
- become visible to students only when the configured delivery rules allow it

## Confirmed Product Axes

These values are confirmed in the current codebase and should be treated as the baseline scenario axes for automation.

### Roles

- platform admin
- institute admin

### Creation libraries

- guided create wizard
  - `/admin/exams/new`
  - `/institute/exams/new`
- advanced builder
  - `/admin/exams/advanced`
  - `/institute/exams/advanced`
- preset pack library to builder handoff
  - `/admin/exams/preset-packs`
  - `/institute/exams/preset-packs`

### Exam types confirmed in code

- `practice`
- `quiz`
- `mock_exam`

### Source ownership

- platform admin can create:
  - `platform` source exams
  - `institute` source exams
- institute admin can create:
  - `institute` source exams only

### Economy policies confirmed in code

- default or open access
- `entitlement_only`
- `stars_only`
- `stars_or_entitlement`

### Security modes confirmed in code

- `normal`
- `focus`
- `fullscreen`

### Student assignment patterns confirmed in current mutable lanes

- `selected_students` is confirmed live and already used by mutable teacher lanes
- assignment mode is backend-catalog-driven, so automation should enumerate all visible options at runtime and create at least one scenario per exposed option

### Lifecycle states relevant to visibility

- draft
- scheduled
- live

### Student discovery paths already relevant in product

- direct assigned-exam route in student app
- exam key route
- standard student exams workspace visibility

## Scenario Strategy

An exhaustive Cartesian product of every axis would be too large and too brittle for one suite. The scenario catalog should therefore be executed in two layers:

1. Full catalog definition
2. Risk-based automation matrix

The catalog below still lists the complete intended behavior space, but the test matrix groups it into high-value executable cases.

## Full Scenario Catalog

### Platform admin guided create wizard

#### Ownership scenarios

- create `platform` source exam via wizard
- create `institute` source exam via wizard

#### Exam type scenarios

- create `practice` exam via wizard
- create `quiz` exam via wizard
- create `mock_exam` exam via wizard

#### Access policy scenarios

- create open-access exam via wizard
- create `entitlement_only` exam via wizard
- create `stars_only` exam via wizard
- create `stars_or_entitlement` exam via wizard

#### Security scenarios

- create `normal` security exam via wizard
- create `focus` security exam via wizard
- create `fullscreen` security exam via wizard

#### Assignment scenarios

- create and assign via `selected_students`
- create and assign via every other runtime-exposed assignment mode option

#### Visibility scenarios

- created exam visible in `/admin/exams`
- created exam visible in `/institute/exams` when source is `institute`
- created exam not misclassified in institute workspace when source is `platform`
- assigned student sees eligible exam through student exams route when lifecycle allows it
- student can enter via exam key when key entry is enabled

### Platform admin advanced builder

#### Composition scenarios

- create `practice` exam via advanced builder
- create `quiz` exam via advanced builder
- create `mock_exam` exam via advanced builder

#### Ownership scenarios

- create `platform` source exam via advanced builder
- create `institute` source exam via advanced builder

#### Access scenarios

- create open-access advanced exam
- create `entitlement_only` advanced exam
- create `stars_only` advanced exam
- create `stars_or_entitlement` advanced exam

#### Runtime scenarios

- create advanced exam with `normal` security
- create advanced exam with `focus` security
- create advanced exam with `fullscreen` security
- create advanced exam with each runtime assignment mode option

#### Visibility scenarios

- advanced-created exam visible in `/admin/exams`
- advanced-created exam visible in `/institute/exams` when source is `institute`
- advanced-created exam assignable to student from detail or builder workflow
- assigned student can discover the exam through the correct student entry path

### Platform admin preset pack library

#### Library handoff scenarios

- open preset pack from library into advanced builder
- create exam from preset pack under `platform` source
- create exam from preset pack under `institute` source

#### Preset-derived type scenarios

- preset-derived exam persisted with expected exam type
- preset-derived exam persisted with expected security mode
- preset-derived exam persisted with expected economy defaults

#### Post-create scenarios

- preset-derived exam visible in `/admin/exams`
- preset-derived exam visible in `/institute/exams` when source is `institute`
- preset-derived exam can be assigned correctly
- assigned student sees or unlocks exam according to access policy

### Institute guided create wizard

#### Exam type scenarios

- create `practice` exam via institute wizard
- create `quiz` exam via institute wizard
- create `mock_exam` exam via institute wizard

#### Access policy scenarios

- create open-access institute exam
- create `entitlement_only` institute exam
- create `stars_only` institute exam
- create `stars_or_entitlement` institute exam

#### Security scenarios

- create `normal` security institute exam
- create `focus` security institute exam
- create `fullscreen` security institute exam

#### Assignment scenarios

- assign `selected_students`
- assign through every other runtime-exposed assignment mode option

#### Visibility scenarios

- created exam visible in `/institute/exams`
- created exam visible in institute detail view with correct ownership and type labels
- assigned student sees exam when lifecycle allows it
- student exam-key path works when enabled

### Institute advanced builder

#### Composition scenarios

- create `practice` exam via institute advanced builder
- create `quiz` exam via institute advanced builder
- create `mock_exam` exam via institute advanced builder

#### Access and runtime scenarios

- create advanced institute exam with each confirmed economy policy
- create advanced institute exam with each confirmed security mode
- create advanced institute exam with each runtime assignment mode option

#### Visibility scenarios

- advanced-created institute exam visible in `/institute/exams`
- advanced-created institute exam assignable to students
- assigned student can discover it from the correct student route

### Institute preset pack library

#### Library handoff scenarios

- open preset pack into institute advanced builder
- create exam from preset pack
- preserve preset-driven exam type, security, and economy defaults

#### Post-create scenarios

- preset-derived exam visible in `/institute/exams`
- preset-derived exam assignable to students
- student visibility matches lifecycle and access policy

## Common Assertions Required For Every Scenario

Every automated creation scenario should verify all of the following unless the scenario explicitly targets a failure state.

### Creation assertions

- creation succeeds and returns a stable exam id
- exam title and code persist
- expected exam type persists
- expected source ownership persists
- expected access-policy fields persist
- expected security mode persists

### Workspace visibility assertions

- exam is visible in the creator’s exams workspace
- exam card or detail shows the correct exam type label
- exam card or detail shows the correct assignment or assigned-student count

### Assignment assertions

- assignment save succeeds
- assigned students panel reflects the intended learner set
- assignment mode value persists after reload

### Student visibility assertions

- student visibility matches lifecycle state
- student can access the exam only through the intended route
- if access key is enabled, exam key route works
- if economy policy is gated, visibility or unlock state reflects the policy

### Cleanup requirement

- every mutable scenario must delete the created exam
- any created question or template dependency must also be cleaned up if the scenario creates one

## Runtime Enumeration Rules

Some axes are backend-driven and should be enumerated dynamically by the automation rather than hardcoded.

- assignment mode options
- any additional exam types beyond `practice`, `quiz`, and `mock_exam` if the backend catalog expands
- any additional economy policy codes exposed by the catalog
- any additional security modes exposed by the catalog

If the runtime catalog exposes a new value, the scenario generator should treat it as:

- a new scenario candidate in the catalog
- a failing test gap until coverage is intentionally added

## Out Of Scope For The First Automation Round

- every possible cross-product between all lifecycle, access, and runtime toggles
- webcam or third-party proctoring behavior
- payment completion flows for star purchases or subscriptions
- bulk stress coverage over large student rosters

The first round should instead prove:

- every creation library works
- every confirmed exam type works
- every confirmed access-policy family works
- every confirmed security family works
- student assignment and visibility are correct
