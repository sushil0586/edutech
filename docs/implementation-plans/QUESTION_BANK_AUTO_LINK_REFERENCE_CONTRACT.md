# Question Bank Auto-Link Reference Contract

## Objective

Define a safe onboarding and package-assignment model where institutes can receive question-bank access and optional auto-linking **without duplicating question content rows**.

This contract is specifically for:

- platform-owned shared/master question library
- institute package assignment through economy
- optional onboarding-time auto-link behavior
- idempotent reruns
- future package upgrades/downgrades

## Core Principle

The system must **not copy question content** into a second question row during onboarding auto-population.

Instead:

- the master/shared question remains the source of truth
- the institute receives entitlement to the package
- optional auto-link creates only **reference/link records** to master-question primary keys

## Current Problems Observed

### 1. Data bug: duplicated Science master rows

Current Science packs contain duplicated master rows for some topics.

Observed example:

- `SCI-MATTER-ACIDBASE`
- `SCI-LIFE-PLANTS`
- `SCI-LIFE-TRANSPORT`
- `SCI-MOTION-MOTION`

Expected:

- `50 distinct questions per topic`

Observed:

- `100 rows per topic`
- effectively `50 distinct x 2`

This is a seed-idempotency issue and must be fixed before rollout of auto-link-onboarding.

### 2. Product ambiguity: access vs linked local questions

Today, onboarding/package assignment grants:

- academic preset data
- question-bank entitlement
- optional feature entitlement

But it does **not** auto-link shared-library questions into the institute question bank.

This causes confusion because operators may assume:

- "assigned package" = "questions already loaded into institute bank"

Current actual behavior:

- "assigned package" = "questions are eligible for access/linking"

## Desired Modes

### 1. `access_only`

Behavior:

- create/update entitlement only
- create/update shared-library feature access if requested
- do not create any institute question-link records

Use when:

- institute wants a clean workspace
- staff should manually choose what to link

### 2. `auto_link_selected_scope`

Behavior:

- create/update entitlement
- create/update shared-library feature access
- automatically create reference links for all eligible master questions in the selected scope

Use when:

- institute should receive a ready-to-use bank immediately

### 3. `auto_link_selected_scope_with_limit`

Behavior:

- create/update entitlement
- create/update shared-library feature access
- automatically create reference links only up to deterministic package limits
- limit should be evaluated **after excluding already-linked questions**

Use when:

- institute should receive a curated starter set, not the full scope

## Non-Negotiable Rule

Auto-link must create **reference links only**, not duplicate question rows.

## Recommended Data Model Contract

### Existing truth layers

1. `MasterQuestion`

- canonical platform/shared question
- owns the actual content

2. `QuestionBankPackage`

- commercial/scope definition

3. `InstituteQuestionEntitlement`

- institute-level package access

4. `InstituteQuestionFeatureEntitlement`

- feature gates such as `QUESTION_BANK_SHARED_LIBRARY`

5. `InstituteQuestionAccess`

- this should be the primary auto-link/reference layer
- one institute-specific link to one master question

## Required Uniqueness Rule

For institute auto-link behavior, enforce:

- one active institute link per `institute + master_question`

Recommended constraint:

- unique live constraint on `InstituteQuestionAccess(institute, master_question)`

If current schema already approximates this, confirm and harden it.

If not, add:

- unique DB constraint for live rows
- service-level idempotent guard

## Required Service Rules

### Auto-link selection algorithm

For each eligible master question:

1. resolve institute entitlement
2. resolve matching package scopes
3. filter by package scope
4. filter by quota/limit if applicable
5. skip if already linked for the institute
6. create reference link only

### Deterministic ordering

Auto-link must be deterministic, so reruns behave predictably.

Recommended order:

1. subject sort order
2. topic sort order
3. seed sequence from metadata if available
4. created_at / id fallback

### Rerun behavior

If onboarding is rerun:

- already-linked master-question ids must be skipped
- only newly eligible questions should be linked
- counts must remain stable for unchanged scope

### Limit behavior

For `auto_link_selected_scope_with_limit`:

- do not count already-linked questions twice
- if limit is `50 per topic`, and `20` are already linked, only `30` new links may be created

## Package Scope vs Auto-Link Scope

Important distinction:

- package scope defines what is eligible
- auto-link mode defines what is materialized as institute links

That means:

- a package may expose `500` eligible questions
- auto-link-with-limit may materialize only `200`

This is valid and should be visible in UI.

## Recommended UI Copy

Avoid ambiguous wording like:

- "questions loaded"
- "questions copied"

