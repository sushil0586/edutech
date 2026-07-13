# Admin 9.5 Confidence Execution Board

Last updated: 2026-07-09

## Purpose

This board turns the current admin confidence from roughly `9/10` into a concrete path toward `9.5/10`.

Use it to answer:

1. why admin confidence is already strong
2. why it is still not honestly `9.5/10`
3. which admin pages still need denser live proof
4. what must be true before we can call the full admin module broadly self-serve-safe

Related documents:

- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
- [ADMIN_BROWSER_GAP_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/ADMIN_BROWSER_GAP_BOARD.md)
- [SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/SELF_SERVE_ROLLOUT_CONFIDENCE_PLAN.md)
- [FUNCTIONAL_P0_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FUNCTIONAL_P0_EXECUTION_BOARD.md)
- [PLAYWRIGHT_BROWSER_9_BENCHMARK_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_BROWSER_9_BENCHMARK_PLAN.md)

---

## Current Read

### Current confidence

- Admin core governed workflows: `9/10`
- Admin full module page-to-page confidence: `8.75 to 9/10`
- Admin broad unsupported self-serve confidence: below `9.5/10`

### Why admin is strong already

- admin browse and workspace routes are broadly browser-proven
- admin economy/operator flows are materially stronger than before
- admin onboarding and mixed-institute realism are now browser-proven
- admin exam management now includes deterministic seeded advanced-builder creation and seeded student runtime proof
- current grouped mutable advanced-builder proof is green:
  - `admin-exam-creation-advanced-matrix.mutable.spec.ts`
  - `admin-exam-creation-advanced-student-attempt.mutable.spec.ts`
  - grouped result: `4 passed`

### Why admin is not yet `9.5/10`

- proof is still uneven page-to-page rather than equally dense on every major admin surface
- several pages are strong in read-only coverage but thinner in mutation, recovery, and low-support operator clarity
- desktop browser truth is strong, but a full admin-wide visual/UX consistency pass is still incomplete
- long-tail admin scenarios are still thinner than the mainline guided operator flows

---

## 9.5 Success Bar

We should only raise admin to `9.5/10` when all of the following are true:

- every major admin page has at least one current browser-proof pack aligned to the live UI contract
- the highest-risk mutable admin lanes have deterministic seeded proof, not only environment-lucky proof
- dense operator states are understandable from the UI alone without backend inspection
- visual review has been completed across the major desktop admin pages and resulting friction bugs have been burned down
- at least one final grouped admin sweep passes without relying on outdated labels, hidden helper assumptions, or stale URL contracts

---

## Status Legend

- `Open`: not started
- `In Progress`: currently being worked on
- `Ready for QA`: implementation complete, focused validation pending
- `Done`: verified and accepted
- `Blocked`: waiting on environment, seed, or dependency repair

---

## Page Matrix

| Area | Current Read | Main Residual | Primary Proof Type Needed |
| --- | --- | --- | --- |
| Admin dashboard | Strong | page-level UX and interpretation consistency | visual review + workspace assertions |
| Admin institutes | Strong | lower-support recovery and edge-state clarity | mutable + browser review |
| Admin people | Strong | dense filters, account-state truth, roster edge recovery | mutable + timing + browser review |
| Admin economy | Strong | conceptual density and operator surprise risk | grouped mutable + visual review |
| Admin academic setup | Medium-high | setup mental model and write-path confidence breadth | mutable + visual review |
| Admin exams list/detail | Strong | dataset-aware and long-tail status truth | grouped browser + mutable |
| Admin exam builder | Strong | broader release and long-tail configuration depth | grouped mutable |
| Admin advanced builder | Strong | now seeded and deterministic, but still needs to stay green in grouped sweeps | grouped mutable reruns |
| Admin reports | Medium-high | results interpretation and filter/reset clarity | browser review + dataset-aware assertions |
| Admin search | Strong | deeper populated result-intent and grouped discoverability proof | grouped browser review |
| Admin security | Strong | dense policy interpretation and broader mutation/recovery depth | grouped browser review + mutation truth |
| Admin settings | Medium-high | lower-frequency but still critical operator edits | browser review + workspace checks |

---

## Board Summary

| ID | Area | Title | Severity | Status | Owner |
| --- | --- | --- | --- | --- | --- |
| A95-01 | Coverage | Create page-by-page admin proof map and close stale-contract drift | High | Done | Codex |
| A95-02 | Exams | Keep seeded admin exam creation/release proof grouped and repeatable | High | In Progress | Codex |
| A95-03 | Visual Review | Complete desktop admin visual/UX pass across all major pages | High | In Progress | Codex |
| A95-04 | Operator Clarity | Harden low-support admin explanation and recovery states | High | Open | Codex |
| A95-05 | Long Tail | Expand admin long-tail scenario matrix beyond mainline workflows | High | Open | Codex |
| A95-06 | Signoff | Run final grouped admin confidence pack and update confidence docs | High | Open | Codex |

