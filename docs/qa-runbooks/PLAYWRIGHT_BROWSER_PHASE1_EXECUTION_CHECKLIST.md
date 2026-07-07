# Playwright Browser Phase 1 Execution Checklist

Last updated: 2026-07-06

## Purpose

This document converts Phase 1 of the browser `9/10` benchmark into executable work.

Phase 1 focus:

1. admin institutes and people negative-path depth
2. admin economy reversible mutation depth
3. teacher comprehension and deterministic authoring depth
4. institute descriptive scoring mutation continuity

This is not a broad wishlist.

It is the next concrete Playwright hardening board.

Related documents:

- [PLAYWRIGHT_BROWSER_9_BENCHMARK_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_BROWSER_9_BENCHMARK_PLAN.md)
- [PLAYWRIGHT_PHASE1_GRANULAR_TEST_CASES.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_PHASE1_GRANULAR_TEST_CASES.md)
- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)
- [ADMIN_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/ADMIN_CONFIDENCE_MATRIX.md)
- [ADMIN_ROUTE_BY_ROUTE_PUNCH_LIST.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/ADMIN_ROUTE_BY_ROUTE_PUNCH_LIST.md)
- [README.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/README.md)

## Phase 1 Success Definition

Phase 1 is complete when:

- admin institutes has stronger account-state mutation proof
- admin people has stronger negative-path and mixed login-state proof
- admin economy has at least one more dependable reversible mutation lane beyond basic grant visibility
- teacher comprehension has deeper mutation plus validation depth
- institute descriptive scoring has a dedicated mutation lane, not only indirect continuity proof

## Current Implementation Movement

### First pass completed on `2026-07-06`

- [admin-institutes-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-institutes-mutable.spec.ts)
  - now asserts visible account-control state contracts for:
    - no login
    - active login
    - disabled login
- [admin-roster-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-roster-mutable.spec.ts)
  - now asserts visible teacher and student roster row account-state contracts for:
    - no login
    - active login
    - disabled login
  - student mutable lane now also verifies disable and re-enable lifecycle through the admin account-management endpoints
  - now also asserts create-dialog negative validation truth for both teacher and student creation flows
- [teacher-comprehension-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/teacher-comprehension-mutable.spec.ts)
  - now asserts the comprehension editor visual structure before authoring
  - now checks true empty-submit validation for comprehension title and passage text
  - now reopens the saved comprehension detail route to verify persisted title and formatted content after update
  - now updates authored passage and notes content, then proves the new content persists while the old content is no longer shown
- [teacher-question-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/teacher-question-mutable.spec.ts)
  - tag attach/remove coverage now provisions and uses a disposable tag instead of depending on whichever existing tag happens to be present
  - the same lane now verifies the exact attached and removed tag id through the teacher question detail API, not only through visible chips
- [institute-results-descriptive.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/institute-results-descriptive.mutable.spec.ts)
  - now performs institute-side descriptive scoring through the visible review form instead of only the backend submit-review helper
  - now verifies visible score and review-note persistence after revisit
- [admin-roster-import-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-roster-import-mutable.spec.ts)
  - now proves mixed valid and invalid student import preview truth through:
    - explicit valid and invalid counts
    - valid row readiness messaging
    - invalid row issue messaging
    - finalize creating only the valid row
- [admin-economy-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-economy-mutable.spec.ts)
  - already contains stable reversible browser mutation coverage for:
    - platform economy policy update with restore
    - subscription-backed entitlement pause and reactivate
    - entitlement lifecycle note and window mutation with restore
    - revoked-history restore back to current governing access
    - feature entitlement pause and reactivate with restore
- grouped admin workspace rerun on healthy local app server:
  - `admin-dashboard-workspace.spec.ts`
  - `admin-institutes-workspace.spec.ts`
  - `admin-people-workspace.spec.ts`
  - `admin-economy-workspace.spec.ts`
  - `admin-economy-browser-coverage.spec.ts`
  - `admin-settings-workspace.spec.ts`
  - `admin-security-workspace.spec.ts`
  - `admin-reports-workspace.spec.ts`
  - result: `13 passed`
- supporting contract updates now also keep those reruns truthful:
  - admin people coverage chooses a populated institute when available and asserts truthful empty states otherwise
  - admin economy question-bank browser coverage now validates the lighter `catalog` default before entering editor assertions
  - admin security coverage now targets the visible dashboard navigation contract
- lightweight Playwright parse/list validation passed for both updated specs

### Still pending in Phase 1

- no major Phase 1 benchmark gap remains
- Phase 1 can now be treated as functionally complete on local dev
- next useful move is:
  - stage confirmation for the strengthened admin lanes
  - repeated-run stability logging
  - compact-viewport and cross-browser parity work

