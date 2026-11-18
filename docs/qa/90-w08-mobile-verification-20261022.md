# W08 student Android and iOS verification

22 October 2026 · Candidate based on `4546955` plus the two reliability fixes recorded below

## Decision

The student mobile implementation is **buildable and locally verifiable, but not release-certified**. Android debug and full release packaging passed; the locally test-signed release APK installed and launched on the API 35 emulator. iOS debug and local Release simulator builds compiled and launched on the iOS 18 simulator; the Release app relaunched successfully with Metro stopped. Production identity, authorized signing, signed HTTPS exam/recovery execution, physical-device accessibility and beta/store evidence remain open.

This result does not block the certified web pilot. Android/iOS must not yet be represented as a supported production channel.

## Fixes completed

- Preserved an unsaved attempt draft when the 30-second backend refresh returns. A refresh can update saved server state without replacing the learner's current unsaved selection or text.
- Added single-flight access-token renewal on HTTP 401 using the securely stored refresh token. A successful renewal updates memory and SecureStore before retrying once; a rejected renewal clears the session.

## Verification results

| Gate | Result | Evidence/limit |
|---|---|---|
| TypeScript | Passed | `npm run typecheck` |
| Release-policy tests | 5/5 passed | HTTPS, secret-like variables, debug panel, placeholder production identity and release-signing removal |
| Manual release configuration | Passed | Public HTTPS fixture accepted |
| Production release configuration | Correctly blocked | Anonymous Android/iOS identifiers remain |
| Native generation | Passed | Expo SDK 56 clean prebuild for Android and iOS |
| Android debug | Passed | Built and installed on `Nexora_Pixel_API_35` |
| Android release | Passed locally | Four-architecture `assembleRelease`, 568 Gradle tasks, embedded JS bundle, lint and packaging passed in 25m 06s |
| Android release signing | Open | Repository artifact is deliberately unsigned; a disposable local certificate was used only to prove emulator installation/launch |
| Android release launch | Passed locally | API 35 emulator loaded the embedded React Native application without Metro |
| iOS debug build/install | Passed | Xcode 26.6, iOS 18 `Maestro_IOS_iPhone-16_18`; 0 build errors and one duplicate-library warning |
| iOS local Release | Passed locally | Optimized simulator build completed with an embedded JS bundle, installed, and relaunched with Metro stopped; 0 errors and two duplicate-library warnings |
| iOS distribution archive/signing | Open | No authorized Apple identity/provisioning and no production archive/IPA |
| Native transport/privacy inspection | Partial pass | Android release requests only INTERNET, VIBRATE and biometric permissions; iOS disallows arbitrary transport loads but permits local networking in generated debug configuration |
| Real exam and recovery journey | Open | No dedicated signed-build credential/active-attempt fixture was supplied for this run |
| Physical-device matrix | Open | Emulator/simulator evidence does not prove camera-free low-memory, font scaling, screen-reader or OS/device behavior |
| Store beta/submission | Open | App identities, account ownership, declarations, screenshots and beta tracks are not configured |

## Remaining plan

### M1 — Product identity and owned distribution

Owner: product/account owner with mobile engineer.

1. Approve the permanent product name, Android application ID and iOS bundle identifier.
2. Confirm owned Google Play Console, Apple Developer and App Store Connect accounts.
3. Configure authorized Android upload/app-signing keys and Apple distribution certificates/profiles through EAS; keep credentials outside source and retained evidence.
4. Configure preview and production HTTPS environment values in EAS and record the build profile, commit and artifact identifiers.

Exit: production validation passes, and both authorized signed artifacts install through their intended internal channels.

### M2 — Signed exam and recovery certification

Owner: device QA with backend/mobile engineers.

1. Provision a dedicated student with an assigned objective exam, a real active attempt and a published result.
2. On both signed builds, run login, discovery, eligibility, start, save, background/foreground, kill/relaunch, network loss/recovery, access-token expiry/refresh, resume, submit-once, summary and review.
3. Verify acknowledged answers in the API/database after every interruption and prove that polling does not replace an unsaved draft.
4. Repeat with timer expiry, institute suspension policy and an interrupted submission.

Exit: both platforms retain saved answers, recover the active attempt and create exactly one correct result with no critical defect.

### M3 — Native security, privacy and accessibility

Owner: security/device QA.

1. Verify SecureStore behavior, logout/revocation, password-reset invalidation, protected media and direct deep-link ownership on signed builds.
2. Scan device logs, screenshots, notifications and crash reports for credentials, bearer tokens and sensitive learner payloads.
3. Test TalkBack and VoiceOver, 200% text, focus order, contrast, small-screen reflow, reduced motion and switch/keyboard navigation.
4. Run at least one lower-memory Android device and one supported physical iPhone in addition to the simulators.

Exit: no sensitive-data leak or authorization bypass; every core student action remains operable with the supported accessibility settings.

### M4 — Internal beta and store readiness

Owner: product, support and release owner.

1. Prepare accurate store copy, screenshots, support/privacy URLs, child/data declarations, age ratings and review credentials.
2. Publish Google Play internal testing and TestFlight builds tied to the certified artifacts.
3. Run a bounded student beta through two real institute exam cycles; monitor crashes, failed saves, completion and support demand.
4. Prove upgrade compatibility and document rollback/remote-disable behavior for an unsafe app/API combination.

Exit: both beta channels complete two cycles without unresolved critical runtime defects and the store materials match actual student-only behavior.

## Evidence

Evidence retained under `docs/qa/evidence/w08-mobile-20261022/` contains logs, configuration inspection, release checksum and local screenshots. It contains no production signing material or account credentials.
