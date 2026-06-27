# Playwright Page Action Coverage Map

## Purpose

This document answers a narrower question than the role coverage map:

- which pages are covered
- which visible buttons, links, filters, and actions are validated
- which spec currently owns that verification

Use this when you want to know whether a specific CTA or page interaction is already automated.

## Legend

- `Baseline`: runs in the standard suite
- `Mutable`: runs only in real-data mutable mode
- `Partial`: page is covered, but not every action on the page is automated yet

## Anonymous and auth pages

### `/login`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| redirect from institute protected route lands on login | Covered | Baseline | `tests/e2e/role-scope/access-control.spec.ts` |
| redirect from teacher protected route lands on login | Covered | Baseline | `tests/e2e/role-scope/access-control.spec.ts` |
| redirect from student protected route lands on login | Covered | Baseline | `tests/e2e/role-scope/access-control.spec.ts` |

### `/register/student`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| student registration submits into complete-profile flow | Covered | Baseline | `tests/e2e/smoke/registration.spec.ts` |

### `/register/teacher`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| teacher registration submits into complete-profile flow | Covered | Baseline | `tests/e2e/smoke/registration.spec.ts` |

## Platform admin pages

### `/admin`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| dashboard route opens | Covered | Baseline | `tests/e2e/workflow/admin-dashboard-workspace.spec.ts` |
| dashboard route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/admin-cross-browser-shell.spec.ts` |
| focus lane filter | Covered | Baseline | `tests/e2e/workflow/admin-dashboard-workspace.spec.ts` |
| sort by filter | Covered | Baseline | `tests/e2e/workflow/admin-dashboard-workspace.spec.ts` |
| apply filters | Covered | Baseline | `tests/e2e/workflow/admin-dashboard-workspace.spec.ts` |
| academics quick filter | Covered | Baseline | `tests/e2e/workflow/admin-dashboard-workspace.spec.ts` |
| priority lane handoff to academic setup | Covered | Baseline | `tests/e2e/workflow/admin-dashboard-workspace.spec.ts` |
| quick action handoff to reports | Covered | Baseline | `tests/e2e/workflow/admin-dashboard-workspace.spec.ts` |
| priority lane handoff to institutes | Covered | Baseline | `tests/e2e/workflow/admin-dashboard-workspace.spec.ts` |
| quick action handoff to people | Covered | Baseline | `tests/e2e/workflow/admin-dashboard-workspace.spec.ts` |

### `/admin/dashboard`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| legacy dashboard alias redirects to `/admin` | Covered | Baseline | `tests/e2e/workflow/admin-dashboard-redirect.spec.ts` |

### `/admin/search`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| search route opens | Covered | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |
| search route remains reachable in the cross-browser deep-route lane | Covered | Baseline | `tests/e2e/workflow/admin-cross-browser-deep-routes.spec.ts` |
| query seed is retained in controls | Covered | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |
| source filter | Covered | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |
| sort by filter | Covered | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |
| group by filter | Covered | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |
| apply filters | Covered | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |
| live records quick filter | Covered | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |
| workspace pages quick filter | Covered | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |
| group by section quick filter | Covered | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |
| grouped source layout shows live records and workspace pages for exam query | Covered | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |
| grouped source layout includes catalog quick-create exam result | Covered | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |
| grouped source layout includes live admin exam detail result | Covered | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |
| live institute query returns institute-section result and institute detail link | Covered | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |
| live people query returns student-or-teacher section result and people view link | Covered | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |
| open first search result handoff | Covered | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |
| zero-result empty state for unmatched query | Covered | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |
| reset filters | Covered | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |
| back to workspace handoff | Covered | Baseline | `tests/e2e/workflow/admin-search-workspace.spec.ts` |

### `/admin/settings`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| settings route opens | Covered | Baseline | `tests/e2e/workflow/admin-settings-workspace.spec.ts` |
| settings route remains reachable in the cross-browser deep-route lane | Covered | Baseline | `tests/e2e/workflow/admin-cross-browser-deep-routes.spec.ts` |
| governance summary cards visible | Covered | Baseline | `tests/e2e/workflow/admin-settings-workspace.spec.ts` |
| current live control lanes panel visible | Covered | Baseline | `tests/e2e/workflow/admin-settings-workspace.spec.ts` |
| backend-first layers panel visible | Covered | Baseline | `tests/e2e/workflow/admin-settings-workspace.spec.ts` |
| current institute footprint panel visible | Covered | Baseline | `tests/e2e/workflow/admin-settings-workspace.spec.ts` |
| open people hero handoff | Covered | Baseline | `tests/e2e/workflow/admin-settings-workspace.spec.ts` |
| open academic setup hero handoff | Covered | Baseline | `tests/e2e/workflow/admin-settings-workspace.spec.ts` |
| manage people handoff | Covered | Baseline | `tests/e2e/workflow/admin-settings-workspace.spec.ts` |
| manage academics handoff | Covered | Baseline | `tests/e2e/workflow/admin-settings-workspace.spec.ts` |

### `/admin/institutes`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| institutes route opens | Covered | Baseline | `tests/e2e/workflow/admin-institutes-workspace.spec.ts` |
| institutes route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/admin-cross-browser-shell.spec.ts` |
| search institutes directory | Covered | Baseline | `tests/e2e/workflow/admin-institutes-workspace.spec.ts` |
| active-only filter | Covered | Baseline | `tests/e2e/workflow/admin-institutes-workspace.spec.ts` |
| inspect selected institute detail panel | Covered | Baseline | `tests/e2e/workflow/admin-institutes-workspace.spec.ts` |
| inspect institute admin credential controls | Covered | Baseline | `tests/e2e/workflow/admin-institutes-workspace.spec.ts` |
| institute account action branch consistency (create login vs reset/enable/disable) | Covered | Baseline | `tests/e2e/workflow/admin-institutes-workspace.spec.ts` |
| reset password dialog validation for missing manual password | Covered | Baseline | `tests/e2e/workflow/admin-institutes-workspace.spec.ts` |
| open add institute modal | Covered | Baseline | `tests/e2e/workflow/admin-institutes-workspace.spec.ts` |
| add institute dialog empty-submit validation | Covered | Baseline | `tests/e2e/workflow/admin-institutes-workspace.spec.ts` |
| open edit selected institute modal | Covered | Baseline | `tests/e2e/workflow/admin-institutes-workspace.spec.ts` |
| edit institute dialog empty-submit validation | Covered | Baseline | `tests/e2e/workflow/admin-institutes-workspace.spec.ts` |
| row view action updates scoped institute route | Covered | Baseline | `tests/e2e/workflow/admin-institutes-workspace.spec.ts` |
| open academic setup hero handoff | Covered | Baseline | `tests/e2e/workflow/admin-institutes-workspace.spec.ts` |
| open settings hero handoff | Covered | Baseline | `tests/e2e/workflow/admin-institutes-workspace.spec.ts` |
| create disposable institute | Covered | Mutable | `tests/e2e/workflow/admin-institutes-mutable.spec.ts` |
| edit disposable institute | Covered | Mutable | `tests/e2e/workflow/admin-institutes-mutable.spec.ts` |
| create institute login on disposable institute | Covered | Mutable | `tests/e2e/workflow/admin-institutes-mutable.spec.ts` |
| reset disposable institute login password | Covered | Mutable | `tests/e2e/workflow/admin-institutes-mutable.spec.ts` |
| disable disposable institute login | Covered | Mutable | `tests/e2e/workflow/admin-institutes-mutable.spec.ts` |
| re-enable disposable institute login | Covered | Mutable | `tests/e2e/workflow/admin-institutes-mutable.spec.ts` |
| delete disposable institute through admin proxy cleanup | Covered | Mutable | `tests/e2e/workflow/admin-institutes-mutable.spec.ts` |

### `/admin/reports`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| reports route opens | Covered | Baseline | `tests/e2e/workflow/admin-reports-workspace.spec.ts` |
| reports route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/admin-cross-browser-shell.spec.ts` |
| focus lane filter | Covered | Baseline | `tests/e2e/workflow/admin-reports-workspace.spec.ts` |
| subject filter | Covered | Baseline | `tests/e2e/workflow/admin-reports-workspace.spec.ts` |
| sort by filter | Covered | Baseline | `tests/e2e/workflow/admin-reports-workspace.spec.ts` |
| reset filters | Covered | Baseline | `tests/e2e/workflow/admin-reports-workspace.spec.ts` |
| pending publication quick filter | Covered | Baseline | `tests/e2e/workflow/admin-reports-workspace.spec.ts` |
| lowest mastery quick filter | Covered | Baseline | `tests/e2e/workflow/admin-reports-workspace.spec.ts` |
| top performers quick filter | Covered | Baseline | `tests/e2e/workflow/admin-reports-workspace.spec.ts` |
| most attempts quick filter | Covered | Baseline | `tests/e2e/workflow/admin-reports-workspace.spec.ts` |
| open security hero handoff | Covered | Baseline | `tests/e2e/workflow/admin-reports-workspace.spec.ts` |
| open economy hero handoff | Covered | Baseline | `tests/e2e/workflow/admin-reports-workspace.spec.ts` |
| publication backlog panel visible | Covered | Baseline | `tests/e2e/workflow/admin-reports-workspace.spec.ts` |
| exam performance panel visible | Covered | Baseline | `tests/e2e/workflow/admin-reports-workspace.spec.ts` |
| weak topics panel visible | Covered | Baseline | `tests/e2e/workflow/admin-reports-workspace.spec.ts` |
| student distribution panel visible | Covered | Baseline | `tests/e2e/workflow/admin-reports-workspace.spec.ts` |

### `/admin/security`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| security route opens | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| search security workspace | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| exam filter | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| exam sort | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| attempt filter | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| attempt sort | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| group attempts | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| exam page size filter | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| attempt page size filter | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| apply filters | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| filter summary pills reflect live/watch/health selection | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| critical attempts quick filter | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| most alerts quick filter | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| group by health quick filter | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| watch selected exam | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| selected exam enters watching state after exam handoff | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| selected exam posture and watchlist panels | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| live monitor summary metrics visible | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| grouped attempt health heading matches visible watchlist attempt group | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| grouped attempt status heading matches visible watchlist attempt group | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| open dashboard hero handoff | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| open settings hero handoff | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| reset filters | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |
| reset filters restore summary pill defaults | Covered | Baseline | `tests/e2e/workflow/admin-security-workspace.spec.ts` |

### `/admin/economy`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| economy route opens | Covered | Baseline | `tests/e2e/workflow/admin-economy-workspace.spec.ts` |
| economy seed overview cards visible | Covered | Baseline | `tests/e2e/workflow/admin-economy-workspace.spec.ts` |
| economy scenario planning sections visible | Covered | Baseline | `tests/e2e/workflow/admin-economy-workspace.spec.ts` |
| student support actions workspace visible | Covered | Baseline | `tests/e2e/workflow/admin-economy-workspace.spec.ts` |
| stars grant amount field editable | Covered | Baseline | `tests/e2e/workflow/admin-economy-workspace.spec.ts` |
| grant stars local validation for missing reason | Covered | Baseline | `tests/e2e/workflow/admin-economy-workspace.spec.ts` |
| refresh unlocks action | Covered | Baseline | `tests/e2e/workflow/admin-economy-workspace.spec.ts` |
| grant stars success path with wallet growth assertion | Covered | Mutable | `tests/e2e/workflow/admin-economy-mutable.spec.ts` |
| live wallet state panel visible | Covered | Baseline | `tests/e2e/workflow/admin-economy-workspace.spec.ts` |
| reward timeline panel visible | Covered | Baseline | `tests/e2e/workflow/admin-economy-workspace.spec.ts` |
| unlock refresh output panel visible | Covered | Baseline | `tests/e2e/workflow/admin-economy-workspace.spec.ts` |
| open institutes hero handoff | Covered | Baseline | `tests/e2e/workflow/admin-economy-workspace.spec.ts` |
| open settings hero handoff | Covered | Baseline | `tests/e2e/workflow/admin-economy-workspace.spec.ts` |

### `/admin/exams`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| exams route opens | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| exams route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/admin-cross-browser-shell.spec.ts` |
| quick create handoff visible | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| advanced builder handoff visible | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| preset library handoff visible | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| status filter | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| source filter | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| institute scope filter updates URL and summary pill | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| institute scope filter yields either scoped exam cards or scoped empty state | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| sort by filter | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| group by filter | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| apply filters | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| platform quick filter | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| live quick filter | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| group by source quick filter | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| zero-match filter state | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| reset exam filters | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| reset state summary pills return to all/all | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| real first-card status and source can be reapplied as filters | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| grouped status layout matches filtered first-card status | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| grouped source layout matches filtered first-card source | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| grouped subject layout matches filtered first-card subject when subject exists | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| grouped type layout matches filtered first-card type when type exists | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| title sort orders visible exam cards alphabetically | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| open exam detail | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| open exam builder | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| open preset library handoff | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| open academic setup hero handoff | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| quick create handoff to create exam page | Covered | Baseline | `tests/e2e/workflow/admin-exams-workspace.spec.ts` |
| advanced-created platform draft exam is visible after institute, status, and source filtering | Covered | Mutable | `tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts` |

