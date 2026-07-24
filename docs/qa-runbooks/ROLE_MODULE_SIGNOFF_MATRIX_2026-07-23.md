# Role Module Signoff Matrix

Date: Thursday, July 23, 2026
Purpose: Explicit release-control matrix for role-by-role and module-by-module signoff
Audience: Product owner, QA, engineering, release reviewers

## Status Legend

- `Validated end to end`: Real user path exercised with strong evidence
- `Validated visually only`: Surface reviewed visually, but not fully behavior-proven
- `Partially validated`: Meaningful validation exists, but not enough for full signoff
- `Not validated`: No trustworthy release-level validation yet

## Release Legend

- `Go`: Safe to include in release
- `Go with monitoring`: Acceptable, but needs production watchpoints
- `Hold`: Not yet fully signed off
- `Deferred`: Not part of current release claim

## Confidence Legend

- `High`
- `Medium`
- `Low`

## Executive Read

As of Thursday, July 23, 2026:

- Student core exam journey is now strong across web, Android app shell, and iPhone app shell.
- Admin, institute, and teacher route-level browser coverage remain broadly strong based on earlier role coverage baselines.
- The biggest remaining release ambiguity is no longer the core student exam flow.
- The main open hardening areas are:
  - secondary student surfaces
  - full-platform module-by-module signoff clarity
  - broad native-app claims beyond the actually tested scope

## Student

| Module | Validation Status | Confidence | Release | Notes |
| --- | --- | --- | --- | --- |
| Auth and login | Validated end to end | High | Go | Web and mobile app shell login paths exercised successfully. |
| Dashboard | Validated end to end | High | Go | Student dashboard navigation and primary actions verified in browser/device profiles. |
| Exam discovery | Validated end to end | High | Go | Android and iPhone app shell exam discovery validated; iPhone exams surfacing bug was fixed and revalidated. |
| Exam detail / readiness | Validated end to end | High | Go | Real exam detail and readiness state validated on iPhone and Android app shells. |
| Attempt runtime | Validated end to end | High | Go | Start attempt, question rendering, option labeling, save behavior, and next-question transition validated. |
| Attempt save / submit / summary | Validated end to end | High | Go | Save-and-next, submit confirmation, and attempt summary validated on iPhone and earlier on Android. |
| Attempts history | Validated end to end | High | Go | Web workspace, mobile reachability, and attempts-history contract all passed in the latest parity rerun. |
| Results | Validated end to end | High | Go | Web workspace, mobile reachability, and student mobile results visual contract all passed in the latest parity rerun. |
| Analytics | Validated end to end | Medium-High | Go with monitoring | Mobile route reachability and current visual contract passed in the latest parity rerun; keep modest monitoring because analytics density remains higher than other student modules. |
| Weak areas / study recommendations / utility reports | Partially validated | Medium | Go with monitoring | Significant work exists, but not all student-secondary surfaces were re-signed off in the latest pass. |
| Notifications | Validated end to end | High | Go | Browser E2E now covers notifications entry, empty/load states, mark-read actions, filtering, grouping, and route handoffs. |
| Subscriptions | Validated end to end | Medium-High | Go with monitoring | Browser E2E covers subscription state, plan/order sections, filter persistence, and wallet handoff; payment confirmation remains operator-driven. |
| Wallet | Validated end to end | Medium-High | Go with monitoring | Browser E2E covers wallet state, balance visibility, plan comparison, ledger/history states, and subscription handoff; financial settlement still depends on upstream operator processing. |
| Profile / settings deeper flows | Validated end to end | High | Go | Current product scope is now explicit: profile is an account-verification surface and settings is a session/support hub, both browser-validated with route handoffs and session-control coverage. |

## Teacher

| Module | Validation Status | Confidence | Release | Notes |
| --- | --- | --- | --- | --- |
| Auth and shell | Validated end to end | High | Go | Strong earlier browser coverage baseline. |
| Dashboard | Validated end to end | High | Go | Route-level and workflow coverage already strong. |
| Exams and builder | Validated end to end | High | Go | Earlier workflow and route coverage support signoff. |
| Question bank | Validated end to end | High | Go | Strong route-level coverage and mutable proof in earlier passes. |
| Results / reviews | Partially validated | Medium-High | Go with monitoring | Strong route coverage exists, but final lifecycle depth should remain in regression. |
| Reports desktop surfaces | Partially validated | Medium-High | Go with monitoring | Direction is strong, but student-level report detail signoff should stay visible. |
| Reports mobile visual system | Validated end to end | High | Go with monitoring | Shared mobile report visuals passed the focused visual suite and the broader cross-role mobile regression bundle on Thursday, July 23, 2026. |
| Search | Validated end to end | High | Go | Covered in earlier route baseline. |
| Settings / deeper secondary surfaces | Partially validated | Medium | Go with monitoring | Needs explicit deeper-flow audit if included in release narrative. |

## Institute

