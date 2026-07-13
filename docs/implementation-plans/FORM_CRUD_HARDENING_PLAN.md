# Form CRUD Hardening Plan

## Objective

Move browser and API coverage from workflow-only confidence to full form-surface confidence.

This plan exists because workflow coverage is already strong in many areas, but real operator issues can still escape when:

- optional fields return as `null` or `undefined`
- older records have sparse legacy shapes
- edit flows are less covered than create flows
- permission and delete/deactivate paths are tested inconsistently

## Core Principle

Every important form should be treated as a CRUD surface, not just a happy-path workflow step.

For each form, we should explicitly cover:

1. create with minimum valid payload
2. create with fuller realistic payload
3. read/open existing persisted record
4. update existing full record
5. update existing sparse or legacy record
6. negative validation states
7. permission restrictions
8. delete, deactivate, archive, or equivalent lifecycle action
9. cancel and reopen safety

## Test Layers

### 1. Browser CRUD

Purpose:

- prove real operator behavior
- catch UI state bugs
- catch frontend null-handling issues
- verify actionable validation and messages

### 2. API CRUD

Purpose:

- verify request and response contracts
- verify sparse-field compatibility
- verify duplicate and permission handling
- verify patch semantics and delete safety

### 3. Local logic and unit coverage

Purpose:

- normalize drafts safely
- sanitize payloads safely
- map API errors correctly
- prevent regressions from hidden UI helpers

## Priority Order

## P0: Must Harden First

### 1. Admin institutes

Reason:

- central governance surface
- create/edit/login lifecycle
- onboarding entry point
- real sparse-record crash already discovered

Current strong coverage:

- create/edit/delete happy path
- login create/reset/enable/disable
- management-mode coverage
- onboarding profiles, validation, recovery

Current gaps:

- edit sparse record
- minimum-valid create shape
- cancel/reopen edit modal
- explicit deactivate/reactivate lifecycle assertions
- API sparse compatibility matrix

### 2. Admin people

Forms:

- create teacher
- create student
- roster import dialogs
- login lifecycle controls

Current strong coverage:

- create validation
- create and login lifecycle
- roster import preview/finalize

Current gaps:

- edit sparse teacher/student record
- minimum-valid edit contract
- permission matrix and delete hardening grouped as CRUD

### 3. Institute people

Forms:

- institute teacher creation
- institute student creation
- institute roster import

Current gaps:

- CRUD matrix is present in parts but not fully organized
- sparse persisted record edit coverage is unclear

### 4. Institute and admin exam create/edit

Forms:

- guided create exam shell
- detail settings save
- assignment settings
- slot windows
- access policy edits

Current strong coverage:

- many save and runtime workflows

Current gaps:

- strict CRUD treatment of exam metadata form
- sparse edit state
- negative empty-scope edit states grouped as a matrix

## P1: Should Harden Next

### 5. Academic setup

- master defaults
- onboarding apply
- institute defaults
- teacher assignments

### 6. Economy governance

- star packs
- subscription plans
- entitlements
- policy config
- referral program forms

### 7. Public profile completion

- student completion
- teacher completion
- sparse resume and retry shapes

## P2: Operational Filters And Selector Forms

These are lower CRUD risk than entity forms, but still important:

- reports filters
- security filters
- search and selection forms
- settings panels

## Form Inventory

## Admin

- institutes
- people: teacher create
- people: student create
- people: roster import
- academic setup: master defaults
- academic setup: institute defaults
- teacher assignments
- exams: create shell
- exams: detail settings
- economy: star packs
- economy: subscription plans
- economy: entitlements
- economy: referral programs
- settings policy forms

## Institute

- people: teacher create
- people: student create
- people: roster import
- exams: create shell
- exams: detail settings
- exams: assignment
- exams: slot management
- academic setup forms
- teacher assignment forms

## Teacher

- exam builder and detail settings
- question authoring and family-bound forms
- review actions where mutable

## Public

- student registration completion
- teacher registration completion
- referral-enhanced student completion

## Coverage Matrix Template

Each form should be marked against:

- `C-min`: create with minimum valid payload
- `C-full`: create with fuller realistic payload
- `R-open`: open persisted record
- `U-full`: update full record
- `U-sparse`: update sparse or legacy record
- `V-neg`: validation negatives
- `P-auth`: permission restriction
- `L-close`: lifecycle action such as delete/deactivate/archive
- `UX-cancel`: cancel and reopen behavior

## Immediate Execution Plan

## Phase 1: Admin Institutes

### Browser

Add or extend coverage for:

1. sparse institute record can be opened and saved safely
2. create with minimum valid values remains honest
3. cancel edit does not mutate persisted values
4. deactivate and reactivate institute lifecycle remains truthful

### API

Add coverage for:

1. patch sparse/null optional fields
2. patch with omitted optional fields
3. duplicate code rejection
4. invalid management mode rejection

### Local logic

Add coverage for:

1. `createDraft` normalizes null and undefined text
2. `sanitizePayload` safely trims optional fields
3. validation uses normalized values

## Phase 2: Admin People

1. teacher sparse edit
2. student sparse edit
3. minimum-valid create
4. create-cancel-reopen behavior
5. delete/deactivate grouping

## Phase 3: Institute People

1. institute teacher CRUD
2. institute student CRUD
3. sparse edit behavior
4. import negative matrix

## Phase 4: Exam Forms

1. admin exam create/detail CRUD
2. institute exam create/detail CRUD
3. teacher exam create/detail CRUD
4. sparse policy/settings patch behavior

## What “Done” Looks Like

We should consider CRUD hardening materially complete only when:

- every P0 form has browser CRUD coverage
- every P0 form has sparse-record regression coverage
- every P0 API has contract coverage for omitted/null optional fields
- helper-level normalization functions are unit-covered
- each major form family has a current coverage-status document

## First Concrete Deliverables

This pass should begin with:

1. `admin/institutes` sparse edit browser regression
2. `admin/institutes` CRUD coverage matrix note
3. `admin/institutes` unit-level normalization coverage if test harness exists
4. next expansion to `admin/people`

## Current Recommendation

Do not treat onboarding coverage as equivalent to CRUD coverage.

Onboarding is now strong.
CRUD hardening is the next discipline we need for product stability.
