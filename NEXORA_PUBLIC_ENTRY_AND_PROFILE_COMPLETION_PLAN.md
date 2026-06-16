# Nexora Public Entry And Profile Completion Plan

## Purpose

This document defines the product and implementation plan for modernizing the public entry flow without starting code yet.

It covers:

- the public landing page refresh
- the registration simplification strategy
- the first-login complete-profile experience for new users only
- backend, frontend, and routing implications
- phased implementation order

This document should be treated as the working source of truth for this change set until implementation begins.

Execution checklist:

- `NEXORA_PUBLIC_ENTRY_PHASE_WISE_IMPLEMENTATION_PLAN.md`

## Why This Change Is Needed

The current web product quality is now strong across the authenticated student, teacher, parent, institute, and platform-admin sections.

The remaining weak spot is the public entry experience:

- the landing page is still from an earlier phase
- the registration page is functionally capable but too heavy for a first-touch public user
- too many profile fields are being collected before trust is built
- account creation and profile shaping are mixed into one long flow
- after successful registration the user goes straight to the main workspace, even if the profile is still incomplete for a production-grade experience

The product direction now should be:

- reduce friction before account creation
- let users create access quickly
- collect only essential identity at signup
- move role-specific profile completion to the first authenticated experience
- guide new users through completion before normal workspace usage

## Product Decision

### Final UX Direction

Nexora should move to a two-step onboarding model:

1. lightweight account creation from the public side
2. guided complete-profile flow immediately after first login for newly registered users only

This means:

- public signup should become short, calm, and low-friction
- role-aware profile details should move behind authentication
- the first post-login page for a newly created account should be `Complete Profile`
- existing users should continue directly to their normal dashboard

## Current State Review

## Current Public Landing

Current file:

- `edutech_web/src/app/(marketing)/page.tsx`

What is already good:

- aligned visual language
- role-aware language
- clear login and register actions
- trust-building structure

What is still legacy from a product readiness point of view:

- the message is still too registration-centric
- the page spends too much energy describing the flow instead of driving trust and action
- lane cards are useful, but the page should feel more product-led and less form-led
- internal admin access is still discussed on the public homepage instead of feeling tucked away

## Current Signup Experience

Current files:

- `edutech_web/src/app/(auth)/signup/page.tsx`
- `edutech_web/src/components/auth/registration-hub.tsx`
- `edutech_web/src/lib/auth/actions.ts`

Current behavior:

- user chooses role
- user fills account identity fields
- user also fills lane-specific academic or role-specific fields before account creation
- registration action sends everything in one payload
- successful registration redirects directly to the destination dashboard

Current issues:

- too much is asked before the user has seen the product
- student, parent, and teacher profile shaping is happening too early
- the flow feels like a setup wizard instead of fast account creation
- first-login onboarding is missing
- there is no system concept yet for `new user requiring profile completion`

## New Product Principles

The redesigned public entry flow should follow these principles:

- signup should ask for the least amount of information required to create access
- anything not required for authentication should be deferred when possible
- role selection should stay early because routing depends on it
- the public page should sell confidence, not complexity
- every new user should understand what happens next
- complete-profile should be guided, not punitive
- profile completion should be role-aware and dynamic
- no hardcoded boards, classes, subjects, or institute assumptions
- all completion options should come from backend-supported configuration or live APIs

### Academic breadth principle

The onboarding system must be future-safe for:

- school
- senior secondary
- professional

So profile completion and dashboard personalization should not permanently assume every learner is defined only by:

- class
- board
- school subject list

The long-term contract should support:

- class-based academic journeys
- stream-based 11/12 journeys
- certification or skill-track professional journeys

## Proposed Target Experience

## 1. Public Landing Page

The landing page should become a product-first entry page, not a registration explanation page.

### Primary goals

- explain what Nexora is
- establish trust quickly
- make login and get-started actions obvious
- help students most, while still supporting parent and teacher discovery
- keep public registration clear but not dominant

### Recommended landing structure

1. hero section
   - product promise
   - one strong CTA: `Get Started`
   - one secondary CTA: `Login`

2. role-aware discovery strip
   - student
   - parent
   - teacher
   - each should describe the value, not the registration form

3. product proof section
   - dashboard
   - exam flow
   - analytics
   - wallet or rewards if relevant to public story

4. how it works
   - create account
   - complete profile
   - start learning or teaching

5. trust and support section
   - institute-ready
   - secure login
   - guided onboarding

6. footer
   - login
   - support
   - internal admin access kept secondary

