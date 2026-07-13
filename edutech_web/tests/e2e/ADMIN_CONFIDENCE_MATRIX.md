# Admin Confidence Matrix

Last updated: 2026-07-12

## Purpose

This document translates current Playwright admin coverage into a route-by-route confidence view.

It answers:

- how confident we are in each admin page today
- what kind of confidence that is
- where the remaining risk still sits
- what should be automated next before calling admin "release confident"

## How to read this

- `Baseline confidence` means route load, safe navigation, filters, dialogs, tabs, and handoffs are exercised.
- `Mutable confidence` means disposable real-data create/update/delete or lifecycle-changing actions are covered.
- `Confidence score` is a practical engineering score, not a guarantee.
- Scores are intentionally conservative.

## Confidence scale

| Score | Meaning |
| --- | --- |
| `90-100` | strong regression confidence for current shipped behavior |
| `80-89` | good confidence, but some deep paths or edge cases remain |
| `70-79` | decent workflow confidence, still missing important mutation or error-path depth |
| `60-69` | page is meaningfully covered, but not signoff-ready for risky changes |
| `<60` | still too shallow for confidence claims |

## Admin route matrix

| Route | Baseline | Mutable | Confidence | Why | Biggest remaining risk |
| --- | --- | --- | ---: | --- | --- |
| `/admin` | Strong | N/A | 90 | Dashboard filters and key handoffs are covered well. | No repeated-run stability proof yet. |
| `/admin/dashboard` | Strong | N/A | 95 | Alias redirect is simple and verified. | Very low risk. |
| `/admin/search` | Strong | N/A | 88 | Search/filter/group/reset and result handoff are covered. | Search-result diversity and unusual datasets. |
| `/admin/settings` | Strong | Strong | 88 | Summary panels, handoffs, and mutable settings guardrails are browser-proven. | Lower-frequency edit combinations still need deeper negative-path proof. |
| `/admin/institutes` | Strong | Strong | 92 | Directory, detail panel, modals, hero handoffs, sparse-edit handling, and disposable CRUD are covered. | Login/account edge cases and unusual institute data combinations. |
| `/admin/reports` | Strong | N/A | 82 | Filters, quick slices, visibility panels, and hero handoffs are covered. | No true export/download lane because product CTA is missing. |
| `/admin/security` | Strong | N/A | 84 | Filters, page size, watch flow, posture panels, and hero handoffs are covered. | Real alert-state permutations and operational actions beyond viewing. |
| `/admin/economy` | Strong | Strong | 87 | Safe validation, support-ops workflows, question-bank package visibility, entitlement recovery, API audit, and mutable economy guardrails are browser-proven. | Higher-volume operator cases and broader catalog/policy permutations still need more depth. |
| `/admin/exams` | Strong | Strong | 89 | Filters, quick chips, zero-state, handoffs, create guardrails, and exam management coverage are broad. | Data-shape variation across exam sources and states. |
| `/admin/exams/new` | Strong | N/A | 84 | Wizard movement and control surfaces are covered well. | Final creation is not baseline-mutated here by design. |
| `/admin/exams/advanced` | Strong | Strong | 90 | Stage switching, local composition, autofill, template actions, and mutable advanced-builder creation flows are covered. | More unusual preset/family interactions and long-form authoring combinations. |
| `/admin/exams/preset-packs` | Strong | Strong | 89 | Search/filter/deep-link plus disposable managed-pack edit/archive coverage exists. | Library behavior under large inventories or mixed ownership states. |
| `/admin/exams/:id` | Strong | Strong | 90 | Detail handoffs plus disposable lifecycle, access-key, and policy actions are covered. | Real backend state transitions across more status combinations. |
| `/admin/exams/:id/builder` | Strong | Strong | 90 | Step rail, question mapping, assignment tab, delivery handoff, and disposable builder mutations are covered. | Broader form permutations and unusual section/question mixes. |
| `/admin/academic-setup` | Strong | Strong | 91 | Section switching, add dialogs, defaults panel, onboarding profiles, validation, recovery, roster bootstrap, and disposable academic CRUD are covered. | More edge validation across all entity types and dependency chains. |
| `/admin/people` | Strong | Strong | 89 | Scope switching, dialogs, exports, and disposable roster/login/import flows are covered. | More negative-path validation and mixed login states. |

## Page-by-page notes

### Highest confidence admin routes

- `/admin/dashboard`
  - Small surface, clear handoffs, low ambiguity.
- `/admin/exams/:id`
  - Strong baseline plus meaningful mutable lifecycle coverage.
- `/admin/exams/:id/builder`
  - Strong baseline plus meaningful mutable builder coverage.
- `/admin/academic-setup`
  - Strong baseline plus disposable CRUD depth across core setup entities.

### Strong but not fully signoff-safe yet

- `/admin/reports`
  - Coverage is good for filters and navigation, but product lacks true export actions.
- `/admin/economy`
  - Coverage is now materially better than earlier reads because browser proof includes question-bank package visibility, entitlement restoration, mixed onboarding support paths, API-audit assertions, and mutable guardrails.
  - It is still not fully signoff-safe for all catalog, policy, and high-volume operator combinations.
- `/admin/institutes`
  - Confidence rose after fixing and browser-proving sparse edit behavior, optional-field clearing, and minimal patch payload handling on the institute form.
- `/admin/academic-setup`
  - Confidence rose because onboarding is no longer only a simple preset apply lane; blank, profile-driven, validation, recovery, roster bootstrap, and mixed institute onboarding are now browser-proven.
- `/admin/search`
  - Good core workflow coverage, but search confidence always depends on dataset variation.

### Why admin is not 100% yet

- Negative-path coverage is still thinner than happy-path coverage on several forms.
- Some module confidence still depends on single heavy workflows rather than broad matrix coverage.
- Repeated-run flake resistance has not been measured formally for the full admin lane.
- Cross-browser admin sanity exists, but it is not yet weighted directly into this confidence score.
- Large-data, concurrency, and long-session admin behavior still need dedicated proof.

## Admin confidence summary

| Area | Confidence |
| --- | ---: |
| Admin baseline workflow confidence | 90 |
| Admin mutable workflow confidence | 87 |
| Admin release-signoff confidence overall | 88 |

## What would raise confidence next

### Fastest confidence gains

1. Run the full admin suite multiple times on the same seeded dataset and record stability.
2. Add more negative-path validation checks on forms with real backend responses.
3. Add page-level API-audit assertions where admin screens are operationally dense.
4. Expand mutable coverage only where baseline is strong but destructive or persistence behavior is still thin.

### Best next route targets

1. `/admin/people`
   - add more validation/error-state assertions
   - widen login lifecycle edge-case checks
2. `/admin/economy`
   - deepen controlled real mutation lanes with disposable or reversible data
   - widen support-ops and package/feature lifecycle permutations
3. `/admin/reports`
   - add export automation as soon as the product exposes real export/download CTAs
4. `/admin/security`
   - add more state-permutation and operator-action proof

## Practical signoff recommendation

- For normal UI regression protection on admin: confidence is strong.
- For "safe to refactor admin UI" confidence: yes, mostly.
- For "safe to change backend contracts without surprises" confidence: moderate, not complete.
- For "release with no further admin automation work at all": acceptable for pilot-level admin confidence, but not ideal if a release is heavily admin-focused or operationally dense.

## Related docs

- [PAGE_ACTION_COVERAGE_MAP.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/PAGE_ACTION_COVERAGE_MAP.md)
- [ROLE_MODULE_COVERAGE_MAP.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/ROLE_MODULE_COVERAGE_MAP.md)
