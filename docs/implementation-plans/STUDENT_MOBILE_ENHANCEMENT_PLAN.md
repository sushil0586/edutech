# Student Mobile Enhancement Plan

## Objective

This plan converts the current student mobile audit into an execution-ready enhancement roadmap.

It is focused on the `nexora_student_mobile` app only.

The goal is not to redesign from scratch.

The goal is to take the existing student mobile app from:

- working foundation

to:

- student-ready beta experience

## Current Position

The student mobile app already supports:

1. register
2. login
3. secure session restore
4. dashboard
5. exam detail
6. live attempt
7. attempt summary
8. attempt review
9. analytics
10. profile
11. logout

That means our work now should focus on:

1. usability
2. mobile polish
3. journey completeness
4. trust and clarity for students

## Planning Principle

Enhancements should be prioritized by this order:

1. remove friction in the first student session
2. make the core exam journey dependable on mobile
3. improve learning clarity after exam completion
4. polish secondary surfaces
5. align docs and QA

## Success Criteria

We should call the student mobile app ready for beta only when a student can:

1. register without confusion
2. sign in without dead ends
3. understand what to do from dashboard
4. start or resume exams smoothly
5. complete attempts confidently on mobile
6. understand results and next actions
7. recover gracefully from normal network or session issues

## Enhancement Phases

## Phase 1: Onboarding And Auth Polish

### Goal

Reduce the biggest student friction before login and in the first session.

### Scope

#### 1. Registration UX upgrade

Current issue:

- registration fetches backend options
- but still uses text inputs for guided fields

Enhancement:

- replace free text entry with guided pickers or selection chips for:
  - class level
  - board
  - exam interest
- make school code handling clearer
- prefill and lock values where backend gives a fixed institute context

Expected outcome:

- fewer incorrect registrations
- faster first-time onboarding
- more production-like student experience

#### 2. Auth form validation pass

Enhancement:

- inline validation for required fields
- clearer password mismatch handling
- better invalid-credential feedback
- distinguish backend validation errors from network failures

Expected outcome:

- fewer confusing failure states
- less retry frustration for students

#### 3. Session edge-case handling

Enhancement:

- better expired-session handling
- cleaner unsupported-role messaging
- clear fallback when secure session restore fails

Expected outcome:

- more dependable sign-in experience

### Phase 1 exit criteria

1. registration feels guided, not manual
2. login and register errors are learner-friendly
3. session recovery behavior is predictable

## Phase 2: Dashboard And Navigation Refinement

### Goal

Make the student immediately understand their state and next best action.

### Scope

#### 1. Dashboard content hierarchy pass

Enhancement:

- make the recommended next exam more prominent
- improve separation between available and locked exams
- make stars and progress signals easier to scan
- improve empty state when no exams are available

#### 2. Subject context clarity

Enhancement:

- improve selected subject visibility
- ensure dashboard and analytics stay aligned with selected subject
- make “overall” versus subject-specific context obvious

#### 3. Student tab-shell polish

Enhancement:

- review bottom-tab naming and ordering
- improve transitions between dashboard, analytics, and profile
- ensure mobile spacing is consistent on smaller devices

### Phase 2 exit criteria

1. dashboard communicates “what now” within a few seconds
2. subject context is not confusing
3. navigation feels intentional on small screens

## Phase 3: Exam Flow Hardening

### Goal

Make the exam-taking journey reliable and low-stress on mobile.

### Scope

#### 1. Attempt state polish

Enhancement:

- improve visibility of current question state
- improve saved versus unsaved response feedback
- improve clarity of mark-for-review state
- make multi-select behavior easier to understand

#### 2. Submission confidence improvements

Enhancement:

- better pre-submit summary
- clearer warning for unanswered questions
- clearer action messaging during submission
- explicit success feedback after submit

#### 3. Interruption resilience

Enhancement:

