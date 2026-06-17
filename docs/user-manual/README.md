# Nexora User Manual - Start Here

## Purpose

This folder is the starting point for the actual end-user manual for the Nexora frontend.

These documents are written in a PDF-friendly structure:

- short sections
- clear step-by-step actions
- simple headings
- support for screenshots
- support for role-specific exports later

This is different from internal product specs.

Internal specs explain how the system should work.

The user manual explains how a real frontend user completes work inside the product.

## Best Place To Start

Start with the largest shared workflow:

1. Create Exam
2. Configure Exam
3. Build Sections
4. Link Questions
5. Assign Students
6. Publish and manage lifecycle

That is why the first manual in this folder is:

- `EXAM_CREATION_AND_BUILDER_USER_MANUAL.md`

This workflow covers both:

- teacher users
- institute admin users

It also touches the most important backend-backed product areas:

- academic scope
- exam configuration
- question linking
- student assignment
- exam lifecycle readiness

## Recommended User Manual Build Order

Write the manuals in this order so the documentation grows from highest-value workflow to supporting modules:

1. Exam Creation and Exam Builder
2. Exam Detail and Lifecycle Actions
3. Question Bank and Question Import
4. Results and Analytics
5. Student Exam Taking Flow
6. Student Dashboard, Alerts, Attempts, and Weak Areas
7. Institute People and Academic Setup
8. Settings, Security, and Economy
9. Parent role guides
10. Platform admin guides

## Document Standard

Each manual should follow this structure:

1. Overview
2. Who should use this page
3. Before you begin
4. Page layout
5. Step-by-step tasks
6. Common mistakes
7. Troubleshooting
8. Related pages

## PDF Style Rules

To make these manuals easy to export into PDF later:

- keep headings short and consistent
- write one task per section where possible
- use numbered steps for actions
- use `Tip`, `Note`, and `Warning` callouts as plain text labels
- add screenshot placeholders using `[Screenshot: ...]`
- avoid internal engineering terms unless the user sees them in the UI

## Screenshot Capture Plan

For each manual, capture screenshots in this order:

1. full page
2. important filters or tabs
3. create form
4. success state
5. error state
6. empty state if relevant

Recommended screenshot naming pattern:

- `teacher-exams-create-01-overview.png`
- `teacher-exams-builder-02-sections.png`
- `institute-exams-builder-03-linked-questions.png`

## Source Of Truth For Writing

When writing end-user documentation, validate content against:

- live frontend route files in `edutech_web/src/app`
- reusable UI components in `edutech_web/src/components/ui`
- backend-backed functional specs already present in the repo

Do not rely only on old planning docs if the live UI wording has changed.

## Next Manuals To Create

After the exam builder manual, the strongest next documents are:

- `EXAM_DETAIL_AND_LIFECYCLE_USER_MANUAL.md`
- `QUESTION_BANK_AND_IMPORT_USER_MANUAL.md`
- `RESULTS_AND_ANALYTICS_USER_MANUAL.md`
