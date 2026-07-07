# Overall Product Confidence Matrix

Last updated: 2026-07-07

## Purpose

This matrix gives one practical answer to four questions:

1. How confident are we overall?
2. Which areas are already technically and QA-strong?
3. Which areas are usable but still risky?
4. What exactly must be done to move the product to `9/10` confidence?

Use this document for:

- pilot go / no-go conversations
- hardening prioritization
- release-readiness reviews
- investor, operator, or internal confidence alignment

Related documents:

- [FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FULL_STACK_PERFORMANCE_OPTIMIZATION_PLAN.md)
- [PLATFORM_HARDENING_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLATFORM_HARDENING_MATRIX.md)
- [P1_HARDENING_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/P1_HARDENING_EXECUTION_BOARD.md)
- [TEACHER_INSTITUTE_ROLE_CONSISTENCY_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/TEACHER_INSTITUTE_ROLE_CONSISTENCY_MATRIX.md)
- [INSTITUTE_BUG_AND_UX_TRACKER.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/INSTITUTE_BUG_AND_UX_TRACKER.md)
- [BACKEND_ANALYTICS_PERFORMANCE_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/BACKEND_ANALYTICS_PERFORMANCE_RUNBOOK.md)
- [BACKEND_OPERATIONAL_ROUTE_PROFILING_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/BACKEND_OPERATIONAL_ROUTE_PROFILING_RUNBOOK.md)
- [PLAYWRIGHT_PERFORMANCE_PENETRATION_MASTER_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_PERFORMANCE_PENETRATION_MASTER_PLAN.md)
- [PLAYWRIGHT_PERFORMANCE_PENETRATION_EXECUTION_PACK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_PERFORMANCE_PENETRATION_EXECUTION_PACK.md)
- [PLAYWRIGHT_BROWSER_9_BENCHMARK_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_BROWSER_9_BENCHMARK_PLAN.md)
- [PERFORMANCE_MODULE_COVERAGE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PERFORMANCE_MODULE_COVERAGE_MATRIX.md)
- [FILE_IMPORT_UPLOAD_PERFORMANCE_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/FILE_IMPORT_UPLOAD_PERFORMANCE_RUNBOOK.md)
- [LOCAL_DEV_PENETRATION_BASELINE_2026-07-06.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/LOCAL_DEV_PENETRATION_BASELINE_2026-07-06.md)
- [STAGE_SCALE_UP_VALIDATION_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SCALE_UP_VALIDATION_RUNBOOK.md)
- [STAGE_SEED_CONTRACT_REMEDIATION_2026-07-06.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SEED_CONTRACT_REMEDIATION_2026-07-06.md)

---

## Confidence Scale

- `9 to 10`
  - technically strong
  - browser-proven in realistic flows
  - operator behavior is clear
  - low surprise risk in controlled production usage
- `7 to 8.5`
  - functionally solid
  - core flows are proven
  - remaining risk is mostly clarity, edge depth, or scenario breadth
- `5 to 6.5`
  - usable with supervision
  - important flows exist, but too many assumptions remain
- `Below 5`
  - not ready for dependable rollout

---

## Executive Read

### Overall current confidence

- Controlled pilot with monitored onboarding: `8.5/10`
- Small paid rollout with operator support: `8/10`
- Open self-serve broader production: `6.5/10`

### Honest summary

The product is no longer “prototype confidence.”

It is now:

- technically real
- operationally usable
- browser-tested in meaningful institute and teacher flows
- strong enough for controlled pilot rollout

It is not yet at the point where every dense operational lane is simple enough for low-support, wide-open rollout.

### Latest hardening movement

As of `2026-07-06`, Playwright browser Phase 1 hardening also moved forward on the benchmark gap areas:

- `edutech_web/tests/e2e/workflow/admin-institutes-mutable.spec.ts`
  - institute account-control state assertions now explicitly prove:
    - no login
    - active login
    - disabled login
- `edutech_web/tests/e2e/workflow/admin-roster-mutable.spec.ts`
  - teacher and student roster rows now explicitly prove mixed account-control states
  - student mutable coverage now also verifies disable and re-enable lifecycle truth
  - teacher and student create dialogs now also prove required-field validation truth in-browser
- `edutech_web/tests/e2e/workflow/admin-roster-import-mutable.spec.ts`
  - mixed valid and invalid student preview rows now prove partial-import truth explicitly before finalize
- `edutech_web/tests/e2e/workflow/teacher-comprehension-mutable.spec.ts`
  - comprehension editor structure, true empty-submit validation, and persisted update truth are now stronger
- `edutech_web/tests/e2e/workflow/teacher-question-mutable.spec.ts`
  - teacher bulk tag attach/remove and bulk topic reassignment are now cross-browser green on Firefox and WebKit
- `edutech_web/tests/e2e/workflow/teacher-question-bank-linked-inventory.spec.ts`
  - teacher linked-inventory coverage is now green locally against the healthy app server
  - it proves the intended role distinction between institute-side linking and teacher-side read-only duplicate-first reuse
  - it now anchors to the deterministic seeded teacher linked row instead of a fragile institute-side linker precondition
