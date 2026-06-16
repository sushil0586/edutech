# Nexora Student Mobile API And Screen Map

## Objective

This document maps the first React Native mobile implementation to:

- exact student screens
- exact backend endpoints
- expected request/response usage
- loading, error, and empty states
- navigation transitions

This file should be used together with:

- [NEXORA_STUDENT_MOBILE_APP_PLAN.md](/Users/ansh/Documents/Eductech/NEXORA_STUDENT_MOBILE_APP_PLAN.md)
- [NEXORA_FINAL_IMPLEMENTATION_SOURCE_OF_TRUTH.md](/Users/ansh/Documents/Eductech/NEXORA_FINAL_IMPLEMENTATION_SOURCE_OF_TRUTH.md)

## Implementation Scope

Architecture:

- role-scalable

Current implementation:

- student only

Implemented student flow:

1. Register
2. Login
3. Dashboard
4. Exam Detail
5. Take Exam
6. Analytics

## Source Of Truth Rule

The mobile app must not invent separate business rules.

Use backend as source of truth for:

- auth and current profile
- role
- student context
- star balance
- exam availability
- active attempt existence
- attempt runtime
- result and analytics values

## Mobile Route Map

## Auth Routes

- `/(auth)/register`
- `/(auth)/login`
- `/(auth)/role-gate`

## Student Routes

- `/(student)/dashboard`
- `/(student)/analytics`
- `/(student)/exam/[examId]`
- `/(attempt)/attempt/[attemptId]`

## Future But Not MVP

- `attempt/[attemptId]/summary`
- `wallet`
- `results`
- `weak-areas`

## Shared Data Sources Already Present

The current web code already uses these live student endpoints:

### Auth

- `POST /api/v1/auth/register/`
- `GET /api/v1/auth/register/options/`
- `POST /api/v1/auth/login/`

### Student dashboard and context

- `GET /api/v1/student/insights/summary/`
- `GET /api/v1/student/exams/available/`
- `GET /api/v1/student/attempts/`
- `GET /api/v1/economy/wallet/`

### Exam detail and entry

- `GET /api/v1/student/exams/{examId}/detail/`
- `POST /api/v1/attempts/start/`

### Attempt runtime

- `GET /api/v1/attempts/{attemptId}/detail/`
- `POST /api/v1/attempts/{attemptId}/save-answer/`
- `POST /api/v1/attempts/{attemptId}/switch-section/`
- `POST /api/v1/attempts/{attemptId}/submit/`

### Analytics

- `GET /api/v1/student/insights/summary/`
- `GET /api/v1/student/results/`
- `GET /api/v1/results/topic-performance/?student={studentId}`
- `GET /api/v1/student/exams/available/`

## Session And Auth Map

## Mobile Auth Model

Mobile should store:

- access token
- refresh token if supported in mobile auth flow
- resolved current account profile

Secure storage recommendation:

- Expo SecureStore

## Role Gate Logic

After login:

1. read `user.role`
2. if `student`, continue into student mobile app
3. otherwise show controlled unsupported-role state

No other role should be routed into implementation yet.

## Screen Map

## 1. Register Screen

### Route

- `/(auth)/register`

### Purpose

Create a new student account using the approved public student registration flow.

### APIs

- `GET /api/v1/auth/register/options/`
- `POST /api/v1/auth/register/`

### Why `register/options`

Use it to load real registration choices such as:

- school list
- class levels
- boards
- subject catalog
- exam catalog

This avoids hardcoding registration options in mobile.

### Request shape

Use current backend contract fields only. Expected student-oriented fields include:

- `role`
- `first_name`
- `last_name`
- `email`
- `phone`
- `school_code` or `school_name`
- `password`
- `confirm_password`
- `class_level`
- `board`
- `exam_interest`
- `referral_code`
- `subject_interests`

### Required client behavior

- role should be fixed to `student`
- validate password and confirm password before submit
- show backend field errors inline
- handle throttling and duplicate-registration guidance cleanly

### Success path

1. backend returns access/refresh and user payload
2. persist secure session
3. go to `role-gate`

### Loading state

- full-screen loading on initial options fetch
- button loading during submit

### Error states

- field-level validation errors
- duplicate email / phone style backend errors
- throttling message
- network unavailable

### Empty state

- not applicable

## 2. Login Screen

### Route

- `/(auth)/login`

### Purpose

Authenticate existing student login and resolve student session.

### APIs

