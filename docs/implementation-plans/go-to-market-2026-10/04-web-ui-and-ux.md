# Web UI and UX

Workstream W04 · Created 21 October 2026 · Status: Complete for pilot; broader accessibility certification in progress

Each role reaches its main task quickly through readable, bounded screens on desktop and mobile web.

[Return to the high level plan](00-HIGH-LEVEL-PLAN.md)

## Ownership and dependencies

- Accountable owner: Product designer and web engineer.
- Supporting roles: QA and representative institute users.
- Entry dependencies: W02 role contract and W03 included exam workflow.
- Planning effort: 8–14 engineering days plus design and user sessions. This is effort, not a guaranteed elapsed duration.
- Audit findings: UX01, UX02, UX03, UX04, A11Y01. See the [audit findings](../../qa/evidence/market-audit-20261021/summary.json).

## Implementation areas

- `edutech_web/src/components/ui/teacher-question-bank-workspace.tsx`
- `edutech_web/src/components/ui/advanced-exam-builder.tsx`
- `edutech_web/src/components/auth/`
- `edutech_web/src/app/`
- `edutech_web/src/app/globals.css`

Paths identify existing areas to inspect; they do not imply every listed file requires a change. Keep related existing contracts and reuse working implementation.

## Execution order

1. W04.01 — Define role tasks and simplify navigation. Gate: Pilot.
2. W04.02 — Make question and wallet lists bounded. Gate: Pilot for question bank; commerce gate for wallet.
3. W04.03 — Shorten exam creation. Gate: Pilot.
4. W04.04 — Improve learner and signup activation. Gate: Pilot.
5. W04.05 — Certify accessible responsive tasks. Gate: Pilot for critical tasks; broader release for full included surface.

## W04 01 Define role tasks and simplify navigation

**Required for:** Pilot. **Status:** Complete.

**Dependencies:** Workstream entry decisions; can begin once scoped.

**Work**

- [x] Map first-use and repeat-use tasks for platform admin, institute admin, teacher, student and parent web.
- [x] Prioritize student continue/start exam, teacher find-question/create exam and institute roster/setup readiness.
- [x] Preserve the component system; remove redundant banners, repeated metrics and ambiguous active navigation.

**Acceptance criteria**

- [x] Each core screen has one clear primary action and a concise explanation of any blocked state.
- [x] Role navigation labels match the actual product tasks.

**Verification and evidence**

- Review desktop and 390 px mobile task flows with a designer and QA before implementation.

Checkpoint: [role navigation closure and task map](../../qa/79-w04-role-navigation-closure-20261021.md). Fifteen role-shell checks pass across Chromium, Firefox and WebKit, and three dense operator navigation checks pass at 390×844. The task map records first-use, repeat-use and primary navigation for platform admin, institute admin, teacher, student and parent web. Human activation observations remain under W07.05 rather than being inferred from automated navigation checks.

## W04 02 Make question and wallet lists bounded

**Required for:** Pilot for question bank; commerce gate for wallet. **Status:** Complete.

**Dependencies:** W04.01.

**Work**

- [x] Default question bank to compact inventory with search, pagination and collapsed advanced filters.
- [x] Move licensing and entitlement explanations into contextual help and specific action blockers.
- [x] Paginate wallet orders/ledger; keep balance and the next useful action near the top.

**Acceptance criteria**

- [x] Rendered history/list size stays bounded as records grow; all records remain reachable.
- [x] Filter/reset/pagination retain scope and do not silently change counts or selections.

**Verification and evidence**

- Test empty, small and hundreds-of-record fixtures; capture desktop/mobile before-and-after measurements.
- Have a teacher find and add a question without coaching.

Checkpoints: [W04 teacher question-bank inventory verification](../../qa/69-w04-question-bank-inventory-verification-20261021.md), [W04 wallet pagination verification](../../qa/70-w04-wallet-pagination-verification-20261021.md), [W04 high-volume pagination verification](../../qa/71-w04-high-volume-pagination-verification-20261021.md) and [W04.02 closure](../../qa/78-w04-question-wallet-closure-20261021.md). Both implementation slices, empty/225-record API boundaries and nine Chromium/Firefox/WebKit task checks are Docker-verified. The unfamiliar-user observation is retained honestly under W07.05 activation/support research; it is not represented as completed automation.

## W04 03 Shorten exam creation

**Required for:** Pilot. **Status:** Complete.

**Dependencies:** W04.01, W03.01.

**Work**

- [x] Use a recommended audience → questions → schedule → preview/publish path.
- [x] Offer a few pilot-appropriate presets and defer timing/security/economy details behind advanced settings.
- [x] Keep marks, question availability and publish blockers visible without repeated summary panels.

**Acceptance criteria**

- [x] A teacher creates the pilot exam without navigating advanced commercial or runtime concepts.
- [x] Preview, saved configuration and student runtime remain equivalent.

**Verification and evidence**

- Run standard and advanced creation regressions, validation errors and mobile form checks.