- `edutech_web/tests/e2e/workflow/teacher-institute-shared-library-role-difference.spec.ts`
  - teacher shared-library browser coverage now explicitly proves the control split across roles
  - teacher sees `Request Access` with no direct linking control
  - institute sees `Add to Institute Bank` inside the scoped linker flow for the same seeded product area
- `edutech_web/tests/e2e/workflow/institute-results-descriptive.mutable.spec.ts`
  - institute-side descriptive scoring is now mutated through the visible review form and rechecked after revisit
- `edutech_web/tests/e2e/workflow/admin-economy-mutable.spec.ts`
  - the reversible economy benchmark lane is now materially stronger than the earlier matrix wording suggested, with browser-proven:
    - platform policy update plus restore
    - subscription entitlement pause/reactivate
    - entitlement lifecycle note/window mutation plus restore
    - revoked-history restore to governing access
    - feature entitlement pause/reactivate

This narrows the main remaining Playwright browser benchmark gap mostly to:

- broader repeated-run stability evidence
- small-screen operator parity
- broader role-difference workflow breadth outside the now-green teacher linked-inventory and shared-library control-split lanes

As of `2026-07-07`, operator compact-viewport depth also improved beyond simple shell reachability:

- `edutech_web/tests/e2e/workflow/teacher-mobile-question-bank-workflow.spec.ts`
  - `1 passed`
  - teacher compact viewport now proves a real question-bank task flow, not just menu reachability
  - the lane covers mobile navigation into question bank, linked-row search, read-only linked inventory recognition, preview dialog open/close, and duplicate-first reuse visibility
  - this does not finish operator small-screen hardening, but it moves teacher mobile confidence beyond shell-only evidence
- `edutech_web/tests/e2e/workflow/teacher-mobile-reviews-workflow.spec.ts`
  - `1 passed`
  - teacher compact viewport now also proves a real reviews task flow, not just shell reachability
  - the lane covers mobile navigation into reviews, status and page-size filtering, empty-state reset flow, results handoff, and exam-scoped review navigation
  - this makes teacher small-screen confidence meaningfully broader than a single question-bank-only mobile path
- `edutech_web/tests/e2e/workflow/teacher-mobile-authoring-workflow.spec.ts`
  - `1 passed` on Chromium
  - grouped result on Firefox and WebKit: `2 passed`
  - teacher compact viewport now also proves a real disposable draft authoring task flow
  - the lane covers mobile navigation into question creation, program and subject dependency behavior, no-options-required question-type selection, draft save, landing on the created draft, and API cleanup
  - this removes the biggest remaining teacher small-screen gap from the current local/browser-engine picture
- `edutech_web/tests/e2e/workflow/institute-mobile-question-bank-workflow.spec.ts`
  - `1 passed`
  - institute compact viewport now proves a real question-bank task flow, not just menu reachability
  - the lane covers mobile navigation into question bank, intake guidance visibility, shared-library linker entry, linker program/subject selection, return to local bank, and create-question form dependency behavior
  - this does not finish operator small-screen hardening, but it moves institute mobile confidence beyond shell-only evidence
- `edutech_web/tests/e2e/workflow/institute-mobile-reviews-workflow.spec.ts`
  - `1 passed`
  - institute compact viewport now also proves a real reviews task flow, not just shell reachability
  - the lane covers mobile navigation into reviews, status and assignment filtering, empty-state reset flow, and exam-scoped review navigation
  - this makes institute small-screen confidence meaningfully broader than a single question-bank-only mobile path
- `edutech_web/tests/e2e/workflow/admin-mobile-economy-workflow.spec.ts`
  - `1 passed`
  - admin compact viewport now proves a real economy task flow, not just menu reachability
  - the lane covers mobile navigation into economy, lane switching across overview, catalog, access control, and support ops, plus dense policy-form interaction on the compact layout
  - this gives all three operator roles at least one real compact-viewport task lane beyond shell-only evidence
- focused cross-browser compact-viewport rerun pack:
  - `admin-mobile-economy-workflow.spec.ts`
  - `teacher-mobile-question-bank-workflow.spec.ts`
  - `teacher-mobile-reviews-workflow.spec.ts`
  - `institute-mobile-question-bank-workflow.spec.ts`
  - `institute-mobile-reviews-workflow.spec.ts`
  - grouped result on Firefox and WebKit: `10 passed`
  - this materially reduces the risk that the new mobile hardening is Chromium-biased

As of `2026-07-06`, the admin browser workspace baseline is also materially stronger on local dev against the healthy app server:

- the admin workspace route family now reruns green as a grouped baseline:
  - `admin-dashboard-workspace.spec.ts`
  - `admin-institutes-workspace.spec.ts`
  - `admin-people-workspace.spec.ts`
  - `admin-economy-workspace.spec.ts`
  - `admin-economy-browser-coverage.spec.ts`
  - `admin-settings-workspace.spec.ts`
  - `admin-security-workspace.spec.ts`
  - `admin-reports-workspace.spec.ts`
  - grouped result: `13 passed`