## Workboard

| Area | Current state | Phase 1 target | Priority |
| --- | --- | --- | --- |
| Admin institutes | good CRUD and some account-control coverage | stronger institute-admin account state and login lifecycle mutation proof | `P1` |
| Admin people | strong baseline plus roster/import mutation and negative-form truth | keep green through reruns and stage confirmation | `P1` |
| Admin economy | broad mutable depth with explicit restore lanes already present | keep as regression-stable benchmark coverage and rerun routinely | `P1` |
| Teacher comprehension | baseline mutable lane exists | deeper validation, persistence, and deterministic assertions | `P1` |
| Institute descriptive scoring | continuity proven indirectly | dedicated institute scoring mutation lane | `P1` |

## Area 1: Admin Institutes

### Existing relevant coverage

- [admin-institutes-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-institutes-workspace.spec.ts)
- [admin-institutes-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-institutes-mutable.spec.ts)
- [admin-institute-consolidated-regression.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-institute-consolidated-regression.mutable.spec.ts)
- [admin-mixed-institute-onboarding.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-mixed-institute-onboarding.mutable.spec.ts)

### What is already strong

- institute directory load and detail selection
- add and edit institute flows
- disposable create and delete
- some account-control branch visibility

### Main remaining gap

- institute-admin login/account-control outcomes are still not deep enough across more than one account state combination

### Exact scenarios to add or deepen

1. disposable institute created without login
   - verify create-login control path
   - verify resulting state labels and available account actions
2. disposable institute with login enabled
   - verify disable action updates visible state
   - verify re-enable or reset-password action changes visible feedback truthfully
3. inactive institute vs active institute account-control differences
   - assert the UI does not present contradictory actions
4. action-feedback truth
   - success toast or success panel copy should match the performed account action

### Preferred implementation shape

- extend [admin-institutes-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-institutes-mutable.spec.ts) if cleanup and disposable handling stay simple
- otherwise create:
  - `admin-institutes-account-control.mutable.spec.ts`

### Completion signal

- one stable disposable account-control lane exists
- at least two account-state transitions are asserted
- cleanup is deterministic

## Area 2: Admin People

### Existing relevant coverage

- [admin-people-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-people-workspace.spec.ts)
- [admin-roster-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-roster-mutable.spec.ts)
- [admin-roster-import-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-roster-import-mutable.spec.ts)
- [institute-roster-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/institute-roster-mutable.spec.ts)

### What is already strong

- people workspace and view switching
- disposable teacher and student create/update/delete
- roster import mutation
- export handoff coverage

### Main remaining gap

- negative validation depth and mixed login-state truth are still thinner than happy-path CRUD depth

### Exact scenarios to add or deepen

1. teacher create validation
   - required fields missing
   - invalid email or duplicate-style backend rejection if product exposes it
2. student create validation
   - required fields missing
   - invalid enrollment or duplicate-style backend rejection if stable
3. mixed login-state truth
   - row with login present shows correct account-control CTA set
   - row without login does not show contradictory controls
4. import validation truth
   - failed import row surfaces the right message and does not silently partial-pass in UI

### Preferred implementation shape

- extend [admin-roster-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-roster-mutable.spec.ts) for teacher/student negative forms
- extend [admin-roster-import-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-roster-import-mutable.spec.ts) for stronger failed-row assertions
- add a focused spec only if mixed login-state branching becomes too dense:
  - `admin-people-account-state.spec.ts`

### Completion signal

- both teacher and student negative creation states are asserted
- one mixed login-state branch per person type is asserted
- import error-state truth is explicitly checked

## Area 3: Admin Economy

### Existing relevant coverage

- [admin-economy-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-economy-workspace.spec.ts)
- [admin-economy-browser-coverage.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-economy-browser-coverage.spec.ts)
- [admin-economy-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-economy-mutable.spec.ts)
- [admin-institute-economy-policy-contract.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-institute-economy-policy-contract.mutable.spec.ts)
- [admin-economy-cross-role-package-propagation.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-economy-cross-role-package-propagation.mutable.spec.ts)
- [admin-institute-subscription-request.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-institute-subscription-request.mutable.spec.ts)

### What is already strong

- lane navigation and structure
- visibility and policy overview
- star grant baseline
- policy-disable contract
- some entitlement mutation and package propagation

### Main remaining gap

- the product now has strong reversible mutation lanes, but the heaviest support and catalog surfaces still need repeated-run confidence rather than first-time functional proof

### Exact scenarios to add or deepen

