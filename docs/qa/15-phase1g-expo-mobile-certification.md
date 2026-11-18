# Phase 1G Expo Mobile Certification

Date: 2026-10-15  
Active scope: Next.js, Django, database, APIs, and Expo/React Native.  
Excluded scope: Flutter is legacy and was not inspected, executed, or modified.

## Certification Decision

The seven frozen Expo P1 flows pass on a real Android 15/API 35 emulator against the local Django API. The unique Phase 1G workstream result is `7 passed / 0 failed / 0 blocked / 0 skipped / 0 not run`.

This is not full mobile or production certification. The executed flows used the debug application. The generated release APK is signed with the Android debug certificate and embeds the emulator-only `http://10.0.2.2:9001` API URL, while its release manifest correctly does not allow cleartext traffic. Live HTTPS staging, production signing, iOS, accessibility, performance thresholds, and active-attempt restart recovery remain release gates.

The master catalog now records:

| Priority | Passed | Failed | Blocked | Skipped | Not run |
| --- | ---: | ---: | ---: | ---: | ---: |
| P0 cumulative | 221 | 0 | 0 | 0 | 0 |
| P1 cumulative | 263 | 0 | 0 | 0 | 0 |
| P2 selected catalog | 0 | 0 | 0 | 0 | 0 |

## Frozen Mobile Inventory

The Phase 1F.3 matrix counted seven mobile cases but did not assign case IDs individually. Phase 1G freezes the existing filenames and expected behaviors under stable IDs without adding or splitting cases.

| Case ID | Frozen flow | Expected behavior | Final result | Duration |
| --- | --- | --- | --- | ---: |
| `EXPO-P1-001` | `student-exams-filters-and-detail.yaml` | Login, exam filters/search/reset, detail, return | Passed | 103s |
| `EXPO-P1-002` | `student-results-and-summary.yaml` | Attempts, results, summary, dashboard and attempts return | Passed | 77s |
| `EXPO-P1-003` | `student-results-timeline-summary.yaml` | Timeline summary, analytics, results, repeated summary route | Passed | 241s |
| `EXPO-P1-004` | `student-review-journey.yaml` | Published result review, summary, results return | Passed | 99s |
| `EXPO-P1-005` | `student-review-filters-and-pagination.yaml` | Review filters, next/previous page, summary, results return | Passed | 216s |
| `EXPO-P1-006` | `student-active-attempt.yaml` | Attempts lane and empty-active-state contract for the registered seed | Passed | 62s |
| `EXPO-P1-007` | `student-analytics-and-logout.yaml` | Analytics, results, profile, logout, protected-session return | Passed | 67s |

`student-login-and-exams.yaml` passed as a prerequisite smoke and is not counted among the seven. `EXPO-P1-006` does not certify active runtime restart: the registered `a001` seed had zero in-progress attempts, and the flow verifies the truthful empty state.

## Device and Build Environment

| Item | Evidence |
| --- | --- |
| Emulator | `Nexora_Pixel_API_35`, serial `emulator-5554` |
| OS | Android 15, API 35, `arm64-v8a` |
| Display | 1080x2400, density 420 |
| Automation | Maestro 2.6.1, Java 21.0.11 |
| Expo app | `com.anonymous.nexorastudentmobile`, version `1.0.0` |
| Debug API URL | `http://10.0.2.2:9001`, allowed only by debug network policy |
| Release APK | `android/app/build/outputs/apk/release/app-release.apk`, 93 MB |
| Release SDK | min 24, target 36 |
| Release build | `assembleRelease` passed in 13m39s, 569 tasks |
| Release manifest | No `usesCleartextTraffic`, no `networkSecurityConfig`, no `debuggable` flag |
| Release signing | Android debug certificate, not production signing |
| Release endpoint | One embedded `http://10.0.2.2:9001` occurrence; no usable staging endpoint verified |

Android debug configuration denies cleartext by default and permits only `10.0.2.2`. The main/release manifest does not inherit that exception. iOS configuration does not enable arbitrary transport loads. No live HTTPS certificate chain, expiry, hostname, pinning, or renewal behavior was executed because an HTTPS staging endpoint was not available.

## Defects and Resolutions

### MOB-PROD-001: unbounded attempt-history rendering

Classification: confirmed product performance defect, fixed.

The Attempts screen rendered all 325 completed attempt cards inside one `ScrollView`. Returning from summary to the Attempts tab took longer than 60 seconds and was observed at roughly 90 seconds. The screen now renders 20 completed attempts initially and exposes deterministic 20-row increments through `attempts-show-more-button`. All records remain reachable.

Regression evidence: `EXPO-P1-002` and `EXPO-P1-006` pass after the change. TypeScript remains clean.

