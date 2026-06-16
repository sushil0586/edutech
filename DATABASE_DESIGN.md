# Nexora Database Design

## Purpose

This document explains the current live database design for Nexora as implemented in the backend.

It is meant to answer:

- what the core tables are
- how the data is structured
- how public registration and internal institute workflows share the same backend
- how student, teacher, parent, academic, exam, attempt, and reporting data connect
- where the design is already strong
- where it is intentionally flexible for future subscription and growth features

## Design Principles

Nexora follows a few important database principles:

- institute-first tenancy: almost all operational data belongs to an institute
- role-aware identity: one login can represent student, teacher, parent, institute admin, or platform admin
- domain profiles separate from auth: login data stays in Django auth, while student and teacher details live in profile tables
- academic hierarchy is explicit: academic year, program, cohort, subject, and topic are first-class entities
- assessment data is normalized: exams, sections, questions, attempts, answers, and results are stored separately
- shared audit metadata is preserved: every major entity inherits common UUID, timestamps, and active-state fields
- JSON is used for flexible, evolving data: registration context, accommodation details, exam metadata, and reporting metadata

## Shared Base Model

Most domain tables inherit from `BaseModel`.

### Common fields

- `id`: UUID primary key
- `created_at`: creation timestamp
- `updated_at`: last update timestamp
- `is_active`: soft activation flag

This gives the backend a consistent audit and lifecycle pattern across all major data domains.

## High-Level Data Model

At a high level, the live model looks like this:

- `User` from Django auth stores login credentials and core auth identity
- `AccountProfile` stores the role and ties a login to institute and domain profile data
- `Institute` acts as the tenant root
- Academic structure flows from institute to year, program, cohort, subject, and topic
- `StudentProfile` and `TeacherProfile` store role-specific domain data
- `Question` and related tables store the question bank
- `Exam` and related tables define assessment structure
- `StudentExamAttempt` stores live attempt activity
- `ExamResult` and reporting tables store post-assessment outcomes
- `InAppNotification` and `AuditLog` store communications and operational trace data

## Identity And Access

### `User`

The backend uses Django’s auth user as the actual login account.

This keeps credential handling standard and secure while letting Nexora layer its own business profile logic on top.

### `AccountProfile`

`AccountProfile` is the single source of truth for account role, tenant scope, and workspace routing.

It is the bridge between login and product behavior, but more importantly it is the place where Nexora decides:

- who the user is in product terms
- which institute the user belongs to
- which workspace the user should land in
- which profile record should drive the experience
- which contextual registration data should be preserved

Important fields:

- `user`: one-to-one link to the Django user
- `role`: platform admin, institute admin, teacher, student, or parent
- `institute`: tenant link for all non-platform-admin users
- `student_profile`: optional one-to-one link for student users
- `teacher_profile`: optional one-to-one link for teacher users
- `registration_context`: JSON payload for signup context and onboarding metadata

### Role model

The current roles are:

- `platform_admin`
- `institute_admin`
- `teacher`
- `student`
- `parent`

### Important behavior

The `AccountProfile.clean()` rules enforce that:

- platform admins can exist without an institute
- all other roles must belong to an institute
- student accounts must point to a student profile in the same institute
- teacher accounts must point to a teacher profile in the same institute
- parent and institute admin accounts may be linked more lightly, but still stay within the same institute scope

This is why internal and public registration can behave differently in the UI while still landing in the same backend structure.

### Role-driven behavior contract

In practice, `AccountProfile.role` should drive the following:

- dashboard layout
- navigation items
- default landing page after login
- which metadata is required at registration
- which related profile table must exist
- which permissions and API scopes are available
- which analytics and summary cards are shown

This keeps one authoritative account layer while still allowing different product experiences for platform admin, institute admin, teacher, parent, and student.

## Tenancy Model

### `Institute`

`Institute` is the top-level tenant.

Important fields:

- `name`
- `code`
- contact details
- location details
- `logo`
- `website`
- `description`
- `metadata`

### Why this matters

Every operational record is tied to an institute, directly or indirectly.

That means:

- institutes can be isolated cleanly
- public registration can map into a controlled tenant
- admin and school data can coexist without mixing
- analytics and reporting stay scoped