1. repeated-run stability for existing reversible mutation lanes
   - platform policy update with restore
   - subscription entitlement pause and reactivate
   - revoked-history restore path
   - feature entitlement pause and reactivate
2. mutation outcome truth
   - success messages
   - refreshed summary state
   - no stale row or stale panel state after mutation
3. heavier support-ops combinations
   - grant or adjust support posture while confirming the surrounding panel truth still refreshes correctly

### Preferred implementation shape

- keep using [admin-economy-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-economy-mutable.spec.ts) as the benchmark lane source
- prefer rerun discipline and stage verification before inventing more first-pass mutable cases
- split a narrower benchmark-only spec only if suite runtime or flake isolation becomes necessary

### Completion signal

- existing reversible entitlement and policy lanes stay green across reruns
- no stale panel or row regressions appear after mutations
- stage does not contradict local browser confidence on the same lane family

## Area 4: Teacher Comprehension

### Existing relevant coverage

- [teacher-comprehension-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/teacher-comprehension-mutable.spec.ts)
- [teacher-question-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/teacher-question-mutable.spec.ts)
- [teacher-question-import-export.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/teacher-question-import-export.spec.ts)

### What is already strong

- disposable teacher comprehension authoring exists
- teacher question authoring baseline exists

### Main remaining gap

- comprehension mutation confidence is still not as deep or deterministic as main question-authoring confidence

### Exact scenarios to add or deepen

1. comprehension create with explicit persisted verification
   - title and passage content saved
   - comprehension-linked question count or linked visibility is truthful
2. validation path
   - missing passage text or missing required metadata should fail clearly
3. update path
   - edit disposable comprehension and verify persisted change
4. delete or archive path if product supports it safely
5. deterministic tagging or linked metadata truth
   - avoid relying on unstable seeded tag presence

### Preferred implementation shape

- deepen [teacher-comprehension-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/teacher-comprehension-mutable.spec.ts)
- avoid mixing too much generic question authoring into the same lane unless cleanup remains simple

### Completion signal

- create, validation, and update are all asserted
- persisted state is checked after mutation
- assertions do not depend on fragile incidental seed data

## Area 5: Institute Descriptive Scoring Mutation

### Existing relevant coverage

- [institute-results-descriptive.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/institute-results-descriptive.mutable.spec.ts)
- [institute-results-descriptive-multi-role.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/institute-results-descriptive-multi-role.mutable.spec.ts)
- [teacher-review-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/teacher-review-mutable.spec.ts)

### What is already strong

- institute descriptive review publication continuity exists
- multi-role descriptive continuity exists in the catalog
- teacher review mutation is already a stronger explicit mutation model

### Main remaining gap

- institute-side descriptive scoring still needs one dedicated, explicit mutation lane so confidence is not inferred only from broader continuity coverage

### Exact scenarios to add or deepen

1. open institute descriptive review target
2. assign or edit a descriptive score
3. save score and verify persisted score truth
4. verify updated moderation or publication state
5. verify handoff remains correct after institute-side scoring

### Preferred implementation shape

- if [institute-results-descriptive.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/institute-results-descriptive.mutable.spec.ts) already contains enough setup, deepen it
- otherwise create:
  - `institute-review-scoring.mutable.spec.ts`

### Completion signal

- institute-side descriptive scoring is explicit, not inferred
- persisted scoring state is asserted after save
- cleanup or disposable exam lifecycle remains deterministic

## Execution Order

### Wave 1

1. admin institutes account-control depth
2. admin people negative-path depth

### Wave 2

1. teacher comprehension depth
2. institute descriptive scoring mutation

### Wave 3

1. admin economy reversible core mutation hardening

This order is intentional:

- it lifts the biggest admin benchmark gaps first
- it then fixes the most obvious teacher/institute browser confidence asymmetries
- it leaves the densest economy stabilization work for the end of Phase 1

## Definition Of Done Per Area

Mark an area done only when:

- the targeted spec is green
- cleanup is deterministic
- the assertions prove real user-visible truth, not only API success
- the lane can be rerun on seeded disposable data without manual repair

## After Phase 1

When these five areas are done, update:

- [PLAYWRIGHT_BROWSER_9_BENCHMARK_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_BROWSER_9_BENCHMARK_PLAN.md)
- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)

Expected immediate score movement after a successful Phase 1:

- admin browser surfaces: `8.6 -> 8.8 or 8.9`
- teacher browser surfaces: `8.2 -> 8.5`
- institute browser surfaces: `8.7 -> 8.8 or 8.9`
- mutable destructive workflow confidence: `8.0 -> 8.4 or 8.5`
