# Institute Bug And UX Tracker

Last updated: 2026-07-05

This tracker captures the current institute-side findings from real browser-based testing with OPBMS, newly onboarded institutes, and populated local data.

## Status Summary

- Core institute runtime is working:
  - institute login
  - UI-only institute onboarding with master defaults
  - student creation through UI import
  - exam creation
  - student assignment
  - exam publish
  - student exam visibility
  - result publication
- Consolidated browser regression now proves admin-to-institute-to-student flow end to end.
- Admin Economy browser coverage for overview, catalog, access control, question-bank visibility, support ops, and bootstrap lanes passed after the latest UI improvements.
- Admin Economy visibility and package-editor clarity received a second hardening pass:
  - revoked rows now present a stronger restore path
  - historical rows now provide explicit “show current governing rows” recovery
  - package edit mode now previews live dependency impact and coverage-change risk before save
  - mutable package-scope widening and OPBMS science entitlement restoration were rerun and passed against the live UI contract
- Admin Economy question-bank visibility now includes a clearer top-of-lane operator diagnosis:
  - what is being reviewed right now
  - what the current gap is
  - what the next action should be
  - this is now browser-proven in the economy coverage suite
- Institute question-bank browser coverage for linked questions, shared-library handoff, science linked-scope filtering, detail routes, and bulk-action guards/mutations is stable in the current local environment.
- Institute linked-question access guidance now exposes an explicit 3-step operator diagnosis:
  - intake switch status
  - package coverage status
  - linked questions already inside the institute bank
- Linked-question browser coverage now verifies the new “what to do next” summary and step-by-step explanation against the live page contract.
- Institute exams filtered-empty and pagination-overflow recovery states were improved and browser-tested against populated data.
- Institute results filtered-empty recovery now distinguishes:
  - true workspace empty state
  - filtered exam-list zero-result state inside the populated results workspace
  - visible recovery actions to clear filters or move to the exams workspace
- Institute reviews filtered-empty recovery now distinguishes:
  - true queue-empty state
  - filtered queue-empty state
  - detail-panel empty state caused by narrowed queue controls
  - recovery actions that clear filters without unexpectedly dropping exam scope
- Teacher question-bank route now degrades safely when shared master-library reads are slow:
  - the local teacher question bank still opens
  - shared-library load issues surface as a contained panel error instead of blocking the whole route
- Latest broader institute browser rerun passed on covered workspace routes:
  - dashboard/exams/question-bank/results/reviews-linked flows
  - exams filter + pagination workspace
  - exam detail + builder workspace
  - linked/shared-library/detail question-bank routes
  - results summary/live/analysis/attempts/leaderboard routes
- Latest broad populated browser regression after the latest clarity pass:
  - `12 passed`
  - admin economy browser coverage
  - institute end-user smoke
  - institute linked science question-bank flow
  - institute exams workspace
  - institute exams filter + pagination flow
  - institute results workspace
- No new critical or high-severity browser regressions were observed in that latest broad rerun.
- Latest institute mutable rerun status:
  - `3 passed`
  - `1 skipped`
  - the remaining skip is data-shape dependent and only occurs when the special blocked-but-matchable shared-library seed row is absent
- Latest mutable package/economy rerun status:
  - `2 passed`
  - package-scope widening from Math to Science is browser-proven
  - OPBMS science entitlement restoration is browser-proven
- Latest focused institute results rerun after the filtered-empty-state hardening:
  - `5 passed`
  - institute results workspace
  - institute results attempts workspace
  - institute results leaderboard workspace
  - institute results analysis workspace
  - institute results live-monitor workspace
- Latest focused teacher results rerun after the teacher question-bank route hardening:
  - `5 passed`
  - teacher results workspace
  - teacher results attempts workspace
  - teacher results leaderboard workspace
  - teacher results analysis workspace
  - teacher results live-monitor workspace
- Latest focused institute reviews rerun after the filtered-empty-state hardening:
  - `1 passed`
  - institute reviews workspace
  - quick triage, scoped queue handoff, filtered-empty recovery, and pagination controls stayed stable
- Main remaining risk is now operator-language clarity, zero-state consistency, and deterministic shared-library mutation coverage rather than package-edit runtime instability.

## Critical

None currently confirmed in the latest populated institute runs.

## High

None currently confirmed in the latest mutable package-scope reruns.

## Medium

### 2. Package scope editing is better, but still not effortless for first-time operators

