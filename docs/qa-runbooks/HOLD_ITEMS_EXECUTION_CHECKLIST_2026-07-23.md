# Hold Items Execution Checklist

Date: Thursday, July 23, 2026
Purpose: Convert current `Hold` release areas into an execution-ready closure checklist
Audience: Product owner, QA, engineering, release reviewers
References:
- `docs/qa-runbooks/PLATFORM_SIGNOFF_HARDENING_BOARD_2026-07-23.md`
- `docs/qa-runbooks/ROLE_MODULE_SIGNOFF_MATRIX_2026-07-23.md`

## How To Use This Checklist

- Treat each section as a release gate, not just a test reminder.
- Do not upgrade a `Hold` item until all required evidence exists.
- If product decides an area is out of scope for the current release, mark it `Deferred` explicitly instead of leaving it ambiguous.
- For every completed item, attach evidence links: test output, screenshots, videos, logs, and any updated snapshots.

## Current Hold Areas

| Area | Current Confidence | Current Release State | Closure Path |
| --- | --- | --- | --- |
| Mobile report visual systems across operator, teacher, institute | High | Go with monitoring | Focused mobile visual suite and broader cross-role mobile regression evidence are complete |
| Student notifications | High | Go | Browser E2E validation completed |
| Student subscriptions | Medium-High | Go with monitoring | Browser E2E validation completed; settlement remains upstream-dependent |
| Student wallet | Medium-High | Go with monitoring | Browser E2E validation completed; settlement remains upstream-dependent |
| Student profile/settings deeper flows | High | Go | Current product scope is explicit and browser-validated as account visibility, route handoff, and session controls |
| Native-app claims beyond validated student core exam journey | Medium-Low | Hold | Narrow claim wording or broaden tested mobile evidence |

## Workstream 1: Mobile Report Visual Systems

### Objective

Ship shared mobile report surfaces that feel intentional, readable, and stable across operator, teacher, and institute roles on narrow Android and iPhone widths.

### In Scope

- teacher mobile subject report hero
- teacher mobile topic-mastery hero
- teacher mobile wrong-questions hero
- teacher mobile time-management hero
- institute mobile wrong-questions hero
- institute mobile subject hero
- institute mobile topic-mastery hero
- institute mobile time-management hero
- institute mobile learner-detail hero
- shared analytics hero behavior in `edutech_web/src/app/globals.css`

### Required Functional And Visual Checks

1. Hero block uses a deliberate mobile stack with no awkward vertical inflation.
2. Headline, supporting copy, chips, KPIs, and CTA controls remain visible without clipping.
3. Long report titles, long learner names, and dense metadata do not overflow or overlap.
4. Empty-state reports still preserve spacing and hierarchy.
5. Dense-data reports remain readable with no broken card rhythm.
6. Narrow Android and narrow iPhone widths both retain tappable controls.
7. Visual snapshot diffs are intentionally reviewed before snapshot refresh.

### Required Test Coverage

- Run the failing mobile report visual suite first:
  - `edutech_web/tests/e2e/workflow/operator-mobile-report-surfaces-visual.spec.ts`
- Re-run related role visual suites after the shared hero fix:
  - `edutech_web/tests/e2e/workflow/teacher-report-surfaces-visual.spec.ts`
  - `edutech_web/tests/e2e/workflow/institute-report-surfaces-visual.spec.ts`
- Re-run broader mobile report continuity where relevant:
  - operator mobile reports workflow
  - teacher mobile report continuity if present in current suite
  - institute mobile report continuity if present in current suite

### Device Coverage Required

- Chromium mobile Android-width profile
- WebKit iPhone-width profile if available in local suite
- Manual browser inspection at one narrow Android width and one narrow iPhone width

### Evidence Required

- Passing visual test run output
- Approved before/after screenshots for each previously failing hero
- Snapshot refresh only after visual review approval
- Short notes on any intentional mobile layout tradeoffs

### Exit Criteria

- All nine named mobile hero failures are resolved
- No new cross-role mobile report regressions are introduced
- Shared hero system is visually consistent across operator, teacher, and institute
- Release state can be upgraded from `Hold` to `Go` or `Go with monitoring`

## Workstream 2: Student Notifications

### Objective

Decide whether notifications are truly part of the release claim and, if yes, prove the experience is understandable and stable for a student.

### Product Decision Required First

- `Live`: notifications are expected in production and must be validated
- `Deferred`: not part of current student-ready claim
- `Stubbed intentionally`: visible surface is acceptable only if clearly communicated and not misleading

### Required Functional Checks If Live

1. Notifications entry point is visible from the student navigation model.
2. Unread/read states are visually distinguishable.
3. Empty state is clear and does not look broken.
4. Notification detail opens correctly if actionable.
5. Back navigation returns the student cleanly.
6. Error/loading states are understandable.
7. Mobile layout remains tappable and readable.

### Test Coverage Required