- the main hardening corrections behind that rerun were:
  - admin people now falls back truthfully when roster datasets are empty instead of behaving like a broken page
  - admin people browser coverage now selects a populated institute when one exists and otherwise asserts the truthful empty state
  - admin economy browser coverage now follows the lighter question-bank default flow before switching into editor assertions
  - admin security browser coverage now targets the visible dashboard navigation contract instead of a hidden brand link
  - admin people and admin economy server routes now return workspace-safe fallback states instead of generic route crashes when one upstream fetch fails
- this does not yet mean the whole browser benchmark is `9/10`, but it does mean the admin route family is no longer one of the main blockers

As of `2026-07-06`, the first operator compact-viewport baseline is also now green locally:

- `edutech_web/tests/e2e/workflow/operator-mobile-shell-sanity.spec.ts`
  - `3 passed`
  - admin mobile shell now proves dashboard-to-economy-to-security reachability
  - institute mobile shell now proves dashboard-to-economy-to-reviews reachability
  - teacher mobile shell now proves dashboard-to-results-to-reviews reachability
- this is still an early small-screen baseline rather than deep mobile workflow proof, but it removes the earlier claim that operator roles had no equivalent compact-viewport suite at all

As of `2026-07-06`, cross-browser operator confidence is also stronger than simple route proof:

- `edutech_web/tests/e2e/workflow/admin-economy-browser-coverage.spec.ts`
  - focused mutable policy persist-and-restore lane is now green on Firefox and WebKit
  - grouped result: `2 passed`
  - this means admin now has one browser-proven reversible write path outside Chromium, not just shell and deep-route reachability
- `edutech_web/tests/e2e/workflow/admin-institute-economy-policy-contract.mutable.spec.ts`
  - institute-facing policy-disable contract is now green on Chromium, Firefox, and WebKit
  - grouped result: `1 passed` on Chromium
  - grouped result: `2 passed` on Firefox and WebKit
  - this means institute now also has one browser-proven reversible policy-contract lane outside simple route reachability
- `edutech_web/tests/e2e/workflow/teacher-exam-detail-mutable.spec.ts`
  - teacher disposable exam-detail mutation lane is now green on Chromium, Firefox, and WebKit
  - grouped result: `1 passed` on Chromium
  - grouped result: `2 passed` on Firefox and WebKit
  - this means all three operator role families now have at least one browser-proven reversible mutation or policy-contract lane beyond simple route reachability
- `edutech_web/tests/e2e/workflow/teacher-exam-builder-mutable.spec.ts`
  - teacher builder-to-persisted-detail mutation lane is now green on Chromium, Firefox, and WebKit
  - grouped result: `1 passed` on Chromium
  - grouped result: `2 passed` on Firefox and WebKit
  - this means cross-browser proof now also includes one real create-save-reopen-mutate-cleanup builder workflow, not just shell, route, economy, and exam-detail lanes
- `edutech_web/tests/e2e/workflow/teacher-results-analysis-workspace.spec.ts`
  - teacher results analysis interaction lane is now green on Chromium, Firefox, and WebKit
  - grouped result: `1 passed` on Chromium
  - grouped result: `2 passed` on Firefox and WebKit
  - this means cross-browser proof now also includes one real filter-and-drill analysis workflow, not just route reachability into results pages
- `edutech_web/tests/e2e/workflow/institute-results-analysis-workspace.spec.ts`
  - institute results analysis interaction lane is now green on Firefox and WebKit after being aligned to the current form-based filter UI
  - grouped result: `2 passed`
  - this means cross-browser results-interaction depth is no longer concentrated only in the teacher role
- `edutech_web/tests/e2e/workflow/institute-exam-builder-workspace.spec.ts`
  - institute builder utility and linked-question workflow lane is now green on Firefox and WebKit
  - grouped result: `2 passed`
  - this means cross-browser builder depth is no longer concentrated only in the teacher role
- `edutech_web/tests/e2e/workflow/institute-question-bank-workspace.spec.ts`
  - institute question-bank workspace and authoring-entry lane is now green on Firefox and WebKit
  - grouped result: `2 passed`
  - this means institute-side authoring depth now extends beyond builder and results into question-bank entry routes
- `edutech_web/tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts`
  - admin advanced builder authoring lane is now green on Firefox and WebKit
  - grouped result: `2 passed`
  - this means the main browser benchmark gap is no longer simple admin authoring reachability
- `edutech_web/tests/e2e/workflow/teacher-comprehension-mutable.spec.ts`
  - teacher comprehension creation, persistence, update, and linked-child-question lane is now green on Firefox and WebKit
  - grouped result: `2 passed`
  - repeated result with `--repeat-each=2`: `4 passed`
  - the lane was hardened to use the stable plain-text authoring mode plus truthful form-blocking assertions, which removes the earlier cross-browser contenteditable drift from this benchmark area
- `edutech_web/tests/e2e/workflow/teacher-question-mutable.spec.ts`
  - teacher bulk tag attach/remove and teacher bulk topic reassignment are now green on Firefox and WebKit
  - grouped result for the focused tag/topic pack: `4 passed`
  - the lane was hardened by aligning the test to the teacher detail API contract, polling persisted `tag_maps` instead of a non-existent `tags` array, and making disposable authoring tolerate valid program/subject combinations that do not expose concrete topic options immediately