Use clear wording:

- `Access granted`
- `Shared-library feature enabled`
- `Auto-linked references created`
- `Eligible questions`
- `Linked questions`
- `Remaining auto-link quota`

## Recommended Admin/Onboarding Controls

### In onboarding defaults / master defaults

Add:

- `question_bank_assignment_mode`

Allowed values:

- `access_only`
- `auto_link_selected_scope`
- `auto_link_selected_scope_with_limit`

Optional supporting fields:

- `auto_link_limit_mode`
  - `respect_package_scope_limits`
  - `explicit_fixed_limit`
- `auto_link_fixed_total`
- `auto_link_fixed_per_topic`

Recommended first implementation:

- only support:
  - `access_only`
  - `auto_link_selected_scope_with_limit`
- and always respect package scope limits

This keeps the product simpler and safer.

## Recommended UI Status Surface

For each institute/package row, show:

- entitlement status
- feature status
- package scope summary
- eligible master-question count
- linked institute-question count
- remaining linkable count
- last auto-link run status

## Safe Revoke/Downgrade Rules

When package access is revoked or downgraded:

### Option A: soft access freeze

- keep existing linked references
- mark them inaccessible if entitlement becomes inactive

Pros:

- preserves history and exam traceability

### Option B: unlink inactive references

- deactivate institute access rows outside the valid scope

Pros:

- cleaner visible question bank

Recommended approach:

- use **soft access freeze** first
- do not hard-delete links automatically

## Required Seed/Data Fix Before Auto-Link Rollout

### Science dedupe

Before enabling onboarding auto-link:

1. identify all duplicated Science master rows
2. dedupe by:
   - source institute
   - source topic
   - seed batch
   - seed sequence
   - or content signature fallback
3. keep one canonical master row
4. remove or deactivate duplicates safely

### Seed command hardening

The curated Science public-hub seed flow must be idempotent.

Current likely risky path:

- `seed_curated_class7_science_from_markdown`
- `seed_curated_math_science_questions`

Problem:

- re-running creates new local `Question` rows
- each local row syncs another `MasterQuestion`

Required fix:

- public-hub curated seed must upsert by stable seed identity
- not append by default

## Implementation Phases

### Phase 1. Fix source data correctness

- dedupe duplicated Science master rows
- make Science public-hub seeding idempotent
- verify each target topic has exact intended counts

Acceptance:

- every selected Science topic returns expected distinct question count
- rerunning seed does not increase counts

### Phase 2. Formalize reference-link contract

- document exact role of `InstituteQuestionAccess`
- add/verify uniqueness constraint for `institute + master_question`
- add idempotent link service

Acceptance:

- rerunning link operation never creates duplicate institute links

### Phase 3. Add onboarding assignment mode

- add `question_bank_assignment_mode`
- wire into master defaults + preset apply service

Acceptance:

- operators can choose access-only or auto-link-with-limit

### Phase 4. Add auto-link executor

- create service for:
  - find eligible master questions
  - skip existing links
  - create only missing links
  - respect limits deterministically

Acceptance:

- same onboarding rerun is idempotent
- link counts remain stable

### Phase 5. UI visibility

- show eligible vs linked counts clearly
- show package scope vs linked scope clearly

Acceptance:

- non-technical staff can tell whether a package was only assigned or actually linked

## Required Playwright Coverage

### P0

1. Onboarding with `access_only`

- package assigned
- no linked institute references created
- shared-library questions visible as eligible

2. Onboarding with `auto_link_selected_scope_with_limit`

- package assigned
- only allowed number of institute links created
- rerun does not duplicate

3. Revoked package with existing linked references

- links remain historically present
- access state reflects entitlement inactivity correctly

4. Package scope expansion

- rerun links only newly eligible master questions

5. Package scope reduction

- existing linked rows handled according to agreed soft-freeze policy

### P1

6. Duplicate master-row guardrails

- duplicated master rows do not cause duplicate institute links

7. UI messaging clarity

- assigned vs linked counts visible and correct

## Recommended Decision

For production safety, use this order:

1. fix Science seed duplication
2. keep current onboarding as `access_only`
3. implement idempotent reference-based auto-link
4. release `auto_link_selected_scope_with_limit` only after uniqueness and rerun safety are proven

## Final Recommendation

Do **not** auto-copy question content rows.

Do **not** rely on package assignment to imply local bank population.

Do:

- keep master questions canonical
- link by master-question primary key
- make auto-link optional
- make it deterministic
- make it idempotent
- make linked vs eligible counts explicit in UI
