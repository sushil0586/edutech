# Flutter Admin Porting Review

## Purpose

This note reviews the old Flutter frontend and identifies which `platform admin` and `institute admin` capabilities should be ported into `edutech_web`, which parts should be simplified during the port, and which parts should wait.

It is based on the current Flutter code under:

- [app_router.dart](/Users/ansh/Documents/Eductech/edutech_frontend/lib/app/router/app_router.dart:1)
- [dashboard_page.dart](/Users/ansh/Documents/Eductech/edutech_frontend/lib/features/dashboard/presentation/pages/dashboard_page.dart:1)
- [dashboard_shell.dart](/Users/ansh/Documents/Eductech/edutech_frontend/lib/features/dashboard/presentation/widgets/dashboard_shell.dart:1)
- [academic_setup_page.dart](/Users/ansh/Documents/Eductech/edutech_frontend/lib/features/academics/presentation/pages/academic_setup_page.dart:1)
- [academic_setup_repository.dart](/Users/ansh/Documents/Eductech/edutech_frontend/lib/features/academics/data/repositories/academic_setup_repository.dart:1)
- [academic_setup_models.dart](/Users/ansh/Documents/Eductech/edutech_frontend/lib/features/academics/domain/models/academic_setup_models.dart:1)

## Executive Summary

The Flutter app already contains a meaningful `platform admin` and `institute admin` foundation.

The strongest reusable parts are:

- role-aware auth and route gating
- a unified multi-role workspace shell
- academic setup operations
- institute-level credential management
- roster import preview and finalize flows
- institute exam defaults
- admin reuse of question bank, exams, and results workspaces

The weakest or least portable parts are:

- parent dashboard, which is still a placeholder
- tightly coupled Flutter UI composition that should be re-expressed in React instead of copied visually line by line
- some dashboard blocks that are informative but not essential for the first Next.js admin release

## What Flutter Already Has

### 1. Multi-role routing

The Flutter router already supports:

- `student`
- `teacher`
- `platform_admin`
- `institute_admin`
- `parent`

Important finding:

- the old app already treated `platform_admin` and `institute_admin` as real portal roles
- role-to-route access rules are explicitly defined in [_isRouteAllowedForRole](/Users/ansh/Documents/Eductech/edutech_frontend/lib/app/router/app_router.dart:197)

This is directly useful because the current Next.js auth layer only allows:

- `student`
- `teacher`

in [session.ts](/Users/ansh/Documents/Eductech/edutech_web/src/lib/auth/session.ts:1)

### 2. Shared workspace shell

The Flutter `DashboardShell` is one of the best pieces to port conceptually.

It already provides:

- role-aware navigation
- desktop sidebar and mobile drawer behavior
- top header with role/institute context
- search placeholder by workspace
- notifications bell
- consistent logout and user identity controls

This is a better foundation than building separate, isolated admin layouts from scratch.

### 3. Platform admin dashboard

The Flutter platform admin dashboard is simple but useful.

It shows:

- institute count
- program count
- student count
- teacher count
- recent notifications
- unread system alerts

This is a good first admin homepage because it is:

- operational
- low-risk
- backed by data we already expose elsewhere

### 4. Institute admin dashboard

The Flutter institute admin dashboard is more mature than the platform admin one.

It shows:

- program count
- cohort count
- student count
- teacher count
- exam activity summary
- notifications
- unread alerts

This is a strong candidate for early Next.js parity.

### 5. Academic setup workspace

This is the highest-value admin feature in the Flutter codebase.

The repository contract shows support for:

- institutes
- academic years
- programs
- cohorts
- subjects
- topics
- students
- teachers
- teacher assignments

And operations for:

- list
- create
- update
- filter by institute
- credential creation
- password reset
- enable login
- disable login
- student import template
- teacher import template
- preview import
- finalize import

This is a real admin module, not just a placeholder.

### 6. Institute exam defaults

Flutter also has a useful institute-level defaults concept through `InstituteExamDefaultsModel`.

This includes:

- duration
- instructions
- review policy
- security mode
- attempt policy
- timer/navigation settings
- resume/switching behavior

This is especially valuable because it ties directly into the secure assessment and exam-builder work already happening in the web app.

### 7. Shared institute-admin access to existing teacher-style workspaces

The Flutter role rules allow `institute_admin` to access:

- `Academic Setup`
- `Question Bank`
- `Exams`
- `Results`

This is the key reuse insight:

- we do not need a completely different institute-admin product surface
- we can reuse much of the teacher operational UI with different access scope and framing

## What Should Be Copied First

### Copy 1. Role support in auth and routing

Port first:

- `platform_admin` login support
- `institute_admin` login support
- role-aware post-login routing
- route guards for admin-only sections

This is the necessary base for everything else.

### Copy 2. Shared admin shell

Port next:

- a Next.js admin shell inspired by Flutter `DashboardShell`
- role-aware navigation items
- consistent header, user chip, notifications entry, and logout

This should become the base layout for:

- `/admin/...`
- `/institute/...`

### Copy 3. Academic setup workspace

This is the best candidate for early functional parity.

Port in this order:

1. Institutes view for platform admin
2. Academic years
3. Programs
4. Cohorts
5. Subjects
6. Topics
7. Students
8. Teachers
9. Teacher assignments

Start with list/filter/create/edit before bringing over more advanced controls.

### Copy 4. Credential management

These are highly reusable and operationally important:

- create student login
- create teacher login
- reset password
- enable login
- disable login

This is one of the most practical admin wins from the Flutter code.

### Copy 5. Bulk roster import

The preview/finalize import flow is worth porting after the base academic setup screens exist.

This is especially valuable for:

- institute onboarding
- pilot setup
- reducing manual account creation

### Copy 6. Institute exam defaults

This should be ported once institute admin routes exist because it complements the existing Next.js exam builder well.

It gives institute admins control over:

- default runtime settings
- review behavior
- security policy defaults

without forcing them to edit every exam individually.

## What Should Be Rebuilt, Not Copied Literally

### 1. Visual layout details

Do not copy Flutter widgets line-for-line into HTML/CSS equivalents.

Instead, copy:

- the information architecture
- navigation model
- action grouping
- role scoping

and re-express them in the current Next.js design language.

### 2. Dashboard blocks

The dashboard content is useful, but it should be simplified for the first port.

For example:

- counts
- alerts
- recent activity

should come first.

Large composite cards and dense tiles can come later.

### 3. Search placeholders and decorative header behavior

The Flutter shell has helpful polish, but these are not Phase 1 admin requirements.

Nice to port later:

- contextual header search placeholders
- compact desktop variants
- extra header chips

## What Should Not Be Copied Yet

### 1. Parent dashboard

The Flutter parent dashboard is explicitly still a placeholder.

It should not drive implementation priorities for Next.js yet.

### 2. Platform admin beyond setup and overview

The old app does not show a fully deep platform-admin product beyond:

- dashboard
- academic setup

So the best move is not to invent heavy new platform modules yet.

### 3. Separate student/teacher/institute duplicate workspaces

The Flutter app suggests a better approach:

- reuse shared workspaces
- change scope and permissions by role

That is preferable to cloning the same functionality into many route trees.

## Recommended Port Order

### Admin Phase 1. Auth and shell

- extend `edutech_web` auth to support:
  - `platform_admin`
  - `institute_admin`
- add role-aware redirect logic
- add protected route groups:
  - `/admin`
  - `/institute`
- build shared admin shell

### Admin Phase 2. Dashboard parity

- platform admin dashboard:
  - institutes
  - programs
  - students
  - teachers
  - recent alerts
- institute admin dashboard:
  - programs
  - cohorts
  - students
  - teachers
  - exam activity
  - alerts

### Admin Phase 3. Academic setup MVP

- institutes
- academic years
- programs
- cohorts
- subjects
- topics

### Admin Phase 4. People operations

- students
- teachers
- teacher assignments
- login creation and credential actions

### Admin Phase 5. Bulk onboarding

- roster import template download
- preview import
- finalize import

### Admin Phase 6. Institute controls

- institute exam defaults
- scoped reuse of question bank, exams, and results

## Best Reuse Strategy For Next.js

The cleanest architecture for the web app is:

- one shared admin shell
- one shared set of operational workspaces
- role-based route entry points
- role-based backend scoping

That means:

- `platform_admin` gets broad tenant visibility
- `institute_admin` gets institute-scoped operational visibility
- `teacher` keeps teacher operational visibility

without building three separate products.

## Concrete Recommendation

The best immediate next move is:

1. expand auth to accept admin roles
2. add `/admin/dashboard` and `/institute/dashboard`
3. port the Flutter dashboard shell concept
4. port `Academic Setup` first
5. then add credential management and bulk import

This is the highest-confidence way to turn the old Flutter admin investment into useful `edutech_web` progress.
