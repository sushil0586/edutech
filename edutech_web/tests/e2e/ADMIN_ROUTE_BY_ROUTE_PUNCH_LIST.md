# Admin Route-by-Route Punch List

## Purpose

This is the actionable follow-up to the admin confidence matrix.

It is meant to answer:

- what is already strong on each admin route
- what is still weak or incomplete
- what the next engineering move should be
- which items are test-only work vs product-gap work

## Status labels

- `Strong`: good baseline confidence for current shipped behavior
- `Needs depth`: core route is covered, but deeper path or edge validation is still thin
- `Blocked by product`: automation is waiting on real product controls or backend support
- `Low urgency`: route is already strong enough unless that area is under active development

## Punch list summary

| Route | Status | Priority | Main gap |
| --- | --- | --- | --- |
| `/admin` | Strong | Low | repeated-run stability only |
| `/admin/dashboard` | Strong | Low | none beyond regression repetition |
| `/admin/search` | Needs depth | Medium | broader dataset/result variation |
| `/admin/settings` | Strong | Low | mostly informational only |
| `/admin/institutes` | Needs depth | High | institute-admin account edge cases |
| `/admin/reports` | Blocked by product | Medium | no real export/download CTA |
| `/admin/security` | Needs depth | Medium | deeper live alert/watch state variation |
| `/admin/economy` | Needs depth | High | real reversible mutation lane is shallow |
| `/admin/exams` | Strong | Low | extra multi-institute breadth only |
| `/admin/exams/new` | Needs depth | Medium | final creation is not baseline-asserted |
| `/admin/exams/advanced` | Needs depth | Medium | more family/preset combinations |
| `/admin/exams/preset-packs` | Strong | Low | larger inventory behavior |
| `/admin/exams/:id` | Strong | Low | more lifecycle-state combinations |
| `/admin/exams/:id/builder` | Strong | Low | more unusual section/question mixes |
| `/admin/academic-setup` | Strong | Low | more negative-path validation |
| `/admin/people` | Needs depth | High | validation and mixed login-state cases |

---

## `/admin`

### Current strength

- Filters and quick chips are covered.
- Key handoffs into institutes, people, reports, and academic setup are covered.

### Remaining gaps

- No repeated-run stability proof.
- No explicit coverage for unusual empty or overloaded dashboard data states.

### Next action

- Test task:
  - include this route in repeated admin smoke loops
- Optional product hardening:
  - add stable empty-state copy if dashboard data can be sparse

### Priority

- `Low`

---

## `/admin/dashboard`

### Current strength

- Alias redirect to `/admin` is covered.

### Remaining gaps

- None meaningful for current scope.

### Next action

- No dedicated work needed unless route behavior changes.

### Priority

- `Low`

---

## `/admin/search`

### Current strength

- Search query persistence is covered.
- Source/sort/group/apply/reset are covered.
- Result handoff and back-to-workspace handoff are covered.
- Zero-result empty-state behavior is covered.
- Grouped source layout is covered with both live-record and workspace-page result buckets.
- Search coverage now asserts both a live exam result and a catalog exam shortcut for the same admin query.
- Search coverage now asserts a live institute result and a live student-or-teacher result from current seeded data.

### Remaining gaps

- Confidence still depends on current seed data variety.
- Broader result-type variety can still improve beyond institute plus one people lane.

### Next action

- Test task:
  - widen grouping assertions across more than one query shape if stable fixture data allows
  - add a second people-lane assertion when both student and teacher seeds are stable
- Product task:
  - none required now

### Priority

- `Medium`

---

## `/admin/settings`

### Current strength

- Informational panels are covered.
- People and academic setup handoffs are covered.

### Remaining gaps

- Page is mostly static and informational.
- No persistence controls exist here, so depth is naturally limited.

### Next action

- No immediate automation work unless settings becomes a true mutation surface.

### Priority

- `Low`

---

## `/admin/institutes`

### Current strength