- Page: `Platform Admin > Economy > Catalog / Question-Bank package editor`
- Category: `UX`
- Severity: `Medium`
- Observed behavior:
  - Operators now get live dependency impact and coverage-change previews, but the editor still asks them to understand package type, scope rows, source type, subject/topic scope, and entitlement state together.
- Current verification:
  - package-scope widening from Math to Science was rerun and passed
  - OPBMS science entitlement recovery was rerun and passed
- End-user impact:
  - The package editor is safer now, but still denser than a low-training operations screen.
- Expected behavior:
  - Editing a package should make academic scope obvious at a glance and easy to expand safely.
- Implementation priority: `P1`

### 3. Package coverage vs usable linked questions is still conceptually heavy

- Pages:
  - `Platform Admin > Economy`
  - `Institute > Question Bank`
- Category: `UX / Data`
- Severity: `Medium`
- Observed behavior:
  - Users still naturally think in terms of “questions copied to institute” while the system actually exposes “questions available through scoped linked access”.
  - Correct totals can look wrong unless the user understands coverage, entitlement, and linked availability separately.
- Current status:
  - Improved on institute question-bank pages.
  - The institute workspace now explains the access chain and next action in plain operator steps.
  - Remaining confusion risk is now higher on the platform-admin economy/package side than on the institute-linked page itself.
- End-user impact:
  - Support questions increase even when the system is technically correct.
- Expected behavior:
  - UI should keep separating:
    - package coverage
    - institute entitlement
    - active linked availability
    - local institute-owned questions
- Implementation priority: `P0`

### 4. Licensed-access terminology remains too business-technical for school and coaching operators

- Page: `Platform Admin > Economy`
- Category: `UX / Product language`
- Severity: `Medium`
- Terms causing confusion:
  - package
  - coverage row
  - entitlement
  - feature grant
  - linked access
  - usage units
  - public/master content
- Current status:
  - Improved in both institute and admin question-bank visibility surfaces.
  - Remaining risk is now density and concept load, not complete lack of explanation.
- End-user impact:
  - Operators can complete setup steps without fully understanding why a subject becomes visible or stays hidden.
- Expected behavior:
  - The UI should explain the access chain in operator language:
    - content exists in platform master library
    - package defines which academic slices are sellable
    - entitlement gives an institute access
    - runtime feature access unlocks usage
- Implementation priority: `P1`

### 5. Exams filtered empty state was fixed, but still needs regression protection

- Page: `Institute > Exams`
- Category: `UX / Filter / Automation`
- Severity: `Medium`
- Current status:
  - Core copy and recovery actions were improved and browser-tested.
- Remaining risk:
  - This state is easy to regress when copy, filters, or pagination behavior changes.
- Expected behavior:
  - The page should always distinguish:
    - true empty state
    - filtered empty state
    - pagination overflow state
  - Recovery actions should stay obvious and aligned with current operator language.
- Implementation priority: `P0`

### 6. Exams active-control visibility is better, but still needs continued polish

- Page: `Institute > Exams`
- Category: `UX`
- Severity: `Medium`
- Observed behavior:
  - Teacher, status, sorting, grouping, and page size are now recoverable, but the full set of active controls is still a lot for a non-technical operator to parse quickly.
- Latest progress:
  - the exams page now exposes a dedicated “active list controls are changing what you see” panel
  - visible-on-page count is now separated from workspace total
  - exam cards now explain lifecycle state and next-step guidance in operator language
- End-user impact:
  - Staff may still need a second look before understanding why the exam list changed.
- Expected behavior:
  - The active-control summary should stay visually obvious and easy to interpret at a glance.
- Implementation priority: `P1`

### 7. Zero-state institute pages are now better, but action quality should stay consistent

- Pages:
  - `Institute > Exams`
  - `Institute > Results`
  - `Institute > Question Bank`
- Category: `UX`
- Severity: `Medium`
- Current status:
  - Improved compared with earlier runs.
  - Results filtered-empty state now uses recovery-first copy instead of falling back to a dead-end empty line.
  - Question-bank filtered-empty state now explains that active controls shaped the empty list and exposes a direct reset path in the standard institute view.
- Remaining risk:
  - Some zero states are more action-oriented than others, which can make guidance feel inconsistent across modules.
- Expected behavior:
  - Empty states should always answer:
    - what happened
    - whether data exists
    - what to do next
- Implementation priority: `P1`

### 10. Package save failures are still not operator-friendly enough

