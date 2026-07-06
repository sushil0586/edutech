# Platform Hardening Matrix

Last updated: 2026-07-04

## Purpose

This matrix is the working source of truth for the next hardening phase.

It answers four questions for each major module:

1. What is technically strong already?
2. What is QA-strong already?
3. What works but still needs polish?
4. What is not yet fully proven?

Use this document to decide execution priority before adding new product surface area.

---

## Status Legend

- `Strong`: implemented, browser-tested in meaningful flows, and stable enough for controlled pilot usage
- `Medium`: functionally usable, but still needs stronger regression coverage or UX polish
- `Weak`: present but not sufficiently proven for confident operator use
- `Not Proven`: either only partially tested or still dependent on assumptions/manual care

---

## Executive Summary

| Area | Technical Strength | QA Strength | Operator Simplicity | Production Confidence | Current Verdict |
| --- | --- | --- | --- | --- | --- |
| Institute onboarding | Strong | Strong | Medium | Medium-High | Good for controlled rollout |
| Institute question bank | Strong | Strong | Medium-High | Medium-High | Core flow is solid and clearer than before |
| Question-bank package access and entitlements | Strong | Strong | Medium | Medium-High | Logic is solid, operator density still needs polish |
| Institute exams workspace | Strong | Strong | Medium-High | High for guided pilot scope | Functional and browser-proven in populated flows, with generic guided and advanced exam creation, preset-pack handoff, family and managed preset persistence, and `entitlement_only` policy baseline now covered |
| Institute linked-question workflow | Strong | Strong | Medium-High | High for pilot scope | One of the best-tested lanes |
| Economy oversight | Medium-High | Strong | Medium | High for guided pilot scope | Functional, browser-proven across diagnosis plus key support-ops/policy baselines, still dense |
| Teacher/institute operational consistency | Medium-High | Medium-High | Medium | Medium-High | Stable baseline is browser-proven, broader mutable parity still pending |
| Results/reviews | Medium-High | Medium-High | Medium | Medium-High | Core behavior works and latest covered routes are stable |
| Registration/onboarding variations | Medium | Medium-Low | Medium | Medium-Low | Needs broader scenario coverage |
| Performance/high concurrency | Medium | Weak | n/a | Weak-Medium | Architecture direction exists, not fully proven |

Latest browser evidence behind this summary:

- Broad populated browser regression:
  - `12 passed`
  - admin economy browser coverage
  - institute end-user smoke
  - institute linked science question-bank flow
  - institute exams workspace
  - institute exams filter + pagination flow
  - institute results workspace
- Focused question-bank/admin clarity reruns:
  - `6 passed` admin economy browser coverage
  - `2 passed` institute linked science browser coverage
  - `4 passed` package editor + institute exams/results focused rerun
- Cross-role consistency baseline:
  - `1 passed`
  - teacher/institute role-consistency contract
- Student small-screen baseline:
  - focused mobile-web Chromium lane is in place for student shell, exam-detail, results, and truthful fallback-state reachability

---

## Module Matrix

### 1. Institute Onboarding

| Dimension | Status | Notes |
| --- | --- | --- |
| Technical | Strong | UI-based institute creation, academic preset application, and onboarding defaults are working much better than earlier phases. |
| QA | Strong | Repeated browser validation was done around institute creation, preset application, and question-bank access attachment. |
| UX | Medium | Flow is usable, but still requires better operator guidance and less cognitive load in combined onboarding + access setup. |
| Risk | Medium | Multi-variation onboarding is not fully exhausted across all combinations of presets and access modes. |

What is strong:
- New institute can be created from UI.
- Academic presets and master defaults are usable.
- Onboarding can attach question-bank access and advanced builder access.

What still needs hardening:
- Better visibility of what exactly gets attached during onboarding.
- Cleaner recovery when partial onboarding is completed.
- Stronger summary after onboarding submit.

Priority:
- `P0`: onboarding summary and verification clarity
- `P1`: more onboarding combinations in Playwright

---

### 2. Institute Question Bank

| Dimension | Status | Notes |
| --- | --- | --- |
| Technical | Strong | Core linked-question, shared-library, and filtered review workflows are functioning reliably. |
| QA | Strong | This is one of the most repeatedly browser-tested areas. |
| UX | Medium-High | End-user behavior is much better now, and the access chain is now more explicit for operators. |
| Risk | Medium-Low | Main risk is confusion, not fundamental breakage. |

What is strong:
- Linked question browsing works.
- Shared-library linker path works.
- Filters and filtered empty-state recovery improved.
- Science and math access behaviors were validated through real institute scenarios.
- Linked-question pages now explain the difference between:
  - package coverage
  - linker intake
  - linked questions already inside the institute bank
- Current operator-facing next step is now visible on the page itself.

What still needs hardening:
- Make linked-question screens even more task-oriented.
- Keep zero-result states very explicit.

