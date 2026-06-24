# Admin Confidence Matrix

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
| `/admin/settings` | Strong | N/A | 86 | Summary panels and people/academics handoffs are covered. | Mostly informational page, but still no backend-mutation depth. |
| `/admin/institutes` | Strong | Strong | 89 | Directory, detail panel, modals, hero handoffs, and disposable CRUD are covered. | Login/account edge cases and unusual institute data combinations. |
| `/admin/reports` | Strong | N/A | 82 | Filters, quick slices, visibility panels, and hero handoffs are covered. | No true export/download lane because product CTA is missing. |
| `/admin/security` | Strong | N/A | 84 | Filters, page size, watch flow, posture panels, and hero handoffs are covered. | Real alert-state permutations and operational actions beyond viewing. |
| `/admin/economy` | Strong | Limited | 80 | Safe validation, refresh action, and visibility coverage are good. | Real grant/update flows are still intentionally shallow. |
| `/admin/exams` | Strong | N/A | 88 | Filters, quick chips, zero-state, and handoffs to detail, builder, presets, setup, and create are covered. | Data-shape variation across exam sources and states. |
| `/admin/exams/new` | Strong | N/A | 84 | Wizard movement and control surfaces are covered well. | Final creation is not baseline-mutated here by design. |
| `/admin/exams/advanced` | Strong | Strong | 88 | Stage switching, local composition, autofill, template actions, and mutable template bundle flows are covered. | More unusual preset/family interactions and long-form authoring combinations. |
| `/admin/exams/preset-packs` | Strong | Strong | 89 | Search/filter/deep-link plus disposable managed-pack edit/archive coverage exists. | Library behavior under large inventories or mixed ownership states. |
| `/admin/exams/:id` | Strong | Strong | 90 | Detail handoffs plus disposable lifecycle, access-key, and policy actions are covered. | Real backend state transitions across more status combinations. |
| `/admin/exams/:id/builder` | Strong | Strong | 90 | Step rail, question mapping, assignment tab, delivery handoff, and disposable builder mutations are covered. | Broader form permutations and unusual section/question mixes. |
| `/admin/academic-setup` | Strong | Strong | 90 | Section switching, add dialogs, defaults panel, and disposable academic CRUD are covered. | More edge validation across all entity types and dependency chains. |
| `/admin/people` | Strong | Strong | 88 | Scope switching, dialogs, exports, and disposable roster/login/import flows are covered. | More negative-path validation and mixed login states. |

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
  - Safe validations and visibility are covered, but higher-risk money-like mutations are still intentionally shallow.
- `/admin/search`
  - Good core workflow coverage, but search confidence always depends on dataset variation.

### Why admin is not 100% yet

- Some pages are strong only at the safe baseline layer.
- Negative-path coverage is thinner than happy-path coverage.
- Repeated-run flake resistance has not been measured formally for the full admin lane.
- Cross-browser proof is not part of the current confidence number.

## Admin confidence summary

| Area | Confidence |
| --- | ---: |
| Admin baseline workflow confidence | 89 |
| Admin mutable workflow confidence | 82 |
| Admin release-signoff confidence overall | 86 |

## What would raise confidence next

### Fastest confidence gains

1. Run the full admin suite multiple times on the same seeded dataset and record stability.
2. Add more negative-path validation checks on forms with real backend responses.
3. Expand mutable coverage only where baseline is strong but destructive or persistence behavior is still thin.

### Best next route targets

1. `/admin/people`
   - add more validation/error-state assertions
   - widen login lifecycle edge-case checks
2. `/admin/institutes`
   - deepen institute-admin account-management outcomes
3. `/admin/economy`
   - if product allows, add controlled real mutation lanes with disposable or reversible data
4. `/admin/reports`
   - add export automation as soon as the product exposes real export/download CTAs

## Practical signoff recommendation

- For normal UI regression protection on admin: confidence is strong.
- For "safe to refactor admin UI" confidence: yes, mostly.
- For "safe to change backend contracts without surprises" confidence: moderate, not complete.
- For "release with no further admin automation work at all": acceptable, but not ideal if a release is heavily admin-focused.

## Related docs

- [PAGE_ACTION_COVERAGE_MAP.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/PAGE_ACTION_COVERAGE_MAP.md)
- [ROLE_MODULE_COVERAGE_MAP.md](/Users/ansh/Documents/Eductech/edutech_web/tests/e2e/ROLE_MODULE_COVERAGE_MAP.md)