### `/admin/exams/advanced`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| advanced builder route opens | Covered | Baseline | `tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts` |
| advanced builder route remains reachable in the cross-browser deep-route lane | Covered | Baseline | `tests/e2e/workflow/admin-cross-browser-deep-routes.spec.ts` |
| preset library handoff visible | Covered | Baseline | `tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts` |
| basics stage visible | Covered | Baseline | `tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts` |
| composition stage visible | Covered | Baseline | `tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts` |
| delivery stage visible | Covered | Baseline | `tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts` |
| access stage visible | Covered | Baseline | `tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts` |
| stage switching across advanced builder rail | Covered | Baseline | `tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts` |
| basics scope selectors visible | Covered | Baseline | `tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts` |
| auto fill basics action | Covered | Baseline | `tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts` |
| exam title auto-filled | Covered | Baseline | `tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts` |
| composition selection mode visible | Covered | Baseline | `tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts` |
| add section local composition action | Covered | Baseline | `tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts` |
| add topic action visible after section expansion | Covered | Baseline | `tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts` |
| managed preset pack controls visible | Covered | Baseline | `tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts` |
| template save controls visible | Covered | Baseline | `tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts` |
| seeded NEET advanced-builder family guidance and summary recommendation surface correctly | Covered | Baseline | `tests/e2e/workflow/family-advanced-builder-guidance.spec.ts` |
| seeded JEE advanced-builder family guidance and summary recommendation surface correctly | Covered | Baseline | `tests/e2e/workflow/family-advanced-builder-guidance.spec.ts` |
| seeded GRE advanced-builder family guidance and summary recommendation surface correctly | Covered | Baseline | `tests/e2e/workflow/family-advanced-builder-guidance.spec.ts` |
| seeded AWS advanced-builder family guidance and summary recommendation surface correctly | Covered | Baseline | `tests/e2e/workflow/family-advanced-builder-guidance.spec.ts` |
| coherent institute-scoped academic defaults load after template institute selection | Covered | Mutable | `tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts` |
| apply quick-practice template as the advanced-builder seed | Covered | Mutable | `tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts` |
| preview a disposable platform-source advanced-builder exam blueprint | Covered | Mutable | `tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts` |
| create disposable platform-source `practice` exam from advanced builder | Covered | Mutable | `tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts` |
| create disposable platform-source `quiz` exam from advanced builder | Covered | Mutable | `tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts` |
| create disposable platform-source `mock_exam` exam from advanced builder | Covered | Mutable | `tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts` |
| select template institute scope | Covered | Mutable | `tests/e2e/workflow/admin-advanced-builder-templates-mutable.spec.ts` |
| save advanced builder template | Covered | Mutable | `tests/e2e/workflow/admin-advanced-builder-templates-mutable.spec.ts` |
| export selected template JSON bundle | Covered | Mutable | `tests/e2e/workflow/admin-advanced-builder-templates-mutable.spec.ts` |
| import advanced builder template JSON bundle | Covered | Mutable | `tests/e2e/workflow/admin-advanced-builder-templates-mutable.spec.ts` |

### `/admin/exams/preset-packs`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| preset pack library route opens | Covered | Baseline | `tests/e2e/workflow/admin-preset-pack-library.spec.ts` |
| preset pack search field | Covered | Baseline | `tests/e2e/workflow/admin-preset-pack-library.spec.ts` |
| starter scope filter | Covered | Baseline | `tests/e2e/workflow/admin-preset-pack-library.spec.ts` |
| managed scope filter | Covered | Baseline | `tests/e2e/workflow/admin-preset-pack-library.spec.ts` |
| all packs scope reset | Covered | Baseline | `tests/e2e/workflow/admin-preset-pack-library.spec.ts` |
| open in builder deep link | Covered | Baseline | `tests/e2e/workflow/admin-preset-pack-library.spec.ts` |
| back to exams handoff | Covered | Baseline | `tests/e2e/workflow/admin-preset-pack-library.spec.ts` |
| open advanced builder handoff | Covered | Baseline | `tests/e2e/workflow/admin-preset-pack-library.spec.ts` |
| create disposable managed pack from advanced builder for library validation | Covered | Mutable | `tests/e2e/workflow/admin-preset-pack-library-mutable.spec.ts` |
| platform scope filter | Covered | Mutable | `tests/e2e/workflow/admin-preset-pack-library-mutable.spec.ts` |
| edit preset pack metadata | Covered | Mutable | `tests/e2e/workflow/admin-preset-pack-library-mutable.spec.ts` |
| archive preset pack | Covered | Mutable | `tests/e2e/workflow/admin-preset-pack-library-mutable.spec.ts` |

### `/admin/exams/new`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| create exam route opens | Covered | Baseline | `tests/e2e/workflow/admin-exams-create-workspace.spec.ts` |
| institute scope lane chooser visible | Covered | Baseline | `tests/e2e/workflow/admin-exams-create-workspace.spec.ts` |
| switch institute scope chip | Covered | Baseline | `tests/e2e/workflow/admin-exams-create-workspace.spec.ts` |
| wizard step tabs visible | Covered | Baseline | `tests/e2e/workflow/admin-exams-create-workspace.spec.ts` |
| scope and identity controls visible | Covered | Baseline | `tests/e2e/workflow/admin-exams-create-workspace.spec.ts` |
| scope and identity required-field gating before wizard advance | Covered | Baseline | `tests/e2e/workflow/admin-exams-create-workspace.spec.ts` |
| source and economy access controls editable | Covered | Baseline | `tests/e2e/workflow/admin-exams-create-workspace.spec.ts` |
| seeded NEET family guidance and execution checklist surface in wizard | Covered | Baseline | `tests/e2e/workflow/admin-family-guided-create-defaults.spec.ts` |
| seeded NEET family defaults prefill duration, runtime, and learner posture | Covered | Baseline | `tests/e2e/workflow/admin-family-guided-create-defaults.spec.ts` |
| seeded JEE family guidance and execution checklist surface in wizard | Covered | Baseline | `tests/e2e/workflow/admin-family-guided-create-defaults.spec.ts` |
| seeded JEE family defaults prefill duration, runtime, and learner posture | Covered | Baseline | `tests/e2e/workflow/admin-family-guided-create-defaults.spec.ts` |
| seeded GRE family guidance and execution checklist surface in wizard | Covered | Baseline | `tests/e2e/workflow/admin-family-guided-create-defaults.spec.ts` |
| seeded GRE family defaults prefill duration, runtime, and learner posture | Covered | Baseline | `tests/e2e/workflow/admin-family-guided-create-defaults.spec.ts` |
| seeded AWS family guidance and execution checklist surface in wizard | Covered | Baseline | `tests/e2e/workflow/admin-family-guided-create-defaults.spec.ts` |
| seeded AWS family defaults prefill duration, runtime, and learner posture | Covered | Baseline | `tests/e2e/workflow/admin-family-guided-create-defaults.spec.ts` |
| continue to schedule and delivery step | Covered | Baseline | `tests/e2e/workflow/admin-exams-create-workspace.spec.ts` |
| continue to runtime rules step | Covered | Baseline | `tests/e2e/workflow/admin-exams-create-workspace.spec.ts` |
| continue to learner experience step | Covered | Baseline | `tests/e2e/workflow/admin-exams-create-workspace.spec.ts` |
| final create exam shell submit state visible | Covered | Baseline | `tests/e2e/workflow/admin-exams-create-workspace.spec.ts` |
| back navigation inside wizard | Covered | Baseline | `tests/e2e/workflow/admin-exams-create-workspace.spec.ts` |
| create `platform` source `practice` exam shell from guided wizard | Covered | Mutable | `tests/e2e/workflow/admin-exam-creation-wizard-matrix.mutable.spec.ts` |
| create `platform` source `quiz` exam shell from guided wizard | Covered | Mutable | `tests/e2e/workflow/admin-exam-creation-wizard-matrix.mutable.spec.ts` |
| create `platform` source `mock_exam` exam shell from guided wizard | Covered | Mutable | `tests/e2e/workflow/admin-exam-creation-wizard-matrix.mutable.spec.ts` |
| persist JEE guided-family defaults into saved admin exam metadata | Covered | Mutable | `tests/e2e/workflow/admin-family-guided-persistence.mutable.spec.ts` |
| persist GRE guided-family defaults into saved admin exam metadata | Covered | Mutable | `tests/e2e/workflow/admin-family-guided-persistence.mutable.spec.ts` |
| guided wizard handoff to created admin exam detail | Covered | Mutable | `tests/e2e/workflow/admin-exam-creation-wizard-matrix.mutable.spec.ts` |

