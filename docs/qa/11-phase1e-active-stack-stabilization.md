# Phase 1E Active-Stack Stabilization

Date: 2026-10-15  
Baseline: `docs/qa/10-phase1d-active-stack-p0-certification.md` and `docs/qa/04-master-qa-coverage-matrix.md`  
Active scope: Next.js web, Django backend/database/APIs, and Expo/React Native. Flutter remained untouched and is excluded from all counts and conclusions.

## Release Decision

**Not production-ready.** The Phase 1D student failures, teacher-results failure, and Android login-to-exams failure are closed with current execution evidence. The composite examination lifecycle also passes with scoring, result publication, duplicate-submit denial, cleanup, and access isolation intact. However, 126 catalogued operator P0 cases remain unexecuted, seven dependent Expo Maestro flows remain not run, and live staging HTTPS plus iOS device compatibility have not been executed.

## Exact Unique Counts

Retries and diagnostic failures are not double-counted. The 46-case teacher pack contains the previously failed teacher-results case plus 45 previously unexecuted cases. The eight focused Django cases contain seven previously counted access cases plus one new compact-attempt regression.

### Phase 1E unique status changes/additions

| Priority | Passed | Failed | Blocked | Skipped | Not run | Basis |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| P0 | 54 | 0 | 0 | 0 | 126 | 8 Phase 1D failures closed, 45 new teacher cases executed, 1 new compact-attempt isolation regression |
| P1 | 0 | 0 | 0 | 0 | 7 | Seven dependent Expo flows remain after the login-to-exams prerequisite passed |
| P2 | 0 | 0 | 0 | 0 | 0 | No P2 batch selected |

### Cumulative active-stack certification catalog

| Priority | Passed | Failed | Blocked | Skipped | Not run |
| --- | ---: | ---: | ---: | ---: | ---: |
| P0 | 95 | 0 | 0 | 0 | 126 |
| P1 | 256 | 0 | 0 | 0 | 7 |
| P2 | 0 | 0 | 0 | 0 | 0 |

The remaining P0 inventory is admin `56`, institute `65`, and institute-results `5`. The remaining P1 mobile inventory is exams detail, results, result timeline, review, review pagination, active attempt, and analytics/logout.

## Resolved Findings

### Student web navigation/runtime

All six Phase 1D failures passed individually without application or assertion changes, then passed again inside the complete `26/26` student core pack with traces enabled.

| Phase 1D case | Phase 1E result | Classification |
| --- | --- | --- |
| Exam-key Tests-link navigation | Passed isolated and in full pack | Environment/resource contention |
| Practice Ready filter | Passed isolated and in full pack | Environment/resource contention |
| Results summary/review navigation | Passed isolated and in full pack | Environment/resource contention |
| Review workspace continuity | Passed isolated and in full pack | Environment/resource contention |
| Summary/review source drill | Passed isolated and in full pack | Environment/resource contention |
| Utility dashboard navigation | Passed isolated and in full pack | Environment/resource contention |

The Phase 1D production run overlapped an Android release build. Isolated and final uncontended executions produced no corresponding product defect. No student test was skipped or weakened.

### Teacher results URL contract

The reset assertion accepted the pre-click URL, so the test could race the subsequent refresh action. The refresh is a Next server action: the observable browser response is a `303` with `x-action-redirect`, while the Django call occurs server-side.

The regression now verifies:

- reset removes list filter/sort/group/page-size parameters while retaining the selected exam;
- refresh returns the expected server-action redirect for that exam;
- the canonical deep link and workspace survive a full reload;
- teacher permissions and result visibility remain intact.

The focused case passed, and it passed again inside the teacher core pack.

### Expo Android connectivity and payload

The Phase 1D release failure was a correct Android security boundary, not permission bypass evidence: a release APK must not call the local cleartext emulator endpoint.

Three test/runtime defects were then isolated:

1. The generated `android/` directory is ignored, so direct native edits were not durable.
2. The generated React host did not explicitly derive development support from the application build variant, preventing the debug app from loading Metro reliably.
3. `/api/v1/student/attempts/` serialized nested answers, questions, runtime, security, and integrity data for list views. The seeded account returned `3,437,732` bytes and could exceed the mobile client's 20-second timeout.

Resolution:

- a tracked Expo config plugin recreates debug and debugOptimized source sets during clean prebuild;
- cleartext is permitted only for `10.0.2.2` in those debug source sets;
- `useDevSupport` is generated from application `BuildConfig.DEBUG`;
- the release manifest has no cleartext/network-security override;
- iOS no longer declares `NSAllowsArbitraryLoads`;
- the mobile list call uses `/api/v1/student/attempts/?compact=true`;
- the compact serializer returns only eight list fields and retains authenticated student scoping and status synchronization.

Live measurement for 474 attempts: `141,783` bytes in `0.119s`. The API 35 Maestro flow passed login, dashboard, loaded exam catalog, top-exam navigation, and exam detail with screenshots. A live TLS handshake was not executed because no isolated HTTPS staging endpoint was available; HTTPS compatibility is verified only at build/configuration policy level.

### Expanded teacher P0 pack

The initial teacher pack passed `44/46`. Both failures reproduced in isolation on teacher search.

- Query-only quick links had correct `href` values and received successful RSC responses, but the client transition did not commit the route or controls.
- Native query anchors fixed the navigation contract.
- Four full document transitions take 9-14 seconds each in this environment; the two multi-navigation tests now use a measured 120-second case budget with all assertions unchanged.

The two focused reruns passed. Final unique teacher status is `46/46`. Search route latency remains a P1 performance risk.

### Composite lifecycle synchronization

