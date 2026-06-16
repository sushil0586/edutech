# Nexora Student Mobile Pending Gap Analysis

## Objective

This document captures what is already implemented in the `nexora_student_mobile` app and what is still pending from a development-completeness point of view.

This is the working gap document we should follow before calling the student mobile app complete.

Related source documents:

- [NEXORA_STUDENT_MOBILE_APP_PLAN.md](/Users/ansh/Documents/Eductech/NEXORA_STUDENT_MOBILE_APP_PLAN.md)
- [NEXORA_STUDENT_MOBILE_API_AND_SCREEN_MAP.md](/Users/ansh/Documents/Eductech/NEXORA_STUDENT_MOBILE_API_AND_SCREEN_MAP.md)
- [NEXORA_FINAL_IMPLEMENTATION_SOURCE_OF_TRUTH.md](/Users/ansh/Documents/Eductech/NEXORA_FINAL_IMPLEMENTATION_SOURCE_OF_TRUTH.md)

## Current Status

The student mobile app is now beyond planning and scaffold stage.

It already has:

1. register
2. login
3. secure session restore
4. role gate
5. dashboard
6. exam detail
7. live attempt runtime
8. attempt submission
9. post-submit summary
10. analytics
11. profile
12. logout

The app is:

- role-ready in architecture
- student-only in implementation
- backend-driven in core student flows
- visually aligned much more closely to the latest Nexora web product

## What Is Already Implemented

## 1. Architecture Foundation

Implemented:

- Expo + React Native + TypeScript setup
- Expo Router navigation structure
- role-ready route grouping
- shared theme token layer
- shared screen shell
- shared hero, section, action, and metric components
- Zustand session store
- TanStack Query data layer

Status:

- complete for current student MVP scope

## 2. Authentication And Session

Implemented:

- `/(auth)/register`
- `/(auth)/login`
- `/(auth)/role-gate`
- session persistence
- secure native storage using `expo-secure-store`
- web fallback using `localStorage`
- role resolution allowing only student lane

Status:

- functionally complete for MVP

Notes:

- still needs better field-level UX polish and stronger developer-facing error mapping

## 3. Student Dashboard

Implemented:

- live student context
- stars summary
- available exams
- locked exams
- subject lane switching
- analytics preview
- recommended exam open/resume path

APIs already wired:

- `GET /api/v1/student/insights/summary/`
- `GET /api/v1/student/exams/available/`
- `GET /api/v1/student/attempts/`
- `GET /api/v1/economy/wallet/`

Status:

- complete for MVP

## 4. Exam Detail

Implemented:

- live exam detail load
- readiness state
- locked vs available state
- resume vs start routing
- section preview
- security policy preview

API already wired:

- `GET /api/v1/student/exams/{examId}/detail/`
- `POST /api/v1/attempts/start/`

Status:

- complete for MVP

## 5. Attempt Runtime

Implemented:

- live attempt detail
- section switching
- question navigation
- selected answer state
- save answer
- clear response
- mark for review
- submit attempt
- improved guided UI for answer mode and saved state

APIs already wired:

- `GET /api/v1/attempts/{attemptId}/detail/`
- `POST /api/v1/attempts/{attemptId}/save-answer/`
- `POST /api/v1/attempts/{attemptId}/switch-section/`
- `POST /api/v1/attempts/{attemptId}/submit/`

Status:

- strong MVP completion

Gap still remaining:

- no dedicated review screen after submission

## 6. Post-Submit Summary

Implemented:

- dedicated attempt summary route
- result visibility state
- review availability state
- score/percentage summary
- onward routing back to dashboard/analytics

API already wired:

- `GET /api/v1/attempts/{attemptId}/summary/`

Status:

- complete for MVP

## 7. Analytics

Implemented:

- live student insight summary
- live student results
- live topic performance
- weak topics
- strong topics
- latest published result
- insight messages
- subject-aware filtering where backend data is dependable

APIs already wired:

- `GET /api/v1/student/insights/summary/`
- `GET /api/v1/student/results/`
- `GET /api/v1/results/topic-performance/?student={studentId}`

Status:

- complete for MVP

## 8. Profile And Logout

Implemented:

- student profile tab
- account context
- stars and academic metrics
- subject access list
- secure logout

Status:

- complete for MVP

## 9. Run And Environment Setup

Implemented:

- `.env.example`
- updated mobile `README.md`
- Expo web dependencies fixed
- Expo SDK compatibility dependencies aligned
- web session storage fallback fixed

Status:

- working for local development

## Real Pending Gaps

The items below are the actual pending gaps from a dev point of view.

## Priority A: Must Finish Before Calling Student Mobile Complete

### A1. Attempt Review Screen

Why pending:

