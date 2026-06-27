#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/edutech_backend"

run_all=false
changed_file_list=""
declare -a changed_files=()
declare -a test_modules=()

usage() {
  cat <<'EOF'
Usage:
  scripts/ci_backend_scoped_tests.sh --all
  scripts/ci_backend_scoped_tests.sh --changed-file-list /path/to/files.txt

The changed-file list must contain one repo-relative path per line.
EOF
}

append_module() {
  local module="$1"
  local existing
  for existing in "${test_modules[@]:-}"; do
    if [[ "$existing" == "$module" ]]; then
      return
    fi
  done
  test_modules+=("$module")
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --all)
        run_all=true
        shift
        ;;
      --changed-file-list)
        changed_file_list="${2:-}"
        if [[ -z "$changed_file_list" ]]; then
          echo "Missing value for --changed-file-list" >&2
          exit 1
        fi
        shift 2
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        echo "Unknown argument: $1" >&2
        usage >&2
        exit 1
        ;;
    esac
  done
}

load_changed_files() {
  if [[ "$run_all" == "true" ]]; then
    return
  fi

  if [[ -z "$changed_file_list" ]]; then
    echo "Either --all or --changed-file-list is required." >&2
    exit 1
  fi

  if [[ ! -f "$changed_file_list" ]]; then
    echo "Changed-file list not found: $changed_file_list" >&2
    exit 1
  fi

  while IFS= read -r line || [[ -n "$line" ]]; do
    changed_files+=("$line")
  done < "$changed_file_list"
}

select_scope() {
  local path
  local app_name

  if [[ "$run_all" == "true" ]]; then
    return
  fi

  for path in "${changed_files[@]}"; do
    [[ -z "$path" ]] && continue

    case "$path" in
      .github/workflows/*|scripts/ci_backend_scoped_tests.sh)
        run_all=true
        return
        ;;
      edutech_backend/manage.py|edutech_backend/requirements.txt|edutech_backend/config/*|edutech_backend/common/*)
        run_all=true
        return
        ;;
      edutech_backend/apps/*)
        app_name="${path#edutech_backend/apps/}"
        app_name="${app_name%%/*}"
        case "$app_name" in
          accounts|academics|attempts|economy|institutes|parents|question_bank|reports|results)
            append_module "apps.${app_name}.tests"
            ;;
          exams|geography|students|teachers)
            run_all=true
            return
            ;;
          *)
            run_all=true
            return
            ;;
        esac
        ;;
    esac
  done
}

run_tests() {
  cd "$BACKEND_DIR"

  if [[ "$run_all" == "true" ]]; then
    echo "Running full backend test suite."
    python manage.py test --noinput
    return
  fi

  if [[ ${#test_modules[@]} -eq 0 ]]; then
    echo "No backend code changes detected that require Django tests. Skipping scoped backend test step."
    return
  fi

  echo "Running scoped backend tests for modules:"
  printf ' - %s\n' "${test_modules[@]}"
  python manage.py test --noinput "${test_modules[@]}"
}

parse_args "$@"
load_changed_files
select_scope
run_tests
