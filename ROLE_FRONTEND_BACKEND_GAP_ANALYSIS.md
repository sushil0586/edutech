# Nexora Role Frontend And Backend Gap Analysis

This document compares the current codebase against the intended role model for the three primary public roles:

- student
- teacher
- parent

It also notes where platform and institute admin capabilities are supporting layers rather than the primary public experience.

The goal is to identify what is already working, what is partially wired, and what still needs backend or frontend work before the role experience feels production-ready.

## Core Principle

`AccountProfile` is the single source of truth for:

- role
- institute scope
- linked profile
- workspace routing
- registration context

Everything else should derive from that record.

## Current Overall Position

The codebase already has a strong foundation:

- backend role-aware authentication exists
- institute-scoped data model exists
- student exam, attempt, result, and analytics flows are real
- teacher exam and question-bank flows are real
- public registration is wired into the same account system

The main gaps are not “nothing exists.”

The gaps are mostly:

- incomplete role-specific product surfaces
- some backend relationships that do not yet exist, especially parent-child linking
- some frontend experiences that are still generic or too heavy
- some role-based dashboards that need better data shaping and routing

## 1. Student Role Gaps

### Backend

What is already strong:

- `StudentProfile` exists and is institute-scoped
- `AccountProfile` can link to `StudentProfile`
- exam assignment, attempts, answers, results, and topic performance are in place
- subject context can be derived from registration data and backend metadata

What is still missing or partial:

- no true parent-child relation around the student yet
- no dedicated student entitlement/subscription layer yet
- no separate student learning plan model beyond the current analytics and weak-area data
- no full student catalog table for board/class/chapter discovery; the current model still relies on institute-first academic structure
- no student-specific preference table beyond `registration_context` and `accommodation_profile`

### Frontend

What is already strong:

- student app shell exists
- student dashboard, practice, attempts, exams, results, analytics, weak areas, notifications, and settings routes exist
- subject switching is already supported through a stored subject context

What is still missing or partial:

- the student dashboard still feels like a single workspace with subject filtering rather than a fully adaptive multi-subject product shell
- top bar and layout need more role polish for public users
- some pages still read like a working portal rather than a premium public-facing product
- the subject selector is useful, but it still needs stronger discoverability and more consistent placement across pages
- multiple-subject behavior is supported, but the UI still needs a cleaner “one subject at a time” or “all subjects” story depending on the learner

### Student gap summary

The student stack is the strongest of the three roles, but it still needs:

- a cleaner public-facing polish layer
- stronger subject-aware dashboard behavior
- better future support for subscription, recommendations, and parent visibility

## 2. Teacher Role Gaps

### Backend

What is already strong:

- `TeacherProfile` exists
- `TeacherAssignment` exists and scopes teacher-to-subject responsibility
- question bank, exam creation, assignment, and result workflows are already backed by the database
- `AccountProfile` can link to `TeacherProfile`

What is still missing or partial:

- teacher onboarding is not yet as polished as student registration
- no teacher group model yet
- no teacher join-code / invite flow yet
- no explicit teacher workspace preference model yet
- no dedicated teacher relationship model for multiple schools or mixed teaching contexts beyond the current assignment layer

### Frontend

What is already strong:

- teacher portal routes exist for dashboard, question bank, exam builder, exams, and results
- teacher-specific forms and workspaces exist

What is still missing or partial:

- teacher registration is still broad and not yet as “guided and elegant” as the student story should be
- the teacher experience is functional, but it still needs a more refined public launch polish
- role-based landing and subject scope selection need to be more explicit and consistent
- there is no broader teacher community/workspace layer yet

### Teacher gap summary

The teacher stack is operationally strong, but it still needs:

- smoother onboarding
- better subject and assignment discovery
- cleaner workspace routing
- future group/invite support

## 3. Parent Role Gaps

### Backend

What is already strong:

- `AccountProfile` supports the parent role
- parent registration exists in the same account system
- parent registration context can store child-related intent fields

What is still missing or partial:

