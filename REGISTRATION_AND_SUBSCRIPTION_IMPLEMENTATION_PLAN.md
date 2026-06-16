# Nexora Registration And Subscription Implementation Plan

## Purpose

This document defines the next implementation phase for the public entry experience.

It focuses on two things:

- a role-aware registration and onboarding workflow for students, parents, and teachers
- a subscription-ready backend design that stays flexible even though the current product is free

This plan is intended to be reviewed before any further code changes are made.

## Product Intent

Nexora is not building a generic sign-up form.

The product goal is a guided entry experience that:

- understands who the user is
- understands what they care about
- routes them to the correct workspace
- keeps the current access model honest
- leaves room for future subscriptions and paid plans without rewriting the foundation

The current state is:

- student self-registration should be light, guided, and class and board aware
- parent registration should be simple and support linked-child context later
- teacher registration should be guided and easy, even if approval or provisioning still happens behind the scenes
- institute admin and platform admin access remain internal and should not dominate the public registration story
- all product usage remains free for now

## Current Constraints

We should design the workflow around what exists today.

### What already exists

- role-aware authentication
- student, teacher, institute admin, platform admin, and parent portal shells
- student roster onboarding tools for admins and institutes
- teacher roster onboarding tools for admins and institutes
- admin-controlled academic setup
- a public homepage and role-aware auth entry points

### What does not yet exist

- public self-registration API for students, parents, or teachers
- parent-child linking workflow
- invite acceptance workflow for family access
- payment collection
- subscription checkout
- paid feature enforcement

## Workflow Principles

The workflow should follow these rules:

- be explicit about what is free today
- be explicit about what is provisioned versus self-serve
- never route the user into a dead end
- personalize the journey for the learner type
- keep validation minimal and role-specific
- only require fields that matter for the selected lane
- preserve the current backend model instead of creating fake public signup promises
- keep future subscription support structural, not visible as payment friction yet

## Target User Journeys

### 1. Student Journey

This is the most important onboarding journey for the public product.

#### Expected inputs

- class level
- board
- primary exam interest
- preferred subject set
- intent level, such as:
  - school exam prep
  - Olympiad
  - NSTSE
  - subject mastery
  - mental aptitude

#### Example journeys

- Class 7 learner
  - board: CBSE or State Board
  - focus: Olympiad, NSTSE, mental aptitude
  - subjects: math, science, computer, SST, GK

- Class 10 learner
  - board: CBSE, ICSE, or State Board
  - focus: board exams and sample papers
  - subjects: math, science, SST, English, Hindi, computer

#### What the user should see

- a relevant registration preview
- subject suggestions based on class band
- exam intent suggestions based on the selected class band
- a clear handoff to the correct login lane
- only the fields needed for student context should be required

#### What happens next

- if the student already has credentials, they continue to the student login lane
- if the student is not yet provisioned, the flow should explain that access is issued by the institute or admin workflow
- once logged in, the student should land on a dashboard tuned to class, board, and exam intent

### 2. Parent Journey

Parent onboarding should stay simple and focused on the linked-child context.

#### Expected inputs

- child class
- child board
- parent concern
  - readiness
  - weak subjects
  - recent outcomes
  - attendance/activity
  - milestones and alerts

#### What the user should see

- a family workspace preview
- a clear note that parent access is linked to a child context
- the relevant login lane

#### What happens next

- the parent continues to the parent login lane
- after login, the parent should land on a dashboard centered on child readiness and alerts

### 3. Teacher Journey

Teachers should see a teaching-oriented onboarding preview.

#### Expected inputs

- teaching focus
- subject set
- delivery scope
- class range or cohort type

#### What the user should see

- exam builder and question bank context
- the role-provisioning model
- the relevant teacher login lane
- only the teacher-specific fields should be required for this lane

#### What happens next

- the teacher continues to the teacher login lane
- after login, the teacher should land on exam builder, question bank, and results-first screens

### 4. Internal Admin Journeys

Institute admin and platform admin access should stay internal.

#### What the user should see

- a secondary internal access link or footer path
- no public self-service promise
- direct routing to the appropriate login lane

## Proposed Public Flow

### Entry Flow

1. User lands on the homepage.
2. User clicks `Register`.
3. User lands on a role-aware registration hub.
4. User selects a lane:
   - student
   - parent
   - teacher
5. The page shows lane-specific context and a profile preview.
6. Internal admin lanes remain available through a secondary internal access path.
7. The user continues to the matching auth lane.