### `/admin/exams/:id`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| exam detail route opens | Covered | Baseline | `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts` |
| exam build panel visible | Covered | Baseline | `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts` |
| exam actions panel visible | Covered | Baseline | `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts` |
| exam configuration panel visible | Covered | Baseline | `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts` |
| student access policy form visible | Covered | Baseline | `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts` |
| refresh status action visible | Covered | Baseline | `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts` |
| sync marks action visible | Covered | Baseline | `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts` |
| key-entry toggle action visible | Covered | Baseline | `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts` |
| regenerate key action visible | Covered | Baseline | `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts` |
| open builder handoff | Covered | Baseline | `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts` |
| link questions handoff visible | Covered | Baseline | `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts` |
| open link questions handoff | Covered | Baseline | `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts` |
| advanced builder handoff visible | Covered | Baseline | `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts` |
| open advanced builder handoff | Covered | Baseline | `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts` |
| open reports hero handoff | Covered | Baseline | `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts` |
| assigned students panel visible | Covered | Baseline | `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts` |
| publish history panel visible | Covered | Baseline | `tests/e2e/workflow/admin-exam-detail-workspace.spec.ts` |
| create disposable admin exam shell and open detail | Covered | Mutable | `tests/e2e/workflow/admin-exam-detail-mutable.spec.ts` |
| open builder from detail | Covered | Mutable | `tests/e2e/workflow/admin-exam-detail-mutable.spec.ts` |
| open linked questions from detail | Covered | Mutable | `tests/e2e/workflow/admin-exam-detail-mutable.spec.ts` |
| refresh exam status | Covered | Mutable | `tests/e2e/workflow/admin-exam-detail-mutable.spec.ts` |
| sync marks | Covered | Mutable | `tests/e2e/workflow/admin-exam-detail-mutable.spec.ts` |
| toggle access key entry | Covered | Mutable | `tests/e2e/workflow/admin-exam-detail-mutable.spec.ts` |
| regenerate access key | Covered | Mutable | `tests/e2e/workflow/admin-exam-detail-mutable.spec.ts` |
| save exam access policy | Covered | Mutable | `tests/e2e/workflow/admin-exam-detail-mutable.spec.ts` |
| return to exams from detail | Covered | Mutable | `tests/e2e/workflow/admin-exam-detail-mutable.spec.ts` |
| selected-student assignment is reflected on a disposable admin guided-create or advanced-created platform exam | Covered | Mutable | `tests/e2e/workflow/admin-exam-creation-wizard-matrix.mutable.spec.ts`, `tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts`, `tests/e2e/workflow/admin-exam-creation-advanced-student-attempt.mutable.spec.ts` |
| publish or mark live a disposable advanced-created platform mock exam for learner handoff | Covered | Mutable | `tests/e2e/workflow/admin-exam-creation-advanced-student-attempt.mutable.spec.ts` |

### `/admin/exams/:id/builder`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| exam builder route opens | Covered | Baseline | `tests/e2e/workflow/admin-exam-builder-workspace.spec.ts` |
| exam settings panel visible | Covered | Baseline | `tests/e2e/workflow/admin-exam-builder-workspace.spec.ts` |
| builder step rail links visible | Covered | Baseline | `tests/e2e/workflow/admin-exam-builder-workspace.spec.ts` |
| delivery view handoff | Covered | Baseline | `tests/e2e/workflow/admin-exam-builder-workspace.spec.ts` |
| review academic setup handoff | Covered | Baseline | `tests/e2e/workflow/admin-exam-builder-workspace.spec.ts` |
| link questions utility handoff | Covered | Baseline | `tests/e2e/workflow/admin-exam-builder-workspace.spec.ts` |
| schedule and delivery step link | Covered | Baseline | `tests/e2e/workflow/admin-exam-builder-workspace.spec.ts` |
| runtime rules step link | Covered | Baseline | `tests/e2e/workflow/admin-exam-builder-workspace.spec.ts` |
| linked questions step navigation | Covered | Baseline | `tests/e2e/workflow/admin-exam-builder-workspace.spec.ts` |
| student assignment workspace tab | Covered | Baseline | `tests/e2e/workflow/admin-exam-builder-workspace.spec.ts` |
| open delivery view handoff | Covered | Baseline | `tests/e2e/workflow/admin-exam-builder-workspace.spec.ts` |
| question mapping panel visible | Covered | Baseline | `tests/e2e/workflow/admin-exam-builder-workspace.spec.ts` |
| manual attach form visible | Covered | Baseline | `tests/e2e/workflow/admin-exam-builder-workspace.spec.ts` |
| rapid attach workspace visible | Covered | Baseline | `tests/e2e/workflow/admin-exam-builder-workspace.spec.ts` |
| create disposable admin exam shell and open builder | Covered | Mutable | `tests/e2e/workflow/admin-exam-builder-mutable.spec.ts` |
| save exam settings | Covered | Mutable | `tests/e2e/workflow/admin-exam-builder-mutable.spec.ts` |
| add section | Covered | Mutable | `tests/e2e/workflow/admin-exam-builder-mutable.spec.ts` |
| attach linked question manually | Covered | Mutable | `tests/e2e/workflow/admin-exam-builder-mutable.spec.ts` |
| update linked question marks | Covered | Mutable | `tests/e2e/workflow/admin-exam-builder-mutable.spec.ts` |
| remove linked question | Covered | Mutable | `tests/e2e/workflow/admin-exam-builder-mutable.spec.ts` |
| remove section | Covered | Mutable | `tests/e2e/workflow/admin-exam-builder-mutable.spec.ts` |
| save selected-student assignment on a disposable admin guided-create platform exam | Covered | Mutable | `tests/e2e/workflow/admin-exam-creation-wizard-matrix.mutable.spec.ts` |
| verify auto-resolved linked questions on a disposable advanced-created platform exam | Covered | Mutable | `tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts` |
| save selected-student assignment on a disposable advanced-created platform exam | Covered | Mutable | `tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts`, `tests/e2e/workflow/admin-exam-creation-advanced-student-attempt.mutable.spec.ts` |

### `/admin/academic-setup`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| academic setup route opens | Covered | Baseline | `tests/e2e/workflow/admin-academic-setup-workspace.spec.ts` |
| institute scope selector visible | Covered | Baseline | `tests/e2e/workflow/admin-academic-setup-workspace.spec.ts` |
| open selected institute scope | Covered | Baseline | `tests/e2e/workflow/admin-academic-setup-workspace.spec.ts` |
| programs section tab | Covered | Baseline | `tests/e2e/workflow/admin-academic-setup-workspace.spec.ts` |
| programs archived toggle | Covered | Baseline | `tests/e2e/workflow/admin-academic-setup-workspace.spec.ts` |
| open add programs dialog | Covered | Baseline | `tests/e2e/workflow/admin-academic-setup-workspace.spec.ts` |
| subjects section tab | Covered | Baseline | `tests/e2e/workflow/admin-academic-setup-workspace.spec.ts` |
| open add subjects dialog | Covered | Baseline | `tests/e2e/workflow/admin-academic-setup-workspace.spec.ts` |
| topics section tab | Covered | Baseline | `tests/e2e/workflow/admin-academic-setup-workspace.spec.ts` |
| open add topics dialog | Covered | Baseline | `tests/e2e/workflow/admin-academic-setup-workspace.spec.ts` |
| exam defaults section tab | Covered | Baseline | `tests/e2e/workflow/admin-academic-setup-workspace.spec.ts` |
| show archived control visible | Covered | Baseline | `tests/e2e/workflow/admin-academic-setup-workspace.spec.ts` |
| add record action visible | Covered | Baseline | `tests/e2e/workflow/admin-academic-setup-workspace.spec.ts` |
| create and edit academic year | Covered | Mutable | `tests/e2e/workflow/admin-academic-setup-mutable.spec.ts` |
| archive and restore academic year | Covered | Mutable | `tests/e2e/workflow/admin-academic-setup-mutable.spec.ts` |
| create program and cohort records | Covered | Mutable | `tests/e2e/workflow/admin-academic-setup-mutable.spec.ts` |
| create and archive/restore subject | Covered | Mutable | `tests/e2e/workflow/admin-academic-setup-mutable.spec.ts` |
| create and edit topic difficulty | Covered | Mutable | `tests/e2e/workflow/admin-academic-setup-mutable.spec.ts` |
| exam defaults policy fields visible | Covered | Baseline | `tests/e2e/workflow/admin-academic-setup-workspace.spec.ts` |
| save defaults action visible | Covered | Baseline | `tests/e2e/workflow/admin-academic-setup-workspace.spec.ts` |

### `/admin/people`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| people route opens | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| people route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/admin-cross-browser-shell.spec.ts` |
| student roster tab | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| teacher roster tab | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| institute scope selector | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| open selected institute scope | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| create student button visible | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| import students button visible | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| open create student dialog | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| create student dialog empty-submit validation | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| open import students dialog | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| import students preview action disabled before file selection | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| import students finalize action disabled before preview generation | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| import students invalid preview row handling | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| preview student roster CSV import | Covered | Mutable | `tests/e2e/workflow/admin-roster-import-mutable.spec.ts` |
| finalize student roster CSV import | Covered | Mutable | `tests/e2e/workflow/admin-roster-import-mutable.spec.ts` |
| search roster field | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| filter login status | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| sort by name | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| visible student row account-action branch consistency | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| export students roster CSV download | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| create disposable teacher record | Covered | Mutable | `tests/e2e/workflow/admin-roster-mutable.spec.ts` |
| edit disposable teacher profile | Covered | Mutable | `tests/e2e/workflow/admin-roster-mutable.spec.ts` |
| create teacher login | Covered | Mutable | `tests/e2e/workflow/admin-roster-mutable.spec.ts` |
| reset teacher password | Covered | Mutable | `tests/e2e/workflow/admin-roster-mutable.spec.ts` |
| disable teacher login | Covered | Mutable | `tests/e2e/workflow/admin-roster-mutable.spec.ts` |
| re-enable teacher login | Covered | Mutable | `tests/e2e/workflow/admin-roster-mutable.spec.ts` |
| create teacher button visible | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| import teachers button visible | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| open create teacher dialog | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| create teacher dialog empty-submit validation | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| open import teachers dialog | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| import teachers preview action disabled before file selection | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| import teachers finalize action disabled before preview generation | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| import teachers invalid preview row handling | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| visible teacher row account-action branch consistency | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| export teachers roster CSV download | Covered | Baseline | `tests/e2e/workflow/admin-people-workspace.spec.ts` |
| preview teacher roster CSV import | Covered | Mutable | `tests/e2e/workflow/admin-roster-import-mutable.spec.ts` |
| finalize teacher roster CSV import | Covered | Mutable | `tests/e2e/workflow/admin-roster-import-mutable.spec.ts` |
| create disposable student record | Covered | Mutable | `tests/e2e/workflow/admin-roster-mutable.spec.ts` |
| edit disposable student profile | Covered | Mutable | `tests/e2e/workflow/admin-roster-mutable.spec.ts` |
| create student login | Covered | Mutable | `tests/e2e/workflow/admin-roster-mutable.spec.ts` |

## Institute pages

### `/institute/dashboard`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| dashboard loads | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-dashboard-workspace.spec.ts` |
| dashboard route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/institute-cross-browser-shell.spec.ts` |
| focus filter select + apply | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-dashboard-workspace.spec.ts` |
| sort by filter | Covered | Baseline | `tests/e2e/workflow/institute-dashboard-workspace.spec.ts` |
| academics quick filter chip | Covered | Baseline | `tests/e2e/workflow/institute-dashboard-workspace.spec.ts` |
| people quick filter chip | Covered | Baseline | `tests/e2e/workflow/institute-dashboard-workspace.spec.ts` |
| all quick filter chip | Covered | Baseline | `tests/e2e/workflow/institute-dashboard-workspace.spec.ts` |
| reset filters link | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-dashboard-workspace.spec.ts` |
| open people | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-dashboard-workspace.spec.ts` |
| open academic setup | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-dashboard-workspace.spec.ts` |
| open exams | Covered | Baseline | `tests/e2e/workflow/institute-dashboard-workspace.spec.ts` |
| open reviews | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-dashboard-workspace.spec.ts` |