- Browser E2E on student web experience
- Android app shell verification if notifications are part of mobile claim
- iPhone app shell verification if notifications are part of mobile claim

### Evidence Required

- One successful flow capture
- One empty-state capture
- One failure/error-state observation if such state can be induced safely

### Thursday, July 23, 2026 Evidence

- Browser E2E passed in `edutech_web/tests/e2e/workflow/student-notifications-workspace.spec.ts`
- Proven states include:
  - entry and page load
  - setup/load issue fallbacks
  - empty state
  - mark-read action
  - mark-all-read action when enabled
  - filter and grouping changes
  - notification route handoff

### Current Decision

- `Go`

## Workstream 3: Student Subscriptions

### Objective

Validate that subscription-related student surfaces, if release-scoped, clearly communicate plan state, entitlement state, and available actions.

### Product Decision Required First

- `Live`
- `Deferred`
- `Stubbed intentionally`

### Required Functional Checks If Live

1. Subscription entry point is discoverable.
2. Current plan or status is understandable.
3. Any renew/upgrade/request action is visible and behaves predictably.
4. Empty or no-plan state is not misleading.
5. Error or unavailable state is handled gracefully.
6. Mobile layout preserves action visibility.

### Test Coverage Required

- Student web browser flow
- Android app shell if included in mobile release claim
- iPhone app shell if included in mobile release claim

### Evidence Required

- Live-state or no-plan-state capture
- Action-path capture
- Notes on whether the module is self-serve, request-only, or informational

### Thursday, July 23, 2026 Evidence

- Browser E2E passed in `edutech_web/tests/e2e/workflow/student-utility-workspace.spec.ts`
- Proven states include:
  - subscriptions entry and load
  - plan/order section visibility
  - rows and section filter persistence
  - wallet handoff
  - active-plan and no-plan style states

### Current Decision

- `Go with monitoring`

### Residual Risk

- Subscription request confirmation and crediting still depend on operator-side settlement workflows rather than a fully student-controlled flow

## Workstream 4: Student Wallet

### Objective

Verify that wallet surfaces are trustworthy from a student perspective or explicitly remove them from the release claim.

### Product Decision Required First

- `Live`
- `Deferred`
- `Stubbed intentionally`

### Required Functional Checks If Live

1. Wallet entry point is discoverable.
2. Balance display is legible and credible.
3. Transaction history loads correctly if present.
4. Empty-state wallet is clear.
5. Any add-money, payout, or usage action is either supported cleanly or hidden intentionally.
6. Failure states do not silently mislead the student.
7. Mobile layout keeps financial values and actions readable.

### Test Coverage Required

- Student web browser flow
- Android app shell if wallet is in the mobile claim
- iPhone app shell if wallet is in the mobile claim

### Evidence Required

- Balance-state capture
- Empty/history-state capture
- Notes on whether the wallet is transactional or informational in the current release

### Thursday, July 23, 2026 Evidence

- Browser E2E passed in `edutech_web/tests/e2e/workflow/student-utility-workspace.spec.ts`
- Proven states include:
  - wallet entry and load
  - balance visibility
  - star-pack or subscription-plan visibility
  - empty/history messaging
  - ledger and unlock-history states
  - subscriptions handoff

### Current Decision

- `Go with monitoring`

### Residual Risk

- Order settlement and final credit timing depend on upstream operator/institute processing rather than a fully instant learner-controlled transaction path

## Workstream 5: Student Profile And Settings Deeper Flows

### Objective

Prove the real released scope of student profile and settings clearly, without overclaiming a deep editable preferences system that the product does not currently expose.

### Thursday, July 23, 2026 Current Reality

- Browser coverage proves profile and settings navigation and account-state visibility
- Dedicated settings browser coverage passed in `edutech_web/tests/e2e/workflow/student-settings-workspace.spec.ts`
- Mobile utility browser coverage passed in `edutech_web/tests/e2e/workflow/student-mobile-utility-workspace.spec.ts`
- Current student settings surface is intentionally informational, session-oriented, and support-guidance oriented
- Current student profile surface is intentionally identity/context visibility oriented
- The current product does not expose rich in-shell edit/save preference flows, so there is no deeper editable settings contract to sign off today

### Required Functional Checks

1. Profile page opens from student navigation reliably.
2. Basic edit flows work for supported fields.
3. Save action gives clear feedback.
4. Saved state persists after reload or relaunch.
5. Validation errors are understandable.
6. Logout, session return, and re-entry do not corrupt profile state.
7. Mobile layout keeps form controls, buttons, and validation messages visible.

### Strongly Recommended Additional Checks

1. Avatar or profile media upload behavior, if present
2. Password or security preference flow, if present
3. Notification preference toggle persistence, if present
4. Language/theme/device-specific preferences, if present

### Test Coverage Required

- Student web browser flow
- Android app shell deeper-flow check
- iPhone app shell deeper-flow check