### Student-specific flow

1. User selects student.
2. User chooses class level.
3. User chooses board.
4. User chooses exam intent.
5. User sees subject suggestions and likely exam focus.
6. User continues to student login.

### Parent-specific flow

1. User selects parent.
2. User selects child class and concern area.
3. User sees invite-linked family preview.
4. User continues to parent login.

### Teacher-specific flow

1. User selects teacher.
2. User selects teaching focus.
3. User sees subject coverage preview.
4. User continues to teacher login.

### Internal admin flow

1. User uses the secondary internal access path.
2. User selects institute admin or platform admin login.
3. The user bypasses the public registration experience.

## Subscription Strategy

The subscription model should be backend-ready even while the product remains free.

### Current commercial posture

- no checkout
- no pricing enforcement
- no paid access gates
- no subscription UI beyond informational copy

### Future-ready backend goals

We should support these concepts now, even if they are not yet active:

- plan catalog
- entitlement flags
- feature availability rules
- trial or free tier markers
- institution-level billing scope
- learner-level billing scope
- family-level billing scope

### Recommended internal model

The backend should eventually distinguish between:

- `plan`
- `entitlement`
- `subscription_status`
- `billing_scope`
- `feature_gate`

That lets us start free and later support:

- free learners
- institute subscriptions
- mock test packs
- family plans
- premium content bundles

### What we should avoid right now

- hard-coding payment assumptions into the UI
- tying route access directly to paid status before a billing model exists
- building checkout before the plan and entitlement model exists

## Subscription Phasing

### Phase A. Free-Only Release

This is the current state.

Goals:

- keep the product free
- collect onboarding preferences
- store future-compatible metadata
- show no payment friction

### Phase B. Internal Entitlement Layer

This should happen before payments.

Goals:

- define who gets access to which feature
- support free, trial, and premium flags in the backend
- keep UI copy neutral

### Phase C. Pricing And Pack Models

This comes later.

Goals:

- define subscription packs
- define exam packs or subject packs
- define institutional plan tiers
- map features to plans

### Phase D. Checkout And Enforcement

This should be the last step.

Goals:

- connect billing provider
- collect payment
- enforce entitlement rules
- support renewals and expiration

## Backend Design Requirements

The backend should be prepared for future monetization without changing the current release model.

### Data to capture now

- role
- class level
- board
- exam interest
- subject interest
- setup intent
- registration source
- billing readiness marker

### Future data to capture

- plan identifier
- entitlement state
- subscription status
- expiry date
- billing scope
- pack ownership

### Recommended design rule

If a field is only useful for the future subscription model, it should be optional now and not block onboarding.

## Recommended Implementation Order

### Step 1. Finalize workflow document

Lock the registration and subscription workflow plan before code changes.

### Step 2. Keep the current public hub

Use the existing homepage and role-aware registration experience as the first public layer, but keep the public lanes limited to student, parent, and teacher.

### Step 3. Persist onboarding profile data

Capture class, board, subject, and interest metadata in a flexible way for later use.

### Step 4. Design the backend entitlement model

Add the future subscription structure without turning on payments.

### Step 5. Add role-specific backend onboarding later

Only after the workflow is approved, implement the server-side provisioning or invitation APIs needed to make the UI fully real.

### Step 6. Add subscription UI last

Introduce pricing, subscription packs, and billing only when the product is ready.

## Success Criteria

This work is successful if:

- a Class 7 Olympiad learner sees a different journey from a Class 10 board learner
- students, parents, and teachers each land in the right lane
- the product remains free for now
- the backend is still ready for future plans and paid packs
- we avoid rework when monetization starts later

## Open Questions For Review

Before implementation, we should confirm:

- should student onboarding preferences be stored immediately or only once self-registration exists?
- should parent registration stay lightweight until parent-child linking ships?
- should teacher onboarding be self-serve or approval-backed at launch?
- should the first entitlement model be global to the account or scoped by institute?
- should the future pricing model be learner packs, institute plans, or both?

## What Should Not Happen Yet

Avoid these until the plan is approved:

- implementing payment checkout
- enforcing paid access
- introducing a pricing wall
- redesigning the backend around monetization before onboarding is stable

## Review Summary

The right next move is a guided, role-aware onboarding workflow with a flexible subscription backbone.

The near-term product stays free.

The backend stays future-ready.

The UI becomes more relevant to the actual user type from the first screen onward.
