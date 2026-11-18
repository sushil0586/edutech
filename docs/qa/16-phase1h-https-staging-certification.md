# Phase 1H HTTPS Staging and Release Security Certification

Date: 2026-10-15  
Active scope: Next.js, Django, PostgreSQL, APIs, and Expo/React Native.  
Excluded scope: Flutter is legacy and was not inspected, executed, or modified.

## Certification Decision

**NO-GO** for production release.

An authorized HTTPS stage exists at `https://learn.accerio.in`, and its certificate, redirects, secure browser cookies, CORS policy, role authorization, tenant read isolation, loopback-only application services, database connectivity, migrations, and scheduled backups produced real execution evidence. However, the mandatory HTTPS examination lifecycle failed before publication: an assigned student received HTTP `200` for a draft exam detail that must be concealed with `404`.

The root cause is deployed-code drift. Stage runs commit `c60a5c757543f8ea8ecb06d92d2751f0589ab207`, whose `StudentExamDetailView` filters only by ID and active state. Current local source also requires status in `scheduled/live/completed` and its focused regression passes. No unreviewed or dirty worktree was pushed to the shared stage.

Production release is additionally blocked by an accepting default TLS virtual host, broken deployed schema/docs/Django-admin routing, non-reproducible stage provenance (`build: local`), placeholder mobile package identities, absence of an authorized production signing artifact, no attached Android device for release-mode HTTPS execution, and unexecuted iOS/accessibility/performance gates.

The frozen catalog remains P0 `221 passed` and P1 `263 passed`. Phase 1H release-gate checks are supporting certification evidence and are not new unique catalog cases. The stage lifecycle failure does not erase earlier local passes, but it proves the deployed candidate does not preserve the certified behavior.

## Staging Topology

| Item | Verified state |
| --- | --- |
| Public endpoint | `learn.accerio.in`, DNS A `3.106.125.117` |
| Host | Ubuntu 26.04 LTS; nginx, Next.js, Django/Gunicorn, PostgreSQL |
| Public listeners | TCP 80 and 443 |
| Private listeners | Next `127.0.0.1:3001`, Django `127.0.0.1:8010`, PostgreSQL `127.0.0.1:5432` |
| External private-port probes | 3001, 8010, and 5432 not reachable |
| Django settings | `config.settings.prod`, `DJANGO_DEBUG=False`, CORS allow-all false |
| Origins/hosts | Stage HTTPS origin explicitly trusted; Django host list restricted to stage/loopback/IP |
| Web API configuration | Server and public API base URLs both use stage HTTPS |
| Database | Health reports connected; `migrate --check` exits 0 |
| Deployment revision | Stage `c60a5c...`; clean host checkout; divergent from local `ad3171c...` |
| Service health | All four services active; no error-priority entries in the sampled prior hour |

No production DNS, service, database, credential, or infrastructure was modified. Stage application code and active nginx configuration were not changed. The replacement nginx template was syntax-tested in temporary files and those files were removed without a reload.

## HTTPS and Boundary Results

| Check | Result | Evidence |
| --- | --- | --- |
| Certificate chain and hostname | Passed | Let's Encrypt YE1; SAN `learn.accerio.in`; verification OK |
| Certificate validity | Passed | 2026-10-14 17:42:59 UTC to 2027-01-12 17:42:58 UTC |
| TLS protocols | Passed for required protocols | TLS 1.2 and 1.3 negotiated; 1.0 and 1.1 rejected |
| HTTP downgrade path | Passed | Root and API requests return 301 to the same HTTPS path |
| Security headers | Passed with duplication warning | HSTS one year/preload, CSP, frame deny, MIME sniffing deny, referrer and permissions policy present; nginx/application duplicate several headers |
| CORS | Passed | Trusted origin receives its exact ACAO; untrusted origin receives none |
| Secure session | Passed | Real UI login set access, refresh, and profile cookies `HttpOnly`, `Secure`, `SameSite=Lax` |
| Anonymous APIs | Passed | `/auth/me/`, results, and platform-admin inventory return 401 |
| Direct role authorization | Passed | Platform-admin inventory: admin 200; institute/teacher/student 403 |
| Cross-institute read | Passed | Institute admin own resource 200; distinct tenant resource concealed with 404 |
| Backend exposure | Passed | Django, Next.js, and PostgreSQL are not reachable on their private ports externally |
| Unknown TLS host | **Failed** | An untrusted Host/SNI probe reached another default Next.js virtual host and returned 200 |
| Schema/docs routing | **Failed** | `/api/schema/` and `/api/docs/swagger/` fall through to Next.js redirects instead of Django |
| Django admin routing | **Failed** | Deployed `/django-admin/` reaches Django but Django stage source registers `/admin/`, producing 404 |
| Build provenance health | **Failed** | Health reports `version: 1.0.0`, `build: local` rather than the deployed commit |

