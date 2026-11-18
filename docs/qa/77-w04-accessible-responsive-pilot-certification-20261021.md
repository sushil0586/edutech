# W04.05 accessible responsive pilot certification — 2026-10-21

## Result

W04.05 is complete for the critical objective-exam pilot tasks. The tested signup, student next-action/results routes, teacher creation/detail routes and operator keyboard handoffs have no unresolved accessibility or responsive blocker in the certified scope. Full-surface accessibility certification remains broader-release work.

This is a task-level pilot certification. It is not a blanket WCAG conformance claim.

## Verified coverage

| Area | Evidence | Result |
|---|---|---|
| Semantic structure and labels | Axe WCAG 2 A/AA, 2.1 AA and 2.2 AA rules on critical public and role routes | No serious or critical findings |
| Keyboard order and visible focus | Student reports, teacher exam detail/live monitor/question editor, institute live monitor/exam detail and skip/jump links | Passed in Chromium, Firefox and WebKit |
| Errors and announcements | Signup assertive error summary, invalid fields, disclosure focus, timer/save-state live-region contract | Passed; active-attempt-only rerun skipped because no disposable active attempt was configured |
| Responsive reflow | Login, signup and student results at 320 CSS px; learner and teacher critical actions at 390 px | No page-level horizontal spill; controls remained reachable |
| Cross-browser critical tasks | Signup recovery, student task priority and teacher wizard validation/focus | Passed in Chromium, Firefox and WebKit |
| Target mobile browsers | Same accessibility/reflow and critical-task slice on Pixel 7/Mobile Chrome and iPhone 13/Mobile Safari emulation | Passed |
| Objective content stress | Existing objective runtime evidence covers long exam labels, mathematical rendering, question media and saved-answer recovery | Retained from W03 objective certification |
| Translation | The pilot web experience offers English only | No translated UI is in the certified scope |

Desktop result: **36 passed, 3 skipped, 0 failed** across Chromium, Firefox and WebKit.

Mobile result: **14 passed, 2 skipped, 0 failed** across Mobile Chrome and Mobile Safari emulation.

The skips are the same credential-gated active-attempt live-region test once per project. The Docker stack had no disposable active attempt credential and ID. The timer, save-state and recovery contract remains covered by the objective attempt runtime evidence; this pass did not mutate an exam attempt merely to repeat that proof.

## Correction made during certification

The original keyboard helper assumed every browser advances through links with plain `Tab`. WebKit on macOS follows Safari's platform behavior and uses `Alt+Tab` for link traversal unless full keyboard access is enabled. The helper now uses the browser-appropriate traversal key. A transient Firefox navigation after a live refresh now uses the existing bounded runtime-recovery helper. No product behavior was changed by these test corrections.

## Evidence

- [Machine-readable verification summary](evidence/w04-accessible-responsive-20261021/verification-summary.json)
- [Signup recovery screenshot — Mobile Chrome](evidence/w04-accessible-responsive-20261021/screenshots/signup-mobile-chrome.png)
- [Signup recovery screenshot — Mobile Safari](evidence/w04-accessible-responsive-20261021/screenshots/signup-mobile-safari.png)
- [Teacher critical action screenshot — Mobile Chrome](evidence/w04-accessible-responsive-20261021/screenshots/teacher-mobile-chrome.png)
- [Teacher critical action screenshot — Mobile Safari](evidence/w04-accessible-responsive-20261021/screenshots/teacher-mobile-safari.png)
- [W03 objective recovery evidence](65-w03-objective-recovery-verification-20261021.md)
- [W04 learner activation evidence](76-w04-learner-signup-activation-20261021.md)

## Remaining broader-release work

Full manual assistive-technology sessions, physical-device coverage, every dense administration surface, and any future translated experience remain outside this pilot gate. Those items must be verified before making product-wide accessibility claims.