- Page: `Platform Admin > Economy > Catalog / Question-Bank package editor`
- Category: `Validation / UX`
- Severity: `Medium`
- Observed behavior:
  - Save failures are improved, but still partly depend on backend message quality.
  - A deeply invalid payload could still return a message that feels too technical for a school/coaching-facing operator.
- End-user impact:
  - Operators lose confidence and may retry blindly.
- Expected behavior:
  - Validation feedback should identify the bad field or invalid scope combination directly on the editor.
- Implementation priority: `P1`

## Low

### 11. Question-bank totals are correct but still easy to misinterpret

- Pages:
  - `Platform Admin > Economy`
  - `Institute > Question Bank`
- Category: `UX / Data`
- Severity: `Low`
- Observed behavior:
  - Users often expect “copied questions” while the product is actually exposing “linked access by scoped entitlement”.
  - Correct totals can still feel suspicious if the user does not understand the linking model.
- End-user impact:
  - Product behavior looks wrong even when runtime is technically correct.
- Expected behavior:
  - The UI should separate:
    - package coverage
    - linked master access
    - local institute-owned questions
    - visible total per active scope

### 12. Institute question-bank flow is operationally stable but still concept-heavy

- Page: `Institute > Question Bank`
- Category: `UX`
- Severity: `Low`
- Observed behavior:
  - The local-vs-linked distinction is technically working, but a non-technical operator still needs to understand:
    - local authoring inventory
    - linked licensed inventory
    - package scope
    - why linked totals can differ by program/subject filters
- End-user impact:
  - Users may still ask “why do I see these questions here but not there?” even when the system is behaving correctly.
- Expected behavior:
  - The question-bank workspace should keep moving toward a simpler explanation model:
    - what belongs to the institute
    - what is licensed from platform scope
    - what can currently be used in exams

### 13. Some institute question-bank browser coverage remains environment-dependent

- Page: `Institute > Question Bank`
- Category: `Automation / Data`
- Severity: `Low`
- Observed behavior:
  - Bulk mutable and detail-route coverage is healthy, but some shared-library mutation scenarios still skip or time out when disposable seed conditions or backend responsiveness are not ideal.
- End-user impact:
  - No direct product issue, but automation confidence is slightly data-shape dependent in a few lanes.
- Expected behavior:
  - Disposable question fixtures should become even more deterministic so browser mutation coverage always executes.

### 14. Some Playwright coverage was stale against current UI contracts

- Category: `Automation`
- Severity: `Low`
- Observed behavior:
  - Student exam CTA changed from type-specific labels like `Start practice set` to a common `Start` action.
- Current status:
  - Fixed in automation.
- Note:
  - This was not a product bug.

## Not A Bug / Expected Behavior

### 1. Master/public content existing does not automatically give institute access

- The institute only sees licensed shared-library content when all of the following are true:
  - questions exist in master/public content
  - package scope includes the relevant academic slice
  - institute has an active entitlement to that package
  - required shared-library runtime feature access is active

### 2. OPBMS originally showing only Math was expected from current scope

- Root cause:
  - `Scholar Question Bank Access` only covered Math initially.
- Result:
  - Science content existed, but OPBMS could not see it until Science was added to package scope.

### 3. Linked question access is not the same thing as question duplication

- Root model:
  - `auto_link_selected_scope` grants access by linking primary content through scope and entitlement rules.
- Result:
  - Institutes can use linked questions in exam creation without duplicating master question rows into local ownership.

## Current Fix Order

### P0

1. Complete economy-side entitlement diagnostics and recovery guidance.
2. Make revoked/paused/feature-missing states visually explicit and operator-safe.
3. Revalidate mutable package edit/save paths with browser coverage.
   - Status: done in the latest mutable reruns.
4. Keep package coverage, entitlement truth, and linked availability visibly separated.
5. Protect institute exams empty/filter/pagination states with ongoing browser regression coverage.

### P1

1. Simplify package scope editing and make academic coverage clearer.
2. Improve package coverage summaries for subject/topic visibility.
3. Add stronger operator guidance for why an institute cannot see licensed content.
4. Improve package editor validation and save-failure messaging.
5. Keep module empty states and action guidance consistent across institute pages.
6. Continue reducing operator-facing terminology complexity for school and coaching-center users.

### P2

1. Continue institute page-by-page browser automation expansion.
2. Refine long-form economy copy and visual hierarchy.
3. Add more guided cross-links between package, entitlement, and institute views.
4. Continue reducing operator jargon in advanced economy lanes now that core runtime and browser coverage are stable.
