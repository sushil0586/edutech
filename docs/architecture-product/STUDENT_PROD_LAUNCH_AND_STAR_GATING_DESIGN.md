# Student Product Launch And Star Gating Design

## Goal

Launch Nexora in production with a student-first experience that is useful immediately after registration.

The first public production target is:

- a student can register
- land in a personalized dashboard
- see subject-aware mock tests or sample tests
- unlock tests progressively through a clear star-based system
- later use the same mechanism for subscription-based access

This design keeps the product free now, but keeps the backend ready for paid access later.

## What We Are Optimizing For

- fast student activation after signup
- a clear next action on the dashboard
- subject-wise relevance from the first login
- progressive unlocks so the student has a journey, not just a list of tests
- one backend model that can support free, earned, admin-granted, and paid access

## Product Priority Order

For the student go-live, the priority order should be:

1. Registration and login
2. Student dashboard
3. Subject selection and subject-aware routing
4. Test catalog with sample tests / mock tests
5. Unlock rules and star gating
6. Progress feedback and motivational signals
7. Admin controls for manual overrides
8. Subscription-ready entitlement layer

## Student Launch Experience

### After registration

A student should immediately land in a personalized workspace.

The dashboard should show:

- the selected class
- the selected board
- the main subject lane
- the current unlock state
- the next available test
- the tests that are locked
- the reason a test is locked

### First dashboard view

The first view should not overwhelm the student.

It should surface only:

- one main recommended test
- a small subject selector
- a short progress summary
- a next-step card

## Core Product Model

The student experience should be built around four layers:

1. Account
2. Dashboard
3. Test catalog
4. Analytics and progression

### 1. Account layer

This is already largely in place through:

- `User`
- `AccountProfile`
- `StudentProfile`

This layer decides:

- who the student is
- which institute they belong to
- which class and board context they belong to
- which workspace they see

### 2. Dashboard layer

This should become the student’s home.

It should answer:

- what should I do next
- what subject should I focus on
- which test is available now
- which test is locked
- how many stars do I have

### 3. Test catalog layer

This is the list of:

- mock tests
- sample tests
- practice tests
- chapter tests
- Olympiad-style tests

### 4. Analytics and progression layer

This is the feedback system:

- right answers
- wrong answers
- skipped questions
- topic weaknesses
- subject strengths
- star progress
- unlock history

## Star Gating Design

The star system is the key product mechanic.

It solves three problems at once:

- progression
- reward
- access control

## What A Star Means

A star is a progression token that can be granted by:

- completing a test
- scoring above a threshold
- finishing a streak
- an admin manual action
- a subscription plan

## What Stars Unlock

Stars can unlock:

- the next test in a path
- subject bundles
- chapter bundles
- premium sample papers
- timed practice packs
- higher difficulty tests
- review-only content

## Star Sources

Stars should be able to come from three sources:

### A. Earned stars

Granted when the student:

- completes a test
- reaches a score threshold
- maintains a streak
- demonstrates topic mastery

### B. Admin-granted stars

Granted manually from backend for:

- coaching support
- exceptions
- promotional access
- institute-wide campaigns

### C. Paid stars

Granted through subscription or entitlements later.

This should stay optional for now, but the design must already support it.

## Unlock Rule Engine

The unlock engine should answer:

- is this test available now
- if not, why is it locked
- what condition unlocks it
- how many stars are needed
- can an admin override it
- is it part of a subscription entitlement

### Example unlock rules

- must complete 1 baseline test
- must earn 3 stars in the same subject
- must reach 70 percent average in the previous test
- must have admin approval
- must have a premium entitlement

## Recommended Backend Design

The backend should keep the current schema and add a small progression layer instead of rewriting the core assessment tables.

### New conceptual entities

#### `StudentProgressProfile`

Stores the student’s progress state.

Possible fields:

- `student`
- `institute`
- `selected_subject`
- `total_stars`
- `available_stars`
- `earned_stars`
- `admin_granted_stars`
- `paid_stars`
- `last_activity_at`
- `metadata`

#### `StarLedger`

Stores every star change as a ledger entry.

Possible fields:

- `student`
- `institute`
- `source_type`
- `source_id`
- `reason`
- `stars_delta`
- `balance_after`
- `created_by`
- `metadata`

#### `UnlockRule`

