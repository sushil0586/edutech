# P1 Hardening Execution Board

Last updated: 2026-07-05

## Purpose

This board converts the current hardening matrix into a practical P1 execution list.

Use it after P0 safety and operator-truthfulness work is already stable.

This board is for work that is:

- not blocking controlled pilot use
- important for broader rollout confidence
- mostly about depth, consistency, and operator polish rather than first-pass functionality

Related documents:

- [PLATFORM_HARDENING_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLATFORM_HARDENING_MATRIX.md)
- [INSTITUTE_BUG_AND_UX_TRACKER.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/INSTITUTE_BUG_AND_UX_TRACKER.md)
- [P0_HARDENING_EXECUTION_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/P0_HARDENING_EXECUTION_CHECKLIST.md)

---

## Current P1 Goal

Make the platform easier to operate at broader pilot scale by improving:

- results and reviews realism
- teacher and institute role consistency
- dense admin/operator screens
- remaining zero-state and action-quality polish
- deeper browser confidence in mutable but realistic flows

Current smaller-screen read:

- student mobile-web baseline already exists
- the remaining responsive gap is concentrated in dense admin, institute, and teacher operator screens rather than the student web shell

---

## Status Legend

- `Open`: not started
- `In Progress`: currently being worked on
- `Ready for QA`: implementation done, focused verification pending
- `Done`: verified and accepted
- `Blocked`: waiting on data, environment, or dependency repair

---

## Board Summary

| ID | Area | Title | Severity | Status | Owner |
| --- | --- | --- | --- | --- | --- |
| P1-01 | Results | Deepen institute and teacher results/review realism | High | Done | Codex |
| P1-02 | Role Consistency | Build teacher vs institute operational parity matrix | High | Done | Codex |
| P1-03 | Economy | Reduce first-time operator density in package and access workflows | Medium | Done | Codex |
| P1-04 | Exams | Improve lifecycle readability and active-control explanation | Medium | Ready for QA | Codex |
| P1-05 | Zero States | Normalize no-data, filtered-empty, and recovery guidance across modules | Medium | Ready for QA | Codex |
| P1-06 | Onboarding Variations | Expand realistic onboarding/access combination coverage | Medium | Done | Codex |
| P1-07 | Mutable Coverage | Broaden browser-proven package/access lifecycle coverage | Medium | Ready for QA | Codex |

## Next execution queue

This is the recommended order for the next active hardening passes:

1. Multi-learner publication and leaderboard distribution depth
2. Institute-side descriptive scoring mutation
3. Advanced economy catalog/policy mutation combinations
4. Small-screen sanity for dense operator shells

---

## Detailed Work Items

### P1-01 Results And Reviews Realism

Status: `Done`

Problem:

- Results routes are stable, but deeper operational realism is still limited.
- Review and results flows are not yet proven at the same depth as onboarding and question-bank access.

Progress update:

- Institute results filtered-empty behavior is now separated from true first-time empty state.
- The exams sidebar in results now explains filtered-zero situations and exposes stronger recovery actions.
- Teacher question-bank route loading is now resilient when shared master-library reads are slow.
- Institute reviews workspace now separates:
  - true queue-empty state
  - filtered queue-empty state
  - task-detail empty state caused by narrowed filters
- Review queue recovery now keeps exam scope stable while clearing only the operator filters.
- Focused institute results coverage reran successfully for:
  - overview
  - attempts
  - leaderboard
  - analysis
  - live monitor
- Focused institute reviews coverage reran successfully for:
  - quick triage links
  - status and assignment filtering
  - filtered-empty recovery
  - exam-scoped queue handoff
- Institute-side browser evidence now safely proves:
  - review queue navigation and scoped recovery behavior
  - review-ready route reachability from the institute results shell
  - single-learner publication through leaderboard-ready state
- Assignment/publication browser evidence now also safely proves:
  - `selected_students` assignment persistence across current mutable admin, institute, and teacher creation lanes
  - a single ranked learner appearing on leaderboard-ready publication flows
- Teacher mutable review coverage now browser-proves a disposable descriptive/manual-review lifecycle:
  - create manual-review question
  - attach it to a disposable exam
  - assign a real student
  - submit a descriptive answer that becomes `manual_pending`
  - open the teacher review queue
  - assign the task to the reviewer
  - save marks and review notes
- Focused teacher results coverage also reran successfully for:
  - overview
  - attempts
  - leaderboard
  - analysis
  - live monitor
