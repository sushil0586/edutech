# W09 stage confirmation handoff

## Required inputs

- Public HTTPS origin for the promoted candidate.
- A synthetic pool of at least 100 stage students assigned to the objective runtime exam. Store credentials in an owner-only JSON file outside the repository.
- Real `ALERT_WEBHOOK_URL` and named `INCIDENT_OWNER`.
- Host/application/database monitoring access and the stage cost profile.

## Sequence

1. Confirm `/api/v1/health/` reports the expected build SHA and artifact identity over public TLS.
2. Run the core Chromium, Firefox and WebKit role pack plus the accessibility pack against that origin.
3. Run the maximum configured exam duration through token refresh, reload, a controlled API interruption, delayed save, retry and scheduled expiry.
4. Run 60 simultaneous students, reconcile attempts/answers/results, reset the disposable fixture, then run the 100-user headroom burst.
5. Capture start/save/submit p50/p95/p99, error distribution, container/host saturation, database connections/locks/deadlocks/temp bytes and cost.
6. Trigger an invalid health origin through `monitor-nexora-health.sh`; the named responder acknowledges the real alert and follows the incident runbook.
7. Restore the latest stage backup and representative pilot media into isolation; compare table counts and objective-exam attempt/result integrity.
8. Attach unfamiliar-user observation results. Record exact digest, exclusions, intermittent failures and the signed go/no-go decision.

Pass only when p95 start/save/submit is under two seconds, unexpected errors are below one percent, acknowledged-answer/result reconciliation is exact, the 60-user target has a successful 100-user headroom run, the alert reaches its named responder, recovery objectives are met, and no critical/high pilot defect remains.