- `POST /api/v1/auth/login/`

### Request

- `username`
- `password`

### Response usage

From current web contract:

- `access`
- `refresh`
- `user`

Important response fields:

- `user.role`
- `user.student_profile`
- `user.display_name`
- `user.student_context`

### Success path

1. persist tokens
2. store `user`
3. navigate to `role-gate`

### Loading state

- form submit loading

### Error states

- invalid credentials
- inactive account
- unsupported role
- session write/storage issue
- API unreachable

## 3. Role Gate

### Route

- `/(auth)/role-gate`

### Purpose

Central place to branch future mobile roles, while currently allowing only student.

### Data source

- authenticated `user` from login/register response
- or rehydrated session profile on app launch

### Logic

- if no session: go to `login`
- if role is `student`: go to `dashboard`
- else: show unsupported-role page

### Why this matters

This keeps architecture scalable without implementing other roles now.

## 4. Student Dashboard Screen

### Route

- `/(student)/dashboard`

### Purpose

Orient the student and surface next action immediately.

### APIs

- `GET /api/v1/student/insights/summary/`
- `GET /api/v1/student/exams/available/`
- `GET /api/v1/student/attempts/`
- `GET /api/v1/economy/wallet/`

### Data usage

#### Student insight summary

Use for:

- student identity context
- subject options
- weak topics preview
- recent exam summary
- performance summary

#### Available exams

Use for:

- recommended exam
- available exams
- locked exams
- resume and start logic

#### Attempts

Use for:

- active attempt detection
- recent attempt linkage

#### Wallet summary

Use for:

- available stars
- quick stars summary

### UI blocks

1. greeting and student context
2. stars summary
3. recommended exam
4. available exams list
5. locked exams list
6. compact progress / weak-topic preview

### Required business logic

- if exam has active attempt, resume must take priority
- if exam is locked, show backend reason, not guessed copy
- if subject lane changes, content must re-scope in UI only using returned metadata

### Primary actions

- open exam detail
- resume active attempt
- open analytics

### Loading state

- skeleton screen for top dashboard blocks

### Error state

- dashboard-level fallback if core fetch group fails

### Empty states

- no recommended exam
- no available exams
- no analytics history yet

## 5. Exam Detail Screen

### Route

- `/(student)/exam/[examId]`

### Purpose

Explain one exam clearly and route student into correct next action.

### APIs

- `GET /api/v1/student/exams/{examId}/detail/`
- `GET /api/v1/student/attempts/`
- `POST /api/v1/attempts/start/`

### Optional supporting API

- `GET /api/v1/student/insights/summary/`

Used only if student id is needed and not already stored in session context.

### Data usage

Use exam detail for:

- title
- subject
- duration
- attempts used
- attempts remaining
- availability state
- active attempt state
- economy access / star lock information
- review rules if surfaced

### Primary CTA rules

1. if active attempt exists:
   - `Resume Attempt`
2. else if can start:
   - `Start Exam`
3. else if locked by stars:
   - disabled state plus unlock explanation
4. else:
   - disabled guided state

### Start attempt request

`POST /api/v1/attempts/start/`

Payload:

- `exam`
- `student`

### Start success path

1. response returns created attempt id
2. navigate to `/(attempt)/attempt/[attemptId]`

### Loading state

- exam detail skeleton

### Error states

- exam detail unavailable
- start blocked by backend validation
- student not allowed
- attempts exhausted

### Empty state

- not applicable

## 6. Live Attempt Screen

### Route

- `/(attempt)/attempt/[attemptId]`

### Purpose

Render and run the student assessment attempt.

### APIs

- `GET /api/v1/attempts/{attemptId}/detail/`
- `POST /api/v1/attempts/{attemptId}/save-answer/`
- `POST /api/v1/attempts/{attemptId}/switch-section/`
- `POST /api/v1/attempts/{attemptId}/submit/`

### Detail endpoint responsibilities

This is the source of truth for:

- attempt status
- timer state
- question ordering
- current section
- current saved answers
- question metadata

### Save answer payload

Current web contract supports:

- `question`
- `selected_option`
- `selected_option_ids`
- `answer_text`
- `is_marked_for_review`
- `clear_response`
- `skip`

### Submit payload

Current web sends:

- `auto_submitted: false`

### Section switch payload

- `section`

### Required mobile runtime behavior

1. fetch attempt detail on enter
2. render current question
3. save answer on selection / confirmation
4. allow mark for review
5. allow next / previous navigation
6. allow section switch only if backend rules permit
7. submit safely with confirmation