The first Phase 1E composite run proved Django returned `201` and rendered the attempt, but the test waited for a Django response that is not browser-observable because the Next server action performs that request. The regression now waits for the browser-visible `POST /app/exams/<exam>` response, verifies `303`, extracts the attempt ID from `x-action-redirect`, and asserts the exact attempt route.

The final trace passed in `1.1m` and preserved:

- synthetic institute/teacher/student provisioning and cleanup;
- exam import, creation, assignment, publication, and valid schedule;
- draft, unassigned, inactive, future, and expired denial;
- start, question loading, two distinct saves, navigation, refresh/relogin recovery;
- final submission and duplicate-submit rejection;
- exact deterministic score `2.00`, result generation/ranking/publication, and student visibility;
- cross-student, cross-institute, unauthorized teacher, and anonymous denial.

## Final Verification

| Batch/gate | Final result |
| --- | --- |
| Six failed student cases, isolated | `6/6` passed |
| Student core release pack | `26/26` passed in `7.5m` |
| Teacher results focused contract | `1/1` passed |
| Teacher core pack plus focused repair rerun | `46/46` unique passed |
| Composite examination lifecycle | `1/1` passed in `1.1m` |
| Focused Django access/API regression | `8/8` passed in `35.653s` |
| Expo Android login-to-exams Maestro | `1/1` passed on API 35 |
| Clean Expo prebuild/debug build | Passed; `383` Gradle tasks, `13m29s` |
| Web typecheck | Passed; route type generation and `tsc --noEmit` |
| Web production build | Passed; `153` static pages generated |
| Expo typecheck | Passed; `tsc --noEmit` |
| Django system check | Passed; no issues |
| Android release policy | Passed static check; no cleartext/debug override |

## Files Changed

Backend product/regression:

- `edutech_backend/apps/attempts/serializers/__init__.py`
- `edutech_backend/apps/accounts/views/__init__.py`
- `edutech_backend/apps/accounts/tests/test_auth_access.py`

Web product/regression:

- `edutech_web/src/components/ui/workspace-search-results.tsx`
- `edutech_web/tests/e2e/workflow/teacher-results-workspace.spec.ts`
- `edutech_web/tests/e2e/workflow/institute-full-access-exam-lifecycle.mutable.spec.ts`
- `edutech_web/tests/e2e/workflow/teacher-search-browser-coverage.spec.ts`
- `edutech_web/tests/e2e/workflow/teacher-search-workspace.spec.ts`

Expo product/automation:

- `nexora_student_mobile/app.json`
- `nexora_student_mobile/plugins/with-android-debug-network-security.js`
- `nexora_student_mobile/src/lib/api/student.ts`
- `nexora_student_mobile/.maestro/student-login-and-exams.yaml`

Documentation:

- `docs/qa/04-master-qa-coverage-matrix.md`
- `docs/qa/11-phase1e-active-stack-stabilization.md`

Generated native Android files were used for builds after clean prebuild but remain ignored. No Flutter file was inspected or modified.

## Evidence Paths

- Student final pack: `edutech_web/test-results/phase1e-student-core-final-20261015/`
- Teacher results contract: `edutech_web/test-results/phase1e-teacher-results-contract-rerun-20261015/`
- Teacher core diagnostic pack: `edutech_web/test-results/phase1e-teacher-core-20261015/`
- Teacher search final traces: `edutech_web/test-results/phase1e-teacher-search-final-20261015/`
- Composite final trace: `edutech_web/test-results/phase1e-composite-lifecycle-final-20261015/workflow-institute-full-ac-a9769--run-a-student-exam-attempt-chromium/trace.zip`
- Django focused log: `docs/qa/evidence/phase1e/django-focused-access-regression.log`
- Android build log: `docs/qa/evidence/phase1e/expo-android-clean-prebuild-build.log`
- Maestro command log/artifacts: `docs/qa/evidence/phase1e/maestro-student-login-exams-compact-rerun.log` and `docs/qa/evidence/phase1e/maestro-student-login-exams-compact-artifacts/`
- Android screenshots: `docs/qa/evidence/phase1e/student-dashboard-android-api35.png`, `student-exams-loaded-android-api35.png`, and `student-exam-detail-android-api35.png`
- Compact endpoint metric: `docs/qa/evidence/phase1e/mobile-compact-attempt-metric.log`
- Release policy evidence: `docs/qa/evidence/phase1e/mobile-release-security-check.log` and final merged manifests in the same directory
- Type/build/check logs: `docs/qa/evidence/phase1e/web-typecheck-final.log`, `web-production-build.log`, `expo-typecheck-final.log`, and `django-system-check.log`

Artifacts use synthetic/demo data. The report text and summary logs do not reproduce passwords or access tokens. Browser traces can contain ephemeral synthetic-session cookies and must remain access-controlled.

## Remaining Gates

1. Execute the admin `56`, institute `65`, and institute-results `5` P0 cases in controlled role batches.
2. Run the seven dependent Expo Maestro flows, then add an iOS simulator/device pass for any release claim covering iOS.
3. Execute the mobile release build against an isolated HTTPS staging API and retain TLS/request evidence.
4. Profile teacher search server rendering; current document responses measured 9-14 seconds.
5. Run final cross-role smoke after the remaining operator changes, followed by cross-browser, accessibility, and performance certification.

## Recommended Phase 1F

Run the institute-results pack first because it is only five cases and directly extends certified scoring/results behavior. Then run admin and institute core in smaller functional slices, resolving defects before the next slice. In parallel, execute the seven remaining Android Maestro flows against the compact API contract and provision an HTTPS test endpoint for release-policy validation. Production certification must remain withheld until all 126 P0 cases and mandatory mobile release claims are resolved.
