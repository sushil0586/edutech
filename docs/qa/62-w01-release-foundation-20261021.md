# W01 release foundation execution

21 October 2026 · Local preparation verified · Live staging certification pending

The release foundation now prepares a clean, reproducible active-stack source artifact, preserves applied migration history and checks runtime identity. Local TLS routing, secure login cookies and the institute-to-student exam lifecycle pass. W01 remains in progress because the live staging deployment path is unavailable and its W02, W03 and W09 release dependencies are not complete.

## Candidate and source history

| Item | Value |
| --- | --- |
| Branch | `integration/w01-release-20261021` |
| Worktree | `/Users/ansh/Documents/Eductech-w01-release` |
| Application candidate | `a5495382fa9483bdd02b064eaaef78ca6360fd58` |
| Artifact SHA256 | `5b71883509ba2c375499ea0f49f670790f6e323cc1cc16f08550aa7fe0cb8346` |
| Current fetched main | `c60a5c757543f8ea8ecb06d92d2751f0589ab207` |
| Reused integration baseline | `823071ba0fabad2454ce18f5f7be6933d4a15437` |
| Ancestry | Current main and the original `ad3171c` candidate are ancestors; zero main-only commits |
| Source archive | `/Users/ansh/Documents/Eductech-w01-artifacts-20261021/final-candidate/source.tar.gz` |

The original workspace was on an older branch. A separate worktree already contained the reconciled main/candidate histories, the staging economy migration and later committed UX/reliability changes. This work builds on that committed lineage instead of merging the stale root snapshot again. The original workspace and the other integration worktree remain intact. Their uncommitted authoring/SSR changes were not silently included in this candidate.

The 21 October audit describes the original workspace. Its findings must be rechecked against this newer lineage before treating them as current defects. W01 does not certify all later authoring features or replace their outstanding functional gates.

## Changes implemented

- Added `deployment/release-policy.json` to declare the four packaged roots, supporting/archival roots, student-only native scope, dependency inputs and the preserved economy migration digest.
- Added `deployment/prepare_release.py` to require an exact checked-out SHA, a clean worktree and main ancestry; reject rewritten baseline migrations, unsafe archive paths, tracked environment secrets and signing keys; and produce source, manifest, inventory and checksums outside the checkout.
- Made archive digests reproducible for repeated preparation of the same commit and made manifest dependency paths independent of the build machine.
- Connected Jenkins packaging to the checked preparation command and checksum verification.
- Added deployment-control tests to CI and refused deployment when the browser suite is `none`.
- Initialized and seeded the CI database before starting the browser-test server. Previously the actual server database could remain empty even after transactional backend tests passed.
- Bounded every HTTPS probe and required exact provenance header values. Unknown-host checks now distinguish TLS rejection or nginx empty replies from connection refusal/timeouts.

No application permission, scoring, student mobile identity or payment rule was changed by these W01 commits.

## Verification results

| Check | Result | Scope |
| --- | --- | --- |
| Deployment controls | 31 passed | Packaging refusal cases, history/migration guards, deterministic archive, HTTPS failure classification and existing container/AWS preparation contracts |
| Backend selected pack | 79 passed | Auth/access, result/scoring/submission and deployment route contracts; application code unchanged by the final CI-only commit |
| Web quality | Passed | Final candidate TypeScript and production build, Next 16.4.2, 153 generated pages |
| Student mobile quality | Passed | TypeScript and five release-policy unit tests; no signed device/store certification |
| Repeated final archive preparation | Passed | Byte-identical `source.tar.gz` from two clean preparations |
| Isolated migration reconstruction | Passed | Exact fetched-main migration state followed by candidate checks: no model changes, no pending operations, one economy `0011` row |
| Local TLS proxy | 10 passed | Health/root, schema/docs/admin slash routing, TLS unknown-host rejection and HTTP unknown-host empty reply |
| Runtime provenance | Passed | API health and web headers agree with the final candidate SHA and artifact digest |
| Real UI login on local TLS | Passed | Access, refresh and session-profile cookies are Secure, HttpOnly and SameSite Lax |
| Final local TLS exam lifecycle | 1 passed in 34.8 seconds | Fresh institute/accounts, import/build/assignment, timing/assignment denials, answer save/submit, score, rank/publication and cross-user/tenant isolation |
| Backup restore | Passed locally | Task-owned PostgreSQL dump restored to a separate database; one institute, exam and result retained, score `2.00` |
| Baseline API against restored data | Passed locally | Older main source reads the restored student result with HTTP 200 and score `2.00`; this is not a full shared-host rollback |
| Live staging | Unverified | Public health request timed out; no current host, certificate, source or database attestation |

The first browser attempt stopped because a fresh validation database had no platform question package for the selected full-access onboarding profile. Seeding a public hub and its economy package corrected that fixture prerequisite; the existing lifecycle spec then passed unchanged. Raw failure and success traces remain in the local artifact directory. No assertion was relaxed.

