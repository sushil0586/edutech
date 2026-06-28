# Institute And Teacher 9 To 10 Confidence Plan

This plan focuses on the biggest current readiness drag:

- institute operational consistency
- teacher operational consistency
- entitlement-driven authoring clarity

Current rating:

- institute / teacher operational consistency: `6.5/10`

Target rating:

- institute / teacher operational consistency: `9/10`

## What Was Already Strong

The current product already has strong structural coverage for:

- exam list and exam detail
- builder and advanced builder routes
- question-bank inventory
- shared-library entitlement enforcement
- paused entitlement builder blocking
- paused entitlement publish-readiness blocking
- results and review workspace access

This means the gap is not “missing whole modules.”
The gap is operational clarity, repeatability, and final role-proof under real pilot usage.

## Hardening Improvement Applied Now

The shared-library workspace now makes the role contract explicit:

- teacher lane is `request-only`
- institute lane is `direct-link when entitled`

This reduces ambiguity in the exact area that most often creates operator confusion during subscription-gated authoring.

Changed files:

- [teacher-question-bank-workspace.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/teacher-question-bank-workspace.tsx:533)
- [teacher/question-bank/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(teacher)/teacher/question-bank/page.tsx:533)
- [institute/question-bank/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(institute)/institute/question-bank/page.tsx:560)

## Remaining Work To Reach 9/10

## P0. Role Contract Proof

Goal:

- no institute or teacher operator is confused about what is allowed, blocked, or request-only

Tasks:

1. Verify institute shared-library states end to end:
   - no entitlement
   - active entitlement
   - paused entitlement
   - quota exhausted
   - near publish limit

2. Verify teacher shared-library states end to end:
   - no entitlement
   - request submitted
   - active package match but request-only lane
   - paused entitlement on already-linked content
   - publish blocker state

3. Ensure all blocked states show actionable copy:
   - what is blocked
   - why it is blocked
   - who can unblock it

Acceptance:

- a pilot teacher or institute admin can correctly predict the next valid action from the UI alone

## P0. Authoring Repeatability

Goal:

- institute and teacher can repeat the same authoring flow without operator rescue

Tasks:

1. Run one fresh full institute-admin authoring cycle:
   - create question or link licensed question
   - create exam
   - attach question
   - configure schedule
   - publish
   - verify student visibility

2. Run one fresh full teacher authoring cycle:
   - create teacher-owned question
   - create exam
   - attach question
   - configure schedule
   - publish
   - verify student visibility

3. Run one licensed-question cycle for each:
   - institute direct link path
   - teacher request-led path

Acceptance:

- each role can complete at least one private-content flow and one licensed-content flow cleanly

## P0. Pilot Automation Closure

Goal:

- critical institute/teacher behavior is proven by automation, not memory

Tasks:

1. Re-run mutable institute shared-library suites.
2. Re-run mutable teacher shared-library suites.
3. Re-run institute and teacher exam mutable authoring suites.
4. Capture exact green list for pilot signoff.

Acceptance:

- institute and teacher critical mutable suites are green in a clean seeded state

## P1. Operator Runbook Closure

Goal:

- rollout does not depend on unwritten setup knowledge

Tasks:

1. Create one institute/teacher pilot operator checklist:
   - required entitlements
   - required feature flags
   - expected package scope
   - role behavior rules

2. Add “if blocked, check these 3 things” guidance:
   - shared-library feature entitlement
   - matching package entitlement
   - quota / publish allowance status

Acceptance:

- another operator can prepare one pilot institute from the runbook alone

## P1. Manual UAT Evidence

Goal:

- real pilot roles prove the flows, not just internal automation

Tasks:

1. Have one institute admin perform guided authoring and release.
2. Have one teacher perform guided authoring and release.
3. Record:
   - confusion points
   - blockers
   - terminology issues
   - entitlement misunderstandings

Acceptance:

- no blocker issues remain after one external UAT pass per role

## Fastest Path To 9/10

Do these in order:

1. Re-run institute and teacher mutable authoring + entitlement suites
2. Run one real manual institute-admin authoring cycle
3. Run one real manual teacher authoring cycle
4. Close any wording or blocker-state gaps found
5. Freeze a pilot-safe runbook

## What Still Does Not Need To Be Done Yet

To avoid over-engineering, do not prioritize these before the above:

- advanced collaboration workflows
- high-scale grading throughput optimization
- heavy authoring polish for rich media edge cases
- deep analytics polish
- broad reporting expansion

## Success Definition

Institute and teacher are at `9/10` when:

- both roles can author and release without hidden setup knowledge
- entitlement-driven blocking is truthful and understandable
- licensed-content rules are explicit in the UI
- mutable regression evidence is green
- one real pilot UAT pass per role succeeds without blocker defects
