#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: $0 <absolute-release-directory>" >&2
  exit 2
fi

release_dir="$1"
project_root="/srv/saas/projects/learning-portal"
compose="$release_dir/deployment/lightsail-shared/compose.yaml"
secrets_dir="/srv/saas/secrets/learning-portal"
data_dir="$project_root/data"

case "$release_dir" in
  "$project_root"/releases/*) ;;
  *) echo "release must be below $project_root/releases" >&2; exit 2 ;;
esac

test -f "$compose"
test -f "$release_dir/release.env"
test -f "$secrets_dir/backend.env"
test -f "$secrets_dir/web.env"
test -d "$data_dir/media"
test -d "$data_dir/static"

set -a
source "$release_dir/release.env"
set +a
: "${BACKEND_IMAGE:?missing BACKEND_IMAGE}"
: "${WEB_IMAGE:?missing WEB_IMAGE}"

export RELEASE_DIR="$release_dir" SECRETS_DIR="$secrets_dir" DATA_DIR="$data_dir"

docker compose -f "$compose" config --quiet
docker compose -f "$compose" --profile tools run --rm migrate
docker compose -f "$compose" --profile tools run --rm collectstatic
docker compose -f "$compose" up -d --no-build --wait backend web api-gateway

test "$(docker inspect --format '{{.State.Health.Status}}' learning-portal-backend-1)" = "healthy"
test "$(docker inspect --format '{{.State.Health.Status}}' learning-portal-web-1)" = "healthy"
test "$(docker inspect --format '{{.State.Health.Status}}' learning-portal-api-gateway-1)" = "healthy"

printf '%s\n' "$release_dir" >"$project_root/.active-release.pending"
echo "Private application activation completed; Caddy and DNS are unchanged."
