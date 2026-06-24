# Exam Creation Test Case Matrix

## Purpose

This matrix converts the exam-creation scenario catalog into automation-ready Playwright cases.

This is still planning-only documentation. It does not imply current coverage.

## Execution Principles

- Prefer disposable real-data mutable lanes.
- Keep one exam per test case unless a case explicitly validates a compare-or-visibility relationship.
- Prefer route-specific specs over one giant omnibus mutable spec.
- Reuse helpers for creation, assignment, publication, student visibility, and cleanup.
- Enumerate runtime catalog options where the backend owns the available values.

## Proposed Spec Layout

- `tests/e2e/workflow/admin-exam-creation-wizard-matrix.mutable.spec.ts`
- `tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts`
- `tests/e2e/workflow/admin-exam-creation-preset-library.mutable.spec.ts`
- `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts`
- `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts`
- `tests/e2e/workflow/institute-exam-creation-preset-library.mutable.spec.ts`

## Shared Helper Work To Build First

- helper to create disposable question when a created exam needs at least one attached item
- helper to create exam shell through guided wizard with configurable fields
- helper to create exam through advanced builder with configurable fields
- helper to open preset library and launch a preset into builder
- helper to assign students by runtime assignment mode
- helper to transition exam to student-visible state
- helper to verify creator workspace visibility
- helper to verify institute workspace visibility
- helper to verify assigned-student detail state
- helper to verify student route visibility
- helper to delete created exams and any created dependencies

## Test Cases

### Platform admin guided wizard

| ID | Case | Core assertions |
| --- | --- | --- |
| `PA-WIZ-001` | create `platform` source `practice` exam | persists as platform-owned, visible in `/admin/exams`, not misrepresented in institute lane |
| `PA-WIZ-002` | create `institute` source `practice` exam | persists as institute-owned, visible in `/admin/exams` and `/institute/exams` |
| `PA-WIZ-003` | create `platform` source `quiz` exam | quiz type persists, admin workspace label correct |
| `PA-WIZ-004` | create `platform` source `mock_exam` exam | mock type persists, admin workspace label correct |
| `PA-WIZ-005` | create open-access exam and assign selected student | assignment persists, student sees exam when lifecycle allows it |
| `PA-WIZ-006` | create `entitlement_only` exam | policy persists, student visibility reflects entitlement gating |
| `PA-WIZ-007` | create `stars_only` exam | star cost persists, student visibility reflects star gating |
| `PA-WIZ-008` | create `stars_or_entitlement` exam | mixed access policy persists correctly |
| `PA-WIZ-009` | create `normal` security exam | security mode persists, exam appears in expected security state |
| `PA-WIZ-010` | create `focus` security exam | focus mode persists and is visible in security-facing surfaces |
| `PA-WIZ-011` | create `fullscreen` security exam | fullscreen mode persists and is visible in security-facing surfaces |
| `PA-WIZ-012` | iterate runtime assignment modes | each exposed assignment mode saves and persists after reload |
| `PA-WIZ-013` | enable access key after create and validate student exam-key route | key entry succeeds for assigned student |

### Platform admin advanced builder

| ID | Case | Core assertions |
| --- | --- | --- |
| `PA-ADV-001` | create `platform` source `practice` exam via advanced builder | advanced create succeeds, workspace visibility correct |
| `PA-ADV-002` | create `platform` source `quiz` exam via advanced builder | type persists, builder-created card/detail correct |
| `PA-ADV-003` | create `platform` source `mock_exam` exam via advanced builder | type persists, builder-created card/detail correct |
| `PA-ADV-004` | create `institute` source exam via advanced builder | visible in institute exams workspace too |
| `PA-ADV-005` | create advanced exam with open access | no economy gate blocks assigned student |
| `PA-ADV-006` | create advanced exam with `entitlement_only` | entitlement policy persists |
| `PA-ADV-007` | create advanced exam with `stars_only` | stars policy persists |
| `PA-ADV-008` | create advanced exam with `stars_or_entitlement` | mixed policy persists |
| `PA-ADV-009` | create advanced exam with `normal` security | security label persists |
| `PA-ADV-010` | create advanced exam with `focus` security | security label persists |
| `PA-ADV-011` | create advanced exam with `fullscreen` security | security label persists |
| `PA-ADV-012` | iterate runtime assignment modes in advanced-created exam | assignment-mode save and assigned learner behavior persist |

### Platform admin preset library

