# Nexora Student Mobile App Plan

## Objective

Plan the first React Native mobile app architecture for Nexora in a way that is:

- role-scalable in architecture
- student-only in first implementation scope

For the first build, the original target was a thinner student MVP:

1. Register
2. Login
3. Dashboard
4. Take Exam
5. Analytics

Current implemented reality has already expanded beyond that baseline into an exam-first student shell with dedicated exams, attempts, and results lanes.

This mobile app must reuse the existing Django backend and the same student product rules already approved for the web experience.

## Scope Decision

This is a **student-only mobile MVP implementation** built on a **role-ready mobile architecture**.

That means:

- the app structure should be able to support student, teacher, parent, institute, and admin lanes later
- but only the student lane will actually be built now
- no role-specific teacher, parent, institute, or admin screens should be implemented in this phase

Earlier scope assumptions said it should not include:

- teacher
- institute
- parent
- admin
- wallet purchase flows
- full desktop-style results workspace
- weak areas as a separate app section
- notifications center
- settings-heavy account management

Those heavier surfaces can still come later, but the current student mobile app already includes a compact exam-first results lane because it is necessary for a truthful post-submit journey.

## Product Principle

The mobile app is **not** a new product model and should not become a one-off student-only codebase.

It is a mobile surface for the same Nexora student system:

- same authentication
- same exam availability rules
- same attempt lifecycle
- same result and analytics truth
- same star economy context
- same subject-aware filtering logic

## Mobile MVP Outcome

A student should be able to:

1. register
2. sign in
3. land on a clear mobile dashboard
4. see available tests and current star context
5. open an exam detail
6. start or resume an attempt
7. take the exam on mobile
8. submit successfully
9. return to a compact analytics area that explains progress and weak patterns

## Recommended Technical Direction

### Recommendation

Use **React Native with Expo** for the first mobile app.

Reason:

- fastest team setup
- good OTA and device testing path
- easier camera/file/device permission handling later
- simpler environment for student-only MVP

### Recommended Stack

- React Native
- Expo
- TypeScript
- Expo Router
- TanStack Query
- Zustand or small Context store for session and attempt runtime
- React Hook Form only where forms are needed
- NativeWind only if the team wants utility styling

### Styling Recommendation

Keep styling token-driven and shared in one mobile theme layer.

Follow the same product language already approved for the web student app:

- sober
- soft
- academic
- premium but not loud

## App Scope Architecture

### Architecture Rule

The codebase should be structured as a **role-based mobile platform architecture** even if only one role is implemented initially.

That means:

- shared auth, networking, theme, session, and shell patterns should be role-neutral
- role-specific features should live inside separate feature areas
- navigation should allow future role branching after login
- current implementation should only activate the student lane

### Current Implementation Scope

Implemented today:

1. Student register
2. Student login
3. Student dashboard
4. Student exams lane
5. Student attempts lane
6. Student results lane
7. Student exam detail and take-exam flow
8. Student summary and review flow
9. Student analytics
10. Student profile

Do not build:

- teacher mobile lane
- parent mobile lane
- institute mobile lane
- platform-admin mobile lane

### Root App Areas

1. Auth
2. Role Resolver
3. Student App Shell
4. Attempt Shell

### Why Add Role Resolver

After authentication, the app should eventually be able to inspect the authenticated account role and route into the correct mobile lane.

For now:

- if role is `student`, continue into the student app
- other roles can remain unsupported in mobile MVP and show a controlled message later

### Why Two Shells

The exam attempt experience should **not** use the full student shell.

Normal student shell:

- dashboard
- analytics
- light navigation

Attempt shell:

- focused timer
- question navigation
- submission controls
- reduced distractions

This matches the web architecture direction already established.

## Mobile Navigation Plan

### Auth Stack

- `register`
- `login`
- `role-gate` or session resolver

### Student Tab / Shell

- `dashboard`
- `exams`
- `attempts`
- `results`
- `analytics`
- `profile`

### Detail / Flow Routes

- `exam/[examId]`
- `attempt/[attemptId]`
- `attempt/[attemptId]/summary`
- `attempt/[attemptId]/review`

The mobile app is no longer only `dashboard`, `exam detail`, `live attempt`, and `analytics`. The current student lane now includes dedicated exams, attempts, and results tabs because those are necessary to keep the exam journey coherent on mobile.

