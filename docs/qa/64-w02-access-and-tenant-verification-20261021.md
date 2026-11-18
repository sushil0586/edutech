# W02 access and institute isolation — 21 October 2026

W02 implementation and the selected local Docker authorization checks passed. The candidate is ready for independent release QA. Public staging and overall go-to-market gates remain open, including the reliability findings below.

## Decisions and resulting behavior

The product owner confirmed institute-wide teacher collaboration and allowing existing attempts to finish during institute suspension. The [access contract](../qa-runbooks/W02_ACCESS_CONTRACT.md) records the full matrix, state transitions, compatibility and rollback limits.

- Teachers can collaborate on their institute's teaching resources, including advanced authoring without a personal assignment. Cross-institute access, author impersonation, money administration and grading claim/moderation overrides remain denied.
- Archive is distinct from suspension. Only platform admins create/archive institutes or suspend/reactivate their access. Suspension requires a reason and writes an audit event. Reactivation preserves archive state and history.
- Ordinary operations are blocked for a suspended institute, including stale sessions. A student may recover and finish an own attempt that started before suspension. Existing answer saving, upload, timer rules and submission still apply. New starts and unrelated activity are denied. PostgreSQL row locking makes the suspension/start boundary consistent under concurrency.
- Disabled users, account profiles and required linked role profiles lose access through login, refresh and old bearer tokens. Password changes invalidate old access and refresh tokens.
- Parent alerts, counts and single/bulk mutations now respect active child relationships and per-child flags even without a child filter. Unpublished grades are excluded from parent result rows and progress. An empty selected alert page changes nothing.
- Cached browser identity no longer overrides an explicit API denial. Valid refresh tokens can recover expired access tokens. The attempt receipt remains visible when optional practice recommendations are denied. Students see a suspension explanation; platform admins have separate access controls.
- Additional audit fixes prevent institute admins from creating another tenant, changing platform-controlled metadata, or resetting/disabling/enabling linked platform-admin, Django staff and superuser accounts.

## Exact candidate and evidence

Application commit: `fb4c806053c202cb665fc0941c149a4aaa184ef3` on `integration/w01-release-20261021`, implemented in `/Users/ansh/Documents/Eductech-w01-release`.

Source archive SHA256: `54f8198eb84ddd1aef788cfb145a027715a4d3d5eab8152be2487daa71387d77`. Docker images were built from this prepared archive; web headers, API identity and image labels agree. This is a local `linux/arm64` build.

| Check | Result |
| --- | --- |
| Final candidate backend regressions | **160 passed**, 323.726 seconds |
| Direct HTTPS authorization/state probes | **70 passed** |
| Distinct browser cases | **11 passed across runs**, with the first-batch transport failure recorded below |
| Browser suspension journey | Saved answer survived reload; existing attempt submitted; new start and suspended teacher blocked; reactivation restored access |
| Fresh institute → student → exam → published result | Passed unchanged on rerun in 1.9 minutes |
| Role boundaries and teacher workspaces | Passed |
| Real UI sign-in and cookie flags | Secure, HttpOnly, SameSite=Lax on HTTPS |
| Web typecheck and Docker production build | Passed; 153 static pages |
| Deployment controls | 31 passed |
| Django production deployment check | No issues; JWT scheme correctly documented |
| Migrations | `institutes.0008` applied; no pending migrations |
| Existing data across additive migration | Saved answers, attempts and results matched the synthetic W01 baseline byte-for-byte |
| Runtime | All five application services healthy; API/web non-root and read-only |

The backend suite covers account states, tenant boundaries, student eligibility, parent visibility, advanced authoring, registration, result flows, selected economy operations, CSV export and schema authentication. Its separate test process uses development HTTP-client settings and an isolated test database; the serving API retains production settings and SSL redirects.

The 70 real HTTPS probes include disjoint teacher assignments, forged foreign identifiers, another student's attempt/results, manual grade denial, grants/order confirmation, platform CSV export, revoked parent links, inactive parent profiles, live account/teacher deactivation, password reset, privileged credential protection and tenant metadata/lifecycle restrictions. Only test-fixture login throttle keys were reset; this run does not certify rate limiting.

## Open reliability findings

1. **W02-RUNTIME-01 — High, W09.02:** The first 11-test browser batch had 10 passes and one 502 during student login provisioning. Nginx recorded an upstream connection reset from the web container. The container did not restart or run out of memory, and no backend write for that failed request was logged. The unchanged full lifecycle passed on rerun. The root cause remains open; a passing retry does not close it. Investigate the proxy/application connection behavior and safe recovery for credential-provisioning writes before pilot signoff.
2. **W02-RUNTIME-02 — Medium, W09.02:** Gunicorn's control service logs a read-only-filesystem error for `/home/edutech` at startup. Application workers and health checks remain healthy. Configure an appropriate runtime path or disable the unused control service, then recheck startup logs.

These findings are carried into W09 and final release QA. No capacity or production reliability certification is implied.

## Compatibility and local review

Migration `institutes.0008` adds access-state columns with suspension disabled by default. It does not rewrite answers, grades or historical results. Apply it before starting this application. Ordinary updates cannot write the access-state fields; use the audited platform actions.

Existing tokens issued before this release require a fresh sign-in because password-change revocation now uses a signed credential fingerprint. Ordinary institute settings use dedicated validated fields; platform policy metadata is no longer tenant-editable. Rollback to pre-W02 application code would remove suspension and privacy enforcement, so it is unsafe while any tenant is suspended.

The updated stack is running at **https://localhost:39123/login**, using a local test certificate. A browser may require accepting that certificate. Demo credentials remain `demo-student` / `Demo@12345`; the other seeded role accounts use the same demo password. The earlier W01 stack is stopped and its volumes retained.

Task artifacts and the Compose helper are in `/Users/ansh/Documents/Eductech-w02-artifacts-20261021/docker`. Run `./compose.sh ps` there to inspect or `./compose.sh stop` to stop this stack. Its PostgreSQL and Redis ports are not exposed to the host. The final test database was removed. Raw traces, fixture credentials, the database dump, environment file and certificate private key remain outside the repository.

Cross-institute public exams remain deferred from the initial pilot; a platform source label does not bypass institute eligibility. Public HTTPS staging, target-host architecture, provider integrations, complete production load/recovery gates and student Android/iOS device/store certification remain pending.

- [Sanitized execution summary](evidence/w02-access-20261021/summary.json)
- [70 HTTPS policy probes](evidence/w02-access-20261021/http-policy-summary.json)
- [Runtime and image identity](evidence/w02-access-20261021/runtime-summary.json)
- [Migration data preservation](evidence/w02-access-20261021/data-preservation.json)
- [Real UI login and cookies](evidence/w02-access-20261021/cookie-summary.json)
- [Access controls screenshot](evidence/w02-access-20261021/access-controls.png)
