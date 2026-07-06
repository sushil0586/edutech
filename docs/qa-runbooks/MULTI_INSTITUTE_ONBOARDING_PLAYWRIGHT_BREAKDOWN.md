# Multi-Institute Onboarding Playwright Breakdown

## Objective
Convert the multi-institute onboarding E2E plan into clear Playwright automation slices, starting from stable admin setup and then moving into institute-side visibility and exam usability.

Reference plan:
- [MULTI_INSTITUTE_ONBOARDING_E2E_TEST_PLAN.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/MULTI_INSTITUTE_ONBOARDING_E2E_TEST_PLAN.md)

## Fixed Dataset For Automation

### Existing institute
- `OPBMS`

### Class 8 Math topic groups
- Rational Numbers
- Linear Equations in One Variable
- Comparing Quantities
- Algebraic Expressions and Identities

### Expected content families
- Class 7 Math
- Class 7 Science
- Class 8 Math

## Automation Strategy

### Phase 1
Prove admin-side setup and entitlement correctness.

### Phase 2
Prove institute-side visibility and linked-question correctness.

### Phase 3
Prove real usability by creating exams from granted question sets.

### Phase 4
Prove isolation and recovery behavior.

## Shared Helpers Needed

### Admin helpers
- login as platform admin
- create fresh institute from UI or API-backed setup helper
- open admin academic setup scoped to institute
- open admin economy scoped to institute
- create or edit question-bank package
- assign package entitlement to institute
- verify entitlement row state

### Institute helpers
- login as institute admin
- open institute question bank
- filter by program/subject/topic
- read visible counts
- open linked-library page if needed
- create exam from accessible questions

### Data verification helpers
- assert package scope chips/details
- assert entitlement status active/revoked/paused
- assert question-bank result counts by subject
- assert zero-result state vs filtered-result state

## Proposed Spec Files

## Spec 1
### File
- `admin-class8-math-master-dataset.mutable.spec.ts`

### Purpose
Verify that the Class 8 Math master dataset exists and is structurally correct before testing institute access.

### Cases
- admin can find Class 8 Math subject in master data
- admin can verify the 4 expected Class 8 Math topic groups
- admin can verify 200 Class 8 Math master questions are discoverable
- admin does not see duplicate question rows for this scope

### Risk level
- High

## Spec 2
### File
- `admin-opbms-class8-access.mutable.spec.ts`

### Purpose
Verify that `OPBMS` can receive Class 8 Math access through admin economy workflows.

### Cases
- admin can scope package management to OPBMS
- admin can create or reuse a Class 8 Math package scope
- admin can assign package entitlement to OPBMS
- assigned entitlement becomes active and not revoked
- package scope details reflect Class 8 Math only

### Risk level
- High

## Spec 3
### File
- `admin-new-institute-mixed-access-onboarding.mutable.spec.ts`

### Purpose
Create a new institute and grant mixed access for:
- Class 7 Math
- Class 7 Science
- Class 8 Math

### Cases
- admin can create a new institute
- admin can open master defaults for the new institute
- admin can apply academic onboarding successfully
- admin can assign or verify mixed question-bank access
- entitlement rows remain active after apply

### Risk level
- Critical

## Spec 4
### File
- `institute-question-bank-mixed-subject-visibility.spec.ts`

### Purpose
Verify that the new institute sees the right content and counts in the institute question bank.

### Cases
- institute sees Class 7 Math content
- institute sees Class 7 Science content
- institute sees Class 8 Math content
- institute does not see unrelated content
- subject filters return the correct result sets
- topic filters narrow content correctly
- total counts do not silently double

### Risk level
- Critical

## Spec 5
### File
- `institute-opbms-class8-visibility.spec.ts`

### Purpose
Verify that `OPBMS` receives and can use only the intended Class 8 Math content.

### Cases
- OPBMS can filter to Class 8 Math
- OPBMS sees expected Class 8 Math question count
- OPBMS does not see ungranted Class 8 non-math content
- OPBMS can open/use granted content in builder

### Risk level
- High

## Spec 6
### File
- `institute-exam-builder-mixed-subject-access.mutable.spec.ts`

### Purpose
Verify that both institutes can actually create exams from granted question sets.

### Cases
- new institute can create exam from Class 7 Math
- new institute can create exam from Class 7 Science
- new institute can create exam from Class 8 Math
- OPBMS can create exam from Class 8 Math
- saved draft preserves selected questions on reopen

### Risk level
- Critical

## Spec 7
### File
- `admin-entitlement-revoke-restore-regression.mutable.spec.ts`

### Purpose
Verify negative/recovery behavior around package access.

### Cases
- revoking one package removes the corresponding subject visibility
- restoring package access brings the questions back
- revoke does not remove unrelated granted subjects
- institute recovery behavior is visible and understandable

### Risk level
- High

## Spec 8
### File
- `admin-multi-institute-isolation.mutable.spec.ts`

### Purpose
Verify that one institute’s scope does not leak into another institute.

### Cases
- OPBMS and new institute see different subject scopes where expected
- new institute onboarding does not alter OPBMS counts
- OPBMS changes do not alter new institute counts

### Risk level
- Critical

## Execution Order
1. `admin-class8-math-master-dataset.mutable.spec.ts`
2. `admin-opbms-class8-access.mutable.spec.ts`
3. `admin-new-institute-mixed-access-onboarding.mutable.spec.ts`
4. `institute-question-bank-mixed-subject-visibility.spec.ts`
5. `institute-opbms-class8-visibility.spec.ts`
6. `institute-exam-builder-mixed-subject-access.mutable.spec.ts`
7. `admin-entitlement-revoke-restore-regression.mutable.spec.ts`
8. `admin-multi-institute-isolation.mutable.spec.ts`

## Recommended Assertions

### Prefer
- API-backed counts when verifying seeded totals
- visible row counts when verifying user-facing correctness
- package scope text/details for admin confirmations
- response contract assertions for mutable admin actions

### Avoid
- hard-coded waits
- selector assumptions based on visual order
- relying on stale cross-test data
- immediate list-count assertions when the response payload already proves success

## Data Cleanup Approach

### Keep
- `OPBMS`
- seeded master datasets

### Cleanup after each mutable institute test
- delete only the temporary institute created for the run
- remove temporary package if package is intentionally disposable
- keep canonical reusable shared-library packages untouched unless the test explicitly owns them

## Pass/Fail Gate For Moving To Full Automation
- Admin can assign Class 8 Math to `OPBMS`
- New institute can receive mixed access in one run
- Institute-side subject filtering returns correct counts
- No duplicate/doubled Class 8 Math or Science counts
- Exams can be built from granted scopes
- Revoke/restore works
- Isolation holds across institutes
