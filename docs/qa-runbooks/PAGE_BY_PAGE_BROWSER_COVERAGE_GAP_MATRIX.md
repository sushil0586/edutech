# Page By Page Browser Coverage Gap Matrix

Last updated: 2026-07-09

## Purpose

This document answers one practical question:

- for each major page or workspace, what browser proof already exists
- what kind of proof it is
- what is still missing before we can say the page is strongly covered

This is intentionally page-first, not suite-first.

It is meant to help us avoid the exact class of regression where:

- a page is visited often
- broad workflow suites still pass
- but a specific control on that page silently stops working because the page contract was not asserted deeply enough

Related documents:

- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
- [FUNCTIONAL_END_TO_END_HARDENING_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FUNCTIONAL_END_TO_END_HARDENING_PLAN.md)
- [SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md)

## How To Read This

- `Strong`
  - the page has a direct workspace contract plus deeper mutable, mobile, cross-browser, or downstream proof
- `Good`
  - the page has a direct workspace contract and at least one deeper lane, but some dense controls or long-tail states are still thinner
- `Basic`
  - the page is visited and smoke-covered, but page-specific contracts are still too shallow for confidence
- `Gap`
  - there is no dedicated page contract yet, or the route is only covered indirectly through other flows

## What A Real Page Contract Should Prove

For dense pages, the target should not be a unit test. It should be a browser contract that proves:

- the route loads with the expected seeded dataset
- critical selectors and filters are hydrated
- visible tabs or subsections switch correctly
- empty state, blocked state, and no-access state are differentiated
- primary CTA and handoff controls navigate to the correct destination
- dense controls are not visually present but functionally dead

---

## Admin Pages

| Page | Existing browser proof | Current read | Main gaps |
| --- | --- | --- | --- |
| Dashboard | `admin-dashboard-workspace.spec.ts`, `admin-cross-browser-shell.spec.ts`, `admin-cross-browser-deep-routes.spec.ts` | Good | More explicit card-by-card action contracts and unsupported empty-state proofs |
| Institutes | `admin-institutes-workspace.spec.ts`, `admin-institutes-mutable.spec.ts`, `admin-institutes-timing.spec.ts`, `admin-mixed-institute-onboarding.mutable.spec.ts`, `admin-multi-institute-pilot.mutable.spec.ts`, `admin-multi-subject-contract.spec.ts` | Strong | Lower-support onboarding summary clarity and more first-time-operator edge packs |
| People | `admin-people-workspace.spec.ts`, `admin-roster-mutable.spec.ts`, `admin-roster-import-mutable.spec.ts`, `admin-people-timing.spec.ts`, `admin-mobile-people-workflow.spec.ts` | Strong | More role-state recovery and larger import realism packs |
| Economy | `admin-economy-workspace.spec.ts`, `admin-economy-mutable.spec.ts`, `admin-economy-timing.spec.ts`, `admin-economy-browser-coverage.spec.ts`, `admin-economy-navigation.spec.ts`, `admin-mobile-economy-workflow.spec.ts`, package-scope and propagation mutable specs | Strong | More explicit page-contract assertions for every visible selector, subsection, and filter hydration contract |
| Exams list | `admin-exams-workspace.spec.ts`, `admin-exam-assignment-mode-matrix.mutable.spec.ts`, `admin-exam-policy-security-matrix.mutable.spec.ts` | Good | More direct empty-state and filter-reset proofs on the page itself |
| Exam create wizard | `admin-exams-create-workspace.spec.ts`, `admin-exam-creation-wizard-matrix.mutable.spec.ts`, family guided create specs | Strong | Broader runtime assignment-mode enumeration and more long-tail creation combinations |
| Advanced builder | `admin-advanced-builder-workspace.spec.ts`, `admin-exam-builder-workspace.spec.ts`, `admin-exam-builder-mutable.spec.ts`, `admin-exam-creation-advanced-matrix.mutable.spec.ts`, preset handoff specs | Strong | More repeated-run stability and broad dataset variance |
| Exam detail | `admin-exam-detail-workspace.spec.ts`, `admin-exam-detail-mutable.spec.ts`, policy and results contract suites | Good | More recovery and publish-distribution edge states |
| Reports | `admin-reports-workspace.spec.ts`, `admin-reports-timing.spec.ts`, `admin-mobile-reports-workflow.spec.ts` | Good | More page-level contract depth for widget states, drill chain truth, and empty-versus-no-data explanation |
| Search | `admin-search-workspace.spec.ts` | Basic | Missing mobile, cross-browser, and denser result-state or no-result contracts |
| Security | `admin-security-workspace.spec.ts`, `admin-security-timing.spec.ts`, `admin-mobile-security-workflow.spec.ts` | Good | Denser page-level proofs for watch states, filter persistence, and action guard clarity |
| Academic setup | `admin-academic-setup-workspace.spec.ts`, `admin-academic-setup-mutable.spec.ts` | Good | More subsection-by-subsection contract depth and mobile proof |
| Settings | `admin-settings-workspace.spec.ts`, `admin-settings-timing.spec.ts` | Basic to Good | Missing mobile proof and broader settings mutation and recovery contracts |

