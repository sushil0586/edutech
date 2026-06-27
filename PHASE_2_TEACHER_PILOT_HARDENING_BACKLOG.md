# Phase 2 Teacher And Pilot Operations Hardening Backlog

## Purpose

This backlog turns Phase 2 from [NEXORA_GAP_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/NEXORA_GAP_IMPLEMENTATION_PLAN.md:285) into an execution-ready plan for the active `edutech_web` product.

Use this document to decide:

- what to build first in the teacher and institute reliability lane
- what should be proven manually before pilot rollout
- what Playwright should deepen next for teacher and role-scope confidence
- what counts as Phase 2 complete

References:

- [TEACHER_MODULE_REVIEW.md](/Users/ansh/Documents/Eductech/TEACHER_MODULE_REVIEW.md:1)
- [TEACHER_MODULE_QA_CHECKLIST.md](/Users/ansh/Documents/Eductech/TEACHER_MODULE_QA_CHECKLIST.md:1)
- [PENDING_WORK_AND_AUTOMATION_STRATEGY.md](/Users/ansh/Documents/Eductech/PENDING_WORK_AND_AUTOMATION_STRATEGY.md:1)
- [PLAYWRIGHT_AUTOMATION_PHASED_ROADMAP.md](/Users/ansh/Documents/Eductech/PLAYWRIGHT_AUTOMATION_PHASED_ROADMAP.md:1)
- [ROLE_ACCESS_MATRIX.md](/Users/ansh/Documents/Eductech/ROLE_ACCESS_MATRIX.md:1)

## Phase 2 Goal

Make the teacher and institute workflow operationally reliable for pilot rollout.

In practice, this means one teacher should be able to:

- create an exam
- configure it confidently
- assign students and accommodations
- monitor attempts and interventions
- generate, rank, and publish results
- do all of the above without hidden backend-state surprises

## Current Reality

The teacher module is no longer an early prototype.
It is already a `strong beta`, with the best existing coverage in:

- question bank browsing and editing
- exam builder basics
- lifecycle actions on exam detail
- teacher results workspace breadth

The main remaining work is not route discovery.
It is operational clarity, workflow continuity, and route-by-route proof.

Current highest-value gaps:

- results lifecycle clarity across no-summary, pending, ready, and published states
- builder power-user polish after question linking
- assignment and accommodation confidence
- teacher monitoring and intervention truthfulness
- role and scope regression confidence across teacher, institute, admin, and student boundaries
- manual pilot sign-off with real seeded data

## Execution Order

1. Results and lifecycle clarity
2. Builder and linked-question management polish
3. Assignment, accommodation, and monitoring reliability
4. Manual QA and role-boundary verification
5. Playwright deepening for teacher and scope regression

## Workstream A. Results And Lifecycle Clarity

### Why this comes first

Results confusion creates the most visible pilot distrust.
If teachers cannot tell whether an exam is not ready, ready, or already published, every later operation feels risky.

### Ticket A1. Make result readiness states unmistakable

Problem:

- no summary
- not completed
- ready to publish
- published

These states are now supported better than before, but they still need sharper visual and copy separation.

Primary routes:

- [teacher results](/Users/ansh/Documents/Eductech/edutech_web/src/app/(teacher)/teacher/results/page.tsx:1)
- [teacher exam detail](/Users/ansh/Documents/Eductech/edutech_web/src/app/(teacher)/teacher/exams/[examId]/page.tsx:1)

Deliverables:

- clearer lifecycle state language
- stronger empty and waiting states
- more obvious action readiness for generate, rank, and publish
- published-state visibility that does not depend on banner memory

Acceptance:

- a teacher can tell the next valid result action within a few seconds
- no action looks available before backend state allows it

### Ticket A2. Align lifecycle truth across exams, detail, and results

Problem:

- lifecycle state exists across multiple routes, but the same exam can still feel differently described route to route

Primary routes:

- [teacher exams list](/Users/ansh/Documents/Eductech/edutech_web/src/app/(teacher)/teacher/exams/page.tsx:1)
- [teacher exam detail](/Users/ansh/Documents/Eductech/edutech_web/src/app/(teacher)/teacher/exams/[examId]/page.tsx:1)
- [teacher results](/Users/ansh/Documents/Eductech/edutech_web/src/app/(teacher)/teacher/results/page.tsx:1)

Acceptance:

- exam lifecycle, summary state, and result publication state stay consistent across all three surfaces

## Workstream B. Builder And Question-Link Management

### Why this comes second

The builder works, but Phase 2 should make it operationally smooth enough for repeated pilot use rather than one successful setup.

### Ticket B1. Strengthen post-link management

Problem:

- linking is strong, but post-link editing still feels basic for power users

Primary route:

- [teacher builder](/Users/ansh/Documents/Eductech/edutech_web/src/app/(teacher)/teacher/exams/[examId]/builder/page.tsx:1)

