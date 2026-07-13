# Admin Next-Phase Playwright Checklist

Last updated: 2026-07-12

## Purpose

This checklist converts the current admin confidence into the next concrete automation phase.

Use it to answer:

- what is already strong from the admin side
- what is still missing before broader signoff
- which Playwright additions give the fastest confidence gain

Related docs:

- [ADMIN_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/ADMIN_CONFIDENCE_MATRIX.md)
- [ADMIN_9_5_CONFIDENCE_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/ADMIN_9_5_CONFIDENCE_EXECUTION_BOARD.md)
- [ROLE_MODULE_COVERAGE_MAP.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/ROLE_MODULE_COVERAGE_MAP.md)

## Current admin read

- Admin onboarding confidence: high
- Admin CRUD confidence: high on institutes, academic setup, people, assignments, settings
- Admin economy confidence: materially improved, but still not complete for all operator permutations
- Admin exam confidence: strong for builder, detail, create, and advanced builder lanes
- Remaining confidence gap: negative paths, concurrency, large datasets, and repeated-run stability

## Status legend

- `Done`: browser-proven and recently exercised
- `Next`: best immediate confidence gain
- `Later`: useful, but not the fastest current gain

## Phase 1: immediate confidence gains

### 1. Admin form negative-path matrix

Status: `Next`

Goal:

- prove validation and error handling, not only happy-path CRUD

Priority areas:

- institutes
- people
- academic setup
- settings

Cases:

- required-field validation
- duplicate-code or duplicate-identity rejection
- invalid phone/email/pathological text inputs
- partial geography payload rejection
- stale edit retry behavior after failed save

Success bar:

- each high-traffic admin form has at least one browser spec proving backend-driven validation truth

### 2. Admin page-by-page API audit expansion

Status: `Next`

Goal:

- ensure each major admin page loads efficiently and does not issue unnecessary requests

Priority pages:

- `/admin/institutes`
- `/admin/people`
- `/admin/academic-setup`
- `/admin/economy`
- `/admin/exams`
- `/admin/reports`

Assertions:

- critical route loads under accepted threshold
- no duplicate burst calls on first paint
- filter changes send only expected request set
- detail drawers or modals do not refetch unrelated datasets
- request params match current selected institute, tab, page size, and filters

Success bar:

- every high-value admin route has one API audit spec with request-count and parameter assertions

### 3. Admin repeated-run stability pack

Status: `Next`

Goal:

- measure whether the same admin workflows stay green across repeated seeded runs

Suggested pack:

- `admin-institutes-crud-guardrails.mutable.spec.ts`
- `admin-academic-setup-crud-guardrails.mutable.spec.ts`
- `admin-people-crud-guardrails.mutable.spec.ts`
- `admin-settings-crud-guardrails.mutable.spec.ts`
- `admin-economy-crud-guardrails.mutable.spec.ts`
- `admin-mixed-institute-onboarding.mutable.spec.ts`

Run style:

- same environment
- 3 consecutive runs
- record pass rate and failures by category

Success bar:

- all selected specs pass cleanly across repeated runs without seed drift fixes

## Phase 2: operational hardening

### 4. Admin economy lifecycle matrix

Status: `Next`

Goal:

- widen confidence in the most operationally dense admin page

Cases:

- package grant
- package restore
- package pause/reactivate
- shared-library feature grant/restore
- support-ops student selection changes
- refresh unlock path
- policy disable/enable edge states

Success bar:

- economy confidence rises from strong workflow confidence to strong lifecycle confidence

### 5. Multi-admin and cross-role contention scenarios

Status: `Later`

Goal:

- prove behavior when multiple operators or roles interact with the same live area

Cases:

- two admins editing the same institute
- admin changes access while institute admin is active
- admin changes academic setup while onboarding page is open
- admin entitlement change followed by institute shared-library verification

Success bar:

- conflicting edits either reconcile safely or surface clear UI truth

### 6. Large-data admin route behavior

Status: `Later`

Goal:

- ensure dense pages remain usable with larger lists and heavier datasets

Priority routes:

- institutes
- people
- economy
- reports
- exams

Cases:

- large page-size options
- search on dense result sets
- filter reset under large tables
- row expansion and detail hydration under heavier data

Success bar:

- no route-level regressions, broken pagination, or excessive refetch loops under larger data volume

## Phase 3: signoff pack

### 7. Final grouped admin confidence sweep

Status: `Later`

Goal:

- produce one honest signoff-ready admin run

Recommended grouped pack:

- dashboard workspace
- institutes CRUD guardrails
- academic setup CRUD guardrails
- people CRUD guardrails
- settings CRUD guardrails
- economy CRUD guardrails
- exams create guardrails
- exam builder mutable
- mixed institute onboarding
- selected admin API audits

Success bar:

- one grouped pass can be shown as current admin truth without caveats about stale labels or missing seed assumptions

## Module-by-module recommendation

| Module | Current read | Best next action |
| --- | --- | --- |
| Dashboard | High | keep baseline, add only if API drift appears |
| Institutes | High | negative-path matrix + account edge cases |
| People | Medium-high to high | validation and login-state edge coverage |
| Academic setup | High | dependency-chain negative paths |
| Economy | Medium-high to high | lifecycle matrix + API audits |
| Exams | High | keep grouped mutable signoff green |
| Reports | Medium | API audit + export lane when product supports it |
| Security | Medium | broader state-permutation proof |
| Settings | Medium-high | negative-path and persistence checks |

## Practical recommendation

If we want the fastest real gain from the admin side, do this order:

1. negative-path matrix for high-traffic forms
2. API audit expansion on dense admin pages
3. repeated-run stability pack
4. economy lifecycle matrix
5. grouped final admin signoff pack
