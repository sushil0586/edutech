# W03 reliability and W04 header follow-up

21 October 2026. Objective exams only; descriptive grading is outside the pilot. Android/iOS remain student-only and require separate signed-device certification. This is local Docker evidence, not approval to go to market.

## Candidate and changed files

Application candidate: `581ed8f04565f080dfe3f82c966b8171ccdd5c87`, branch `integration/w01-release-20261021`, clean release worktree `/Users/ansh/Documents/Eductech-w01-release`. The original dirty application workspace was preserved. Docker review URL: **https://localhost:39123/login** with a task-local certificate. Six services: web, backend, Nginx, PostgreSQL, Redis and the new expiry-worker. Public staging is not certified.

The [release manifest](evidence/w03-reliability-20261021/release-manifest.json) identifies source archive SHA-256 `2ffce0259dce8f68dd4c5b69690fb903043a3d210d7714957fd8a9df5d4f97f2`. Documentation commits after this application SHA do not change the running artifact.

Relative to previous checkpoint `cc2a1bb`: **17 application/deployment files, 345 additions and 10 deletions**. Review the [complete application patch](evidence/w03-reliability-20261021/changes.patch).

| Area | Changed files and behavior |
| --- | --- |
| Independent expiry | `edutech_backend/apps/attempts/services.py`; new management package, commands package and `process_expired_attempts.py`; `deployment/performance/compose.phase3b1.yml`. Bounded per-attempt finalization, periodic worker and heartbeat health. |
| Conditional answer writes | Attempt serializers, views, services and `tests/test_request_recovery.py`; web `src/lib/api/student.ts`, student `app/attempts/[attemptId]/page.tsx`, and `attempt-concurrent-edit.mutable.spec.ts`. Reject stale version with 409 and show the authoritative saved response. |
| Access-cookie renewal | New web `src/proxy.ts`. Renew expiring access cookies on protected routes; clear credentials on rejected renewal, preserve them on transient service errors. Backend authorization remains mandatory. |
| Runtime hardening | Backend `Dockerfile.performance` disables Gunicorn control socket; performance `nginx.conf` sets Connection upgrade only when an upgrade is requested. |
| Header layout | Web `globals.css`, `student-header-layout.spec.ts`; remove an unused lint suppression in `attempt-action-form.tsx`. Separate search, filters and actions to prevent overlap. |

## Verification

The **real fifteen-minute exam passed** (930 seconds observed, zero retries). A real 60-second access token expired and its replacement cookie persisted. Acknowledged answers survived a backend outage of at least 60 seconds and a database outage of at least 120 seconds. Worker health became unhealthy during the database outage, then recovered without a process restart. The browser went offline two minutes before expiry. A raw database query, before any learner recovery read, found `auto_submitted`, exactly one result, score `2.00` and `submitted_at == expires_at`. Reconnection showed the terminal receipt. See [result](evidence/w03-reliability-20261021/soak-result.json) and [timeline](evidence/w03-reliability-20261021/soak-final-progress.jsonl). This is not a full-duration certification for a longer pilot exam or actual refresh-token expiry.

The corrected expired-token logout check passed (one test, zero retries). The teacher results navigation test also passed three consecutive runs with zero retries; this does not establish the original intermittent failure's root cause. Strict task-certificate HTTPS verification matched web/API build and archive identity. Nginx syntax, Django deployment checks and migration checks passed. The worker was healthy, non-root and read-only with zero process restarts after database recovery. Backend startup/restart logs contained zero Gunicorn control-socket/read-only errors. See [runtime identity](evidence/w03-reliability-20261021/runtime-summary.json), [worker state](evidence/w03-reliability-20261021/worker-runtime.json) and [Gunicorn check](evidence/w03-reliability-20261021/gunicorn-runtime.json).

The backend regression pack passed **124 tests**, the final immutable candidate passed **35 focused backend tests**, and deployment checks passed **31 tests**. These packs overlap; they are not a claim of 190 unique tests. Final production Docker builds, TypeScript and targeted ESLint passed.

