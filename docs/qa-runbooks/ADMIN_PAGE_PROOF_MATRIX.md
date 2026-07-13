# Admin Page Proof Matrix

Last updated: 2026-07-09

## Purpose

This matrix maps each major admin route to:

- its current page implementation
- current Playwright proof
- mutable proof, where applicable
- visual review status
- remaining confidence gaps

Use it to answer:

1. what is already browser-proven on this admin page
2. whether that proof is read-only, mutable, or grouped end-to-end
3. which pages still block honest admin `9.5/10` confidence

Related documents:

- [ADMIN_9_5_CONFIDENCE_EXECUTION_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/ADMIN_9_5_CONFIDENCE_EXECUTION_BOARD.md)
- [ADMIN_BROWSER_GAP_BOARD.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/ADMIN_BROWSER_GAP_BOARD.md)
- [OVERALL_PRODUCT_CONFIDENCE_MATRIX.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/OVERALL_PRODUCT_CONFIDENCE_MATRIX.md)

---

## Status Legend

- `Strong`: current browser proof is materially good for this page
- `Medium-high`: page is healthy, but proof is still thinner than the strongest admin lanes
- `Visual reviewed`: current desktop screenshot pass completed and any discovered friction from this pass is fixed
- `Visual pending`: functional proof exists, but desktop visual review is not yet closed

---

## Route Matrix

