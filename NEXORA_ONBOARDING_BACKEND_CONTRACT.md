# Nexora Onboarding Backend Contract

## Purpose

This document defines the backend contract for the new public onboarding model.

It covers:

- lightweight signup payload rules
- onboarding state fields
- role-aware profile completion APIs
- referral contract
- location contract
- redirect and route-guard decision rules

This document is the backend planning companion to:

- `NEXORA_PUBLIC_ENTRY_AND_PROFILE_COMPLETION_PLAN.md`
- `NEXORA_PUBLIC_ENTRY_SCREEN_SPEC.md`

## Product Contract Summary

The approved public onboarding flow is:

1. quick signup
2. authenticated complete-profile flow
3. normal dashboard access

Backend responsibilities:

- accept a lightweight public registration payload
- create the account and session
- track whether profile completion is still required
- expose enough profile state for role-aware routing
- accept role-aware completion updates
- keep referral and location models future-ready

## 1. Guiding Backend Principles

The onboarding backend should follow these rules:

- do not require full academic or role-specific profile data at public signup
- keep onboarding state explicit, not purely inferred
- do not hardcode boards, classes, cities, or other option catalogs
- accept future referral channels without schema redesign
- separate detected data from user-confirmed data
- keep redirect decisions deterministic and inspectable

### Academic model principle

The backend contract must support more than only school-style academic journeys.

It should be structurally ready for:

- school
- senior secondary
- professional

This means onboarding and discovery contracts should align to a scalable model such as:

- learning lane or program family
- program
- subject
- topic

and should not assume:

- every learner has a board
- every learner is class-based
- every subject is a school classroom subject

## 2. Registration Contract

## Current problem

The current registration payload mixes:

- account identity
- role choice
- academic or role-specific details

This should be split.

## New public registration payload

The public registration endpoint should accept only the quick-signup fields.

### Required fields

- `role`
- `first_name`
- `email`
- `phone`
- `password`
- `confirm_password`

### Optional fields

- `last_name`
- `referral_code`
- `school_code`

### Not accepted as required public signup fields

These should no longer be mandatory in public registration:

- `class_level`
- `board`
- `exam_interest`
- `subject_interests`
- `child_class_level`
- `child_board`
- `parent_focus`
- `teaching_focus`
- `teaching_scope`
- full location fields

### Registration endpoint behavior

Endpoint:

- `POST /api/v1/auth/register/`

Expected behavior:

1. validate quick-signup fields
2. create account
3. create session tokens
4. set onboarding state to incomplete
5. persist registration metadata
6. return authenticated user profile with onboarding state

## 3. Account Profile Contract

The authenticated profile response should include onboarding status explicitly.

### Recommended `AccountProfile` additions

Current profile responses should be extended with fields such as:

- `onboarding_status`
- `profile_completion_required`
- `profile_completion_completed_at`
- `onboarding_role`
- `onboarding_version`

### Recommended meaning

#### `onboarding_status`

Allowed values:

- `not_started`
- `in_progress`
- `completed`

#### `profile_completion_required`

Boolean:

- `true` means the user must finish onboarding before normal dashboard access
- `false` means normal workspace routing is allowed

#### `profile_completion_completed_at`

Timestamp:

- when required completion was last fully satisfied

#### `onboarding_role`

Value:

- student
- parent
- teacher

This is useful if future role-switching or role-elevation ever happens.

#### `onboarding_version`

Use this to support future onboarding changes safely.

Example:

- `v1_public_quick_signup`

## 4. Onboarding State Source Of Truth

### Preferred direction

The backend should use explicit onboarding state fields as the source of truth.

### Why explicit is better

If onboarding state is derived only from role profile completeness:

- rules become scattered
- audits become harder
- redirects become less predictable
- future onboarding revisions become messy

### Recommended final rule

Use both:

1. explicit onboarding state fields
2. server-side completeness validation

The explicit field drives routing, but server-side validation should determine whether the account qualifies to be marked complete.

## 5. Completion Requirements By Role

The backend must own the required completion rules.

Frontend can guide the user, but backend must decide whether completion is valid.

## Student required completion

Required in Phase 1:

- `class_level`
- `board`
- `exam_interest`
- confirmed `country`
- confirmed `state`
- confirmed `city`
- confirmed `pincode`

Optional in Phase 1:

- `subject_interests`
- `school_name`
- `school_code`
- `timezone`

### Future academic extension

Phase 1 can remain school-first, but the completion contract should be extensible for:

#### Senior secondary

- class 11 or 12
- stream
- board
- exam interest

#### Professional

- certification track
- experience level
- specialization focus

These should later fit through backend-driven option contracts rather than a redesign of the onboarding endpoint.

## Parent required completion

Required in Phase 1:

- `child_class_level`
- `child_board`
- confirmed `country`
- confirmed `state`
- confirmed `city`
- confirmed `pincode`

Optional in Phase 1:

- `parent_focus`
- `school_name`
- `invite_code`

## Teacher required completion

