#!/usr/bin/env bash
set -euo pipefail
umask 077

backup_root="/srv/saas/backups/learning-portal"
media_root="/srv/saas/projects/learning-portal/data/media"
key_file="/srv/saas/shared/secrets/recovery/platform-backup-key"
postgres_container="saas-platform-postgres-1"
retention_days=14
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
pending="${backup_root}/.${stamp}.pending"
published="${backup_root}/${stamp}"

exec 9>"/run/lock/learning-portal-backup.lock"
flock -n 9 || { echo "A learning portal backup is already running." >&2; exit 75; }

test -d "$media_root"
test -f "$key_file"
test ! -L "$key_file"
test "$(stat -c '%U:%G:%a' "$key_file")" = "root:root:400"
docker inspect "$postgres_container" >/dev/null

install -d -o root -g root -m 0700 "$backup_root"
test ! -e "$pending"
test ! -e "$published"
install -d -o root -g root -m 0700 "$pending"

cleanup() {
  rm -rf -- "$pending"
}
trap cleanup EXIT INT TERM

started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
docker exec "$postgres_container" sh -c \
  'pg_dump -U "$POSTGRES_USER" -d learning_portal -Fc' |
  openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 \
    -pass "file:${key_file}" -out "$pending/database.dump.enc"

tar --acls --xattrs -C "$media_root" -czf - . |
  openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 \
    -pass "file:${key_file}" -out "$pending/media.tar.gz.enc"

chmod 0600 "$pending/database.dump.enc" "$pending/media.tar.gz.enc"
(
  cd "$pending"
  sha256sum database.dump.enc media.tar.gz.enc >SHA256SUMS
  sha256sum -c SHA256SUMS >/dev/null
)

cat >"$pending/MANIFEST.env" <<EOF
application=learning-portal
database=learning_portal
postgres_major=16
started_at=${started_at}
completed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
encryption=openssl-aes-256-cbc-pbkdf2-200000
retention_days=${retention_days}
media_files=$(find "$media_root" -xdev -type f | wc -l)
EOF
chmod 0600 "$pending/SHA256SUMS" "$pending/MANIFEST.env"

mv -T "$pending" "$published"
trap - EXIT INT TERM

find "$backup_root" -mindepth 1 -maxdepth 1 -type d \
  -name '20??????T??????Z' -mtime "+${retention_days}" -print0 |
  xargs -0r rm -rf --

printf 'backup=%s\n' "$published"