- Directory search/filtering is covered.
- Selection/detail panel is covered.
- Add/edit entry-point dialogs are covered.
- Add-institute empty-submit validation is covered.
- Edit-institute empty-submit validation is covered.
- Safe reset-password validation is covered when that account control is present.
- Account-control branch consistency is covered for create-login vs reset/enable/disable states.
- Disposable create/edit/delete is covered.
- A mutable full institute account-control lane is now defined on a disposable institute.

### Remaining gaps

- Institute-admin login/account control outcomes are only partially validated.
- State combinations like inactive institute with active login are not deeply exercised.
- Mutable institute account-control confidence depends on running the gated disposable lane.

### Next action

- Test task:
  - run and stabilize the gated disposable institute account-control lane in real-data mode
  - widen state-combination coverage around institute/login status
- Product task:
  - expose clearer feedback messages for account actions if currently ambiguous

### Priority

- `High`

---

## `/admin/reports`

### Current strength

- Filters and quick slices are covered.
- Visibility panels are covered.
- Handoffs to security and economy are covered.

### Remaining gaps

- No real export/download CTA exists to automate.
- No mutation workflow exists here.

### Next action

- Product task:
  - add real export/download controls if reporting export is required
- Test task after product work:
  - automate file download assertion and payload-specific checks

### Priority

- `Medium`

### Notes

- This is a `Blocked by product` route for export-confidence expansion.

---

## `/admin/security`

### Current strength

- Search/filter/page-size/group flows are covered.
- Watch flow and posture panels are covered.
- Dashboard/settings handoffs are covered.
- Filter summary pills are covered for selected live/watch/health combinations.
- Watched-exam state is covered after selecting an exam.
- Grouped attempt-health headings are covered inside the live watchlist panel.
- Grouped attempt-status headings are covered inside the live watchlist panel.
- Reset behavior is covered through summary-pill defaults.

### Remaining gaps

- Limited variation across real alert states and monitored exams.
- No deeper operational action lane beyond safe inspection.

### Next action

- Test task:
  - add richer data-state coverage when alert-rich seeds are available
- Product task:
  - if future security actions are added, create reversible or disposable action lanes

### Priority

- `Medium`

---

## `/admin/economy`

### Current strength

- Page visibility and structure are covered.
- Safe local validation for grant flow is covered.
- Refresh unlocks action is covered.
- A mutable star-grant lane is now defined for wallet-growth verification.

### Remaining gaps

- Real mutation confidence depends on running the gated mutable lane.
- High-risk economy actions are not deeply exercised.

### Next action

- Test task:
  - run and stabilize the gated mutable wallet-growth lane in real-data mode
  - widen economy mutation coverage only if reversible/disposable follow-ups exist

### Priority

- `High`

---

## `/admin/exams`

### Current strength

- Filters, quick chips, zero-match state, and key handoffs are covered.
- Handoffs to detail, builder, setup, preset library, and quick create are covered.
- Reset-state summary pills are covered.
- Real exam-card-driven status/source filtering is covered.
- Real institute-scope filtering is covered through URL, summary-pill, and scoped-result assertions.
- Grouped status layout is covered against a real visible exam card.
- Grouped source layout is covered against a real visible exam card.
- Grouped subject layout is covered when the selected visible exam has a subject.
- Grouped type layout is covered when the selected visible exam has a type.
- Title sort ordering is covered for visible exam cards.

### Remaining gaps

- More breadth is still useful across multiple institute-specific scope combinations.

### Next action

- Test task:
  - add one more institute-scope combination if multi-institute seeded data remains stable

### Priority

- `Low`

---

## `/admin/exams/new`

### Current strength

- Wizard structure and step transitions are covered.
- Scope/source/economy controls are visible and exercised.
- Required-field gating on the first wizard step is covered.

### Remaining gaps

- Final create action is not baseline-persisted here by design.
- Validation/error-path depth on later steps can still improve.

### Next action

- Test task:
  - add non-destructive validation assertions for required fields
- Optional mutable task:
  - create disposable exam through this wizard if dedicated coverage is wanted

### Priority

- `Medium`

---

## `/admin/exams/advanced`

### Current strength

- Stage switching is covered.
- Basics autofill and local composition controls are covered.
- Template save/export/import mutable lane is covered.

### Remaining gaps