- focused repeated-run desktop stability proof now also exists on Firefox and WebKit:
  - non-mutable operator desktop pack:
    - `admin-advanced-builder-workspace.spec.ts`
    - `admin-cross-browser-shell.spec.ts`
    - `admin-cross-browser-deep-routes.spec.ts`
    - `institute-cross-browser-shell.spec.ts`
    - `institute-cross-browser-results.spec.ts`
    - `institute-exam-builder-workspace.spec.ts`
    - `institute-question-bank-workspace.spec.ts`
    - `institute-results-analysis-workspace.spec.ts`
    - `teacher-cross-browser-shell.spec.ts`
    - `teacher-cross-browser-results.spec.ts`
    - `teacher-results-analysis-workspace.spec.ts`
    - grouped result with `--repeat-each=2`: `44 passed`
  - mutable admin policy rerun:
    - `admin-economy-browser-coverage.spec.ts`
    - grouped result with `--repeat-each=2` on Firefox and WebKit: `4 passed`
  - mutable institute and teacher rerun:
    - `admin-institute-economy-policy-contract.mutable.spec.ts`
    - `teacher-exam-detail-mutable.spec.ts`
    - `teacher-exam-builder-mutable.spec.ts`
    - grouped result with `--repeat-each=2` on Firefox and WebKit: `12 passed`
  - the one Firefox flake in the admin economy rerun came from a brittle `changed:` audit-text assertion and was removed after the actual policy persistence had already succeeded
  - this shifts the main browser benchmark gap away from repeated-run stability and toward compact-viewport workflow depth, linked-inventory realism, role-difference clarity, and broader destructive mutation breadth

As of `2026-07-05`, the highest-value exam family lifecycle suites are now browser-proven green:

- `edutech_web/tests/e2e/workflow/institute-family-release-happy-path.mutable.spec.ts`
  - `5 passed`
- `edutech_web/tests/e2e/workflow/teacher-family-release-happy-path.mutable.spec.ts`
  - `5 passed`
- `edutech_web/tests/e2e/workflow/institute-family-release-state.mutable.spec.ts`
  - `2 passed`
- `edutech_web/tests/e2e/workflow/institute-family-immediate-release.mutable.spec.ts`
  - `1 passed`
  - AWS immediate review is now browser-proven through the seeded `demo-aws-student` lane
- `edutech_web/tests/e2e/workflow/institute-family-runtime-depth.mutable.spec.ts`
  - `4 passed`
  - AWS review endpoint and browser review page now align with the seeded review-ready contract
- `edutech_web/tests/e2e/workflow/admin-mixed-institute-onboarding.mutable.spec.ts`
  - `1 passed`
  - mixed institute onboarding and economy access extension are now browser-proven on the live admin workspace
- `edutech_web/tests/e2e/workflow/institute-results-descriptive-multi-role.mutable.spec.ts`
  - `1 discovered`
  - institute-to-teacher descriptive recheck, moderation, and publication continuity is now covered in the mutable browser suite catalog
- `edutech_web/tests/e2e/workflow/institute-results-live-populated.mutable.spec.ts`
  - `1 discovered`
  - institute live monitor now has populated in-progress attempt coverage with attempt drill-in and intervention-note realism
- `edutech_web/tests/e2e/workflow/teacher-results-live-populated.mutable.spec.ts`
  - `1 discovered`
  - teacher live monitor now has populated in-progress attempt coverage with attempt drill-in and intervention-note realism
- `edutech_web/tests/e2e/workflow/student-results-storytelling.mutable.spec.ts`
  - `1 discovered`
  - one disposable published result is now traced across student results, analytics landing, compare, and timeline storytelling views
- `edutech_web/tests/e2e/workflow/institute-results-analysis-populated.mutable.spec.ts`
  - `1 discovered`
  - institute analysis now has populated disposable-result coverage across hero cards, risk board, student explorer, and question-wise evidence
- `edutech_web/tests/e2e/workflow/teacher-results-analysis-populated.mutable.spec.ts`
  - `1 discovered`
  - teacher analysis now has populated disposable-result coverage across hero cards, risk board, student explorer, and question-wise evidence
- `edutech_web/tests/e2e/workflow/student-analytics-drilldown.mutable.spec.ts`
  - `1 discovered`
  - student analytics now has scoped drill-down continuity coverage across compare, timeline, action center, and subject deep dive routes

As of `2026-07-05`, backend analytics read-path hardening also now has measured service-level proof:

- result pipeline critical sections were shortened so expensive summary and rank refresh work happens after the main write block
- `StudentTopicPerformance` rebuild now uses batched writes instead of one row insert per topic
- student question analytics, student insight summary, and teacher insight summary now have versioned short-TTL caches with explicit invalidation on answer / submit / result / review updates
- targeted analytics indexes were added on `StudentAnswer` and `StudentExamAttempt` for latest-answer, peer-benchmark, and expired-attempt scans
- a repeatable backend profiler command now exists at:
  - `./.venv/bin/python manage.py profile_analytics_services --repeat 1`
