#!/usr/bin/env bash
set -euo pipefail

campaign="edutech-phase6-20261119"
network="${campaign}-net"
postgres="${campaign}-postgres"
backend="${campaign}-backend"
web="${campaign}-web"
backend_tag="${BACKEND_IMAGE:-edutech-bundle-qa-backend:20261119}"
web_tag="${WEB_IMAGE:-edutech-bundle-qa-web:20261119}"

cleanup() {
  docker rm -f "$web" "$backend" "$postgres" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

printf '%s\n' '=== image metadata ==='
for image in "$backend_tag" "$web_tag"; do
  docker image inspect "$image" \
    --format '{{.Id}}|{{.Architecture}}|{{.Os}}|user={{.Config.User}}|health={{json .Config.Healthcheck.Test}}|size={{.Size}}'
done

docker network create --internal --label qa.campaign="$campaign" "$network" >/dev/null

docker run -d --name "$postgres" --network "$network" \
  --label qa.campaign="$campaign" \
  --tmpfs /var/lib/postgresql/data:rw,noexec,nosuid,size=1g \
  -e POSTGRES_DB=learning_portal \
  -e POSTGRES_USER=learning_portal_qa \
  -e POSTGRES_PASSWORD=local-only-password \
  postgres:16-alpine >/dev/null

for attempt in $(seq 1 60); do
  if docker exec "$postgres" pg_isready -U learning_portal_qa -d learning_portal >/dev/null 2>&1; then
    break
  fi
  test "$attempt" -lt 60 || { echo 'postgres readiness timeout' >&2; exit 1; }
  sleep 1
done

common_env=(
  -e DJANGO_SETTINGS_MODULE=config.settings.prod
  -e DJANGO_SECRET_KEY=local-validation-only-not-a-runtime-secret-123456789
  -e DJANGO_DEBUG=False
  -e DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost,backend
  -e DB_NAME=learning_portal
  -e DB_USER=learning_portal_qa
  -e DB_PASSWORD=local-only-password
  -e DB_HOST="$postgres"
  -e DB_PORT=5432
  -e CORS_ALLOW_ALL_ORIGINS=False
  -e CORS_ALLOWED_ORIGINS=http://127.0.0.1:13000
  -e CSRF_TRUSTED_ORIGINS=http://127.0.0.1:13000
  -e APP_BUILD=2221b9193b781fc22dac3e7684d199a06a4c8c7f
  -e APP_BUILD_TIMESTAMP=2026-11-19T00:00:00Z
  -e APP_ENVIRONMENT=staging
  -e APP_ARTIFACT_SHA256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
)

docker run --rm --platform linux/amd64 --network "$network" "${common_env[@]}" \
  "$backend_tag" python manage.py migrate --noinput >/tmp/edutech-phase6-migrate.log
docker run --rm --platform linux/amd64 --network "$network" "${common_env[@]}" \
  "$backend_tag" python manage.py check --settings=config.settings.prod

docker run -d --platform linux/amd64 --name "$backend" --network "$network" \
  --label qa.campaign="$campaign" \
  "${common_env[@]}" "$backend_tag" >/dev/null

docker run -d --platform linux/amd64 --name "$web" --network "$network" \
  --label qa.campaign="$campaign" \
  -e HOSTNAME=0.0.0.0 -e PORT=3000 \
  "$web_tag" >/dev/null

for container in "$backend" "$web"; do
  for attempt in $(seq 1 90); do
    state="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container")"
    [ "$state" = healthy ] && break
    if [ "$attempt" -ge 90 ]; then
      docker logs "$container" >&2
      echo "$container health timeout: $state" >&2
      exit 1
    fi
    sleep 1
  done
  echo "$container|healthy"
done

printf '%s\n' '=== backend health ==='
docker exec "$backend" python -c \
  "import json,urllib.request; request=urllib.request.Request('http://127.0.0.1:8000/api/v1/health/', headers={'X-Forwarded-Proto':'https'}); print(json.dumps(json.load(urllib.request.urlopen(request, timeout=3)), indent=2))"
printf '%s\n' '=== web headers ==='
docker exec "$web" node -e \
  "fetch('http://127.0.0.1:3000/').then(async response => { if (!response.ok) process.exit(1); for (const [key,value] of response.headers) if (/^(x-frame-options|x-content-type-options|referrer-policy|permissions-policy|content-security-policy|x-nexora-(build|artifact|environment))$/.test(key)) console.log(key + ': ' + value); })"
printf '%s\n' '=== runtime users ==='
docker exec "$backend" id
docker exec "$web" id
printf '%s\n' '=== postgres schema count ==='
docker exec "$postgres" psql -U learning_portal_qa -d learning_portal -Atc \
  'select count(*) from django_migrations'
printf '%s\n' '=== runtime resource snapshot ==='
docker stats --no-stream --format '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.PIDs}}' \
  "$postgres" "$backend" "$web"

cleanup
trap - EXIT
printf '%s\n' '=== cleanup ==='
printf 'containers='
docker ps -a --filter label=qa.campaign="$campaign" -q | wc -l | tr -d ' '
printf 'networks='
docker network ls --filter label=qa.campaign="$campaign" -q | wc -l | tr -d ' '