- More family-aware combinations could be exercised.
- More preset/application combinations could be validated.
- Managed pack and template interactions under larger datasets are still thinner.

### Next action

- Test task:
  - add one or two family-specific recommendation assertions
  - add broader preset application assertions if stable

### Priority

- `Medium`

---

## `/admin/exams/preset-packs`

### Current strength

- Search and scope filters are covered.
- Back-to-exams and advanced-builder handoffs are covered.
- `Open In Builder` deep link is covered.
- Disposable managed-pack edit/archive lane is covered.

### Remaining gaps

- Larger library inventories and mixed ownership states are not deeply stressed.

### Next action

- Low urgency unless preset pack feature expands.
- If this page gains bulk actions, automate them next.

### Priority

- `Low`

---

## `/admin/exams/:id`

### Current strength

- Baseline delivery controls and handoffs are covered.
- Mutable lifecycle, key-entry, sync, refresh, and policy actions are covered.

### Remaining gaps

- More status permutations can still be tested.
- More backend-state combinations across published/live/completed variants would help.

### Next action

- Test task:
  - add multi-status seeded exam matrix if easy to maintain

### Priority

- `Low`

---

## `/admin/exams/:id/builder`

### Current strength

- Step rail and content modules are covered.
- Question mapping and assignment surfaces are covered.
- Mutable settings/sections/questions flow is covered.

### Remaining gaps

- More strange mixes of sections, marks, and question states can still be explored.
- More negative-path builder validations are possible.

### Next action

- Test task:
  - add a few validation assertions around empty/invalid section or question-link input

### Priority

- `Low`

---

## `/admin/academic-setup`

### Current strength

- Section switching is covered.
- Add dialogs are covered.
- Mutable CRUD exists across core academic entities.

### Remaining gaps

- More dependency-chain validation can be tested.
- More backend validation/error-state assertions would strengthen confidence.

### Next action

- Test task:
  - add negative-path assertions for entity forms
  - add dependency-order validation if stable

### Priority

- `Low`

---

## `/admin/people`

### Current strength

- Student/teacher tabs are covered.
- Scope switching is covered.
- Create/import dialog entry points are covered.
- Create-student and create-teacher empty-submit validation is covered.
- Import dialog guardrails before file selection/preview are covered.
- Row-level account-action consistency is covered for visible roster records.
- Backend-driven invalid preview handling is covered for student and teacher roster imports.
- CSV exports are covered.
- Mutable roster CRUD/login/import flows are covered.

### Remaining gaps

- Broader mixed login states and account lifecycle edge cases can be deepened.
- Broader backend import error combinations could still be strengthened.

### Next action

- Test task:
  - widen account lifecycle edge-case checks beyond first visible rows
  - add broader backend import error-path combinations if stable

### Priority

- `High`

---

## Recommended execution order

### P1: highest-value admin hardening

1. `/admin/people`
2. `/admin/institutes`
3. `/admin/economy`

### P2: medium-value confidence expansion

1. `/admin/search`
2. `/admin/exams`
3. `/admin/exams/new`
4. `/admin/exams/advanced`
5. `/admin/security`

### P3: blocked or low-urgency

1. `/admin/reports`
2. `/admin/settings`
3. `/admin/dashboard`
4. `/admin/exams/preset-packs`
5. `/admin/exams/:id`
6. `/admin/exams/:id/builder`
7. `/admin/academic-setup`

## Best next admin batch

If we continue admin immediately, the best batch is:

1. `/admin/people`
   - wider login-state edge checks across more seeded combinations
   - broader backend import error-path combinations
2. `/admin/institutes`
   - institute-admin account-control outcome checks beyond reset-password validation and branch consistency
   - institute/login state-combination checks
3. `/admin/economy`
   - document exactly what safe real mutation lane is possible
   - automate it only if reversible/disposable

## Related docs

- [ADMIN_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/ADMIN_CONFIDENCE_MATRIX.md)
- [PAGE_ACTION_COVERAGE_MAP.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/PAGE_ACTION_COVERAGE_MAP.md)
- [ROLE_MODULE_COVERAGE_MAP.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/ROLE_MODULE_COVERAGE_MAP.md)
