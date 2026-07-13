# Admin Browser Gap Board

Last updated: 2026-07-09
Scope: Admin web desktop Chromium sweep after targeted hardening, seeded advanced-builder proof, and reruns

## Snapshot

- Full admin Chromium sweep: `72 passed`, `67 skipped`, `0 failed`
- Build status: `npm run build` passing
- Confidence read: admin read-only/operator browsing lanes are strong; seeded advanced-builder mutable proof is now green, but broader page-by-page and long-tail admin proof is still thinner than `9.5/10`

## Bug

### 1. Advanced builder could keep create action available after preview failure

- Severity: Fixed
- Area: Admin exams advanced builder
- Previous behavior:
  - Preview could fail with a composition blocker such as `Practice Set requested 1 question(s) but only 0 could be resolved.`
  - The UI showed the error, but `Create Advanced Exam` could remain clickable.
- Resolution:
  - `Create Advanced Exam` is now disabled whenever the builder is in an error state, including failed preview resolution.
  - A deterministic browser test now mocks preview failure and verifies create is blocked.
- Source references:
  - [advanced-exam-builder.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/advanced-exam-builder.tsx:3165)
  - [advanced-exam-builder.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/advanced-exam-builder.tsx:4868)
  - [admin-advanced-builder-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts:70)
- Evidence:
  - Found during `admin-multi-institute-assignment-isolation.mutable.spec.ts`
- Status:
  - Closed

## Proof Gap

### 2. Seeded advanced-builder creation lane is now in place

- Severity: Closed
- Area: Admin advanced exam creation
- Previous gap:
  - Some discovered institute lanes did not have enough resolvable questions for even a 1-question quick-practice preview.
  - Mutable proof could still be truthful, but not always fully create-and-run deterministic.
- Resolution:
  - mutable advanced-builder proof now uses the seeded AWS lane under `Demo Learning Institute (DLI001)`
  - specs were aligned to the current product contract:
    - `Primary subject` field label
    - topic-option readiness before template apply
    - student save redirect contract during attempt flow
- Closure proof:
  - `PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS=1 PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 npx playwright test tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts tests/e2e/workflow/admin-exam-creation-advanced-student-attempt.mutable.spec.ts --project=chromium`
  - grouped result: `4 passed`
- Source references:
  - [admin-exam-creation-advanced-matrix.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts:1)
  - [admin-exam-creation-advanced-student-attempt.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exam-creation-advanced-student-attempt.mutable.spec.ts:1)

### 3. Mutable admin coverage remains materially thinner than read-only coverage outside the seeded exam lane

- Severity: Medium
- Area: Admin module overall
- Current state:
  - Full admin sweep is green, but `67` specs were skipped.
  - Most skipped cases are mutable flows gated by env flags, seed data, or disposable workflow requirements.
- Why this matters:
  - Browser confidence is high for browse/filter/review lanes.
  - It is not yet equally high for create/update/delete/release lifecycles across every admin page.
- Main skipped clusters:
  - Economy mutable operations
  - Onboarding mutable flows
  - Exam creation/release mutable flows
  - Roster import mutable flows
  - Package propagation and institute recovery mutable flows
- Suggested next proof order:
  1. Onboarding and package-scope recovery grouped matrix
  2. Roster import and people/account-control matrix
  3. Academic setup and dense admin write-path matrix

### 4. Lower-support self-serve admin proof is still thinner than guided operator proof

- Severity: Medium
- Area: Admin + institute operational clarity
- Current state:
  - Guided browser flows are strong.
  - First-time operator recovery across mixed onboarding, partial entitlement, and cross-role contract interpretation is still scenario-dense rather than blanket-proven.
- Why this matters:
  - This is the main blocker to calling the surface truly “9.5/10 self-serve ready.”
- Suggested proof pack:
  - Mixed onboarding
  - Partial package entitlement
  - Empty-state vs no-access differentiation
  - Dataset-empty vs scope-filtered differentiation
  - Cross-page admin recovery wording checks

### 5. Page-by-page admin confidence is still uneven

- Severity: Medium
- Area: Admin module overall
- Current state:
  - Admin has wide route coverage and many focused specs.
  - It still lacks one clean page-by-page confidence map tying each major page to:
    - current browser proof
    - mutable proof
    - visual review status
    - remaining operator friction
- Why this matters:
  - This is one of the main blockers to honestly calling admin `9.5/10`.
  - Without a page matrix, confidence can drift upward faster than the evidence.
- Execution artifact:
  - [ADMIN_9_5_CONFIDENCE_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/ADMIN_9_5_CONFIDENCE_EXECUTION_BOARD.md)

## Observation

### 6. Admin economy deep-link contract has intentionally changed

- Severity: Low
- Area: Admin economy routing
- Current state:
  - Economy tabs now deep-link with default `focus=` values instead of always using bare `?tab=...`.
- Source references:
  - [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/economy/page.tsx:532)
  - [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/economy/page.tsx:1147)
- Why this matters:
  - This is not a product bug.
  - Any older helpers/specs assuming exact legacy tab URLs will drift and fail.
- Action:
  - Normalize future browser assertions to tab intent, not exact legacy href strings.

### 7. Package-scope blocking guidance is editor-view scoped

- Severity: Low
- Area: Admin economy question-bank package editor
- Current state:
  - Blocking helper and row-level scope warnings render correctly in editor mode.
  - They are not visible from catalog mode until edit/editor view is opened.
- Source references:
  - [economy-question-bank-package-management-card.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/admin/economy-question-bank-package-management-card.tsx:1812)
  - [economy-question-bank-package-management-card.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/admin/economy-question-bank-package-management-card.tsx:2014)
- Why this matters:
  - Not a product bug.
  - Easy place for future browser tests to make false assumptions.

### 8. Dataset-aware assertions are required on admin exams and admin people

- Severity: Low
- Area: Admin exams / people
- Current state:
  - Some environments legitimately have empty datasets or partially configured scope.
  - Truthful browser coverage needs to distinguish:
    - no records loaded
    - filtered empty state
    - blocked progression because required scope is missing
- Why this matters:
  - Prevents false regression reports from environment shape alone.

## Recommended Next Moves

### Phase 1

- Completed: fix the advanced-builder create-button safety bug after preview failure.
- Completed: add one browser assertion specifically for failed-preview create blocking.

### Phase 2

- Completed: stand up one deterministic seeded advanced-builder creation lane with guaranteed resolvable questions.
- Completed: re-run mutable advanced exam creation and seeded student runtime proof using that lane.

### Phase 3

- Burn down the highest-value skipped mutable clusters:
  - onboarding
  - package-scope recovery
  - roster import
  - academic setup write paths

### Phase 4

- Convert remaining admin proof gaps into repeatable page-by-page packs.
- Complete the desktop visual pass across major admin routes.
- Promote confidence only after the grouped admin signoff pack and visual review both hold.