Checkpoints: [teacher exam fast-path verification](../../qa/72-w04-teacher-exam-fast-path-verification-20261021.md), [teacher pilot lifecycle verification](../../qa/73-w04-teacher-pilot-lifecycle-verification-20261021.md), [guided versus Advanced Builder equivalence](../../qa/74-w04-fast-vs-advanced-equivalence-20261021.md), and [question-first flow verification](../../qa/75-w04-question-first-exam-flow-20261021.md). The objective pilot now uses audience → questions → schedule → preview/publish, offers at most three relevant preset patterns, keeps advanced runtime/security/economy controls optional, and directs teachers to the next unresolved publication requirement. Desktop, 390px mobile, disposable creation, full publication lifecycle and student runtime checks pass on the exact Docker image.

## W04 04 Improve learner and signup activation

**Required for:** Pilot. **Status:** In progress.

**Dependencies:** W04.01, W07.01.

**Work**

- [x] Reduce mobile header height and place continue/assigned work ahead of diagnostic cards.
- [x] Bring role selection and signup form together; shorten explanatory content.
- [x] Use plain-language loading, empty, error, locked and pending states with a specific recovery action.

**Acceptance criteria**

- [x] The main learner action or a truthful next step is visible in the first meaningful viewport.
- [x] Signup, profile completion and first assigned exam have a continuous understandable route.

**Verification and evidence**

- Run first-use tasks with unfamiliar learners and capture blocked/error-state screenshots.

Checkpoint: [learner and signup activation verification](../../qa/76-w04-learner-signup-activation-20261021.md). The Docker route now covers compact role-aware signup, actionable validation, geography-backed profile completion, workspace entry and a truthful next action before diagnostics at 390×900. Automated first-use and regression checks pass; unfamiliar-user sessions and activation measurement continue under W07.05.

## W04 05 Certify accessible responsive tasks

**Required for:** Pilot for critical tasks; broader release for full included surface. **Status:** Complete for pilot; broader release in progress.

**Dependencies:** W04.02, W04.03, W04.04.

**Work**

- [x] Check keyboard order, visible focus, labels, error announcements, dialogs, screen reader basics, zoom and contrast for critical pilot tasks.
- [x] Test critical exam/forms in Chromium, Firefox and WebKit plus target mobile browsers.
- [x] Check long names, equations and media in the objective pilot evidence; translations are not offered in the pilot web scope.

**Acceptance criteria**

- [x] Critical tasks have no unresolved accessibility or responsive blocker.
- [x] Mobile navigation and error recovery work without hidden/clipped controls.

**Verification and evidence**

- Retain automated checks and manual keyboard/screen-reader/device evidence separately; no blanket WCAG claim from five keyboard tests.

Checkpoint: [accessible responsive pilot certification](../../qa/77-w04-accessible-responsive-pilot-certification-20261021.md). Thirty-six desktop checks passed across Chromium, Firefox and WebKit, and fourteen passed across Mobile Chrome and Mobile Safari emulation. The evidence covers critical task semantics, serious/critical automated findings, keyboard traversal, visible focus, 320px reflow, signup error recovery and learner/teacher action visibility. Full manual assistive-technology, physical-device and full-surface work remains a broader-release requirement; no blanket WCAG claim is made.

## Completion and handoff

The accountable owner records the candidate SHA, environment, test outcomes, evidence links and remaining exclusions in the execution tracker. QA verifies the acceptance criteria for the features entering the release. A task is complete only when its stated outcome is demonstrated; an existing model, route or test file is not sufficient.

If an API, schema, authorization rule, assessment policy or paid-access rule changes, document compatibility, any required migration, affected clients and rollback limits before promotion. Changes to saved answers, grades and historical results require explicit preservation checks.

## Fresh evidence — 21 October 2026

W03-UI-01: the desktop student header search/source/subject controls overlap in the 1280×720 published-result receipt capture. Reconcile header layout and usable search/filter hit targets as part of W04, including keyboard, zoom and responsive widths. See [W03 visual evidence](../../qa/65-w03-objective-recovery-verification-20261021.md#visual-inspection). This is an existing shell issue observed during W03 verification; no visual-layout certification is claimed.

## Reliability follow-up — 21 October 2026

W03-UI-01 overlap is addressed in candidate `581ed8f`: search and filters have separate layout space and controls pass hit-target checks at 1280, 1440 and 390 pixels. [Screenshots and limits](../../qa/66-w03-reliability-and-header-verification-20261021.md). Header density/height, first meaningful learner action, keyboard/zoom/screen-reader coverage and teacher authoring remain open. This is a sampled layout fix, not full accessibility certification.

## Task-priority checkpoint — 21 October 2026

Teacher creation removes repeated summaries and misleading pre-hydration zero counts; the shared wizard now moves focus between steps and uses step-navigation semantics. Student recommendation/action precedes performance KPIs and its own diagnostic cards. Desktop context filters share a row where space permits. [Changed files and visual verification](../../qa/67-w04-task-priority-verification-20261021.md). W04.03/W04.04 are In progress, with the four-step authoring model, mobile header height, signup, bounded lists and full accessibility/first-use checks still open.

## Mobile first-viewport checkpoint — 21 October 2026

At 390×900, the student primary action and teacher first exam configuration control are now visible without scrolling. The mobile teacher steps use a horizontal rail and the create page omits its redundant workspace toolbar while retaining the global menu. [Verification and captures](../../qa/68-w04-mobile-first-viewport-verification-20261021.md). W04.03/W04.04/W04.05 remain In progress because complete authoring, signup, bounded lists, accessibility, browser breadth and unfamiliar-user testing are still open.