The baseline database was reconstructed from migration files, not cloned from shared staging. Local TLS used a task-generated localhost certificate; direct API fixture calls used a local-only redirect override. These results cannot stand in for the real public certificate chain, effective shared-host configuration or the deployed candidate.

## Workstream status

| Task | Status | Remaining requirement |
| --- | --- | --- |
| W01.01 Source and migration integration | In progress | Local integration/preservation verified; actual shared-stage source and database comparison pending |
| W01.02 Reproducible artifacts | Passed locally | Artifact, source identity and running local web/API attestation verified; Jenkins execution itself remains unexecuted |
| W01.03 HTTPS routing | In progress | Isolated TLS routing verified; effective staging host configuration and public TLS verification pending |
| W01.04 Deployed lifecycle | Blocked | Live deployment access plus W02.02/W03.01 release acceptance; local TLS lifecycle is supporting evidence |
| W01.05 Promotion and rollback | Blocked | Full isolated database/media/web/API recovery passed; live promotion and agreed W09.04 operational targets remain |

## Live staging prerequisites

1. Identify the existing Jenkins job or approved staging host and credential location. No secret values should be pasted into chat or evidence.
2. Make the exact reviewed candidate reachable by CI. No remote branch was pushed during this work.
3. Compare effective stage source, web build and applied migration history before promotion. Preserve economy `0011`; stop on any unexpected schema/history difference.
4. Provision the isolated assigned-draft fixture required by the staging security gate. Use synthetic accounts and exact cleanup identifiers.
5. Run the configured pipeline with the exact candidate, the intended HTTPS origin, enabled backend/frontend/browser gates and the deployment change reference.
6. Require runtime provenance, public TLS/proxy checks and the full lifecycle/negative matrix on the deployed version. Repeat recovery rehearsal against the agreed operational targets before marking W01 complete.

The existing instruction to execute W01 authorizes this workstream; the outstanding input is the usable deployment connection and CI fixture configuration. No new deployment permission request is implied by this prerequisite list.

## Evidence

- [Sanitized execution summary](evidence/w01-release-20261021/summary.json)
- [Final source manifest](evidence/w01-release-20261021/release-manifest.json)
- [Source inventory and policy](evidence/w01-release-20261021/source-inventory.json)
- [Runtime identity](evidence/w01-release-20261021/final-runtime-identity.json)
- [Local TLS routing](evidence/w01-release-20261021/local-tls-probes.json)
- [Cookie flags](evidence/w01-release-20261021/tls-cookie-flags.json)
- [Restore summary](evidence/w01-release-20261021/restore-summary.json)
- [Release preparation and promotion runbook](../qa-runbooks/W01_RELEASE_PREPARATION_AND_PROMOTION.md)

Raw browser traces, the local certificate private key and database dump stay outside the repository under the restricted task artifact directory. They are not part of the release package or published evidence.

## Cleanup

Task-owned API/web processes and the isolated nginx/PostgreSQL containers and database volume were removed after verification. Raw traces, the synthetic backup and local TLS material remain in a restricted artifact directory outside source. Other projects, shared services and user databases were not changed.

## Continuation and exact staging blocker

The documented SSH key is available at the path already named in the staging runbooks. DNS still points `learn.accerio.in` to `3.106.125.117`. Direct connections to SSH, HTTP and HTTPS time out, so key authentication cannot be attempted. The configured AWS staging identity authenticates, but EC2 inspection and Lightsail inspection are denied in `ap-southeast-2`, the documented host region. No cloud resource, IAM policy or network rule was changed.

The required external change is to restore reachability of the documented host or provide its current reachable replacement staging/Jenkins endpoint. Local implementation or additional test retries cannot establish live certification while that connection is unavailable.

The local recovery rehearsal now covers Gunicorn, the standalone Next.js server, strict HTTPS server fetches, a database backup, referenced-media backup and real student UI login/results across three states: current candidate, previous release after restoration, and current candidate after forward recovery. All three retained the published score `2.00` and identical media bytes. The observed restore-and-rollback duration was 5.266 seconds for this tiny synthetic fixture; it is not a production recovery-time commitment.

A local Docker fixture initially selected an unreachable IPv6 host upstream, causing intermittent 502 responses. Resolving its IPv4 and waiting for direct application readiness corrected the test environment. No application authentication behavior or assertion was changed. Task-owned services and database storage were removed after the passing rehearsal.

- [Staging connection and cloud access evidence](evidence/w01-release-20261021/staging-access-recheck.json)
- [Full local service recovery evidence](evidence/w01-release-20261021/full-recovery-summary.json)

## Docker continuation

The later [Docker verification report](63-w01-docker-verification-20261021.md) records candidate `9bd1f564b6cb5935054ae92f253caa5945bd37b2`, the two Docker deployment corrections, and the local stack left running for review. Its artifact supersedes the earlier application candidate for subsequent Docker validation. The live staging blocker remains unchanged.
