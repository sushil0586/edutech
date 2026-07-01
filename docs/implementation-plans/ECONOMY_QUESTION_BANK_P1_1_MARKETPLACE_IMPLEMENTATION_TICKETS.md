# Economy Question-Bank P1-1 Marketplace Implementation Tickets

## Purpose

This document converts `P1-1` marketplace experience into practical implementation tickets.

It assumes the current `P0` foundation is already in place:

- package management exists
- plan-to-package links exist
- institute request and activation flow exists
- package reporting/export exists

What is missing is the product-facing commercial presentation layer.

References:

- [ECONOMY_QUESTION_BANK_P1_EXECUTION_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/ECONOMY_QUESTION_BANK_P1_EXECUTION_PLAN.md:1)
- [FINAL_ECONOMY_QUESTION_BANK_GAP_BACKLOG.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/FINAL_ECONOMY_QUESTION_BANK_GAP_BACKLOG.md:1)
- [REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/REFERRAL_WALLET_SUBSCRIPTION_PRODUCT_PLAN.md:1)
- [QUESTION_BANK_PACKAGE_AND_ENTITLEMENT_SCHEMA_SPEC.md](/Users/ansh/Documents/Eductech/docs/reference/QUESTION_BANK_PACKAGE_AND_ENTITLEMENT_SCHEMA_SPEC.md:1)

---

## Outcome Target

At the end of `P1-1`:

- platform admins can present package lanes like a catalog, not raw scope rows
- institute admins can understand what each plan/package actually unlocks
- support and onboarding conversations can use product UI instead of code/code-like labels

---

## Size

Overall size:

- `Moderate`

This is mostly:

- read-model enrichment
- UI presentation work
- taxonomy and labeling normalization
- minimal backend read endpoints where current list payloads are too raw

This is not a model rewrite.

---

## Ticket Order

Recommended execution order:

1. `P1-1A` marketplace read model
2. `P1-1B` admin catalog cards
3. `P1-1C` institute catalog summary
4. `P1-1D` plan comparison and commercial framing
5. `P1-1E` family grouping and recommendation
6. `P1-1F` QA and automation closeout

---

## P1-1A. Marketplace Read Model

### Goal

Create a consistent product-facing package presentation shape.

### Why first

The current package data is structurally correct but still too raw:

- code-heavy
- scope-heavy
- not commercial enough

We need one shared presenter/serializer contract before polishing admin and institute views separately.

### Scope

Add or enrich backend/frontend read models so package cards can render:

- package display title
- package subtitle
- package type label
- ownership label
- access mode label
- public/private label
- coverage summary
- plan linkage summary
- commercial framing badges

### Suggested output fields

- `display_name`
- `package_family_label`
- `coverage_summary`
- `program_count`
- `subject_count`
- `topic_count`
- `commercial_labels`
- `plan_count`
- `default_plan_count`
- `recommended_for_labels`

### Acceptance

- one shared data contract exists for marketplace-style package presentation
- admin and institute surfaces can consume the same package-summary shape

---

## P1-1B. Admin Catalog Cards

### Goal

Give platform admins a catalog view that explains package value visually.

### Scope

Extend `/admin/economy` with package catalog cards that show:

- package name and code
- package type
- access mode
- ownership type
- public/private status
- coverage summary
- linked plan count
- active entitlement count
- usage posture

### UX requirements

- should be scannable
- should not feel like an internal table dump
- should still preserve operator truth

### Acceptance

- platform admin can inspect package catalog at a glance
- package value is legible without opening scope rows

---

## P1-1C. Institute Catalog Summary

### Goal

Make institute-side package access understandable before or after subscription activation.

### Scope

Improve `/institute/economy` so package-bearing plans and active package lanes feel like a storefront summary.

### Deliverables

- package summary cards for active entitlements
- package preview summary for requestable plans
- “what this plan unlocks” copy
- cleaner lane between:
  - requested
  - active
  - paused
  - expired

### Important rule

Institute admins should be able to answer:

- what would this plan give us?
- what do we already have?
- what is pending approval?

without interpreting raw package codes.

### Acceptance

- institute users can understand package outcomes before submitting a request
- active package lanes feel commercially understandable, not technical

---

## P1-1D. Plan Comparison and Commercial Framing

### Goal

Show how plans differ commercially.

### Scope

Add plan/package comparison presentation with:

- included packages
- optional add-on packages
- trial lanes
- quota-limited vs full-scope distinction
- plan cycle context

### Deliverables

- comparison table or comparison cards
- clear badges:
  - `Included`
  - `Optional Add-on`
  - `Trial`
  - `Quota Limited`
  - `Full Scope`
- cycle framing:
  - monthly
  - quarterly
  - yearly

### Acceptance

- plan differences are visible in UI
- package-bearing plan selection is understandable during onboarding/request flow

---

## P1-1E. Family Grouping and Recommendation

### Goal

Help users navigate packages by assessment family instead of only by package code.

### Scope

Introduce grouping/recommendation labels like:

- school
- competitive
- certification
- language

### Important note

This must stay config-first.

Do not hardcode behavior by package code.
Prefer:

- package metadata
- package scope inference
- plan/package presenter logic

### Deliverables

- family labels on package cards
- recommended-use labels
- optional grouped sections in catalog views

### Acceptance

- package catalog is navigable by commercial/academic family
- onboarding and support conversations can reference family groups naturally

---

## P1-1F. QA and Automation Closeout

### Goal

Protect the new marketplace layer with regression coverage.

### Scope

Add or extend Playwright checks for:

- admin economy catalog presentation
- institute economy plan/package visibility
- requestable plan summary clarity
- activation result continuity

### Suggested test areas

- package card shows readable labels
- requestable plan shows package summary
- fulfilled request still lines up with visible package cards
- filters do not break export/report actions already added in `P0`

### Acceptance

- marketplace presentation is regression-protected
- commercial labeling changes do not silently break existing economy flows

---

## Suggested Delivery Phases

### Phase 1

- `P1-1A`
- `P1-1B`

Outcome:

- platform admin gets a real package catalog view first

### Phase 2

- `P1-1C`
- `P1-1D`

Outcome:

- institute-side request and entitlement visibility becomes commercially understandable

### Phase 3

- `P1-1E`
- `P1-1F`

Outcome:

- family grouping and automation close the marketplace lane

---

## Risks

### Risk 1. Over-designing before catalog truth is stable

Mitigation:

- reuse current package and plan data
- prefer additive presenters over new business logic

### Risk 2. Hardcoding family grouping

Mitigation:

- use metadata/presenter rules
- do not branch core logic by package code

### Risk 3. Duplicating package truth across admin and institute views

Mitigation:

- create one shared presentation contract first

---

## Success Definition

`P1-1` is complete when:

- package access looks like a real catalog
- plan/package differences are obvious
- institute users understand package value before requesting activation
- platform users can explain commercial package lanes from product UI alone

Until then, the system is commercially functional but not yet marketplace-ready.