The repository nginx template now rejects unknown HTTP hosts with 444, rejects unknown TLS handshakes, routes Django-owned endpoints explicitly, and redirects no-slash route variants deterministically. The template passes `nginx -t` against the stage certificate paths. These changes are prepared, not deployed evidence.

## HTTPS Workflow Execution

### Browser role pack

`role-scope/access-control.spec.ts` executed against the real HTTPS stage with Chromium and evidence enabled: **8 passed / 0 failed / 0 skipped** in 54 seconds. It covered anonymous redirects, teacher/student/institute workspace containment, and clean teacher/student role switching.

### Direct API checks

- Four role logins and `/auth/me/` checks passed over HTTPS.
- The platform-admin-only onboarding inventory returned 200 only for platform admin and 403 for institute admin, teacher, and student.
- Invalid credentials returned 400; anonymous platform-admin inventory returned 401.
- An institute admin read its own institute with 200 and a distinct institute with concealed 404. Only hashes of tenant IDs are retained.

### Examination lifecycle

`institute-full-access-exam-lifecycle.mutable.spec.ts` executed against stage with an isolated `PWFA067109` institute: **0 passed / 1 failed / 0 skipped**. It created the institute, account holders, academics, ten imported questions, an exam, assignment, and audit events. Before publication, the student detail API returned 200 instead of the required 404.

The test stopped at that P0 assertion. Consequently, stage HTTPS evidence for publish, schedule, start, question loading, answer persistence, refresh/relogin recovery, submit, duplicate-submit rejection, exact scoring, publication, and result visibility is **Blocked**, not passed.

The inactive synthetic institute and all positively linked dependencies were first dry-run inventoried and then purged using the existing management command. Database verification found zero exact matches; the final API search also returned zero exact code matches. No ambiguous records were selected. Playwright's raw archive contained session JWTs in network records; those values and password fields were redacted, the ZIP integrity check passed, and a post-redaction scan found zero JWT-like or unredacted password values.

## Android Release Safety

| Check | Result |
| --- | --- |
| Expo TypeScript | Passed |
| Release-policy unit tests | 5/5 passed |
| HTTPS preview configuration | Passed for `learn.accerio.in` |
| Production configuration validation | Intentionally failed closed on placeholder Android/iOS identifiers |
| Clean Expo prebuild | Passed; debug network exception remains debug-only |
| Android release assembly | Passed; 93 MB unsigned APK, min SDK 24, target SDK 36 |
| Release endpoint scan | One stage HTTPS URL; zero `10.0.2.2` or `127.0.0.1` API URLs; zero known test-credential markers |
| Cleartext policy | Passed statically; release has no exception and target SDK 36 defaults cleartext to denied |
| Debuggable flag | Absent from release manifest |
| Backup policy | `allowBackup=false` |
| Permissions | Internet, vibration, biometric/fingerprint only plus app-private dynamic receiver permission; storage and overlay permissions absent |
| Release signing | **Blocked**; `apksigner` correctly reports unsigned |
| Package identity | **Blocked**; `com.anonymous.nexorastudentmobile` and anonymous iOS identifier remain placeholders |
| EAS signing readiness | Partial; authenticated account and remote credential mode configured, but production EAS environment has no configured variables |
| Release-device HTTPS | **Blocked**; no Android device/emulator attached during Phase 1H and no authorized signed artifact exists |