Deliverables:

- smoother reorder flow
- easier section moves
- clearer inline editing feedback for marks, negative marks, and mandatory flags
- better organization cues for linked questions

Acceptance:

- linked-question management feels like deliberate editing, not recovery from attach flows

### Ticket B2. Tighten builder workflow continuity

Problem:

- the builder is usable, but still feels like several tools sharing one page

Deliverables:

- stronger empty-state guidance
- clearer save feedback
- better handoff between setup, link questions, and assignment

Acceptance:

- one teacher can move from exam creation to exam-ready state without support hand-holding

## Workstream C. Assignment, Accommodation, And Monitoring Reliability

### Why this comes third

This is where pilot pressure becomes operational instead of cosmetic.
If assignment, accommodations, or intervention cues feel uncertain, teachers stop trusting the system during live usage.

### Ticket C1. Confirm assignment and accommodation truth

Primary route:

- [teacher builder](/Users/ansh/Documents/Eductech/edutech_web/src/app/(teacher)/teacher/exams/[examId]/builder/page.tsx:1)

Acceptance:

- assigned student counts stay consistent across list, detail, and builder
- accommodation fields persist and remain readable after reload
- empty-scope conditions are explained clearly

### Ticket C2. Harden live monitoring and intervention clarity

Primary route:

- [teacher results](/Users/ansh/Documents/Eductech/edutech_web/src/app/(teacher)/teacher/results/page.tsx:1)

Acceptance:

- partial analytics never look like full certainty
- intervention notes, force-submit availability, and health-state cues remain truthful

## Workstream D. Manual QA And Role Boundary Sign-Off

### Ticket D1. Execute the teacher browser pass

Run the teacher route-by-route sign-off from:

- [TEACHER_MODULE_QA_CHECKLIST.md](/Users/ansh/Documents/Eductech/TEACHER_MODULE_QA_CHECKLIST.md:1)

Acceptance:

- all critical teacher states are manually exercised against truthful backend records

### Ticket D2. Verify role and scope boundaries

Primary concern:

- no teacher route or dataset should leak admin, institute, or student-only behavior

Acceptance:

- role boundaries remain explicit and stable in login, redirects, scoped lists, and action visibility

## Workstream E. Playwright And Pilot Readiness Closeout

### Ticket E1. Expand teacher workflow assertions where confidence is still thin

Deepen automation around:

- results readiness matrix
- builder linked-question edits
- assignment persistence
- accommodation persistence
- monitoring and intervention visibility

Acceptance:

- teacher coverage protects key state transitions, not just route presence

### Ticket E2. Expand role and scope regression

Use the next Playwright wave for:

- institute vs teacher route access
- student and teacher boundary checks
- redirect behavior on unauthorized route entry
- scoped list visibility for teacher-owned and institute-owned records

Acceptance:

- multi-role regressions become harder to introduce silently

### Ticket E3. Phase 2 release gate

Phase 2 should only close when:

- teacher exam creation and builder flows feel reliable
- teacher can understand result readiness from UI alone
- monitoring and intervention cues remain truthful
- role boundaries do not leak across core routes
- manual and automated evidence both exist for pilot-critical workflows

Shared validation bundle:

- use [family_release_validation_bundle.sh](/Users/ansh/Documents/Eductech/scripts/family_release_validation_bundle.sh) as the current shared release-proof bundle for:
  - backend immediate-release regressions
  - AWS certification immediate-release validation
  - competitive delayed-release validation across NEET, JEE, and GRE

How to use it here:

- treat the script as supporting evidence for the family-release and institute-results side of Phase 2
- do not treat it as a replacement for the teacher-specific browser pass, builder QA, or role-boundary verification in this backlog
- recommended entrypoints:
  - `scripts/family_release_validation_bundle.sh`
  - `scripts/family_release_validation_bundle.sh --backend-only`
  - `scripts/family_release_validation_bundle.sh --playwright-only`

Operational note:

- run the script sequentially and preferably in isolation from other heavy local QA, because the longer mutable Playwright lanes can timeout under machine contention even when product behavior is correct

## Suggested Sprint Grouping

### Sprint 1

- A1 result readiness clarity
- A2 lifecycle cross-route consistency

### Sprint 2

- B1 post-link management polish
- B2 builder continuity

### Sprint 3

- C1 assignment and accommodation reliability
- C2 monitoring and intervention truth

### Sprint 4

- D1 manual QA closeout
- D2 role-boundary verification
- E1 and E2 Playwright closeout
- E3 release gate review

## Definition Of Done

Phase 2 is complete when:

- one teacher can create, configure, assign, monitor, and publish without support hand-holding
- builder, results, and monitoring no longer feel like strong beta edges
- teacher QA evidence exists route by route
- role and scope regressions are covered intentionally
- pilot rollout does not depend on unwritten operator knowledge