## Institute Pages

| Page | Existing browser proof | Current read | Main gaps |
| --- | --- | --- | --- |
| Dashboard | `institute-dashboard-workspace.spec.ts`, `institute-cross-browser-shell.spec.ts`, `institute-end-user-browser-smoke.spec.ts` | Good | More dense card-interaction and empty-state explanation contracts |
| Exams list | `institute-exams-workspace.spec.ts`, `institute-exams-filter-pagination.spec.ts`, `institute-exam-mutable.spec.ts`, `institute-mobile-exams-workflow.spec.ts` | Strong | More multi-state unsupported self-serve recovery packs |
| Exam detail | `institute-exam-detail-workspace.spec.ts`, `institute-exam-policy-security-matrix.mutable.spec.ts` | Good | More publish, reassignment, and lifecycle recovery depth |
| Exam create wizard | `institute-exam-creation-wizard-matrix.mutable.spec.ts`, family guided create specs | Good | A direct page-workspace contract for the wizard shell would make coverage clearer |
| Advanced builder | `institute-exam-builder-workspace.spec.ts`, `institute-exam-creation-advanced-matrix.mutable.spec.ts`, preset handoff specs | Good to Strong | Broader runtime matrix breadth and more repeat depth |
| Question bank main page | `institute-question-bank-workspace.spec.ts`, `institute-question-mutable.spec.ts`, `institute-question-bank-timing.spec.ts`, `institute-mobile-question-bank-workflow.spec.ts` | Strong | More page-contract proof for every top-level filter, sort, and empty-state explanation |
| Question bank detail | `institute-question-bank-detail-workspace.spec.ts` | Good | More dataset variance and authoring-to-detail continuity |
| Question bank bulk actions | `institute-question-bank-bulk-workspace.spec.ts`, `institute-question-bank-bulk-mutable.spec.ts`, `institute-question-bank-bulk-eligibility-recovery.spec.ts` | Strong | More large-selection and mixed-eligibility recovery proof |
| Shared library lane | `institute-question-bank-shared-library-workspace.spec.ts`, no-entitlement and quota suites, link mutable suites, linker specs, builder flow, entitlement enforcement, publish readiness | Strong | Broader self-serve unsupported language and more multi-package diagnosis packs |
| Reviews | `institute-reviews-workspace.spec.ts`, `institute-mobile-reviews-workflow.spec.ts` | Good | More descriptive moderation depth and larger mixed-review queues |
| Results main page | `institute-results-workspace.spec.ts`, `institute-results-mutable.spec.ts`, `institute-results-timing.spec.ts`, cross-browser results, multi-learner mutable specs | Strong | More long-tail result-state breadth and unsupported interpretation clarity |
| Results analysis | `institute-results-analysis-workspace.spec.ts`, populated mutable spec | Strong | More sparse-data and contradictory-filter contract coverage |
| Results attempts | `institute-results-attempts-workspace.spec.ts` | Good | More downstream branch-state recovery and empty-state proof |
| Results leaderboard | `institute-results-leaderboard-workspace.spec.ts` | Good | More ties, hidden learners, and unpublished-state coverage |
| Results live monitor | `institute-results-live-workspace.spec.ts`, populated mutable spec | Strong | More weak-network or stale-data recovery assertions |
| Reports | `institute-reports-workspace.spec.ts` | Basic to Good | Missing mobile, timing, and deeper drill state proof |
| Economy | `institute-economy-workspace.spec.ts`, `institute-economy-mutable.spec.ts` | Good | More page-level filter, lane, and entitlement-explanation contracts |