| Module | Validation Status | Confidence | Release | Notes |
| --- | --- | --- | --- | --- |
| Auth and shell | Validated end to end | High | Go | Strong earlier browser coverage baseline. |
| Dashboard | Validated end to end | High | Go | Previously validated strongly. |
| Academic setup | Validated end to end | High | Go | Strong earlier workflow coverage. |
| Exams mutable flows | Validated end to end | High | Go | Earlier institute mutable exam flow passed. |
| People / roster | Validated end to end | High | Go | Earlier mutable roster flow passed. |
| Question bank | Validated end to end | High | Go | Route and workflow continuity previously strong. |
| Results / live / reviews | Validated end to end | High | Go | Earlier continuity and visual contracts were strong. |
| Reports desktop surfaces | Validated end to end | High | Go | Earlier desktop report visual contracts and continuity were strong. |
| Reports mobile visual system | Validated end to end | High | Go with monitoring | Shared mobile report visuals passed the focused visual suite and the broader cross-role mobile regression bundle on Thursday, July 23, 2026. |
| Search / security / settings | Partially validated | Medium-High | Go with monitoring | Earlier route coverage is strong, but module-level final signoff should stay explicit. |

## Operator / Admin

| Module | Validation Status | Confidence | Release | Notes |
| --- | --- | --- | --- | --- |
| Auth and shell | Validated end to end | High | Go | Strong earlier baseline and route coverage. |
| Dashboard | Validated end to end | High | Go | Broad browser proof exists. |
| Institutes / people / academic setup | Validated end to end | High | Go | Strong earlier CRUD and workspace evidence. |
| Economy / package controls | Validated end to end | High | Go | Earlier hardening boards show strong browser proof. |
| Exams / advanced / preset / builder | Validated end to end | High | Go | Strong earlier mutable and route-level evidence. |
| Reports desktop surfaces | Partially validated | Medium-High | Go with monitoring | Strong desktop report continuity exists, and the related mobile report bundle is now green; broader admin report depth can still stay under monitoring. |
| Reports mobile visual system | Validated end to end | High | Go with monitoring | Shared mobile report visuals passed the focused visual suite and the broader cross-role mobile regression bundle on Thursday, July 23, 2026. |
| Search / security / settings | Validated end to end | High | Go | Route coverage baseline is strong. |

## Parent

| Module | Validation Status | Confidence | Release | Notes |
| --- | --- | --- | --- | --- |
| Overall parent surface | Partially validated | Medium | Go with monitoring | Earlier scorecards suggest guarded confidence, but this role was not part of the latest deep validation wave. |
| Parent-specific deeper workflows | Not validated | Low | Hold | Requires explicit current-cycle validation before strong release claim. |

## Native-App Claim Boundary

| Claim Area | Validation Status | Confidence | Release | Notes |
| --- | --- | --- | --- | --- |
| Android app shell student core exam journey | Validated end to end | High | Go | Strong evidence exists for core student exam flow. |
| iPhone app shell student core exam journey | Validated end to end | High | Go | Build, discovery, start, save, submit, and summary all validated. |
| Student mobile-web experience across validated student modules | Validated end to end | High | Go | Core exam journey plus attempts, results, analytics, notifications, wallet, subscriptions, profile, and settings now have strong browser/mobile-web coverage across Chromium and the targeted WebKit parity pack. |
| Full student native app across validated student modules | Partially validated | Medium | Hold | Native app-shell evidence is still strongest for the core exam journey. Broader student modules now have strong mobile-web/browser proof, but that is not the same as end-to-end Android and iPhone app-shell proof. |
| Entire platform fully native-app signed off | Not validated | Low | Hold | This claim is broader than our tested evidence. |

## Release Summary

### Safe To Say Now

- Student exam-taking experience is strong across web, Android app shell, and iPhone app shell.
- Admin, institute, and teacher role surfaces are broadly strong in browser coverage.
- Institute desktop report continuity is strong.
- Student notifications are now validated in browser coverage.
- Student wallet and subscriptions are now validated for current web-surface behavior, with monitoring on settlement-dependent states.
- Teacher, institute, and operator shared mobile report surfaces are now green in the focused suite and the broader cross-role mobile regression bundle on Thursday, July 23, 2026.
- Student attempts history and results are now stronger in browser coverage, and both remain reachable in mobile student navigation.
- Student attempts, results, and analytics parity improved materially in the latest Chromium mobile/browser rerun on Thursday, July 23, 2026.
- Student mobile route reachability and targeted visual parity also passed on WebKit on Thursday, July 23, 2026.
- Student mobile-web/browser confidence is now high across Chromium and the targeted WebKit pack.

### Do Not Overclaim Yet

- Entire platform across every role and module is not yet fully signed off.
- The student app does not currently expose a rich editable in-shell preferences module; do not describe Profile/Settings as a deep self-serve account editing system.
- Full native-app parity beyond the validated student scope is not yet fully signed off.
- Strong mobile-web/browser evidence should not be described as if it were full Android and iPhone app-shell evidence.

## Immediate Next Hardening Priorities

1. Extend the now-stronger student-secondary confidence to Android and iPhone app shells if those modules are part of the native release claim.
2. Publish final release wording that separates:
   - web and mobile-web scope
   - Android app-shell scope
   - iPhone app-shell scope
