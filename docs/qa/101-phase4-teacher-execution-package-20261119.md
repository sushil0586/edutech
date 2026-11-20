# Phase 4 Teacher Workflow Execution Package

Date: 2026-11-19  
Status: AUTHORIZED, EXECUTION IN PROGRESS  
Candidate HEAD: `2221b9193b781fc22dac3e7684d199a06a4c8c7f` plus preserved dirty working tree

## Frozen scope

| ID | Acceptance contract | Primary executable evidence |
|---|---|---|
| `EDU-TCHR-001` | Teacher assignment scope, role denial and tenant isolation | teacher role consistency, API access and cross-browser shell |
| `EDU-TCHR-002` | Question create, edit, validation and persistence | teacher question mutable and rejection suites |
| `EDU-TCHR-003` | CSV preview/finalize, malformed input, replay and export | teacher import/export and finalize rejection suites |
| `EDU-TCHR-004` | Licensed-content request, entitlement and link behavior | shared-library request/link/enforcement suites |
| `EDU-TCHR-005` | Exam create and persistence | teacher exam lifecycle and detail mutable suites |
| `EDU-TCHR-006` | Builder validation and question consistency | exam builder mutable and advanced-builder suites |
| `EDU-TCHR-007` | Student slot assignment and invalid reference handling | teacher exam slot management suite |
| `EDU-TCHR-008` | Schedule conflict, concurrent/stale mutation and non-mutation | lifecycle, request recovery and backend concurrency evidence |
| `EDU-TCHR-009` | Publish readiness, replay and notification consistency | lifecycle and shared-library publish-readiness suites |
| `EDU-TCHR-010` | Live monitoring and refresh behavior | populated live-results and continuity suites |
| `EDU-TCHR-011` | Manual evaluation/review validation and audit history | teacher review mutable and reviews continuity suites |
| `EDU-TCHR-012` | Result calculation/release, repeated release and immutable history | results mutable, partial distribution and family release suites |

## Environment contract

- Fresh exact task-owned PostgreSQL 16 container and database.
- Production Next.js build served on loopback only; Django API on a separate loopback port.
- Demo teacher/institute/student fixtures plus exact test-owned rows.
- In-memory email; no SMS, webhook or provider delivery.
- One mutating Playwright worker initially.
- Exact container/database teardown after evidence capture.

## Required gates

1. Browser action and visible feedback for every applicable scenario.
2. API status, PostgreSQL persistence/non-mutation, role and tenant scope.
3. Audit/notification cardinality where the product contract emits them.
4. Chromium functional pass; Firefox/WebKit role and critical-flow pass.
5. Keyboard and mobile coverage with retained rendered evidence.
6. Bounded Django/PostgreSQL regression, TypeScript, ESLint, production build, checks and migration drift.
7. No unresolved P0/P1 and zero task-owned runtime resources after cleanup.

No commit, deployment, shared-environment mutation or external delivery is authorized.
