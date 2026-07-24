# Release Operations Note

Date: Friday, July 24, 2026
Audience: Product owner, engineering, QA, release operator
Purpose: Convert the current release recommendation into an execution-ready operating note

## Recommended Release Decision

Release now with monitoring.

Approved scope:

- student web app
- student mobile-web/browser experience
- core student Android app-shell exam journey
- core student iPhone app-shell exam journey
- teacher browser scope
- institute browser scope
- operator/admin browser scope
- shared cross-role mobile report/browser system

Not approved to claim:

- full broader native-app parity
- entire platform across every role and every module
- entire platform fully native-app signed off
- any teacher, institute, or operator native-app validation claim

## Final Pre-Release Checkpoint

Run date: Friday, July 24, 2026

- High-value Chromium checkpoint result: `34 passed (2.8m)`
- The checkpoint covered:
  - student exams, exam detail, attempt runtime, results, and post-submit
  - student mobile shell, mobile analytics, and mobile report surfaces
  - shared cross-role mobile report and dense mobile browser packs
  - admin exams and reports workspace
  - teacher exams, reports, and results workspace
  - institute exams, reports, and results workspace

## Monitoring Watchpoints

- Student analytics:
  Keep an eye on dense data layouts and any high-friction navigation or state drift.

- Wallet and subscriptions:
  Watch settlement, credit visibility, and operator/institute-driven follow-through.

- Teacher, institute, and operator broader browser modules:
  Watch deeper module depth that was not part of the final focused checkpoint.

- Shared cross-role mobile report/browser system:
  Watch for mobile layout regressions, especially on dense report states and empty states.

## Release Boundary Wording

Use this wording in release threads and approvals:

`Approve release for the validated student web, mobile-browser, and core Android/iPhone app-shell exam scope, with monitoring on broader browser modules and without claiming full native-app or whole-platform signoff.`

## Immediate Post-Release Backlog

1. Extend student Android and iPhone app-shell proof beyond the core exam journey.
2. Validate parent deeper workflows explicitly.
3. Continue module-by-module whole-platform signoff rather than using broad blanket language.
4. Keep a focused regression lane for shared mobile report/browser surfaces.

## Source Docs

- [LEADERSHIP_RELEASE_NOTE_2026-07-24.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/LEADERSHIP_RELEASE_NOTE_2026-07-24.md)
- [STAKEHOLDER_SIGNOFF_NOTE_2026-07-23.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAKEHOLDER_SIGNOFF_NOTE_2026-07-23.md)
- [FINAL_RELEASE_SCORECARD_2026-07-23.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FINAL_RELEASE_SCORECARD_2026-07-23.md)
