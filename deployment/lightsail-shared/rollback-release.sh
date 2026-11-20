#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: $0 <absolute-previous-release-directory>" >&2
  exit 2
fi

previous="$1"
project_root="/srv/saas/projects/learning-portal"
compose="$previous/deployment/lightsail-shared/compose.yaml"
secrets_dir="/srv/saas/secrets/learning-portal"
data_dir="$project_root/data"

case "$previous" in
  "$project_root"/releases/*) ;;
  *) echo "release must be below $project_root/releases" >&2; exit 2 ;;
esac

test -f "$compose"
test -f "$previous/release.env"

set -a
source "$previous/release.env"
set +a
: "${BACKEND_IMAGE:?missing BACKEND_IMAGE}"
: "${WEB_IMAGE:?missing WEB_IMAGE}"

export RELEASE_DIR="$previous" SECRETS_DIR="$secrets_dir" DATA_DIR="$data_dir"
docker compose -f "$compose" config --quiet
services=(backend web)
if docker compose -f "$compose" config --services | grep -qx api-gateway; then
  services+=(api-gateway)
fi
docker compose -f "$compose" up -d --no-build --wait "${services[@]}"

printf '%s\n' "$previous" >"$project_root/.active-release.pending"
echo "Application containers restored to the selected release. Database rollback is intentionally separate."
