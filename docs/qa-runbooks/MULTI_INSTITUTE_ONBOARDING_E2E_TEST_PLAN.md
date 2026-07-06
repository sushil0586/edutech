# Multi-Institute Onboarding E2E Test Plan

## Goal
Verify that institute onboarding, academic preset seeding, question-bank package assignment, shared-library entitlement, linked-question visibility, and downstream exam creation all work correctly across:

1. An existing institute that receives new Class 8 Math access
2. A newly created institute that receives mixed access across:
   - Class 7 Math
   - Class 7 Science
   - Class 8 Math

This run is intended to prove that onboarding is not only creating academic records, but also granting the correct question access and making those questions usable in real institute workflows.

## Test Data Scope

### New content to add before testing
- Class 8 Math
- 4 topic groups
- 200 total questions
- No duplicate questions
- Subject/topic mappings must match master academic tables exactly

### Fixed Class 8 Math topic groups for this run
- Rational Numbers
- Linear Equations in One Variable
- Comparing Quantities
- Algebraic Expressions and Identities

### Access model to verify
- Existing institute:
  - Institute: `OPBMS`
  - Add access to Class 8 Math 200 questions
- New institute:
  - Add access to Class 7 Math questions
  - Add access to Class 7 Science questions
  - Add access to Class 8 Math 200 questions

## What This Run Must Prove
- Academic onboarding creates the expected academic year, program, subjects, and topics
- Economy/question-bank package setup matches the intended scope
- Entitlement assignment is active and not silently revoked
- Institute question-bank screens show only the expected accessible content
- Linked-question counts are correct by subject and topic
- Questions granted through onboarding can actually be used to create exams
- Existing institute and new institute remain isolated from each other
- Mixed-grade and mixed-subject access behaves correctly

## Preconditions
- Platform admin login is working
- Existing institute is available and known
- Existing institute for this run is `OPBMS`
- New Class 8 Math content is seeded into master/public library
- Class 7 Math and Class 7 Science content is already available in master/public library
- Shared-library/economy package UI is working
- Institute onboarding via `Admin > Academic Setup > Master defaults` is working

## Data Preparation Checklist

### Dataset A: Class 8 Math content
- Program exists for Class 8
- Subject exists for Class 8 Math
- 4 topic groups exist and are mapped correctly
- Topic groups for this run are:
  - Rational Numbers
  - Linear Equations in One Variable
  - Comparing Quantities
  - Algebraic Expressions and Identities
- 200 questions exist in master/public library
- Questions are discoverable by:
  - program
  - subject
  - topic

### Dataset B: Existing institute access
- Existing institute is `OPBMS`
- `OPBMS` remains active
- `OPBMS` already has baseline onboarding data
- `OPBMS` receives Class 8 Math access through UI flow only

### Dataset C: New institute mixed access
- New institute is created through UI
- New institute receives academic defaults needed for Class 7 and Class 8 access model
- New institute receives:
  - Class 7 Math question-bank access
  - Class 7 Science question-bank access
  - Class 8 Math question-bank access

## Test Case Groups

## Group 1: Master Content Verification

### TC-01 Class 8 Math master subject exists
- Open admin academic setup / master data view
- Verify Class 8 Math subject exists
- Verify 4 expected topic groups exist
- Verify the 4 topic groups are exactly:
  - Rational Numbers
  - Linear Equations in One Variable
  - Comparing Quantities
  - Algebraic Expressions and Identities
- Verify topic labels are correct and usable

### TC-02 Class 8 Math master question count is correct
- Open admin master library / question-bank visibility
- Filter by Class 8 Math
- Verify total question count is 200
- Verify questions are distributed under the expected 4 topic groups

### TC-03 Class 8 Math master data is clean
- Verify no duplicate visible question rows
- Verify question metadata is mapped to the correct subject/topic
- Verify no questions appear under wrong class/subject

## Group 2: Existing Institute Add-On Access

