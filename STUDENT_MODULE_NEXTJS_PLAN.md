# Student Module Next.js Plan

## Scope

This plan translates [STUDENT_MODULE_REVIEW.md](/Users/ansh/Documents/Eductech/STUDENT_MODULE_REVIEW.md) into an execution plan for the `edutech_web` Next.js app.

The goal is not to re-decide product direction. The goal is to finish the student module in `edutech_web` using the backend-connected routes that already exist.

## Current Reality In `edutech_web`

The student module already has live, backend-aware routes for:

- login and session protection
- dashboard
- exams list
- exam detail
- active attempt workspace
- attempt history
- attempt summary
- attempt review
- results
- analytics
- weak areas
- notifications
- settings

Key current files:

- [student layout](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/layout.tsx)
- [student API layer](/Users/ansh/Documents/Eductech/edutech_web/src/lib/api/student.ts)
- [shared student types](/Users/ansh/Documents/Eductech/edutech_web/src/features/dashboard/types.ts)
- [dashboard](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/dashboard/page.tsx)
- [exams list](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/exams/page.tsx)
- [exam detail](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/exams/[examId]/page.tsx)
- [attempt workspace](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/[attemptId]/page.tsx)
- [attempt summary](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/[attemptId]/summary/page.tsx)
- [attempt review](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/[attemptId]/review/page.tsx)
- [results](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/results/page.tsx)
- [analytics](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/analytics/page.tsx)
- [weak areas](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/weak-areas/page.tsx)
- [notifications](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/notifications/page.tsx)
- [settings](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/settings/page.tsx)

## Main Gap Summary

The module is already functionally connected, but most pages still read as first-pass operational screens. The biggest work left is:

- polish the attempt experience
- make exam detail more action-oriented
- unify summary, results, and review into one clearer journey
- improve continuity from insights to next action
- expand settings beyond account/logout
- run full end-to-end QA against real backend states

## Delivery Principles

- Keep the student portal backend-driven.
- Prefer route-level refinement over inventing new data dependencies.
- Reuse shared student UI patterns instead of page-by-page custom styling.
- Treat result visibility and review availability as policy-driven states, not frontend assumptions.
- Finish user clarity before adding speculative features.

## Phase Plan

### Phase 1. Student UX Foundation

Goal: create a shared student workspace language before deep page polish.

Work:

- extract reusable status and workflow UI from current pages into shared components under `src/components/ui`
- standardize page hero, KPI cards, state banners, action rows, and empty states
- add shared helpers for:
  - status labeling
  - score formatting
  - duration formatting
  - visibility-state messaging
- tighten student navigation labels and cross-links in sidebar/topbar where needed

Primary files:

- `edutech_web/src/components/ui/*`
- `edutech_web/src/app/globals.css`
- `edutech_web/src/app/(student)/app/layout.tsx`

Definition of done:

- student pages feel like one product instead of separate route demos
- status pills and action buttons follow one consistent system
- error, empty, and unconfigured states use the same visual language

### Phase 2. Attempt Experience Polish

Goal: make the active attempt flow feel trustworthy and production-ready.

Work:

- improve timer prominence and time-pressure visibility on the attempt page
- make save feedback more local and contextual instead of relying mainly on top banners
- strengthen question navigation and section progress visibility
- improve section switching clarity
- make submit action more explicit with stronger pre-submit confirmation language
- improve post-submit handoff to summary

Primary files:

- [attempt workspace](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/[attemptId]/page.tsx)
- `edutech_web/src/components/ui/action-submit-button.tsx`
- `edutech_web/src/app/globals.css`

Definition of done:

- student can clearly tell current section, progress, saved state, and submit readiness
- important attempt actions are visible without scanning the whole page
- submit flow feels intentional and low-risk

### Phase 3. Exam Detail And Start Flow

Goal: make exam detail answer “can I start, why, and what happens next?” immediately.

Work:

- elevate primary exam state near the top of the page
- convert rules and runtime configuration into clearer student-facing guidance
- explain blocked states better:
  - exam not yet available
  - no attempts left
  - active attempt exists
  - result/review visibility delayed by policy
- strengthen start/resume/summary/review CTA priority order
- add clearer “after you start” guidance

Primary files:

- [exam detail](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/exams/[examId]/page.tsx)
- [exams list](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/exams/page.tsx)