## Academic Structure

The current academic model is institute-first, not school-taxonomy-first.

### `AcademicYear`

Represents a year or cycle inside an institute.

Fields:

- `institute`
- `name`
- `start_date`
- `end_date`
- `is_current`

Important rules:

- one academic year name must be unique per institute
- only one current academic year is allowed per institute
- date ranges must be valid and non-overlapping

### `Program`

Represents a track or academic grouping.

Fields:

- `institute`
- `name`
- `code`
- `category`
- `description`
- `sort_order`

### `Cohort`

Represents a specific group of learners inside a program and academic year.

Fields:

- `institute`
- `program`
- `academic_year`
- `name`
- `code`
- `capacity`

### `Subject`

Represents a subject inside an institute, optionally attached to a program.

Fields:

- `institute`
- optional `program`
- `name`
- `code`
- `description`
- `sort_order`

### `Topic`

Represents the topic hierarchy under a subject.

Fields:

- `institute`
- `subject`
- optional `parent_topic`
- `name`
- `code`
- `description`
- `difficulty_level`
- `sort_order`

### Topic difficulty

- foundation
- intermediate
- advanced

### Why the academic model matters

This is the backbone for:

- enrollment
- subject assignment
- question tagging
- exam scoping
- student analytics

## Teacher Domain

### `TeacherProfile`

Stores teacher-specific identity and institutional details.

Fields:

- `institute`
- `employee_code`
- `first_name`
- `last_name`
- `full_name`
- `email`
- `phone`
- `qualification`
- `specialization`
- `bio`
- `profile_photo`
- `joined_at`

### `TeacherAssignment`

Represents the academic scope assigned to a teacher.

Fields:

- `institute`
- `teacher`
- `academic_year`
- `program`
- optional `cohort`
- `subject`
- `assignment_role`
- `is_primary`

### Assignment roles

- main teacher
- assistant
- mentor

### Why this matters

Teacher assignments are how the system knows:

- who teaches what
- which cohort they belong to
- which academic year and subject they operate in
- who should be treated as the primary teacher in a scope

## Student Domain

### `StudentProfile`

Stores student-specific identity and academic placement.

Fields:

- `institute`
- `academic_year`
- `program`
- optional `cohort`
- `admission_no`
- `first_name`
- `last_name`
- `full_name`
- `gender`
- `date_of_birth`
- `email`
- `phone`
- guardian details
- `profile_photo`
- `address`
- `joined_at`
- `accommodation_profile`

### Accommodation profile

`accommodation_profile` is a JSON field used to store student-specific support data such as:

- class level
- board
- exam interest
- subject interests
- registration source
- future accommodation flags

### Why this matters

This is the student record used by:

- dashboards
- exams
- attempts
- results
- subject performance
- future accessibility support

## Question Bank

### `Question`

Stores the core question record.

Fields:

- `institute`
- optional `program`
- `subject`
- optional `topic`
- optional `created_by_teacher`
- `question_type`
- `difficulty_level`
- `content_format`
- `question_text`
- `explanation`
- `default_marks`
- `negative_marks`
- `is_verified`
- `metadata`

### Question types

- MCQ single
- MCQ multiple
- true/false
- short answer

### `QuestionOption`

Stores options for objective questions.

Fields:

- `question`
- `content_format`
- `option_text`
- `option_order`
- `is_correct`

### `QuestionTag`

Stores institute-scoped tags for organization and filtering.

### `QuestionTagMap`

Maps questions to tags.

### `QuestionAttachment`

Stores supporting files for a question.

Fields:

- `question`
- `file`
- `attachment_type`
- `title`
- `display_order`
- `alt_text`
- `is_inline`

## Exam Model

### `Exam`

Defines the assessment itself.

Fields:

- `institute`
- `academic_year`
- `program`
- optional `cohort`
- optional `subject`
- `title`
- `code`
- `description`
- `exam_type`
- `delivery_mode`
- `status`
- `duration_minutes`
- `total_marks`
- `passing_marks`
- `start_at`
- `end_at`
- `instructions`
- timing and review controls
- attempt policy controls
- security controls
- access key
- assignment mode
- `metadata`

