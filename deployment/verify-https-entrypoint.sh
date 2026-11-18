#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: $0 <https-origin> <expected-git-sha> <expected-artifact-sha256>" >&2
  exit 2
fi

origin="${1%/}"
expected_git_sha="$2"
expected_artifact_sha="$3"

printf '%s' "$origin" | grep -Eq '^https://[A-Za-z0-9.-]+(:[0-9]+)?$'
printf '%s' "$expected_git_sha" | grep -Eq '^[0-9a-f]{40}$'
printf '%s' "$expected_artifact_sha" | grep -Eq '^[0-9a-f]{64}$'

hostname="$(python3 -c 'from urllib.parse import urlparse; import sys; print(urlparse(sys.argv[1]).hostname)' "$origin")"
edge_ip="$(python3 -c 'import socket, sys; print(socket.gethostbyname(sys.argv[1]))' "$hostname")"
health_json="$(curl --fail --silent --show-error "${origin}/api/v1/health/")"

python3 -c 'import json, sys; payload=json.loads(sys.argv[1]); assert payload["status"] == "ok"; assert payload["build"] == sys.argv[2]; assert payload["artifact_sha256"] == sys.argv[3]' \
  "$health_json" "$expected_git_sha" "$expected_artifact_sha"

root_headers="$(curl --fail --silent --show-error --head "${origin}/")"
grep -Fqi "X-Nexora-Build: ${expected_git_sha}" <<<"$root_headers"
grep -Fqi "X-Nexora-Artifact: ${expected_artifact_sha}" <<<"$root_headers"

http_headers="$(curl --silent --show-error --dump-header - --output /dev/null "http://${hostname}/api/v1/health/")"
grep -Eqi '^HTTP/[^ ]+ (301|308)' <<<"$http_headers"
grep -Fqi "Location: ${origin}/api/v1/health/" <<<"$http_headers"

invalid_host="invalid-release-gate.example"
invalid_tls_status="$(curl --insecure --silent --show-error --connect-timeout 10 \
  --resolve "${invalid_host}:443:${edge_ip}" \
  --output /dev/null --write-out '%{http_code}' "https://${invalid_host}/" || true)"
test "$invalid_tls_status" = "000"

invalid_http_status="$(curl --silent --show-error --connect-timeout 10 \
  --header "Host: ${invalid_host}" \
  --output /dev/null --write-out '%{http_code}' "http://${edge_ip}/" || true)"
test "$invalid_http_status" = "000"

test "$(curl --silent --output /dev/null --write-out '%{http_code}' "${origin}/api/schema")" = "308"
test "$(curl --silent --output /dev/null --write-out '%{http_code}' "${origin}/api/schema/")" = "200"
test "$(curl --silent --output /dev/null --write-out '%{http_code}' "${origin}/api/docs")" = "308"
test "$(curl --silent --output /dev/null --write-out '%{http_code}' "${origin}/api/docs/swagger/")" = "200"
test "$(curl --silent --output /dev/null --write-out '%{http_code}' "${origin}/django-admin")" = "308"
admin_status="$(curl --silent --output /dev/null --write-out '%{http_code}' "${origin}/django-admin/")"
test "$admin_status" = "200" -o "$admin_status" = "302"

printf 'HTTPS entry point verified for %s at Git %s and artifact %s.\n' \
  "$origin" "$expected_git_sha" "$expected_artifact_sha"