Definition of done:

- student can understand the next action within a few seconds
- blocked states feel explained, not broken
- exam list and exam detail use the same action logic and language

### Phase 4. Summary, Results, And Review Unification

Goal: turn post-exam routes into one connected learning outcome flow.

Work:

- align messaging across summary, results, and review around these states:
  - submitted
  - evaluated
  - published
  - review locked
  - review available
- make route-to-route transitions more obvious:
  - summary -> results
  - summary -> review
  - results -> summary
  - results -> review
- improve result cards so published and pending states are more student-readable
- explain review mode and explanation visibility in plain language
- reduce cases where review links appear optimistic when policy may block them

Primary files:

- [summary](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/[attemptId]/summary/page.tsx)
- [review](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/[attemptId]/review/page.tsx)
- [results](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/results/page.tsx)
- [attempt history](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/page.tsx)

Definition of done:

- students can understand why a score is or is not visible
- students can tell whether review is available and why
- post-submit screens feel like one journey instead of isolated pages

### Phase 5. Actionability And Study Continuity

Goal: connect insight screens to the next practical student action.

Work:

- improve dashboard “next best action” behavior
- add stronger CTA continuity between:
  - dashboard
  - weak areas
  - analytics
  - exams
  - results
- convert weak-topic and analytics insights into clearer study or retry prompts
- add lightweight recommendation modules using existing backend data only

Primary files:

- [dashboard](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/dashboard/page.tsx)
- [analytics](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/analytics/page.tsx)
- [weak areas](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/weak-areas/page.tsx)

Definition of done:

- insight pages consistently point to the next meaningful action
- students can move from weak signal to exam or review workflow without dead ends

### Phase 6. Settings And Daily-Use Improvements

Goal: make settings useful beyond basic logout.

Work:

- keep current account overview and logout
- add student-facing settings sections that can work now without backend changes:
  - profile overview formatting improvements
  - notification preference placeholders or toggles only if backend support exists
  - study-preference placeholders only if they can be truthfully persisted
  - session/help/account-management guidance
- avoid fake controls that do not save anywhere

Primary files:

- [settings](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/settings/page.tsx)

Definition of done:

- settings no longer feels like a temporary stub
- every control shown is either functional or clearly informational

### Phase 7. Full Student QA Pass

Goal: validate the real student lifecycle against backend state rules.

Workflow coverage:

- login
- dashboard load
- exams list
- exam detail
- attempt start
- answer save
- section switch
- submit
- summary visibility
- result visibility states
- review availability states
- attempt history
- analytics refresh
- notifications read actions
- settings/logout

State coverage:

- backend not configured
- expired session
- no assigned exams
- active attempt exists
- result pending
- result published
- review blocked by policy
- review allowed
- empty notifications
- no topic analytics yet

Definition of done:

- every major route is validated against both happy path and blocked states
- issues are logged and fixed before completion is declared

## Suggested Sprint Sequence

### Sprint 1

- Phase 1 shared student UX foundation
- Phase 2 attempt experience polish
- Phase 3 exam detail and start flow

### Sprint 2

- Phase 4 summary, results, and review unification
- Phase 5 actionability and study continuity

### Sprint 3

- Phase 6 settings improvements
- Phase 7 full QA pass
- final bug fixes and polish

## Build Order Inside The Codebase

1. Extract shared student page patterns before heavy route edits.
2. Finish `attempt` and `exam detail` first because they drive the main lifecycle.
3. Then unify `summary`, `results`, and `review`.
4. Then tighten `dashboard`, `analytics`, and `weak areas`.
5. Leave settings expansion and final QA last.

## Risks To Watch

- review and result visibility are backend-policy dependent, so the UI must not overpromise access
- some pages currently link directly to review even when the backend may still reject visibility
- server-action redirects and revalidation must stay predictable while polishing forms
- settings work should avoid fake persistence

## Definition Of Done For The Next.js Student Module

The student module in `edutech_web` is complete when:

- the core student lifecycle is smooth from exam discovery through review
- attempt UX feels production-ready, not just API-connected
- result, summary, and review states are easy to understand
- insight screens drive the student toward the next action
- settings is no longer minimal-only
- the full route set passes end-to-end QA against real backend state combinations