| Route | Page file | Main current proof | Mutable / deeper proof | Visual status | Current read | Main residual |
| --- | --- | --- | --- | --- | --- | --- |
| `/admin` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/page.tsx) | [admin-dashboard-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-dashboard-workspace.spec.ts), [admin-dashboard-redirect.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-dashboard-redirect.spec.ts), [admin-workflows.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/smoke/admin-workflows.spec.ts) | [admin-cross-browser-shell.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-cross-browser-shell.spec.ts), [admin-cross-browser-deep-routes.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-cross-browser-deep-routes.spec.ts) | `Visual reviewed` | `Strong` | grouped operable-controls proof and long-tail dashboard interpretation are still worth one broader signoff pass, but the central hub contract is now screenshot-reviewed and no longer missing its command-deck layer |
| `/admin/dashboard` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/dashboard/page.tsx) | [admin-dashboard-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-dashboard-workspace.spec.ts) | grouped shell/deep-route proof above | `Visual reviewed` | `Strong` | legacy redirect route is fine; the real `/admin` hub now carries the screenshot-reviewed hierarchy and command-deck recovery |
| `/admin/institutes` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/institutes/page.tsx) | [admin-institutes-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-institutes-workspace.spec.ts), [admin-institutes-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-institutes-timing.spec.ts) | [admin-institutes-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-institutes-mutable.spec.ts), [admin-mixed-institute-onboarding.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-mixed-institute-onboarding.mutable.spec.ts), [admin-multi-institute-pilot.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-multi-institute-pilot.mutable.spec.ts) | `Visual reviewed` | `Strong` | lower-support institute recovery, comparison clarity, and grouped operable-controls signoff pack are still worth one final combined rerun |
| `/admin/people` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/people/page.tsx) | [admin-people-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-people-workspace.spec.ts), [admin-people-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-people-timing.spec.ts) | [admin-roster-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-roster-mutable.spec.ts), [admin-roster-import-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-roster-import-mutable.spec.ts) | `Visual reviewed` | `Strong` | dense filters, account-state explanation, and import recovery still need one grouped people/roster signoff pack, but the desktop toolbar and roster surface are now screenshot-reviewed and structurally cleaner |
| `/admin/economy` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/economy/page.tsx) | [admin-economy-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-economy-workspace.spec.ts), [admin-economy-browser-coverage.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-economy-browser-coverage.spec.ts), [admin-economy-navigation.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-economy-navigation.spec.ts), [admin-economy-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-economy-timing.spec.ts) | [admin-economy-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-economy-mutable.spec.ts), [admin-economy-cross-role-package-propagation.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-economy-cross-role-package-propagation.mutable.spec.ts), [admin-package-scope-expansion-institute-linker.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-package-scope-expansion-institute-linker.mutable.spec.ts), [admin-package-scope-recovery-institute-linked.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-package-scope-recovery-institute-linked.mutable.spec.ts), [admin-institute-subscription-request.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-institute-subscription-request.mutable.spec.ts) | `Visual reviewed` | `Strong` | highest conceptual-density page; remaining gap is now more about low-support wording and grouped full-lane reruns than raw UI alignment |
| `/admin/academic-setup` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/academic-setup/page.tsx) | [admin-academic-setup-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-academic-setup-workspace.spec.ts) | [admin-academic-setup-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-academic-setup-mutable.spec.ts) | `Visual reviewed` | `Strong` | write-path confidence breadth and setup mental-model proof are still thinner than economy/exams, but the desktop section rail and scope band are now screenshot-reviewed and cleaner |
| `/admin/exams` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/exams/page.tsx) | [admin-exams-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exams-workspace.spec.ts), [admin-exams-create-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exams-create-workspace.spec.ts), [admin-workflows.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/smoke/admin-workflows.spec.ts) | grouped exam creation/release specs below | `Visual reviewed` | `Strong` | dataset-aware empty/filter states and long-tail status interpretation still need a grouped signoff pass, but the current desktop contract is now screenshot-reviewed and cleaner |
| `/admin/exams/new` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/exams/new/page.tsx) | [admin-exams-create-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exams-create-workspace.spec.ts) | [admin-exam-creation-wizard-matrix.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exam-creation-wizard-matrix.mutable.spec.ts), [admin-exam-assignment-mode-matrix.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exam-assignment-mode-matrix.mutable.spec.ts), [admin-exam-policy-security-matrix.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exam-policy-security-matrix.mutable.spec.ts) | `Visual pending` | `Strong` | needs grouped rerun against current wizard labels/contracts to support full admin `9.5` signoff |
| `/admin/exams/[examId]` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/exams/[examId]/page.tsx) | [admin-exam-detail-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exam-detail-workspace.spec.ts) | [admin-exam-detail-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exam-detail-mutable.spec.ts), results-contract specs such as [admin-neet-results-contract.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-neet-results-contract.spec.ts), [admin-jee-results-contract.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-jee-results-contract.spec.ts), [admin-gre-results-contract.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-gre-results-contract.spec.ts), [admin-aws-results-contract.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-aws-results-contract.spec.ts) | `Visual pending` | `Strong` | long-tail publish/review/result states are good but still spread across many specs rather than one grouped detail pack |
| `/admin/exams/[examId]/builder` | builder route rendered from exam builder surface | [admin-exam-builder-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exam-builder-workspace.spec.ts) | [admin-exam-builder-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exam-builder-mutable.spec.ts), [admin-family-guided-persistence.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-family-guided-persistence.mutable.spec.ts), [admin-family-immediate-release.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-family-immediate-release.mutable.spec.ts), [admin-family-release-happy-path.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-family-release-happy-path.mutable.spec.ts) | `Visual pending` | `Strong` | broader grouped release/runtime proof is still needed outside the advanced-builder lane |
| `/admin/exams/advanced` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/exams/advanced/page.tsx) | [admin-advanced-builder-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-advanced-builder-workspace.spec.ts) | [admin-exam-creation-advanced-matrix.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exam-creation-advanced-matrix.mutable.spec.ts), [admin-exam-creation-advanced-student-attempt.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exam-creation-advanced-student-attempt.mutable.spec.ts), [admin-advanced-builder-templates-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-advanced-builder-templates-mutable.spec.ts) | `Visual pending` | `Strong` | strongest seeded admin lane now, but still should stay in grouped reruns as a signoff anchor |
| `/admin/exams/preset-packs` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/exams/preset-packs/page.tsx) | [admin-preset-pack-library.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-preset-pack-library.spec.ts), [admin-family-preset-packs.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-family-preset-packs.spec.ts) | [admin-preset-pack-library-mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-preset-pack-library-mutable.spec.ts), [admin-preset-library-persistence.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-preset-library-persistence.mutable.spec.ts), [admin-family-preset-persistence.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-family-preset-persistence.mutable.spec.ts) | `Visual pending` | `Strong` | good functional proof, but visual consistency and low-support teachability still need desktop review |
| `/admin/reports` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/reports/page.tsx) | [admin-reports-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-reports-workspace.spec.ts), [admin-reports-browser-coverage.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-reports-browser-coverage.spec.ts), [admin-reports-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-reports-timing.spec.ts) | results-contract and multi-subject proof via [admin-multi-subject-results-contract.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-multi-subject-results-contract.spec.ts) | `Visual reviewed` | `Strong` | report interpretation, dataset-aware edge states, and one grouped “visible controls stay operable across lanes” pack are still the main residual |
| `/admin/search` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/search/page.tsx) | [admin-search-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-search-workspace.spec.ts), [admin-search-browser-coverage.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-search-browser-coverage.spec.ts) | deep-route grouped proof via [admin-cross-browser-deep-routes.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-cross-browser-deep-routes.spec.ts) | `Visual reviewed` | `Strong` | discoverability depth and populated result-intent edge states still deserve grouped follow-up, but the current desktop search contract is screenshot-reviewed and structurally clear |
| `/admin/security` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/security/page.tsx) | [admin-security-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-security-workspace.spec.ts), [admin-security-browser-coverage.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-security-browser-coverage.spec.ts), [admin-security-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-security-timing.spec.ts) | exam-policy-security overlap via [admin-exam-policy-security-matrix.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-exam-policy-security-matrix.mutable.spec.ts) | `Visual reviewed` | `Strong` | dense policy interpretation and broader mutation/recovery breadth still need one grouped signoff pack, but the current desktop control surface is now screenshot-reviewed and structurally tighter |
| `/admin/settings` | [page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(admin)/admin/settings/page.tsx) | [admin-settings-workspace.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-settings-workspace.spec.ts), [admin-settings-browser-coverage.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-settings-browser-coverage.spec.ts), [admin-settings-timing.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-settings-timing.spec.ts) | grouped shell/deep-route proof above | `Visual reviewed` | `Strong` | lower-frequency but still critical operator edits now look structurally healthier, but still need one broader wording/recovery pass before calling the route fully self-serve-safe |