### MOB-AUTO-001: startup and route readiness

Classification: automation defect, fixed.

`launchApp(clearState: true)` could complete before the Expo role gate committed. Flows now wait for the stable accessibility ID `role-gate-login-button`. Route transitions use bounded element-ready assertions instead of immediate text assertions.

### MOB-AUTO-002: clipped and obscured controls

Classification: automation defect, fixed.

The exams search keyboard covered reset controls. Results and review flows also tapped controls when only a clipped strip was above the tab bar. Android keyboard dismissal, meaningful visibility thresholds, bounded scrolling, and page-footer traversal now synchronize with the controls without weakening expected outcomes.

### MOB-ENV-001: debug overlay blocked tab navigation

Classification: emulator configuration defect, resolved.

All Android animation scales were `0`, which triggered a React Native reduced-motion LogBox banner over the tab bar. Restoring animator, transition, and window scales to `1` removed the overlay. Before/after settings are retained.

### MOB-ENV-002: Metro localhost binding

Classification: environment defect, resolved for debug execution.

Metro launched with `--localhost` bound only to host loopback/IPv6 and was unavailable at Android's `10.0.2.2`. LAN mode plus the existing ADB reverse made port 8081 reachable. This does not change release transport policy.

### MOB-SEC-001: credential exposure in automation artifacts

Classification: confirmed automation security defect, fixed.

Ten auxiliary Maestro flows and the Maestro README contained a literal seed password, and Maestro debug logs recorded typed values. All password fields now use `${STUDENT_PASSWORD}`. Sixteen Phase 1G text artifacts were redacted, and a byte-level search reports zero remaining matches in source or evidence. Screenshots showed masked password dots.

### MOB-REL-001: release artifact is not deployable

Classification: release blocker, unresolved.

The release APK builds successfully but is debug-signed and embeds the emulator HTTP endpoint. Cleartext remains blocked in release, which is the correct security posture; the endpoint and signing configuration must be supplied by the release pipeline rather than weakening Android policy.

## Security and Reliability Results

| Check | Result | Evidence |
| --- | --- | --- |
| Invalid persisted session | Passed | `/auth/me` returned `401`; secure items were cleared; role gate displayed the invalid-session state |
| Anonymous results API | Passed | `401 Authentication credentials were not provided` |
| Cross-institute exam detail | Passed | Student token received concealed `404 Not found` |
| Duplicate submit probe | Passed as rejection | Existing submitted/expired attempt returned `400`; persisted status remained submitted |
| Network loss login | Passed | API transport confirmed unreachable; explicit retry message appeared in 36s; network restored |
| Logout/protected navigation | Passed | Secure session cleared and role gate restored |
| Token storage source | Passed | Native session values use `expo-secure-store`; web persistence is skipped |
| Token storage device probe | Passed | `SecureStore.xml` present; zero plaintext username or JWT-prefix matches in ordinary app files |
| Production cleartext policy | Passed | Release manifest has no cleartext exception; debug exception is scoped to `10.0.2.2` |
| Active-attempt app restart | Not verified | No active synthetic fixture existed; the registered case is an empty-state flow |
| HTTPS certificate trust | Not verified | No HTTPS staging endpoint/certificate was supplied |

Direct local response measurements were all HTTP 200 for the authorized student: results `62,286 bytes / 0.081s`, compact attempts `98,355 bytes / 0.152s`, available exams `114,691 bytes / 0.131s`, and insight summary `8,958 bytes / 0.094s`. These are local measurements, not production performance certification. The 4m01s timeline flow and 3m36s paginated review flow justify a separate device performance/profile gate.

## Backend Regression

Ten focused Django tests passed in 30.242s with `--keepdb`, covering student attempt/result isolation, scoped exam discovery, inactive assignment, draft state, future/expired windows, cross-student start denial, teacher cross-tenant denial, institute isolation, the full assessment lifecycle, and duplicate result generation protection. `manage.py check` passed with zero issues.

The first non-interactive invocation was blocked before execution because `test_edutech_db` already existed and Django attempted to prompt for deletion. The supported `--keepdb` rerun passed; the initial environment failure remains in evidence.

## Fixture Hygiene

The seven registered flows used the existing non-production `a001` seed and did not create an institute, exam, attempt, answer, or result. Before and after evidence retains 325 attempts, zero in-progress attempts, 66 results, and 28 published results.

Historical Phase 1F.3 residue was audited in local PostgreSQL `edutech_db` at `127.0.0.1`. The positively identified set contained:

- 58 institutes with `PWFA*` codes and names matching `PW Full Access Institute <timestamp>`;
- 24 linked `PW-FA-*` exams;
- 85 linked `pw-`/`pwfa` synthetic auth users;
- 12,069 cascading synthetic rows in total.

