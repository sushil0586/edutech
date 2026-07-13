# Operator Route Execution Board - 2026-07-12

## Purpose

This board converts the route-status matrix into a practical implementation queue for deeper Playwright coverage.

Use this board when deciding what to automate next for:

- `admin`
- `institute`
- `teacher`

## Status Legend

- `Done`: route already has strong depth and does not need immediate new coverage
- `Next`: highest-priority gap to close in the next execution pass
- `Later`: useful, but not first-wave priority

## Ownership

- `QA/Automation`: mainly Playwright authoring work
- `Frontend + QA`: likely needs both app hardening and browser coverage
- `Backend + QA`: likely needs contract support or API determinism before reliable browser automation

## Priority Queue

| Role | Route | Current State | Status | Owner | What To Add Next | Suggested Spec File |
|---|---|---|---|---|---|---|
| `teacher` | `/teacher/dashboard` | Basic | Completed | QA/Automation | workspace plus browser-truthfulness coverage now prove KPI cards, filter persistence, quick-lane behavior, and summary-count consistency | `tests/e2e/workflow/teacher-dashboard-browser-coverage.spec.ts` |
| `teacher` | `/teacher/exams` | Basic | Completed | QA/Automation | workspace plus browser-truthfulness coverage now prove filter persistence, quick-filter behavior, empty-state distinction, and summary-count consistency | `tests/e2e/workflow/teacher-exams-browser-coverage.spec.ts` |
| `teacher` | `/teacher/search` | Basic | Completed | QA/Automation | workspace plus browser-truthfulness coverage now prove filters, quick-filter behavior, no-result distinction, and summary-count consistency | `tests/e2e/workflow/teacher-search-browser-coverage.spec.ts` |
| `institute` | `/institute/search` | Moderate | Completed | QA/Automation | workspace and API-audit coverage now prove filters, grouped handoffs, and browser-quiet server-rendered contracts | `tests/e2e/workflow/institute-search-api-audit.spec.ts` |
| `institute` | `/institute/security` | Moderate | Completed | Frontend + QA | watch-state workflow coverage added; deeper review/escalation mutation remains later | `tests/e2e/workflow/institute-security-workspace.spec.ts` |
| `institute` | `/institute/settings` | Moderate | Completed | Frontend + QA | CRUD guardrails now cover validation, save, reload, restore; multi-operator conflict depth remains later | `tests/e2e/workflow/institute-settings-crud-guardrails.mutable.spec.ts` |
| `institute` | `/institute/people` | Moderate | Completed | QA/Automation | dedicated workspace-level coverage now covers switching, filters, row actions, and create/import handoffs | `tests/e2e/workflow/institute-people-workspace.spec.ts` |
| `teacher` | `/teacher/question-bank/comprehension/import` | Moderate | Completed | QA/Automation | browser coverage plus mutable finalize depth now prove blocked state, preview validation, finalize success, imported-detail visibility, and cleanup | `tests/e2e/workflow/teacher-comprehension-import-finalize.mutable.spec.ts` |
| `teacher` | `/teacher/exams/advanced` | Moderate | Completed | QA/Automation | advanced-builder workspace parity now covers entitlement state, stage controls, safe preview, and template-library behavior | `tests/e2e/workflow/teacher-advanced-builder-workspace.spec.ts` |
| `teacher` | `/teacher/exams/new` | Moderate | Completed | QA/Automation | dedicated create-form pack now covers step validation, scope hydration, and disposable shell creation with cleanup | `tests/e2e/workflow/teacher-exams-create-workspace.spec.ts` |
| `teacher` | `/teacher/question-bank/new` | Moderate | Completed | QA/Automation | dedicated create-route browser pack now covers validation visibility, academic dependency hydration, and duplicate-prefill truthfulness | `tests/e2e/workflow/teacher-question-create-browser-coverage.spec.ts` |
| `institute` | `/institute/dashboard` | Moderate | Completed | Frontend + QA | browser-truthfulness coverage now proves filter hydration, apply/reset behavior, quick-filter parity, visible-lane truthfulness, and summary-count consistency; route bug in stale filter state was fixed | `tests/e2e/workflow/institute-dashboard-browser-coverage.spec.ts` |
| `institute` | `/institute/academic-setup` | Moderate | Completed | QA/Automation | API audit now proves section switches stay browser-quiet and URL-driven while the existing mutable suite continues to cover record lifecycle depth | `tests/e2e/workflow/institute-academic-setup-api-audit.spec.ts` |
| `institute` | `/institute/reviews` | Moderate | Completed | QA/Automation | mutable review lifecycle now covers assignment, recheck, and moderation state truthfulness through the browser | `tests/e2e/workflow/institute-reviews-mutable.spec.ts` |
| `institute` | `/institute/reports` | Moderate | Completed | QA/Automation | timing and API-audit coverage now prove report filter persistence and browser-quiet server-rendered behavior | `tests/e2e/workflow/institute-reports-api-audit.spec.ts` |
| `admin` | `/admin/security` | Moderate | Completed | QA/Automation | API audit now proves the route stays browser-quiet and URL-driven, including deterministic seeded watch-state and reset-preservation coverage | `tests/e2e/workflow/admin-security-api-audit.spec.ts` |