### `/institute/people`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| people route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/institute-cross-browser-shell.spec.ts` |
| student roster tab | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| teacher roster tab | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| search roster field visible | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| login-status filter visible | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| export CSV button visible | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| export students roster CSV download | Covered | Baseline | `tests/e2e/workflow/institute-people-export.spec.ts` |
| export teachers roster CSV download | Covered | Baseline | `tests/e2e/workflow/institute-people-export.spec.ts` |
| create student button visible | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| import students button visible | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| create teacher button visible | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| import teachers button visible | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| preview and finalize student roster CSV import | Covered | Mutable | `tests/e2e/workflow/institute-roster-import-mutable.spec.ts` |
| preview and finalize teacher roster CSV import | Covered | Mutable | `tests/e2e/workflow/institute-roster-import-mutable.spec.ts` |
| reset password button visible | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| disable login button visible | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| create disposable teacher | Covered | Mutable | `tests/e2e/workflow/institute-roster-mutable.spec.ts` |
| create disposable student | Covered | Mutable | `tests/e2e/workflow/institute-roster-mutable.spec.ts` |
| create teacher login | Covered | Mutable | `tests/e2e/workflow/institute-roster-mutable.spec.ts` |
| reset login credentials | Covered | Mutable | `tests/e2e/workflow/institute-roster-mutable.spec.ts` |
| disable login | Covered | Mutable | `tests/e2e/workflow/institute-roster-mutable.spec.ts` |
| re-enable login | Covered | Mutable | `tests/e2e/workflow/institute-roster-mutable.spec.ts` |

### `/institute/academic-setup`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| academic years section navigation | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| exam defaults section navigation | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| teacher assignments section navigation | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| create academic year | Covered | Mutable | `tests/e2e/workflow/institute-academic-setup-mutable.spec.ts` |
| edit academic year | Covered | Mutable | `tests/e2e/workflow/institute-academic-setup-mutable.spec.ts` |
| archive academic year | Covered | Mutable | `tests/e2e/workflow/institute-academic-setup-mutable.spec.ts` |
| restore academic year | Covered | Mutable | `tests/e2e/workflow/institute-academic-setup-mutable.spec.ts` |
| create program | Covered | Mutable | `tests/e2e/workflow/institute-academic-setup-mutable.spec.ts` |
| create cohort | Covered | Mutable | `tests/e2e/workflow/institute-academic-setup-mutable.spec.ts` |
| create subject | Covered | Mutable | `tests/e2e/workflow/institute-academic-setup-mutable.spec.ts` |
| archive and restore subject | Covered | Mutable | `tests/e2e/workflow/institute-academic-setup-mutable.spec.ts` |
| create topic | Covered | Mutable | `tests/e2e/workflow/institute-academic-setup-mutable.spec.ts` |
| edit topic | Covered | Mutable | `tests/e2e/workflow/institute-academic-setup-mutable.spec.ts` |

### `/institute/teacher-assignments`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| open add assignment dialog | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| create assignment validation errors | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| open edit assignment dialog | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| edit form prefilled state | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| create disposable assignment | Covered | Mutable | `tests/e2e/workflow/institute-teacher-assignments-mutable.spec.ts` |
| update assignment role and primary flag | Covered | Mutable | `tests/e2e/workflow/institute-teacher-assignments-mutable.spec.ts` |
| archive and restore assignment | Covered | Mutable | `tests/e2e/workflow/institute-teacher-assignments-mutable.spec.ts` |

### `/institute/exams`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| exam management page loads | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| exams route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/institute-cross-browser-shell.spec.ts` |
| quick create link visible | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| advanced builder link visible | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| preset library link visible | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| teacher filter | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| teacher-scoped filter yields cards or scoped empty state | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| status filter | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| sort by filter | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| group by filter | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| page size filter | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| apply filters | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| scheduled quick filter chip | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| highest marks quick filter chip | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| group by subject quick filter chip | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| all quick filter chip | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| grouped subject layout matches visible card subject when subject exists | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| grouped status layout matches visible card status | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| grouped type layout matches visible card type when type exists | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| title sort orders visible exam cards alphabetically | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| reset filters | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| open exam | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| open builder from detail | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| open preset library handoff | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| open advanced builder handoff | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| quick create handoff to create exam page | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| open question bank handoff | Covered | Baseline | `tests/e2e/workflow/institute-exams-workspace.spec.ts` |
| create disposable exam shell | Covered | Mutable | `tests/e2e/workflow/institute-exam-mutable.spec.ts` |

### `/institute/exams/advanced`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| advanced builder route opens | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| seeded NEET advanced-builder family guidance and summary recommendation surface correctly | Covered | Baseline | `tests/e2e/workflow/family-advanced-builder-guidance.spec.ts` |
| seeded JEE advanced-builder family guidance and summary recommendation surface correctly | Covered | Baseline | `tests/e2e/workflow/family-advanced-builder-guidance.spec.ts` |
| seeded GRE advanced-builder family guidance and summary recommendation surface correctly | Covered | Baseline | `tests/e2e/workflow/family-advanced-builder-guidance.spec.ts` |
| seeded AWS advanced-builder family guidance and summary recommendation surface correctly | Covered | Baseline | `tests/e2e/workflow/family-advanced-builder-guidance.spec.ts` |
| apply quick-practice template as the advanced-builder seed | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts` |
| preview a disposable advanced-builder exam blueprint | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts` |
| create disposable `practice` exam from advanced builder | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts` |
| create disposable `quiz` exam from advanced builder | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts` |
| create disposable `mock_exam` exam from advanced builder | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts` |
| save advanced template | Covered | Mutable | `tests/e2e/workflow/institute-advanced-builder-templates-mutable.spec.ts` |
| export selected templates as JSON | Covered | Mutable | `tests/e2e/workflow/institute-advanced-builder-templates-mutable.spec.ts` |
| import template JSON bundle | Covered | Mutable | `tests/e2e/workflow/institute-advanced-builder-templates-mutable.spec.ts` |

### `/institute/exams/new`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| create exam route opens | Covered | Baseline + Mutable | `tests/e2e/workflow/institute-family-guided-create-defaults.spec.ts`, `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts` |
| seeded NEET family guidance and execution checklist surface in wizard | Covered | Baseline | `tests/e2e/workflow/institute-family-guided-create-defaults.spec.ts` |
| seeded NEET family defaults prefill duration, runtime, and learner posture | Covered | Baseline | `tests/e2e/workflow/institute-family-guided-create-defaults.spec.ts` |
| seeded JEE family guidance and execution checklist surface in wizard | Covered | Baseline | `tests/e2e/workflow/institute-family-guided-create-defaults.spec.ts` |
| seeded JEE family defaults prefill duration, runtime, and learner posture | Covered | Baseline | `tests/e2e/workflow/institute-family-guided-create-defaults.spec.ts` |
| seeded GRE family guidance and execution checklist surface in wizard | Covered | Baseline | `tests/e2e/workflow/institute-family-guided-create-defaults.spec.ts` |
| seeded GRE family defaults prefill duration, runtime, and learner posture | Covered | Baseline | `tests/e2e/workflow/institute-family-guided-create-defaults.spec.ts` |
| seeded AWS family guidance and execution checklist surface in wizard | Covered | Baseline | `tests/e2e/workflow/institute-family-guided-create-defaults.spec.ts` |
| seeded AWS family defaults prefill duration, runtime, and learner posture | Covered | Baseline | `tests/e2e/workflow/institute-family-guided-create-defaults.spec.ts` |
| create `practice` exam shell from guided wizard | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts` |
| create `quiz` exam shell from guided wizard | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts` |
| create `mock_exam` exam shell from guided wizard | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts` |
| persist JEE guided-family defaults into saved institute exam metadata | Covered | Mutable | `tests/e2e/workflow/institute-family-guided-persistence.mutable.spec.ts` |
| persist GRE guided-family defaults into saved institute exam metadata | Covered | Mutable | `tests/e2e/workflow/institute-family-guided-persistence.mutable.spec.ts` |
| guided wizard handoff to created exam detail | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts` |

### `/institute/exams/:id`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| exam detail loads | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-exam-detail-workspace.spec.ts` |
| exam detail KPI panels render exam code, questions, assigned students, access key, and result status | Covered | Baseline | `tests/e2e/workflow/institute-exam-detail-workspace.spec.ts` |
| exam readiness board renders hard blockers, still pending, and already ready panels | Covered | Baseline | `tests/e2e/workflow/institute-exam-detail-workspace.spec.ts` |
| exam actions, exam configuration, student access and stars, and publish history panels render | Covered | Baseline | `tests/e2e/workflow/institute-exam-detail-workspace.spec.ts` |
| back to exams | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| link questions | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| open builder | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| open results when hero handoff is exposed | Covered | Mutable | `tests/e2e/workflow/institute-exam-mutable.spec.ts` |
| open reviews when hero handoff is exposed | Covered | Mutable | `tests/e2e/workflow/institute-exam-mutable.spec.ts` |
| refresh status | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| sync marks | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| mutable detail actions on disposable exam | Covered | Mutable | `tests/e2e/workflow/institute-exam-mutable.spec.ts` |
| selected-student assignment is reflected on a disposable guided-create or advanced-created exam | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts`, `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts` |

### `/institute/exams/:id/builder`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| builder workspace loads | Covered | Baseline | `tests/e2e/workflow/institute-exam-builder-workspace.spec.ts` |
| open delivery view | Covered | Baseline | `tests/e2e/workflow/institute-exam-builder-workspace.spec.ts` |
| open results handoff | Covered | Baseline | `tests/e2e/workflow/institute-exam-builder-workspace.spec.ts` |
| open reviews handoff | Covered | Baseline | `tests/e2e/workflow/institute-exam-builder-workspace.spec.ts` |
| open question bank handoff | Covered | Baseline | `tests/e2e/workflow/institute-exam-builder-workspace.spec.ts` |
| linked questions tab visible | Covered | Baseline | `tests/e2e/workflow/institute-exam-builder-workspace.spec.ts` |
| export linked question paper as PDF-ready popup | Covered | Mutable | `tests/e2e/workflow/institute-exam-mutable.spec.ts` |
| add section on a disposable guided-create exam | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts` |
| attach one visible question to a disposable guided-create exam | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts` |
| verify auto-resolved linked questions on a disposable advanced-created exam | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts` |
| save selected-student assignment on a disposable guided-create exam | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts` |
| save selected-student assignment on a disposable advanced-created exam | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts` |
| save schedule and marks settings on a disposable guided-create exam | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts` |
| save schedule and marks settings on a disposable advanced-created exam | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts` |

