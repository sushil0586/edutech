# Advanced Exam Builder Ease Roadmap

## Purpose

This document captures the full future-facing teacher-experience roadmap for the advanced exam builder.

It exists so the team can defer implementation safely without losing the agreed direction.

This roadmap is teacher-first.

It is not about adding more controls.

It is about making advanced exam creation:

- easier to start
- easier to validate
- easier to repeat
- easier to trust

## Core Product Problem

The advanced builder is already powerful.

The main remaining teacher pain is not missing capability.

The pain is effort and uncertainty:

- too much mental validation
- repeated setup work across similar exams
- late discovery of inventory or composition issues
- not enough confidence before final create

## Design Principle

The advanced builder should support three kinds of teacher behavior:

1. `I know exactly what I want`
   Use advanced controls directly.

2. `I know the kind of exam I want`
   Use templates, presets, cloning, and guided defaults.

3. `I need help checking whether this is sensible`
   Use live signals, checklist, and preview.

## Roadmap Structure

This roadmap is divided into four phases:

1. confidence and validation
2. repeatability and reuse
3. guided creation and simplification
4. simulation and teacher assurance

## Phase 1: Confidence And Validation

### Goal

Reduce teacher uncertainty during exam creation.

### Focus

- full exam preview
- pre-create checklist
- live feasibility signals
- stronger persistent builder summary

### Teacher outcome

Teacher can understand whether the exam is structurally valid and what the final paper will feel like before creation.

### Documentation

- [ADVANCED_EXAM_BUILDER_PHASE_1_EASE_PLAN.md](/Users/ansh/Documents/Eductech/ADVANCED_EXAM_BUILDER_PHASE_1_EASE_PLAN.md:1)
- [ADVANCED_EXAM_BUILDER_PHASE_1_IMPLEMENTATION_TICKETS.md](/Users/ansh/Documents/Eductech/ADVANCED_EXAM_BUILDER_PHASE_1_IMPLEMENTATION_TICKETS.md:1)

## Phase 2: Repeatability And Reuse

### Goal

Reduce repeated teacher effort for similar exams.

### Focus

- create from existing exam
- duplicate previous exam with selective carry-forward
- clone structure only
- clone structure plus delivery rules
- stronger section presets
- faster reuse of successful paper patterns

### Teacher outcome

Teacher should not need to rebuild a familiar exam pattern from scratch every time.

### Recommended enhancements

1. `Create from existing exam`
   Teacher can start from:
   - last chapter test
   - last mock exam
   - best-performing past exam

2. `Selective clone options`
   Teacher chooses whether to keep:
   - sections
   - topics
   - delivery rules
   - access rules
   - schedule

3. `Section presets`
   Add reusable section-level patterns such as:
   - practice set
   - concept check
   - application set
   - challenge section
   - revision section

4. `Recently used setups`
   Surface:
   - recently used structures
   - recently used delivery setups
   - recently used section mixes

### Why this matters

Teachers often work in cycles:

- weekly tests
- chapter tests
- revision tests
- mock exams

The product should recognize that repetition and support it.

## Phase 3: Guided Creation And Simplification

### Goal

Make the advanced builder easier for teachers who are not expert operators.

### Focus

- simple mode vs advanced mode
- guided creation paths
- auto-distribute helpers
- contextual defaults
- faster schedule shortcuts

### Teacher outcome

Teacher can choose between a guided path and a fully manual path without losing control.

### Recommended enhancements

1. `Simple mode`
   Show only the most common inputs:
   - scope
   - exam type
   - duration
   - total marks
   - sections
   - topic choices
   - basic delivery

2. `Advanced mode`
   Keep full expert control for power users.

3. `Guided entry paths`
   Allow teachers to start from:
   - quick create
   - template
   - clone previous exam
   - advanced manual create

4. `Auto-distribute helpers`
   Useful helpers:
   - split evenly across topics
   - fill remaining question counts
   - rebalance section totals
   - align counts to available inventory

5. `Contextual defaults`
   Suggest:
   - title
   - code
   - duration
   - passing marks
   - section names
   - review/result settings

6. `Scheduling shortcuts`
   Quick actions such as:
   - start now
   - start tomorrow morning
   - one-hour window
   - school-period exam
   - end at academic-year end

### Why this matters

Many teachers know the paper pattern they want, but not the exact control vocabulary.

The builder should translate teacher intent into structure.

## Phase 4: Simulation And Teacher Assurance

### Goal

Make final exam review feel trustworthy enough that teachers can publish with confidence.

### Focus

- student-mode preview
- richer runtime simulation
- stronger learner-behavior summaries
- final publish-readiness review

### Teacher outcome

Teacher should feel:

- “I know what students will experience.”
- “I know what happens after submit.”
- “I know whether this exam is ready to go live.”

### Recommended enhancements

1. `Student-mode preview`
   Show:
   - exam header
   - section flow
   - timer behavior
   - navigation behavior
   - review visibility behavior

2. `Runtime consequence summary`
   Explain:
   - learners can switch sections or not
   - learners can return or not
   - results appear immediately or later
   - review opens immediately or later

3. `Final publish-readiness review`
   A final surface before publish or create that combines:
   - checklist
   - preview
   - runtime summary
   - warning severity

4. `Teacher assurance states`
   Explicit states like:
   - ready to create
   - create with warnings
   - not ready
   - publish-ready

### Why this matters

Powerful builder controls are not enough.

Teachers need confidence that the operational and learner-facing consequences are correct.

## Suggested Overall Delivery Order

Across all phases, the best high-level order is:

1. Phase 1: confidence and validation
2. Phase 2: repeatability and reuse
3. Phase 3: guided creation and simplification
4. Phase 4: simulation and teacher assurance

## What To Avoid Across All Phases

- adding many new fields without reducing teacher effort
- creating parallel validation systems that disagree
- hiding advanced controls completely
- overloading preview with raw technical details
- building features that help only expert internal users while ignoring ordinary teachers

## Future Implementation Rule

When implementation resumes later:

- use this roadmap as the top-level direction
- use the Phase 1 documents for the first actual build slice
- create Phase 2, 3, and 4 ticket docs only when those phases become active
