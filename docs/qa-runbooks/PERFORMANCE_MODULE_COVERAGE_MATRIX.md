# Performance Module Coverage Matrix

Last updated: 2026-07-06

## Purpose

This matrix answers one narrow question:

Which product modules are actually covered for performance work, and which are still only partially characterized?

Use this document to avoid vague statements like "performance is mostly covered" when the real status is mixed across modules.

Related documents:

- [FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md)
- [BACKEND_ANALYTICS_PERFORMANCE_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/BACKEND_ANALYTICS_PERFORMANCE_RUNBOOK.md)
- [BACKEND_OPERATIONAL_ROUTE_PROFILING_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/BACKEND_OPERATIONAL_ROUTE_PROFILING_RUNBOOK.md)
- [PLAYWRIGHT_PERFORMANCE_PENETRATION_MASTER_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_PERFORMANCE_PENETRATION_MASTER_PLAN.md)
- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)

## Status Legend

- `green`
  - module has meaningful profiling or timing evidence across its main hotspot shape
  - no major blind spot is currently known
- `yellow`
  - module has partial evidence and some hardening, but still lacks stage realism or load proof
- `red`
  - module has little or no real performance proof yet

## Coverage Flags

- `backend read`
  - route or service profiling exists for the main read surfaces
- `backend write`
  - write-path profiler or measured mutation coverage exists
- `frontend local`
  - dedicated local browser timing or route tracing exists
- `stage timing`
  - stage timing, browser timing, or direct stage benchmark exists
- `load test`
  - controlled concurrency or `k6` evidence exists

## Module Matrix

| Module | Backend read | Backend write | Frontend local | Stage timing | Load test | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Auth and session discovery | yes | partial | partial | yes | yes | `yellow` | local and stage login plus `/auth/me/` hardening exists; still not at strong p95 under stage concurrency |
| Admin dashboard | partial | no | partial | partial | no | `yellow` | browser/admin shell and dashboard routes are stage-proven functionally, but no serious module-level load proof yet |
| Admin economy | yes | partial | yes | yes | no | `yellow` | strong backend and frontend route work exists; still missing concurrency/load proof |
| Admin institutes and people | partial | no | partial | partial | no | `yellow` | browser timing and route sanity exist, but backend and stage evidence are not deep across all subflows |
| Academic setup | no | no | partial | no | no | `red` | functional browser coverage exists, but not real performance characterization |
| Question bank, admin side | yes | partial | partial | partial | no | `yellow` | backend package and entitlement routes are profiled; frontend admin question-bank economy paths are timed; no broad stage/load coverage |
| Question bank, institute side | partial | no | yes | partial | no | `yellow` | local route timing and create bootstrap reductions exist; stage timing exists on selected flows only |
| Question bank, teacher side | partial | no | yes | partial | no | `yellow` | local route timing and create/import optimization exist; stage realism is still incomplete |
| Exams workspace and creation | partial | yes | partial | partial | no | `yellow` | backend exam write profiling exists; frontend functional coverage is strong, but performance proof is not complete |
| Exam detail and builder handoff | partial | yes | partial | no | no | `yellow` | write-path profiling exists, but route-level frontend and stage timing are still incomplete |
| Results and analytics, institute | yes | partial | yes | partial | no | `yellow` | backend analytics and operational routes are profiled; local frontend timing exists; broader stage/load realism still missing |
| Results and analytics, teacher | yes | partial | yes | partial | no | `yellow` | strongest shared results route work after institute; stage timing is partial and no load proof yet |
| Results and analytics, student | yes | partial | yes | partial | yes | `yellow` | strong local profiling and timing exist; some auth/discovery load evidence exists; full student exam-day load path still incomplete |
| Review queue and moderation | yes | yes | partial | no | no | `yellow` | backend summary and review write profiling exist; frontend/stage timing depth is still limited |
| Notifications | yes | no | no | no | no | `yellow` | backend route is profiled and hardened locally; almost no frontend or stage-specific performance evidence |
| Parent surfaces | yes | no | no | no | no | `yellow` | backend routes are profiled locally, but the rest of the module is mostly unmeasured |
| Economy wallet and subscriptions, student | yes | no | no | no | no | `yellow` | backend routes are healthy locally; frontend and stage validation remain thin |
| Shared library and entitlements | yes | partial | partial | partial | no | `yellow` | backend list and entitlement access routes were hardened; stage density and load proof still lag |
| Onboarding and registration variations | no | no | no | no | no | `red` | functionally tested, but not truly covered as a performance module |
| File import and bulk upload flows | partial | yes | partial | no | no | `yellow` | roster import finalize and question/passage import preview/finalize now have backend profiling; question finalize local baseline improved from `129` to `71` queries for a 3-row disposable run, but larger-row runs still show strong query-linear growth and upload-specific plus stage/load evidence are still missing |
| Security and reports surfaces | no | no | partial | no | no | `red` | some browser route coverage exists, but not real performance characterization |

## Honest Read

### Strongest current coverage

- auth/session discovery
- admin economy
- results and analytics
- selected question-bank heavy routes
- backend read-path hotspots
- several backend write-heavy flows

### Partially covered but not done

- exams workspace
- institute and teacher question-bank families
- admin dashboard and institutes
- shared library and entitlement-heavy lanes
- student post-submit route family

### Weakest current performance coverage

- onboarding as a performance module
- file import and upload flows
- academic setup
- reports
- security surfaces
- parent and notifications beyond backend-only local proof

## Practical Answer

If the question is "are all modules covered for performance?", the answer is:

- `No`

If the question is "have the highest-risk and heaviest modules started receiving real performance coverage?", the answer is:

- `Yes`

## Next Modules To Upgrade

These are the best next targets to move this matrix toward real completeness:

1. File import and bulk upload flows
2. Exam creation and exam detail routes on stage
3. Notifications and parent surfaces beyond backend-only local profiling
4. Academic setup and onboarding as explicit performance modules
5. Full stage timing and controlled load validation for institute, teacher, and student critical journeys

## Promotion Rules

Upgrade a module from `yellow` to `green` only when:

- its main backend read hotspot has profiling evidence
- its main write hotspot is either profiled or known to be low risk
- its main frontend heavy route has local timing evidence
- at least one representative stage timing pass exists
- the module is no longer blind under realistic payload or seeded stage data

Upgrade a module from `red` to `yellow` when:

- one meaningful profiler, timing probe, or stage benchmark exists for that module
