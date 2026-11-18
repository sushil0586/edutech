# W03 objective assessment recovery — Docker verification

21 October 2026 · Workstream status: **In progress** · Local engineering checkpoint; not market or public-staging approval.

The product owner confirmed **objective exams first**, with descriptive grading outside the pilot. Android/iOS remain student-only. This checkpoint fixes stale finalization requests, expiry recovery, timer drift, lost-response feedback, stale save indicators and published-result notification links.

## Candidate and workspace

- Application candidate: `d811d7a3fabcb6b4ffa7dcc2b995fc5f65f19d79`, branch `integration/w01-release-20261021`.
- Source worktree: `/Users/ansh/Documents/Eductech-w01-release`. Original workspace application edits were preserved; only reports/plans are mirrored there.
- Running URL: [local Docker login](https://localhost:39123/login). Uses the task's self-signed localhost certificate.
- Private artifacts: `/Users/ansh/Documents/Eductech-w03-artifacts-20261021`.
- Exact source archive, image labels, health response and web provenance headers are matched in [runtime evidence](evidence/w03-objective-recovery-20261021/runtime.json) and [manifest](evidence/w03-objective-recovery-20261021/manifest.json).
- The task-only `edutech-w02-docker` project was upgraded with W03-tagged images; its name is retained to preserve the synthetic database and local port. PostgreSQL, Redis, backend, web and Nginx remain isolated from unrelated Docker projects.

## Changed application and test files

**11 files, 398 additions and 66 deletions**, relative to W02 documentation checkpoint `26faf93`. The recovery contract and QA/planning files are additional documentation changes.

[Complete W03 application patch](/Users/ansh/Documents/Eductech-w03-artifacts-20261021/w03-application-changes.patch) · [Previous W02 application patch](/Users/ansh/Documents/Eductech-w03-artifacts-20261021/w02-application-changes.patch)

| File | Change and purpose |
| --- | --- |
| [Attempt services](/Users/ansh/Documents/Eductech-w01-release/edutech_backend/apps/attempts/services.py) | Refresh and lock the current attempt before saves, section changes and finalization. Expiry uses the normal result/notification path and the original deadline. |
| [Attempt serializers](/Users/ansh/Documents/Eductech-w01-release/edutech_backend/apps/attempts/serializers/__init__.py) | Recover an expired attempt when its summary is opened directly. |
| [Backend recovery tests](/Users/ansh/Documents/Eductech-w01-release/edutech_backend/apps/attempts/tests/test_request_recovery.py) | Eight cases covering stale saves/submits, duplicate saves, actual PostgreSQL races, expiry result creation and direct-summary recovery. |
| [Student attempt page](/Users/ansh/Documents/Eductech-w01-release/edutech_web/src/app/(student)/app/attempts/[attemptId]/page.tsx) | Pass the saved answer's acknowledgment timestamp into the form. |
| [Attempt action form](/Users/ansh/Documents/Eductech-w01-release/edutech_web/src/components/ui/attempt-action-form.tsx) | Retain drafts after transport failures; clear the dirty guard against a server acknowledgment; preserve edits made while a previous request is in flight. |
| [Countdown](/Users/ansh/Documents/Eductech-w01-release/edutech_web/src/components/ui/attempt-countdown.tsx) | Calculate remaining time from elapsed wall time and refresh it on tab resume rather than counting timer callbacks. |
| [Timer submission](/Users/ansh/Documents/Eductech-w01-release/edutech_web/src/components/ui/attempt-timer-auto-submit.tsx) | Check expiry when connectivity or the tab returns, including reconnecting after a zero-time offline state. |
| [Save/recovery status](/Users/ansh/Documents/Eductech-w01-release/edutech_web/src/components/ui/attempt-resilience-panel.tsx) | Refresh confirmation timestamps/state after server redirects; show unconfirmed actions as needing attention. |
| [Student notification links](/Users/ansh/Documents/Eductech-w01-release/edutech_web/src/lib/student/notifications.ts) | Open the originating attempt for a published result; legacy results without an attempt ID fall back to Results. |
| [Browser network recovery](/Users/ansh/Documents/Eductech-w01-release/edutech_web/tests/e2e/workflow/attempt-network-recovery.mutable.spec.ts) | Real offline and lost-response requests, retained/cleared draft states, access-token renewal, timer catch-up and lost submission receipt recovery. Requires an isolated mutable fixture. |
| [Published notification journey](/Users/ansh/Documents/Eductech-w01-release/edutech_web/tests/e2e/workflow/student-published-result-notification.spec.ts) | Click the actual notification and assert the exact attempt URL and fixture's 100% result. |

Review from the command line:

```sh
git -C /Users/ansh/Documents/Eductech-w01-release diff 26faf93..d811d7a -- edutech_backend edutech_web
```

## Executed checks

| Check | Result and limits |
| --- | --- |
| Earlier backend regression checkpoint | **116 passed**, covering attempt APIs and results smoke/scoring/publication contracts. The later one-line summary recovery fix is covered separately on the final candidate. Do not add overlapping totals together. |
| Final immutable Docker backend | **13 passed**, including all eight new recovery/concurrency cases, summary query/visibility checks, exact-deadline rejection, duplicate submission and immediate retry ranking. PostgreSQL is used. |
| HTTPS/API/database reconciliation | **15 checks passed** with pinned localhost TLS verification. Two objective attempts each retain one answer/result, score 2.00/2.00, publish correctly, rank correctly and produce a 2.00/100% analytics mean. Each learner receives one in-app submission notice and one publication notice, including repeated publication. |
| Final browser recovery check | **1 passed** on the final candidate, including the corrected acknowledged-save dirty guard. Accelerated failures/token expiry are not a full-duration soak. |
| Final combined browser pack | **13 passed in one clean batch, zero retries**, covering eight role/scope cases, teacher smoke/results navigation, a fresh full institute-to-student lifecycle, interrupted-network recovery and the published-result click. |
| Final teacher results repeats | **3 consecutive isolated runs passed, zero retries**, on the final candidate, in addition to the same case passing in the representative role/lifecycle pack. Original intermittency remains unexplained. |
| Saved-data preservation | All **11 answers, 9 attempts and 7 results** present before the final image replacement retained identical complete-row hashes. Comparison was made before subsequent intentional synthetic test mutations. |
| Build/static/deployment | Production Docker build and TypeScript pass. Targeted ESLint has zero errors and one unused suppression warning. Django deployment checks pass; no pending migration. |

Test processes use isolated test databases and writable temporary media under development test settings. The serving backend retains production settings, HTTPS redirects, non-root execution and a read-only filesystem. Browser automation accepts only the local test certificate exception; the independent HTTPS probes verify that certificate strictly.

The fresh full lifecycle remains unchanged in its assertions. Its local management helper must run from the extracted artifact web directory; a private Python shim forwards only its synthetic exam-state commands into the Docker backend. No weaker assertions or direct navigation replace the teacher's click-based flow.

## Failures found and corrected

- New regression tests first reproduced both stale-object defects: a save could alter a submitted answer, and a second stale object could finalize an attempt again. Database locking and fresh state validation address both.
- Automatic expiry originally scored an attempt without following normal result generation. Direct summary recovery also left an expired attempt in progress. Both paths now converge on finalization while retaining publication visibility.
- A received save could leave a stale unsaved-change warning. Forms now reconcile against the server answer timestamp. Lost responses retain the draft and warning.
- Published-result notifications originally returned to the notification inbox. They now open their originating attempt summary.
- An intermediate combined browser run had **10 passed and 3 failed**: the dirty-guard defect, a lifecycle harness working-directory error, and a test expecting raw marks where the summary displays a percentage. The latter expectation is corrected to the deterministic 100%; raw 2.00 marks are independently checked via API/database. Earlier failures/traces remain private; they are not represented as clean passes.
- The initial report probe assumed publication also calculated ranks. Ranking is an explicit teacher operation; the corrected probe performs that operation and verifies both ranking and publication. Repeated publication also checks notification cardinality.

## Visual inspection

The [published receipt screenshot](evidence/w03-objective-recovery-20261021/published-result-receipt.png) confirms the correct synthetic exam and 100% result. Its existing desktop header is crowded: search/source/subject controls overlap in the 1280×720 capture. Track this as **W03-UI-01 under W04**; functional success does not certify layout or browser breadth.

## Release limits and remaining work

W03 is **not closed** by this checkpoint.

1. W05 must approve the actual pilot curriculum, question types, content and exam policies, and exclude descriptive variants from that pilot's inventory/policies. Existing descriptive features are not globally removed or certified.
2. The original teacher-navigation intermittency has not been reproduced or explained. Consecutive passes improve evidence but do not prove its root cause is resolved.
3. Run actual full-duration sessions, refresh-token expiry, prolonged outages and the intended service topology. Independently scheduled expiry processing is not certified in this Docker topology; recovery reads finalize expired attempts.
4. In-progress answer changes still use commit order. This change protects finalization; it does not add revision-based conflict detection or merge concurrent-device drafts.
5. Complete broader empty/pending/failed report states, recommendations/insufficient-data UX and optional parent/external notification delivery checks for the channels entering launch.
6. Retain the W02 intermittent proxy-reset and Gunicorn control-socket findings under W09. Healthy services and fresh passes do not establish those root causes. Public staging, load, incident/restore readiness and signed Android/iOS testing remain separate gates.

See the [recovery and compatibility contract](../qa-runbooks/W03_ATTEMPT_RECOVERY.md), [machine-readable checkpoint](evidence/w03-objective-recovery-20261021/summary.json) and [execution tracker](../implementation-plans/go-to-market-2026-10/11-EXECUTION-TRACKER.md). No cloud deployment, push, mobile release or modification of the original workspace's application source was performed.
