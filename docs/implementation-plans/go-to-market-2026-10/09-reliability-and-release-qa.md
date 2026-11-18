# Reliability and release QA

Workstream W09 · Created 21 October 2026 · Status: Planned

Every shipped promise has current test evidence, measured operating limits and a demonstrated recovery path.

[Return to the high level plan](00-HIGH-LEVEL-PLAN.md)

## Ownership and dependencies

- Accountable owner: QA lead and release engineer.
- Supporting roles: Backend, web and mobile engineers.
- Entry dependencies: W01 candidate identity and included W02–W08 capabilities.
- Planning effort: 6–10 engineering days plus QA execution. This is effort, not a guaranteed elapsed duration.
- Audit findings: PERF01, RELIABILITY01, A11Y01, REL03, OPS01. See the [audit findings](../../qa/evidence/market-audit-20261021/summary.json).

## Implementation areas

- `edutech_web/tests/e2e/`
- `edutech_backend/apps/`
- `performance/k6/`
- `deployment/`
- `nexora_student_mobile/.maestro/`
- `docs/qa/`

Paths identify existing areas to inspect; they do not imply every listed file requires a change. Keep related existing contracts and reuse working implementation.

## Execution order

1. W09.01 — Freeze the release test matrix. Gate: Pilot.
2. W09.02 — Validate long sessions and outages. Gate: Pilot.
3. W09.03 — Measure capacity for the sold cohort. Gate: Pilot.
4. W09.04 — Prove backup restore and incident response. Gate: Pilot.
5. W09.05 — Run final candidate regression. Gate: Each release gate.

## W09 01 Freeze the release test matrix

**Required for:** Pilot. **Status:** Complete for the agreed objective-exam web-pilot scope.

**Dependencies:** Workstream entry decisions; can begin once scoped.

**Work**

- [x] Map each included role journey and audit finding to a test or manual acceptance check.
- [x] Separate current pass/fail, deferred feature, unverified coverage and intermittent cases.
- [x] Bind evidence to release SHA/environment/device; keep browser/API/database and human UAT claims distinct.

**Acceptance criteria**

- [x] The launch checklist has no ambiguous green result based only on source/test existence.
- [x] Every included high-risk behavior has an owner and verification path.

**Verification and evidence**

- Review matrix completeness against W01–W10 and the 26 audit findings.

Evidence: [objective-exam pilot release matrix](../../qa-runbooks/W09_PILOT_RELEASE_MATRIX.md).

## W09 02 Validate long sessions and outages

**Required for:** Pilot. **Status:** Not started.

**Dependencies:** W03.03, W01.03.

**Work**

- [ ] Run full-duration exam sessions through refresh expiry, client reload, API interruption and delayed/retried saves/submits.
- [ ] Verify scheduled processing and timed expiry under the actual runtime topology.
- [ ] Test grace/late-submit behavior, randomization continuity and accommodations for included policies.

**Acceptance criteria**

- [ ] No acknowledged answer is lost and no retry changes final score or access consumption incorrectly.
- [ ] Failure/recovery messages tell users what happened and what to do.

**Verification and evidence**

- Use deterministic answer fixtures and compare persisted state before/after each interruption.

## W09 03 Measure capacity for the sold cohort

**Required for:** Pilot. **Status:** Ready for authorized stage confirmation.

**Dependencies:** W01.03, W03.01.

**Work**

- [x] Set a provisional 60-concurrent objective-exam pilot cap with a measured 100-user local burst; stage confirmation remains required.
- [x] Use representative data, production-like services and isolated synthetic load; observe database, workers and application latency.
- [x] Apply p95 start/save/submit under 2 seconds, under 1 percent unexpected request errors, zero lost acknowledged answers or incorrect results, with at least 1.5× target-cohort headroom.

**Acceptance criteria**

- [ ] An authorized stage measurement and cost/scale limit support the promised cohort; local Docker establishes the provisional cap only.
- [ ] If targets fail, tune and rerun or reduce admitted cohort; do not extrapolate from localhost timings.