### Evidence Required

- Save-success capture
- Validation-error capture
- Reload-or-relaunch persistence proof

### Current Decision

- `Go`

### Release Wording Constraint

- Describe these surfaces as account verification, session control, and support-routing pages
- Do not describe them as a deep self-serve learner account editing system

## Workstream 6: Native-App Claim Boundary

### Objective

Ensure release language matches the mobile evidence we actually have, and do not overclaim full native-app coverage beyond the validated scope.

### Current Strongly Validated Scope

- Android app shell student core exam journey
- iPhone app shell student core exam journey

### Claim Areas That Still Need Explicit Treatment

- attempts history depth
- results depth
- analytics depth
- notifications
- subscriptions
- wallet
- profile/settings deeper flows
- any teacher/institute/operator native-app implication

### Required Checks Before Broadening Mobile Claims

1. Relaunch behavior for every claimed mobile module
2. Session restore behavior for every claimed mobile module
3. Network interruption tolerance for every claimed mobile module
4. Visual sanity at least on one Android device profile and one iPhone device profile
5. Clear proof that claimed modules are not only reachable, but usable end to end

### Evidence Required

- Module-by-module mobile validation notes
- Exact release wording draft
- Explicit statement of what is not claimed

### Thursday, July 23, 2026 Evidence Update

- Passed:
  - `edutech_web/tests/e2e/workflow/student-attempts-workspace.spec.ts`
  - `edutech_web/tests/e2e/workflow/student-results-workspace.spec.ts`
  - `edutech_web/tests/e2e/workflow/student-mobile-sanity-workspace.spec.ts`
  - `edutech_web/tests/e2e/workflow/student-mobile-dashboard-analytics-visual.spec.ts`
  - `edutech_web/tests/e2e/workflow/student-mobile-report-surfaces-visual.spec.ts`
- Additional WebKit note:
  - `student-mobile-sanity-workspace` passed on WebKit for route reachability
  - WebKit baselines were intentionally established and the targeted student mobile WebKit rerun passed on Thursday, July 23, 2026

### Current Interpretation

- Attempts history:
  - web scope is strong
  - mobile-web/browser reachability is strong
  - current browser/mobile parity pack is green
- Results:
  - web scope is strong
  - mobile-web/browser reachability is strong
  - current browser/mobile visual contract is green
- Analytics:
  - route reachability is strong
  - current mobile visual contract is green
  - continue modest monitoring because analytics density is still high
- WebKit / iPhone-style browser lane:
  - route reachability is strong
  - targeted visual signoff is now complete for the current student mobile parity pack
- Native app-shell lane:
  - current strongest direct evidence is still the Android and iPhone student core exam journey
  - broader student-secondary modules should not yet be claimed as fully native-app validated only because browser/mobile-web coverage is strong

### Current Decision

- Broader student mobile-web/browser parity is now substantially stronger
- Keep the broad native-app claim itself on `Hold` until Android and iPhone app-shell evidence matches the exact release wording

### Exit Criteria

- Release language is narrowed to validated scope or the missing mobile modules are validated

## Recommended Execution Order

1. Finish Workstream 1 first because mobile report visuals are the most explicit named cross-role gap.
2. Make scope decisions for notifications, subscriptions, and wallet before spending engineering time.
3. Validate profile/settings deeper flows because they are more likely to be release-relevant than wallet or subscriptions.
4. Revisit results, analytics, and attempts history on mobile only if product wants a broader student mobile claim.
5. Publish final native-app wording only after the above choices are complete.

## Definition Of Closure

An item can move out of `Hold` only when all of the following are true:

- the release scope is explicit
- the intended user path was tested through browser or device flows, not assumed
- evidence exists for both happy path and at least one boundary state
- product wording matches actual tested behavior
- residual risk is small enough to explain confidently in a release review

## Final Release Decision Template

Use this format for each current `Hold` area after execution:

| Area | Final Decision | Confidence | Evidence Complete | Notes |
| --- | --- | --- | --- | --- |
| Mobile report visual systems | `Go` / `Go with monitoring` / `Hold` / `Deferred` | High / Medium / Low | Yes / No | Short release note |
| Notifications | `Go` / `Go with monitoring` / `Hold` / `Deferred` | High / Medium / Low | Yes / No | Short release note |
| Subscriptions | `Go` / `Go with monitoring` / `Hold` / `Deferred` | High / Medium / Low | Yes / No | Short release note |
| Wallet | `Go` / `Go with monitoring` / `Hold` / `Deferred` | High / Medium / Low | Yes / No | Short release note |
| Profile/settings deeper flows | `Go` / `Go with monitoring` / `Hold` / `Deferred` | High / Medium / Low | Yes / No | Short release note |
| Native-app claim boundary | `Go` / `Go with monitoring` / `Hold` / `Deferred` | High / Medium / Low | Yes / No | Short release note |
