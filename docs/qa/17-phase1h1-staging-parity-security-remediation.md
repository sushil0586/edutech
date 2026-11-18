# Phase 1H.1 Staging Parity and Security Remediation

Date: 2026-10-15  
Active scope: Next.js, Django, PostgreSQL/database, APIs, and Expo/React Native.  
Excluded scope: Flutter is legacy and was not inspected, executed, or modified.

## Decision

**NO-GO for Phase 1H.2 runtime certification and NO-GO for production.**

The release controls and security remediations are prepared and pass local focused checks, but no staging deployment was authorized in this phase. The running stage remains divergent and continues to fail mandatory provenance, draft-exam, unknown-host, and route-parity gates. Local success is not staging evidence.

There is also no immutable release-candidate SHA for the current fixes. The checked-out baseline is `ad3171c33705d14151e49e45aebcebb7647a4684`, but the verified changes exist in a dirty worktree. Staging and current remote `main` are `c60a5c757543f8ea8ecb06d92d2751f0589ab207`. A reviewed integration commit containing both histories is required before promotion.

No production system, DNS record, shared database, credential, or running staging configuration was changed.

## Source and Runtime Parity

| Identity | Result |
| --- | --- |
| Local baseline commit | `ad3171c33705d14151e49e45aebcebb7647a4684` |
| Local branch | `launch/staging-validation-2026-09-03` |
| Running staging source commit | `c60a5c757543f8ea8ecb06d92d2751f0589ab207` |
| Current remote `main` | `c60a5c757543f8ea8ecb06d92d2751f0589ab207` |
| Current remote candidate branch | `ad3171c33705d14151e49e45aebcebb7647a4684` |
| Merge base | `34a292999caf37d4a87512d0397b16a11ee1b75e` |
| Divergence | 8 stage/main-only commits; 2 candidate-only commits |
| Promotable release SHA | **None**; current fixes are uncommitted and the baseline omits stage/main changes |
| Container digest | Not applicable to current host; Docker and Podman are absent |
| Immutable artifact digest | Absent on stage; prepared pipeline uses a SHA-256 verified `git archive` |

### Root cause of divergence

Staging was not promoted from the validated candidate branch. The host checkout tracks `main`, and its reflog records direct `git pull --rebase origin main` and `git pull --ff-only origin main`, ending at `c60a5c...`. The candidate branch remained separate at `ad3171c...`. The former pipeline accepted branch/workspace state and copied it directly; it did not require an explicit full SHA, prove ancestry, create one immutable artifact, or attest the running result.

The web runtime is more divergent than the host checkout alone indicates. Its `.next/BUILD_ID` is `zXzd93VWjnanupIYTm-sF`, and its build timestamp is 2026-09-03 09:15:47 UTC, before the source checkout advanced to `c60a5c...` at 10:30:56 UTC. Stage has no `release-manifest.json` and no backend `.env.build`. Health still returns `build: local`.

### Migration incompatibility

Stage contains 101 migration files and has 106 migrations applied. The local candidate contains 100 migration files. Stage/main alone contains and has applied:

`edutech_backend/apps/economy/migrations/0011_expand_operator_policy_scopes.py`

That migration and its corresponding model fields came from stage-only commit `727dbd5`. Promoting `ad3171c...` directly could leave the deployed model state inconsistent with the already-applied database schema. The new pipeline prevents this by requiring `origin/main` to be an ancestor of the requested release SHA. The correct remediation is a reviewed merge/integration commit, not a direct candidate-branch deployment and not migration rollback.

## Draft Exam Security

Phase 1H's real HTTPS lifecycle evidence remains the current reproduction: an assigned student received HTTP `200` for a draft exam detail that must be concealed with `404`. The fixture was positively identified and purged after that run.

Static comparison confirms the deployed `c60a5c...` handler lacks the status restriction. Current source filters student list, detail, and access-key lookup to `scheduled`, `live`, or `completed`; attempt start independently rejects draft state. Focused local tests pass for:

- assigned draft concealment and start rejection;
- inactive selected-student assignment rejection;
- future and expired window rejection;
- institute boundary enforcement; and
- release identity returned by health.

A dedicated HTTPS deployment gate now verifies list concealment, detail `404`, and start rejection using a pre-provisioned synthetic assigned draft fixture. It also verifies that Django health and Next headers attest the expected Git and archive digests. It is fail-closed when fixture variables are absent. The gate was discovered by Playwright (`2` tests), but the draft case was not rerun because no authorized candidate was deployed and the prior synthetic fixture was cleaned. It is **Blocked**, not passed.

## Reverse Proxy Status

The prepared nginx template:

- returns `444` for unknown HTTP hosts;
- rejects unknown TLS handshakes with `ssl_reject_handshake on`;
- redirects HTTP only for the intended hostname;
- routes `/api/v1/`, `/api/schema/`, `/api/docs/`, and `/django-admin/` to Django;
- keeps Next API proxy routes separate; and
- retains HSTS, CSP, frame, MIME, referrer, and permissions headers.

The template passed `nginx -t` in nginx 1.28. Isolated functional probes also produced a correct-host `301`, an unknown HTTP-host empty response from nginx `444`, and an unknown TLS SNI handshake rejection. The running stage was not changed and still behaves as follows:

| Probe | Running stage result | Required result |
| --- | --- | --- |
| Unknown TLS SNI/Host | `200` from another Next.js vhost | TLS handshake rejection |
| Unknown HTTP Host | `404` from current default server | Fail-closed rejection |
| `/api/schema` | `404` | `308` to `/api/schema/` |
| `/api/schema/` | `308` back to no-slash route | Django schema response |
| `/api/docs/swagger/` | `308` loop toward no-slash route | Django Swagger response |
| `/django-admin` | `301` | deterministic `308` |
| `/django-admin/` | `404` | Django admin/login response |

The earlier read-only host audit remains valid. A fresh `nginx -T` hash could not be captured because this execution session no longer had the authorized SSH identity (`publickey` rejection). Public HTTPS probes were still executed and retained. No attempt was made to bypass SSH controls.

## Build Provenance Remediation

The pipeline now:

1. removes deploy-only mode so deployment cannot skip backend and frontend gates;
2. requires an exact 40-character `RELEASE_GIT_SHA`, HTTPS origin, deployment environment, and approval reference;
3. fetches `origin/main`, requires it to be an ancestor of the candidate, and checks out that SHA detached;
4. rejects a dirty CI checkout;
5. builds one deterministic active-stack `git archive` (deployment, Django, Next, and Expo only) and records its SHA-256;
6. records Git SHA/tree, UTC build timestamp, environment, lockfile digests, packaging type, and source archive digest in `release-manifest.json`;
7. verifies the manifest before extraction and deployment;
8. deploys the extracted archive rather than the Jenkins workspace;
9. writes identical non-secret `.env.build` files for Django and Next;
10. exposes the full Git SHA and archive digest through Django health and validated Next response headers;
11. runs Expo typecheck, release-policy tests, and target-profile configuration validation;
12. checks the running HTTPS entry point, redirect, invalid hosts, Django routes, and runtime identity; and
13. executes the focused staging provenance/draft-concealment Playwright gate.

The current server does not use containers, so a container image digest would be false provenance. The immutable identity for this topology is the verified source archive digest plus the built Next identity and running Git/archive attestation.

## Mobile Release Preparation

Release transport controls remain HTTPS-only and the release-policy tests pass `5/5`. The production validation correctly rejects the current package identities:

- Android: `com.anonymous.nexorastudentmobile`
- iOS: `com.anonymous.nexora-student-mobile`

No authoritative approval for replacement identifiers was found. They were deliberately not changed. No signing key or credential was generated, substituted, printed, or committed. The unsigned/debug-unapproved signing state remains a release blocker. The prior unsigned Android artifact evidence remains valid; Phase 1H.1 did not represent it as production signed.

