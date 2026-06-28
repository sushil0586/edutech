# Role Functionality And Playwright Index

This index groups the end-to-end product functionality by role and maps each role to the current Playwright coverage.

## Role documents

- [Platform Admin Functionality And Playwright Map](./ROLE_PLATFORM_ADMIN_FUNCTIONALITY_AND_PLAYWRIGHT_MAP.md)
- [Institute Admin Functionality And Playwright Map](./ROLE_INSTITUTE_ADMIN_FUNCTIONALITY_AND_PLAYWRIGHT_MAP.md)
- [Teacher Functionality And Playwright Map](./ROLE_TEACHER_FUNCTIONALITY_AND_PLAYWRIGHT_MAP.md)
- [Student Functionality And Playwright Map](./ROLE_STUDENT_FUNCTIONALITY_AND_PLAYWRIGHT_MAP.md)
- [Registration And Access Control Functionality And Playwright Map](./ROLE_REGISTRATION_AND_ACCESS_CONTROL_FUNCTIONALITY_AND_PLAYWRIGHT_MAP.md)

## How to use these documents

- Use them as role-level product specs for QA, UAT, and release review.
- Read each workflow top to bottom to understand the intended end-to-end behavior.
- Use the linked Playwright spec list to see what is already automated.
- Treat `Baseline` coverage as standard-suite coverage.
- Treat `Mutable` coverage as real-data or write-path coverage that depends on mutable environment support.

## Current role set

- Platform admin
- Institute admin
- Teacher
- Student
- Registration and access control

## Coverage source

These role documents are derived from:

- `edutech_web/tests/e2e/ROLE_MODULE_COVERAGE_MAP.md`
- `edutech_web/tests/e2e/PAGE_ACTION_COVERAGE_MAP.md`
- `edutech_web/tests/e2e/workflow`
