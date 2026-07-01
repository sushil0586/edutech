# Nexora Public Entry Phase Wise Implementation Plan

## Purpose

This document converts the approved public entry redesign into an execution plan.

It is based on:

- `NEXORA_PUBLIC_ENTRY_AND_PROFILE_COMPLETION_PLAN.md`
- `NEXORA_PUBLIC_ENTRY_SCREEN_SPEC.md`
- `NEXORA_ONBOARDING_BACKEND_CONTRACT.md`

This file should be used to decide:

- what to implement first
- what depends on backend changes
- what should be validated before moving ahead
- what is explicitly out of scope for the first rollout

## Scope Summary

This implementation plan covers:

- landing page modernization
- quick signup
- first-login complete-profile flow
- onboarding state and redirect logic
- location, school, referral, and acquisition capture
- student dashboard teacher-source filtering
- future-safe academic model support across school, 11/12, and professional tracks

This plan does not cover yet:

- payment provider integration
- WhatsApp referral implementation
- parent-child invite acceptance flow
- school master directory normalization engine
- mobile onboarding implementation

## Execution Rule

Implementation should move in phase order.

If a phase creates new backend contract requirements, those should be completed before dependent frontend work is treated as finished.

## Phase 0. Alignment And Freeze

### Objective

Freeze the public-entry product contract before coding starts.

### Deliverables

- public entry product plan approved
- screen spec approved
- backend contract approved
- phase plan approved

### Output Documents

- `NEXORA_PUBLIC_ENTRY_AND_PROFILE_COMPLETION_PLAN.md`
- `NEXORA_PUBLIC_ENTRY_SCREEN_SPEC.md`
- `NEXORA_ONBOARDING_BACKEND_CONTRACT.md`
- `NEXORA_PUBLIC_ENTRY_PHASE_WISE_IMPLEMENTATION_PLAN.md`

### Exit Criteria

- no open ambiguity remains about quick-signup fields
- no open ambiguity remains about first-login completion behavior
- no open ambiguity remains about teacher-source filtering on student dashboard
- no open ambiguity remains about academic scalability beyond school-only subjects

## Phase 0A. Academic Model Alignment

### Objective

Make sure onboarding and dashboard assumptions stay compatible with:

- school
- senior secondary
- professional

### Deliverables

- confirm that `program`, `subject`, and `topic` remain reusable across learner types
- define `learning lane` or `program family` as a planning concept
- avoid school-only hardcoding in onboarding and dashboard contracts

### Exit Criteria

- subject is treated as a generic learning domain, not only a school subject
- future professional tracks can fit without redesigning onboarding

## Phase 1. Backend Onboarding Foundation

### Objective

Create the core backend support needed for quick signup and onboarding-state-aware routing.

### Scope

- lightweight public registration payload
- onboarding state fields
- authenticated profile response updates
- redirect decision support

### Backend Deliverables

- extend account or profile model with:
  - `onboarding_status`
  - `profile_completion_required`
  - `profile_completion_completed_at`
  - `onboarding_role`
  - `onboarding_version`
- update `POST /api/v1/auth/register/` to accept quick-signup payload
- ensure signup sets onboarding state to incomplete
- update login response user payload if needed
- update `GET /api/v1/auth/me/` to expose onboarding state

### Frontend Dependency

Frontend can start visual work in parallel, but final redirect logic depends on this phase.

### Exit Criteria

- quick-signup payload works without academic or role-detail fields
- newly created user is marked incomplete
- authenticated profile clearly exposes onboarding state

## Phase 2. Onboarding Completion APIs

### Objective

Enable authenticated role-aware profile completion.

### Scope

- completion endpoint
- server-side validation
- role-specific required field rules

### Backend Deliverables

- create `PATCH /api/v1/onboarding/profile/`
  or approved equivalent
- validate required fields by role
- support student completion fields
- support parent completion fields
- support teacher completion fields
- mark onboarding complete only after backend validation passes
- optionally expose missing required fields in response

### Required Role Rules

#### Student

- class
- board
- exam interest
- confirmed location

#### Parent

- child class
- child board
- confirmed location

#### Teacher

- teaching focus
- confirmed location

### Exit Criteria

- incomplete users can save role-specific profile data
- backend rejects incomplete completion payloads truthfully
- onboarding state flips to complete only when required data is valid

## Phase 3. Location, Referral, And Acquisition Layer

### Objective

Capture the right metadata early without hardcoding future assumptions.

### Scope

- referral code support
- generic referral storage model
- IP-based location prefill support
- detected vs confirmed location
- acquisition tracking

### Backend Deliverables

- support `referral_code` at signup
- store referral through generic channel + identifier model
- define detected location structure
- define confirmed location structure
- support source/acquisition fields such as:
  - signup source
  - UTM fields
  - landing variant
  - platform/device metadata

### Recommended Optional Deliverables

- school text capture
- school code capture
- school normalization status field

### Exit Criteria