---

## Cross-Cutting Proof Clusters

These spec groups do not belong to only one route, but materially increase admin confidence across multiple pages:

- Onboarding and multi-institute realism
  - [admin-onboarding-types.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-onboarding-types.mutable.spec.ts)
  - [admin-mixed-institute-onboarding.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-mixed-institute-onboarding.mutable.spec.ts)
  - [admin-multi-institute-pilot.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-multi-institute-pilot.mutable.spec.ts)

- Dense package-scope and entitlement recovery
  - [admin-package-scope-expansion-institute-linker.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-package-scope-expansion-institute-linker.mutable.spec.ts)
  - [admin-package-scope-recovery-institute-linked.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-package-scope-recovery-institute-linked.mutable.spec.ts)
  - [admin-institute-question-bank-feature-recovery.mutable.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-institute-question-bank-feature-recovery.mutable.spec.ts)

- Family-aware exam and result contracts
  - [admin-family-authoring-contracts.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-family-authoring-contracts.spec.ts)
  - [admin-family-guided-create-defaults.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-family-guided-create-defaults.spec.ts)
  - [admin-multi-subject-contract.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-multi-subject-contract.spec.ts)
  - [admin-neet-results-contract.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-neet-results-contract.spec.ts)
  - [admin-jee-results-contract.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-jee-results-contract.spec.ts)
  - [admin-gre-results-contract.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-gre-results-contract.spec.ts)
  - [admin-aws-results-contract.spec.ts](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/workflow/admin-aws-results-contract.spec.ts)

---

## Current Honest Read

What is already true:

- every major admin page now has at least one obvious proof anchor
- the advanced-builder seeded mutable lane is no longer a confidence hole
- the heaviest admin pages, especially `economy`, `institutes`, `people`, and `exams`, have both workspace and mutable coverage
- targeted desktop review is now closed for:
  - `dashboard`
  - `economy`
  - `institutes`
  - `people`
  - `academic-setup`
  - `exams`
  - `reports`
  - `search`
  - `security`
  - `settings`

What is not yet true:

- desktop visual review is still not closed across:
  - exam subroutes such as `new`, `detail`, `builder`, and `preset-packs`
- page-by-page grouped signoff packs are still thinner than the strongest single-surface proofs
- the remaining admin gap is now less about obvious desktop alignment and more about:
  - grouped operable-controls proof
  - mutation/recovery breadth
  - lower-support wording truth on dense pages

Practical implication:

- admin can be called `9/10` with confidence today
- this matrix is the artifact we use to push the remaining pages toward honest `9.5/10` confidence instead of assuming broad strength equals blanket completeness
