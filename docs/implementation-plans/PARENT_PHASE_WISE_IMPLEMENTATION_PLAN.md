# Parent Phase-Wise Implementation Plan

## Objective

Complete the parent section in a disciplined order without hardcoding family data or inventing unsupported child visibility behavior.

## Current Status

The currently approved parent scope has been implemented for:

- documentation and scope lock
- relationship and access model
- shared shell and foundation polish
- linked children workspace
- parent dashboard and progress
- alerts with interactive status updates
- backend-backed settings and preference persistence
- QA verification

Still intentionally pending:

- parent wallet and access visibility
- weekly digest delivery workflow
- self-serve parent link claim flow

## Phase I. Documentation And Scope Lock

### Deliverables

- `NEXORA_PARENT_MODULE_SOURCE_OF_TRUTH.md`
- `NEXORA_PARENT_FRONTEND_FOUNDATION.md`
- this implementation plan

### Outcome

- parent role scope is frozen
- parent UI direction is clear
- relationship-layer dependency is explicit

## Phase II. Relationship And Access Model

### Goal

Define the real data and authorization model before building rich parent screens.

### Deliverables

- parent-to-child relationship rules
- visibility boundaries
- backend-safe summary contract direction
- notification preference persistence direction

### Result

- parent UI can be built against a real backend contract

## Phase III. Shared Shell And Foundation Polish

### Goal

Bring the parent shell fully in line with the shared modern Nexora UI system.

### Deliverables

- parent sidebar expansion plan
- premium shared header and hero alignment
- dashboard and settings polish
- removal of placeholder-like framing where real data exists

### Result

- parent section becomes visually part of the same product family

## Phase IV. Linked Children Workspace

### Goal

Allow parents to see and switch between their linked children.

### Deliverables

- `/parent/children`
- linked-child cards
- selected-child state behavior
- in-page child switching across parent routes

### Required rules

- no cross-child ambiguity
- no unauthorized child access
- no hardcoded family data

## Phase V. Parent Dashboard And Progress

### Goal

Turn the parent dashboard into a real progress surface.

### Deliverables

- linked-child summary on dashboard
- recent exam and result snapshot
- weak-area visibility
- progress trend summary
- `/parent/progress`

### Result

- parent can understand academic movement without using student or teacher workflows

## Phase VI. Alerts And Summaries

### Goal

Give parents meaningful support-oriented notification views.

### Deliverables

- `/parent/alerts`
- score-drop alerts
- inactivity alerts
- milestone alerts
- weekly summary or digest framing
- interactive alert status updates

### Rule

- alerts must come from real backend logic, not frontend heuristics

## Phase VII. Parent Wallet And Access Visibility

### Goal

Expose only the parent-safe parts of wallet, subscription, and access state if approved by product scope.

### Deliverables

- `/parent/wallet`
- child access visibility
- exam unlock visibility where parent-safe
- no direct fake commerce behavior

### Rule

- keep this visibility-first unless product explicitly approves parent actions

## Phase VIII. Settings And Preference Persistence

### Goal

Convert local-only parent settings into a real backend-backed preference workspace.

### Deliverables

- backend-saved notification preferences
- preference confirmation states
- linked-account guidance

### Result

- parent settings stop being browser-only placeholder logic

## Phase IX. QA And UAT

### Goal

Validate parent workflows end to end.

### Minimum scenarios

- parent login
- view linked children
- switch selected child
- review progress snapshot
- review alerts
- update settings
- verify unauthorized child data is blocked

## Priority Order

Implementation should follow this sequence:

1. documentation lock
2. relationship and backend contract definition
3. shell polish
4. linked children
5. dashboard and progress
6. alerts
7. wallet visibility if allowed
8. settings persistence
9. QA

## Completion Note

For the currently approved parent support scope:

- Phases I, II, III, IV, V, VI, VIII, and IX are complete
- Phase VII remains intentionally deferred until parent-safe wallet visibility is explicitly approved

## Important Role Rule

Parent should remain a support and visibility role.

Do not let parent workflows drift into:

- student action duplication
- teacher operations
- institute administration

## Important UI Rule

Parent implementation must stay on the same global CSS and visual system used by student, teacher, and institute.