### TC-04 Existing institute receives Class 8 Math access through UI
- Open admin economy / question-bank package management
- Scope to institute `OPBMS`
- Assign the correct package or entitlement to `OPBMS`
- Verify assignment succeeds with success feedback

### TC-05 Existing institute entitlement is active
- Open admin economy / institute question entitlements
- Verify `OPBMS` row is active, not revoked, not paused
- Verify package name and scope reflect Class 8 Math access

### TC-06 Existing institute can see Class 8 Math in institute question bank
- Login as `OPBMS` institute admin
- Open institute question bank
- Filter by Class 8 Math
- Verify Class 8 Math questions appear
- Verify count matches expected accessible set

### TC-07 Existing institute cannot see unrelated content accidentally
- In `OPBMS` institute question bank:
  - filter for Class 8 non-math subjects
  - filter for subjects not explicitly granted
- Verify ungranted content is not visible

### TC-08 Existing institute can use Class 8 Math questions in exam creation
- Create a new exam
- Use question-bank selection flow
- Add Class 8 Math questions
- Verify exam can be saved/published according to entitlements

## Group 3: New Institute Creation and Onboarding

### TC-09 New institute can be created from UI
- Open admin institute management
- Create a fresh institute from UI
- Verify record is created successfully
- Verify redirect/open flow is correct

### TC-10 New institute onboarding full context opens correctly
- Open `Master defaults`
- Verify institute scope is correct
- Verify no fallback to another institute occurs
- Verify selected institute remains stable across reload

### TC-11 New institute academic onboarding applies successfully
- Apply chosen preset/default setup
- Verify preview summary is correct
- Verify apply succeeds
- Verify academic year, program, subject, and topic counts are created correctly

## Group 4: New Institute Mixed Question Access

### TC-12 New institute receives Class 7 Math access
- Assign or apply package through UI
- Verify active entitlement exists
- Verify not revoked/paused

### TC-13 New institute receives Class 7 Science access
- Assign or apply package through UI
- Verify active entitlement exists
- Verify not revoked/paused

### TC-14 New institute receives Class 8 Math access
- Assign or apply package through UI
- Verify active entitlement exists
- Verify not revoked/paused

### TC-15 New institute combined entitlement scope is correct
- Open entitlement visibility view
- Verify all expected subjects are listed:
  - Class 7 Math
  - Class 7 Science
  - Class 8 Math
- Verify no unintended subjects are present

### TC-16 New institute linked-question visibility is correct by subject
- Login as new institute admin
- Open institute question bank
- Filter by Class 7 Math
- Verify only Class 7 Math accessible questions are shown
- Filter by Class 7 Science
- Verify only Class 7 Science accessible questions are shown
- Filter by Class 8 Math
- Verify only Class 8 Math accessible questions are shown

### TC-17 New institute total accessible question counts are correct
- Verify total visible questions match the sum of granted subject scopes
- Verify no silent duplication
- Verify Class 8 Math does not appear doubled

### TC-18 New institute linked questions are usable in exam builder
- Create an exam using Class 7 Math
- Create an exam using Class 7 Science
- Create an exam using Class 8 Math
- Verify question selection, save, and draft/publish flow work

## Group 5: Isolation and Cross-Institute Integrity

### TC-19 Old institute and new institute remain isolated
- Compare old institute and new institute accessible subjects
- Verify each institute sees only its intended scope

### TC-20 New institute changes do not modify old institute counts
- After onboarding new institute, revisit old institute
- Verify old institute counts and visible subjects remain correct

### TC-21 Old institute changes do not modify new institute counts
- Modify or inspect old institute entitlements
- Verify new institute still has its expected access

## Group 6: Filters, Counts, and Linked Question UX

### TC-22 Institute question-bank filters work for mixed grade access
- Filter by Class 7 Math
- Filter by Class 7 Science
- Filter by Class 8 Math
- Verify results are accurate

