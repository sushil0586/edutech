# Exam Creation And Builder User Manual

## Overview

This guide explains how to create an exam and complete the main builder workflow in Nexora.

This manual is written for:

- teachers
- institute admins

The screens are almost the same for both roles.

The main difference is:

- teachers may create teacher-owned or institute-owned exams depending on available options
- institute admins create institute-owned exams inside institute scope

## Routes Covered

- `/teacher/exams/new`
- `/teacher/exams/[examId]/builder`
- `/institute/exams/new`
- `/institute/exams/[examId]/builder`

## Before You Begin

Make sure you have:

- access to the correct institute account
- at least one academic year
- at least one program
- at least one subject
- student records available if you want to assign learners
- question bank content available if you want to link questions immediately

If programs, cohorts, subjects, or students are missing, ask your institute admin to complete academic setup and roster preparation first.

## What This Workflow Does

You will use this workflow to:

1. create the exam shell
2. define schedule and delivery rules
3. add sections
4. link existing questions
5. assign students
6. prepare the exam for publishing and delivery

## Page 1: Create Exam

### What You Will See

The Create Exam page is the guided entry point for a new exam.

Expected page areas:

- page header
- exam creation form
- academic scope selectors
- exam configuration fields
- delivery and access controls
- summary cards showing available scope data

[Screenshot: Create Exam page overview]

### Step 1: Open Create Exam

1. Go to `Exams`.
2. Select `Create Exam`.
3. Confirm you are in the correct role workspace:
   Teacher or Institute Admin.

### Step 2: Select Academic Scope

Choose the academic context for the exam:

1. Select `Academic Year`.
2. Select `Program`.
3. Select `Cohort` if needed.
4. Select `Subject`.

Note:
The visible options are loaded from live scope data. If a value is missing, it usually means that the academic setup is incomplete or not visible to your role.

### Step 3: Enter Exam Identity

Complete the core exam details:

1. Enter `Title`.
2. Enter `Code`.
3. Add `Description`.
4. Choose `Source Type` if your role supports it.

Recommended practice:

- use a clear title such as `Class 7 Weekly Science Test 03`
- keep the code short and unique

### Step 4: Configure Delivery

Set the exam delivery behavior:

1. Choose `Exam Type`.
2. Choose `Delivery Mode`.
3. Enter `Duration`.
4. Enter `Total Marks`.
5. Enter `Passing Marks`.
6. Set `Start At` and `End At` if the exam is scheduled.

### Step 5: Configure Attempt And Review Rules

You may see controls for:

- late submit
- randomize questions
- randomize options
- show result immediately
- allow review after submit
- max attempts
- timer mode
- navigation mode
- attempt policy
- result publish mode
- review mode
- security mode
- allow resume
- allow section switching
- allow return to previous section
- result publish time
- review availability window

Tip:
Use stricter navigation and review settings for formal exams, and more flexible settings for practice or revision tests.

### Step 6: Configure Economy Access If Visible

Some roles may also see economy access settings such as:

- policy type
- star cost
- entitlement code
- priority

Only complete these if your institute uses content gating or premium access rules.

### Step 7: Create The Exam

1. Review all fields.
2. Select `Create Exam`.
3. Wait for the success redirect.

Expected result:

- teacher flow redirects to the exam builder
- institute flow redirects to the exam detail or builder continuation path, depending on current implementation

Success message example:

- `Exam created. Continue with sections, questions, and assignments.`

### Common Create Exam Issues

#### Missing dropdown options

Possible reasons:

- academic setup is incomplete
- your role does not have access to that scope
- the selected program has no mapped cohorts or subjects

#### Create action fails

Possible reasons:

- required fields were left empty
- exam code already exists
- invalid date range was selected
- the backend rejected a restricted scope value

[Screenshot: Create Exam validation or error state]

## Page 2: Exam Builder

## Builder Purpose

The Exam Builder is the main authoring workspace after exam creation.

This is where you refine the exam and prepare it for delivery.

Expected major work areas:

- exam settings
- sections
- linked questions
- student assignment
- question bank

[Screenshot: Exam Builder overview]

## Builder Workflow Order

Recommended working order:

1. confirm exam settings
2. add sections
3. link questions
4. review marks and order
5. assign students
6. final quality check

## Section A: Update Exam Settings

You can edit most of the same exam fields from the builder:

