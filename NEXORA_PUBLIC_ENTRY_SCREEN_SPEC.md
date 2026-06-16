# Nexora Public Entry Screen Specification

## Purpose

This document defines the screen-by-screen UX specification for the public entry flow.

It translates the product decisions from:

- `NEXORA_PUBLIC_ENTRY_AND_PROFILE_COMPLETION_PLAN.md`

into concrete screen behavior for:

- landing
- quick signup
- login handoff
- first-login complete profile
- first student dashboard after onboarding

This document is for product and implementation alignment before coding starts.

## Flow Overview

The approved flow is:

1. public landing
2. quick signup
3. authenticated complete profile
4. dashboard access

Routing rule:

- new users must complete profile before dashboard access
- existing completed users go straight to their normal dashboard

## Screen 1. Public Landing

### Screen goal

Convince the user to begin, without overwhelming them with registration detail.

### Primary user questions this screen must answer

- what is Nexora
- is this for me
- what happens after I start
- where do I log in if I already have an account

### Main CTAs

Primary:

- `Get Started`

Secondary:

- `Login`

### Recommended section structure

#### 1. Header

Should include:

- brand
- Home
- Login
- Get Started

Should not emphasize:

- internal admin access
- deep registration explanation

#### 2. Hero

Goal:

- create confidence quickly

Content direction:

- one clean product promise
- one supporting paragraph
- one short proof line

Recommended message shape:

- Nexora helps students practice, take exams, and improve with a guided learning journey
- parents and teachers can access their own workspaces too

Hero actions:

- `Get Started`
- `I already have a login`

#### 3. Role discovery strip

Three cards only:

- Student
- Parent
- Teacher

Each card should show:

- role title
- one-line value proposition
- 2 to 3 short benefits

Each card should not show:

- long field explanations
- backend setup language
- admin/operator wording

#### 4. Product proof section

Purpose:

- make the product feel real and already working

Recommended proof cards:

- dashboard and recommendations
- live exam experience
- analytics and progress
- wallet, rewards, or plans if appropriate

#### 5. How it works

This section should explicitly show the simple onboarding sequence:

1. create your account
2. complete your profile
3. access your dashboard and exams

This is important because the user should know that signup is intentionally short.

#### 6. Trust section

Use compact trust indicators such as:

- secure login
- guided onboarding
- role-aware workspace
- institution-ready

#### 7. Footer

Should include:

- login
- support
- privacy/terms later
- secondary internal access links if needed

Internal admin access should be present but visually secondary.

### UX rules

- no oversized explanatory tables
- no “what registration collects” panel on landing
- no operational language about shared database internals
- the screen should feel product-led, not workflow-led

## Screen 2. Quick Signup

### Screen goal

Create an account fast with minimal friction.

### Required fields

- role
- first name
- email
- phone
- password
- confirm password

### Optional fields

- referral code

### Fields not allowed in quick signup

These must not appear in the first public form:

- class
- board
- exam interest
- subject interests
- child class
- child board
- parent concern
- teaching focus
- teaching scope
- full location profile
- school detail fields except special pre-linked cases

### Page structure

#### 1. Compact header

Should include:

- brand
- login link

#### 2. Intro block

Headline direction:

- create your Nexora account

Support copy:

- choose your role now
- finish your full profile after login

#### 3. Role selection area

Role choices:

- Student
- Parent
- Teacher

Behavior:

- role selection updates the signup context
- but does not reveal long role-specific forms

#### 4. Signup form

Field order:

1. role
2. first name
3. email
4. phone
5. password
6. confirm password
7. referral code optional

#### 5. Helper text

One short assurance line:

- `Profile details like class, board, teaching focus, and location can be completed after login.`

#### 6. Actions

Primary:

- `Create Account`

Secondary:

- `Go to Login`

### Validation rules

Validation should be minimal and readable.

Examples:

- `Please choose your role.`
- `Enter your first name.`
- `Enter a valid email address.`
- `Enter your phone number.`
- `Create a password.`
- `Passwords do not match.`
- `Referral code is invalid.` only if validation actually exists

### Success behavior

On successful signup:

- create account
- create authenticated session
- redirect to role-aware complete-profile page

The user should not go to dashboard immediately.

## Screen 3. Login

### Screen goal

Authenticate existing users cleanly and route them correctly.

### Behavior

After successful login:

- fetch current profile
- check onboarding status
- if incomplete:
  - redirect to complete profile
- if complete:
  - redirect to dashboard

### Login UX note

The login screen does not need a major product rewrite right now, but its copy should align with the new onboarding model.

Recommended helper line:

- `New account? Create access first, then complete your profile after login.`

## Screen 4. Complete Profile Shell

### Screen goal

Finish the role-specific profile in a guided, low-anxiety way.

### Screen audience

Only:

- newly registered users
- incomplete returning users

### Shared shell structure

#### 1. Header

Should show:

- brand
- role badge
- progress label

Should not show:

- full dashboard navigation

#### 2. Title block

Recommended headline:

- `Complete your profile`

Support copy:

- `We only need a few more details to personalize your workspace.`

#### 3. Progress indicator

Simple and calm:

- step indicator
- required fields count if useful

No long wizard complexity.

#### 4. Form area

Role-aware content only.

#### 5. Sidebar or helper card

Can show:

- why these details matter
- what the user will unlock after completion

#### 6. Actions

Primary:

- `Save and Continue`

Secondary:

- `Back`

No skip for required onboarding.

### Shared UX rules

- validation should explain what is missing
- every field should feel necessary
- avoid multi-page complexity unless truly needed
- use backend-fed options only

## Screen 5. Student Complete Profile

### Goal

Collect the student context needed to personalize exams and dashboard content.

### Academic scope note

The current release can stay school-first for the student lane, but this screen should be designed so it can later branch for:

- school learners
- senior secondary learners
- professional learners

That means the completion shell should not be built in a way that permanently assumes only:

- class
- board
- school textbook subjects

### Required fields

- class
- board
- exam interest

### Recommended required fields for this phase

- country
- state
- city
- pincode

These can be smart-prefilled from IP, but must remain editable and confirmable.

### Optional or conditional fields

- school name
- school code
- subject interests
- timezone if not auto-detected

### Suggested layout

Section 1. Academic profile

- class
- board
- exam interest

Section 2. Location

- country
- state
- city
- pincode

Section 3. School context

- school name
- school code if applicable

Section 4. Interest summary

- subject interests optional

### Future branch behavior

Later this same completion shell should be able to support:

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
- skill level
- specialization interest

### Completion result

After save:

- mark onboarding complete
- route to student dashboard

## Screen 6. Parent Complete Profile

### Goal

Collect enough child context to personalize the parent workspace even before full child-linking workflows mature.

### Required fields

- child class
- child board
- country
- state
- city
- pincode

### Optional fields

- parent concern
- school name
- invite code if later needed

### Completion result

After save:

- mark onboarding complete
- route to parent dashboard

## Screen 7. Teacher Complete Profile

### Goal

Collect enough teaching context to shape the teacher workspace without turning onboarding into an admin setup exercise.

### Required fields

- teaching focus
- country
- state
- city
- pincode

### Optional fields

- teaching scope
- class range
- subject preferences
- school or institute association hint

### Completion result

After save:

- mark onboarding complete
- route to teacher dashboard

## Screen 8. First Student Dashboard After Onboarding

### Goal

Make the student immediately understand what they can do next.

### Teacher-source filter requirement

The student dashboard should support the case where:

- a student joins directly from the public site
- the same student may later be associated with one or more teachers
- different teachers may assign different exams

So the dashboard should include a top-level teacher-source filter.

### Teacher-source filter behavior

The top filter area should support:

- `All teachers`
- `Portal teacher`
- `Teacher 1`
- `Teacher 2`