| ID | Case | Core assertions |
| --- | --- | --- |
| `PA-PRE-001` | open preset from library into advanced builder | preset handoff works and builder loads seeded configuration |
| `PA-PRE-002` | create exam from preset under `platform` source | created exam preserves preset-driven defaults |
| `PA-PRE-003` | create exam from preset under `institute` source | visible in both admin and institute lanes as expected |
| `PA-PRE-004` | assign student to preset-derived exam | assignment persists and student discovery works |
| `PA-PRE-005` | validate preset-derived economy defaults | economy defaults survive creation |
| `PA-PRE-006` | validate preset-derived security defaults | security defaults survive creation |

### Institute guided wizard

| ID | Case | Core assertions |
| --- | --- | --- |
| `IA-WIZ-001` | create `practice` exam | visible in `/institute/exams`, type persists |
| `IA-WIZ-002` | create `quiz` exam | visible in `/institute/exams`, type persists |
| `IA-WIZ-003` | create `mock_exam` exam | visible in `/institute/exams`, type persists |
| `IA-WIZ-004` | create open-access exam and assign selected student | student sees assigned exam through app route |
| `IA-WIZ-005` | create `entitlement_only` exam | policy persists correctly |
| `IA-WIZ-006` | create `stars_only` exam | star-gated state persists correctly |
| `IA-WIZ-007` | create `stars_or_entitlement` exam | mixed policy persists correctly |
| `IA-WIZ-008` | create `normal` security exam | security state persists |
| `IA-WIZ-009` | create `focus` security exam | security state persists |
| `IA-WIZ-010` | create `fullscreen` security exam | security state persists |
| `IA-WIZ-011` | iterate runtime assignment modes | each exposed assignment mode persists after reload |
| `IA-WIZ-012` | enable access key and verify student exam-key route | student can open assigned exam through key route |

### Institute advanced builder

| ID | Case | Core assertions |
| --- | --- | --- |
| `IA-ADV-001` | create `practice` exam via advanced builder | advanced create succeeds, type persists |
| `IA-ADV-002` | create `quiz` exam via advanced builder | advanced create succeeds, type persists |
| `IA-ADV-003` | create `mock_exam` exam via advanced builder | advanced create succeeds, type persists |
| `IA-ADV-004` | create advanced exam with open access | student access works when lifecycle allows it |
| `IA-ADV-005` | create advanced exam with `entitlement_only` | policy persists |
| `IA-ADV-006` | create advanced exam with `stars_only` | policy persists |
| `IA-ADV-007` | create advanced exam with `stars_or_entitlement` | policy persists |
| `IA-ADV-008` | create advanced exam with `normal` security | security persists |
| `IA-ADV-009` | create advanced exam with `focus` security | security persists |
| `IA-ADV-010` | create advanced exam with `fullscreen` security | security persists |
| `IA-ADV-011` | iterate runtime assignment modes | assignment modes save and remain stable after reload |

### Institute preset library

| ID | Case | Core assertions |
| --- | --- | --- |
| `IA-PRE-001` | open preset from library into builder | preset handoff works |
| `IA-PRE-002` | create exam from preset | created exam visible in `/institute/exams` |
| `IA-PRE-003` | assign student to preset-derived exam | assignment persists and student visibility works |
| `IA-PRE-004` | validate preset-derived economy defaults | economy defaults survive creation |
| `IA-PRE-005` | validate preset-derived security defaults | security defaults survive creation |

## Recommended Implementation Order

1. Shared helpers
2. Institute guided wizard matrix
3. Platform admin guided wizard matrix
4. Institute advanced builder matrix
5. Platform admin advanced builder matrix
6. Preset-library matrices

## First Automation Slice

If we want the highest signal with the fewest specs first, start here:

1. `IA-WIZ-001`
2. `IA-WIZ-002`
3. `IA-WIZ-003`
4. `IA-WIZ-004`
5. `IA-WIZ-012`
6. `PA-WIZ-001`
7. `PA-WIZ-002`
8. `PA-WIZ-005`
9. `PA-WIZ-013`
10. `IA-ADV-003`
11. `PA-ADV-003`
12. `IA-PRE-002`
13. `PA-PRE-002`

## Cases That Need Runtime Enumeration

These cases should not hardcode the exact option set beyond values already confirmed in code.

- `PA-WIZ-012`
- `PA-ADV-012`
- `IA-WIZ-011`
- `IA-ADV-011`

Implementation rule:

- read visible assignment-mode options from the builder select
- create one subcase per non-empty value
- assert save, reload persistence, and assigned-student behavior

## Cases With Highest Cleanup Risk

- any preset-library flow that also creates managed preset artifacts
- any stars or entitlement scenario that mutates student-access state beyond exam creation
- any scenario that creates extra questions just to make the exam startable

These should run with:

- explicit `try/finally`
- hard cleanup ids captured immediately after creation
- no shared mutable exam between unrelated test cases