- review screen behavior on refresh or temporary network failure
- protect against confusing stale data during attempt refetch
- improve feedback when section switching fails

### Phase 3 exit criteria

1. exam flow feels dependable under normal mobile interruptions
2. submit flow is clear and confidence-building
3. question-state behavior is easy to understand

## Phase 4: Results And Analytics Upgrade

### Goal

Help students understand performance and next steps, not just raw numbers.

### Scope

#### 1. Summary screen polish

Enhancement:

- make score and result meaning more readable
- emphasize next actions:
  - review answers
  - return to dashboard
  - open analytics

#### 2. Review screen learning value pass

Enhancement:

- improve readability of correct/incorrect states
- make answer comparisons easier to scan
- improve explanation presentation when available
- improve skipped-question presentation

#### 3. Analytics clarity upgrade

Enhancement:

- better trends and weak-topic storytelling
- highlight strongest and weakest areas more clearly
- show recent performance in a more student-readable way
- connect analytics to recommended action

### Phase 4 exit criteria

1. students can understand results quickly
2. review feels educational, not just technical
3. analytics suggests what to improve next

## Phase 5: Mobile UX Quality Pass

### Goal

Polish the overall mobile feel across all student surfaces.

### Scope

#### 1. Loading states

Enhancement:

- stronger loading copy
- better perceived responsiveness
- consistent loading patterns across screens

#### 2. Empty states

Enhancement:

- no exams available
- no analytics yet
- no results yet
- no review data

#### 3. Error states

Enhancement:

- retry patterns
- actionable recovery guidance
- clearer backend/network distinctions

#### 4. Visual consistency pass

Enhancement:

- spacing consistency
- text hierarchy consistency
- chip, card, and button behavior consistency

### Phase 5 exit criteria

1. the app feels intentionally mobile
2. failure states are recoverable
3. the UI language is consistent across screens

## Phase 6: QA, Docs, And Release Readiness

### Goal

Make the app easy to maintain and safe to test with real users.

### Scope

#### 1. Documentation refresh

Update:

- `nexora_student_mobile/README.md`
- `NEXORA_STUDENT_MOBILE_PENDING_GAP_ANALYSIS.md`
- any older student-mobile planning docs that no longer match code reality

#### 2. Student flow QA checklist

Create and verify:

1. registration
2. login
3. dashboard load
4. exam detail
5. start attempt
6. resume attempt
7. save answer
8. switch section
9. submit
10. summary
11. review
12. analytics
13. logout

#### 3. Device testing pass

Minimum testing:

- small Android screen
- average Android screen
- iPhone-size screen
- weak network simulation

### Phase 6 exit criteria

1. docs reflect reality
2. QA path is explicit
3. beta testing risk is reduced

## Priority Order

Recommended implementation order:

1. Phase 1: Onboarding And Auth Polish
2. Phase 3: Exam Flow Hardening
3. Phase 2: Dashboard And Navigation Refinement
4. Phase 4: Results And Analytics Upgrade
5. Phase 5: Mobile UX Quality Pass
6. Phase 6: QA, Docs, And Release Readiness

Reason:

- onboarding friction blocks adoption first
- exam reliability is the highest trust surface
- dashboard and analytics matter most after core stability

## Suggested First Sprint

Best first sprint scope:

1. registration UI upgrade
2. auth error handling pass
3. session edge-case cleanup

This is the highest leverage starting point because it improves the first experience for every student.

## Suggested Second Sprint

1. attempt-state polish
2. submit-flow confidence pass
3. attempt interruption handling

This improves trust in the core exam product.

## Suggested Third Sprint

1. review readability
2. analytics clarity
3. dashboard refinement

This improves student learning value after usage.

## Final Recommendation

We do not need to rebuild the student mobile app.

We should treat it as an existing product entering a focused enhancement cycle.

The right strategy is:

1. fix student friction first
2. harden the exam journey second
3. polish insights and presentation third

That path gives the fastest route to a credible student mobile beta.