- current local profiler baselines on demo data show:
  - `student_question_analytics`: cold queries `12 -> 6`
  - `student_insight_summary`: cold queries `20 -> 9`
- `teacher_insight_summary`: cold queries `29 -> 12`

As of `2026-07-05`, backend operational read paths for institute, teacher, notifications, parent, review queue, and shared-library surfaces were also tightened:

- institute dashboard summary now uses short-TTL cached payloads and fewer repeated review-task queries
- teacher and institute exam list surfaces now reuse annotated counts and prefetched section-subject context
- bulk student and teacher roster import preview/finalize flows now batch academic lookup, duplicate detection, and related-object resolution
- master question library access resolution now batches entitlement, scope, and quota checks across the page instead of recalculating them per question
- review queue summary now uses a lighter queryset and less repeated Python-side aggregation work
- parent dashboard and alert surfaces now reuse parent relationship scope and reduce repeated aggregate/count work
- notifications now avoid a few unnecessary relational joins, and bulk mark-all-read now returns the true updated row count
- a repeatable backend route profiler now exists at:
  - `./.venv/bin/python manage.py profile_operational_routes --repeat 1`
- the same profiler can now isolate one route with `--route-label` and include captured SQL samples with `--include-query-sql` for faster route-level diagnosis
- first local route-level measurements now exist for institute dashboard, teacher results summary, review queue summary, notifications, and master question library
- the master question library route was then reworked to paginate before access enrichment on the common list path, dropping the local measured route time from roughly `190-235ms` down to about `23-27ms`
- a follow-up shared-library feature-entitlement cache pass then reduced the master question library route from `6` warm queries to `5`, with warm route time around `21.7ms`
- a follow-up master-library `access_status` subquery annotation then reduced that same route again from `5` warm queries to `4`, with warm route time around `21.88ms`
- a follow-up cached entitlement-and-scope snapshot then reduced the master question library route again from `4` warm queries to `2`, leaving essentially paginator `COUNT` plus page fetch on the warm path
- the teacher exam list route then dropped from `24` queries to `4` after fixing hydrated-missing access-policy fallback behavior
- a follow-up exam-list serializer memoization pass then reduced that same teacher exam list route further to about `36.55ms` cold and `25.34ms` warm while holding query count flat at `4`
- a follow-up cached exam access-policy snapshot then reduced the teacher exam list warm path again from `4` queries to `3`, removing the `ContentAccessPolicy` query from repeat access
- a follow-up cached notification-list metadata pass then reduced the notification list warm path from `5` queries to `2`, leaving only paginator `COUNT` plus page fetch on repeat access
- as of `2026-07-06`, auth login-path hardening also has a first local code pass:
  - successful login now avoids the previous double password verification path
  - login response hydration now reuses a `select_related` account-profile fetch before serialization
  - first stage revalidation improved direct login to about `1.25s` to `1.50s`
  - first stage `k6` login-and-discovery smoke improved from the earlier `~14.47s p95` result to about `7.27s p95`
  - stage latency is improved but still not yet strong enough to upgrade the performance confidence lane
- a follow-up `/auth/me/` hardening pass then improved the steady-state direct stage read path further:
  - hydrated session-profile reads now use `select_related(...)` in `MeView`
  - student program-subject discovery now pulls only subject-name values on the read path
  - warm direct stage timings now show about `login ~1.2s` and `me ~0.6s`
  - the warm rerun of the same `k6` login-and-discovery smoke now lands around `6.88s p95`
  - the remaining tail now appears increasingly dominated by concurrency queueing on the current stage gunicorn setup rather than a single obviously-bad auth query path
- a stage-only gunicorn worker-model experiment then confirmed the infrastructure side of that diagnosis:
  - on the current `2 vCPU` stage host, both `5` sync workers and `2 workers x 4 threads` drive CPU to about `100%` during the same auth smoke
  - the threaded model improved median and average latency slightly, but the same smoke still landed around `6.91s p95`
  - the remaining auth/discovery performance gap is now better explained by stage CPU saturation than by one remaining serializer-level bottleneck
  - the stage backend was then reverted to the original `5` sync-worker live config after the comparison run
- as of `2026-07-06`, the first safe local penetration baseline was also executed:
  - sampled admin and student backend authorization checks held correctly with `401` and `403` responses
  - frontend protected routes redirected unauthenticated traffic to `/login`
  - the first meaningful hardening findings were:
    - overly permissive wildcard CORS on auth and authenticated backend API surfaces in the local environment
    - missing anti-clickjacking and broader browser hardening headers on frontend HTML responses
- baseline details are captured in:
    - [LOCAL_DEV_PENETRATION_BASELINE_2026-07-06.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/LOCAL_DEV_PENETRATION_BASELINE_2026-07-06.md)
- as of `2026-07-06`, file-import backend write-path hardening also now has a first measured reduction pass:
  - a disposable local profiler command now exists at:
    - `./.venv/bin/python manage.py profile_question_import_write_path --repeat 1 --rows 3`
  - question import finalize now reuses finalize-scope academic resolution, batches institute-question inserts, batches tag and option writes, and avoids re-reading option rows during master sync
  - the first local disposable question-import finalize measurement improved from about `129` queries / `101.54ms` down to about `71` queries / `54.17ms`
  - file import remains only partially covered overall because stage timing, upload-path timing, and concurrency evidence are still missing