The prior iOS `NSAllowsArbitraryLoads=true` exception was removed. Android's emulator cleartext exception is generated only in debug/debugOptimized source sets and is limited to `10.0.2.2`; production network security was not weakened. The release Gradle plugin now removes debug signing idempotently, including if a stale marker and a reintroduced signing line coexist.

A single `http://localhost:8081` string remains in the bundled React Native framework's development-server fallback. It is not an application API endpoint, and release cleartext traffic is denied. No production signing key was generated, substituted, printed, or committed.

## Staging Integrity and Operations

| Area | Result |
| --- | --- |
| Django deployment check | `manage.py check --deploy`: 0 issues on stage |
| Migration readiness | `migrate --check --noinput`: passed |
| Backup scheduling | Timer enabled/active; most recent run successful at 2026-10-15 02:24 UTC |
| Backup inventory | 15 files; newest three non-empty; directory mode 750 and file mode 640 |
| Restore test | Not run; destructive/shared-environment restore was prohibited |
| Rollback readiness | Partial; no immutable artifact/version health identity or demonstrated rollback procedure |
| Monitoring | Partial; systemd/nginx journals inspected, but no external alerting/SLO evidence found |
| Audit evidence | Eight synthetic audit rows observed during lifecycle setup and removed with the exact test tenant |
| Sensitive-data handling | Evidence scan found zero private-key, secret, raw JWT, database-password, or known test-password patterns |

## Defects and Changes

### Confirmed defects

1. **STAGE-P0-001: deployed draft-exam disclosure.** Stage lacks the current status filter and returns draft detail to an assigned student. Fix exists locally; deployment and full HTTPS rerun remain required.
2. **INFRA-P0-001: unknown-host virtual-host leakage.** The stage default TLS vhost serves another application for an untrusted hostname. Repository nginx configuration now fails closed; stage remains unfixed.
3. **INFRA-P1-002: Django route proxy mismatch.** Schema/docs route to Next.js and Django admin prefix disagrees with stage backend. Repository routes/template are aligned; stage remains unfixed.
4. **DEPLOY-P0-003: unsafe/non-reproducible deploy pipeline.** The pipeline did not pass remote variables reliably, ignored nginx/collectstatic failures, disabled SSH host checking, could transfer environment/key material, and did not publish build identity. Minimal pipeline hardening is prepared.
5. **MOB-SEC-P0-004: release transport/signing configuration.** iOS allowed arbitrary loads and generated Android release used debug signing. Arbitrary loads were removed; release debug signing is removed and remote authorized credentials are required.
6. **MOB-REL-P0-005: placeholder app identity and absent signed candidate.** Deliberately unresolved pending authorized package IDs and signing identity.

### Files changed in Phase 1H

- `Jenkinsfile`
- `deployment/nexora-learn-backend.service`
- `deployment/nexora-learn.nginx.conf`
- `deployment/run-with-env.py`
- `edutech_backend/config/urls.py`
- `edutech_backend/config/tests/__init__.py`
- `edutech_backend/config/tests/test_deployment_routes.py`
- `nexora_student_mobile/.env.production.example`
- `nexora_student_mobile/app.json`
- `nexora_student_mobile/eas.json`
- `nexora_student_mobile/package.json`
- `nexora_student_mobile/plugins/with-android-release-safety.js`
- `nexora_student_mobile/scripts/validate-release-config.js`
- `nexora_student_mobile/scripts/validate-release-config.test.js`
- `docs/qa/04-master-qa-coverage-matrix.md`
- `docs/qa/16-phase1h-https-staging-certification.md`

No Flutter file changed.

## Execution Summary