### `/institute/question-bank`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| question bank page loads | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-workspace.spec.ts` |
| question bank route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/institute-cross-browser-shell.spec.ts` |
| search/filter workflow | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-workspace.spec.ts` |
| preview details panel opens from a visible question card when available | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-workspace.spec.ts` |
| import questions route entry | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-workspace.spec.ts` |
| import comprehension route entry | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-workspace.spec.ts` |
| create question route entry | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-workspace.spec.ts` |
| create comprehension route entry | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-workspace.spec.ts` |
| bulk buttons stay disabled before visible selection | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-bulk-workspace.spec.ts` |
| bulk difficulty action shows required-field guard when no difficulty is chosen | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-bulk-workspace.spec.ts` |
| bulk topic action shows required-field guard when no topic is chosen | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-bulk-workspace.spec.ts` |
| bulk tag action shows required-field guard when no tag is chosen | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-bulk-workspace.spec.ts` |
| bulk set difficulty updates a disposable question | Covered | Mutable | `tests/e2e/workflow/institute-question-bank-bulk-mutable.spec.ts` |
| bulk deactivate updates a disposable question status | Covered | Mutable | `tests/e2e/workflow/institute-question-bank-bulk-mutable.spec.ts` |
| bulk activate restores a disposable question status | Covered | Mutable | `tests/e2e/workflow/institute-question-bank-bulk-mutable.spec.ts` |
| bulk attach tag updates a disposable question | Covered | Mutable | `tests/e2e/workflow/institute-question-bank-bulk-mutable.spec.ts` |
| bulk remove tag clears the tag from a disposable question | Covered | Mutable | `tests/e2e/workflow/institute-question-bank-bulk-mutable.spec.ts` |

### `/institute/question-bank/new`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| create question page loads | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-workspace.spec.ts` |
| subject selector stays disabled until program is chosen | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-workspace.spec.ts` |

### `/institute/question-bank/:id`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| question detail page loads from question bank inventory | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-detail-workspace.spec.ts` |
| question metadata section is visible | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-detail-workspace.spec.ts` |
| question attachments section is visible | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-detail-workspace.spec.ts` |

### `/institute/question-bank/comprehension/new`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| create comprehension set page loads | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-workspace.spec.ts` |
| subject selector stays disabled until program is chosen | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-workspace.spec.ts` |

### `/institute/question-bank/comprehension/:id`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| comprehension detail page loads from recent comprehension inventory when available | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-detail-workspace.spec.ts` |
| comprehension detail next-step actions are visible when a recent set is available | Covered | Baseline | `tests/e2e/workflow/institute-question-bank-detail-workspace.spec.ts` |

### `/institute/results`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| results landing loads | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-results-workspace.spec.ts` |
| results route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/institute-cross-browser-shell.spec.ts` |
| results workflow cards remain reachable in the cross-browser deep-route lane | Covered | Baseline | `tests/e2e/workflow/institute-cross-browser-results.spec.ts` |
| exam state filter | Covered | Baseline | `tests/e2e/workflow/institute-results-workspace.spec.ts` |
| sort by filter | Covered | Baseline | `tests/e2e/workflow/institute-results-workspace.spec.ts` |
| group by filter | Covered | Baseline | `tests/e2e/workflow/institute-results-workspace.spec.ts` |
| publication-group filtered view resolves to grouped cards or honest empty-state messaging based on live data | Covered | Baseline | `tests/e2e/workflow/institute-results-workspace.spec.ts` |
| page size filter | Covered | Baseline | `tests/e2e/workflow/institute-results-workspace.spec.ts` |
| reset exam filters | Covered | Baseline | `tests/e2e/workflow/institute-results-workspace.spec.ts` |
| open exam | Covered | Baseline | `tests/e2e/workflow/institute-results-workspace.spec.ts` |
| open builder | Covered | Baseline | `tests/e2e/workflow/institute-results-workspace.spec.ts` |
| open reviews | Covered | Baseline | `tests/e2e/workflow/institute-results-workspace.spec.ts` |
| inspect question bank | Covered | Baseline | `tests/e2e/workflow/institute-results-workspace.spec.ts` |
| open leaderboard | Covered | Baseline | `tests/e2e/workflow/institute-results-workspace.spec.ts` |
| open live monitor | Covered | Baseline | `tests/e2e/workflow/institute-results-workspace.spec.ts` |
| open analysis | Covered | Baseline | `tests/e2e/workflow/institute-results-workspace.spec.ts` |
| refresh exam status when exposed | Covered | Baseline | `tests/e2e/workflow/institute-results-workspace.spec.ts` |
| workflow-card link utilities when exposed | Covered | Baseline | `tests/e2e/workflow/institute-results-workspace.spec.ts` |

### `/institute/results/analysis`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| analytics landing loads | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| analysis route remains reachable in the cross-browser deep-route lane | Covered | Baseline | `tests/e2e/workflow/institute-cross-browser-results.spec.ts` |
| group by filter | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| question risk board visible | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-results-analysis-workspace.spec.ts` |
| student explorer visible | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts`, `tests/e2e/workflow/institute-results-analysis-workspace.spec.ts` |
| question filter hard | Covered | Baseline | `tests/e2e/workflow/institute-results-analysis-workspace.spec.ts` |
| question filter skipped often | Covered | Baseline | `tests/e2e/workflow/institute-results-analysis-workspace.spec.ts` |
| question filter revision candidates | Covered | Baseline | `tests/e2e/workflow/institute-results-analysis-workspace.spec.ts` |
| question filter all | Covered | Baseline | `tests/e2e/workflow/institute-results-analysis-workspace.spec.ts` |
| select student from explorer | Covered | Baseline | `tests/e2e/workflow/institute-results-analysis-workspace.spec.ts` |
| selected-student wrong filter | Covered | Baseline | `tests/e2e/workflow/institute-results-analysis-workspace.spec.ts` |
| open question bank | Covered | Baseline | `tests/e2e/workflow/institute-results-analysis-workspace.spec.ts` |
| open builder | Covered | Baseline | `tests/e2e/workflow/institute-results-analysis-workspace.spec.ts` |

### `/institute/results/leaderboard`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| leaderboard route opens | Covered | Baseline | `tests/e2e/workflow/institute-results-workspace.spec.ts` |
| leaderboard route remains reachable in the cross-browser deep-route lane | Covered | Baseline | `tests/e2e/workflow/institute-cross-browser-results.spec.ts` |
| publication checklist visible | Covered | Baseline | `tests/e2e/workflow/institute-results-leaderboard-workspace.spec.ts` |
| leaderboard KPI cards visible | Covered | Baseline | `tests/e2e/workflow/institute-results-leaderboard-workspace.spec.ts` |
| ranked row details visible or honest empty state | Covered | Baseline | `tests/e2e/workflow/institute-results-leaderboard-workspace.spec.ts` |
| leaderboard pagination when available | Covered | Baseline | `tests/e2e/workflow/institute-results-leaderboard-workspace.spec.ts` |
| open exam handoff | Covered | Baseline | `tests/e2e/workflow/institute-results-leaderboard-workspace.spec.ts` |
| open builder handoff | Covered | Baseline | `tests/e2e/workflow/institute-results-leaderboard-workspace.spec.ts` |
| overview navigation card | Covered | Baseline | `tests/e2e/workflow/institute-results-leaderboard-workspace.spec.ts` |
| live monitor navigation card | Covered | Baseline | `tests/e2e/workflow/institute-results-leaderboard-workspace.spec.ts` |
| attempts navigation card | Covered | Baseline | `tests/e2e/workflow/institute-results-leaderboard-workspace.spec.ts` |
| analysis navigation card | Covered | Baseline | `tests/e2e/workflow/institute-results-leaderboard-workspace.spec.ts` |

### `/institute/results/attempts`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| attempts page loads | Covered | Baseline | `tests/e2e/workflow/institute-results-attempts-workspace.spec.ts` |
| attempt filter | Covered | Baseline | `tests/e2e/workflow/institute-results-attempts-workspace.spec.ts` |
| attempt sort | Covered | Baseline | `tests/e2e/workflow/institute-results-attempts-workspace.spec.ts` |
| attempt group | Covered | Baseline | `tests/e2e/workflow/institute-results-attempts-workspace.spec.ts` |
| page size | Covered | Baseline | `tests/e2e/workflow/institute-results-attempts-workspace.spec.ts` |
| reset attempt filters | Covered | Baseline | `tests/e2e/workflow/institute-results-attempts-workspace.spec.ts` |
| inspect attempt | Covered | Baseline | `tests/e2e/workflow/institute-results-attempts-workspace.spec.ts` |

### `/institute/results/live`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| live monitor page loads | Covered | Baseline | `tests/e2e/workflow/institute-results-live-workspace.spec.ts` |
| live monitor route remains reachable in the cross-browser deep-route lane | Covered | Baseline | `tests/e2e/workflow/institute-cross-browser-results.spec.ts` |
| live monitor refresh controls | Covered | Baseline | `tests/e2e/workflow/institute-results-live-workspace.spec.ts` |
| pause and resume auto refresh | Covered | Baseline | `tests/e2e/workflow/institute-results-live-workspace.spec.ts` |
| manual refresh button | Covered | Baseline | `tests/e2e/workflow/institute-results-live-workspace.spec.ts` |
| inspect attempt from monitor lanes when available | Covered | Baseline | `tests/e2e/workflow/institute-results-live-workspace.spec.ts` |
| honest empty intervention state | Covered | Baseline | `tests/e2e/workflow/institute-results-live-workspace.spec.ts` |

### `/institute/reports`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| reports page loads | Covered | Baseline | `tests/e2e/workflow/institute-reports-workspace.spec.ts` |
| focus lane filter | Covered | Baseline | `tests/e2e/workflow/institute-reports-workspace.spec.ts` |
| subject filter | Covered | Baseline | `tests/e2e/workflow/institute-reports-workspace.spec.ts` |
| sort by filter | Covered | Baseline | `tests/e2e/workflow/institute-reports-workspace.spec.ts` |
| apply filters | Covered | Baseline | `tests/e2e/workflow/institute-reports-workspace.spec.ts` |
| reset filters | Covered | Baseline | `tests/e2e/workflow/institute-reports-workspace.spec.ts` |
| quick filter chips | Covered | Baseline | `tests/e2e/workflow/institute-reports-workspace.spec.ts` |
| quick filter all | Covered | Baseline | `tests/e2e/workflow/institute-reports-workspace.spec.ts` |
| quick filter most attempts | Covered | Baseline | `tests/e2e/workflow/institute-reports-workspace.spec.ts` |
| publication lane content | Covered | Baseline | `tests/e2e/workflow/institute-reports-workspace.spec.ts` |
| weak-topic lane content | Covered | Baseline | `tests/e2e/workflow/institute-reports-workspace.spec.ts` |
| student distribution lane content | Covered | Baseline | `tests/e2e/workflow/institute-reports-workspace.spec.ts` |
| performance lane content | Covered | Baseline | `tests/e2e/workflow/institute-reports-workspace.spec.ts` |
| hero open results | Covered | Baseline | `tests/e2e/workflow/institute-reports-workspace.spec.ts` |
| hero open exams | Covered | Baseline | `tests/e2e/workflow/institute-reports-workspace.spec.ts` |

### `/institute/reviews`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| reviews page loads | Covered | Baseline | `tests/e2e/workflow/institute-reviews-workspace.spec.ts` |
| reviews route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/institute-cross-browser-shell.spec.ts` |
| open results | Covered | Baseline | `tests/e2e/workflow/institute-reviews-workspace.spec.ts` |
| open pending | Covered | Baseline | `tests/e2e/workflow/institute-reviews-workspace.spec.ts` |
| open reviewed | Covered | Baseline | `tests/e2e/workflow/institute-reviews-workspace.spec.ts` |
| reset | Covered | Baseline | `tests/e2e/workflow/institute-reviews-workspace.spec.ts` |
| status filter | Covered | Baseline | `tests/e2e/workflow/institute-reviews-workspace.spec.ts` |
| page size filter | Covered | Baseline | `tests/e2e/workflow/institute-reviews-workspace.spec.ts` |
| open task | Covered | Baseline | `tests/e2e/workflow/institute-reviews-workspace.spec.ts` |
| open exam-scoped queue | Covered | Baseline | `tests/e2e/workflow/institute-reviews-workspace.spec.ts` |
| exam-scoped open results | Covered | Baseline | `tests/e2e/workflow/institute-reviews-workspace.spec.ts` |
| exam-scoped back to exam | Covered | Baseline | `tests/e2e/workflow/institute-reviews-workspace.spec.ts` |
| previous page / next page buttons | Covered | Baseline | `tests/e2e/workflow/institute-reviews-workspace.spec.ts` |

