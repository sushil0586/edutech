# Nexora Learner Type Mapping Matrix

## Purpose

This document gives a simple reference for how Nexora should support:

- school
- senior secondary 11/12
- professional

It maps:

- profile fields
- onboarding behavior
- academic structure
- dashboard behavior
- exam and filter logic

This document is meant to keep implementation decisions aligned as the platform grows beyond school-only assumptions.

## Core Model

The shared scalable structure is:

- learner type
- program
- subject
- topic

This is the common model for all learner categories.

## Learner Types

## 1. School

### Typical users

- class 2 to 10 learners
- school exam practice users
- Olympiad and foundational exam prep users

### Academic mapping

- learner type: `school`
- program examples:
  - `Class 6 CBSE`
  - `Class 8 State Board`
  - `Class 10 ICSE`
- subject examples:
  - Math
  - Science
  - English
  - SST
  - Computer
  - GK
- topic examples:
  - Algebra
  - Motion
  - Electricity
  - History of Modern India

### Complete-profile fields

Required:

- learner type
- class
- board
- exam interest
- country
- state
- city
- pincode

Optional:

- school name
- school code
- subject interests
- timezone

### Dashboard behavior

Should emphasize:

- chapter tests
- school practice
- subject recommendations
- teacher assignments
- sample exams
- plan-based exams

### Filter behavior

Top-level filters should support:

- teacher source
- subject
- exam type

## 2. Senior Secondary

### Typical users

- class 11 learners
- class 12 learners
- board-focused stream learners
- learners preparing for stream-heavy academic depth

### Academic mapping

- learner type: `senior_secondary`
- program examples:
  - `Class 11 Science`
  - `Class 12 Commerce`
  - `Class 11 Arts`
- subject examples:
  - Physics
  - Chemistry
  - Biology
  - Mathematics
  - Accountancy
  - Economics
  - Business Studies
  - Political Science
- topic examples:
  - Kinematics
  - Thermodynamics
  - Financial Statements
  - National Income

### Complete-profile fields

Required:

- learner type
- class 11 or 12
- board
- stream
- exam interest
- country
- state
- city
- pincode

Optional:

- school name
- school code
- subject preference
- timezone

### Dashboard behavior

Should emphasize:

- stream-aware subjects
- board-prep focus
- subject depth
- mock and revision readiness
- teacher assignments
- recommended next subjects

### Filter behavior

Top-level filters should support:

- teacher source
- stream
- subject
- exam type

## 3. Professional

### Typical users

- certification learners
- job-skill learners
- tech-professional practice users

### Academic mapping

- learner type: `professional`
- program examples:
  - `AWS Cloud Practitioner`
  - `Azure Administrator`
  - `Python Foundations`
  - `Data Analytics Basics`
- subject examples:
  - Cloud Fundamentals
  - IAM
  - Networking
  - Compute
  - Security
  - DevOps Basics
  - Data Handling
- topic examples:
  - Shared Responsibility Model
  - Virtual Networks
  - IAM Roles
  - Python Functions
  - Storage Services

### Complete-profile fields

Required:

- learner type
- certification track or professional program
- experience level
- specialization interest
- country
- state
- city
- pincode

Optional:

- company or institute name
- timezone
- target exam date
- preferred module focus

### Dashboard behavior

Should emphasize:

- certification track progress
- module-wise tests
- skill analytics
- mock certification exams
- recommended next modules

### Filter behavior

Top-level filters should support:

- subject or module
- certification track
- difficulty
- exam type

## Shared Onboarding Engine

All learner types should use the same onboarding framework.

### Shared flow

1. quick signup
2. complete profile
3. dashboard

### What changes by learner type

Only the role-aware and learner-type-aware fields should change.

The platform should not create separate onboarding engines for:

- school
- 11/12
- professional

Instead it should use:

- one completion shell
- different backend-fed option sets

## Shared Dashboard Engine

All learner types should reuse the same dashboard shell.

### Shared dashboard sections

- welcome summary
- recommended next exam
- available exams
- sample exams
- locked or premium exams
- analytics summary
- assignment or source context

### What changes by learner type

- program label
- subject list
- topic mapping
- recommendation logic
- filter sets

## Shared Teacher Assignment Logic

Teacher-source filtering should still work across learner types.

### School

- teacher may assign by subject like Math or Science

### Senior secondary

- teacher may assign by stream-specific subject like Physics or Accountancy

### Professional

- mentor, trainer, or portal source may assign by module like Security or Networking

### Shared rule

The assignment source should always remain attributable, regardless of learner type.

## Shared Exam Catalog Logic

Exam visibility should remain generic.

Each exam should be associated to:

- learner type
- program
- subject
- topic or topic group
- assignment source if applicable
- plan/unlock state if applicable

This keeps:

- school catalogs
- 11/12 catalogs
- professional catalogs

inside the same platform architecture.

## Field Mapping Summary

## School

- learner type: school
- required academic fields:
  - class
  - board
  - exam interest

## Senior secondary

- learner type: senior_secondary
- required academic fields:
  - class
  - board
  - stream
  - exam interest

## Professional

- learner type: professional
- required academic fields:
  - certification track
  - experience level
  - specialization interest

## Design Rule

The frontend should never assume:

- all learners have a class
- all learners have a board
- all subjects are school subjects

Instead the frontend should always ask backend-driven options for:

- learner type
- programs
- subject options
- topic or module options

## Final Recommendation

This is the scalable product handling model:

- one auth system
- one onboarding system
- one dashboard system
- one exam system
- one generic academic structure

with learner-type branching through backend-fed configuration.

That is how Nexora can cleanly support:

- school
- senior secondary
- professional

without redesigning the product foundation later.

