#!/usr/bin/env sh
set -eu

HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8080/api/v1/health/}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
INCIDENT_OWNER="${INCIDENT_OWNER:-unassigned}"
ENVIRONMENT="${APP_ENVIRONMENT:-unknown}"
TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-10}"

if [ -z "$ALERT_WEBHOOK_URL" ]; then
  echo "ALERT_WEBHOOK_URL is required" >&2
  exit 2
fi

if curl --fail --silent --show-error --max-time "$TIMEOUT_SECONDS" "$HEALTH_URL" >/dev/null; then
  echo "health probe passed: $HEALTH_URL"
  exit 0
fi

timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
payload="$(python3 - "$HEALTH_URL" "$INCIDENT_OWNER" "$ENVIRONMENT" "$timestamp" <<'PY'
import json
import sys
print(json.dumps({
    "event": "nexora_health_probe_failed",
    "health_url": sys.argv[1],
    "owner": sys.argv[2],
    "environment": sys.argv[3],
    "occurred_at": sys.argv[4],
    "severity": "critical",
    "action": "Check nginx, backend, PostgreSQL and Redis health; follow the pilot incident runbook.",
}))
PY
)"

curl --fail --silent --show-error --max-time "$TIMEOUT_SECONDS" \
  -H 'Content-Type: application/json' \
  --data "$payload" \
  "$ALERT_WEBHOOK_URL" >/dev/null

echo "health probe failed; incident delivered to $INCIDENT_OWNER" >&2
exit 1
