# Platform Signoff Hardening Board

Date: Thursday, July 23, 2026
Owner view: Product hardening and release signoff
Scope: Entire platform across roles, mobile report visual systems, secondary student surfaces, and native-app claim boundaries

## Status Legend

- `Go`: validated strongly enough for release
- `Go with monitoring`: acceptable for release, but needs watchpoints
- `Hold`: not yet fully signed off

## Confidence Legend

- `High`: validated end to end and behavior is stable
- `Medium`: validated partially or with known boundary conditions
- `Low`: not yet validated enough to trust for release

## Workstreams

| ID | Workstream | Current Status | Confidence | Release Status | Goal |
| --- | --- | --- | --- | --- | --- |
| WS-1 | Role-by-role platform signoff matrix | In progress | Medium | Hold | Make every role/module status explicit |
| WS-2 | Mobile report visual systems across operator/teacher/institute | Completed | High | Go with monitoring | Shared mobile report visuals and broader cross-role mobile regression bundle are green |
| WS-3 | Secondary student surfaces: notifications, subscriptions, wallet, profile/settings | Not fully validated | Low | Hold | Validate or explicitly defer non-core student modules |
| WS-4 | Native-app claim hardening | In progress | Medium | Hold | Match release wording to validated mobile scope |
| WS-5 | Final release regression and executive signoff | Pending | Low | Hold | Publish defensible go/no-go outcome |

## Task Board

| ID | Area | Task | Priority | Validation Type | Exit Criteria | Owner Suggestion | Confidence Target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PO-01 | Platform matrix | Build one role/module signoff matrix for Student, Teacher, Institute, Operator/Admin | P0 | Audit + documentation | Every role/module marked `Validated end to end`, `Visual only`, `Partial`, or `Not validated` | QA + Product | High |
| PO-02 | Platform matrix | Add release gate per module: `Go`, `Go with monitoring`, `Hold` | P0 | Audit + documentation | No module left with ambiguous status | Product | High |
| PO-03 | Platform matrix | Attach confidence score per module | P0 | Audit + documentation | Every module has explicit confidence | Product | High |
| MR-01 | Mobile reports | Re-run shared mobile report hero visual audit across teacher and institute | P0 | Visual regression | No clipped hero text, stacked CTA breakage, or awkward tall hero blocks | Frontend | High |
| MR-02 | Mobile reports | Validate operator mobile report surfaces on narrow Android and iPhone widths | P0 | Visual + manual E2E | All intended report actions reachable and readable | Frontend + QA | High |
| MR-03 | Mobile reports | Validate long-text, empty-state, and dense-data states across shared mobile report components | P0 | Visual regression | No overflow, overlap, or hidden controls | Frontend | High |
| MR-04 | Mobile reports | Refresh only the approved mobile report snapshots after intentional visual review | P1 | Snapshot governance | Snapshots reflect intended product visuals, not accidental drift | QA | High |
| ST-01 | Student secondary | Decide production scope for notifications | P0 | Product decision | Mark as `Live`, `Deferred`, or `Stubbed intentionally` | Product | High |
| ST-02 | Student secondary | Validate notifications open, render, empty state, and error state | P1 | Browser/device E2E | Notifications path behaves clearly in supported states | QA | High |
| ST-03 | Student secondary | Decide production scope for subscriptions | P0 | Product decision | Mark as `Live`, `Deferred`, or `Stubbed intentionally` | Product | High |
| ST-04 | Student secondary | Validate subscriptions discovery, state display, and action flow | P1 | Browser/device E2E | Subscription surface is understandable and stable | QA | Medium-High |
| ST-05 | Student secondary | Decide production scope for wallet | P0 | Product decision | Mark as `Live`, `Deferred`, or `Stubbed intentionally` | Product | High |
| ST-06 | Student secondary | Validate wallet balance, transaction visibility, and failure/empty states | P1 | Browser/device E2E | Wallet path is trustworthy for a student | QA | Medium-High |
| ST-07 | Student secondary | Validate profile/settings deeper flows: edit state, save state, persistence, auth/session handling | P0 | Browser/device E2E | Student can safely manage personal settings without broken navigation or silent failures | QA + Frontend | High |
| ST-08 | Student secondary | Validate mobile layout for notifications, subscriptions, wallet, and settings | P1 | Visual + manual E2E | Important actions remain visible and tappable on Android and iPhone widths | Frontend + QA | High |
| NA-01 | Native claim | Document currently validated native-app scope separately for Android and iPhone | P0 | Release documentation | Release wording matches actual validated scope | Product | High |
| NA-02 | Native claim | Separate `core exam journey validated` from `full student app validated` | P0 | Release documentation | No overclaiming in release narrative | Product | High |
| NA-03 | Native claim | Validate session restore, relaunch behavior, and resume behavior for claimed mobile modules | P1 | Device/simulator E2E | App resume behavior is acceptable for the claimed scope | QA | Medium-High |
| NA-04 | Native claim | Validate results, analytics, and attempts history on Android and iPhone if included in release claim | P1 | Device/simulator E2E | All claimed student modules have real validation evidence | QA | High |
| RG-01 | Final regression | Run final student regression bundle on web, Android app shell, and iPhone app shell | P0 | E2E regression | Core student paths all green | QA | High |
| RG-02 | Final regression | Run final teacher/institute/operator mobile report regression bundle | P0 | Visual + E2E regression | Mobile report signoff evidence is complete | QA | High |
| RG-03 | Final regression | Publish final release scorecard with hold/go decision by workstream | P0 | Executive review | Product owner can defend release status clearly | Product + QA | High |

## Execution Order

1. `PO-01`, `PO-02`, `PO-03`
2. `MR-01`, `MR-02`, `MR-03`, `MR-04`
3. `ST-01`, `ST-03`, `ST-05`
4. `ST-02`, `ST-04`, `ST-06`, `ST-07`, `ST-08`
5. `NA-01`, `NA-02`, `NA-03`, `NA-04`
6. `RG-01`, `RG-02`, `RG-03`

## Release Gates

| Gate | Description | Must Pass Before Final Signoff |
| --- | --- | --- |
| Gate A | Student core journey validated across web, Android, and iPhone | Yes |
| Gate B | Mobile report visual systems validated across operator/teacher/institute | Yes |
| Gate C | Secondary student surfaces validated or explicitly deferred | Yes |
| Gate D | Native-app release wording matches validated scope | Yes |
| Gate E | Final role/module matrix and release scorecard published | Yes |

## Product Owner View

What is already strong:

- Student core exam flow is strong across web, Android app shell, and iPhone app shell.
- The highest-risk student workflow has real end-to-end validation evidence.
- iPhone exam discovery and submit flow issues were investigated to the behavior level, not guessed at.
- Student mobile-web/browser confidence is now strong across Chromium and the targeted WebKit parity pack.

What still blocks full-platform signoff:

- Entire platform is not yet explicitly signed off module by module.
- Teacher and institute desktop report hero visual contracts are now green after snapshot refresh plus clean Chromium rerun.
- Shared cross-role mobile report and dense mobile regression coverage is now green on Thursday, July 23, 2026, so the remaining release holds are no longer centered on this workstream.
- Secondary student surfaces need either validation or explicit release deferral.
- Any broad native-app claim must stay narrower than the currently validated Android and iPhone app-shell scope until additional app-shell modules are tested directly.

## Definition of Done

This board is complete only when:

- every row marked `P0` is complete
- every `Hold` area is either upgraded to `Go` / `Go with monitoring` or explicitly deferred
- final release wording matches actual tested scope
- product owner can answer “what is signed off and what is not” without ambiguity
