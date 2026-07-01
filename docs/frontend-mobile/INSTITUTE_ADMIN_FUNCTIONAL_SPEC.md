# Institute Admin Functional Spec

## Goal

Document what each institute-admin function should do before implementation begins.

This spec is intentionally operational and implementation-oriented.

## 1. Dashboard

### Purpose

Give institute admins one operational summary of institute readiness.

### Must show

- institute identity and status
- student count
- teacher count
- academic setup completeness
- teacher assignment count
- exam counts by lifecycle
- pending result publication count
- recent operational shortcuts

### Must support

- quick jump to people
- quick jump to academic setup
- quick jump to exams
- quick jump to results

## 2. People

### Purpose

Manage institute roster and account readiness.

### Student operations

- create student
- view student login status
- bulk import students
- review student scope fields

### Teacher operations

- create teacher
- view teacher login status
- bulk import teachers
- review teacher scope fields

### Must support

- institute-only visibility
- search and filter
- roster completeness checks

## 3. Academic Setup

### Purpose

Control institute academic hierarchy and defaults.

### Must support

- academic years CRUD
- programs CRUD
- cohorts CRUD
- subjects CRUD
- topics CRUD
- teacher assignment management
- institute exam defaults editing

### Must preserve

- institute scoping
- valid hierarchy relationships
- no hardcoded academic assumptions

## 4. Question Bank

### Purpose

Allow institute admins to curate institute question inventory.

### Must support

- browse questions
- filter by program, subject, topic, type, difficulty
- create new question
- edit question
- duplicate question
- import question CSV
- review explanation presence and content quality signals

### Reuse rule

Should reuse teacher question-bank mechanics where possible.

## 5. Exams

### Purpose

Allow institute admins to create and manage institute-scoped exams.

### Must support

- exam list
- exam creation
- exam detail
- exam builder
- section management
- question linking
- student assignment
- access-key management
- student access-policy management

### Institute-specific addition

Institute admin should also see readiness framing such as:

- teacher assignment readiness
- content completeness
- audience completeness
- access-policy completeness

## 6. Results

### Purpose

Give institute-wide visibility into result lifecycle and publication readiness.

### Must support

- exam list with result readiness
- publication status
- summary availability
- completed-but-unpublished exam visibility
- drilldown into exam-level results

### Reuse rule

Should reuse teacher result mechanics where possible, but show broader institute framing.

## 7. Settings

### Purpose

Manage institute operational preferences and defaults.

### Must support in initial scope

- institute profile visibility
- institute exam defaults
- future placeholders for economy defaults and security defaults

### Later expansion

- notifications
- policy templates
- institute-level approval settings

## 8. Economy Visibility

### Purpose

Institute admins should be able to understand and eventually manage institute-side economy policy.

### Initial scope

- visibility into star packs and subscriptions if institute-scoped
- visibility into exam access policy behavior
- visibility into unlock model at exam level

### Future scope

- institute promotional policy management
- institute grant and exception tooling

## 9. Shared Exam And Question Ownership Rule

Institute admin can create exams and questions.

This is allowed because institute admin is an institute operational owner.

The system should still preserve:

- institute scoping
- auditability
- role-aware history

Institute admin actions should remain distinguishable from teacher actions in logs and audit history.
