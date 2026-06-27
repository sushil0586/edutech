# Now Next Later Pending Backlog

## Purpose

This document converts [PENDING_WORK_AND_AUTOMATION_STRATEGY.md](/Users/ansh/Documents/Eductech/PENDING_WORK_AND_AUTOMATION_STRATEGY.md:1) into an execution-ready backlog for the current repository state.

Use it to decide:

- what should happen immediately
- what should happen after the current release-hardening work
- what should stay intentionally later

References:

- [PENDING_WORK_AND_AUTOMATION_STRATEGY.md](/Users/ansh/Documents/Eductech/PENDING_WORK_AND_AUTOMATION_STRATEGY.md:1)
- [PHASE_1_STUDENT_EXECUTION_BACKLOG.md](/Users/ansh/Documents/Eductech/PHASE_1_STUDENT_EXECUTION_BACKLOG.md:1)
- [PHASE_2_TEACHER_PILOT_HARDENING_BACKLOG.md](/Users/ansh/Documents/Eductech/PHASE_2_TEACHER_PILOT_HARDENING_BACKLOG.md:1)
- [PLAYWRIGHT_AUTOMATION_PHASED_ROADMAP.md](/Users/ansh/Documents/Eductech/PLAYWRIGHT_AUTOMATION_PHASED_ROADMAP.md:1)
- [NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md](/Users/ansh/Documents/Eductech/NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md:1)

## Current Read

The platform is no longer primarily blocked by platform-safety gaps.

What is already true:

- student Phase 1 is technically close to sign-off, but still needs final manual route evidence
- teacher Phase 2 has a clear hardening backlog, but still needs execution
- Playwright baseline coverage is much stronger than before
- the next leverage point is operational automation and release-confidence enforcement

That means the highest-value work is now:

1. finish release-signoff work already in motion
2. add Wave 1 automation from the strategy doc
3. harden teacher and pilot operations
4. only then shift into bigger architecture expansion

## Now

These are the items that should start immediately or continue right now.

### Lane A. Release Sign-Off Completion

#### A1. Finish student manual sign-off

Source:

- [STUDENT_MODULE_QA_CHECKLIST.md](/Users/ansh/Documents/Eductech/STUDENT_MODULE_QA_CHECKLIST.md:1)
- [STUDENT_PHASE_1_SIGNOFF_PASS_2026-06-24.md](/Users/ansh/Documents/Eductech/STUDENT_PHASE_1_SIGNOFF_PASS_2026-06-24.md:1)

Why now:

- technical verification already passed
- remaining risk is manual proof, not compile safety

Acceptance:

- result-state matrix is verified in the browser
- utility settlement states are verified in the browser
- student release gate moves from `partial` to `pass` or a concrete blocker list exists

#### A2. Execute teacher Phase 2 hardening

Source:

- [PHASE_2_TEACHER_PILOT_HARDENING_BACKLOG.md](/Users/ansh/Documents/Eductech/PHASE_2_TEACHER_PILOT_HARDENING_BACKLOG.md:1)
- [TEACHER_MODULE_QA_CHECKLIST.md](/Users/ansh/Documents/Eductech/TEACHER_MODULE_QA_CHECKLIST.md:1)

Why now:

- teacher and institute pilot readiness is the next operational bottleneck

Acceptance:

- results readiness states are clearer
- builder and assignment flows feel reliable
- teacher route-by-route sign-off begins with real evidence

### Lane B. Wave 1 Automation

This is the most important automation wave from [PENDING_WORK_AND_AUTOMATION_STRATEGY.md](/Users/ansh/Documents/Eductech/PENDING_WORK_AND_AUTOMATION_STRATEGY.md:315).

#### B1. CI quality gates

Scope:

- frontend typecheck on merge paths
- frontend build on merge paths
- targeted backend test execution by changed area
- migration validation

Why now:

- fastest breakage reduction

Acceptance:

- common merge paths cannot bypass compile or migration safety

#### B2. Scoped regression automation

Scope:

- stabilize smoke suite
- expand teacher and role-scope regression coverage
- define what runs on PR versus main versus nightly

Primary reference:

- [PLAYWRIGHT_AUTOMATION_PHASED_ROADMAP.md](/Users/ansh/Documents/Eductech/PLAYWRIGHT_AUTOMATION_PHASED_ROADMAP.md:1)

Acceptance:

- critical student and teacher flows are enforced automatically
- role and scope regressions become intentional, not accidental

#### B3. Content integrity automation

Scope:

- stronger bulk-upload validation
- academic mapping checks
- duplicate detection
- broken attachment and rich-content checks

Why now:

- content corruption is still the earliest downstream support multiplier

Acceptance:

- invalid import or authoring states are blocked before they hit builder, attempts, and results

#### B4. Publish blocker automation

Scope:

- explicit pre-publish integrity checks
- rule-based blocker messages
- reusable validation codes

Acceptance:

- exam publish readiness becomes enforceable and auditable

## Next

These should begin after the current sign-off and Wave 1 automation work are moving.

### Lane C. Review Operations Automation

This is `Wave 2` from the strategy doc.

#### C1. Stale review detection and reminders

Acceptance:

- old review tasks are surfaced without manual sweeps

#### C2. Review escalation and release-risk alerts

Acceptance:

- unresolved review pressure becomes visible before publication delays surprise operators

#### C3. Reviewer load balancing suggestions

Acceptance:

- queue assignment becomes guided instead of fully manual

### Lane D. Teacher Workflow Deepening

This is the product side that should happen alongside Wave 2 where needed.

#### D1. Results readiness matrix coverage

Acceptance:

- no-summary, not-complete, ready-to-publish, and published states are both manually and automatically covered

#### D2. Builder post-link management polish

Acceptance:

- reorder, move, and inline edit flows are reliable enough for repeated daily teacher use

#### D3. Monitoring and intervention truthfulness

Acceptance:

- partial telemetry never looks final
- intervention actions stay honest to backend state

## Later

These are still important, but they should not interrupt the current release-hardening and Wave 1/Wave 2 work.

### Lane E. Analytics-To-Action Automation

This is `Wave 3` from the strategy doc.

Includes:

- analytics-generated action queues
- question revision candidate queues
- release-risk summaries
- intervention recommendations
- family portfolio summaries

Why later:

- these become much more valuable once the current operational flows are already reliable

### Lane F. SaaS Governance Automation

This is `Wave 4` from the strategy doc.

Includes:

- audit trails
- quotas and alerts
- onboarding templates
- feature and entitlement automation
- background job visibility
- retention workflows

Why later:

- this is commercialization-critical, but not the fastest immediate user-facing leverage

### Lane G. Large Architecture Expansion

These remain the biggest true platform gaps, but they are not the next tactical move.

Includes:

- question-type capability engine
- media-first assessment engine
- advanced analytics maturity
- advanced assessment modes

Why later:

- they should start from a stable, well-instrumented operational base rather than during release hardening

## What Is Still Truly Pending

If we compress the strategy into plain language, the highest-signal pending stack is:

- student manual release sign-off
- teacher and pilot hardening
- CI and regression enforcement
- content and publish integrity automation
- review queue automation
- analytics-to-action workflows
- SaaS governance
- deeper architecture engines for future exam families

## Recommended Working Order

1. complete student manual sign-off
2. execute teacher Phase 2 hardening
3. implement Wave 1 automation
4. implement Wave 2 review automation
5. expand analytics-to-action automation
6. start the next major architecture engine, most likely the question-type capability engine

## Definition Of Done For This Backlog

This backlog can be considered successfully underway when:

- student and teacher release-signoff docs contain real execution evidence
- CI enforces typecheck, build, and at least one scoped regression layer
- content and publish blockers are automated rather than operator-memory-based
- review queues have at least first-pass stale detection and escalation support
- the team has one agreed `now / next / later` sequence instead of several competing “Phase 2” interpretations