Priority:
- `P0`: linked-question page clarity
- `P1`: package-to-question visibility explanation

---

### 3. Question-Bank Packages and Entitlements

| Dimension | Status | Notes |
| --- | --- | --- |
| Technical | Strong | Package scope, entitlement records, and access behavior are functioning. |
| QA | Strong | Major flows were exercised repeatedly, including package widening and entitlement recovery. |
| UX | Medium | This area still contains conceptual complexity, but the highest-risk misunderstandings are now reduced. |
| Risk | Medium | The system works, but user misunderstanding can create configuration mistakes. |

What is strong:
- Package records exist and can be assigned.
- Entitlements affect institute visibility.
- Scope rows control what subjects/topics are available.
- Revoked versus active behavior is now clearer than before.
- Package widening from Math to Science is browser-proven.
- Entitlement restoration for science visibility is browser-proven.
- Save-block guidance and live dependency warnings are now visible in the editor.

What still needs hardening:
- Scope editing needs simpler operator guidance.
- Package names, scope rows, entitlement state, and linked availability should be easier to connect mentally.
- Revoke/unrevoke/lifecycle actions should feel safer and more obvious.

Priority:
- `P0`: operator-safe scope editing and entitlement clarity
- `P1`: stronger automation around package edit + entitlement lifecycle

---

### 4. Institute Exams Workspace

| Dimension | Status | Notes |
| --- | --- | --- |
| Technical | Strong | Exams list, filters, pagination, and creation entry points are stable. |
| QA | Strong | Browser coverage exists, filtered-empty-state issues were addressed, and populated reruns passed. |
| UX | Medium | Good enough for usage, but still benefits from more obvious active-state and filter context. |
| Risk | Medium | Remaining risk is workflow clarity, not basic CRUD instability. |

What is strong:
- Exams page opens correctly.
- Filters and pagination are functioning.
- No-result filtered state is better separated from true empty state.
- Quick Create and Advanced Builder entry points are available.
- Populated browser reruns now confirm exams workspace, filter, and pagination behavior together.
- Guided-wizard creation for `practice`, `quiz`, and `mock_exam` is browser-proven.
- Advanced-builder creation for `practice`, `quiz`, and `mock_exam` is browser-proven.
- Preset-pack to advanced-builder handoff is browser-proven through family preset lanes.
- Family preset-derived create/save persistence is browser-proven for admin and institute mutable lanes.
- Assignment persistence and student visibility are browser-proven on those generic created exams.
- Selected-student assignment is browser-proven through create, publish, student visibility, and leaderboard-ready results workflows.
- Single-ranked learner visibility after publication is browser-proven in institute, teacher, and student mutable results lanes.
- `entitlement_only` access-policy persistence is browser-proven in mutable institute exam-detail coverage.

What still needs hardening:
- Better visibility of active filter state.
- Better recovery affordances after narrow filters.
- More stars-policy, fullscreen/focus security, and edge-option breadth outside the current baseline.
- Multi-learner result distribution depth.

Priority:
- `P0`: active filter summary and clearer exam state messaging
- `P1`: deeper exam create/edit/delete/publish browser coverage

---

### 5. Economy Oversight

| Dimension | Status | Notes |
| --- | --- | --- |
| Technical | Medium-High | Functional and significantly improved, but still one of the densest screens/workflows. |
| QA | Strong | Good targeted coverage exists and the latest browser reruns are green after clarity improvements. |
| UX | Medium | Still the heaviest operator workflow in the product, but the top-of-lane diagnosis is much clearer now. |
| Risk | Medium | Misconfiguration risk is higher here than in simpler modules. |

What is strong:
- Scope-first view is much better than before.
- Package, entitlement, support, and visibility lanes exist.
- Operator can inspect institute-level access truth.
- Top-of-lane diagnosis now explains:
  - what is being reviewed
  - what the current gap is
  - what the next action should be
- The access chain is now easier to scan without reading every row first.
- Controlled star-grant mutation is browser-proven.
- Entitlement pause/reactivate plus lifecycle notes/date edits are browser-proven.
- Institute-admin policy-disable behavior for grant and confirm actions is browser-proven.

What still needs hardening:
- Reduce operator confusion in the densest catalog/policy combinations, not just the top-of-lane diagnosis.
- Strengthen browser coverage for broader package/catalog mutation combinations and more support-ops branches.
- Improve screen-level guidance for non-technical staff on the heaviest economy actions.

Priority:
- `P0`: reduce terminology confusion
- `P1`: deeper mutable browser coverage

---

### 6. Reviews and Results

| Dimension | Status | Notes |
| --- | --- | --- |
| Technical | Medium-High | Core queues and views work. |
| QA | Medium-High | Smoke and targeted validation exist, and latest institute results workspace coverage passed in populated regression. |
| UX | Medium | Operationally usable, but still can be clearer in state descriptions and reviewer guidance. |
| Risk | Medium | Real reviewer workflow depth still needs more end-to-end passes. |