Stores the rule for opening content.

Possible fields:

- `institute`
- `subject`
- `test`
- `rule_type`
- `required_stars`
- `required_score`
- `required_completion_count`
- `requires_subscription`
- `admin_override_allowed`
- `metadata`

#### `StudentUnlockState`

Stores what is open or locked for a student.

Possible fields:

- `student`
- `test`
- `is_unlocked`
- `unlocked_by`
- `unlocked_at`
- `lock_reason`
- `metadata`

#### `SubscriptionPlan`

Future-ready table for paid access.

Possible fields:

- `name`
- `code`
- `description`
- `is_active`
- `metadata`

#### `SubscriptionEntitlement`

Future-ready table for plan-based access.

Possible fields:

- `student`
- `parent`
- `institute`
- `plan`
- `starts_at`
- `ends_at`
- `status`
- `metadata`

## Where Existing Tables Already Help

We already have strong building blocks:

- `StudentProfile`
- `AccountProfile`
- `Exam`
- `StudentExamAttempt`
- `StudentAnswer`
- `ExamResult`
- `StudentTopicPerformance`
- `ExamPerformanceSummary`

That means star gating does not need to replace analytics.

It should sit beside the current exam and result system.

## Dashboard Design For Student Launch

The student dashboard should show:

- one subject selector
- one recommended next test
- one locked-next test preview
- one star balance card
- one progress summary card
- one weak-area card

### Dashboard should answer

- what should I do next
- which subject should I open
- what did I earn
- what is locked
- how close am I to the next unlock

## Subject-Wise Flow

The student should not just get “overall.”

The dashboard should work in subject lanes such as:

- Math
- Science
- Computer
- SST
- GK
- Mental Aptitude

For each lane, the student should see:

- subject-specific tests
- subject-specific progress
- subject-specific unlocks
- subject-specific weak areas

## Locking Design

Tests can be locked by:

- stars
- score thresholds
- previous completion
- manual admin control
- subscription entitlement

### Lock reason examples

- complete the baseline test first
- earn 3 stars to unlock this pack
- pass the previous test with 70 percent or more
- access available through premium plan only
- locked until admin unlocks it

## Admin Controls

Backend admin should be able to:

- grant stars manually
- unlock a test manually
- lock or hide a test
- edit unlock rules
- assign a student to a subject lane
- override progression for special cases

## Subscription-Ready Design

Even though everything is free now, the backend should already support:

- free content
- earned unlocks
- admin unlocks
- paid unlocks later

That means the data model should separate:

- access rule
- star balance
- subscription entitlement
- admin override

## Frontend Design For Student Go-Live

The frontend should keep the experience simple:

- registration should be light
- dashboard should be clean
- subject selector should be visible but not noisy
- locked content should be clearly explained
- the next action should always be obvious

## Suggested Production Rollout Phases

### Phase 1. Student launch basics

- registration
- login
- dashboard
- subject selector
- subject-aware test recommendations

### Phase 2. Test catalog and progression

- mock test cards
- sample test cards
- star balance
- locked test previews
- unlock reasons

### Phase 3. Analytics depth

- question-level correctness
- subject-level trends
- weak topic drilldowns
- progress history
- star history

### Phase 4. Subscription readiness

- entitlement tables
- paid unlocks
- plan-based access
- parent purchase path later

## Recommended Immediate Priority List

If the goal is to go live with students first, the priority order should be:

1. Polish student registration and login.
2. Make the student dashboard subject-aware and clean.
3. Show subject-wise sample tests / mock tests.
4. Add star balance and lock reasons.
5. Add unlock rules for tests.
6. Add admin/manual override controls.
7. Add subscription-ready entitlement tables later.

## Design Decision

The best implementation approach is:

- keep the current exam and analytics backend
- add a progression layer on top
- avoid rewriting core assessment tables
- use stars as the universal unlock mechanic
- keep paid access as a future extension, not a launch blocker

## Summary

This design lets us launch student production fast while keeping the backend flexible.

It gives us:

- a clean student-first dashboard
- subject-wise test journeys
- progression through stars
- locked and unlocked test states
- a future path for subscriptions

If you want, the next step can be a more detailed technical spec with:

- table definitions
- API endpoints
- dashboard widgets
- unlock rule examples
- admin actions