| Execution | Passed | Failed | Blocked/Not run | Notes |
| --- | ---: | ---: | ---: | --- |
| Stage Playwright role cases | 8 | 0 | 0 | Real HTTPS browser |
| Stage Playwright lifecycle | 0 | 1 | downstream phases | Failed at draft concealment |
| Focused Django exam/security tests | 10 | 0 | 0 | Includes lifecycle, scoring, duplicate result, windows, assignment, tenant isolation |
| Django deployment-route tests | 1 | 0 | 0 | Admin prefix contract |
| Expo release-policy tests | 5 | 0 | 0 | Includes idempotent signing removal |
| Web typecheck/build | 2 gates | 0 | 0 | Typecheck and 153-route production build |
| Expo typecheck/preview config/prebuild/build | 4 gates | 0 | 0 | Unsigned release only |
| Android release device run | 0 | 0 | 1 | No attached device and no authorized signed APK |

Frozen unique matrix totals, unchanged:

| Priority | Passed | Failed | Blocked | Skipped | Not run |
| --- | ---: | ---: | ---: | ---: | ---: |
| P0 | 221 | 0 | 0 | 0 | 0 |
| P1 | 263 | 0 | 0 | 0 | 0 |
| P2 selected catalog | 0 | 0 | 0 | 0 | 0 |

## Evidence Index

- TLS, redirect, headers, CORS, host and routes: `docs/qa/evidence/phase1h/stage-tls-*`, `stage-dns-http-redirect-headers.txt`, `stage-cors-host-validation.txt`, `stage-routing-probes.txt`
- Host topology/config/checks/backups: `stage-host-readonly-audit.txt`, `stage-network-path-probes.txt`, `stage-backup-readiness.txt`, `stage-health-*`
- Browser RBAC: `stage-role-access/junit.xml` and retained screenshots
- UI cookie security: `stage-ui-login-cookie-security.txt` and `stage-ui-login-secure-cookie.png`
- Direct API RBAC/isolation: `stage-direct-api-rbac.json`, `stage-cross-institute-read-isolation.json`
- Lifecycle failure: `stage-full-lifecycle/junit.xml`, screenshot, trace, error context, and imported CSV
- Root cause/drift: `stage-draft-visibility-root-cause.txt`, `stage-local-version-drift.txt`
- Cleanup: `stage-lifecycle-purge.txt`, `stage-lifecycle-cleanup-verification-final.json`
- Web/backend gates: `web-typecheck.log`, `web-production-build.log`, `django-focused-security-regression.log`, `django-route-system-migration-checks.log`
- Android: `expo-quality-gates.log`, `expo-release-config-tests-final.log`, `android-prebuild-final.log`, `android-assemble-release-unsigned-final.log`, `android-unsigned-release-inspection-final.txt`, `android-bundle-endpoint-scan-final.txt`, `android-release-device-install-gate.txt`
- Deployment template: `nginx-template-syntax.txt`
- Evidence hygiene/integrity: `evidence-sensitive-data-scan.txt`, `artifact-inventory.txt`, `artifact-sha256.txt`

## Release Gates and Next Phase

Required before reconsidering release:

1. Review and deploy the current draft-exam authorization fix plus the nginx/admin/provenance changes to the authorized stage through a traceable pipeline.
2. Re-run the complete HTTPS exam lifecycle through result publication and all mandatory negative paths; retain browser/API/database evidence.
3. Confirm unknown-host rejection and corrected schema/docs/admin routing on the effective stage nginx configuration.
4. Assign authorized Android and iOS application identifiers, configure EAS production HTTPS variables, and integrate the existing authorized signing identity.
5. Produce a verifiably production-signed release artifact and run the critical mobile HTTPS pack on a real Android device/emulator.
6. Execute iOS ATS/session/exam evidence, accessibility certification, and threshold-based performance/load testing.
7. Demonstrate restore and rollback in an isolated clone of staging, and connect release health to immutable commit/artifact identity.

Recommended next phase: **Phase 1I staged release-candidate deployment and full HTTPS rerun**, followed by signed Android/iOS device certification. Production readiness remains withheld.
