#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/edutech_backend"
WEB_DIR="$ROOT_DIR/edutech_web"

run_backend=true
run_playwright=true

resolve_backend_python() {
  if [[ -x "$BACKEND_DIR/.venv/bin/python" ]]; then
    echo "$BACKEND_DIR/.venv/bin/python"
    return 0
  fi

  if command -v python3 >/dev/null 2>&1; then
    echo "python3"
    return 0
  fi

  if command -v python >/dev/null 2>&1; then
    echo "python"
    return 0
  fi

  echo "No backend Python interpreter found. Create $BACKEND_DIR/.venv or install python3." >&2
  return 1
}

ensure_backend_django() {
  local backend_python="$1"
  if ! (
    cd "$BACKEND_DIR"
    "$backend_python" -c "import django" >/dev/null 2>&1
  ); then
    echo "Backend validation cannot run because Django is unavailable for $backend_python." >&2
    echo "Activate/install the backend environment before running this bundle." >&2
    return 1
  fi
}

usage() {
  cat <<'EOF'
Usage:
  scripts/family_release_validation_bundle.sh
  scripts/family_release_validation_bundle.sh --backend-only
  scripts/family_release_validation_bundle.sh --playwright-only
  scripts/family_release_validation_bundle.sh --release-only

Runs the currently validated family-release signoff bundle in the recommended sequence:
1. backend immediate-release regression tests
2. institute family release validation
3. teacher family release validation
4. admin family release validation
5. teacher and institute family authoring contract validation
6. admin family authoring contract validation
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --backend-only)
        run_playwright=false
        shift
        ;;
      --release-only)
        run_backend=false
        shift
        ;;
      --playwright-only)
        run_backend=false
        shift
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

run_backend_bundle() {
  local backend_python
  backend_python="$(resolve_backend_python)"
  ensure_backend_django "$backend_python"

  echo "==> Running backend immediate-release regression bundle"
  (
    cd "$BACKEND_DIR"
    "$backend_python" manage.py test \
      apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_submit_attempt_generates_immediate_result_records \
      apps.attempts.tests.test_attempt_workspace_api.AttemptWorkspaceApiTestCase.test_immediate_result_mode_publishes_each_retry_and_recalculates_ranks
  )
}

run_playwright_bundle() {
  echo "==> Running institute AWS immediate-release Playwright validation"
  (
    cd "$WEB_DIR"
    PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS=1 \
    PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 \
    npx playwright test tests/e2e/workflow/institute-family-immediate-release.mutable.spec.ts
  )

  echo "==> Running institute competitive delayed-release Playwright validation"
  (
    cd "$WEB_DIR"
    PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS=1 \
    PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 \
    npx playwright test tests/e2e/workflow/institute-family-release-happy-path.mutable.spec.ts
  )

  echo "==> Running teacher family release Playwright validation"
  (
    cd "$WEB_DIR"
    PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS=1 \
    PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 \
    PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS=1 \
    npx playwright test \
      tests/e2e/workflow/teacher-family-immediate-release.mutable.spec.ts \
      tests/e2e/workflow/teacher-family-release-happy-path.mutable.spec.ts
  )

  echo "==> Running admin family release Playwright validation"
  (
    cd "$WEB_DIR"
    PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS=1 \
    PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 \
    npx playwright test \
      tests/e2e/workflow/admin-family-immediate-release.mutable.spec.ts \
      tests/e2e/workflow/admin-family-release-happy-path.mutable.spec.ts
  )

  echo "==> Running teacher family authoring-contract validation"
  (
    cd "$WEB_DIR"
    PLAYWRIGHT_ENABLE_MUTABLE_QUESTION_BANK_ACTIONS=1 \
    npx playwright test tests/e2e/workflow/teacher-family-authoring-contracts.mutable.spec.ts
  )

  echo "==> Running institute family authoring-contract validation"
  (
    cd "$WEB_DIR"
    PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_QUESTION_BANK_ACTIONS=1 \
    npx playwright test tests/e2e/workflow/institute-family-authoring-contracts.mutable.spec.ts
  )

  echo "==> Running admin family authoring-contract validation"
  (
    cd "$WEB_DIR"
    npx playwright test tests/e2e/workflow/admin-family-authoring-contracts.spec.ts
  )
}

parse_args "$@"

if [[ "$run_backend" == "true" ]]; then
  run_backend_bundle
fi

if [[ "$run_playwright" == "true" ]]; then
  run_playwright_bundle
fi