The first 18-test browser pack had **17 passes and one harness failure**: the logout selector matched “log out” but the actual button is “Logout”. The corrected test is reported separately; this failure is retained rather than relabeled as an initial pass. Stale-tab overwrite rejection, interrupted-network saves, full institute lifecycle, suspension, live refresh revocation, published notifications, teacher results and header checks passed in that initial pack.

Existing row hashes matched across the final image replacement before the worker resumed or new test fixtures were intentionally mutated: **17 answers, 14 attempts, 11 results**. See [preservation evidence](evidence/w03-reliability-20261021/preservation.json). This verifies candidate replacement, not a backup restore rehearsal. The worker subsequently finalizes expired synthetic attempts intentionally.

## Functional findings corrected

- Expired attempts could previously wait for a recovery read to finalize. A separate bounded worker now runs every 15 seconds, with 100 attempts per batch and per-record failure isolation.
- Stale web tabs could overwrite in-progress answers. Version-aware writes now reject stale changes; the first browser check exposed an uncontrolled radio still displaying the rejected selection. The conflict form now remounts from the saved response.
- Server-rendered recovery could use a renewed access token without persisting it to the browser. Next Proxy now writes the renewed secure HttpOnly cookie; an actual short-lived access token was used in the timed test.
- The unused Gunicorn control socket attempted to write under a read-only root filesystem. It is disabled for this deployment.
- Student header controls overlapped at 1280 pixels. The sampled layout now separates them.

The original intermittent teacher-navigation/proxy reset remains unresolved. The Connection header change is hardening; it is not proof of that incident's root cause. Expected health failures during deliberate outages are distinct from the original credential-provisioning reset.

## Visual inspection

Reviewed the [1280px](evidence/w03-reliability-20261021/student-header-1280.png), [1440px](evidence/w03-reliability-20261021/student-header-1440.png) and [390px](evidence/w03-reliability-20261021/student-header-390.png) captures. Visible controls have unobstructed center hit targets and search accepts input. The overlapping controls from W03-UI-01 are addressed. Header density/height and first-viewport learner priority still need design work. These samples do not certify keyboard, zoom, screen-reader, all long labels or all browsers.

## Compatibility and operation

`expected_answer_updated_at` is optional: null expects an absent answer, a timestamp must match, and mismatch returns 409 without mutation. Omission retains legacy behavior. Deploy backend before web. Older/native clients require adoption before stale in-progress overwrite protection can be claimed for them. No schema migration is introduced. Explicit saves remain required; fully offline exams and cross-device draft merging are not promised.

The worker command is `python manage.py process_expired_attempts --loop --interval 15 --batch-size 100`. A successful heartbeat must be newer than 60 seconds. Inspect worker health and logs after database recovery. Polling and a bounded batch do not provide an instantaneous deadline or capacity guarantee.

For rollback, explicitly stop the expiry-worker before using an older compose definition, preventing it from continuing as an orphan. Downgrading removes new version checks. Preserve saved answers, deadlines, grades, results and notifications; do not restore an older database over newer learner work. See the [updated recovery contract](../qa-runbooks/W03_ATTEMPT_RECOVERY.md).

## Remaining release gates

W03 and W09 remain In progress; W03.04 stays Deferred. W04 has begun but the full UI/UX work is not complete.

- Approve actual pilot curriculum, content inventory and assessment/publication policies; exclude descriptive content from that offer. The curriculum question remains unanswered.
- Certify the actual pilot exam duration, refresh-token expiry, broader browser coverage and signed student Android/iOS devices. A controlled fifteen-minute exam is a bounded local check.
- Investigate the original intermittent navigation/proxy failure; passing repeats do not erase it.
- Reproduce a source-review mobile risk: 30-second query refetch can reseed unsaved answer drafts. This is not yet a confirmed device defect and no native source was changed here.
- Complete teacher authoring, onboarding, learner task priority, error-state and accessibility work; run unfamiliar-user acceptance.
- Establish cohort capacity, backup restore/incident rehearsal, public HTTPS staging, customer policies/support, and a pilot go/no-go. Paid launch additionally requires the commercial/payment gates.

Raw fixtures, credentials, database material and browser traces remain private in `/Users/ansh/Documents/Eductech-w03-reliability-artifacts-20261021`. Only sanitized evidence and harness source are committed.
