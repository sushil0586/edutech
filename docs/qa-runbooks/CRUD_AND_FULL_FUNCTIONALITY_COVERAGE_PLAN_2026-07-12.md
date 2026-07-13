# CRUD And Full-Functionality Coverage Plan - 2026-07-12

## Purpose

This document defines what "full functionality should be covered in test cases" means for this product.

Not every route is a CRUD page.

We should cover each route according to its real behavior:

- `CRUD lanes`: create, read, update, archive/delete, restore/recover, cleanup
- `Import/export lanes`: template download, sample download, preview validation, finalize, error handling, cleanup
- `Authoring/build lanes`: create flow, preview flow, validation failures, save draft/template, handoffs, cleanup
- `Review/ops lanes`: filters, state transitions, reassignment/escalation, audit trail truthfulness
- `Read/report lanes`: filters, grouping, sorting, KPIs, empty state, degraded state, exports, handoffs

This is the operator-quality standard we should use for Playwright coverage.

## Coverage Standard

### 1. CRUD route standard

A route counts as fully covered only when the suite proves:

- `Create`: minimum valid create path works
- `Validation`: required-field and invalid-input errors are shown truthfully
- `Read`: created record becomes visible in the route UI or detail UI
- `Update`: editable fields persist after save and reload
- `Delete/Archive`: disposable record can be removed or archived
- `Restore`: if the product supports restore, restore path is covered
- `Cleanup`: test leaves tenant data clean

### 2. Import/export standard

A route counts as fully covered only when the suite proves:

- `Download template`
- `Download sample` when supported
- `Preview` with valid or intentionally invalid payload
- `Field-level validation`
- `Finalize` when safe and supported
- `Failure recovery` for blocked/invalid rows
- `Cleanup` for imported disposable data

### 3. Builder/authoring standard

A builder route counts as fully covered only when the suite proves:

- `Workspace loads`
- `Core controls are hydrated`
- `Preset/template shortcuts work`
- `Preview` path is truthful
- `Create/save` path is truthful when enabled
- `Blocking validation` prevents invalid create
- `Handoffs` to related routes work
- `Cleanup` for any saved disposable template or created artifact

### 4. Read/ops route standard

A read-heavy route counts as fully covered only when the suite proves:

- `KPIs/cards` render truthfully
- `Filter controls` hydrate
- `Apply/reset` works
- `Grouping/sorting` works
- `Empty/no-result state` is distinct from normal data
- `Degraded/blocked state` is truthful where applicable
- `Cross-route handoffs` work
- `Export` works if the route supports export

## Current Route Intent Matrix

### Admin

| Route | Route Type | Required Full-Coverage Standard | Current Read |
|---|---|---|---|
| `/admin/institutes` | CRUD + onboarding | full CRUD + onboarding flows + recovery + cleanup | strong |
| `/admin/people` | CRUD + import | full CRUD + import/export + login actions + cleanup | strong |
| `/admin/academic-setup` | CRUD | full CRUD across structure sections + restore + cleanup | strong |
| `/admin/economy` | CRUD + policy ops | create/update/archive where supported + support flows + cleanup | strong |
| `/admin/exams/new` | authoring/create | validation + preview/create truthfulness + cleanup | strong |
| `/admin/exams/advanced` | builder/authoring | preview/create/template/preset truthfulness + cleanup | strong |
| `/admin/exams/[examId]` | detail + mutation | policy/security/result-ready mutations + cleanup | strong |
| `/admin/security` | read/ops + contract | filters + watch-state truthfulness + API-audit parity | strong |
| `/admin/settings` | CRUD + policy | save/reload/conflict coverage | strong, concurrency still pending |

### Institute

| Route | Route Type | Required Full-Coverage Standard | Current Read |
|---|---|---|---|
| `/institute/dashboard` | read/ops | KPI truthfulness + filter hydration + apply/reset + quick handoffs + summary consistency | strong |
| `/institute/people` | CRUD + import | create/edit/import/export/login actions + cleanup | strong, API-audit still pending |
| `/institute/academic-setup` | CRUD | create/edit/archive/restore across sections + cleanup | strong |
| `/institute/settings` | CRUD wrapper for defaults | validate/save/reload/restore + conflict coverage | strong, multi-operator conflict pending |
| `/institute/exams/new` | authoring/create | wizard validation + create truthfulness + cleanup | strong |
| `/institute/exams/advanced` | builder/authoring | preview/create/template/preset truthfulness + cleanup | strong |
| `/institute/exams/[examId]` | detail + mutation | policy/security/runtime mutations + cleanup | strong |
| `/institute/question-bank/new` | CRUD | create/update/delete disposable question + validation + cleanup | strong |
| `/institute/question-bank/comprehension/new` | CRUD | create/update/delete comprehension set + validation + cleanup | strong |
| `/institute/question-bank/import` | import/export | template/preview/finalize/error handling + cleanup | strong |
| `/institute/question-bank/comprehension/import` | import/export | template/preview/finalize/error handling + cleanup | strong, deeper finalize depth still possible |
| `/institute/reviews` | review/ops | reassignment/escalation/state-truthfulness | strong |
| `/institute/reports` | read/report | filters/grouping/export/timing/degraded state | strong |
| `/institute/search` | read/report | filters/grouping/no-result/result-type/API parity | strong |
| `/institute/security` | review/ops | filters/watch-state/review/escalation/history truthfulness | strong on watch-state, deeper mutations pending |

### Teacher

| Route | Route Type | Required Full-Coverage Standard | Current Read |
|---|---|---|---|
| `/teacher/exams/new` | authoring/create | form guardrails + invalid-combination coverage + cleanup | strong |
| `/teacher/exams/advanced` | builder/authoring | workspace parity + preview + template + create blocking | now stronger, create-path depth can still grow |
| `/teacher/exams/[examId]` | detail + mutation | policy/detail mutation truthfulness + cleanup | strong |
| `/teacher/question-bank/new` | CRUD | create/update/delete disposable question + validation + cleanup | strong |
| `/teacher/question-bank/comprehension/new` | CRUD | create/update/delete comprehension set + validation + cleanup | strong |
| `/teacher/question-bank/comprehension/import` | import/export | blocked state, preview validation, finalize truthfulness, cleanup | strong |
| `/teacher/reviews` | review/ops | review lifecycle mutations + reassignment/escalation | strong |
| `/teacher/dashboard` | read/ops | KPIs/filters/degraded states/handoffs | strong |
| `/teacher/exams` | read/ops | list filters/grouping/empty states/pagination/handoffs | strong |
| `/teacher/search` | read/ops | filters/grouping/result-type/no-result/stale-index parity | strong |

## What Still Must Be Added For "Full Functionality"

### Highest-priority read or contract depth

No remaining first-wave teacher search gap remains beyond optional scale-edge expansion.

## Recommended Definition Of Done

We should call a route "fully covered" only when:

- the route has the right coverage standard for its lane type
- disposable mutations clean up after themselves
- both happy path and guardrail path are covered
- at least one reload/revisit persistence check exists for mutable routes
- supporting docs are updated so status matches reality

## Recommended Next Execution Order
