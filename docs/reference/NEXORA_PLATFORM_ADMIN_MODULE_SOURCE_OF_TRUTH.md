# Nexora Platform Admin Module Source Of Truth

## Purpose

This file becomes the main platform-admin implementation guide.

It should be used together with:

- `NEXORA_FINAL_IMPLEMENTATION_SOURCE_OF_TRUTH.md`
- `ROLE_ACCESS_MATRIX.md`
- `ROLE_FRONTEND_BACKEND_GAP_ANALYSIS.md`

When older admin notes conflict with this file, this file should win.

## Current Platform Admin Reality

The current platform-admin workspace in `edutech_web` is not a blank slate.

It already has real working surfaces for:

- platform-admin shell
- dashboard with live global counts
- people workspace
- academic setup workspace
- institute exam-default editing
- roster onboarding and CSV tooling
- account action controls
- teacher-assignment management support
- admin-side student economy inspection helpers

The current module is already useful, but it still needs:

- one final documented operating model
- stronger UI alignment with the newer student, teacher, parent, and institute workspaces
- richer global platform-control surfaces
- a proper completion checklist and disciplined QA pass

## Product Role Of Platform Admin

Platform admin is the global governance and control role across the whole Nexora platform.

Platform-admin responsibilities in Nexora should be:

- manage institutes at the platform layer
- manage people and account readiness across institutes
- govern academic master data and institute academic setup
- review and update institute-wide defaults where centrally allowed
- support controlled economy override and diagnostic actions
- monitor setup health and operational readiness at global scope

Platform admin should not behave like:

- a student product role
- a teacher authoring role
- an institute admin duplicate with only local visibility

## Core Platform Admin Principles

### 1. Same Design System As Student

Platform admin must use the same global visual system as student, teacher, institute, and parent.

That means:

- same shell direction
- same sidebar and topbar architecture
- same card and metrics language
- same spacing rhythm
- same status-pill behavior
- same empty-state and feedback patterns

Only the content, scope, and actions should change.

### 2. No Fake Platform Control States

Platform-admin screens must not pretend:

- an institute is configurable when backend write routes do not exist
- an action succeeded when the backend mutation did not persist
- economy state is editable beyond the routes currently exposed
- a global workspace exists when the page is still placeholder-only

### 3. Global Scope Must Stay Clear

Platform-admin pages should always make clear:

- whether the view is global or institute-scoped
- which institute is currently selected when filtering applies
- whether the surface is visibility-only or includes mutations

### 4. Backend Is The Source Of Operational Truth

Platform-admin UI must derive behavior from:

- platform-scoped backend endpoints
- institute-scoped backend endpoints where centrally permitted
- authenticated admin proxy routes
- real counts, records, and mutation responses

## Current Frontend Route Map

Current platform-admin routes already present in `edutech_web`:

- `/admin/dashboard`
- `/admin/people`
- `/admin/academic-setup`
- `/admin/settings`

## Current Route Reality

### `/admin/dashboard`

Current status:

- live backend counts are wired
- page is useful, but still visually older than the latest role dashboards
- page still describes itself partly as an early port

### `/admin/people`

Current status:

- substantial working workspace
- institute filter is present
- student and teacher onboarding actions exist
- roster import controls exist
- roster browsing, login status visibility, and account actions exist

### `/admin/academic-setup`

Current status:

- substantial working workspace
- institute filter is present
- academic entity management is wired
- teacher assignments are included
- institute exam-default editing is wired

### `/admin/settings`

Current status:

- placeholder-level page
- confirms access only
- does not yet act as a real admin settings workspace

## Backend And Proxy Surface Already In Use

The current platform-admin web module already depends on:

- `/api/v1/institutes/`
- `/api/v1/academics/*`
- `/api/v1/students/`
- `/api/v1/teachers/`
- `/api/v1/teachers/assignments/`
- `/api/v1/exams/`
- `/api/v1/results/`

Current authenticated admin proxy routes already present in `edutech_web` include:

- `/api/admin/academics/[resource]`
- `/api/admin/academics/[resource]/[entityId]`
- `/api/admin/account-management/[resource]/[entityId]/[action]`
- `/api/admin/roster/[resource]/preview`
- `/api/admin/roster/[resource]/finalize`
- `/api/admin/roster/[resource]/template`
- `/api/admin/teacher-assignments`
- `/api/admin/teacher-assignments/[id]`
- `/api/admin/institutes/[id]`
- `/api/admin/economy/grant-stars`
- `/api/admin/economy/student/[studentId]/wallet`
- `/api/admin/economy/student/[studentId]/rewards`
- `/api/admin/economy/student/[studentId]/refresh-unlocks`

## Functional Areas

The platform-admin module should be treated as these implementation areas:

1. platform-admin shell and shared UI behavior
2. platform overview dashboard
3. global people and account management
4. academic master-data and institute setup governance
5. institute defaults and configuration governance
6. economy support and controlled override tools
7. platform settings and security posture
8. QA and release criteria

## Current Gaps

The most important current platform-admin gaps are:

- dashboard still needs modernization to match the latest shared role patterns
- settings is still a placeholder page
- no dedicated institute-management workspace route yet
- no dedicated global economy governance page yet
- no dedicated reports, audit, or security workspace yet
- no final documented workflow model tying all current admin surfaces together

## Recommended Near-Term Route Direction

Keep the existing routes:

- `/admin/dashboard`
- `/admin/people`
- `/admin/academic-setup`
- `/admin/settings`

Likely next platform-admin routes after documentation lock:

- `/admin/institutes`
- `/admin/economy`
- `/admin/security`
- `/admin/reports`

These should only be added when backed by real operational need and real backend support.

## Implementation Priority

The clean sequence for platform-admin completion should be:

1. freeze platform-admin documentation
2. modernize dashboard to the shared latest UX language
3. convert settings into a real backend-driven workspace
4. review people workflow completeness and close gaps
5. review academic setup workflow completeness and close gaps
6. decide whether institute management deserves its own route
7. decide whether global economy governance deserves its own route
8. run platform-admin QA end to end

## Definition Of Done

Platform-admin section can be called complete when:

- its role boundaries are clearly documented
- dashboard matches the shared modern UI system
- people and academic-setup workflows are fully understood and QA'd
- settings is no longer placeholder-only
- no admin action relies on hardcoded assumptions
- global versus institute-scoped behavior is always clear
- the module can operate as the real platform governance surface without role confusion
