# Nexora Parent Module Source Of Truth

## Purpose

This file becomes the main parent-module implementation guide.

It should be used together with:

- `NEXORA_FINAL_IMPLEMENTATION_SOURCE_OF_TRUTH.md`
- `ROLE_ACCESS_MATRIX.md`
- `NEXORA_PARENT_FRONTEND_FOUNDATION.md`
- `PARENT_PHASE_WISE_IMPLEMENTATION_PLAN.md`
- `PARENT_CHILD_RELATIONSHIP_AND_ACCESS_MODEL.md`
- `PARENT_BACKEND_CONTRACT_SPEC.md`

When scattered older notes conflict with this file, this file should win.

## Current Parent Reality

The current parent workspace in `edutech_web` is now a real backend-driven support flow.

Implemented today:

- parent shell
- parent dashboard with linked-child summary
- parent children workspace
- parent progress workspace
- parent alerts workspace
- backend-saved notification preferences
- alert status actions
- child switching across dashboard, progress, and alerts

Still intentionally pending:

- weekly parent summaries
- parent wallet and access visibility
- parent self-serve child-link claim workflows
- dedicated parent-specific reporting beyond current dashboard and progress scope

## Product Role Of Parent

Parent is not the primary commercial role right now.

Parent is a support and visibility role around the student journey.

Parent responsibilities in Nexora should be:

- link to one or more children
- view child readiness and academic progress
- track important changes without entering the student workflow directly
- receive alerts for risk, inactivity, and improvement
- understand wallet, access, and exam-readiness signals where appropriate
- support the student with timely nudges

The parent role should remain observational and supportive.

It should not behave like:

- a student account duplicate
- a teacher operational account
- an institute admin account

## Core Parent Principles

### 1. Same Design System As Student

Parent must use the same global visual system as student, teacher, and institute.

That means:

- same shell direction
- same shared topbar and sidebar architecture
- same background language
- same card system
- same spacing rhythm
- same status language

Only the role-specific content and actions should change.

### 2. No Fake Family Data

Parent screens must not pretend:

- a child is linked when the relationship layer does not exist
- score history exists when backend summaries are unavailable
- alerts are live when only local preference storage exists
- wallet and subscription state are visible when no parent-safe contract exposes them

### 3. Parent Is Summary-First

The parent experience should emphasize:

- simple visibility
- low-friction understanding
- clear escalation signals
- supportive next steps

It should not feel dense, operational, or overloaded.

### 4. Backend Is The Source Of Relationship Truth

The parent UI must derive real behavior from:

- parent-to-child relationship records
- student-safe summary endpoints approved for parent scope
- parent notification preferences stored in backend profiles
- institute and student visibility rules

## Parent Product Boundaries

### What Parent Should Eventually Do

- see linked children
- switch between children cleanly
- review high-level academic progress
- understand recent tests and result movement
- see weak areas and support signals
- review important alerts
- manage notification preferences

### What Parent Should Not Do

- take exams
- create exams
- edit academic structure
- manage institute or teacher operations
- unlock content directly unless a future commerce rule explicitly allows it
- receive unrestricted visibility into every student detail without scope rules

## Final Parent Functional Areas

The parent module should be divided into these implementation areas:

1. parent shell and shared UI behavior
2. parent dashboard
3. linked children workspace
4. child progress and readiness
5. parent alerts and summaries
6. wallet and access visibility where permitted
7. parent settings and notification preferences
8. parent QA and release criteria

## Existing Frontend Routes

Current parent routes already present in `edutech_web`:

- `/parent/dashboard`
- `/parent/children`
- `/parent/progress`
- `/parent/alerts`
- `/parent/settings`

These routes are now part of the live parent workspace, not just a foundation shell.

## Final Parent Route Map

The parent workspace should eventually support:

- `/parent/dashboard`
- `/parent/children`
- `/parent/children/[childId]`
- `/parent/progress`
- `/parent/alerts`
- `/parent/wallet`
- `/parent/settings`

Some of these may ship in phases, but this is the long-term parent route direction.

Current implemented routes:

- `/parent/dashboard`
- `/parent/children`
- `/parent/progress`
- `/parent/alerts`
- `/parent/settings`

Current planned-but-not-implemented routes:

- `/parent/children/[childId]`
- `/parent/wallet`

## Required Documentation Set

The implementation team should follow these files by responsibility:

- `NEXORA_PARENT_FRONTEND_FOUNDATION.md`
  - global parent UI rules
  - shell rules
  - tone and layout behavior
- `PARENT_PHASE_WISE_IMPLEMENTATION_PLAN.md`
  - phase order
  - dependency sequence
  - implementation and QA progression

If parent functionality grows substantially, we can later add:

- `PARENT_DASHBOARD_FUNCTIONAL_SPEC.md`
- `PARENT_ALERTS_AND_SUMMARIES_SPEC.md`

The relationship and backend contract are already important enough to be treated as required implementation references:

- `PARENT_CHILD_RELATIONSHIP_AND_ACCESS_MODEL.md`
- `PARENT_BACKEND_CONTRACT_SPEC.md`

## Parent Data Dependencies

Parent implementation depends on the existence of a proper relationship layer.

At minimum, the system will need:

- parent account profile
- child-link records
- child visibility authorization rules
- parent-safe student summary endpoints
- persisted notification preferences

That dependency is now satisfied for the current parent scope, so the parent section should no longer be described as a foundation-only surface.

## Parent Completion Sequence

The correct order for parent implementation should be:

1. freeze parent documentation
2. define the relationship and visibility model
3. modernize parent shell and dashboard framing
4. build linked-child navigation
5. add progress and readiness summaries
6. add alerts and weekly summary surfaces
7. connect parent settings to backend persistence
8. run parent QA

Implementation status against that sequence:

- steps 1 through 8 are complete for the currently approved parent scope
- weekly digest delivery remains a future enhancement inside the broader alerting area
- wallet and parent commerce visibility remain intentionally deferred

## Definition Of Done

Parent section can be called complete when:

- parent role scope is documented
- linked-child behavior is real and backend-driven
- dashboard uses real child data
- alerts are real and not local-only placeholders
- settings persist through backend profile storage
- parent routes follow the same global UI system as the rest of Nexora
- parent can support a child journey without role confusion

The current implementation satisfies this definition of done for the approved parent support scope, excluding wallet visibility and weekly digest delivery that remain separately deferred.