- attempt summary exists
- analytics exists
- but answer-by-answer post-submit review flow is still missing

Recommended route:

- `/(attempt)/review/[attemptId]`

Required API:

- `GET /api/v1/attempts/{attemptId}/review/`

Expected behavior:

- question-wise review
- selected answer
- correct answer
- explanation
- marks outcome
- review-allowed state only

Status:

- not implemented

### A2. Final Empty/Error/Loading State Pass

Why pending:

- core screens work
- but state handling is not yet equally polished across all screens

Needs review on:

- register
- login
- role gate
- dashboard
- exam detail
- attempt
- attempt summary
- analytics
- profile

Required improvements:

- stronger loading skeleton or loader copy
- consistent empty-state cards
- clearer retry messages
- network failure wording
- unsupported-state wording

Status:

- partially handled
- not complete

### A3. Final Web Compatibility Cleanup

Why pending:

- Expo web now runs
- but there are still non-blocking warnings

Known warnings:

- deprecated `shadow*` web style usage
- deprecated `pointerEvents` prop usage

Required work:

- replace or adjust styles for better Expo web compatibility
- remove noisy console warnings from demo flow

Status:

- pending

## Priority B: Strongly Recommended Next

### B1. Auth UX Upgrade

Current gap:

- login and register work
- but UX is still basic compared to latest Nexora web auth quality

Recommended improvements:

- show/hide password
- inline validation guidance
- stronger duplicate-account messages
- better password mismatch handling
- cleaner backend field error grouping

Status:

- pending

### B2. Developer Handoff Guide

Current gap:

- README is enough to run the app
- but not yet a full developer handoff document

Recommended additions:

- backend prerequisites
- demo credentials
- native vs web env examples
- common startup problems and fixes
- supported routes
- current scope vs future scope

Status:

- partially done
- not complete

### B3. Basic Test Coverage

Current gap:

- `npm run typecheck` passes
- but there is no app-level automated confidence layer yet

Recommended first tests:

- login request and session restore
- dashboard query rendering
- attempt answer selection behavior
- submit route transition
- analytics bundle mapping
- secure-session web/native fallback behavior

Status:

- not implemented

## Priority C: Next Product Expansion Items

These are not blockers for MVP completion, but are the next obvious product steps.

### C1. Dedicated Result Workspace

Possible route:

- `/(student)/results`

Why:

- current app has analytics and attempt summary
- but not a fuller result history workspace

Status:

- not implemented

### C2. Dedicated Attempt Review Follow-Up Actions

Possible additions:

- retry practice set
- open recommended next practice
- weak-topic specific CTA

Status:

- not implemented

### C3. Notifications Lane

Why:

- backend contracts already support notifications
- not yet part of mobile MVP

Status:

- intentionally deferred

### C4. Settings Lane

Why:

- profile exists
- but there is no broader account/settings surface yet

Status:

- intentionally deferred

## Pending From UI/UX Point Of View

The mobile app is now strong visually, but there are still some polish opportunities.

### UI polish still pending

- unify loading visuals across all screens
- smoother spacing harmonization between cards on smaller mobile widths
- more expressive but subtle success/error banners
- better tab icons and richer tab presentation
- improved typography hierarchy in long attempt content
- cleaner form control affordances for web

Status:

- optional polish
- not blocker for MVP

## Pending From Production Readiness Point Of View

### Not yet finalized

- app icon
- splash screen
- app metadata for store packaging
- production env strategy
- secure production web storage strategy review
- release build verification
- device QA matrix

Status:

- not started

## Recommended Execution Order

To complete the student mobile app properly, follow this order:

1. build attempt review screen
2. do final empty/error/loading state pass
3. remove Expo web warnings and compatibility noise
4. improve auth UX and backend error mapping
5. write final developer handoff guide
6. add lightweight automated tests
7. only then move to result workspace / notifications / settings expansion

## Practical Definition Of Done

We should call the student mobile app complete for MVP only when:

1. student can register
2. student can login
3. student session restores correctly
4. dashboard is live
5. exam detail is live
6. attempt runtime is live
7. attempt review is live
8. submission summary is live
9. analytics is live
10. profile/logout is stable
11. all screens have polished loading/error/empty states
12. app runs on web and native without blocking warnings or runtime issues
13. run/setup instructions are complete for another developer

## Final Assessment

Current assessment:

- architecture: strong
- live backend integration: strong
- student workflow completeness: strong
- UI quality: strong
- production readiness: partial
- final MVP completeness: not yet complete

Main missing piece:

- attempt review

Main supporting missing pieces:

- final state polish
- final run/handoff polish
- test coverage

## Next Recommended Task

The next best implementation task is:

**build the student mobile attempt review screen end to end**

That closes the most meaningful remaining product gap before moving into final cleanup.
