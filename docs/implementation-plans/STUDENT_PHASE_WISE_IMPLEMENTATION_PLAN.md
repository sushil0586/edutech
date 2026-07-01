# Student Phase Wise Implementation Plan

## Objective

Launch Nexora for students in production with a simple, subject-aware, progression-based experience.

This plan keeps the current project and extends it with:

- a better student dashboard
- subject-wise sample and mock tests
- star-based progression and unlocks
- admin overrides
- subscription-ready access control later

## Guiding Principles

- use the current project, not a new project
- keep the student journey simple after registration
- make the dashboard the first useful product surface
- keep unlock logic configurable from the backend
- keep subscription support flexible for later, but not required for day one
- avoid rewriting the exam engine unless a new capability truly needs it

## Phase 0. Product Alignment And Data Review

### Goal

Confirm the exact student launch scope and the data already available in the current schema.

### Work

- review `AccountProfile`, `StudentProfile`, `Exam`, `StudentExamAttempt`, `ExamResult`, and `StudentTopicPerformance`
- confirm which fields can already drive subject-aware dashboards
- confirm which fields can already drive progression and unlock logic
- finalize the student-first go-live scope

### Deliverables

- approved student launch scope
- confirmed data map for dashboard, progression, and analytics
- list of missing tables or fields

### Success signal

- we know exactly what can be built without a schema rewrite

## Phase 1. Student Registration And Login Polish

### Goal

Make registration and login feel clean, public-facing, and production-ready.

### Work

- keep registration role-aware but lightweight
- keep the student form minimal
- preserve institute-backed account creation
- ensure the student lands in the correct workspace after login
- keep role routing based on `AccountProfile`

### Deliverables

- polished public registration flow
- reliable student login path
- consistent role-based redirect behavior

### Success signal

- a student can register and land in the correct student workspace without confusion

## Phase 2. Student Dashboard Foundation

### Goal

Turn the student dashboard into the first meaningful product screen.

### Work

- show the student’s class, board, and subject context
- show one recommended next test
- show a small star/progress summary
- show locked vs available tests clearly
- keep the page visually soft and uncluttered

### Deliverables

- student home dashboard
- subject-aware top-level routing
- clear next-action card

### Success signal

- a student immediately understands what to do next after login

## Phase 3. Subject-Wise Test Catalog

### Goal

Expose subject-wise mock tests and sample tests from the backend.

### Work

- create a visible test catalog for student subjects
- support subject filtering in the frontend
- map tests to subject lanes
- show sample tests, mock tests, and practice tests separately if needed
- keep “overall” view available for users who want a broad view

### Deliverables

- subject-aware test catalog
- subject filter in the dashboard or top bar
- recommended test list per subject

### Success signal

- a class 7 student can browse tests relevant to class 7 and their selected subjects

## Phase 4. Star And Unlock Model

### Goal

Add the progression system that controls when tests become available.

### Work

- define a star balance for each student
- define unlock rules for each test
- support earned stars from test completion and score thresholds
- support admin-granted stars from the backend
- keep a placeholder path for paid stars later

### Recommended backend additions

- `StudentProgressProfile`
- `StarLedger`
- `UnlockRule`
- `StudentUnlockState`

### Deliverables

- star balance model
- unlock rule engine
- lock reason metadata

### Success signal

- the system can say why a test is locked and what unlocks it

## Phase 5. Analytics Depth

### Goal

Make analytics granular enough to support question-level and topic-level improvement.

### Work

- keep result generation as-is
- ensure question-level correctness can be aggregated from student answers
- strengthen subject-level and topic-level summaries
- expose weak topics, strongest subjects, and correctness percentages
- create analytics that can answer:
  - how many students got a question right
  - how many skipped it
  - how often it is answered correctly

### Deliverables

- question-wise correctness analytics
- subject-wise performance analytics
- topic-wise weakness reports

### Success signal

- analytics can support high-granularity product decisions without a major rewrite

## Phase 6. Admin Controls And Manual Overrides

### Goal

Give institute/admin users direct control over progression and access.

### Work

- add admin controls to grant stars
- allow manual unlock of tests
- allow lock/hide controls for tests
- allow override for special cases
- allow admin adjustments when a learner needs support

### Deliverables

- admin star management
- admin unlock controls
- backend override support

### Success signal

- admins can fix access issues without touching the data manually in the database

## Phase 7. Subscription-Ready Entitlement Layer

### Goal

Prepare the system for paid access without forcing payments into the launch.

### Work

- define plan and entitlement tables
- separate star-based access from paid access
- allow future subscription to unlock packs or subject bundles
- keep free, earned, admin, and paid access distinct in the model

### Recommended backend additions

- `SubscriptionPlan`
- `SubscriptionEntitlement`

### Deliverables

- subscription-ready data model
- entitlement-driven access contract

### Success signal

- the backend can support paid access later without redesigning the student journey

## Phase 8. Production Hardening

### Goal

Make the student launch stable enough for real users.

### Work

- test student registration end to end
- test subject switching
- test dashboard rendering for multiple class/subject combinations
- test star unlock conditions
- test admin overrides
- test analytics responses on real data
- make the UI softer and less crowded

### Deliverables

- production-ready student launch
- release checklist
- smoke test checklist

### Success signal

- the student experience is usable, understandable, and stable in production

## Recommended Build Order

If we want the fastest path to student go-live, build in this order:

1. Registration and login polish
2. Student dashboard foundation
3. Subject-wise test catalog
4. Star and unlock model
5. Analytics depth
6. Admin overrides
7. Subscription-ready entitlement layer
8. Production hardening

## What Should Wait

Avoid these until the student launch is working:

- full parent-child relationship workflows
- teacher group workflows
- large referral systems
- aggressive ERP expansion
- complex paid subscription logic in the first release

## Outcome

When this plan is complete:

- a student registers and lands in a useful dashboard
- the dashboard shows subject-aware mock tests
- tests unlock through stars and rules
- admins can override access
- the backend stays ready for subscriptions later