## Teacher pages

### `/teacher/dashboard`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| dashboard loads | Covered | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |
| dashboard route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/teacher-cross-browser-shell.spec.ts` |
| lane filter apply | Covered | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |
| reset filters | Covered | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |
| new exam link | Covered | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |
| new question link | Covered | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |
| exams link | Covered | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |

### `/teacher/exams`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| exams page loads | Covered | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |
| exams route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/teacher-cross-browser-shell.spec.ts` |
| exam grouping filter | Covered | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |
| reset filters | Covered | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |
| quick create | Covered | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |
| advanced builder | Covered | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |
| open exam | Covered | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |
| create disposable exam shell | Covered | Mutable | `tests/e2e/workflow/teacher-exam-builder-mutable.spec.ts`, `tests/e2e/workflow/teacher-exam-detail-mutable.spec.ts` |

### `/teacher/exams/new`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| create exam shell flow | Covered | Mutable | `tests/e2e/workflow/teacher-exam-builder-mutable.spec.ts`, `tests/e2e/workflow/teacher-exam-detail-mutable.spec.ts` |

### `/teacher/exams/advanced`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| advanced builder route opens | Covered | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |
| save advanced template | Covered | Mutable | `tests/e2e/workflow/teacher-advanced-builder-templates-mutable.spec.ts` |
| export selected templates as JSON | Covered | Mutable | `tests/e2e/workflow/teacher-advanced-builder-templates-mutable.spec.ts` |
| import template JSON bundle | Covered | Mutable | `tests/e2e/workflow/teacher-advanced-builder-templates-mutable.spec.ts` |

### `/teacher/exams/:id`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| delivery detail page loads | Covered | Baseline | `tests/e2e/workflow/teacher-exam-detail-workspace.spec.ts` |
| exam publish readiness and result publish readiness panels render | Covered | Baseline | `tests/e2e/workflow/teacher-exam-detail-workspace.spec.ts` |
| exam actions, configuration, access policy, and publish history panels render | Covered | Baseline | `tests/e2e/workflow/teacher-exam-detail-workspace.spec.ts` |
| open results when hero handoff is exposed | Covered | Mutable | `tests/e2e/workflow/teacher-exam-detail-mutable.spec.ts` |
| open reviews when hero handoff is exposed | Covered | Mutable | `tests/e2e/workflow/teacher-exam-detail-mutable.spec.ts` |
| mutable policy and access actions | Covered | Mutable | `tests/e2e/workflow/teacher-exam-detail-mutable.spec.ts` |

### `/teacher/exams/:id/builder`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| builder loads | Covered | Baseline | `tests/e2e/workflow/exam-builder.spec.ts` |
| open delivery view handoff | Covered | Baseline | `tests/e2e/workflow/exam-builder.spec.ts` |
| open results handoff | Covered | Baseline | `tests/e2e/workflow/exam-builder.spec.ts` |
| open reviews handoff | Covered | Baseline | `tests/e2e/workflow/exam-builder.spec.ts` |
| sections tab review | Covered | Baseline | `tests/e2e/workflow/exam-builder.spec.ts` |
| linked questions tab review | Covered | Baseline | `tests/e2e/workflow/exam-builder.spec.ts` |
| quick attach search | Covered | Baseline | `tests/e2e/workflow/exam-builder.spec.ts` |
| quick attach select/clear | Covered | Baseline | `tests/e2e/workflow/exam-builder.spec.ts` |
| save exam settings | Covered | Mutable | `tests/e2e/workflow/teacher-exam-builder-mutable.spec.ts` |
| add section | Covered | Mutable | `tests/e2e/workflow/teacher-exam-builder-mutable.spec.ts` |
| remove section | Covered | Mutable | `tests/e2e/workflow/teacher-exam-builder-mutable.spec.ts` |
| manual attach question | Covered | Mutable | `tests/e2e/workflow/teacher-exam-builder-mutable.spec.ts` |
| edit linked question marks/negative marks | Covered | Mutable | `tests/e2e/workflow/teacher-exam-builder-mutable.spec.ts` |
| remove linked question | Covered | Mutable | `tests/e2e/workflow/teacher-exam-builder-mutable.spec.ts` |
| export linked question paper as PDF-ready popup | Covered | Mutable | `tests/e2e/workflow/teacher-results-mutable.spec.ts` |

### `/teacher/question-bank`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| question bank page loads | Covered | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts`, `tests/e2e/workflow/question-bank-deep.spec.ts` |
| question bank route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/teacher-cross-browser-shell.spec.ts` |
| search/filter workflow | Covered | Baseline | `tests/e2e/workflow/question-bank-deep.spec.ts` |
| create question route entry | Covered | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |
| comprehension authoring route entry | Covered | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |

### `/teacher/question-bank/new`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| create disposable draft question | Covered | Mutable | `tests/e2e/workflow/teacher-question-mutable.spec.ts` |
| create disposable essay/manual-review question | Covered | Mutable | `tests/e2e/workflow/teacher-review-mutable.spec.ts` |
| create linked child question under a saved comprehension set | Covered | Mutable | `tests/e2e/workflow/teacher-comprehension-mutable.spec.ts` |

### `/teacher/question-bank/comprehension/new`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| create comprehension set | Covered | Mutable | `tests/e2e/workflow/teacher-comprehension-mutable.spec.ts` |
| rich-text toolbar formatting persists in passage content | Covered | Mutable | `tests/e2e/workflow/teacher-comprehension-mutable.spec.ts` |
| rich-text toolbar formatting persists in teacher notes | Covered | Mutable | `tests/e2e/workflow/teacher-comprehension-mutable.spec.ts` |

### `/teacher/question-bank/comprehension/:id`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| update comprehension set title | Covered | Mutable | `tests/e2e/workflow/teacher-comprehension-mutable.spec.ts` |
| linked child question appears in comprehension detail | Covered | Mutable | `tests/e2e/workflow/teacher-comprehension-mutable.spec.ts` |

### `/teacher/question-bank/import`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| import page loads with template guidance | Covered | Baseline | `tests/e2e/smoke/teacher-workflows.spec.ts` |
| download template CSV | Covered | Baseline | `tests/e2e/workflow/teacher-question-import-export.spec.ts` |
| download sample CSV | Covered | Baseline | `tests/e2e/workflow/teacher-question-import-export.spec.ts` |
| preview CSV import | Covered | Mutable | `tests/e2e/workflow/question-import-mutable.spec.ts` |
| finalize CSV import | Covered | Mutable | `tests/e2e/workflow/question-import-mutable.spec.ts` |

### `/teacher/question-bank/comprehension/import`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| import comprehension page loads with template guidance | Covered | Baseline | `tests/e2e/workflow/question-bank-deep.spec.ts` |
| download comprehension template CSV | Covered | Baseline | `tests/e2e/workflow/teacher-question-import-export.spec.ts` |
| download comprehension sample CSV | Covered | Baseline | `tests/e2e/workflow/teacher-question-import-export.spec.ts` |
| preview comprehension CSV import | Covered | Baseline | `tests/e2e/workflow/question-bank-deep.spec.ts` |

### `/institute/question-bank/import`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| import page loads with template guidance | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| download template CSV | Covered | Baseline | `tests/e2e/workflow/institute-question-import-export.spec.ts` |
| download sample CSV | Covered | Baseline | `tests/e2e/workflow/institute-question-import-export.spec.ts` |
| preview CSV import | Covered | Mutable | `tests/e2e/workflow/question-import-mutable.spec.ts` |
| finalize CSV import | Covered | Mutable | `tests/e2e/workflow/question-import-mutable.spec.ts` |

### `/institute/question-bank/comprehension/import`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| import comprehension page loads with template guidance | Covered | Baseline | `tests/e2e/smoke/institute-results.spec.ts` |
| download comprehension template CSV | Covered | Baseline | `tests/e2e/workflow/institute-question-import-export.spec.ts` |
| download comprehension sample CSV | Covered | Baseline | `tests/e2e/workflow/institute-question-import-export.spec.ts` |
| preview comprehension CSV import | Covered | Baseline | `tests/e2e/workflow/institute-question-import-export.spec.ts` |

### `/teacher/question-bank/:id`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| edit question explanation | Covered | Mutable | `tests/e2e/workflow/teacher-question-mutable.spec.ts` |
| draft state persists | Covered | Mutable | `tests/e2e/workflow/teacher-question-mutable.spec.ts` |
| delete disposable question | Covered | Mutable | `tests/e2e/workflow/teacher-question-mutable.spec.ts` |

### `/teacher/results`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| results page loads | Covered | Baseline | `tests/e2e/workflow/teacher-results-workspace.spec.ts` |
| results route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/teacher-cross-browser-shell.spec.ts` |
| results workflow cards remain reachable in the cross-browser deep-route lane | Covered | Baseline | `tests/e2e/workflow/teacher-cross-browser-results.spec.ts` |
| exam state filter | Covered | Baseline | `tests/e2e/workflow/teacher-results-workspace.spec.ts` |
| sort by filter | Covered | Baseline | `tests/e2e/workflow/teacher-results-workspace.spec.ts` |
| group by filter | Covered | Baseline | `tests/e2e/workflow/teacher-results-workspace.spec.ts` |
| page size filter | Covered | Baseline | `tests/e2e/workflow/teacher-results-workspace.spec.ts` |
| reset exam filters | Covered | Baseline | `tests/e2e/workflow/teacher-results-workspace.spec.ts` |
| open exam | Covered | Baseline | `tests/e2e/workflow/teacher-results-workspace.spec.ts` |
| open builder | Covered | Baseline | `tests/e2e/workflow/teacher-results-workspace.spec.ts` |
| open reviews | Covered | Baseline | `tests/e2e/workflow/teacher-results-workspace.spec.ts` |
| inspect question bank | Covered | Baseline | `tests/e2e/workflow/teacher-results-workspace.spec.ts` |
| open leaderboard | Covered | Baseline | `tests/e2e/workflow/teacher-results-workspace.spec.ts` |
| open analysis | Covered | Baseline | `tests/e2e/workflow/teacher-results-workspace.spec.ts` |
| open live monitor | Covered | Baseline | `tests/e2e/workflow/teacher-results-workspace.spec.ts` |
| refresh exam status when exposed | Covered | Baseline | `tests/e2e/workflow/teacher-results-workspace.spec.ts` |
| workflow-card link utilities when exposed | Covered | Baseline | `tests/e2e/workflow/teacher-results-workspace.spec.ts` |
| mark exam completed from workflow card when needed | Covered | Mutable | `tests/e2e/workflow/teacher-results-mutable.spec.ts` |
| generate or regenerate results summary | Covered | Mutable | `tests/e2e/workflow/teacher-results-mutable.spec.ts` |
| calculate or recalculate ranks | Covered | Mutable | `tests/e2e/workflow/teacher-results-mutable.spec.ts` |
| publish results or verify already-published state | Covered | Mutable | `tests/e2e/workflow/teacher-results-mutable.spec.ts` |