What is strong:
- Review queue and results routes are accessible.
- Basic queue navigation is working.
- Text/assertion drift issues were already cleaned up.
- Institute results workspace route coverage is stable in the latest broad rerun.
- Institute review queue filtering, exam-scoped queue handoff, and filtered-empty recovery are browser-proven.
- Single-learner institute publication through leaderboard-ready state is browser-proven.

What still needs hardening:
- Institute-side descriptive scoring mutation flows.
- Multi-role reviewer flows.
- More realistic multi-learner result publishing journeys.
- Better clarity around blocked versus pending states.

Priority:
- `P1`: review queue deep regression

---

### 7. Teacher and Institute Operational Consistency

| Dimension | Status | Notes |
| --- | --- | --- |
| Technical | Medium-High | Main shells and operational pages are stable. |
| QA | Medium | Core smoke is good, but parity across all role paths is not fully finished. |
| UX | Medium | Better than before, still should be simplified for broader operator audiences. |
| Risk | Medium | Cross-role expectation mismatches can still surface. |

What is strong:
- Role shells load.
- Main navigation routes are healthy.
- Shared-library role behavior is better understood than before.
- Cross-role browser baseline now proves:
  - question-bank shell parity
  - results shell parity
  - exam-detail core panel parity
- Mutable exam-detail baseline is now proven for both roles.
- Question-bank mutable baseline is now proven for both roles at:
  - single-question draft/edit lifecycle
  - bulk difficulty and status actions

What still needs hardening:
- Role parity in deeper question-bank mutable operations.
- Decide whether teacher should intentionally remain lighter than institute in builder-depth mutable checks.
- Cleaner explanation of what each role can do.
- More matrix-based automation by role.

Priority:
- `P1`: role-consistency browser matrix

---

### 8. Registration and Public Entry

| Dimension | Status | Notes |
| --- | --- | --- |
| Technical | Medium | Present and partly tested, but not as heavily hardened as institute workflows. |
| QA | Medium-Low | Coverage exists, but not enough for broad confidence across all public entry combinations. |
| UX | Medium | Likely usable, but less battle-tested. |
| Risk | Medium | Public-facing onboarding usually exposes hidden validation and state issues. |

Priority:
- `P1`: public entry and registration regression pass

---

### 9. Performance and Scale

| Dimension | Status | Notes |
| --- | --- | --- |
| Technical | Medium | Direction and architecture ideas exist. |
| QA | Weak | Workflow correctness is much stronger than performance proof. |
| UX | n/a | User experience at scale is not fully measured yet. |
| Risk | High | Without dedicated testing, high-concurrency confidence is limited. |

What is strong:
- You already have a cost/performance planning direction.
- You have thought through cache/autoscale/slot strategies.

What still needs hardening:
- Real performance test execution.
- Exam concurrency validation.
- Slow API/large dataset behavior checks.

Priority:
- `P2`: performance validation after core workflow hardening

---

## Strong Today

These are the safest areas to rely on during the next pilot phase:

- Institute creation and baseline onboarding through UI
- Academic preset-based setup
- Institute question-bank access and linked-question browsing
- Shared-library linking and scoped question review
- Main institute exams workspace behavior
- Core package/entitlement access visibility
- Economy question-bank diagnosis and operator guidance
- Institute results workspace covered routes

---

## Works But Needs Polish

- Exams filter visibility and lifecycle messaging
- Economy/operator understanding of package versus entitlement versus feature access
- Review/results operational guidance
- Broader cross-role consistency language
- Package editor density for first-time operators

---

## Not Yet Fully Proven

- Full public onboarding variations
- Deep review workflow regression across all role combinations
- Large-scale concurrency/performance
- Full regression confidence across every module and every edge condition

---

## Hardening Priority Order

### P0

1. Institute onboarding summary clarity
2. Package/entitlement/operator clarity in economy and question-bank workflows
3. Linked-question page usability polish
4. Exams workspace state clarity and recovery polish

### P1

1. Broader role-consistency regression
2. Reviews/results end-to-end browser coverage
3. Registration/public-entry regression
4. More mutable economy/package editing coverage

### P2

1. Performance and concurrency testing
2. Wider device/network validation
3. More advanced operational dashboards and reporting hardening

---

## Recommended Next Execution Loop

For each hardening cycle:

1. Pick one P0 area only.
2. Write page-wise bug list and operator pain points.
3. Implement fixes.
4. Re-run focused Playwright browser tests.
5. Re-run one realistic UI-driven end-to-end scenario.
6. Update this matrix.

---

## Current Recommendation

Next best hardening target:

`Results/reviews and broader role-consistency hardening`

Reason:
- The package/access/question-bank clarity layer is now materially improved and browser-proven.
- The next highest-value confidence gap is broader operational depth:
  - results/reviews end-to-end realism
  - teacher/institute role-consistency passes
  - remaining polish on dense operator routes
