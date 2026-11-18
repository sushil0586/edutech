# W09 pilot incident response

## Ownership and configuration

Before pilot enrollment, operations must set `/etc/nexora-learn/health-monitor.env` with `HEALTH_URL`, `ALERT_WEBHOOK_URL`, `INCIDENT_OWNER`, `APP_ENVIRONMENT` and an optional `HEALTH_TIMEOUT_SECONDS`. `INCIDENT_OWNER` must name the on-call person or rotation, and the webhook must reach the approved incident channel.

Install `monitor-nexora-health.sh` at `/usr/local/sbin/`, install and enable `nexora-learn-health-monitor.timer`, then run the service once. A missing webhook is a configuration failure and exits with status 2.

## Response

1. Acknowledge the alert and record UTC start time, environment, candidate SHA and owner.
2. Check nginx, backend, expiry worker, PostgreSQL and Redis health. Pause new exam starts if answer writes or database health are uncertain; allow already acknowledged state to remain authoritative.
3. Preserve logs and database state. Do not retry destructive operations or edit submitted answers.
4. Recover the failed service or roll back to the recorded migration-compatible application artifact. Restore a database backup only when the incident owner confirms data loss/corruption and the recovery point.
5. Verify login, assigned-exam discovery, saved-answer recovery, submit idempotency, result consistency and the activation/save-failure stream.
6. Record recovery time, affected attempts, reconciliation outcome and follow-up owner before reopening starts.

The pilot targets an alert within two minutes, acknowledgement within fifteen minutes during an announced exam window, a four-hour application recovery objective, and a maximum 24-hour database recovery point until backup frequency is increased. These are operating commitments and require a staffed roster.