---

## Recommended Execution Order

1. `A95-01` page-by-page proof map
2. `A95-02` grouped seeded exam proof
3. `A95-03` desktop visual review
4. `A95-04` low-support admin clarity hardening
5. `A95-05` long-tail scenario expansion
6. `A95-06` final grouped signoff

Why this order:

- first remove ambiguity about what is and is not actually covered
- then lock the highest-risk mutable exam lanes into repeatable seeded proof
- then burn down the visual/operator friction bugs that visual review exposes
- then widen from mainline proof to long-tail proof
- finish with one grouped signoff pass instead of raising confidence from scattered evidence

---

## Detailed Work Items

### A95-01 Page-By-Page Admin Proof Map

Status: `Done`

Problem:

- admin has many specs, but the remaining confidence gap is now mostly about uneven proof distribution
- it is too easy to overestimate coverage because the module has broad test count but not uniformly deep test density

Acceptance criteria:

- one page-by-page map exists for all major admin routes
- each page lists:
  - current main specs
  - mutable specs
  - visual review status
  - main residual gaps
- older stale assumptions are identified explicitly

Initial route map:

- `/admin`
- `/admin/dashboard`
- `/admin/institutes`
- `/admin/people`
- `/admin/economy`
- `/admin/academic-setup`
- `/admin/exams`
- `/admin/exams/[examId]`
- `/admin/exams/[examId]/builder`
- `/admin/exams/advanced`
- `/admin/reports`
- `/admin/search`
- `/admin/security`
- `/admin/settings`

Initial proof anchors:

- `tests/e2e/workflow/admin-dashboard-workspace.spec.ts`
- `tests/e2e/workflow/admin-institutes-workspace.spec.ts`
- `tests/e2e/workflow/admin-people-workspace.spec.ts`
- `tests/e2e/workflow/admin-economy-workspace.spec.ts`
- `tests/e2e/workflow/admin-academic-setup-workspace.spec.ts`
- `tests/e2e/workflow/admin-exams-workspace.spec.ts`
- `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts`
- `tests/e2e/workflow/admin-exam-builder-workspace.spec.ts`
- `tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts`
- `tests/e2e/workflow/admin-reports-workspace.spec.ts`
- `tests/e2e/workflow/admin-search-workspace.spec.ts`
- `tests/e2e/workflow/admin-security-workspace.spec.ts`
- `tests/e2e/workflow/admin-settings-workspace.spec.ts`

Signoff condition:

- we can answer “what exactly is proven on this admin page?” without guessing from memory

Closure proof:

- [ADMIN_PAGE_PROOF_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/ADMIN_PAGE_PROOF_MATRIX.md)
  - major admin routes are now mapped to:
    - current page implementation
    - workspace/browser specs
    - mutable/deeper specs
    - visual review status
    - current residual gap
  - the matrix now makes the remaining admin `9.5/10` gap explicit instead of inferred from broad spec count alone

### A95-02 Seeded Admin Exam Creation And Release Grouped Proof

Status: `In Progress`

Problem:

- admin exam confidence improved materially, but it only becomes `9.5` material when the strongest mutable lanes stay grouped and deterministic

Acceptance criteria:

- grouped seeded mutable admin advanced-builder pack passes repeatably
- grouped seeded admin exam builder/wizard lanes also pass with current UI labels and save contracts
- student runtime proof remains grouped with admin creation proof, not isolated

Current proof:

- `tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts`
- `tests/e2e/workflow/admin-exam-creation-advanced-student-attempt.mutable.spec.ts`
- current grouped result: `4 passed`

Follow-up targets:

- `tests/e2e/workflow/admin-exam-creation-wizard-matrix.mutable.spec.ts`
- `tests/e2e/workflow/admin-exam-assignment-mode-matrix.mutable.spec.ts`
- `tests/e2e/workflow/admin-exam-policy-security-matrix.mutable.spec.ts`
- `tests/e2e/workflow/admin-exam-builder-mutable.spec.ts`
- `tests/e2e/workflow/admin-exam-detail-mutable.spec.ts`

Signoff condition:

- admin exam confidence no longer depends on one mutable lane being green in isolation

### A95-03 Desktop Admin Visual Review

Status: `In Progress`

Problem:

- visual and UX review is still one of the clearest ways to find operator friction that functional assertions miss

Acceptance criteria:

- desktop screenshots are captured and reviewed for all major admin pages
- each page gets a short review note:
  - visual clean
  - friction found
  - fix landed
  - follow-up needed
- dropdowns, filters, tabs, empty states, and dense cards are checked for current behavior

Priority pages:

- `/admin/economy`
- `/admin/academic-setup`
- `/admin/institutes`
- `/admin/people`
- `/admin/exams`
- `/admin/exams/advanced`
- `/admin/reports`
- `/admin/security`
- `/admin/settings`