### `/teacher/results/leaderboard`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| leaderboard route opens | Covered | Baseline | `tests/e2e/workflow/teacher-results-workspace.spec.ts` |
| leaderboard route remains reachable in the cross-browser deep-route lane | Covered | Baseline | `tests/e2e/workflow/teacher-cross-browser-results.spec.ts` |
| publication checklist visible | Covered | Baseline | `tests/e2e/workflow/teacher-results-leaderboard-workspace.spec.ts` |
| leaderboard KPI cards visible | Covered | Baseline | `tests/e2e/workflow/teacher-results-leaderboard-workspace.spec.ts` |
| ranked row details visible or honest empty state | Covered | Baseline | `tests/e2e/workflow/teacher-results-leaderboard-workspace.spec.ts` |
| leaderboard pagination when available | Covered | Baseline | `tests/e2e/workflow/teacher-results-leaderboard-workspace.spec.ts` |
| open exam handoff | Covered | Baseline | `tests/e2e/workflow/teacher-results-leaderboard-workspace.spec.ts` |
| open builder handoff | Covered | Baseline | `tests/e2e/workflow/teacher-results-leaderboard-workspace.spec.ts` |
| overview navigation card | Covered | Baseline | `tests/e2e/workflow/teacher-results-leaderboard-workspace.spec.ts` |
| live monitor navigation card | Covered | Baseline | `tests/e2e/workflow/teacher-results-leaderboard-workspace.spec.ts` |
| attempts navigation card | Covered | Baseline | `tests/e2e/workflow/teacher-results-leaderboard-workspace.spec.ts` |
| analysis navigation card | Covered | Baseline | `tests/e2e/workflow/teacher-results-leaderboard-workspace.spec.ts` |
| ranked student appears after results workflow | Covered | Mutable | `tests/e2e/workflow/teacher-results-mutable.spec.ts` |

### `/teacher/results/analysis`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| analysis page loads | Covered | Baseline | `tests/e2e/workflow/exam-builder.spec.ts`, `tests/e2e/workflow/teacher-results-analysis-workspace.spec.ts` |
| analysis route remains reachable in the cross-browser deep-route lane | Covered | Baseline | `tests/e2e/workflow/teacher-cross-browser-results.spec.ts` |
| exam list group filter | Covered | Baseline | `tests/e2e/workflow/exam-builder.spec.ts` |
| question risk board visible | Covered | Baseline | `tests/e2e/workflow/teacher-results-analysis-workspace.spec.ts` |
| student explorer visible | Covered | Baseline | `tests/e2e/workflow/teacher-results-analysis-workspace.spec.ts` |
| question filter hard | Covered | Baseline | `tests/e2e/workflow/teacher-results-analysis-workspace.spec.ts` |
| question filter skipped often | Covered | Baseline | `tests/e2e/workflow/teacher-results-analysis-workspace.spec.ts` |
| question filter revision candidates | Covered | Baseline | `tests/e2e/workflow/teacher-results-analysis-workspace.spec.ts` |
| question filter all | Covered | Baseline | `tests/e2e/workflow/teacher-results-analysis-workspace.spec.ts` |
| select student from explorer | Covered | Baseline | `tests/e2e/workflow/teacher-results-analysis-workspace.spec.ts` |
| selected-student wrong filter | Covered | Baseline | `tests/e2e/workflow/teacher-results-analysis-workspace.spec.ts` |
| open question bank | Covered | Baseline | `tests/e2e/workflow/teacher-results-analysis-workspace.spec.ts` |
| open builder from analysis | Covered | Baseline | `tests/e2e/workflow/exam-builder.spec.ts`, `tests/e2e/workflow/teacher-results-analysis-workspace.spec.ts` |

### `/teacher/results/attempts`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| attempts page loads | Covered | Baseline | `tests/e2e/workflow/teacher-results-attempts-workspace.spec.ts` |
| attempt filter | Covered | Baseline | `tests/e2e/workflow/teacher-results-attempts-workspace.spec.ts` |
| attempt sort | Covered | Baseline | `tests/e2e/workflow/teacher-results-attempts-workspace.spec.ts` |
| attempt group | Covered | Baseline | `tests/e2e/workflow/teacher-results-attempts-workspace.spec.ts` |
| attempt page size | Covered | Baseline | `tests/e2e/workflow/teacher-results-attempts-workspace.spec.ts` |
| reset attempt filters | Covered | Baseline | `tests/e2e/workflow/teacher-results-attempts-workspace.spec.ts` |
| inspect attempt | Covered | Baseline | `tests/e2e/workflow/teacher-results-attempts-workspace.spec.ts` |

### `/teacher/results/live`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| live monitor page loads | Covered | Baseline | `tests/e2e/workflow/teacher-results-live-workspace.spec.ts` |
| live monitor route remains reachable in the cross-browser deep-route lane | Covered | Baseline | `tests/e2e/workflow/teacher-cross-browser-results.spec.ts` |
| live monitor refresh controls | Covered | Baseline | `tests/e2e/workflow/teacher-results-live-workspace.spec.ts` |
| pause and resume auto refresh | Covered | Baseline | `tests/e2e/workflow/teacher-results-live-workspace.spec.ts` |
| manual refresh button | Covered | Baseline | `tests/e2e/workflow/teacher-results-live-workspace.spec.ts` |
| inspect attempt from monitor lanes when available | Covered | Baseline | `tests/e2e/workflow/teacher-results-live-workspace.spec.ts` |
| honest empty intervention state | Covered | Baseline | `tests/e2e/workflow/teacher-results-live-workspace.spec.ts` |

### `/teacher/reviews`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| reviews page loads | Covered | Baseline | `tests/e2e/workflow/teacher-reviews-workspace.spec.ts` |
| reviews route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/teacher-cross-browser-shell.spec.ts` |
| open results | Covered | Baseline | `tests/e2e/workflow/teacher-reviews-workspace.spec.ts` |
| open pending | Covered | Baseline | `tests/e2e/workflow/teacher-reviews-workspace.spec.ts` |
| open reviewed | Covered | Baseline | `tests/e2e/workflow/teacher-reviews-workspace.spec.ts` |
| reset | Covered | Baseline | `tests/e2e/workflow/teacher-reviews-workspace.spec.ts` |
| status filter | Covered | Baseline | `tests/e2e/workflow/teacher-reviews-workspace.spec.ts` |
| page size filter | Covered | Baseline | `tests/e2e/workflow/teacher-reviews-workspace.spec.ts` |
| open task | Covered | Baseline | `tests/e2e/workflow/teacher-reviews-workspace.spec.ts` |
| open exam-scoped reviews from results | Covered | Baseline | `tests/e2e/workflow/teacher-reviews-workspace.spec.ts` |
| exam-scoped open results | Covered | Baseline | `tests/e2e/workflow/teacher-reviews-workspace.spec.ts` |
| exam-scoped back to exam | Covered | Baseline | `tests/e2e/workflow/teacher-reviews-workspace.spec.ts` |
| clear exam scope | Covered | Baseline | `tests/e2e/workflow/teacher-reviews-workspace.spec.ts` |
| previous page / next page buttons | Covered | Baseline | `tests/e2e/workflow/teacher-reviews-workspace.spec.ts` |
| assign to me | Covered | Mutable | `tests/e2e/workflow/teacher-review-mutable.spec.ts` |
| save review with awarded marks | Covered | Mutable | `tests/e2e/workflow/teacher-review-mutable.spec.ts` |

## Student pages

### `/app/dashboard`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| dashboard page loads with live action queue signals | Covered | Baseline | `tests/e2e/workflow/student-dashboard-workspace.spec.ts`, `tests/e2e/workflow/student-mobile-sanity-workspace.spec.ts` |
| mobile drawer navigation opens from the student shell | Covered | Baseline | `tests/e2e/workflow/student-mobile-sanity-workspace.spec.ts` |
| mobile drawer can navigate to tests, results, analytics, and profile routes | Covered | Baseline | `tests/e2e/workflow/student-mobile-sanity-workspace.spec.ts` |
| cross-browser shell route opens and marks dashboard nav as current | Covered | Baseline | `tests/e2e/workflow/student-cross-browser-shell.spec.ts` |

### `/app/exams`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| exams page loads | Covered | Baseline | `tests/e2e/smoke/student-attempts.spec.ts` |
| exams route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/student-cross-browser-shell.spec.ts` |
| group by availability | Covered | Baseline | `tests/e2e/smoke/student-attempts.spec.ts` |
| reset filters | Covered | Baseline | `tests/e2e/smoke/student-attempts.spec.ts` |
| enter exam key | Covered | Baseline | `tests/e2e/smoke/student-attempts.spec.ts` |
| open practice from exams | Covered | Baseline | `tests/e2e/smoke/student-attempts.spec.ts` |

### `/app/exams/enter-key`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| page opens | Covered | Baseline | `tests/e2e/smoke/student-attempts.spec.ts` |
| submit valid key flow | Covered | Mutable | `tests/e2e/workflow/student-exam-key-mutable.spec.ts` |

### `/app/practice`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| practice page loads | Covered | Baseline | `tests/e2e/smoke/student-attempts.spec.ts`, `tests/e2e/workflow/student-practice-workspace.spec.ts` |
| availability filter | Covered | Baseline | `tests/e2e/workflow/student-practice-workspace.spec.ts` |
| sort filter | Covered | Baseline | `tests/e2e/workflow/student-practice-workspace.spec.ts` |
| group filter | Covered | Baseline | `tests/e2e/workflow/student-practice-workspace.spec.ts` |
| apply filters | Covered | Baseline | `tests/e2e/workflow/student-practice-workspace.spec.ts` |
| reset filters | Covered | Baseline | `tests/e2e/workflow/student-practice-workspace.spec.ts` |
| quick filters | Covered | Baseline | `tests/e2e/workflow/student-practice-workspace.spec.ts` |
| open weak areas | Covered | Baseline | `tests/e2e/smoke/student-attempts.spec.ts`, `tests/e2e/workflow/student-practice-workspace.spec.ts` |
| start/resume/review practice CTA | Covered | Mutable | `tests/e2e/workflow/student-practice-mutable.spec.ts` |

### `/app/weak-areas`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| page handoff from practice | Covered | Baseline | `tests/e2e/smoke/student-attempts.spec.ts`, `tests/e2e/workflow/student-practice-workspace.spec.ts` |