## Teacher Pages

| Page | Existing browser proof | Current read | Main gaps |
| --- | --- | --- | --- |
| Results main page | `teacher-results-workspace.spec.ts`, `teacher-results-mutable.spec.ts`, `teacher-results-timing.spec.ts`, cross-browser results specs | Strong | More long-tail result distribution and interpretation edge states |
| Results analysis | `teacher-results-analysis-workspace.spec.ts`, populated mutable spec | Strong | More sparse-data and contradictory-filter proofs |
| Results attempts | `teacher-results-attempts-workspace.spec.ts` | Good | More recovery and branch-state depth |
| Results leaderboard | `teacher-results-leaderboard-workspace.spec.ts` | Good | More tie and publication-edge coverage |
| Results live monitor | `teacher-results-live-workspace.spec.ts`, populated mutable spec | Strong | More stale/live transition and weak-network cases |
| Reviews | `teacher-reviews-workspace.spec.ts`, `teacher-review-mutable.spec.ts`, `teacher-mobile-reviews-workflow.spec.ts` | Strong | Broader manual-evaluation realism and dense queue edge cases |
| Exam detail | `teacher-exam-detail-workspace.spec.ts`, `teacher-exam-detail-mutable.spec.ts` | Good | More delivery-control recovery and publish edge states |
| Question bank shared library lane | `teacher-question-bank-shared-library-workspace.spec.ts`, request mutable specs, no-entitlement and quota specs, role-difference specs | Strong | More first-time operator recovery language and persistence edge packs |
| Question bank authoring | `teacher-question-mutable.spec.ts`, `teacher-comprehension-mutable.spec.ts`, import/export and timing suites, mobile authoring flow | Good to Strong | A direct question-bank workspace contract is still thinner than institute-side coverage |
| Cross-role role consistency | `teacher-institute-role-consistency.spec.ts`, `teacher-institute-shared-library-role-difference.spec.ts` | Good | More direct page-by-page explanation proof for intentional product differences |

## Student Pages

| Page | Existing browser proof | Current read | Main gaps |
| --- | --- | --- | --- |
| Dashboard | `student-dashboard-workspace.spec.ts`, `student-mobile-sanity-workspace.spec.ts`, `student-cross-browser-shell.spec.ts` | Good | More dense action-card and no-data explanation contracts |
| Exams list and discovery | `student-exam-detail-workspace.spec.ts`, `student-exam-key-workspace.spec.ts`, `student-cross-browser-exam-runtime.spec.ts` | Good | More first-page discovery and ineligible-versus-hidden differentiation contracts |
| Attempt runtime | `student-attempt-runtime-workspace.spec.ts`, `student-attempt-mutable.spec.ts`, long-session and weak-network mutable specs, cross-browser exam runtime | Strong | More descriptive/manual-evaluation runtime realism and broader interruption patterns |
| Attempts history | `student-attempts-workspace.spec.ts`, cross-browser attempts summary | Strong | More large-history and mixed-status breadth |
| Post-submit summary | `student-post-submit-workspace.spec.ts`, `student-summary-timing.spec.ts`, persistence specs | Strong | More rare post-submit state transitions |
| Results main page | `student-results-workspace.spec.ts`, `student-results-mutable.spec.ts`, `student-results-timing.spec.ts`, result state matrix, cross-browser analytics/results specs | Strong | More long-tail result combinations and summary interpretation breadth |
| Review workspace | `student-review-workspace.spec.ts`, `student-review-timing.spec.ts`, source and scope persistence specs, mobile results review workflow | Strong | Deeper descriptive/manual-evaluation realism and more odd publication sequences |
| Analytics | `student-analytics-timeline-compare-workspace.spec.ts`, `student-analytics-scope-persistence-workspace.spec.ts`, `student-analytics-deep.spec.ts`, drilldown mutable specs, cross-browser analytics/results | Strong | More low-data, contradictory-filter, and edge-comparison explanation proof |
| Practice | `student-practice-workspace.spec.ts`, `student-practice-mutable.spec.ts`, practice attempts scope persistence, AWS practice lifecycle | Strong | More entitlement edge and mixed-practice inventory breadth |
| Notifications | `student-notifications-workspace.spec.ts` | Good | More mobile and cross-browser depth plus denser state-action packs |
| Referral and wallet | `student-referral-wallet-workspace.spec.ts`, `student-referral-onboarding.mutable.spec.ts` | Good | More negative wallet states and subscription crossover cases |
| Utility surfaces | `student-utility-workspace.spec.ts` | Basic to Good | Individual page contracts for profile, subscriptions, search, and identity are still bundled rather than separated |

