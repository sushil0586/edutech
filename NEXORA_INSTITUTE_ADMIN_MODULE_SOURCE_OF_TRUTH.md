# Nexora Institute Admin Module Source Of Truth

## Purpose

This document is the implementation source of truth for the `institute_admin` section of Nexora.

It defines:

- what the institute admin role is allowed to do
- which screens belong in the institute workspace
- what must be shared with student and teacher UI
- what should be reused from teacher workflows
- what must be documented before implementation

This document should be followed together with:

- `NEXORA_FINAL_IMPLEMENTATION_SOURCE_OF_TRUTH.md`
- `ROLE_ACCESS_MATRIX.md`
- `NEXORA_STUDENT_FRONTEND_FOUNDATION.md`
- `NEXORA_TEACHER_MODULE_SOURCE_OF_TRUTH.md`
- `INSTITUTE_ADMIN_EXAM_LIFECYCLE_AND_BUILDER_SPEC.md`

## Final Role Position

The institute admin is not a lightweight viewer.

The institute admin is an operational owner for one institute and should be able to:

- manage institute-scoped academic structure
- manage student and teacher roster operations
- define institute-wide exam defaults and operational settings
- create and manage exams
- access and use the question bank
- assign teachers and monitor readiness
- review institute-level results and operational metrics
- control institute-side economy and access rules where permitted

The institute admin must remain scoped to one institute and must never cross tenant boundaries.

## Product Truth

The institute admin product should follow these rules:

- same global design system as student and teacher
- same shell direction: sidebar, topbar, content area, footer rhythm
- same background language, color system, card system, spacing, and typography
- no duplicate visual language for institute pages
- only center content changes; shared chrome stays shared

The institute admin should feel like:

`the operational control layer of the same Nexora product family`

not a separate admin product.

## Core Principle

Institute admin should not get a second-class copy of teacher workflows.

When the workflow is functionally the same, institute admin should reuse the same capability pattern with institute-scoped permissions and institute-specific summary framing.

That means institute admin should be able to use:

- exam creation
- exam builder
- question bank
- results review

without needing a completely different product flow.

## Institute Admin Capability Model

### A. Institute-Owned Operations

These are institute-admin-first capabilities:

- institute dashboard
- people management
- academic setup
- institute settings
- institute-wide exam defaults
- institute policy and approval workflows
- institute-level reporting summaries
- institute-level economy visibility and support actions

### B. Shared Operational Workspaces

These should be shared in behavior with teacher, but available to institute admin:

- question bank browser
- question creation and editing
- exam list
- exam creation
- exam detail
- exam builder
- exam assignments
- exam access policy management
- exam results and publication review

### C. Institute Oversight Layer

These should exist on top of shared teacher-like workflows:

- all-teacher operational visibility
- institute-wide exam readiness summary
- institute-wide pending publication queue
- teacher assignment health
- roster completeness and login readiness
- economy unlock and star-policy visibility

## Current Web State

The current institute section already has a foundation:

- `/institute/dashboard`
- `/institute/people`
- `/institute/academic-setup`
- `/institute/settings`

Current strengths:

- institute session routing exists
- institute shell exists
- academic setup and roster surfaces already exist in basic form
- shared shell alignment with broader web app already exists

Current gaps:

- no institute exam workspace
- no institute question-bank workspace
- no institute result operations workspace
- no institute analytics and operational reporting workspace
- settings are still placeholder-level
- current institute pages still feel closer to admin utility pages than the newer student/teacher premium workspace style

## Final Institute Route Map

The institute workspace should end up with this route structure:

### Foundation

- `/institute/dashboard`
- `/institute/people`
- `/institute/academic-setup`
- `/institute/settings`

### Shared Assessment Workspaces

- `/institute/question-bank`
- `/institute/question-bank/new`
- `/institute/question-bank/[questionId]`
- `/institute/question-bank/import`
- `/institute/exams`
- `/institute/exams/new`
- `/institute/exams/[examId]`
- `/institute/exams/[examId]/builder`
- `/institute/results`

### Institute Oversight Workspaces

- `/institute/teacher-assignments`
- `/institute/reports`
- `/institute/economy`
- `/institute/security`

Not every route must be implemented in the first institute phase, but this is the long-term route contract.

## Module Boundaries

### 1. Dashboard

The institute dashboard should answer:

- is the institute academically configured
- is roster onboarding complete
- are teacher assignments healthy
- how many exams are in draft, scheduled, live, and completed states
- are results pending publication
- are access policies and economy rules configured

### 2. People

The people module should cover:

- student creation
- teacher creation
- bulk import
- login visibility
- account status visibility
- institute-scoped roster filtering
- roster data quality issues

### 3. Academic Setup

The academic setup module should cover:

- academic years
- programs
- cohorts
- subjects
- topics
- teacher assignments
- institute exam defaults

### 4. Question Bank

Institute admin must be able to:

- browse institute question inventory
- create and edit questions
- duplicate questions
- import questions
- inspect tagging, topic mapping, explanation quality, and usage

This may reuse teacher workspace mechanics, but institute admin framing should emphasize shared institutional ownership.

### 5. Exams

Institute admin must be able to:

- create exam shells
- manage exam lifecycle
- open builder
- link questions
- assign students
- manage access key
- manage exam access policy
- monitor exam readiness before teacher use

### 6. Results

Institute admin must be able to:

- review exam result readiness
- see which exams are completed but unpublished
- see result summaries across institute scope
- inspect publication and rank state
- move into exam-level detail where permitted

### 7. Settings

Institute settings should cover:

- institute profile and operational metadata
- exam defaults
- future security defaults
- future economy defaults
- future notification and workflow settings

## Permissions Truth

Institute admin must remain institute-scoped.

The role can be broader than teacher inside the same institute, but must not exceed tenant scope.

Institute admin should be allowed to:

- create and edit institute-scoped academic data
- create students and teachers
- create and manage exams
- create and manage questions
- review results across the institute

Institute admin should not be allowed to:

- manage other institutes
- bypass role-based tenant scoping
- change platform-global configuration

## Reuse Strategy

We should not build separate duplicate engines for:

- question creation
- exam creation
- exam builder
- result publication logic

Instead:

- reuse backend endpoints where institute scope already applies
- reuse shared UI primitives
- reuse teacher workflow components where role-safe
- wrap them in institute routes with institute framing and institute summaries

## UI And UX Direction

Institute admin must match the modern Nexora web design already being used for student and teacher.

That means:

- use the same global CSS and design tokens
- use the same shell structure
- use the same content-card and metric-card language
- use the same soft, sober, premium tone
- keep transitions and spacing consistent

Institute admin should not drift back to older plain admin layouts once ported.

## Documentation Structure Before Implementation

Before implementation, institute work should be documented in four layers:

1. source of truth
2. frontend foundation
3. functional specifications
4. phased implementation plan

This document is layer 1.

## Implementation Rule

No institute implementation should start without:

- route-by-route scope clarity
- permission clarity
- reuse decision clarity
- shared UI decision clarity

That is the purpose of the companion docs.