### Exam types

- practice
- quiz
- test
- assessment
- mock exam
- final exam

### Delivery modes

- online
- offline
- hybrid

### Status lifecycle

- draft
- scheduled
- live
- completed
- cancelled

### Security and access

The exam includes:

- access key support
- security mode
- access key enable/disable
- resume controls
- section switching controls
- result publish controls

### `ExamSection`

Breaks an exam into structured parts.

Fields:

- `exam`
- `name`
- `description`
- `section_order`
- `instructions`
- `total_questions`
- marks configuration
- `timer_enabled`
- `duration_minutes`
- `allow_skip_section`
- `lock_after_submit`

### `ExamQuestion`

Links exam sections to question records and stores exam-level sequencing.

### `ExamPublishLog`

Tracks publication events for exams.

### `ExamStudentAssignment`

Tracks which students are assigned to an exam.

## Attempt And Runtime Data

### `StudentExamAttempt`

Represents a student’s live or completed attempt.

Fields:

- `institute`
- `exam`
- `student`
- `attempt_no`
- `status`
- `started_at`
- `submitted_at`
- `expires_at`
- question counts
- scoring totals
- `percentage`
- `time_taken_seconds`
- `is_auto_submitted`
- `metadata`

### Attempt statuses

- in progress
- submitted
- auto submitted
- expired
- cancelled

### `AttemptIntegrityEvent`

Stores browser and runtime integrity signals.

Fields:

- `institute`
- `attempt`
- `exam`
- `student`
- `event_type`
- `severity`
- `counts_as_violation`
- `event_at`
- `metadata`

### Integrity event types

- focus lost
- tab hidden
- fullscreen exited
- fullscreen restored
- connection lost
- connection restored
- warning threshold reached

### `StudentAnswer`

Stores each answer submitted by a student inside an attempt.

Fields:

- `attempt`
- `question`
- optional `selected_option`
- `selected_option_ids`
- `answer_text`
- `is_correct`
- marks awarded and negative marks applied
- `answered_at`
- `time_spent_seconds`
- `is_marked_for_review`

## Results And Analytics

### `ExamResult`

Stores the final result for a student attempt.

Fields:

- `institute`
- `exam`
- `student`
- `attempt`
- `result_status`
- `rank`
- `total_marks`
- `score`
- `negative_score`
- `final_score`
- `percentage`
- answer counts
- `time_taken_seconds`
- publication state
- `metadata`

### Result statuses

- pass
- fail
- absent
- withheld

### `StudentTopicPerformance`

Stores topic-level performance for one student on one exam.

Fields:

- `institute`
- `exam`
- `student`
- `subject`
- optional `topic`
- attempt and scoring breakdown

### `ExamPerformanceSummary`

Stores aggregated exam-level analytics.

Fields:

- `institute`
- `exam`
- total students
- total attempted
- total passed
- total failed
- averages
- highest and lowest score
- `last_calculated_at`
- `metadata`

## Notifications And Audit

### `InAppNotification`

Stores in-app notifications for users.

Fields:

- `institute`
- `recipient_user`
- `notification_type`
- `title`
- `message`
- related object references
- read state
- `metadata`

### `AuditLog`

Stores operational trace and compliance-friendly event history.

Fields:

- `institute`
- `user`
- `action`
- `entity_type`
- `entity_id`
- `message`
- `metadata`
- `ip_address`
- `user_agent`

## Public Registration And Internal Registration

One of the most important parts of the current design is that public and internal registration share the same backend database area.

### Shared backend concept

All registration paths eventually create the same kinds of records:

- `User`
- `AccountProfile`
- `StudentProfile` or `TeacherProfile`
- `Institute`
- academic rows such as `AcademicYear` and `Program`

### Public registration flow

Public registration uses a controlled institute-backed path:

- the user chooses a role
- the form stays lightweight
- the school/institute field is optional
- the backend first tries `school_code`
- if that is not found, it can fall back to `school_name`
- if neither is provided, it uses the public registration institute

### Why this matters

This gives us:

- one account system for public and internal users
- one profile model for both launch modes
- one institute-linked data structure
- one future path for dashboards and permissions

### Public registration tenant

The backend creates and uses a special public registration institute:

- code: `NEXORA-PUBLIC`
- name: `Nexora Public Learning`

This acts as the default tenant for public self-serve onboarding.

### Registration context

`AccountProfile.registration_context` stores the meaningful onboarding choices, such as:

- class level
- board
- exam interest
- subject interests
- child class level
- parent focus
- teaching scope
- school name
- school code

This is the bridge between the form and the later workspace.

### Student registration outcome

For a student, the backend creates:

- a `User`
- a `StudentProfile`
- an `AccountProfile` linked to that student profile

The student profile gets the academic placement and the accommodation JSON snapshot.

### Teacher registration outcome

For a teacher, the backend creates:

- a `User`
- a `TeacherProfile`
- an `AccountProfile` linked to that teacher profile

### Parent registration outcome

For a parent, the backend creates:

- a `User`
- an `AccountProfile` with parent role

The parent role is intentionally lighter at signup and can be expanded later with child-linking flows.

## Constraints And Validation

The current schema is protected by a healthy amount of model validation.

### Key uniqueness rules

- institute code is unique
- academic year name is unique per institute
- one current academic year per institute
- program code is unique per institute
- cohort code is unique per institute
- subject code is unique per institute
- topic code is unique per subject
- teacher employee code is unique per institute
- student admission number is unique per institute
- exam code is unique per institute
- exam access key is unique per institute
- question option order is unique per question
- question tags are unique per institute
- question-tag mapping is unique per question and tag
- student attempt number is unique per exam and student
- result is unique per exam, student, and attempt

### Cross-table validation

The model layer also checks that:

- student, teacher, program, cohort, subject, and institute belong together
- exam scope matches the selected academic hierarchy
- attempts belong to the same institute and student as their exam
- results are only created from valid submitted attempts
- integrity events and answers belong to the correct exam and attempt

## Index Strategy

The database uses indexes to support the most common lookups:

- institute-scoped filters
- active/inactive lists
- academic-year and cohort navigation
- exam search and scheduling
- question bank filtering by subject, topic, type, and verification state
- attempt and result reporting
- notification unread state
- audit history and compliance review

This is a strong sign that the schema is built for operational filtering, not just storage.

## What Is Not Yet Modeled

The current database is strong for assessment and registration, but it does not yet include full production tables for:

- subscriptions and billing
- entitlements and feature plans
- parent-child linking relations
- teacher groups and join workflows
- public catalog browsing entities beyond the current academic hierarchy
- chapter-first or board-first taxonomy as a fully separate model
- LMS sync tables
- webhook delivery tables

Those are future extensions, not current gaps in the live assessment backbone.

## Recommended Data Flow

### Student public sign-up

1. User lands on the public registration page.
2. User selects student role.
3. User enters only the fields needed for that role.
4. Backend resolves institute from school code or the public registration institute.
5. Backend creates user, student profile, and account profile.
6. Backend routes the user into the student workspace.

### Teacher public sign-up

1. User selects teacher role.
2. User enters role-specific teaching details.
3. Backend creates teacher profile and account profile.
4. Teacher lands in the teaching workspace.

### Internal admin-created registration

1. Institute admin creates the account from the internal system.
2. The same profile tables are used.
3. The same account-role structure is used.
4. The same institute tenancy rules apply.

This is why the public and internal systems should feel different in UI but identical in core data behavior.

## Future Extension Points

The current schema is intentionally flexible enough to support the next phases of Nexora:

- subscription tiers can layer on top of `AccountProfile` and institute tenancy
- subject-specific dashboards can be derived from the existing `Subject` and `StudentTopicPerformance` tables
- class, board, and prep catalogs can be added without breaking the current institute model
- parent-child relations can be added without rewriting user identity
- paid feature access can be controlled through separate entitlement tables later

## Summary

The current Nexora database is an institute-scoped, role-aware, assessment-first schema.

Its strongest qualities are:

- a clean tenant model
- clear separation between login and domain data
- solid academic hierarchy
- normalized exam/attempt/result storage
- enough flexibility for public registration and future subscription support

If you want, the next step can be a visual ERD-style version of this design or a simpler “tables and relationships” cheat sheet for day-to-day use.