- Seeded mixed-subject realism contracts now rerun successfully for:
  - platform admin
  - seeded institute admin (`demo-institute-admin`)
  - seeded teacher (`demo-teacher`)
- The institute multi-subject contract no longer depends on the generic `opbms` institute login and now validates against the correct seeded DLI001 workspace.

Primary user impact:

- Operators can reach results and review lanes, and teacher-side manual-review scoring is now browser-proven.
- Institute-side review navigation and review-ready routing are also browser-proven, but institute-side descriptive scoring mutation and multi-role descriptive-review depth still need more realism.
- `selected_students` assignment through to single-ranked leaderboard-ready publication is browser-proven, and the currently exposed builder assignment-mode catalog is now covered, but broader multi-learner distribution depth still needs intentional coverage.

Acceptance criteria:

- Institute and teacher flows clearly distinguish:
  - no attempts yet
  - attempts exist but results are not published
  - published summary exists
  - review-ready detailed results exist
- Results and review routes explain what data is missing and what next action will populate the page.
- Attempts, analysis, leaderboard, and live-monitor lanes remain truthful under filtered and low-data conditions.

Playwright coverage targets:

- institute results summary -> attempts -> leaderboard -> analysis route continuity
- teacher results summary -> attempts -> leaderboard -> analysis route continuity
- published vs unpublished result behavior
- review-related no-data and partially-ready states
- multi-learner publication and leaderboard distribution depth beyond the current single-ranked learner baseline

Suggested spec targets:

- `tests/e2e/workflow/institute-results-workspace.spec.ts`
- `tests/e2e/workflow/institute-results-analysis-workspace.spec.ts`
- `tests/e2e/workflow/institute-results-attempts-workspace.spec.ts`
- `tests/e2e/workflow/institute-results-leaderboard-workspace.spec.ts`
- `tests/e2e/workflow/teacher-results-workspace.spec.ts`
- `tests/e2e/workflow/teacher-results-analysis-workspace.spec.ts`

Signoff condition:

- One populated institute flow and one populated teacher flow complete results navigation without misleading state copy, and at least one institute-side descriptive/manual-review mutation path is browser-proven alongside the existing teacher lane.

---

### P1-02 Teacher Vs Institute Role Consistency

Status: `Done`

Problem:

- Main shells work, but role parity is not fully proven for question bank, exams, and results operations.

Progress update:

- Added a dedicated role-consistency reference:
  - `docs/qa-runbooks/TEACHER_INSTITUTE_ROLE_CONSISTENCY_MATRIX.md`
- Added a focused browser guardrail:
  - `tests/e2e/workflow/teacher-institute-role-consistency.spec.ts`
- Browser-proven shared contract now covers:
  - question-bank landing shell
  - results workspace readiness shell
  - exam-detail core panel contract
- Intentional difference between institute shared-library intake and teacher request-only behavior is now documented explicitly.
- Mutable parity is now partially mapped instead of implied:
  - teacher and institute question-bank mutable coverage now both prove bulk difficulty/status actions
  - teacher and institute question-bank mutable coverage now both prove single-question draft edit flows
  - teacher question-bank mutable coverage is stronger in single-draft authoring
  - exam-detail mutable baseline is aligned across roles
  - institute exam mutable coverage currently includes deeper builder assembly checks
- Teacher and institute review queues now share the same filtered-empty recovery contract:
  - clear explanation that active controls shaped the empty state
  - reset path back to the full queue
  - no fake `#` pagination links for disabled paging controls
- Focused browser rerun now passes for:
  - `teacher-reviews-workspace.spec.ts`
  - `institute-reviews-workspace.spec.ts`
  - `teacher-institute-role-consistency.spec.ts`
- Teacher question-bank now exposes a dedicated request-only explanation card so the licensed shared-library difference is clear in-product instead of living only in docs.
- Focused shared-library parity reruns now pass for:
  - `teacher-question-bank-shared-library-workspace.spec.ts`
  - `institute-question-bank-shared-library-workspace.spec.ts`
  - `teacher-institute-role-consistency.spec.ts`
- Mutable parity reruns with local flags enabled now show:
  - teacher question-bank mutable suite fully passing for draft edit, bulk difficulty/status, bulk tag attach/remove, and bulk topic reassignment when the paired institute-admin credential belongs to the same institute as the teacher credential
  - institute question-bank mutable suite now fully passing for draft edit, bulk difficulty/status, bulk tag attach/remove, and bulk topic reassignment
  - teacher builder-depth mutable suite passing
  - institute exam mutable suite passing after aligning the test with the current required-subject builder rule