- referral code can be captured at signup
- backend remains ready for email, phone, and WhatsApp referral channels later
- location prefill data can be stored separately from confirmed user data

## Phase 4. Frontend Quick Signup Implementation

### Objective

Replace the current heavy public signup with the approved lightweight experience.

### Scope

- redesign signup screen
- remove academic overload from public registration
- connect to new backend registration payload

### Frontend Deliverables

- new quick-signup UI
- required fields only:
  - role
  - first name
  - email
  - phone
  - password
  - confirm password
  - referral code optional
- helper copy:
  - complete your profile after login
- truthful validation messages
- login link and success handoff

### Explicit Removals From Public Form

- class
- board
- exam interest
- subject interests
- child details
- teaching details
- location details

### Exit Criteria

- public signup is visibly shorter and clearer
- signup submits only quick-signup fields
- successful signup routes into completion flow, not directly into dashboard

## Phase 5. Frontend Complete Profile Flow

### Objective

Build the first-login complete-profile experience for new and incomplete users.

### Scope

- shared onboarding shell
- role-aware complete-profile forms
- route guard behavior

### Frontend Deliverables

- complete-profile shell
- student complete-profile screen
- parent complete-profile screen
- teacher complete-profile screen
- role-aware validation display
- progress treatment
- save and continue behavior

### Student Form Deliverables

- class
- board
- exam interest
- location
- school context
- optional subject interests

### Parent Form Deliverables

- child class
- child board
- location
- optional concern and school context

### Teacher Form Deliverables

- teaching focus
- location
- optional scope and subject context

### Routing Deliverables

- new users always enter complete profile first
- incomplete returning users are redirected there
- complete users bypass it

### Exit Criteria

- onboarding pages work end to end for student, parent, and teacher
- incomplete users cannot accidentally enter the normal dashboard
- complete users are not blocked unnecessarily

## Phase 6. Landing Page Modernization

### Objective

Make the public homepage production-ready and aligned with the new onboarding model.

### Scope

- hero refresh
- role discovery strip
- product-proof sections
- simplified CTA structure

### Frontend Deliverables

- product-led landing page
- `Get Started` as primary CTA
- `Login` as secondary CTA
- role discovery section
- how-it-works section using:
  - create account
  - complete profile
  - start dashboard
- trust section
- secondary internal-access treatment

### Exit Criteria

- landing no longer feels registration-heavy
- public value proposition is clearer
- internal admin messaging is secondary, not dominant

## Phase 7. Student Dashboard Teacher-Source Filtering

### Objective

Support students who receive exams from multiple teacher sources.

### Scope

- teacher-source filter at the top of student discovery areas
- subject filter dependent on selected teacher source
- assignment ownership visibility

### Backend Deliverables

- student exam/discovery APIs support:
  - `teacher_source=all`
  - `teacher_source=portal`
  - `teacher_id=<id>`
  - subject filtering
- response includes:
  - available teacher sources
  - source-scoped subject options
  - assignment source attribution

### Frontend Deliverables

- top filter for:
  - All teachers
  - Portal teacher
  - actual teacher names
- dependent subject filter
- exam cards show source ownership where relevant
- `All teachers` view aggregates without losing source identity

### Business Rule

Portal-owned supply should still work even when the student has no teacher association yet.

### Exit Criteria

- student can filter exams by source teacher
- subject list changes with teacher selection
- teacher ownership remains visible on assignment cards

## Phase 8. QA, Migration, And Rollout Safety

### Objective

Validate the new flow and protect existing users.

### QA Areas

#### New user paths

- student signup to completion to dashboard
- parent signup to completion to dashboard
- teacher signup to completion to dashboard

#### Existing user paths

- complete users still go straight to dashboard
- incomplete users are redirected properly

#### Error states

- missing onboarding options
- invalid referral code
- incomplete location confirmation
- partial role profile data

#### Student teacher-source cases

- student with only portal inventory
- student with one teacher
- student with two teachers
- overlapping subjects across teachers

### Migration Concerns

- existing users should not be incorrectly marked incomplete
- internal roles should not be pushed into public onboarding
- old registration UI should be retired only after new flow is verified

### Exit Criteria

- no regression for existing users
- new onboarding flow is stable
- source filtering works for student exam discovery

## Recommended Implementation Order

Use this exact order:

1. Phase 1 backend onboarding foundation
2. Phase 2 onboarding completion APIs
3. Phase 3 location, referral, and acquisition layer
4. Phase 4 quick signup frontend
5. Phase 5 complete-profile frontend
6. Phase 6 landing modernization
7. Phase 7 student teacher-source filtering
8. Phase 8 QA and rollout safety

## Final Recommendation

The safest and cleanest execution path is:

- backend contract first
- onboarding flow second
- landing refresh third
- student teacher-source dashboard filtering after onboarding is stable

This keeps the public entry redesign grounded in real backend truth and avoids building polished screens on top of incomplete routing rules.