Required in Phase 1:

- `teaching_focus`
- confirmed `country`
- confirmed `state`
- confirmed `city`
- confirmed `pincode`

Optional in Phase 1:

- `teaching_scope`
- `class_range`
- `subject_preferences`
- `school_name`
- `school_code`

## Internal roles

For:

- institute admin
- platform admin

Public onboarding completion should not apply.

These roles should continue through managed internal access flows.

## 6. Role-Aware Completion API Contract

The backend should support authenticated profile completion updates.

### Preferred endpoint strategy

Preferred:

- one shared onboarding endpoint with role-aware validation

Recommended endpoint:

- `PATCH /api/v1/onboarding/profile/`

### Why this is preferred

- simpler frontend integration
- centralized onboarding validation
- consistent audit behavior
- easier expansion for future onboarding steps

### Alternative acceptable strategy

Role-specific endpoints such as:

- `PATCH /api/v1/onboarding/student-profile/`
- `PATCH /api/v1/onboarding/parent-profile/`
- `PATCH /api/v1/onboarding/teacher-profile/`

This is acceptable only if the backend structure strongly prefers role separation.

### Shared onboarding update payload

Recommended shape:

- role-specific fields
- confirmed location fields
- optional school info
- optional additional metadata

The backend should ignore or reject irrelevant fields based on role.

## 7. Registration And Profile Options APIs

The frontend needs backend-fed option catalogs.

### Existing endpoint

- `GET /api/v1/auth/register/options/`

### Recommended decision

Either:

- continue extending `register/options`

or:

- introduce dedicated onboarding options endpoint

Recommended future endpoint:

- `GET /api/v1/onboarding/options/?role=student`

### Why separate options may be better

Quick signup needs very little.

Complete profile needs more:

- class levels
- boards
- exam interests
- teaching focus options
- location lists if supported
- school lookup support

In later phases it may also need:

- learner-type options
- stream options
- professional track options
- program-family options

Separating option scopes keeps quick signup lighter.

## 8. Location Contract

The backend should support both detected and confirmed location data.

### Required design rule

Never treat IP-detected location as final profile truth automatically.

### Recommended location model fields

#### Detected values

- `detected_country`
- `detected_state`
- `detected_city`
- `detected_pincode`
- `detected_timezone`
- `detection_source`
- `detected_at`

#### Confirmed values

- `confirmed_country`
- `confirmed_state`
- `confirmed_city`
- `confirmed_pincode`
- `confirmed_timezone`
- `confirmed_at`

### IP detection support

The backend contract should be able to support:

- server-side IP lookup
- client-provided prefill data with validation
- future third-party geo enrichment

### Completion rule

Confirmed location fields should be used for:

- profile truth
- dashboard personalization
- school and region analytics

Detected fields should be used for:

- prefill assistance
- acquisition analytics
- geo diagnostics

## 9. Referral Contract

Current public UX uses:

- referral code

But backend design should remain identifier-agnostic.

### Recommended referral fields

- `referral_channel`
- `referral_identifier`
- `referral_owner_account_id`
- `referral_resolution_status`
- `referral_applied_at`

### Supported channels should eventually include

- `code`
- `email`
- `phone`
- `whatsapp`
- `invite_token`

### Current interpretation

For current quick signup:

- `referral_channel = code`
- `referral_identifier = <submitted referral code>`

### Backend rule

Do not name the model in a way that assumes email-only or code-only referral logic.

## 10. School And Acquisition Contract

The onboarding backend should preserve analytics value from the first public touchpoint.

### Recommended acquisition fields