### `/app/analytics`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| analytics route opens | Covered | Baseline | `tests/e2e/smoke/student-attempts.spec.ts`, `tests/e2e/workflow/student-analytics-deep.spec.ts` |
| analytics route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/student-cross-browser-shell.spec.ts` |
| analytics route remains reachable from results in the cross-browser deep-route lane | Covered | Baseline | `tests/e2e/workflow/student-cross-browser-analytics-results.spec.ts` |
| hero open action center | Covered | Baseline | `tests/e2e/workflow/student-analytics-deep.spec.ts` |
| source drill opens source analytics detail route when available | Covered | Baseline | `tests/e2e/workflow/student-analytics-deep.spec.ts` |
| subject drill opens subject analytics detail route when available | Covered | Baseline | `tests/e2e/workflow/student-analytics-deep.spec.ts` |

### `/app/analytics/sources/:sourceKey`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| source analytics drill opens | Covered | Baseline | `tests/e2e/workflow/student-analytics-deep.spec.ts`, `tests/e2e/workflow/student-analytics-scope-persistence-workspace.spec.ts` |
| source detail preserves incoming subject and teacher query context | Covered | Baseline | `tests/e2e/workflow/student-analytics-scope-persistence-workspace.spec.ts` |
| compare results link materializes scoped `source` query and preserves subject/teacher context | Covered | Baseline | `tests/e2e/workflow/student-analytics-scope-persistence-workspace.spec.ts` |
| subject breakdown drill preserves source-teacher scope | Covered | Baseline | `tests/e2e/workflow/student-analytics-scope-persistence-workspace.spec.ts` |

### `/app/analytics/actions`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| action center route opens | Covered | Baseline | `tests/e2e/smoke/student-attempts.spec.ts`, `tests/e2e/workflow/student-analytics-deep.spec.ts` |
| check your timeline | Covered | Baseline | `tests/e2e/workflow/student-analytics-deep.spec.ts` |
| action center preserves scoped source, subject, and teacher query context from timeline/source/subject drills | Covered | Baseline | `tests/e2e/workflow/student-analytics-scope-persistence-workspace.spec.ts` |

### `/app/analytics/timeline`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| timeline route opens | Covered | Baseline | `tests/e2e/smoke/student-attempts.spec.ts`, `tests/e2e/workflow/student-analytics-deep.spec.ts` |
| timeline route remains reachable from compare in the cross-browser deep-route lane | Covered | Baseline | `tests/e2e/workflow/student-cross-browser-analytics-results.spec.ts` |
| open action center | Covered | Baseline | `tests/e2e/workflow/student-analytics-deep.spec.ts` |
| open results | Covered | Baseline | `tests/e2e/workflow/student-analytics-deep.spec.ts` |
| subject momentum drill | Covered | Baseline | `tests/e2e/workflow/student-analytics-deep.spec.ts` |
| timeline preserves scoped source, subject, and teacher query context from compare drills | Covered | Baseline | `tests/e2e/workflow/student-analytics-scope-persistence-workspace.spec.ts` |

### `/app/analytics/results/compare`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| compare route opens | Covered | Baseline | `tests/e2e/smoke/student-attempts.spec.ts`, `tests/e2e/workflow/student-analytics-deep.spec.ts` |
| compare route remains reachable in the cross-browser deep-route lane | Covered | Baseline | `tests/e2e/workflow/student-cross-browser-analytics-results.spec.ts` |
| compare route can be reached from source analytics drill with scoped query params | Covered | Baseline | `tests/e2e/workflow/student-analytics-deep.spec.ts` |
| compare route renders preserved source and subject context from source drill when present | Covered | Baseline | `tests/e2e/workflow/student-analytics-deep.spec.ts` |
| compare route preserves source, subject, and teacher context from source-detail CTA | Covered | Baseline | `tests/e2e/workflow/student-analytics-scope-persistence-workspace.spec.ts` |
| open timeline | Covered | Baseline | `tests/e2e/workflow/student-analytics-deep.spec.ts` |
| open timeline preserves scoped source, subject, and teacher context | Covered | Baseline | `tests/e2e/workflow/student-analytics-scope-persistence-workspace.spec.ts` |
| open results | Covered | Baseline | `tests/e2e/workflow/student-analytics-deep.spec.ts` |

### `/app/analytics/subjects/:subject`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| subject analytics drill opens | Covered | Baseline | `tests/e2e/workflow/student-analytics-deep.spec.ts` |
| subject open action center visible | Covered | Baseline | `tests/e2e/workflow/student-analytics-deep.spec.ts` |
| subject practice CTA visible | Covered | Baseline | `tests/e2e/workflow/student-analytics-deep.spec.ts` |
| subject practice CTA preserves subject query | Covered | Baseline | `tests/e2e/workflow/student-analytics-deep.spec.ts` |
| subject drill from source detail preserves source and teacher scope | Covered | Baseline | `tests/e2e/workflow/student-analytics-scope-persistence-workspace.spec.ts` |
| subject open action center preserves source and teacher scope | Covered | Baseline | `tests/e2e/workflow/student-analytics-scope-persistence-workspace.spec.ts` |

### `/app/attempts`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| attempts page entry | Covered | Baseline | `tests/e2e/smoke/student-attempts.spec.ts` |
| attempt timeline / compare drillthroughs | Covered | Baseline | `tests/e2e/smoke/student-attempts.spec.ts` |
| attempts route remains reachable in the cross-browser post-submit lane | Covered | Baseline | `tests/e2e/workflow/student-cross-browser-attempts-summary.spec.ts` |

### `/app/results`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| results page loads | Covered | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| results route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/student-cross-browser-shell.spec.ts` |
| results page and analytics handoff remain reachable in the cross-browser deep-route lane | Covered | Baseline | `tests/e2e/workflow/student-cross-browser-analytics-results.spec.ts` |
| status filter | Covered | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| sort filter | Covered | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| group filter | Covered | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| reset filters | Covered | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| quick filter published | Covered | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| quick filter review ready | Covered | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| quick filter needs work | Covered | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| quick filter top score | Covered | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| quick filter fastest | Covered | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| quick filter group by source | Covered | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| quick filter all | Covered | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| grouped source layout matches the live first result card source | Covered | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| grouped review layout matches the live first result card review state | Covered | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| hero view analytics | Covered | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| hero open attempts | Covered | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| open attempt summary | Covered | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| review attempt | Covered | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |
| empty-state open exams | Covered | Baseline | `tests/e2e/workflow/student-results-workspace.spec.ts` |

### `/app/attempts/:id/summary`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| summary route opens from seeded post-submit data | Covered | Baseline | `tests/e2e/workflow/student-post-submit-workspace.spec.ts`, `tests/e2e/workflow/student-cross-browser-attempts-summary.spec.ts` |
| summary route remains reachable in the cross-browser post-submit lane | Covered | Baseline | `tests/e2e/workflow/student-cross-browser-attempts-summary.spec.ts` |
| summary route can hand off to results | Covered | Baseline | `tests/e2e/workflow/student-post-submit-workspace.spec.ts`, `tests/e2e/workflow/student-cross-browser-attempts-summary.spec.ts` |

### `/app/attempts/:id/review`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| review route opens when backend policy exposes learner review | Covered | Baseline | `tests/e2e/workflow/student-post-submit-workspace.spec.ts`, `tests/e2e/workflow/student-cross-browser-attempts-summary.spec.ts` |

### `/app/notifications`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| notifications page loads | Covered | Baseline | `tests/e2e/workflow/student-utility-workspace.spec.ts`, `tests/e2e/workflow/student-notifications-workspace.spec.ts` |
| notifications setup-required state stays truthful | Covered | Baseline | `tests/e2e/workflow/student-notifications-workspace.spec.ts` |
| notifications load-issue state stays truthful | Covered | Baseline | `tests/e2e/workflow/student-notifications-workspace.spec.ts` |
| notifications empty state open exams CTA | Covered | Baseline | `tests/e2e/workflow/student-utility-workspace.spec.ts`, `tests/e2e/workflow/student-notifications-workspace.spec.ts` |
| mark notification as read | Covered | Baseline | `tests/e2e/workflow/student-utility-workspace.spec.ts`, `tests/e2e/workflow/student-notifications-workspace.spec.ts` |
| mark all notifications as read | Covered | Baseline | `tests/e2e/workflow/student-utility-workspace.spec.ts`, `tests/e2e/workflow/student-notifications-workspace.spec.ts` |
| notifications search filter | Covered | Baseline | `tests/e2e/workflow/student-notifications-workspace.spec.ts` |
| notifications status filter | Covered | Baseline | `tests/e2e/workflow/student-utility-workspace.spec.ts`, `tests/e2e/workflow/student-notifications-workspace.spec.ts` |
| notifications group by type | Covered | Baseline | `tests/e2e/workflow/student-utility-workspace.spec.ts`, `tests/e2e/workflow/student-notifications-workspace.spec.ts` |
| notifications route handoff opens linked learner surface | Covered | Baseline | `tests/e2e/workflow/student-notifications-workspace.spec.ts` |
| notifications reset filters | Covered | Baseline | `tests/e2e/workflow/student-utility-workspace.spec.ts`, `tests/e2e/workflow/student-notifications-workspace.spec.ts` |

### `/app/profile`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| profile page loads | Covered | Baseline | `tests/e2e/workflow/student-utility-workspace.spec.ts`, `tests/e2e/workflow/student-mobile-sanity-workspace.spec.ts` |
| profile route is reachable from the mobile drawer | Covered | Baseline | `tests/e2e/workflow/student-mobile-sanity-workspace.spec.ts` |
| profile route remains reachable in the cross-browser shell lane | Covered | Baseline | `tests/e2e/workflow/student-cross-browser-shell.spec.ts` |

### `/app/exams/:id`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| exam detail route remains reachable in the cross-browser exam/runtime lane | Covered | Baseline | `tests/e2e/workflow/student-cross-browser-exam-runtime.spec.ts` |
| start disposable assigned exam | Covered | Mutable | `tests/e2e/workflow/student-attempt-mutable.spec.ts` |
| assigned admin-created platform `mock_exam` is visible to the student | Covered | Mutable | `tests/e2e/workflow/admin-exam-creation-advanced-student-attempt.mutable.spec.ts` |
| start disposable assigned admin-created platform `mock_exam` | Covered | Mutable | `tests/e2e/workflow/admin-exam-creation-advanced-student-attempt.mutable.spec.ts` |
| assigned institute-created `practice` exam is visible to the student | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts`, `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts` |
| assigned institute-created `quiz` exam is visible to the student | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts`, `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts` |
| assigned institute-created `mock_exam` exam is visible to the student | Covered | Mutable | `tests/e2e/workflow/institute-exam-creation-wizard-matrix.mutable.spec.ts`, `tests/e2e/workflow/institute-exam-creation-advanced-matrix.mutable.spec.ts` |

### `/app/attempts/:id`

| Action | Coverage | Mode | Spec |
| --- | --- | --- | --- |
| seeded attempt runtime route remains reachable in the cross-browser exam/runtime lane | Covered | Baseline | `tests/e2e/workflow/student-cross-browser-exam-runtime.spec.ts` |
| save answer | Covered | Mutable | `tests/e2e/workflow/student-attempt-mutable.spec.ts`, `tests/e2e/workflow/admin-exam-creation-advanced-student-attempt.mutable.spec.ts` |
| submit exam | Covered | Mutable | `tests/e2e/workflow/student-attempt-mutable.spec.ts`, `tests/e2e/workflow/admin-exam-creation-advanced-student-attempt.mutable.spec.ts` |

## Coverage gaps worth filling next

### High-value pending actions

- download/export assertions across additional surfaces when product export controls are added

### High-risk buttons still mostly visibility-only

- export/download actions on some results and reports surfaces

### Confirmed product gaps

- results workspace currently has no dedicated downloadable export CTA beyond the existing builder PDF popup flow
- reports surfaces currently have navigation and filter controls, but no real file export/download actions to automate yet

## How to use this map

- If a page action is marked `Covered`, the linked spec is the first place to inspect.
- If a page action is marked `Partial`, the page is automated but not every outcome branch is asserted.
- If a page action is marked `Pending`, it is a strong candidate for the next Playwright lane.

Related docs:

- [ROLE_MODULE_COVERAGE_MAP.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/ROLE_MODULE_COVERAGE_MAP.md)
- [REAL_DATA_INCREMENTAL_SCENARIO_ROUND.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/REAL_DATA_INCREMENTAL_SCENARIO_ROUND.md)
- [README.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/README.md)
