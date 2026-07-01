# Nexora Role Access Matrix

This document defines the role-driven behavior contract for Nexora.

`AccountProfile` is the single source of truth for role, tenant scope, and workspace routing. Everything in the product should branch from that one record.

## Role Principles

- one account profile per login
- one primary role per account
- one institute scope for all non-platform-admin users
- one default landing experience per role
- one profile source of truth for each role
- role-specific UI, permissions, and summaries should be derived, not hardcoded

## Role Matrix

| Role | Primary Purpose | Default Landing | Required Linked Profile | Core Modules | Notes |
|---|---|---|---|---|---|
| Platform Admin | Oversees the whole platform | Platform admin dashboard | None required | Institutes, global analytics, system settings, audits | Can work without an institute scope |
| Institute Admin | Manages one institute | Institute dashboard | Optional, depending on setup | Students, teachers, academics, exams, reports | Must belong to one institute |
| Teacher | Runs teaching and assessment workflows | Teacher workspace | `TeacherProfile` | Question bank, exam builder, assignments, live monitoring, results | Role should inherit institute and subject scope |
| Parent | Monitors linked children | Parent dashboard | Optional at signup, linked later | Child overview, alerts, progress, results, readiness | Can remain lightweight until child-linking is created |
| Student | Learns, practices, and takes exams | Student dashboard | `StudentProfile` | Practice, mock tests, attempts, results, analytics, weak areas | Should always route to class/subject-aware workspace |

## What Each Role Should Control

### Platform Admin

- global configuration
- institute creation and oversight
- platform-level audits
- cross-institute monitoring

### Institute Admin

- institute setup
- academic years, programs, cohorts, subjects
- teacher and student management
- exam publishing and reporting

### Teacher

- question bank creation
- exam creation and assignment
- live monitoring
- result review
- subject and cohort-specific actions

### Parent

- child visibility
- alerts
- readiness summaries
- performance trends

### Student

- dashboard
- practice
- mock tests
- attempts
- results
- subject-specific recommendations

## Routing Rules

The frontend should use the role to decide:

- which top bar and sidebar to show
- which dashboard to open after login
- which widgets to prioritize
- which actions to hide or reveal
- which data to fetch first

## Registration Rules

- public registration should collect only the fields needed for the selected role
- student registration should collect academic context such as class, board, exam interest, and school/institute link
- teacher registration should collect teaching scope and subject context
- parent registration should stay minimal and can link children later
- internal institute-admin registration can be more direct, but should still flow into the same `AccountProfile` model

## Backend Rules

- `AccountProfile.role` decides the role
- `AccountProfile.institute` decides tenant scope
- `StudentProfile` and `TeacherProfile` are the role-specific linked records
- `registration_context` stores onboarding selections that are useful later
- the same account system must support both public and internal onboarding

## Practical Rule Of Thumb

If a field affects:

- identity,
- role,
- tenant,
- or workspace routing,

it belongs on or is driven by `AccountProfile`.

If a field describes how the user participates in the product, it belongs in the linked profile or registration context.