## Execution Results

| Check | Passed | Failed | Blocked/not run | Classification |
| --- | ---: | ---: | ---: | --- |
| Release manifest and Jenkins contract unit tests | 6 | 0 | 0 | Local pass |
| Focused Django provenance/security/API tests | 8 | 0 | 0 | Local pass; includes draft, unassigned, inactive, windows, cross-student/role/institute, and health identity |
| Django system/migration source checks | 2 gates | 0 | 0 | Local pass; does not resolve stage-only migration |
| Web TypeScript and production build | 2 gates | 0 | 0 | Local pass; 153 pages generated |
| Local Next provenance-header runtime probe | 1 | 0 | 0 | Local pass |
| nginx 1.28 syntax and fail-closed behavior | 2 gates | 0 | 0 | Local pass; not deployed |
| Jenkinsfile Groovy syntax | 1 | 0 | 0 | Local pass; Jenkins declarative runtime not executed |
| Stage provenance Playwright | 0 | 1 | 0 | Real HTTPS failure: expected SHA, received `local` |
| Stage draft-concealment Playwright | 0 | 0 | 1 | No promoted candidate/authorized synthetic fixture |
| Running unknown-host and route checks | 0 | 2 gate groups | 0 | Real HTTPS failures retained |
| Expo TypeScript | 1 gate | 0 | 0 | Local pass |
| Expo release-policy tests | 5 | 0 | 0 | Local pass |
| Expo production configuration | 0 | 1 expected rejection | 0 | Correct fail-closed result for unapproved IDs |
| Authorized staging promotion | 0 | 0 | 1 | Explicit authorization not provided |

The Phase 1H.1 checks are release gates, not new frozen catalog cases. Unique active-stack totals remain:

| Priority | Passed | Failed | Blocked | Skipped | Not run |
| --- | ---: | ---: | ---: | ---: | ---: |
| P0 | 221 | 0 | 0 | 0 | 0 |
| P1 | 263 | 0 | 0 | 0 | 0 |
| P2 selected catalog | 0 | 0 | 0 | 0 | 0 |

The candidate-level staging gate is separately **failed/blocked** and prevents release despite the frozen functional catalog totals.

## Files Changed

Phase 1H.1 changes:

- `Jenkinsfile`
- `deployment/nexora-learn-web.service`
- `deployment/release_manifest.py`
- `deployment/verify-https-entrypoint.sh`
- `deployment/tests/__init__.py`
- `deployment/tests/test_release_manifest.py`
- `deployment/tests/test_jenkins_release_contract.py`
- `edutech_backend/.env.production.example`
- `edutech_backend/config/health.py`
- `edutech_backend/config/settings/base.py`
- `edutech_backend/apps/reports/tests/test_audit_and_health.py`
- `edutech_web/next.config.ts`
- `edutech_web/package.json`
- `edutech_web/tests/e2e/deployment/staging-release-security.spec.ts`
- `docs/qa/04-master-qa-coverage-matrix.md`
- `docs/qa/17-phase1h1-staging-parity-security-remediation.md`

Prepared Phase 1H files were validated and retained, including `deployment/nexora-learn.nginx.conf`, `deployment/nexora-learn-backend.service`, `deployment/run-with-env.py`, Django route alignment, and Expo release-safety configuration. Flutter was untouched.

## Remaining Blockers

1. No reviewed integration commit contains current `main`, the candidate work, and the Phase 1H/1H.1 fixes.
2. Staging still runs divergent application and stale web artifacts.
3. Draft exam detail is still disclosed on the running stage.
4. Unknown TLS hosts still reach a valid application.
5. Schema/docs/admin proxy contracts are still wrong on the running stage.
6. Runtime build identity remains `local`; no stage archive digest exists.
7. Effective nginx hash could not be refreshed without the authorized SSH identity.
8. Android/iOS identifiers are unapproved placeholders; production signing is unavailable.
9. Signed Android HTTPS-device, iOS, accessibility, performance, restore, and rollback evidence remains open.

