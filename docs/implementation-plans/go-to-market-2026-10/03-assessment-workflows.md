# Assessment workflows

Workstream W03 · Created 21 October 2026 · Status: In progress

Teachers can reliably deliver the included assessments and students receive correct, safely published results.

[Return to the high level plan](00-HIGH-LEVEL-PLAN.md)

## Execution checkpoint — 21 October 2026

The product owner confirmed objective exams for the first pilot; descriptive grading is deferred. Request locking, expiry/result recovery, elapsed-time countdowns, retained drafts, save feedback and published-notification links are implemented. See the [Docker verification and changed-file report](../../qa/65-w03-objective-recovery-verification-20261021.md) and [recovery contract](../../qa-runbooks/W03_ATTEMPT_RECOVERY.md).

W03 remains in progress. Approve the actual pilot curriculum/content/policies, restrict its descriptive content, resolve the original navigation intermittency, and certify the actual pilot-duration sessions before closing the pilot gate. Independent expiry processing is now implemented; the controlled local soak does not certify longer pilot exams or signed mobile builds.

## Ownership and dependencies

- Accountable owner: Backend and web engineers.
- Supporting roles: Assessment QA and academic lead.
- Entry dependencies: W02 access contract and W05 pilot content selection.
- Planning effort: 6–10 engineering days. This is effort, not a guaranteed elapsed duration.
- Audit findings: NAV01, REVIEW01, RELIABILITY01. See the [audit findings](../../qa/evidence/market-audit-20261021/summary.json).

## Implementation areas

- `edutech_backend/apps/exams/`
- `edutech_backend/apps/attempts/`
- `edutech_backend/apps/results/`
- `edutech_web/src/features/results-workspace/`
- `edutech_web/src/components/ui/attempt-resilience-panel.tsx`
- `edutech_web/tests/e2e/workflow/`

Paths identify existing areas to inspect; they do not imply every listed file requires a change. Keep related existing contracts and reuse working implementation.

## Execution order

1. W03.01 — Stabilize the objective assessment baseline. Gate: Pilot.
2. W03.02 — Resolve teacher results navigation. Gate: Pilot.
3. W03.03 — Prove answer and session recovery. Gate: Pilot.
4. W03.04 — Certify descriptive grading if included. Gate: Descriptive assessment release.
5. W03.05 — Reconcile learner reports and notifications. Gate: Pilot for results; broader release for optional alerts.

## W03 01 Stabilize the objective assessment baseline

**Required for:** Pilot. **Status:** In progress.

**Dependencies:** W02.01, W05.01.

**Work**

- [ ] Freeze the pilot question types, exam policies and reporting fields; recommended initial scope is objective exams.
- [x] Keep deterministic scoring/negative-marking fixtures and result/publication expectations.
- [ ] Cover assignment changes, shuffled questions/options, duplicate saves/submits and stale answer requests.

**Acceptance criteria**

- [ ] Included question types score correctly and produce one final result per intended attempt policy.
- [ ] Published/review-visible information matches the configured release policy.

**Verification and evidence**

- Run backend scoring contracts and the fresh full browser lifecycle without weakening assertions.

## W03 02 Resolve teacher results navigation

**Required for:** Pilot. **Status:** In progress.

**Dependencies:** W03.01.

**Work**

- [ ] Reproduce the failed exam-selection click under production web builds.
- [ ] Inspect client hydration, pending navigation, data reload and event/locator timing.
- [ ] Fix the confirmed product or harness cause while retaining real click-based coverage.

**Acceptance criteria**

- [ ] Repeated exam selections and browser refresh retain the expected exam context.
- [x] The previously failed flow passes three consecutive isolated runs and one representative role pack.

**Verification and evidence**

- Keep both failing and corrected traces; verify URL, selected exam and rendered data agree.

## W03 03 Prove answer and session recovery

**Required for:** Pilot. **Status:** In progress.

**Dependencies:** W03.01.

**Work**

- [ ] Test refresh/reload, connection loss before and after save acknowledgment, token expiry, duplicate requests and lost submit responses.
- [x] Use server-authoritative timing and explicit saved/saving/failed states.
- [x] Document recovery when an exam window ends or a service restarts; do not promise fully offline examination.

**Acceptance criteria**

- [ ] Acknowledged answers survive recovery and timed-out work cannot extend the exam incorrectly.
- [ ] Submission retries cannot create duplicate grading or double consumption of access allowances.

**Verification and evidence**

- Run long-session and interrupted-network fixtures on web; reuse the API contracts in W08 mobile testing.

## W03 04 Certify descriptive grading if included

**Required for:** Descriptive assessment release. **Status:** Deferred.

Product owner decision, 21 October: exclude descriptive grading from the pilot. W05 must constrain the approved pilot inventory and policies before enrollment. Existing non-pilot descriptive features remain available; they are not certified by this checkpoint.

**Dependencies:** W02.03, W03.01.

**Work**

- [ ] Cover reviewer assignment/claiming, rubric marks, recheck, moderation and unauthorized reviewers.
- [ ] Verify pending grades block or qualify result publication as intended.
- [ ] Regenerate rankings/analytics after approved grade changes with an audit trail.

**Acceptance criteria**

- [ ] A descriptive answer reaches its correct reviewed result without early disclosure or lost grading history.
- [ ] Unsupported review variants are disabled for the pilot if this gate is deferred.

**Verification and evidence**

- Run a populated manual-review browser journey and backend moderation/result regressions.

## W03 05 Reconcile learner reports and notifications

**Required for:** Pilot for results; broader release for optional alerts. **Status:** In progress.

**Dependencies:** W03.01, W03.02.

**Work**

- [x] Compare attempt summary, result list, leaderboard and analytics totals against deterministic fixtures.
- [ ] Verify empty, pending review, unpublished, failed and completed states.
- [ ] Test notification/parent alert generation, link targets and permission behavior only for enabled channels.

**Acceptance criteria**

- [ ] Core result data is internally consistent and every active action leads to the correct learner/exam.
- [ ] Charts and recommendations explain insufficient-data states and avoid implying unsupported predictions.

**Verification and evidence**

- Capture browser/API/database comparisons and enabled notification delivery evidence.

## Completion and handoff

The accountable owner records the candidate SHA, environment, test outcomes, evidence links and remaining exclusions in the execution tracker. QA verifies the acceptance criteria for the features entering the release. A task is complete only when its stated outcome is demonstrated; an existing model, route or test file is not sufficient.

If an API, schema, authorization rule, assessment policy or paid-access rule changes, document compatibility, any required migration, affected clients and rollback limits before promotion. Changes to saved answers, grades and historical results require explicit preservation checks.

## Reliability follow-up — 21 October 2026

Independent expiry processing, conditional web saves, access-cookie renewal and local outage checks are implemented in candidate `581ed8f`. See [reliability follow-up](../../qa/66-w03-reliability-and-header-verification-20261021.md). W03 stays In progress: actual pilot curriculum/content/policies and duration, original intermittent navigation/proxy diagnosis, broader browsers and signed native testing remain open. W03.04 remains Deferred.
