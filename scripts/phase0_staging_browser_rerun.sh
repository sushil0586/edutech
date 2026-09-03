#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WEB_DIR="${REPO_ROOT}/edutech_web"

PW_BASE_URL="${PLAYWRIGHT_BASE_URL:-}"
PW_API_BASE_URL="${PLAYWRIGHT_API_BASE_URL:-${PW_BASE_URL}}"
PW_WORKERS="${PLAYWRIGHT_WORKERS:-1}"

usage() {
  cat <<'USAGE'
Phase 0 staging browser rerun

Required:
  PLAYWRIGHT_BASE_URL=https://<staging-host>

Optional:
  PLAYWRIGHT_API_BASE_URL=https://<staging-api-host>  Defaults to PLAYWRIGHT_BASE_URL
  PLAYWRIGHT_WORKERS=1                               Defaults to 1
  ALLOW_LOCAL_PLAYWRIGHT_BASE=1                      Allows localhost URLs for rehearsal
  ALLOW_STAGING_MUTATION=1                           Required for mutable/commercial tests

Usage:
  ./scripts/phase0_staging_browser_rerun.sh smoke access phase1-watchpoints
  ./scripts/phase0_staging_browser_rerun.sh all

Groups:
  smoke                 P0 smoke routes
  access                Role-scope access control
  parent                Parent seeded browser/API/mobile web path
  student-core          Student core browser pack
  operator-core         Admin, institute, teacher core browser packs
  mobile-web            Student/operator mobile-web packs
  commercial            Subscription request and shared-library entitlement checks
  phase1-watchpoints    Optimized slow-route audits and warning-watch routes
  all                   Runs every group above
USAGE
}

require_base_url() {
  if [[ -z "${PW_BASE_URL}" ]]; then
    usage
    echo
    echo "ERROR: PLAYWRIGHT_BASE_URL is required for staging rerun." >&2
    exit 2
  fi

  if [[ "${ALLOW_LOCAL_PLAYWRIGHT_BASE:-0}" != "1" ]] \
    && [[ "${PW_BASE_URL}" =~ ^https?://(localhost|127\.0\.0\.1)(:|/|$) ]]; then
    echo "ERROR: ${PW_BASE_URL} looks local. Set ALLOW_LOCAL_PLAYWRIGHT_BASE=1 for rehearsal." >&2
    exit 2
  fi
}

run_pw() {
  echo
  echo "==> playwright $*"
  (
    cd "${WEB_DIR}"
    PLAYWRIGHT_BASE_URL="${PW_BASE_URL}" \
    PLAYWRIGHT_API_BASE_URL="${PW_API_BASE_URL}" \
    npx playwright test "$@" --project=chromium --workers="${PW_WORKERS}"
  )
}

run_npm_pack() {
  local script_name="$1"
  shift

  echo
  echo "==> npm run ${script_name}"
  (
    cd "${WEB_DIR}"
    PLAYWRIGHT_BASE_URL="${PW_BASE_URL}" \
    PLAYWRIGHT_API_BASE_URL="${PW_API_BASE_URL}" \
    npm run "${script_name}" -- "$@" --workers="${PW_WORKERS}"
  )
}

run_smoke() {
  run_npm_pack test:e2e:release-smoke
}

run_access() {
  run_pw tests/e2e/role-scope/access-control.spec.ts
}

run_parent() {
  run_pw \
    tests/e2e/workflow/parent-browser-coverage.spec.ts \
    tests/e2e/workflow/parent-api-audit.spec.ts \
    tests/e2e/workflow/parent-mobile-workflow.spec.ts
}

run_student_core() {
  run_npm_pack test:e2e:release:student-core
}

run_operator_core() {
  run_npm_pack test:e2e:release:admin-core
  run_npm_pack test:e2e:release:institute-core
  run_npm_pack test:e2e:release:institute-results-core
  run_npm_pack test:e2e:release:teacher-core
}

run_mobile_web() {
  run_npm_pack test:e2e:release:student-mobile-core
  run_npm_pack test:e2e:operator-mobile-pack
}

run_commercial() {
  if [[ "${ALLOW_STAGING_MUTATION:-0}" != "1" ]]; then
    echo "ERROR: commercial tests mutate staging data. Set ALLOW_STAGING_MUTATION=1 after staging seed/reset." >&2
    exit 2
  fi

  echo
  echo "==> commercial subscription request"
  (
    cd "${WEB_DIR}"
    PLAYWRIGHT_BASE_URL="${PW_BASE_URL}" \
    PLAYWRIGHT_API_BASE_URL="${PW_API_BASE_URL}" \
    PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_SUBSCRIPTION_REQUEST=1 \
    npx playwright test tests/e2e/workflow/admin-institute-subscription-request.mutable.spec.ts --project=chromium --workers="${PW_WORKERS}"
  )

  echo
  echo "==> commercial shared-library entitlement enforcement"
  (
    cd "${WEB_DIR}"
    PLAYWRIGHT_BASE_URL="${PW_BASE_URL}" \
    PLAYWRIGHT_API_BASE_URL="${PW_API_BASE_URL}" \
    PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_SHARED_LIBRARY_ENTITLEMENT_ENFORCEMENT=1 \
    PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_SHARED_LIBRARY_ENTITLEMENT_ENFORCEMENT=1 \
    npx playwright test \
      tests/e2e/workflow/institute-shared-library-entitlement-enforcement.mutable.spec.ts \
      tests/e2e/workflow/teacher-shared-library-entitlement-enforcement.mutable.spec.ts \
      --project=chromium --workers="${PW_WORKERS}"
  )
}

run_phase1_watchpoints() {
  run_pw \
    tests/e2e/workflow/admin-exams-api-audit.spec.ts \
    tests/e2e/workflow/institute-search-api-audit.spec.ts \
    tests/e2e/workflow/teacher-search-api-audit.spec.ts

  run_pw \
    tests/e2e/workflow/admin-exams-browser-coverage.spec.ts \
    tests/e2e/workflow/institute-search-browser-coverage.spec.ts \
    tests/e2e/workflow/teacher-search-browser-coverage.spec.ts \
    tests/e2e/workflow/student-post-submit-workspace.spec.ts \
    tests/e2e/workflow/teacher-question-bank-continuity.spec.ts
}

main() {
  if [[ "$#" -eq 0 || "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
  fi

  require_base_url

  local groups=("$@")
  if [[ "$#" -eq 1 && "$1" == "all" ]]; then
    groups=(smoke access parent student-core operator-core mobile-web commercial phase1-watchpoints)
  fi

  echo "Staging web: ${PW_BASE_URL}"
  echo "Staging API: ${PW_API_BASE_URL}"
  echo "Workers: ${PW_WORKERS}"

  local group
  for group in "${groups[@]}"; do
    case "${group}" in
      smoke) run_smoke ;;
      access) run_access ;;
      parent) run_parent ;;
      student-core) run_student_core ;;
      operator-core) run_operator_core ;;
      mobile-web) run_mobile_web ;;
      commercial) run_commercial ;;
      phase1-watchpoints) run_phase1_watchpoints ;;
      *)
        echo "ERROR: unknown group '${group}'." >&2
        usage
        exit 2
        ;;
    esac
  done
}

main "$@"