- academic year
- program
- cohort
- subject
- title
- code
- description
- exam type
- delivery mode
- duration
- marks
- schedule
- instructions
- security and review behavior

### How To Update Settings

1. Open the builder.
2. Review the settings form at the top of the page.
3. Edit the required values.
4. Save the changes.

Expected confirmation:

- `Exam settings updated.`

Warning:
If you change program, cohort, or subject after linking questions or assigning students, review the exam carefully to make sure the content still matches the target learner group.

## Section B: Add Sections

Sections help organize the exam into parts such as:

- Section A: MCQ
- Section B: Short Answer
- Section C: Long Answer

### Section Fields

You may be asked for:

- section name
- description
- display order
- instructions
- total questions
- marks per question
- negative marks per question
- timer enabled
- section duration
- allow skip section
- lock after submit

### How To Add A Section

1. Open the `Sections` tab.
2. Enter the section details.
3. Select `Add Section`.
4. Confirm the section appears in the section list.

[Screenshot: Sections tab with add section form]

### How To Remove A Section

1. Open the `Sections` tab.
2. Find the section you want to remove.
3. Select the delete or remove action.
4. Confirm the change.

Expected confirmation:

- `Section removed.`

Note:
If linked questions depend on a section, check the linked questions list after removing the section.

## Section C: Link Questions

The `Linked Questions` area attaches question bank items to the exam.

This is one of the most important steps in builder setup.

### What You Can Do

- add one question at a time
- bulk attach multiple questions
- place a question inside a section
- set question order
- override marks
- override negative marks
- mark a question as mandatory
- remove a linked question

### How To Link A Single Question

1. Open the `Linked Questions` tab.
2. Choose a question.
3. Select a target section if needed.
4. Set `Question Order`.
5. Optionally set marks and negative marks.
6. Choose whether the question is mandatory.
7. Save the link.

Expected confirmation:

- `Question linked to exam.`

### How To Bulk Link Questions

1. Open the `Linked Questions` tab.
2. Select multiple question bank items.
3. Choose a section if needed.
4. Set the starting display order.
5. Save the bulk action.

Expected confirmation:

- `X questions linked to exam.`

### Important Behavior

If a question is already linked, the system may update the existing link instead of creating a duplicate pair.

That protects the exam from duplicate question-link collisions.

[Screenshot: Linked Questions tab]

## Section D: Use The Question Bank Inside Builder

The builder includes a question-bank workspace so you can find suitable content while building the exam.

Typical use cases:

- search by subject
- search by topic
- review available question types
- attach questions directly into the exam

Recommended practice:

- filter the question bank before linking
- confirm difficulty mix
- confirm marks distribution
- avoid adding duplicate or overlapping questions

## Section E: Assign Students

The `Student Assignment` tab connects the exam to learners.

### What You Can Do

- search students
- include or remove students
- update assignment selections
- prepare the exam for scheduled delivery

### How To Assign Students

1. Open the `Student Assignment` tab.
2. Search or browse the available learners.
3. Select the students you want to assign.
4. Save the assignment.
5. Review the assigned learner list.

[Screenshot: Student Assignment tab]

Note:
If no students appear, check cohort mapping, roster setup, and institute scope first.

## Final Review Checklist

Before leaving the builder, confirm:

1. title and code are correct
2. subject and cohort are correct
3. duration and marks are correct
4. sections are complete
5. question order is correct
6. mandatory questions are intentional
7. assigned learners are correct
8. publish and review behavior matches the exam type

## Troubleshooting

## Builder loads but data looks incomplete

Check:

- your role scope
- academic mappings
- whether questions exist in the question bank
- whether students are available in the selected cohort

## Questions do not attach

Check:

- the question is active
- the question is in visible scope
- the section still exists
- the order and marks fields are valid

## Students are not available for assignment

Check:

- learner roster exists
- the selected academic scope matches the intended cohort
- institute or teacher scope is correct

## Related Guides To Create Next

- Exam Detail and Lifecycle User Manual
- Question Bank and Bulk Import User Manual
- Results and Analytics User Manual

## Document Notes

This manual is based on the live route flows and current product specs for:

- teacher exam creation and builder
- institute exam creation and builder

Before final PDF export, add:

1. role-specific screenshots
2. branded cover page
3. page footer with version and release date
4. support contact section
