# Institute Question-Bank Browser Fix Plan

Last updated: `2026-07-02`

## Goal

Fix the remaining institute question-bank browser issues from a real end-user point of view, especially for school admins and teachers who are not highly technical.

This plan focuses on:

- linked questions page clarity
- shared-library linker clarity
- package/entitlement confusion reduction
- safer platform-admin recovery workflows
- browser automation coverage for the real institute journey

## Current Ground Truth

These facts are now verified from live local browser testing and database checks:

- OPBMS linked local questions:
  - Math: `650`
  - Science: `900`
  - Total linked: `1550`
- Platform master/public source questions:
  - Science: `1800`
- Therefore:
  - `1800` is the platform source inventory
  - `900` is the institute-linked Science inventory
  - this is not a duplicate-linking bug

## Confirmed Issues

## P0 Bugs

### 1. Source inventory vs linked inventory was confusing in the linker

- Area: `Institute > Question Bank > Shared Library Linker`
- Severity: `High`
- Status: `Fixed`
- Problem:
  - users could interpret `1800` Science rows as if all were already linked
  - platform source count and institute-linked count were shown too close together conceptually
- Fix already applied:
  - linker now separates:
    - `Platform source in this subject`
    - `Already linked locally`
    - `Still linkable`

### 2. Revoked entitlement recovery is still too easy to misread

- Area: `Platform Admin > Economy > Institute question entitlements`
- Severity: `High`
- Status: `Open`
- Problem:
  - operator can add proper Science scope to a package and still see no institute access because the entitlement row is revoked
  - this feels like a package-scope failure even when the real problem is lifecycle state
- Required fix:
  - show a stronger revoked-state banner on the entitlement card
  - keep `Restore entitlement` visible and unambiguous
  - explain that scope can be correct while access is still blocked by lifecycle state

### 3. Package editor remains operationally dense for non-technical users

- Area: `Platform Admin > Economy > Catalog`
- Severity: `High`
- Status: `Open`
- Problem:
  - package type, package scope, source type, topic scope, and institute entitlement are still mentally mixed together
  - adding Science scope is possible, but not obvious enough
- Required fix:
  - improve package edit surface with stronger headings and scoped summaries
  - make academic coverage easier to scan before saving
  - show clearer “this package currently exposes” summaries

## P1 UX / Product Gaps

### 4. Linked Questions and Shared Library Linker still need stronger separation

- Area:
  - `Institute > Question Bank > Linked Questions`
  - `Institute > Question Bank > Shared Library Linker`
- Severity: `Medium`
- Status: `Open`
- Problem:
  - users still need to think too much to understand:
    - linked questions = already in local bank
    - shared library linker = source rows available to add
- Required fix:
  - make both pages feel more intentionally separate
  - keep route purpose visible near the top
  - add stronger “what to do here” copy

### 5. Topic-level zero states are valid but still feel like broken data

- Area: `Institute > Question Bank > Shared Library Linker`
- Severity: `Medium`
- Status: `Open`
- Example:
  - topic can show `0 in platform library / 0 already linked / 0 still linkable`
- Problem:
  - technically correct, but school operators may think the topic failed to load
- Required fix:
  - explicitly say:
    - platform has no licensed source questions for this topic yet
    - nothing is missing from the institute side

### 6. Shared-library workflow still requires too many mental steps

- Area:
  - platform package scope
  - institute entitlement
  - institute linker
- Severity: `Medium`
- Status: `Open`
- Problem:
  - the access chain is correct but cognitively heavy:
    - content exists in platform master
    - package must cover program/subject/topic
    - institute entitlement must be active
    - shared-library runtime access must be enabled
- Required fix:
  - keep visible access-chain explanation in relevant admin surfaces
  - add inline “why you cannot see this content” messages

## P2 Improvements

### 7. More direct institute actions would reduce office-staff friction

- Severity: `Low`
- Ideas:
  - `Show only not yet linked`
  - `Show only already linked`
  - `Link all available for this topic`
  - `Open linked rows for this topic`

### 8. Package-to-institute troubleshooting should be cross-linked better

- Severity: `Low`
- Ideas:
  - from package card -> open entitlement view
  - from entitlement row -> open package scope details
  - from linked question page -> open linker with same class/subject/topic preselected

## Recommended Fix Order

### Phase 1

1. Finish entitlement recovery clarity in Economy.
2. Make revoked/paused/active state impossible to misread.
3. Add package coverage summaries that clearly show Math vs Science vs topic slices.

### Phase 2

1. Separate the purpose of `Linked Questions` and `Shared Library Linker` more clearly.
2. Improve topic zero-state explanations.
3. Add stronger route-level helper text for first-time school admins.

### Phase 3

1. Add low-friction actions for linking and topic review.
2. Improve cross-navigation between package, entitlement, and institute views.
3. Expand browser automation around these repaired flows.

## Browser Automation Plan

## Institute Browser Coverage To Keep

- login as institute admin
- open linked questions page
- filter by:
  - class
  - subject
  - topic
- verify linked totals and filtered totals
- open shared library linker
- verify topic summaries show:
  - platform source
  - already linked
  - still linkable
- open a topic
- verify source rows can be reviewed
- verify search works
- verify rows-per-page works
- verify pagination works if present

## Platform Admin Coverage To Add Next

- open Economy catalog
- edit `Scholar Question Bank Access`
- add Science scope row safely
- save package
- verify package summary updates
- open entitlement area
- revoke entitlement
- restore entitlement
- verify institute access changes accordingly

## Acceptance Criteria

This fix plan can be considered complete when:

- institute users no longer confuse source counts with linked counts
- platform admins can safely tell whether the blocker is:
  - package scope
  - entitlement lifecycle
  - feature access
- revoked Science access can be restored without guesswork
- linked questions and linker pages feel clearly different in purpose
- browser automation covers the repaired institute and platform-admin flows end to end

## Practical Note

The current biggest remaining risk is not raw data correctness.

The bigger risk is operator misunderstanding:

- thinking package scope is wrong when entitlement is revoked
- thinking linked counts are wrong when source counts are being shown
- thinking a topic is broken when the platform simply has no licensed content for it yet

That means the next highest-value work is clarity and workflow safety, not data-model redesign.