---

## Largest Page-Level Gaps

These are the biggest places where page coverage is still thinner than the total test count can make it feel.

### 1. Pages with only one direct workspace contract

These routes are covered, but not yet with enough page-specific depth:

- admin search
- admin settings
- institute reports
- institute exam create shell
- teacher results attempts
- teacher results leaderboard
- teacher exam detail
- student notifications
- student utility surfaces bundled together instead of page-separated

### 2. Dense pages that need stronger selector hydration contracts

These pages have many browser tests, but still need explicit checks that every visible selector and subsection is actually backed by loaded data:

- admin economy
- admin reports
- admin security
- institute question bank
- institute economy
- student analytics

This is the same family as the recent `/admin/economy` institute-scope regression:

- the page rendered the control
- the page was often visited
- but the data-fetch contract behind the control was incomplete

### 3. Pages that are strong functionally but still thin for unsupported self-serve

These need more first-time-operator truth than more raw mutation depth:

- admin institutes onboarding surfaces
- admin economy entitlement and package diagnosis surfaces
- institute shared-library recovery surfaces
- teacher request-only versus institute link-capable explanation surfaces

### 4. Pages that are strong overall but not yet fully long-tail complete

These are the main reasons student confidence is still below `9.5/10`:

- student attempt runtime
- student results
- student review
- institute descriptive review and multi-role publication chains
- teacher descriptive review and queue realism

The remaining gap is not that the pages are weak. It is that the scenario space is broader than the current blanket proof.

---

## Recommended Next Passes

### Pass 1: page-contract hardening on dense operator pages

Add or strengthen page contracts for:

- admin economy
- admin reports
- admin security
- institute question bank
- institute economy

For each page, prove:

- every visible dropdown has real options when expected
- default scope is truthful
- reset behavior is truthful
- empty, blocked, and no-access states are distinct
- primary subsection tabs all load their intended data

### Pass 2: split bundled page coverage into true page contracts

Create dedicated specs where coverage is still bundled or indirect:

- admin settings
- admin search deeper states
- institute reports
- student profile and subscriptions pages if they are currently only covered through utility bundles

### Pass 3: first-time operator packs

Use grouped browser packs that simulate unsupported self-serve operation for:

- mixed onboarding
- package mismatch and partial entitlement
- role-difference explanation
- empty-state versus no-access interpretation

### Pass 4: long-tail student realism

Deepen blanket proof on:

- descriptive/manual-evaluation publication timing
- rare result-state combinations
- longer interruption and re-entry chains
- broader mixed-history result storytelling

---

## Practical Rule Going Forward

When a page is important, we should not stop at:

- “a workflow visited it”
- “a screenshot looked fine”
- “a mutation suite touched a nearby flow”

We should require one dedicated page contract that proves the page itself is alive and truthful.

That is the main process change that will reduce “it looked covered, but this one control was dead” regressions.