- The institute bulk topic reassignment rerun is now green after aligning browser coverage with the live workspace scope contract that requires matching program and subject filters before the `Topic target` dropdown is populated.
- The teacher bulk tag rerun is now deterministic because the suite provisions and cleans up its own disposable teacher tag instead of depending on pre-seeded active tags.
- The teacher bulk topic rerun now uses truthful disposable academic-topic provisioning through the institute-admin role, which makes the lane fully green when the institute credential matches the teacher's institute and still protects against wrong-tenant mutation when credentials are misaligned.
- The institute bulk tag rerun is now deterministic because the suite provisions and cleans up its own disposable institute tag instead of depending on pre-seeded active tags.

Primary user impact:

- Similar workflows can still feel different enough across roles to create support and training friction.

Acceptance criteria:

- Teacher and institute flows use aligned labels and recovery actions where the capability is conceptually the same.
- Capability differences are explicit when they are intentional.
- Shared-library, question-bank, and results flows do not create false expectations across roles.

Playwright coverage targets:

- teacher vs institute question-bank route parity
- teacher vs institute linked/shared-library visibility parity
- teacher vs institute results-route parity
- teacher vs institute exam-detail and builder handoff parity
- teacher vs institute mutable authoring parity map

Suggested spec targets:

- `tests/e2e/workflow/teacher-question-bank-shared-library-workspace.spec.ts`
- `tests/e2e/workflow/institute-question-bank-shared-library-workspace.spec.ts`
- `tests/e2e/workflow/teacher-results-workspace.spec.ts`
- `tests/e2e/workflow/institute-results-workspace.spec.ts`
- `tests/e2e/workflow/teacher-exam-detail-workspace.spec.ts`
- `tests/e2e/workflow/institute-exam-detail-workspace.spec.ts`
- `tests/e2e/workflow/teacher-question-mutable.spec.ts`
- `tests/e2e/workflow/institute-question-bank-bulk-mutable.spec.ts`
- `tests/e2e/workflow/teacher-exam-detail-mutable.spec.ts`
- `tests/e2e/workflow/institute-exam-mutable.spec.ts`

Signoff condition:

- A role-consistency browser matrix exists, identifies only intentional differences, and explicitly lists the remaining mutable-depth gaps by role after teacher bulk parity is browser-proven.

---

### P1-03 Economy Operator Density Reduction

Status: `Done`

Problem:

- Economy is now far clearer, but still dense for first-time staff.

Progress update:

- Added a plain-language operator glossary to the package visibility lane.
- Added diagnosis cards that separate:
  - package coverage gaps
  - institute access gaps
  - shared-library switch gaps
  - linked-question visibility gaps
- Improved feature recovery wording so revoked shared-library controls use operator-facing language instead of internal product wording.
- Browser coverage now asserts the glossary and diagnosis contract in:
  - `tests/e2e/workflow/admin-economy-browser-coverage.spec.ts`
  - `tests/e2e/workflow/admin-question-bank-package-visibility.spec.ts`
- Earlier P0 clarity work is now integrated into the operator baseline rather than living as isolated fixes:
  - compact access-chain explanation
  - governing-versus-historical row separation
  - stronger restore and recovery wording
  - live dependency and scope-change previews in the package editor
- Mutable browser evidence now also proves:
  - controlled star-grant success with wallet growth
  - entitlement pause/reactivate lifecycle changes
  - entitlement notes and date-window edits
  - institute-admin grant/confirm disable behavior when platform policy turns those actions off
- The current browser evidence now supports closing first-time-operator baseline hardening for the highest-risk economy lanes.

Primary user impact:

- First-time operators now have browser-proven guidance in the highest-risk economy lanes.
- Key support-ops and policy-disable baselines are also browser-proven, but denser catalog mutations and broader policy combinations still remain heavier than the rest of the product.

Acceptance criteria:

- High-density lanes expose:
  - what this section controls
  - what not to change casually
  - what to do next
- Package editor, visibility, and lifecycle sections stay understandable without product training.

Playwright coverage targets:

- package editor guidance presence
- package visibility diagnosis presence
- revoked/paused/history recovery affordances
- support-ops action guidance

Suggested spec targets:

- `tests/e2e/workflow/admin-economy-browser-coverage.spec.ts`
- `tests/e2e/workflow/admin-question-bank-package-editor.spec.ts`
- `tests/e2e/workflow/admin-question-bank-package-visibility.spec.ts`

Signoff condition:

- First-time operator guidance is visible in the highest-risk economy lanes and browser-proven.

---

### P1-04 Institute Exams Lifecycle Readability

Status: `Ready for QA`

Problem:

- Exams workspace is stable, but lifecycle meaning is still denser than it should be for non-technical staff.

Progress update:

- The exams page now separates:
  - workspace total
  - visible on this page
  - active controls affecting the current list
- Active-control impact is now surfaced in a dedicated operator panel instead of only through pills.
- Exam cards now explain lifecycle state in plain language with a next-step hint, so staff do not need to infer what `draft`, `scheduled`, `live`, or `completed` should mean operationally.
- Browser coverage was rerun successfully for:
  - `tests/e2e/workflow/institute-exams-workspace.spec.ts`
  - `tests/e2e/workflow/institute-exams-filter-pagination.spec.ts`
- Generic non-family exam creation breadth is now also browser-proven through mutable matrix lanes for:
  - guided wizard `practice`, `quiz`, and `mock_exam` creation
  - advanced-builder `practice`, `quiz`, and `mock_exam` creation
  - assignment persistence and student visibility on the created exams
- Preset-pack to builder handoff is now also browser-proven through family preset lanes for admin and institute flows.
- Family preset-derived create/save persistence is browser-proven through:
  - `tests/e2e/workflow/admin-family-preset-persistence.mutable.spec.ts`
  - `tests/e2e/workflow/institute-family-preset-persistence.mutable.spec.ts`
- Managed preset-library create/save persistence is now browser-proven through:
  - `tests/e2e/workflow/admin-preset-library-persistence.mutable.spec.ts`
  - `tests/e2e/workflow/institute-preset-library-persistence.mutable.spec.ts`
- Assignment-mode enumeration across the currently exposed builder catalog is now browser-proven through:
  - `tests/e2e/workflow/admin-exam-assignment-mode-matrix.mutable.spec.ts`
  - `tests/e2e/workflow/institute-exam-assignment-mode-matrix.mutable.spec.ts`
- `entitlement_only` access-policy persistence is browser-proven in mutable admin and institute exam-detail actions.

Primary user impact:

- Users may understand filtering and core exam configuration, but still not instantly understand why an exam is draft, published, scheduled, grouped, or not visible, and broader stars/security combinations still need deeper coverage.

Acceptance criteria:

- Lifecycle state wording is easy to scan.
- Active controls are clearly separated from exam state itself.
- Recovery actions after no-result filtering stay obvious.

Playwright coverage targets:

- filtered no-result state
- page overflow state
- reset/clear controls
- lifecycle copy visibility on populated lists

Suggested spec targets:

- `tests/e2e/workflow/institute-exams-workspace.spec.ts`
- `tests/e2e/workflow/institute-exams-filter-pagination.spec.ts`

Signoff condition:

- A non-technical operator can explain why a row is missing because of controls vs because of its exam state.

---

### P1-05 Zero-State And Recovery Consistency

Status: `Ready for QA`

Problem:

- Some routes already have strong zero-state guidance, but quality is not fully uniform across modules.

Progress update:

- Institute question-bank empty states now explain when the list is empty because of active filters rather than missing content.
- Question-bank filtered empty states now expose a stronger reset path in the normal institute view, not only in linked-review mode.
- Institute results filtered-empty states now include a clearer “why this happened” explanation and explicitly state that list controls do not edit or delete exam data.
- Browser coverage was rerun successfully for:
  - `tests/e2e/workflow/institute-question-bank-workspace.spec.ts`
  - `tests/e2e/workflow/institute-results-workspace.spec.ts`

Primary user impact:

- Users can still encounter different levels of clarity across exams, question-bank, and results pages.

Acceptance criteria:

- Empty states always answer:
  - what happened
  - whether data exists elsewhere
  - what the operator should do next
- Filtered-empty states do not reuse onboarding or first-time empty language.
- Recovery actions stay visible and relevant.

Playwright coverage targets:

- question-bank empty or filtered-empty
- exams empty or filtered-empty
- results low-data or empty states

Suggested spec targets:

- `tests/e2e/workflow/institute-exams-workspace.spec.ts`
- `tests/e2e/workflow/institute-question-bank-workspace.spec.ts`
- `tests/e2e/workflow/institute-results-workspace.spec.ts`

Signoff condition:

- Zero-state language quality is consistent enough that users do not confuse “no data exists” with “current filters hide it.”

---

### P1-06 Onboarding Variation Expansion

Status: `Done`

Problem:

- Core onboarding combinations are now browser-proven for the supported single-institute operator scope, but broader rollout depth still exists outside this completed item.

Progress update:

- Mutable onboarding browser coverage now proves:
  - full preset onboarding
  - selected-subject onboarding
  - selected-topic-group onboarding
  - Class 8 preset onboarding
  - package plus advanced-builder onboarding
  - existing institute reapply without academic duplication
  - incomplete access setup warning path with truthful validation failure
- The onboarding summary contract is asserted after successful apply flows.
- The blocked-preview path is now asserted when package access is enabled without selecting a package.
- Focused browser reruns now support closing this item as done for the current single-institute operator scope.

Primary user impact:

- Broader rollout increases the chance of finding variation-specific gaps late.

Acceptance criteria:

- Browser coverage exists for:
  - preset only
  - preset + package access
  - preset + package access + advanced builder access
  - existing institute re-apply/update path
  - mixed institute setups across subject families

Suggested spec targets:

- `tests/e2e/workflow/admin-onboarding-types.mutable.spec.ts`
- `tests/e2e/workflow/admin-mixed-institute-onboarding.mutable.spec.ts`
- `tests/e2e/workflow/admin-institute-consolidated-regression.mutable.spec.ts`

Signoff condition:

- Multiple onboarding combinations are proven without DB handholding for the supported single-institute operator scope.

---

### P1-07 Mutable Package/Access Lifecycle Coverage

Status: `Ready for QA`

Problem:

- Baseline browser safety is strong, but some mutable package/access operations still depend on narrower reruns.

Progress update:

- Mutable admin economy browser coverage is now aligned with the live operator contract:
  - updated visibility-lane heading matchers
  - updated institute-access filter labels
  - updated entitlement lifecycle action labels
  - updated package-save validation expectations for disabled invalid states
- Focused browser rerun now passes for:
  - platform economy support policy updates
  - institute entitlement lifecycle window updates
  - question-bank package create/update flows
  - linked subscription plan apply flows
  - lifecycle dates and notes updates on active entitlements
  - revoked-history versus governing-row recovery
- Focused mutable rerun result:
  - `tests/e2e/workflow/admin-economy-mutable.spec.ts`
  - targeted package/access lifecycle bundle: `6 passed`

Primary user impact:

- Core behavior works, but regression confidence for editing, pausing, restoring, and widening scope should be higher before broader rollout.

Acceptance criteria:

- Browser coverage proves:
  - package widening
  - entitlement pause/reactivate
  - feature-switch pause/reactivate
  - lifecycle note/date updates
  - active-vs-historical row recovery

Suggested spec targets:

- `tests/e2e/workflow/admin-economy-mutable.spec.ts`
- `tests/e2e/workflow/admin-package-scope-expansion-institute-linker.mutable.spec.ts`
- `tests/e2e/workflow/admin-question-bank-opbms-scope.mutable.spec.ts`

Signoff condition:

- Mutable package/access lifecycle confidence is no longer dependent on just one or two focused reruns.

---

## Recommended Execution Order

1. `P1-01` Results and reviews realism
2. `P1-02` Teacher vs institute role consistency
3. `P1-04` Institute exams lifecycle readability
4. `P1-05` Zero-state and recovery consistency
5. `P1-03` Economy operator density reduction
6. `P1-06` Onboarding variation expansion
7. `P1-07` Mutable package/access lifecycle coverage

---

## Definition Of Done For This P1 Phase

This phase should be considered complete only when:

- results and review routes are browser-proven in more realistic states
- teacher and institute parity is explicitly verified
- zero-state and filtered-empty guidance is consistent across the main institute modules
- the densest economy/operator lanes remain understandable without backend inspection
- onboarding and package/access variation coverage is broader than the current focused contract set

---

## Current Recommendation

Start with:

`P1-01 Results and reviews realism`

Reason:

- package/access/question-bank clarity is now materially improved
- the next most valuable confidence gain is deeper operational truthfulness in results/review lanes
- this also gives cleaner input for the teacher/institute parity pass that follows
