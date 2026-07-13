# Student Detailed Functionality And State-Change Plan - 2026-07-13

## Purpose

This plan answers the request to test student functionality in detail.

For the student role, "full CRUD" should be interpreted carefully.

Student does not own classic high-volume CRUD in the same way that:

- admin manages institutes, people, settings, economy, and governance records
- institute manages roster, assignments, question authoring, reviews, and reports
- teacher manages exam authoring, question authoring, and review workflows

For student, the higher-value equivalent is:

- full read coverage
- full state-transition coverage
- full attempt lifecycle coverage
- full results/review continuity coverage
- full subscription, wallet, and entitlement visibility coverage

So the correct student target is:

- detailed functionality coverage
- detailed state-changing coverage
- detailed lifecycle coverage

## Testing Layers

### Layer 1: Student baseline functionality

This proves the main learner product reads and navigation paths.

Command:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
PLAYWRIGHT_BASE_URL=http://localhost:3006 npm run test:e2e:release:student-core
```

This covers:

- dashboard
- exam discovery
- exam detail
- exam-key entry
- runtime attempt shell
- post-submit flow
- attempts workspace
- results workspace
- result-state matrix
- review workspace
- practice workspace
- practice scope persistence
- analytics continuity
- summary/review persistence
- utility workspace
- notifications
- family contract lanes

### Layer 2: Student state-changing and lifecycle depth

This is the student equivalent of CRUD-heavy coverage.

Command:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
PLAYWRIGHT_BASE_URL=http://localhost:3006 npm run test:e2e:release:student-mutable-core
```

This covers:

- exam detail mutable path
- exam-key live usage
- real attempt lifecycle
- results publication and release visibility
- practice lifecycle
- results storytelling
- analytics drilldown truth
- descriptive result storytelling
- descriptive analytics continuity
- long-session runtime resilience
- mixed result-history realism
- multi-attempt history continuity
- weak-network learner flow
- referral onboarding
- wallet and ledger visibility
- economy and entitlement visibility
- family lifecycle lanes for NEET, JEE, GRE, AWS, and multi-subject

### Layer 3: Combined student web confidence

Command:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
PLAYWRIGHT_BASE_URL=http://localhost:3006 npm run test:e2e:release:student-full-web
```

This combines:

- `student-core`
- `student-mutable-core`

This is the best current browser-based answer to:

- "test all student functionality in detail"

## Student Detailed Coverage Matrix

### 1. Shell and navigation

Should prove:

- dashboard loads
- exams/results/analytics/utilities routes open
- shell handoffs stay stable
- compact/mobile shell does not regress

Current proof:

- baseline covered
- mobile-web covered separately

### 2. Exam discovery

Should prove:

- available exams visible
- locked exams visible
- exam detail opens truthfully
- exam policy and readiness state stay understandable

Current proof:

- baseline covered
- mutable detail path covered

### 3. Exam-key flow

Should prove:

- validation errors
- valid key path
- routed exam access

Current proof:

- baseline covered
- mutable covered

### 4. Attempt runtime

Should prove:

- start attempt
- save answer
- navigate questions
- reopen and continue
- submit
- tolerate edge states

Current proof:

- baseline covered
- mutable covered
- long-session covered
- weak-network covered

### 5. Post-submit and result states

Should prove:

- submitted state
- pending-publication state
- summary-visible state
- review-visible state
- mixed result history

Current proof:

- baseline covered
- mutable covered
- storytelling covered
- mixed-state history covered

### 6. Review continuity

Should prove:

- correct answer visibility when allowed
- learner review handoff truth
- summary to review continuity
- descriptive learner interpretation

Current proof:

- baseline covered
- descriptive storytelling covered

### 7. Practice and weak areas

Should prove:

- practice list/filter/reset
- start and resume
- submit and review
- weak area continuity

Current proof:

- baseline covered
- mutable covered

### 8. Analytics

Should prove:

- analytics landing
- compare/timeline continuity
- source persistence
- descriptive result contribution
- multi-attempt coherence

Current proof:

- baseline covered
- mutable drilldown covered
- descriptive analytics covered
- multi-attempt continuity covered

### 9. Utility, notifications, wallet, subscription

Should prove:

- profile/settings/search visibility
- notifications visibility
- referral onboarding
- wallet ledger truth
- student economy visibility
- entitlement visibility

Current proof:

- baseline utility and notifications covered
- mutable referral, wallet, economy, and entitlement lanes covered

### 10. Family-specific learner contracts

Should prove:

- NEET
- JEE
- GRE
- AWS
- multi-subject

Current proof:

- baseline contract lanes covered
- mutable lifecycle lanes covered

## Mobile Order After Student Web

After `student-full-web`, run mobile-web:

```bash
cd /Users/ansh/Documents/Eductech/edutech_web
PLAYWRIGHT_BASE_URL=http://localhost:3006 npm run test:e2e:release:student-mobile-core
```

Then, if native app validation is in scope, run the separate Maestro flows in `nexora_student_mobile`.

## Practical Recommendation

If the goal is true detailed student confidence, use this order:

1. `student-core`
2. `student-mutable-core`
3. `student-full-web` status summary
4. `student-mobile-core`
5. native mobile Maestro pass if release scope includes the app

## Bottom Line

For student, the right target is not classic CRUD wording.

The right target is:

- baseline learner functionality
- write and state-change realism
- attempt and result lifecycle truth
- mobile-web continuity
- native-mobile validation when needed

That is now grouped into runnable commands and can be tracked cleanly.