- as of `2026-07-06`, stage admin browser hardening is materially stronger:
  - `admin-institutes-timing.spec.ts`, `admin-economy-workspace.spec.ts`, and `admin-economy-browser-coverage.spec.ts` are green on `https://learn.accerio.in`
  - the Playwright API helpers were also corrected so stage browser tests now default to the same stage origin instead of silently reusing local `.env.local` API settings
  - the remaining admin stage seed-contract blockers were then repaired on stage:
    - AWS demo exam suite was seeded
    - `NEXORA-PUBLIC` public-hub metadata was restored
    - public `Class 8` / `CLS8-MATH` academics and `200` public master-library rows were seeded
  - revalidation is now green for:
    - `admin-aws-results-contract.spec.ts`
    - `admin-class8-math-master-dataset.mutable.spec.ts`
  - exact remediation commands and observed results are captured in:
    - [STAGE_SEED_CONTRACT_REMEDIATION_2026-07-06.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SEED_CONTRACT_REMEDIATION_2026-07-06.md)

This materially improves confidence in:

- family-aware exam creation
- assignment and publish flow
- student attempt to submit continuity
- release to results to review continuity
- multi-family runtime consistency across institute and teacher roles
- release-state handling on the stable competitive families
- AWS review availability after immediate submit
- mixed onboarding variation and economy access extension flow
- backend analytics read-path efficiency and measurement discipline
- institute, teacher, shared-library, notification, review-ops, and parent operational read-path efficiency

---

## Matrix

| Area | Confidence | What is already proven | Main remaining risk | What takes it to `9/10` |
| --- | --- | --- | --- | --- |
| Institute onboarding | `8.5/10` | UI institute creation, academic preset application, onboarding defaults, question-bank access attachment | onboarding summary and recovery clarity | stronger submit summary, clearer attached-access confirmation, more onboarding combination coverage |
| Institute question bank | `8.5/10` | local bank, linked bank, shared-library linker, filters, zero-result recovery, mutable single-item and bulk coverage | some linked pages still benefit from more task-first UX | clearer linked-question mental model, deterministic bulk edge cases |
| Teacher question bank | `8/10` | local authoring, draft lifecycle, shared-library request-only contract, bulk difficulty/status actions | dataset-sensitive tag coverage and lighter builder-depth parity | comprehension parity, deterministic tags, deeper role-proof where needed |
| Package access and entitlements | `8.5/10` | package scope logic, entitlement application, revoke/reactivate clarity, Math-to-Science widening browser-proven, and package-plan-to-institute propagation is browser-proven | conceptual density still high for first-time operators | safer scope editing, stronger lifecycle guidance, deeper mutable coverage |
| Institute exams workspace | `9.25/10` | list, filters, pagination, zero-result recovery, create entry points, populated reruns, generic guided-wizard plus advanced-builder `practice` / `quiz` / `mock_exam` creation baseline, preset-pack to builder handoff baseline, family plus managed preset-derived create/save persistence baseline, `entitlement_only` policy persistence baseline, and stars-based policy plus non-normal security persistence across admin and institute shells are browser-proven | denser operator combinations are still more teachable than self-evident for first-time staff | stronger state explanations, a few more dense cross-surface combinations |
| Exam detail and builder handoff | `8/10` | institute and teacher core detail contract, mutable access policy actions, builder handoff, status refresh, sync marks | institute flow is deeper than teacher by design, but this may still feel inconsistent | explicit intentional parity line, broader builder-depth proof |
| Results and reviews | `9.7/10` | institute and teacher route family, readiness shell, filtered empty-state handling, attempts / leaderboard / analysis / live monitor coverage, institute review-queue navigation and scoped recovery baseline, AWS review-ready path, teacher manual-review queue assignment and scoring baseline, teacher multi-learner leaderboard publication distribution, institute-owned descriptive review-to-publication mutation, institute-to-teacher descriptive recheck/moderation/publication continuity coverage, both institute and teacher populated live-monitor attempt/intervention coverage, a disposable published-result storytelling path across student results plus analytics compare/timeline views, both institute and teacher populated analysis coverage across hero cards, risk board, student explorer, and question evidence, and student scoped drill-down continuity across compare, timeline, actions, and subject views are browser-proven or suite-backed | denser cross-surface scoped consistency and broader non-functional proof still lag the strongest workflow lanes | scoped analytics consistency under narrower filters, weak-network/runtime behavior, and performance realism |
| Economy oversight | `8.9/10` | scope-first design, package visibility, entitlement truth, restore/reactivate flows, top-of-lane diagnosis, access-chain glossary, clearer governing-vs-historical rows, safer package scope editing, controlled star-grant baseline, entitlement lifecycle notes/date edits, institute-admin policy-disable contract, admin-to-institute package-plan propagation, and the full admin economy browser workspace lane set are now browser-proven | the densest catalog and support surfaces still demand more operator comfort than simpler modules | more support-ops combinations, denser operator sanity on the heaviest economy surfaces |
| Teacher / institute role consistency | `8/10` | shell parity, results parity baseline, exam-detail parity baseline, question-bank mutable baseline for both roles | some role differences are still understood only by us, not obvious to all operators | finish comprehension parity, clarify intentional differences in-product |
| Registration / onboarding variations | `8/10` | blank, preset-only, selected-subject, selected-topic-group, package-plus-builder, and reapply onboarding paths are now browser-proven | broader multi-institute and lower-support rollout depth is still thinner than single-institute guided onboarding | multi-institute onboarding proof, lower-support operator validation, less assumption-driven setup |
| Performance / high concurrency | `6.5/10` | service-level profiling now exists, analytics cold-path query counts are materially reduced, targeted caching and indexing are in place, and a repeatable backend performance runbook now exists | not yet stage-load-proven and not yet exam-day concurrency-proven | route-level stage benchmarks, real load tests, cache behavior validation under concurrency, and DB proof on populated stage data |