### Landing copy direction

The landing page should stop saying:

- long explanations about what registration collects
- too much role configuration before trust
- internal operational detail on the main screen

It should instead emphasize:

- learn
- practice
- assess
- track growth
- role-specific workspace after login

## 2. Lightweight Signup

Signup should become a short public form.

### Minimum required fields at signup

These should be the only required public fields unless backend constraints force otherwise:

- role
- first name
- email
- phone
- password
- confirm password

Optional at signup:

- last name
- referral code
- school or institute code if explicitly relevant

### Current quick-signup contract

For the current implementation phase, the quick-signup form should explicitly contain:

- role
- first name
- email
- phone
- password
- confirm password
- referral code optional

This is the approved lightweight public registration field set before the authenticated complete-profile flow begins.

### Fields to remove from public required signup

These should move to the authenticated complete-profile step:

#### Student

- class
- board
- exam interest
- subject interests

#### Parent

- child class
- child board
- parent concern

#### Teacher

- teaching focus
- teaching scope
- class range
- subject mapping

### Role selection model

Role should still be selected before signup because:

- the account must route into the correct portal
- the post-login completion flow must know which profile form to show
- the role determines future data requirements

### Future learner-type expansion

The current public student lane can remain school-first, but the contract should leave room for learner-type branching such as:

#### School learner

- class
- board
- exam interest

#### Senior secondary learner

- class 11 or 12
- board
- stream
- exam interest

#### Professional learner

- certification track
- experience level
- specialization interest

This should be implemented through backend-driven options, not frontend hardcoding.

### Signup screen UX model

The page should contain:

1. a short headline
2. role selection chips or cards
3. a very small account form
4. one calm helper line:
   `You can finish your profile after login`
5. one strong submit button
6. one secondary login link

This should feel more like:

- create access

and less like:

- complete all academic onboarding now

## 3. First-Login Complete Profile Flow

This is the major product change.

### Core behavior

After registration succeeds:

- create the account
- authenticate the user
- route the user to a new role-aware `Complete Profile` flow
- block normal dashboard usage until required profile fields are completed

This should happen only for:

- newly registered public users
- existing users with incomplete required profile data

This should not interrupt:

- existing fully onboarded users
- internal admins who are not part of public self-serve onboarding

## Required system concept

We need a profile completion state model.

At minimum the system should support:

- `not_started`
- `in_progress`
- `completed`
- `skipped_optional_steps` if optional later phases are introduced

### Recommended account-level flags

One of these should become the backend source of truth:

#### Option A. Explicit onboarding status fields on account profile

- `onboarding_status`
- `profile_completion_required`
- `profile_completion_completed_at`

#### Option B. Derived completion state from role profile fields

This is possible, but not recommended as the primary implementation because:

- logic becomes fragmented
- rules become hard to audit
- future onboarding steps become difficult to extend

### Preferred direction

Use explicit onboarding state fields in the backend, even if the final completeness is also validated against role data.

## 4. Role-Aware Complete Profile Screens

The complete-profile experience should be a shared framework with role-specific content.

### Shared shell

All roles should use:

- same global design language
- same header style
- same form system
- same progress treatment
- same action patterns

### Student complete-profile required fields

Phase 1 required:

- class
- board
- exam interest

Phase 1 optional or conditional:

- subject interests
- school code or institute selection if public registration is not generic
- referral email if not collected at signup

### Parent complete-profile required fields

Phase 1 required:

- child class
- child board

Phase 1 optional or deferred:

- concern area
- child linking or invitation acceptance

Note:

Parent-child linking may still require a future dedicated workflow. For now, complete profile should gather enough context to personalize the workspace even before actual child linking is done.

### Teacher complete-profile required fields

Phase 1 required:

- teaching focus

Phase 1 optional or deferred:

- teaching scope
- preferred subjects
- class range
- institute association flow if needed

### Institute and platform admin

These should not use the public onboarding path.

They should continue through internal login and existing managed provisioning.

## 5. Routing Rules

### Signup success

Current:

- signup redirects directly to dashboard based on role

Target:

- signup redirects to a role-aware post-auth resolver
- resolver checks onboarding state
- incomplete users go to `Complete Profile`
- complete users go to normal dashboard

### Login success

On every login:

1. authenticate
2. fetch profile
3. evaluate profile completion requirement
4. if incomplete:
   - redirect to completion flow
5. else:
   - redirect to role dashboard

### Route guard requirement

Protected routes should enforce:

- if `profile_completion_required === true`
- and current route is not an allowed onboarding route
- redirect user to their completion page

This prevents partially created public users from entering the full workspace before required context exists.

## 6. Backend And API Planning

No implementation yet, but the plan should expect backend support.

### Registration endpoint behavior

Current endpoint:

- accepts account identity plus role-specific profile data

Target endpoint direction:

- must accept lightweight identity-only registration
- should not require role-detail fields at public signup

### New backend capabilities needed

1. lightweight public registration support
2. onboarding state on the account profile
3. profile completion update endpoint per role, or shared onboarding endpoint
4. post-login redirect logic support through returned profile state
5. completion rule evaluation that is database-backed, not hardcoded in frontend only
6. referral capture and resolution that is identifier-agnostic even if the first UI version uses referral code

### Referral strategy

For the current release, referral should use a referral code in the public-facing signup flow because it is lightweight and easy to enter during quick registration.

However, the backend should not be designed as code-only.

The backend referral model should stay friendly to future identifiers such as:

- referral code
- email
- phone number
- WhatsApp number
- invite token

### Recommended backend referral model direction

The referral system should separate:

1. referral channel
2. referral identifier
3. referral owner
4. referral resolution status

That means the model should be able to represent:

- channel: `code`
- identifier: `NEXORA-ABC123`

today, and later also:

- channel: `email`
- identifier: `friend@example.com`

- channel: `phone`
- identifier: `9876543210`

or:

- channel: `whatsapp`
- identifier: `9876543210`

without redesigning the schema.

### Recommended current product behavior

Current signup and onboarding UX:

- allow `referral code`
- store it through a generic referral structure
- do not hardwire business logic to code-only assumptions

Future-ready behavior:

- allow `referred by email`
- allow `referred by phone`
- allow `referred by WhatsApp`
- allow invite-link or token-based referrals
- reuse the same referral event and reward pipeline

### Recommended API surface

#### Existing

- `POST /api/v1/auth/register/`
- `POST /api/v1/auth/login/`
- `GET /api/v1/auth/register/options/`

#### Needed

- `GET /api/v1/auth/me/` should include onboarding fields if not already
- `PATCH /api/v1/onboarding/profile/`
or
- role-specific completion endpoints such as:
  - student completion
  - parent completion
  - teacher completion
- `GET /api/v1/onboarding/options/` if the completion flow needs separate option payloads

### Important backend rule

The completion flow must not rely on hardcoded:

- board lists
- class lists
- exam interests
- subject catalogs
- teacher focus options
- parent concern options

All of these should remain backend-fed.

## 7. Frontend Architecture Plan

## New frontend areas expected

### Public pages

- refreshed landing page
- simplified signup page
- optional signup success transition state if needed

### Authenticated onboarding pages

- shared complete-profile shell
- student complete-profile page
- parent complete-profile page
- teacher complete-profile page

### Shared auth utilities

- onboarding status resolver
- redirect helper
- route guard
- role-aware completion rules

## 8. UX Rules For Production Readiness

### Landing

- cleaner hero
- stronger product message
- less configuration talk
- less explanation overload
- internal access kept secondary

### Signup

- no large multi-stage public form
- no academic overload before trust
- minimal validation burden
- explicit note that profile can be completed after login

### Complete profile

- informative, not overwhelming
- one clear reason for each field
- progress visibility
- validation should explain what is missing and why
- should feel like setup, not rejection

### Error and edge-state messaging

We should explicitly handle:

- registration created but profile not completed
- login success but onboarding incomplete
- missing registration options from backend
- role exists but no role profile record yet
- parent account waiting for child-linking workflow

## 9. Scope Boundaries

This change should include:

- landing redesign planning
- signup simplification planning
- first-login complete-profile planning
- routing and guard planning
- backend onboarding-state planning

This change should not include yet:

- actual code implementation
- payment or star logic changes
- mobile onboarding changes
- institute-admin provisioning redesign
- parent-child invite system implementation

## 10. Recommended Delivery Phases

## Phase 1. Finalize Product Contract

Goal:

- agree what is required at signup versus post-login completion

Output:

- approved field split by role
- approved routing rules
- approved onboarding status model

## Phase 2. Backend Contract Design

Goal:

- define the endpoint behavior and onboarding state persistence

Output:

- registration payload changes
- onboarding status fields
- completion endpoint contract

## Phase 3. UX And Screen Documentation

Goal:

- finalize the exact landing, signup, and complete-profile screen behavior

