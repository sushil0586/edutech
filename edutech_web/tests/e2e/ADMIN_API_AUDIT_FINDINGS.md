# Admin API Audit Findings

## Purpose

This document summarizes the current admin-route API audit coverage added through Playwright.

It focuses on:

- whether a route performs browser-visible API calls during load or interaction
- whether those calls are duplicated or unnecessary
- which query params or route params are expected to stay stable
- where the real performance risk still sits for each page

## Scope Covered

- `/admin`
- `/admin/institutes`
- `/admin/people`
- `/admin/academic-setup`
- `/admin/economy?tab=support-ops`
- `/admin/exams`
- `/admin/search`
- `/admin/reports`
- `/admin/settings`

## Current Findings Matrix

| Route | Browser-visible API behavior | Duplicate calls seen | Current measured timings | Expected server-side contract | Main performance risk |
| --- | --- | --- | --- | --- | --- |
| `/admin` | No browser-side API traffic on load, filter changes, quick filters, or reports handoff | None | open `143ms`, apply filters `531ms`, quick filter `546ms`, handoff `559ms` | 10 count endpoints: institutes, academic-years, programs, cohorts, subjects, topics, students, teachers, exams, results | High server fan-out from count-only dashboard composition |
| `/admin/institutes` | No client fetch on first load, one client fetch on changing institute, none on reselect or cached switch-back | None | open `711ms`, switch selected `686ms`, cached switch-back `378ms` | list institutes, onboarding profiles, selected institute detail, onboarding runs, student count, teacher count, exam count | Selected-institute server fan-out plus client workspace fetch on scope change |
| `/admin/people` | No client fetch on first load, one `/api/admin/people/workspace` per explicit scope/view change | None | open `658ms`, open scoped students `780ms`, teachers `689ms`, students return `684ms` | institutes list, student academic lookups, scoped roster list, scoped count | Student view loads multiple academic lookup lists even before deeper actions |
| `/admin/academic-setup` | Browser stays quiet across section changes; navigation is URL/server-driven | None | open `992ms`, open scope `598ms`, programs `565ms`, topics `854ms`, exam defaults `532ms` | section-dependent academic entity loads plus counts, institute detail, optional onboarding run detail | Heavy section fan-out, especially topic/exam-default sections and duplicate count/list style fetches |
| `/admin/economy?tab=support-ops` | No client fetch on first load; default student switch now loads only wallet; refresh-unlocks now issues only its POST | None | open `282ms`, student switch `850ms`, refresh unlocks `1044ms` | support-ops server load includes subscription requests, student list, student count, institutes, initial policy, and initial student support data | The remaining live cost is lane-driven and on-demand rather than always-on fan-out |
| `/admin/exams` | Browser stays quiet across filter submit, quick filters, scope change, and reset | None | open `895ms`, open institute scope `506ms`, apply filters `508ms`, source quick filter `546ms`, reset `843ms` | institutes list plus exam list, optionally scoped by institute | Large exam list fetch and repeated server render on every filter transition |
| `/admin/search` | Browser stays quiet across query/filter transitions | None | open `149ms`, apply filters `533ms`, workspace-pages quick filter `511ms`, group source `544ms`, reset `566ms` | live query fan-out to institutes, exams, students, teachers with `page_size=50` | Search always fans out across four live sources for non-empty queries |
| `/admin/reports` | Browser stays quiet across filters and quick filters | None | open `298ms`, apply filters `588ms`, quick filter `500ms`, reset `600ms` | teacher insight summary, teacher result summary, teacher exam page live count, teacher exam page completed count | Report page depends on several summary endpoints that may become expensive with live data growth |
| `/admin/settings` | Browser stays quiet on load and direct handoffs | None | open `373ms`, handoff people `536ms`, handoff academics `512ms` | institutes, economy policy config, policy audit, student count, teacher count, academic-year count, subject count | Mostly count/config fan-out; lower interaction risk, moderate server aggregation risk |

## What We Know Now

- The audited admin shell is mostly server-rendered. For most top-level routes, the browser is not making extra hidden API calls during filter changes.
- `/admin/economy?tab=support-ops` is no longer paying browser-side hydration fetches on first load, now loads only wallet on a default student switch, and refresh-unlocks no longer reloads wallet, rewards, or orders after the POST.
- `/admin/institutes` and `/admin/people` use intentional client refresh endpoints. Those behaved cleanly in audit runs with no duplicate calls.
- The top server-side fan-out risks are currently:
  - `/admin`
  - `/admin/academic-setup`
  - `/admin/economy`
  - `/admin/search`

## Priority Optimization Candidates

1. `/admin/economy?tab=support-ops`
   Current evidence: first-load hydration waste is removed, student switching is lane-aware by default, and refresh-unlocks is POST-only.
   Remaining likely wins: keep summary cards from implying unloaded data, or prefetch secondary lanes only after the operator explicitly opens them.

2. `/admin/academic-setup`
   Current evidence: section-driven server fan-out, especially for `topics` and `exam-defaults`.
   Likely wins: reduce duplicate count/list queries, load only section-specific dependencies, avoid shared counts when not shown.

3. `/admin`
   Current evidence: 10 separate count calls to render a summary-only dashboard.
   Likely wins: aggregate counts into one summary endpoint or cache them together.

4. `/admin/search`
   Current evidence: every non-empty query fans out to four live sources.
   Likely wins: add query thresholding, parallel result caps, or unified live-search backend endpoint.

## Commands

Run the full admin API audit suite with:

```bash
npm run test:e2e:admin-api-audit
```

Run a single route audit with:

```bash
npx playwright test tests/e2e/workflow/admin-economy-api-audit.spec.ts --project=chromium
```

## Related Specs

- `tests/e2e/workflow/admin-dashboard-api-audit.spec.ts`
- `tests/e2e/workflow/admin-institutes-api-audit.spec.ts`
- `tests/e2e/workflow/admin-people-api-audit.spec.ts`
- `tests/e2e/workflow/admin-academic-setup-api-audit.spec.ts`
- `tests/e2e/workflow/admin-economy-api-audit.spec.ts`
- `tests/e2e/workflow/admin-exams-api-audit.spec.ts`
- `tests/e2e/workflow/admin-search-api-audit.spec.ts`
- `tests/e2e/workflow/admin-reports-api-audit.spec.ts`
- `tests/e2e/workflow/admin-settings-api-audit.spec.ts`
