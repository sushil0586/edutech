#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
bundle="$root/deployment/lightsail-shared"

required=(
  backend.Dockerfile web.Dockerfile
  backend.Dockerfile.dockerignore web.Dockerfile.dockerignore compose.yaml
  backend.env.example web.env.example release.env.example
  Caddyfile.fragment gateway.Caddyfile activate-release.sh rollback-release.sh
  qualify-images.sh learning-portal-ops learning-portal-monitor learning-portal-alert
  learning-portal-monitor.service learning-portal-monitor.timer learning-portal-alert@.service
  learning-portal-backup.sh learning-portal-backup.service learning-portal-backup.timer
)

for path in "${required[@]}"; do
  test -s "$bundle/$path" || { echo "missing or empty: $path" >&2; exit 1; }
done

grep -Fq 'output: "standalone"' "$root/edutech_web/next.config.ts"
grep -Fq 'name: learning-portal' "$bundle/compose.yaml"
grep -Fq 'name: learning-portal-private' "$bundle/compose.yaml"
grep -Fq 'name: saas-edge' "$bundle/compose.yaml"
grep -Fq 'reverse_proxy learning-portal-api-gateway-1:8080' "$bundle/Caddyfile.fragment"
grep -Fq 'reverse_proxy learning-portal-backend-1:8000' "$bundle/gateway.Caddyfile"
grep -Fq 'reverse_proxy learning-portal-web-1:3000' "$bundle/Caddyfile.fragment"

if rg -n '(BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY|AKIA[0-9A-Z]{16})' "$bundle"; then
  echo "potential credential material found" >&2
  exit 1
fi

validation_root="$(mktemp -d)"
trap 'rm -rf "$validation_root"' EXIT
mkdir -p "$validation_root/secrets" "$validation_root/release" "$validation_root/data"
: >"$validation_root/secrets/backend.env"
: >"$validation_root/secrets/web.env"
: >"$validation_root/release/release.env"

BACKEND_IMAGE=learning-portal-backend@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa \
WEB_IMAGE=learning-portal-web@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb \
SECRETS_DIR="$validation_root/secrets" \
RELEASE_DIR="$validation_root/release" \
DATA_DIR="$validation_root/data" \
  docker compose -f "$bundle/compose.yaml" config --quiet

echo "Shared Lightsail deployment bundle validated."
