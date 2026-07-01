# Teacher Scope Model Backlog

## Purpose

This document captures a future backlog item for the teacher role model:

- institute-scoped teacher
- independent teacher

This is not for immediate implementation.

It is a product and architecture backlog note so the idea remains explicit and does not get mixed informally into current teacher work.

## Backlog Theme

The teacher role may eventually need to support two operating modes:

1. `Institute-scoped teacher`
2. `Independent teacher`

## Why This Exists

Today, the repo mostly assumes that a teacher belongs to an institute and works inside institute scope.

A future product direction may require teachers who:

- operate independently
- manage their own learner list
- manage their own lightweight academics
- build exams and question bank assets outside institute governance

That should not be introduced casually as a hidden exception.

It needs an explicit model.

## Future Design Direction

If this work is taken up later, the preferred direction should be:

- one teacher product family
- explicit teacher scope mode
- clear ownership boundaries
- strict backend permission enforcement

Recommended scope modes:

- `scope_mode = institute`
- `scope_mode = independent`

## Institute-Scoped Teacher

Expected future behavior:

- uses institute academic structure
- sees institute students based on allowed scope
- can create teacher-owned exams
- may create institute-source exams if policy allows
- uses institute and teacher-owned question assets as permitted

## Independent Teacher

Expected future behavior:

- does not depend on institute scope
- manages self-owned learner records
- manages self-owned lightweight academic setup
- creates only self-owned exams and content
- does not access institute governance or institute student data

## Important Rule

Do not treat independent teacher as:

- a normal teacher with a null institute and many exceptions

Instead, treat it as:

- an explicit scope model with deliberate rules

## Suggested Future Implementation Shape

If implemented later, define:

- teacher role
- scope mode
- institute relationship as conditional
- ownership rules for learners, academics, exams, and question bank assets

## Status

Backlog only.

Do not implement until:

- teacher scope product direction is approved
- data ownership rules are documented
- permission model is agreed