## Final Mobile MVP Screens

## 1. Register Screen

### Purpose

Allow a new student to create a mobile account through the same approved student onboarding rules.

### Required behavior

- student registration with existing backend contract
- minimal student-first form
- role fixed to student for this mobile MVP
- successful registration routes into login or auto-login based on backend policy

### Required first-release fields

Use only the approved student registration fields already supported by backend scope.

Do not invent mobile-only registration rules.

### Do not build now

- teacher registration
- parent registration
- institute/admin onboarding
- broad public multi-role chooser unless required by the backend auth flow

## 2. Login Screen

### Purpose

Authenticate the student and load the mobile app session.

### Required behavior

- student login with existing backend auth
- persist token/session securely
- fetch current student profile after login
- resolve role
- redirect student into dashboard

### Do not build now

- forgot password
- social login

Those are phase-two items unless already required.

## 3. Dashboard Screen

### Purpose

The student should understand current context and next action in a few seconds.

### Content blocks

1. student greeting and class/board context
2. stars quick summary
3. recommended exam card
4. available exams list
5. locked exams list with reason
6. compact progress strip

### Mobile behavior

- single-column scroll
- recommendation card near top
- stars visible but not dominant
- subject switcher as horizontal chips or segmented control
- exam cards stacked vertically

### Backend dependencies

- student dashboard summary
- student exams list
- student wallet summary
- student attempts list for resume state

### Must answer

- what should I do next
- do I have an exam to resume
- what is available to me
- what is locked and why
- how many stars do I have

## 4. Exam Detail Screen

### Purpose

Explain one exam clearly before the student starts.

### Content blocks

1. exam title and subject
2. availability state
3. attempts left
4. duration
5. star/unlock requirement if relevant
6. start or resume primary CTA
7. compact rule notes

### States

- can start
- can resume
- locked by stars
- exhausted attempts
- not yet live
- already completed with review available later

### Primary CTA logic

- if active attempt exists: `Resume Attempt`
- else if can start: `Start Exam`
- else if locked by stars: `Unlock or View Reason`
- else: disabled guided state

## 5. Live Attempt Screen

### Purpose

Run the student attempt with focus and clarity.

### Layout zones

1. top attempt header
2. timer and progress
3. question body
4. options / answer input
5. next / previous controls
6. question palette / navigator
7. submit action

### Mobile interaction rules

- question area must dominate the screen
- controls must stay thumb-friendly
- no unrelated app shell actions
- autosave answer changes
- support leaving and resuming later if backend policy allows

### Core attempt features for MVP

- fetch attempt runtime
- render current question
- save answer
- mark for review
- move next / previous
- open question navigator
- submit attempt

### Exam types to support first

Recommended first support order:

1. single correct MCQ
2. multi-select if already active in backend
3. numeric entry only if backend already supports it cleanly

If the backend supports more types, mobile should still launch with a controlled subset first.

## 6. Analytics Screen

### Purpose

Show progress patterns without overwhelming the student.

### Content blocks

1. analytics header with selected subject lane
2. overall performance snapshot
3. recent result trend
4. weak topics summary
5. strong topics summary
6. question-type or accuracy pattern summary
7. recommended next action

### Mobile behavior

- one clear chart or trend block first
- weak-topic list should be actionable
- avoid long dense tables
- analytics should convert into practice direction

### Must answer

- am I improving
- where am I weak
- what topic should I work on next
- how am I doing in this subject

## Data Contract Plan

The mobile app should reuse existing student backend contracts wherever possible.

## Required API Groups

### Auth

- login
- current account profile

### Student context

- current student profile/context
- subject options for scope switching

### Dashboard

- dashboard summary endpoint
- exams list endpoint
- attempts list endpoint
- wallet summary endpoint

### Exam detail

- exam detail endpoint
- start attempt endpoint

### Attempt runtime

- fetch attempt detail/runtime
- save answer endpoint
- mark for review endpoint if separate
- submit attempt endpoint

### Analytics

- student summary endpoint
- published results endpoint
- topic performance endpoint

## Mobile State Plan

## Server State

Use TanStack Query for:

- dashboard
- exam detail
- attempt fetch
- analytics
- wallet summary

## Local App State

Use small app store for:

- auth session
- selected subject lane
- current attempt local UI state
- question palette open/closed
- submit confirmation visibility

## Offline Strategy