Note:

- `Teacher 1` and `Teacher 2` are placeholders for actual assigned teacher names
- the final UI should show real teacher labels from backend data
- `Portal teacher` means platform-curated or public/default Nexora exam supply not tied to a specific external teacher assignment

### Subject filter dependency

The subject filter below should respond to the selected teacher source.

Expected behavior:

1. user selects a teacher source
2. dashboard reloads or refilters the available exam inventory
3. subject options should narrow to the subjects available under that teacher source
4. exam cards, recommendations, and assignment sections should reflect the selected teacher source plus selected subject

### Why this is needed

This helps separate:

- public or portal-provided exams
- assignments from one teacher
- assignments from another teacher

without mixing all exam streams into one confusing list.

### Dashboard sections to prioritize

#### 1. Welcome header

Should reflect:

- first name
- current program or learning track
- current academic context where applicable

#### 2. Recommended next exam

One strong card with:

- exam title
- type
- question count
- duration
- CTA

#### 3. Plan-based exams

This section should show exams available through the student’s current access plan or entitlement rules.

These exams should also respect the selected teacher source when teacher-scoped assignment visibility applies.

#### 4. Sample exams

This section should show:

- free starter exams
- open discovery tests
- low-friction practice content

Portal-owned sample exams should typically remain visible under:

- `All teachers`
- `Portal teacher`

#### 5. Locked or premium exams

This section should remain clearly labeled if applicable.

#### 6. Analytics summary

Compact starter metrics:

- attempts
- recent score
- weak area summary

#### 7. Wallet or rewards

Show only if relevant to the current student economy state.

### Important dashboard rule

The first dashboard should make it obvious that the user can start with:

- sample exams
- recommended exams
- plan-based exams

without needing to search across the product.

### Program-aware dashboard rule

The dashboard should eventually be able to render learner context from a broader model such as:

- school program
- senior secondary stream program
- professional certification program

So the top summary and future filtering model should evolve around:

- learning lane
- program
- subject
- topic

not only around class and board.

### Assignment display rule

If multiple teachers have assigned work to the same student:

- each exam card or assignment card should preserve assignment ownership context
- the card should indicate whether it came from:
  - portal teacher
  - assigned teacher A
  - assigned teacher B

This should be visible even when `All teachers` is selected.

## State Behavior Specification

## New user

Path:

- landing
- quick signup
- complete profile
- dashboard

## Existing complete user

Path:

- login
- dashboard

## Existing incomplete user

Path:

- login
- complete profile
- dashboard

## Registration options unavailable

Behavior:

- quick signup should still work if it does not require dynamic academic options
- complete-profile should show a clear backend configuration state if role-specific options are unavailable

## Validation And Messaging Rules

### General tone

- informative
- calm
- specific
- not technical

### Good examples

- `Enter your first name to continue.`
- `Choose your class so we can personalize exams.`
- `Confirm your city and pincode to improve recommendations and analytics.`
- `Complete your profile to open the right dashboard and exam catalog.`

### Avoid

- vague red errors
- backend terminology
- operator language
- overexplaining rules in long paragraphs

## Design Direction

The screens should stay aligned with the current polished Nexora design language:

- soft and modern
- same global CSS foundation
- consistent header, card, button, and surface treatment
- sober premium feel
- compact, readable form layout

Landing should be more expressive than the internal app screens, but still belong to the same family.

## Implementation Notes

This spec does not decide backend schema in detail.

That should be defined in:

- `NEXORA_ONBOARDING_BACKEND_CONTRACT.md`

But the frontend implementation should assume:

- onboarding status exists
- role-aware completion rules exist
- location can be prefilled from IP
- dynamic options come from backend

## Final UX Contract

The public entry experience should feel like:

- discover the product
- create access quickly
- complete the minimum meaningful profile
- immediately see useful exams and progress areas

It should not feel like:

- a long public admin form
- a hidden redirect maze
- a dashboard with missing context