Output:

- screen-by-screen UX spec
- validation and empty-state rules
- component reuse plan

## Phase 4. Web Implementation

Goal:

- implement landing
- implement lightweight signup
- implement first-login complete-profile flow
- implement route guards

Output:

- production-ready public entry flow on web

## Phase 5. QA And Rollout

Goal:

- validate both new-user and existing-user paths

Output:

- verified registration
- verified first-login completion
- verified login redirects
- verified legacy user non-regression

## 11. Final Recommendations

### Recommendation 1

Public registration should be reduced to identity creation plus role selection only.

### Recommendation 2

Academic and role-detail fields should move to an authenticated complete-profile step.

### Recommendation 3

Every new public user should land on a required complete-profile page before dashboard access.

### Recommendation 4

Profile completion should be enforced through backend-supported onboarding state, not only UI assumptions.

### Recommendation 5

The landing page should become more product-led and less form-led.

## 12. Location, School, And Acquisition Analytics Plan

The onboarding redesign should also prepare Nexora for regional and institution-level analytics.

### Why this matters

In future phases we should be able to analyze:

- registrations by country
- registrations by state
- registrations by city
- registrations by pincode
- registrations by school
- conversion by campaign
- performance by geography
- school-wise growth and engagement

### Recommended onboarding fields

The new onboarding system should support these fields structurally.

#### Geo identity

- country
- state
- city
- pincode
- timezone

#### School identity

- school name
- school id when matched to a master directory
- school code or invite code when applicable
- school board affiliation
- school type

#### Acquisition identity

- signup source
- referral code
- referral channel
- referral identifier
- invite code
- utm source
- utm medium
- utm campaign
- utm term
- utm content
- landing page variant or experiment id

#### Device and platform context

- platform
- device category
- app or web version
- browser family if needed for analytics only

### IP-based prefill policy

Country, state, city, and pincode may be prefetched from IP lookup, but this must be treated as assistive data only.

IP-derived location should:

- prefill the form
- reduce manual typing
- improve first-touch personalization
- support marketing and regional analytics

IP-derived location should not:

- become the final profile truth automatically
- overwrite user-confirmed values
- be treated as reliable enough for school mapping by itself

### Required data model rule

We should store both:

- detected location
- confirmed location

This gives us cleaner analytics and safer profile truth.

### Recommended model direction

#### Account profile

Keep high-level onboarding and acquisition fields such as:

- role
- onboarding status
- profile completion required
- signup source
- referral metadata
- invite metadata

#### Account location

Use a dedicated structure for:

- detected country
- detected state
- detected city
- detected pincode
- detected timezone
- detected source
- detected at
- confirmed country
- confirmed state
- confirmed city
- confirmed pincode
- confirmed timezone
- confirmed at

#### Account acquisition

Use a dedicated structure for:

- utm fields
- campaign info
- landing variant
- device metadata
- platform metadata

#### School normalization support

To enable school-wise analytics, keep space for:

- school_name_text
- school_id
- school_normalization_status

This is important because public users may enter schools with inconsistent naming, and we will eventually need to normalize them into a shared school directory.

### UX rule for location collection

The user experience should be:

1. detect probable location from IP
2. prefill country, state, city, and pincode when available
3. let the user confirm or edit them
4. use confirmed values as final profile truth
5. preserve detected values separately for analytics

### Scope note

This document only defines the product and data planning direction.

Implementation should happen later through:

- backend contract updates
- location detection integration
- master location and school lookup support
- onboarding UI updates

## 13. Proposed Next Documentation

Before coding, we should create two follow-up docs:

1. `NEXORA_PUBLIC_ENTRY_SCREEN_SPEC.md`
   - exact screen behavior
   - sections
   - copy direction
   - validation

2. `NEXORA_ONBOARDING_BACKEND_CONTRACT.md`
   - backend fields
   - endpoint contract
   - redirect rules
   - completion-state truth model

Status:

- `NEXORA_PUBLIC_ENTRY_SCREEN_SPEC.md` is now created
- `NEXORA_ONBOARDING_BACKEND_CONTRACT.md` is now created

## Final Decision Summary

Nexora should no longer ask public users to finish their full academic or role profile before account creation.

The production-ready model should be:

- lightweight signup outside
- guided complete-profile inside
- new users only see complete-profile first
- existing users continue directly to their dashboard
- location can be smart-prefilled from IP but must remain user-confirmable
- regional, school, and campaign analytics should be planned now in the onboarding data model