For MVP:

- do not promise full offline exam support
- support temporary network loss messaging
- keep local optimistic answer cache for the current attempt
- sync answer save requests when connectivity returns if feasible

This should be described clearly in UX.

## Exam Attempt Technical Plan

This is the most sensitive part of the mobile app.

## Attempt Runtime Model

The mobile client should treat backend as the source of truth for:

- active attempt identity
- section state
- time limits
- attempt status
- question ordering
- submission state

The mobile client may keep local UI state for:

- currently viewed question
- unsent answer draft
- local navigator open/close

## Attempt Save Rules

- save on option selection
- save on question navigation if draft changed
- retry failed save with visible sync state
- block duplicate submit presses

## Attempt Recovery

If the app is closed:

- dashboard and exam detail should detect active attempt
- resume should return the student to the current attempt

## Mobile Design Rules

Keep the same approved visual direction as web:

- light background
- soft edges
- restrained premium feel
- clear educational tone

## Shared Mobile Tokens

Define:

- spacing scale
- radius scale
- surface colors
- text hierarchy
- state colors
- star accent palette
- chart palette

## Mobile UI Components To Build First

1. `AppShell`
2. `TopHeader`
3. `SubjectSwitcher`
4. `StarSummaryCard`
5. `ExamCard`
6. `StatusPill`
7. `InsightCard`
8. `QuestionOptionCard`
9. `QuestionNavigatorSheet`
10. `SubmitConfirmationSheet`
11. `EmptyState`
12. `ErrorState`

## File / Module Plan

Recommended app structure:

```text
mobile_student_app/
  app/
    (auth)/
      register.tsx
      login.tsx
      role-gate.tsx
    (student)/
      dashboard.tsx
      analytics.tsx
      exam/
        [examId].tsx
      attempt/
        [attemptId].tsx
  src/
    api/
    components/
    features/
      auth/
      dashboard/
      exams/
      attempts/
      analytics/
    hooks/
    store/
    theme/
    types/
    utils/
```

## Delivery Phases

## Phase M1

Foundation

- Expo app setup
- auth session setup
- query client setup
- theme system
- shell navigation
- role-ready app structure

## Phase M2

Student Auth MVP

- student registration
- student login
- session persistence
- role resolver

## Phase M3

Dashboard MVP

- profile/context fetch
- dashboard summary
- stars summary
- exams listing
- subject lane switcher

## Phase M4

Exam Entry MVP

- exam detail
- start attempt
- resume attempt
- locked-state messaging

## Phase M5

Live Attempt MVP

- attempt runtime fetch
- question rendering
- answer save
- navigation
- submit attempt

## Phase M6

Analytics MVP

- summary cards
- recent performance
- weak topics
- strong topics
- next-step recommendation

## Phase M7

Stability and QA

- session expiry handling
- retry states
- loading states
- network interruption behavior
- device-size QA

## What We Should Reuse From Web Thinking

- subject-aware dashboard logic
- recommendation-first dashboard
- resume attempt priority
- stars as visible context
- backend-first dynamic rendering
- compact analytics guidance

## What We Should Not Copy Directly

- desktop sidebar layout
- wide multi-column cards
- dense admin-style tables
- long stacked explanations

## Risks

## 1. Attempt complexity

The attempt workspace is the highest-risk mobile area.

Mitigation:

- keep first supported question types limited
- use backend runtime as source of truth
- test resume and submit carefully

## 2. Over-scoping analytics

Analytics can become too broad too fast.

Mitigation:

- keep only summary, weak topics, strong topics, and recent trend in MVP

## 3. Inconsistent business rules

Mobile must not invent exam or star logic.

Mitigation:

- all availability, locking, and attempt state come from backend contracts

## Recommended Immediate Next Step

Before implementation, create one more technical companion document:

`NEXORA_STUDENT_MOBILE_API_AND_SCREEN_MAP.md`

That file should map:

- each mobile screen
- exact backend endpoints
- request/response models
- loading/error/empty states
- navigation transitions

## Final Recommendation

Yes, we should build the mobile app with a role-scalable architecture and a student-only first implementation scope.

For release one, build only:

1. Register
2. Login
3. Dashboard
4. Take Exam
5. Analytics

This is the right MVP because it covers:

- orientation
- action
- learning feedback

without dragging in the full commercial or multi-role surface too early.
