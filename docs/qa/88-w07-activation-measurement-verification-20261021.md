# W07.05 activation measurement verification — 2026-10-21

## Outcome

The activation event stream, tenant-scoped summary API and platform-admin report cards are implemented and ready for pilot observation. W07.05 remains **Ready for human observation** because unfamiliar-user sessions have not been run.

## Verified behavior

- Seven funnel/support milestones use one allowlisted event writer with role, platform and release identity.
- Sensitive supplied fields are discarded; the automated test explicitly supplies answer text and a password and confirms neither is stored.
- Institute-admin summaries exclude another institute's event; non-admin access returns 403.
- The seven-day report shows attempt starts, submissions, completion rate, save failures and support requests.
- No schema migration is required because events use the existing indexed audit log.

## Checks

| Check | Result |
|---|---|
| Docker/PostgreSQL reports tests | PASS — 7 tests |
| Django system check | PASS — 0 issues |
| Web `npm run typecheck` | PASS |
| Human unfamiliar-user observation | PENDING — use the W07 runbook |

The Docker suite ran `apps.reports.tests.test_activation_measurement` and `apps.reports.tests.test_audit_and_health` using backend image `edutech-w04-wallet-backend:92da64a7` on the release Docker network.

## Remaining gate

Run the three unfamiliar-user tasks in [the observation runbook](../qa-runbooks/W07_UNFAMILIAR_USER_OBSERVATION.md), record time/errors/abandonment and attach the reviewed session results. Automated event reconciliation cannot satisfy that usability evidence.
