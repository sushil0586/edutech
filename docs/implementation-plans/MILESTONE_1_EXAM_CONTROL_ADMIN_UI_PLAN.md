# Milestone 1 Exam Control Admin UI Plan

## Goal

Finish the admin-facing controls needed to operate slot-managed exams safely.

## Current UI foundation

Already present:

- exam detail page has slot create/update controls
- exam detail page has student slot override action
- exam builder already exposes exam-level schedule fields

Primary existing surface:

- `edutech_web/src/app/(admin)/admin/exams/[examId]/page.tsx`

## Required admin surfaces

### 1. Exam delivery mode control

Add explicit exam delivery configuration:

- access mode
- management mode source
- legacy/global vs slot-managed vs long-window vs platform-event

This should live in:

- exam detail page
- or exam builder runtime section

### 2. Slot management panel

Expand the current slot section into a first-class operations panel.

Must support:

- create slot
- edit slot
- pause slot
- resume slot
- duplicate slot
- view occupancy
- view assignment pressure

### 3. Student override panel

Current override action should evolve into:

- searchable student selector
- current effective slot display
- override history
- move to another slot
- clear override
- reopen access

### 4. Readiness and guardrail panel

Admin should see clear warnings for:

- exam marked `slot_managed` with no slots
- slot with impossible capacity
- slot outside exam schedule when policy forbids it
- selected students missing slot assignment when slot is mandatory
- exam published without runtime-ready access configuration

### 5. Support incident controls

Required actions:

- pause exam starts
- reopen one student
- sponsor access for one student
- restore one consumed allowance

These may live in:

- exam detail page
- support-ops economy page

## Recommended screen changes

### Exam builder

Use runtime section for:

- exam access mode
- exam timing model
- legacy compatibility setting

### Exam detail

Use for operational controls:

- slots
- occupancy
- overrides
- live status
- support actions

## UI state requirements

Show:

- effective student count per slot
- in-progress starts per slot
- slot grace rule
- start capacity
- assignment capacity
- blocked reason count once available

## Pilot-first scope

Must-have for pilot:

- create and edit slots
- assign students to slots
- override one student
- inspect slot occupancy
- clear warnings when slot setup is incomplete

Can wait for later:

- bulk move between slots
- drag-and-drop schedule board
- bulk sponsor operations
- richer incident console

## UI delivery order

1. add access mode selector
2. harden slot management panel
3. harden student override panel
4. add readiness warnings
5. add support incident controls