The complete identity/dependency inventory was saved before deletion. The reviewed set and its orphaned auth users were hard-deleted in one transaction. Final checks show zero matching institutes, exams, or usernames; `a001` still exists. No ambiguous row was selected.

A post-cleanup API smoke then authenticated `a001` and received HTTP `200` from both the results and attempts endpoints, confirming that cleanup did not damage the registered mobile fixture.

## Files Changed

Product:

- `nexora_student_mobile/app/(student)/(tabs)/attempts.tsx`

Frozen and prerequisite automation:

- `nexora_student_mobile/.maestro/student-exams-filters-and-detail.yaml`
- `nexora_student_mobile/.maestro/student-results-and-summary.yaml`
- `nexora_student_mobile/.maestro/student-results-timeline-summary.yaml`
- `nexora_student_mobile/.maestro/student-review-journey.yaml`
- `nexora_student_mobile/.maestro/student-review-filters-and-pagination.yaml`
- `nexora_student_mobile/.maestro/student-active-attempt.yaml`
- `nexora_student_mobile/.maestro/student-analytics-and-logout.yaml`
- `nexora_student_mobile/.maestro/student-login-and-exams.yaml`

Credential parameterization also touched `nexora_student_mobile/.maestro/README.md` and ten auxiliary Maestro flows: `student-attempt-runtime-submit`, `student-class7-search-detail`, `student-class7-visual-detail`, `student-class7-visual-runtime`, `student-fresh-attempt-submit`, `student-fresh-scroll-focus-check`, `student-save-and-next-check`, `student-save-answer-check`, `student-save-next-focus-verify`, and `student-scroll-focus-check`.

Certification:

- `docs/qa/04-master-qa-coverage-matrix.md`
- `docs/qa/15-phase1g-expo-mobile-certification.md`

No Flutter file was modified.

## Evidence Paths

Primary index and integrity:

- `docs/qa/evidence/phase1g/artifact-inventory.txt`
- `docs/qa/evidence/phase1g/artifact-sha256.txt`
- `docs/qa/evidence/phase1g/frozen-seven-junit-summary.txt`

Frozen flows:

- `docs/qa/evidence/phase1g/expo-p1-001-rerun-*`
- `docs/qa/evidence/phase1g/expo-p1-002-certified-*`
- `docs/qa/evidence/phase1g/expo-p1-003-certified-*`
- `docs/qa/evidence/phase1g/expo-p1-004-*`
- `docs/qa/evidence/phase1g/expo-p1-005-rerun-*`
- `docs/qa/evidence/phase1g/expo-p1-006-*`
- `docs/qa/evidence/phase1g/expo-p1-007-*`

Security, release, and cleanup:

- `docs/qa/evidence/phase1g/mobile-direct-api-security.json`
- `docs/qa/evidence/phase1g/android-secure-storage-inspection.json`
- `docs/qa/evidence/phase1g/credential-redaction-summary.json`
- `docs/qa/evidence/phase1g/offline-login-junit.xml`
- `docs/qa/evidence/phase1g/android-assemble-release.log`
- `docs/qa/evidence/phase1g/android-release-manifest-policy.txt`
- `docs/qa/evidence/phase1g/android-release-endpoint-counts.txt`
- `docs/qa/evidence/phase1g/android-release-signing-summary.txt`
- `docs/qa/evidence/phase1g/android-release-policy-summary.json`
- `docs/qa/evidence/phase1g/android-release-apk-sha256.txt`
- `docs/qa/evidence/phase1g/django-mobile-security-regression-keepdb.log`
- `docs/qa/evidence/phase1g/historical-fixture-residue-inventory.json`
- `docs/qa/evidence/phase1g/historical-fixture-cleanup-result.json`
- `docs/qa/evidence/phase1g/a001-seed-database-inventory-after.json`
- `docs/qa/evidence/phase1g/post-cleanup-seed-api-smoke.json`

## Remaining Release Gates

1. Produce a non-debug-signed release build with an explicit HTTPS staging API URL and execute the critical mobile pack against it.
2. Execute iOS simulator and physical-device compatibility, including ATS and secure-session persistence.
3. Create an isolated active attempt and verify save, force-stop/restart recovery, token refresh, final submit, and duplicate submit on mobile.
4. Run accessibility certification: screen reader, focus order, labels, dynamic text, contrast, and reduced-motion behavior.
5. Run device performance profiling with explicit launch, navigation, payload, memory, and long-list thresholds.
6. Add CI secret masking and fail the evidence job if Maestro artifacts contain credential literals.

Recommended next phase: Phase 1H HTTPS release-candidate and iOS certification, followed by accessibility and performance gates. Production readiness remains withheld.