## Already Strong

These areas are already in a good place and do not need immediate first-wave expansion:

### Admin

- `/admin`
- `/admin/dashboard`
- `/admin/institutes`
- `/admin/people`
- `/admin/academic-setup`
- `/admin/economy`
- `/admin/exams`
- `/admin/exams/new`
- `/admin/exams/advanced`
- `/admin/exams/preset-packs`
- `/admin/exams/[examId]`
- `/admin/exams/[examId]/builder`
- `/admin/reports`
- `/admin/search`
- `/admin/security`
- `/admin/settings`

### Institute

- `/institute/economy`
- `/institute/dashboard`
- `/institute/exams`
- `/institute/exams/new`
- `/institute/exams/advanced`
- `/institute/exams/preset-packs`
- `/institute/exams/[examId]`
- `/institute/exams/[examId]/builder`
- `/institute/academic-setup`
- `/institute/question-bank`
- `/institute/question-bank/import`
- `/institute/question-bank/linked`
- `/institute/question-bank/new`
- `/institute/question-bank/[questionId]`
- `/institute/question-bank/library-linker`
- `/institute/question-bank/comprehension/new`
- `/institute/question-bank/comprehension/import`
- `/institute/question-bank/comprehension/[passageId]`
- `/institute/results`
- `/institute/results/analysis`
- `/institute/results/attempts`
- `/institute/results/leaderboard`
- `/institute/results/live`
- `/institute/reviews`
- `/institute/reports`
- `/institute/search`
- `/institute/teacher-assignments`

### Teacher

- `/teacher/exams/new`
- `/teacher/dashboard`
- `/teacher/exams`
- `/teacher/search`
- `/teacher/exams/[examId]`
- `/teacher/exams/[examId]/builder`
- `/teacher/question-bank`
- `/teacher/question-bank/import`
- `/teacher/question-bank/new`
- `/teacher/question-bank/[questionId]`
- `/teacher/question-bank/comprehension/new`
- `/teacher/question-bank/comprehension/import`
- `/teacher/question-bank/comprehension/[passageId]`
- `/teacher/results`
- `/teacher/results/analysis`
- `/teacher/results/attempts`
- `/teacher/results/leaderboard`
- `/teacher/results/live`
- `/teacher/reviews`

## Recommended Implementation Order

### Phase 1

1. Add optional scale-oriented list and import stress expansions where operationally valuable.

## Practical Goal

The first-wave confidence imbalance between `admin`, `institute`, and `teacher` is now closed. Further work is optional depth expansion, not route-surface risk reduction.

That is the fastest path to making the operator stack feel uniformly hardened rather than only strong in selected areas.