### TC-23 Subject + topic filtering works
- Apply subject filter plus topic-group/topic filter
- Verify only matching rows appear
- Verify zero-result state is meaningful and recoverable

### TC-24 Count labels are correct
- Verify visible count chips, totals, and linked-question counts match actual rows
- Verify no misleading totals when switching subjects

### TC-25 Linked-question page remains user friendly
- Verify labels are understandable
- Verify recovery actions are visible when no results
- Verify no confusing mixed-state messaging

## Group 7: Negative and Recovery Scenarios

### TC-26 Revoked entitlement removes access
- Revoke one package on new institute
- Verify corresponding subject questions disappear
- Verify other granted subjects still remain visible

### TC-27 Re-enable / unrevoke restores access
- Restore revoked entitlement
- Verify questions reappear without inconsistent counts

### TC-28 Wrong-scope package does not leak content
- Assign a package without target subject scope
- Verify inaccessible questions do not appear

### TC-29 Partial onboarding does not corrupt institute
- Apply only selected subject scope
- Verify resulting academic and question access is limited and correct

### TC-30 Failed or invalid assignment surfaces proper error
- Try invalid or incomplete UI package save
- Verify meaningful validation/error feedback is shown

## Group 8: Downstream Exam Usability

### TC-31 Exam creation with Class 8 Math granted content
- New institute creates exam using Class 8 Math only
- Verify exam question picker returns the granted questions

### TC-32 Exam creation with mixed class/subject content
- New institute creates combined exam using:
  - Class 7 Math
  - Class 7 Science
  - Class 8 Math
- Verify multi-subject selection works if supported
- If not supported, verify behavior is explicit and understandable

### TC-33 Saved exam remains stable on reopen
- Reopen draft exam
- Verify selected questions remain attached
- Verify subject labels/counts remain correct

## High-Risk Areas To Watch During Testing
- New institute not appearing in admin scope immediately
- Selector fallback to a different institute
- Package active but entitlement revoked
- Science counts doubling unexpectedly
- Class 8 Math not visible despite active package
- Subject/topic mapping mismatch between master data and institute filters
- Visible count mismatch vs actual linked rows
- Package scope saved but not reflected in institute question bank

## Expected Pass Criteria
- Old institute can access exactly the intended Class 8 Math scope
- New institute can access exactly:
  - Class 7 Math
  - Class 7 Science
  - Class 8 Math
- No duplicate linked questions are introduced
- No cross-institute leakage occurs
- All granted questions are actually usable in exam creation
- Revoke/restore behaviors are predictable
- Counts, filters, and visibility align with package scope

## Recommended Execution Order
1. Verify master Class 8 Math dataset
2. Grant Class 8 Math to old institute
3. Confirm old institute visibility and usability
4. Create new institute from UI
5. Apply academic onboarding
6. Grant mixed subject access to new institute
7. Validate question-bank visibility by subject
8. Create exams from each granted subject
9. Test revoke/restore behavior
10. Record all bugs before automation

## Bug Reporting Format For This Run
- Test case ID
- Page/module
- Steps
- Actual result
- Expected result
- Severity
- Whether issue blocks automation or only affects UX

## Automation Scope For Next Step
After manual sign-off of the above cases, create Playwright suites in this order:

1. Admin master dataset verification
2. Existing institute Class 8 Math add-on access
3. New institute mixed onboarding
4. Institute question-bank filter/count verification
5. Institute exam creation from granted scopes
6. Revoke/restore entitlement regression

## Suggested Playwright Spec Breakdown
- `admin-class8-math-master-dataset.mutable.spec.ts`
- `admin-existing-institute-class8-access.mutable.spec.ts`
- `admin-new-institute-mixed-subject-onboarding.mutable.spec.ts`
- `institute-question-bank-mixed-subject-visibility.spec.ts`
- `institute-exam-builder-mixed-subject-access.mutable.spec.ts`
- `admin-entitlement-revoke-restore-regression.mutable.spec.ts`
