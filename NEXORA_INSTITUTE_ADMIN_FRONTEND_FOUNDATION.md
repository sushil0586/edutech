# Nexora Institute Admin Frontend Foundation

## Objective

Define how the institute admin section should look and behave before implementation starts.

The institute admin module must visually belong to the same family as student and teacher.

## Non-Negotiable UI Rules

- use the same global CSS system already used by student and teacher
- use the same shared sidebar and topbar idea
- use the same card, pill, section-heading, and metric language
- keep background, contrast, spacing, and typography aligned
- only the center workspace content should change by route

## Shared Shell Contract

Every institute page should use:

- shared sidebar
- shared topbar
- shared page-width rhythm
- shared content card system
- shared action bar patterns
- shared form section styling

Institute admin should not use one-off layout systems unless a route has a very specific operational need.

## Sidebar Structure

The final institute sidebar should support:

- Dashboard
- People
- Academic Setup
- Question Bank
- Exams
- Results
- Reports
- Economy
- Settings

Routes can ship in phases, but the navigation direction should be planned from the beginning.

## Topbar Contract

The topbar should provide:

- role label
- institute context
- optional quick actions
- consistent workspace summary
- same visual tone as teacher and student topbars

## Screen Types

Institute screens will mostly fall into five patterns:

### 1. Operational dashboard

Use:

- hero summary
- readiness cards
- action shortcuts
- status queues

### 2. Data workspace

Use:

- filters
- table or card browser
- bulk actions
- contextual creation actions

### 3. Builder-style workflow

Use:

- guided section layout
- progress-aware controls
- form sections
- embedded summary blocks

### 4. Detail management page

Use:

- top-level overview
- status controls
- side-by-side configuration and history

### 5. Settings page

Use:

- policy cards
- grouped form sections
- audit-friendly labels

## Reuse Rules

Institute frontend should reuse:

- student/teacher shell primitives
- modern teacher page headers where relevant
- builder styling for exams and question authoring
- results and readiness card language

Institute frontend should not copy older plain admin UI when a newer teacher-style pattern already exists.

## Shared Visual Tone

Institute admin should feel:

- sober
- modern
- operational
- clean
- trustworthy

It should not feel:

- overly corporate
- flat utility-only
- visually disconnected from student/teacher

## UX Principles

- operational clarity first
- high-value actions easy to find
- tenant scope always visible
- role power obvious but not cluttered
- no misleading placeholder language once a route is live

## Route-Level UX Direction

### Dashboard

- institute health snapshot
- pending operational actions
- shortcuts to people, setup, exams, and results

### People

- creation and import first
- roster quality second
- account visibility third

### Academic Setup

- hierarchy first
- defaults second
- assignment health third

### Question Bank

- quality and reuse focus
- filters and content ownership visibility

### Exams

- creation flow same family as teacher
- institute-level readiness summary added

### Results

- institute-wide publication and readiness visibility

### Settings

- grouped policy sections, not a raw dump of fields

## Implementation Constraint

Any new institute route should be reviewed against student and teacher before merge.

If the institute screen visually drifts from those sections, it should be corrected before further expansion.