**Verification and evidence**

- Retain workload, infrastructure, latency/error distributions and data-integrity results.

## W09 04 Prove backup restore and incident response

**Required for:** Pilot. **Status:** Ready for stage responder configuration.

**Dependencies:** W01.02.

**Work**

- [x] Restore the database and objective-pilot media set into an isolated environment; verify secrets are not copied into artifacts.
- [x] Record provisional recovery point/time targets and rehearse data recovery and application restart.
- [ ] Configure the real stage webhook and named responder for the implemented health monitor and escalation runbook.

**Acceptance criteria**

- [ ] Recovery meets the agreed targets and restored exams/results remain consistent.
- [ ] A synthetic incident triggers an actionable alert and reaches the designated responder.

**Verification and evidence**

- Record restore/rollback timings, checksums where appropriate, incident timeline and final health checks.

## W09 05 Run final candidate regression

**Required for:** Each release gate. **Status:** In progress; local candidate checkpoint passed with stage/full-matrix gates remaining.

**Dependencies:** W01.04, W02.05, W09.02, W09.03, W09.04.

**Work**

- [x] Run the scoped backend, Chromium, Firefox, WebKit and accessibility packs; native is excluded from the assisted web pilot.
- [x] Keep automated paid commerce and descriptive grading outside this candidate; preserve their later release gates.
- [x] Triage the navigation race and Firefox intermittent, fix the test race and retain initial failure evidence plus reruns.

**Acceptance criteria**

- [ ] Zero unresolved critical defects or high defects affecting assessment correctness, access/privacy, paid grants or required accessibility.
- [ ] Go/no-go records exact artifact identity, exclusions, capacity and recovery evidence.

**Verification and evidence**

- Publish a release summary with failure evidence and exclusions; a rerun pass does not erase unresolved intermittent failures.

Checkpoint: [candidate capacity and recovery evidence](../../qa/89-w09-candidate-capacity-recovery-20261022.md). The report retains the host-pause run and Firefox intermittent, records the provisional 60-user cap, and lists the stage, on-call, duration, accessibility and unfamiliar-user gates still required.

## Completion and handoff

The accountable owner records the candidate SHA, environment, test outcomes, evidence links and remaining exclusions in the execution tracker. QA verifies the acceptance criteria for the features entering the release. A task is complete only when its stated outcome is demonstrated; an existing model, route or test file is not sufficient.

If an API, schema, authorization rule, assessment policy or paid-access rule changes, document compatibility, any required migration, affected clients and rollback limits before promotion. Changes to saved answers, grades and historical results require explicit preservation checks.

## W02 handoff — open local findings

- **W02-RUNTIME-01 (High, W09.02):** One Nginx upstream connection reset produced a 502 during student credential provisioning. Web container stayed healthy and did not restart; no matching backend write was logged. The unchanged full lifecycle passed on rerun. Reproduce the connection behavior and verify safe recovery of credential-provisioning writes; a passing retry does not resolve the issue.
- **W02-RUNTIME-02 (Medium, W09.02):** Gunicorn control service logs `EROFS` for `/home/edutech` under the read-only root filesystem. Serving workers remain healthy. Configure its runtime path or disable the unused service, then certify startup logs.

[W02 report and sanitized evidence](../../qa/64-w02-access-and-tenant-verification-20261021.md). These findings remain open and do not represent capacity or public staging certification.

## Reliability follow-up — 21 October 2026

W02-RUNTIME-02 is fixed locally in `581ed8f` by disabling the unused Gunicorn control socket under the read-only filesystem. W02-RUNTIME-01 remains open: the Connection header map is hardened, but the original credential-write reset root cause is unproven. Controlled outage checks and bounded-worker health are separate from capacity, restore rehearsal and public staging certification. See [follow-up evidence](../../qa/66-w03-reliability-and-header-verification-20261021.md).