- no parent-child linking table or workflow yet
- no child ownership / guardian mapping model yet
- no parent alert policy model yet
- no parent-readiness aggregation model yet
- parent is not yet connected to a real backend product surface beyond the login identity

### Frontend

What is already strong:

- parent portal shell exists
- parent dashboard and settings routes exist

What is still missing or partial:

- parent dashboard is still intentionally thin
- the first meaningful parent experience is not yet data-rich because the backend relationship layer is missing
- no linked-child timeline, alerts, or readiness dashboard yet
- the current parent shell is more of a placeholder than a full product surface

### Parent gap summary

Parent is the least complete role today.

The main missing piece is not styling.
It is the backend relationship layer that allows the parent role to become useful.

## 4. Cross-Cutting Backend Gaps

These gaps affect all three roles.

### A. Relationship layer is incomplete

Missing or only partially present:

- parent-child linking
- teacher-student invite/join workflows
- teacher groups
- join requests
- relationship notifications

### B. Subscription and entitlement layer does not yet exist

The database is flexible enough for it later, but there is no real plan implemented yet for:

- plans
- entitlements
- paid feature access
- role-specific premium access

### C. Catalog model is still institute-first

Current academic design is built around:

- institute
- academic year
- program
- cohort
- subject
- topic

That is good for operations, but it is not yet a full school-board-chapter catalog system.

### D. Registration is shared, but not fully personalized by role

The backend already supports:

- same login system
- same account profile model
- same institute-scoped database area

But the per-role experience is not yet fully separated into polished, dynamic backend-driven workspaces.

### E. Subscription-ready architecture is not formalized

Even though the data model can extend later, there is not yet a clean entitlement contract in the backend.

## 5. Cross-Cutting Frontend Gaps

These affect registration, routing, and the role workspaces.

### A. Public registration needs one clearer journey

The registration flow is much better than before, but it still needs to feel like one polished public product path.

The remaining polish areas are:

- keep the initial screen simple
- move smoothly from role selection to form setup
- keep the student/teacher/parent cards minimal
- preserve the same backend behavior while making the UI feel lighter

### B. Role routing should be more explicit

The frontend already routes based on role, but the UI should more clearly show:

- what role is selected
- what workspace is coming next
- what profile data is being used
- what subject/class context is active

### C. Dashboard content needs stronger role-specific shaping

Current dashboard content is already role-aware, but it still needs:

- more role-appropriate default cards
- cleaner subject-specific switching for students
- more useful teacher summaries
- a parent dashboard that becomes useful once the backend relationships are ready

### D. Visual system still needs a final public-facing polish pass

The frontend direction is now much better, but the role experiences should still converge on:

- softer borders
- less crowded layouts
- clearer hierarchy
- smaller copy blocks
- less placeholder-feeling content
- stronger premium public-product feel

## 6. Role-by-Role Gap Verdict

### Student

Best prepared today, but still needs:

- polish
- subject-aware dashboard refinement
- more cohesive public-product feel
- subscription readiness later

### Teacher

Good operational base, but still needs:

- smoother registration
- better routing and workspace focus
- group and invite future support

### Parent

Most incomplete role today, because:

- backend relationship links are missing
- frontend is still mostly a shell
- no real child overview model exists yet

## 7. Recommended Next Coding Priorities

If we want to close the biggest gaps efficiently, the order should be:

1. Finish role-aware frontend polish for registration and landing.
2. Tighten student dashboard subject routing and multi-subject behavior.
3. Improve teacher registration and teacher workspace clarity.
4. Build the parent-child backend relationship layer.
5. Turn the parent shell into a real dashboard once child linkage exists.
6. Define the subscription/entitlement model so the backend stays ready for paid tiers later.

## 8. Bottom Line

The codebase is already in a good place architecturally.

The biggest remaining gaps are not raw data model failures.
They are:

- missing parent relationships
- incomplete parent product surface
- dashboard and registration polish
- a more formalized role-driven workspace contract
- future subscription readiness

If you want, the next step can be a more detailed “frontend vs backend gap table” for each role, so we can turn this into a task-by-task implementation checklist.