## Authorized Promotion Instructions

These steps require a reviewed change window and authorized Jenkins/staging credentials. They were **not** executed in Phase 1H.1.

1. Create an integration branch from current `origin/main` (`c60a5c...`). Merge the candidate and Phase 1H/1H.1 commits. Preserve `economy.0011_expand_operator_policy_scopes`; resolve model/migration conflicts without renumbering or reversing the applied migration.
2. Run the complete CI mode on the resulting clean commit. Confirm `git merge-base --is-ancestor origin/main <MERGED_SHA>` succeeds, migration source includes economy `0011`, and all required local gates pass.
3. Review the shared-host nginx inventory. Render `deployment/nexora-learn.nginx.conf` for `learn.accerio.in`, ensure it is the only default server for ports 80/443, back up affected site files, run `sudo nginx -t`, and only then reload nginx. Restore the prior files if validation fails.
4. Provision one isolated assigned draft exam/student through approved staging administration, store the username/password in the two Jenkins staging credential entries, and supply its exam UUID as `STAGING_DRAFT_EXAM_ID`. Do not use production or real learner data.
5. Start Jenkins with `PIPELINE_MODE=full`, `DEPLOY_ENV=staging`, `DEPLOY_PUBLIC_ORIGIN=https://learn.accerio.in`, `RELEASE_GIT_SHA=<MERGED_SHA>`, all quality gates enabled, and a valid `DEPLOY_APPROVAL_REFERENCE`.
6. Retain the archived `source.tar.gz`, `release-manifest.json`, `SHA256SUMS`, Playwright results, and Jenkins log. Confirm Django health and Next headers report the exact requested Git SHA and archive SHA-256.
7. Require `deployment/verify-https-entrypoint.sh` and both staging Playwright release-security cases to pass. Then run the full HTTPS lifecycle and mandatory negative matrix from Phase 1H.
8. Purge only the positively identified synthetic tenant/fixture, verify zero exact residue, and retain cleanup evidence.

Do not promote `ad3171c...` directly, do not deploy the current dirty worktree, and do not mark Phase 1H.2 passed from health-only or local evidence.

## Evidence Index

- Git and branch divergence: `docs/qa/evidence/phase1h1/local-stage-git-divergence.txt`, `remote-ref-parity.txt`
- Source/runtime and migration parity: `stage-readonly-parity-audit.txt`, `migration-parity.txt`, `stage-only-migration-analysis.txt`
- Public runtime failures: `stage-public-security-baseline.txt`, `stage-provenance-playwright.log`, `stage-provenance-error-context.md`
- SSH evidence limitation: `stage-ssh-refresh-attempt.txt`
- Local deployment controls: `deployment-provenance-tests.log`, `jenkinsfile-groovy-syntax.log`, `nginx-template-syntax.log`, `nginx-fail-closed-functional.log`
- Django: `django-security-provenance-tests.log`, `django-system-migration-checks.log`
- Web: `web-typecheck-production-build.log`, `web-runtime-provenance-headers.txt`
- Expo: `expo-release-policy.log`
- Evidence integrity/redaction: `evidence-sensitive-data-scan.txt`, `artifact-inventory.txt`, `artifact-sha256.txt`
- Phase 1H draft failure and cleanup: `docs/qa/evidence/phase1h/stage-full-lifecycle/`, `stage-lifecycle-purge.txt`, `stage-lifecycle-cleanup-verification-final.json`

## Recommendation

**NO-GO for Phase 1H.2 today.** Proceed only after a clean integration SHA exists, contains current `main`, is authorized for staging promotion, and the shared nginx change is reviewed. Phase 1H.2 should then be the real HTTPS rerun against that attested candidate, followed by signed mobile and remaining release gates. Production readiness remains withheld.
