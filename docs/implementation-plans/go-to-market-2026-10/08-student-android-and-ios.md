# Student Android and iOS

Workstream W08 · Created 21 October 2026 · Status: In progress

## Execution checkpoint — 22 October 2026

Local Android/iOS buildability is verified and two reliability defects are fixed: polling preserves unsaved attempt drafts, and expired access tokens renew once through the stored refresh token. Android full release packaging and emulator launch passed; iOS local Release simulator build/install and Metro-independent launch passed. Authorized identities/signing, signed HTTPS exam/recovery execution, physical-device accessibility and store beta remain open. See the [mobile verification report](../../qa/90-w08-mobile-verification-20261022.md).

Signed Android and iOS student apps safely complete the same assessment and learning journey as student web.

[Return to the high level plan](00-HIGH-LEVEL-PLAN.md)

## Ownership and dependencies

- Accountable owner: Mobile engineer.
- Supporting roles: Backend engineer, device QA, designer and product owner.
- Entry dependencies: Student-only scope fixed; W03 runtime, W07 onboarding/policies, W01 HTTPS and W09 release QA and D07 purchase model.
- Planning effort: 10–18 engineering days plus account and store review lead time. This is effort, not a guaranteed elapsed duration.
- Audit findings: MOBILE01, RELIABILITY01, A11Y01, UX04. See the [audit findings](../../qa/evidence/market-audit-20261021/summary.json).

## Implementation areas

- `nexora_student_mobile/app/`
- `nexora_student_mobile/src/`
- `nexora_student_mobile/app.json`
- `nexora_student_mobile/eas.json`
- `nexora_student_mobile/plugins/`
- `nexora_student_mobile/.maestro/`

Paths identify existing areas to inspect; they do not imply every listed file requires a change. Keep related existing contracts and reuse working implementation.

## Execution order

1. W08.01 — Establish app identities and distribution. Gate: Student app beta.
2. W08.02 — Simplify the student app experience. Gate: Student app beta.
3. W08.03 — Prove the signed exam and recovery journey. Gate: Student app beta.
4. W08.04 — Complete native security and service behavior. Gate: Student app release.
5. W08.05 — Prepare store submissions and student beta. Gate: Student app release.

## W08 01 Establish app identities and distribution

**Required for:** Student app beta. **Status:** Blocked on product identities, owned accounts and authorized signing.

**Dependencies:** Workstream entry decisions; can begin once scoped.

**Work**

- [ ] Assign approved student-app name, Android package, iOS bundle identifier and owned developer accounts.
- [ ] Use existing authorized signing identities or provision them through the account owner; keep credentials out of source/evidence.
- [ ] Set isolated preview/production HTTPS configuration and verify release policy checks and build provenance.

**Acceptance criteria**

- [ ] Placeholder identities are gone from distributable builds.
- [ ] Android/iOS builds are signed for the intended distribution channel and target the attested HTTPS API.

**Verification and evidence**

- Inspect release metadata, signing and embedded endpoints without printing secrets; install both beta builds.

## W08 02 Simplify the student app experience

**Required for:** Student app beta. **Status:** In progress; core student routes exist, device/accessibility matrix remains.

**Dependencies:** W08.01, W04.01.

**Work**

- [ ] Prioritize dashboard/assigned exams, attempts, results/review, practice/weak areas, profile and help.
- [ ] Keep wallet/subscriptions visible only when the channel purchase/consumption model is ready; include enabled notifications access/preferences.
- [ ] Handle long lists, small screens, font scaling, equations/media and error states; include no admin, institute, teacher or parent workspace.

**Acceptance criteria**

- [ ] Core student tasks remain reachable without large introductory blocks or unbounded histories.
- [ ] Unsupported role login cannot expose a native privileged workspace.

**Verification and evidence**

- Review small Android/iPhone screens, accessibility scaling, non-student sessions and seeded large histories.

## W08 03 Prove the signed exam and recovery journey

**Required for:** Student app beta. **Status:** In progress; reliability fixes and local builds passed, signed journey remains.

**Dependencies:** W08.01, W03.03, W07.01.

**Work**

- [ ] Run fresh student login/onboarding, exam discovery/detail/eligibility, start, answer saves, submit, results and review on signed Android and iOS builds.
- [ ] During an actual in-progress attempt test background/foreground, kill/relaunch, token expiry, network loss, low-memory restart and interrupted submission.
- [ ] Test timing, resume, accessibility accommodations and supported question/media types.

**Acceptance criteria**

- [ ] Acknowledged answers survive restart; server time and access policies remain authoritative.
- [ ] A real active attempt is tested; an empty Attempts screen is not accepted as runtime proof.

**Verification and evidence**

- Retain real-device/emulator/simulator matrices with OS/build/API identities, saved-answer assertions and duplicate-submit checks.

## W08 04 Complete native security and service behavior

**Required for:** Student app release. **Status:** In progress; secure storage/configuration inspected, signed-device probes remain.

**Dependencies:** W08.03, W07.03.

**Work**

- [ ] Verify secure token storage, logout/session revocation, protected media, screenshot/log privacy and deep-link authorization.
- [ ] If push is included, handle permission denial, expired token, logout token removal, child-safe message content and deep links.
- [ ] Verify account recovery/deletion/help links and app purchase behavior according to D07 and current channel rules.

**Acceptance criteria**

- [ ] No token, credential or sensitive learner payload leaks through app-owned logs or notification text.
- [ ] Notifications/deep links never bypass login, learner ownership or result publication rules.

**Verification and evidence**

- Run direct API ownership probes plus signed-device session/deep-link/permission tests.

## W08 05 Prepare store submissions and student beta

**Required for:** Student app release. **Status:** Not started.

**Dependencies:** W08.04, W09.05, W10.03.

**Work**

- [ ] Prepare store descriptions/screenshots, support URLs, privacy/data declarations, age/content ratings and review access matching actual behavior.
- [ ] Use internal/beta distribution for both platforms; monitor crashes, failed saves and student completion.
- [ ] Prepare upgrade compatibility and a rollback/disable strategy for unsafe app/API combinations.

**Acceptance criteria**

- [ ] Both platforms complete beta acceptance without unresolved critical runtime defects.
- [ ] Store submission materials match the student-only app and its purchase/data behavior.

**Verification and evidence**

- Complete signed Android/iOS release checklist; retain device results and beta cohort feedback. Store approval timing remains external.

## Completion and handoff

The accountable owner records the candidate SHA, environment, test outcomes, evidence links and remaining exclusions in the execution tracker. QA verifies the acceptance criteria for the features entering the release. A task is complete only when its stated outcome is demonstrated; an existing model, route or test file is not sufficient.

If an API, schema, authorization rule, assessment policy or paid-access rule changes, document compatibility, any required migration, affected clients and rollback limits before promotion. Changes to saved answers, grades and historical results require explicit preservation checks.

## Reliability follow-up — 21 October 2026

Source review found that the attempt screen refetches every 30 seconds and reseeds draft selections/text when the answer map changes. Potential unsaved-draft loss requires device reproduction and correction under W08.03. Native clients also need conditional-save version adoption. No native source was changed or signed device certified in this checkpoint; Android/iOS remain student-only.
