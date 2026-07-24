# Student E2E Remaining Gaps Audit

Audit date:

- Sunday, July 19, 2026

Scope:

- student Playwright coverage after the student academic reporting and mutable results stabilization work

This document answers one narrow question:

- what is still genuinely missing or only partially protected in the student area

It is intentionally different from the broader coverage maps:

- `edutech_web/tests/e2e/ROLE_MODULE_COVERAGE_MAP.md`
- `edutech_web/tests/e2e/PAGE_ACTION_COVERAGE_MAP.md`

---

## Bottom Line

The student area is now strong for:

- academic report pages
- analytics drill-down continuity
- desktop visual contracts
- mobile visual contracts
- core runtime and post-submit paths
- targeted mutable student results publication and storytelling

The remaining gaps are no longer major route-level absences.

Most remaining work is in three categories:

1. deeper action-level assertions on already-covered pages
2. environment portability for family-specific student lanes
3. release-bucket structure for mutable flows

---

## Current Student Route Snapshot

Student route inventory under `src/app/(student)/app`:

- `/app/dashboard`
- `/app/exams`
- `/app/exams/[examId]`
- `/app/exams/enter-key`
- `/app/practice`
- `/app/weak-areas`
- `/app/analytics`
- `/app/analytics/actions`
- `/app/analytics/downloads`
- `/app/analytics/question-types/[questionType]`
- `/app/analytics/questions`
- `/app/analytics/rank-history`
- `/app/analytics/results/compare`
- `/app/analytics/sources/[sourceKey]`
- `/app/analytics/study-recommendations`
- `/app/analytics/subjects/[subject]`
- `/app/analytics/time-management`
- `/app/analytics/timeline`
- `/app/analytics/topics/[topic]`
- `/app/analytics/wrong-questions`
- `/app/attempts`
- `/app/attempts/[attemptId]`
- `/app/attempts/[attemptId]/review`
- `/app/attempts/[attemptId]/summary`
- `/app/results`
- `/app/notifications`
- `/app/profile`
- `/app/search`
- `/app/settings`
- `/app/subscriptions`
- `/app/wallet`

Academic coverage across the report and drill-down routes is now materially stronger than it was in the earlier documentation set.

---

## Real Remaining Gaps

### 1. `/app/search` now has route-specific workflow coverage

Status:

- Closed on Sunday, July 19, 2026

What now exists:

- dedicated route-level coverage for:
  - search query behavior
  - source filters
  - sort behavior
  - grouping behavior
  - result handoff truthfulness
  - zero-state handling
  - reset behavior

Covered by:

- `student-search-workspace.spec.ts`

---

### 2. `/app/settings` now has page-specific workflow coverage

Status:

- Closed on Sunday, July 19, 2026

What now exists:

- dedicated route-level coverage for:
  - account-state visibility
  - support guidance visibility
  - quick-access route handoffs
  - notifications/help handoffs
  - session-control visibility
  - logout affordance visibility

Covered by:

- `student-settings-workspace.spec.ts`

---

### 3. `/app/wallet` now has page-specific workflow coverage

Status:

- Closed on Sunday, July 19, 2026

What now exists:

- dedicated route-level coverage for:
  - balance and KPI visibility
  - rewards and referral visibility
  - ledger and unlock-history visibility
  - star-pack and subscription-plan visibility
  - request-state visibility
  - premium-route handoffs into subscriptions, exams, and practice

Covered by:

- `student-wallet-workspace.spec.ts`

---

### 4. `/app/subscriptions` now has page-specific workflow coverage

Status:

- Closed on Sunday, July 19, 2026

What now exists:

- dedicated route-level coverage for:
  - section filter behavior
  - rows/page-size behavior
  - plans/orders/subscriptions state branches
  - wallet handoff truthfulness
  - premium-route handoffs
  - empty vs active subscription-state messaging

Covered by:

- `student-subscriptions-workspace.spec.ts`

Why this matters:

- subscriptions is a visible student-facing release surface
- it now has its own route contract instead of only indirect shell coverage

---

### 5. Utility-route depth gap is now materially closed

Status:

- Closed on Sunday, July 19, 2026

What changed:

- `/app/search` now has dedicated route coverage
- `/app/settings` now has dedicated route coverage
- `/app/wallet` now has dedicated route coverage
- `/app/subscriptions` now has dedicated route coverage

What remains:

- future refinement is still possible, but the earlier utility-route gap is no longer a first-order student release risk

---

### 6. `/app/exams` now has materially deeper action coverage

Status:

- Improved on Sunday, July 19, 2026

What exists:

- route entry
- filter presence
- enter-key handoff
- practice handoff
- mutable exam start lanes through separate specs
- page-size behavior coverage
- grouping behavior coverage
- pagination summary coverage
- quick-chip state coverage
- primary-action branch coverage for locked vs standard routes
- detail-route handoff coverage

What is still missing:

- a fuller multi-card pagination progression contract when the seeded learner has enough records to force page turnover
- broader state-matrix coverage across every possible action-label branch in one stable environment

Why this matters:

- exams is still one of the most important student entry routes
- it now has stronger route-level action protection and is no longer only a light shell contract

Recommended next phase:

- continue with the same action-depth treatment on `student-attempts-workspace.spec.ts`

---

### 7. `/app/attempts` now has materially deeper ledger coverage

Status:

- Improved on Sunday, July 19, 2026

What exists:

- attempts shell
- post-submit route continuity
- cross-browser reachability
- mutable runtime flows
- sort/group/page-size behavior coverage
- quick-filter state coverage
- pagination summary coverage
- grouped ledger section coverage
- richer primary/secondary action-branch coverage

What is still missing:

- compare/timeline/report handoff consistency directly from attempts-history surfaces when those links are exposed together in the seeded environment
- broader stable coverage for every practice follow-up branch in one deterministic data shape

Why this matters:

- attempts is effectively the student’s academic ledger
- it now has substantially stronger route-level protection and is no longer only a shell continuity lane

Recommended next phase:

- next improvement focus should shift to family-fixture portability and mutable release bucketing unless we want even denser attempt-state matrices

---

### 8. Export and download actions are still mostly product-limited, not fully automatable

Status:

- Partial product gap

What exists:

- downloads page route/workflow protection
- manifest truth assertions

What is still missing:

- broad file-download assertions across reports

Why it is not fully a test gap:

- several student report surfaces do not yet expose real downloadable actions beyond manifest-like presentation
- the product currently offers more report-navigation than actual downloadable file execution on the student side

Recommended next phase:

- once real student export buttons exist, add:
  - file response checks
  - download naming checks
  - export filter-scope checks

---

### 9. Family-specific student contract lanes still depend on seeded environment shape

Status:

- Improved on Sunday, July 19, 2026

Affected areas:

- NEET
- JEE
- GRE
- AWS
- mixed-subject and family-mobile lanes

What exists:

- strong authored specs
- shared family-fixture preflight coverage via `student-family-fixture-preflight.spec.ts`

What is still missing:
- portable guarantees that every required seeded exam, attempt, and report record exists in every environment
- broader result-fixture preflight depth beyond the currently declared family lanes

Why this matters:

- these lanes are useful release-confidence coverage for demo families
- the new preflight lane makes missing fixtures much easier to diagnose before deeper family specs run
- but their value still drops when they only run green in one favored environment

Recommended next phase:

- extend the preflight validator to cover more seeded result and mutable-runtime prerequisites

---

### 10. Mutable student lanes need cleaner release bucketing

Status:

- Improved on Sunday, July 19, 2026

What exists:

- mutable student runtime, results, storytelling, analytics, and family flows
- explicit release scripts for:
  - `test:e2e:release:student-mutable-core`
  - `test:e2e:release:student-mutable-family`
  - `test:e2e:release:student-mutable-operator`
  - `test:e2e:release:student-mutable-all`

What is still missing:

- stronger long-term tagging discipline so future student mutable specs automatically land in the right bucket without manual drift

Why this matters:

- mutable student coverage is now much easier to run by intent
- release teams can choose the right confidence layer more quickly

Recommended next phase:

- keep new mutable student specs aligned to the three release buckets as the suite grows

---

### 11. Coverage docs should keep moving with the suite

Status:

- Partial process gap

What exists:

- role map
- page action map
- academic audit

What is still missing:

- a small release habit where new student specs always update the audit tables in the same phase

Why this matters:

- the student suite is now broad enough that stale docs can mislead planning
- coverage is only useful if it stays legible

Recommended next phase:

- treat coverage-doc refresh as part of every student reporting milestone

---

## Recommended Next Order

1. Deepen action coverage on:
   - `/app/exams`
   - `/app/attempts`
2. Add family-fixture preflight validation for seeded student contract lanes
3. Keep mutable student specs aligned to the new core/family/operator buckets
4. Keep coverage documentation updated alongside every new student-phase spec

---

## Practical Release Readiness Read

As of **Sunday, July 19, 2026**, the student academic core is in a strong place.

That includes:

- results
- analytics
- dense academic reports
- visual desktop contracts
- visual mobile contracts
- runtime and post-submit continuity
- targeted mutable storytelling and publication continuity

The main remaining risks are now narrower:

- deeper action assertions on exams and attempts
- portability of family-seeded lanes
- long-term discipline around mutable release bucketing as new specs are added

That means the remaining work is mostly refinement and release-ops hardening, not a large missing-product-surface problem.

- environment-independent fixture guarantees

Why this matters:

- these lanes improve release confidence
- but they are still not equally portable across every environment without fixture validation or provisioning

Recommended next phase:

- add fixture preflight checks or tagged environment contracts for family-specific student suites

---

### 7. Mutable student lanes need cleaner release bucketing

Status:

- Partial

What exists:

- many mutable student specs already pass
- targeted student mutable results trio is now stable and green

What is still missing:

- a cleaner release-bucket split between:
  - disposable browser-safe mutable flows
  - seeded mutation flows
  - operator-assisted or environment-sensitive mutation flows

Why this matters:

- mutable student coverage is now broad enough that release selection matters
- not every mutable lane belongs in the same gating tier

Recommended next phase:

- define student mutable buckets such as:
  - `student-mutable-core`
  - `student-mutable-family`
  - `student-mutable-operator`

---

### 8. Coverage docs should be maintained as part of the release flow

Status:

- Process gap

What exists:

- student audit docs and coverage maps are now much closer to reality

What is still missing:

- a consistent habit of updating the maps whenever a new student route/spec is added

Why this matters:

- the student suite evolved faster than the docs
- that made the older maps understate real readiness

Recommended next phase:

- add a lightweight “docs refreshed” checklist item to student E2E phases

---

## Recommended Next Order

If we continue student work immediately, the best next order is:

1. Add route-specific specs for:
   - `/app/search`
   - `/app/settings`
   - `/app/wallet`
   - `/app/subscriptions`
2. Deepen:
   - `/app/exams`
   - `/app/attempts`
3. Add fixture validation for family-specific student lanes
4. Split mutable student specs into release buckets

---

## Practical Release Readiness Read

From a release perspective, the student academic core is in strong shape now.

The biggest remaining risks are no longer:

- missing academic pages
- missing dense report routes
- missing mutable results continuity

The biggest remaining risks are now:

- utility-route depth
- environment portability for family lanes
- operational clarity around which mutable student lanes should gate release