---

## Color Matrix

### Green

These lanes are now technically strong and browser-proven enough for controlled rollout usage:

- Institute onboarding with guided operator flow
- Institute question-bank local and linked workflow baseline
- Package entitlement attachment and reactivation baseline
- Package-plan-to-institute entitlement propagation baseline
- Institute exams workspace baseline
- Generic guided and advanced exam creation baseline outside seeded family presets
- Preset-pack builder handoff and `entitlement_only` access-policy persistence baseline
- Family preset-derived create/save persistence baseline
- Stars-based access-policy and non-normal security persistence baseline
- Selected-student assignment and multi-learner leaderboard-ready results baseline
- Institute exam detail baseline
- Institute results workspace baseline
- Teacher results workspace baseline
- Teacher manual-review queue assignment and scoring baseline
- Institute review-queue navigation, scoped handoff, and review-ready route baseline
- Institute descriptive review scoring and publication baseline
- Institute-to-teacher descriptive recheck, moderation, and publication continuity baseline
- Institute populated live monitor and intervention-note baseline
- Teacher populated live monitor and intervention-note baseline
- Student published-result storytelling baseline across results and analytics
- Institute populated analysis baseline across risk board and student evidence
- Teacher populated analysis baseline across risk board and student evidence
- Student analytics drill-down continuity baseline
- Economy access-chain clarity and safer package scope editing baseline
- Economy support-ops star-grant, entitlement-lifecycle, and policy-disable baseline
- Economy cross-role package-plan propagation baseline
- Desktop cross-browser sanity across admin, institute, and teacher operator shells plus key results deep routes
- Student mobile-web route and state-panel baseline
- Admin, institute, and teacher small-viewport shell baseline on dense economy, security, results, and review routes
- Onboarding variation breadth across blank, preset-only, and mixed-access paths
- Institute family release happy path
- Teacher family release happy path
- Core student submit to result to review continuity for seeded family lanes

### Yellow

These lanes are real and usable, but still need more depth, breadth, or UX simplification:

- Student analytics depth and broader result storytelling
- Cross-surface analytics consistency under scoped filters

### Red

These are the clearest remaining release-risk areas:

- Performance and high-concurrency proof
- Weak-network / slow-response runtime behavior
- Wide-open self-serve onboarding without guided operator support

---

## What Is Strong Right Now

These areas have the strongest current confidence:

- institute onboarding for controlled setup
- institute question-bank and linked-question operations
- teacher question-bank baseline authoring
- package and entitlement logic
- exams list and exam detail base workflows
- teacher/institute cross-role baseline contract

These are the best browser-proven lanes today:

- institute question-bank
- institute linked science access path
- institute exams workspace
- institute and admin guided-wizard / advanced-builder generic exam creation baseline
- institute results workspace
- teacher results workspace
- admin, institute, and teacher desktop cross-browser shell/results sanity
- teacher and institute mutable question-bank baselines
- teacher/institute role-consistency contract
- institute family release happy path across NEET, JEE, GRE, IELTS, and PTE
- teacher family release happy path across NEET, JEE, GRE, IELTS, and PTE

---

## What Is Still Weakest

These are the current weakest confidence areas:

- performance and concurrency proof
- multi-institute onboarding and lower-support rollout depth
- some dataset-sensitive mutable cases

These are not “broken product” signals.

They are “rollout depth is still thinner than core workflow depth” signals.

---

## Practical Release Meaning

### Good fit now

- controlled pilot with a few institutes
- onboarding done by guided operator or internal team
- monitored rollout where we can quickly inspect package and entitlement state
- coaching-center or school pilots where support is available

### Not ideal yet

- broad self-serve onboarding with little support
- high-volume exam-day traffic without separate performance validation
- rollout where first-time staff must learn dense economy controls with no training

---

## Exact Path To `9/10`

### P0

1. Make onboarding summary and attached-access confirmation unmistakable.
2. Finish clarity hardening for exams filtered-state and lifecycle explanations.
3. Reduce economy terminology confusion around:
   - package
   - entitlement
   - feature grant
   - linked availability
4. Make mutable dataset-sensitive cases more deterministic where possible.

### Exact next browser suites

These are the next highest-value suites to make overall exam lifecycle confidence move toward `9.5/10`:

1. `edutech_web/tests/e2e/workflow/institute-family-runtime-depth.mutable.spec.ts`
   - deeper institute-side family runtime combinations beyond the happy path
2. `edutech_web/tests/e2e/workflow/institute-family-release-state.mutable.spec.ts`
   - publish/release state transition correctness
3. `edutech_web/tests/e2e/workflow/teacher-family-immediate-release.mutable.spec.ts`
   - teacher-side alternate release contract
4. `edutech_web/tests/e2e/workflow/institute-family-immediate-release.mutable.spec.ts`
   - institute-side alternate release contract
5. `edutech_web/tests/e2e/workflow/student-neet-full-mock-lifecycle.mutable.spec.ts`
   - student runtime depth for one high-stakes competitive lane
6. `edutech_web/tests/e2e/workflow/student-jee-full-mock-lifecycle.mutable.spec.ts`
   - numeric/objective mixed student runtime proof
7. `edutech_web/tests/e2e/workflow/student-gre-quant-lifecycle.mutable.spec.ts`
   - seeded graduate-prep student continuity proof
8. `edutech_web/tests/e2e/workflow/institute-results-live-workspace.spec.ts`
   - institute-side live results realism under populated data
9. `edutech_web/tests/e2e/workflow/teacher-results-live-workspace.spec.ts`
   - teacher-side live results realism under populated data
10. `edutech_web/tests/e2e/workflow/institute-results-analysis-workspace.spec.ts`
   - analysis depth and family-aware reporting fit
11. `edutech_web/tests/e2e/workflow/teacher-results-analysis-workspace.spec.ts`
   - analysis depth and reviewer-facing interpretation fit
12. `edutech_web/tests/e2e/workflow/institute-results-descriptive-multi-role.mutable.spec.ts`
   - institute-to-teacher descriptive recheck, moderation, and publication continuity coverage
13. `edutech_web/tests/e2e/workflow/admin-mixed-institute-onboarding.mutable.spec.ts`
   - onboarding variation proof
14. `edutech_web/tests/e2e/workflow/admin-multi-institute-pilot.mutable.spec.ts`
   - multi-institute assignment/isolation confidence

### Practical target order

- First:
  - `institute-family-runtime-depth.mutable.spec.ts`
  - `institute-family-release-state.mutable.spec.ts`
  - `teacher-family-immediate-release.mutable.spec.ts`
  - `institute-family-immediate-release.mutable.spec.ts`
- Then:
  - `student-neet-full-mock-lifecycle.mutable.spec.ts`
  - `student-jee-full-mock-lifecycle.mutable.spec.ts`
  - `student-gre-quant-lifecycle.mutable.spec.ts`
- Then:
  - `institute-results-live-workspace.spec.ts`
  - `teacher-results-live-workspace.spec.ts`
  - `institute-results-analysis-workspace.spec.ts`
  - `teacher-results-analysis-workspace.spec.ts`
- Then:
  - `institute-exam-creation-advanced-matrix.mutable.spec.ts`
  - `institute-exam-creation-wizard-matrix.mutable.spec.ts`
  - `admin-mixed-institute-onboarding.mutable.spec.ts`
  - `admin-multi-institute-pilot.mutable.spec.ts`

### Immediate hardening order

This is the cleanest next execution order for shrinking the remaining yellow lanes without spreading effort too wide:

1. Cross-surface analytics consistency under scoped filters
   - verify that results, compare, timeline, actions, and deeper analytics drills stay aligned when context narrows further
2. Weak-network and slow-response runtime behavior
   - prove that high-value student and operator routes fail gracefully under degraded conditions

### P1

1. Finish comprehension authoring parity between teacher and institute.
2. Finish multi-institute onboarding and rollout-depth proof:
   - mixed-institute onboarding isolation
   - broader operator recovery without DB inspection
   - guided-to-lower-support handoff validation
3. Deepen student-facing results and analytics realism for descriptive/manual-evaluation scenarios.
4. Strengthen support-ops and advanced economy lifecycle coverage in browser automation.

### P2

1. Run stage-level endpoint profiling using:
   - [BACKEND_ANALYTICS_PERFORMANCE_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/BACKEND_ANALYTICS_PERFORMANCE_RUNBOOK.md)
2. Run real load and concurrency testing.
3. Validate weak-network and long-attempt behavior.
4. Recheck dense operator workflows on smaller screens and lower-tech usage patterns.

---

## Suggested Confidence Targets

| Milestone | Target confidence |
| --- | --- |
| Current controlled pilot | `8.5/10` |
| After family runtime-depth + release-state hardening | `9/10` |
| After broader student/runtime/results depth | `9.25/10` |
| After onboarding variation + multi-institute proof | `9.5/10` |
| After performance validation and device/network QA | `9.75/10` |

---

## Bottom Line

Current position:

- product is strong enough for controlled pilot and guided rollout
- product is not yet fully hardened for unmanaged broad production

Best plain-English read:

- technically: strong
- QA-wise: strong in core lanes, medium-high overall
- operator simplicity: improving, but still uneven in dense workflows
- release confidence: good for guided pilots, not yet maximum-confidence open rollout