Progress so far:

- completed and browser-rechecked:
  - `/admin/economy`
  - `/admin/institutes`
  - `/admin/people`
  - `/admin/academic-setup`
  - `/admin/exams`
  - `/admin/reports`
  - `/admin/settings`
- concrete visual fixes already landed during this pass:
  - topbar identity chip compression fix on dense admin routes
  - institute onboarding-history rail height rebalance
  - people control-panel desktop rebalance so institute scope and create/import actions stop collapsing into a left-heavy band
  - academic-setup section-rail desktop cleanup so the full section model stays on one horizontal control strip instead of wrapping awkwardly
  - exam filter-panel cleanup and duplicate filter-summary removal
  - settings lower-grid rebalance so policy and footprint panels share one intentional desktop band
  - reports KPI/filter-band rebalance so the fifth KPI and filter actions stop reading as orphaned desktop elements
- still pending:
  - `/admin/dashboard`
  - `/admin/search`
  - `/admin/security`
  - exam subroutes where dense edit-state visuals matter: `new`, `detail`, `builder`, `preset-packs`, `advanced`

Signoff condition:

- no major desktop admin page remains unreviewed for visible operator friction

### A95-04 Low-Support Admin Explanation And Recovery Hardening

Status: `Open`

Problem:

- the remaining admin risk is no longer “does it work?”
- it is increasingly “will a first-time admin understand what is blocked, filtered, missing, or scoped?”

Acceptance criteria:

- the densest admin pages clearly distinguish:
  - filtered empty
  - true no data
  - blocked due to missing scope
  - blocked due to missing entitlement
  - partially configured but recoverable
- each dense control page has at least one browser proof for recovery wording

Priority surfaces:

- admin economy
- admin institutes
- admin academic setup
- admin exams
- admin people

Signoff condition:

- first-time admin recovery no longer depends heavily on team translation

### A95-05 Admin Long-Tail Scenario Matrix

Status: `Open`

Problem:

- current admin proof is strong in the mainline workflows, but thinner in rarer real-world combinations

Acceptance criteria:

- at least one long-tail grouped pack covers:
  - dataset-empty versus scope-filtered empty states
  - partial seeded subject/program availability
  - mixed institute differences
  - reversible policy or account states
  - cross-route deep links with current URL contracts

Suggested spec areas:

- `tests/e2e/workflow/admin-cross-browser-deep-routes.spec.ts`
- `tests/e2e/workflow/admin-economy-browser-coverage.spec.ts`
- `tests/e2e/workflow/admin-reports-browser-coverage.spec.ts`
- `tests/e2e/workflow/admin-security-browser-coverage.spec.ts`
- `tests/e2e/workflow/admin-settings-browser-coverage.spec.ts`
- `tests/e2e/workflow/admin-institutes-mutable.spec.ts`
- `tests/e2e/workflow/admin-roster-mutable.spec.ts`

Signoff condition:

- confidence is supported by breadth, not only by the top happy paths

### A95-06 Final Grouped Admin Signoff

Status: `Open`

Problem:

- admin should not be promoted to `9.5/10` from scattered green evidence alone

Acceptance criteria:

- one grouped admin signoff pack is defined and rerun cleanly
- the pack includes:
  - workspace routes
  - at least one dense mutable economy lane
  - seeded exam create/assign/runtime proof
  - one onboarding or institutes recovery lane
  - one people/roster mutable lane
  - one security/settings page sanity lane
- `npm run build` passes after the grouped signoff

Suggested grouped signoff pack:

- `tests/e2e/workflow/admin-dashboard-workspace.spec.ts`
- `tests/e2e/workflow/admin-institutes-workspace.spec.ts`
- `tests/e2e/workflow/admin-people-workspace.spec.ts`
- `tests/e2e/workflow/admin-economy-browser-coverage.spec.ts`
- `tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts`
- `tests/e2e/workflow/admin-exam-creation-advanced-student-attempt.mutable.spec.ts`
- `tests/e2e/workflow/admin-mixed-institute-onboarding.mutable.spec.ts`
- `tests/e2e/workflow/admin-roster-mutable.spec.ts`
- `tests/e2e/workflow/admin-security-workspace.spec.ts`
- `tests/e2e/workflow/admin-settings-workspace.spec.ts`

Signoff condition:

- the final admin confidence statement can be backed by one intentional grouped proof pack

---

## Practical Definition Of 9.5

Admin can be called `9.5/10` when:

- major admin pages are all mapped and reviewed
- seeded admin mutable exam proof stays grouped and green
- dense admin operator recovery is browser-proven on the highest-risk surfaces
- visual review no longer reveals meaningful untracked friction bugs
- the remaining admin residual is mostly business rollout breadth, not uncertainty about the module itself