### Local UI state

Keep local:

- current viewed question index
- pending unsent answer
- saving indicator
- navigator sheet visibility
- submit confirmation sheet visibility

Do not localize:

- timer authority
- attempt final status
- review availability

### Loading states

- initial runtime load
- answer-saving spinner or inline sync state
- submit loading state

### Error states

- failed detail fetch
- save answer failed
- section switch failed
- submit failed
- attempt already submitted elsewhere

### Recovery rules

- on app reopen, dashboard and exam detail should detect active attempt and resume
- if save fails, keep pending state and allow retry

## 7. Analytics Screen

### Route

- `/(student)/analytics`

### Purpose

Show longer-term learning feedback in a focused, mobile-friendly way.

### APIs

- `GET /api/v1/student/insights/summary/`
- `GET /api/v1/student/results/`
- `GET /api/v1/results/topic-performance/?student={studentId}`
- `GET /api/v1/student/exams/available/`

### Data usage

#### Insight summary

Use for:

- overall metrics
- weak topics summary
- recent exam summary
- subject-aware context

#### Results

Use for:

- recent scored outcomes
- trend signals

#### Topic performance

Use for:

- weak topics
- strong topics
- subject/topic accuracy patterns

#### Available exams

Use for:

- recommended next actions
- linking insight to next attempt

### UI blocks

1. analytics intro
2. subject-aware summary cards
3. recent trend
4. weak topics
5. strong topics
6. next recommended action

### Loading state

- analytics skeleton blocks

### Error state

- show analytics unavailable message

### Empty states

- no published results yet
- no topic performance yet
- not enough data for trend

## Shared Mobile Error Model

Normalize these backend response patterns:

- `detail`
- `message`
- field-specific arrays or strings

This matches the current web API client behavior.

## Shared Mobile Loading Model

Every screen should explicitly support:

1. initial loading
2. pull-to-refresh where useful
3. action loading
4. retry after failure

## Shared Mobile Empty-State Model

Use human guidance, not blank screens.

Examples:

- no exams yet
- no active analytics yet
- no attempts yet

Each empty state should offer one clear next step.

## Navigation Transition Map

## Register flow

`register` -> `role-gate` -> `dashboard`

or

`register` -> `login` if backend or product policy requires explicit login

## Login flow

`login` -> `role-gate` -> `dashboard`

## Dashboard flow

- `dashboard` -> `exam/[examId]`
- `dashboard` -> `attempt/[attemptId]`
- `dashboard` -> `analytics`

## Exam detail flow

- `exam/[examId]` -> `attempt/[attemptId]` after start
- `exam/[examId]` -> `attempt/[attemptId]` if resume exists
- `exam/[examId]` -> `dashboard` back flow

## Attempt flow

- `attempt/[attemptId]` -> `analytics` after submit if product chooses insight-first
- or `attempt/[attemptId]` -> lightweight completion/success state -> `analytics`

For MVP, after submit, recommended path is:

- submit success
- show short success state
- route to `analytics`

## Recommended Query Keys

- `auth.session`
- `auth.profile`
- `student.dashboard.summary`
- `student.dashboard.exams`
- `student.dashboard.attempts`
- `student.wallet.summary`
- `student.exam.detail.{examId}`
- `student.attempt.detail.{attemptId}`
- `student.analytics.summary`
- `student.analytics.results`
- `student.analytics.topicPerformance.{studentId}`

## Recommended Screen Ownership By Feature

### `features/auth`

- register screen
- login screen
- role gate
- session persistence

### `features/dashboard`

- dashboard screen
- subject scoping
- recommendation logic

### `features/exams`

- exam detail screen
- start attempt logic

### `features/attempts`

- attempt runtime screen
- save answer
- navigator
- submit flow

### `features/analytics`

- analytics screen
- trend summaries
- weak and strong topic presentation

## Gaps To Confirm Before Coding

1. Whether mobile registration should auto-login after success or redirect to login.
2. Whether all required student registration options already come through `register/options`.
3. Whether current attempt detail payload supports all question types mobile needs for MVP.
4. Whether submit should route to analytics directly or to a compact mobile summary screen first.

## Recommended Next Step

After approving this doc:

1. scaffold the Expo app
2. create mobile API client from this map
3. implement auth and dashboard first
4. implement exam detail and attempt flow second
5. implement analytics third