- `signup_source`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_term`
- `utm_content`
- `landing_variant`
- `platform`
- `device_category`
- `app_version`
- `browser_family`

### Recommended school fields

- `school_name_text`
- `school_id`
- `school_code`
- `school_normalization_status`

### Important rule

Public school text entry and normalized school identity should be stored separately.

This prevents analytics loss and supports future master school directory cleanup.

## 11. Student Teacher-Association And Assignment Filter Contract

The backend must support the case where one student can receive exam inventory from multiple teaching sources.

### Required relationship truth

A student may have exam visibility from:

- portal-owned or Nexora-owned supply
- one assigned teacher
- multiple assigned teachers

This means exam listing and recommendation APIs should not assume one student maps to only one teacher source.

### Recommended source model

Every student-visible exam item should be attributable to a source such as:

- `portal_teacher`
- `teacher_assignment`

And where applicable:

- `source_teacher_id`
- `source_teacher_name`
- `source_subject_ids`

### Dashboard filter contract

Student-facing exam APIs should support filtering by:

- teacher source
- subject

Recommended query direction:

- `teacher_source=all`
- `teacher_source=portal`
- `teacher_id=<uuid>`
- `subject=<subject-id-or-slug>`

### Subject filter behavior

When a teacher source is selected, the backend should be able to return subject options scoped to that source.

That means:

- the subject list should not always be global
- it should reflect the subjects actually available under the selected teacher source

### Recommended response shape for student exam/discovery APIs

The frontend should be able to render:

- available teacher sources
- selected teacher source
- source-scoped subject options
- student-visible exams with source attribution

Useful fields include:

- `teacher_sources`
- `selected_teacher_source`
- `subject_options`
- `assignment_source`
- `source_teacher`

### Assignment ownership rule

If the same student has assignments from two or more teachers:

- the backend must preserve assignment ownership clearly
- exam cards should remain attributable to the assigning teacher
- `All teachers` should aggregate, not flatten away source identity

### Portal teacher meaning

`portal_teacher` should be treated as a system-owned or Nexora-owned content source for:

- sample exams
- public discovery exams
- default plan-based inventory where no external teacher assignment owns the exam

This should be modeled explicitly rather than inferred in the UI.

## 12. Authenticated Profile Response Contract

The frontend redirect layer needs predictable user data.

### `GET /api/v1/auth/me/`

This endpoint should include:

- core identity
- role
- profile linkage ids
- onboarding state
- role completion context
- registration context

### Recommended additions in response

- `onboarding_status`
- `profile_completion_required`
- `onboarding_role`
- `onboarding_version`
- `completion_requirements`

### `completion_requirements`

Optional but valuable.

Example use:

- list missing required fields
- show dashboard redirect reason
- improve UX messaging

Possible shape:

- `missing_fields`
- `role`
- `last_checked_at`

## 13. Redirect Contract

Redirect behavior should be deterministic and based on backend profile state.

## Signup success redirect

After registration:

1. create session
2. return user
3. if `profile_completion_required === true`
   - redirect to complete-profile route
4. else
   - redirect to role dashboard

Expected practical result:

- new public users almost always go to complete profile

## Login success redirect

After login:

1. authenticate
2. return user
3. if `profile_completion_required === true`
   - redirect to complete-profile route
4. else
   - redirect to role dashboard

## Route-guard contract

Protected frontend routes should enforce:

- if user is authenticated
- and `profile_completion_required === true`
- and current route is not an allowed onboarding route
- redirect to complete-profile route

### Allowed routes while incomplete

- complete-profile page
- logout
- maybe limited help or support pages if needed

### Blocked routes while incomplete

- normal student dashboard
- exam list
- analytics
- wallet
- teacher workspace
- parent full workspace

## 14. Error And Edge Cases

The backend contract should explicitly handle:

### Registration succeeds but completion config is unavailable

Behavior:

- still create the account
- keep `profile_completion_required = true`
- allow onboarding screen to show a guided configuration error state

### User has partial role profile but missing required fields

Behavior:

- keep onboarding incomplete
- return missing requirements if possible

### Internal user accidentally marked incomplete

Behavior:

- internal roles should bypass public completion rules unless explicitly opted in

### Referral code invalid

Behavior:

- either reject at signup if required for business logic
- or store unresolved referral state if product wants later reconciliation

Recommended default:

- validate eagerly if referral programs are active

### Student has no teacher associations yet

Behavior:

- dashboard should still work through `portal_teacher` inventory
- teacher-source filter should still expose at least:
  - `All teachers`
  - `Portal teacher`

### Student has multiple teachers with overlapping subjects

Behavior:

- source attribution must remain intact
- subject filtering should be source-aware
- aggregation under `All teachers` should not lose teacher ownership context

## 15. Migration Strategy

The backend change should support gradual rollout.

### Recommended phases

#### Phase 1

- add onboarding fields to account profile
- extend `auth/me`
- support lightweight register payload

#### Phase 2

- add onboarding completion endpoint
- add server-side completion validation
- add redirect logic in frontend

#### Phase 3

- add location detected/confirmed model
- add referral generic model
- add school/acquisition metadata

#### Phase 4

- migrate old signup flow to new quick-signup + complete-profile model

## 16. Recommended Current Implementation Shape

If we want the simplest scalable first implementation, the backend should support:

1. `POST /api/v1/auth/register/`
   - quick signup only

2. `POST /api/v1/auth/login/`
   - return user with onboarding state

3. `GET /api/v1/auth/me/`
   - include onboarding fields

4. `PATCH /api/v1/onboarding/profile/`
   - complete role-aware profile

5. `GET /api/v1/onboarding/options/`
   - return role-aware completion options

6. student exam/discovery endpoints should support teacher-source and subject filtering
   - including `portal_teacher` and named teacher assignment sources

This is the cleanest implementation shape for the next phase.

## 17. Final Contract Summary

The backend should evolve from:

- one large signup payload

to:

- lightweight signup payload
- explicit onboarding status
- role-aware completion endpoint
- generic referral model
- detected versus confirmed location model
- multi-teacher student exam-source filtering
- academic-model readiness for school, senior secondary, and professional tracks
- deterministic redirect and route-guard support

This keeps the system:

- easier for users
- cleaner for frontend routing
- safer for analytics
- more scalable for future phone and WhatsApp referrals
- ready for school, city, and state-level reporting
