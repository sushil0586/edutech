#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/nexora-learn/edutech/edutech_backend}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.production}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/nexora-learn}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DATABASE_URL_VALUE="${DATABASE_URL:-}"
DB_NAME_VALUE="${DB_NAME:-}"
DB_USER_VALUE="${DB_USER:-}"
DB_PASSWORD_VALUE="${DB_PASSWORD:-}"
DB_HOST_VALUE="${DB_HOST:-127.0.0.1}"
DB_PORT_VALUE="${DB_PORT:-5432}"

if [[ -f "$ENV_FILE" ]]; then
  env_values="$(
    ENV_FILE="$ENV_FILE" python3 - <<'PY'
import os
from pathlib import Path

wanted = {"DATABASE_URL", "DB_NAME", "DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT"}
values = {}
env_path = Path(os.environ["ENV_FILE"])
for raw_line in env_path.read_text().splitlines():
    line = raw_line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    key = key.strip()
    if key in wanted:
        values[key] = value.strip().strip('"').strip("'")
for key in sorted(wanted):
    print(f"{key}={values.get(key, '')}")
PY
  )"
  while IFS='=' read -r key value; do
    case "$key" in
      DATABASE_URL) [[ -z "$DATABASE_URL_VALUE" ]] && DATABASE_URL_VALUE="$value" ;;
      DB_NAME) [[ -z "$DB_NAME_VALUE" ]] && DB_NAME_VALUE="$value" ;;
      DB_USER) [[ -z "$DB_USER_VALUE" ]] && DB_USER_VALUE="$value" ;;
      DB_PASSWORD) [[ -z "$DB_PASSWORD_VALUE" ]] && DB_PASSWORD_VALUE="$value" ;;
      DB_HOST) [[ "$DB_HOST_VALUE" == "127.0.0.1" && -n "$value" ]] && DB_HOST_VALUE="$value" ;;
      DB_PORT) [[ "$DB_PORT_VALUE" == "5432" && -n "$value" ]] && DB_PORT_VALUE="$value" ;;
    esac
  done <<< "$env_values"
fi

if [[ -z "$DATABASE_URL_VALUE" && ( -z "$DB_NAME_VALUE" || -z "$DB_USER_VALUE" ) ]]; then
  echo "DATABASE_URL or DB_NAME/DB_USER was not found in environment or $ENV_FILE" >&2
  exit 1
fi

install -d -m 0750 "$BACKUP_DIR"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
tmp_file="$BACKUP_DIR/.nexora_learn_${timestamp}.dump.tmp"
backup_file="$BACKUP_DIR/nexora_learn_${timestamp}.dump"

if [[ -n "$DATABASE_URL_VALUE" ]]; then
  pg_dump "$DATABASE_URL_VALUE" --format=custom --no-owner --no-privileges --file="$tmp_file"
else
  PGPASSWORD="$DB_PASSWORD_VALUE" pg_dump \
    --host="$DB_HOST_VALUE" \
    --port="$DB_PORT_VALUE" \
    --username="$DB_USER_VALUE" \
    --dbname="$DB_NAME_VALUE" \
    --format=custom \
    --no-owner \
    --no-privileges \
    --file="$tmp_file"
fi
chmod 0640 "$tmp_file"
mv "$tmp_file" "$backup_file"

find "$BACKUP_DIR" -maxdepth 1 -type f -name 'nexora_learn_*.dump' -mtime +"$RETENTION_DAYS" -delete

echo "$backup_file"
