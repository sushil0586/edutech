# Teacher Results And Live Monitoring Spec

## Objective

This document defines how teachers manage outcomes after exam delivery starts or ends.

It combines:

- result generation
- rank calculation
- publication
- leaderboard review
- topic and question analysis
- live attempt monitoring
- teacher intervention notes

## Primary Route

- `/teacher/results`

## Core Data Inputs

Current teacher results workspace already reads from:

- teacher exam list
- teacher result summaries
- exam leaderboard
- exam attempts
- topic performance
- question analysis
- live exam monitor
- attempt interventions

## Functional Areas

### 1. Exam Selection Layer

Teacher results workspace must always make it clear which exam is being inspected.

Rules:

- exams should appear even if no summary exists yet
- “No summary” is a valid state
- result workspace should not hide exams just because downstream summaries are not generated

### 2. Result Lifecycle Controls

Teacher actions:

- generate results
- calculate ranks
- publish results
- refresh exam status
- mark exam completed where allowed

Rules:

- publish must stay disabled or visually down-ranked when backend says exam is not eligible
- post-publish state must be obvious
- generated but unpublished must look different from published

### 3. Result State Scenarios

Teacher must be able to distinguish:

- no attempts yet
- attempts exist but no summary yet
- summary generated but not published
- published results available
- completed exam with final state locked

The UI should not force the teacher to infer these states from banners alone.

### 4. Leaderboard

Leaderboard should show:

- rank
- student identity
- score
- percentage
- completion indicators as supported by backend

Purpose:

- compare performance across the selected exam

### 5. Topic Performance

Topic analysis should show:

- subject
- topic
- attempted question volume
- average percentage

Purpose:

- identify where instruction or remediation is required

### 6. Question Analysis

Question analysis should show:

- question summary
- wrong count
- skip count if available
- total attempts
- subject and topic context

Purpose:

- identify weak items
- identify misleading or too-hard questions

### 7. Live Monitoring

Live monitoring is the teacher’s runtime supervision surface.

It should show:

- active attempts
- latest integrity signal
- alert severity
- attempt health
- whether force-submit is available
- accommodation snapshot summary

Current logic categories already present:

- stable
- watch
- critical

### 8. Intervention Guidance

For each risky attempt, teacher should understand:

- why it is risky
- how urgent it is
- what action is recommended

Teacher actions:

- inspect attempt state
- create intervention note
- optionally force-submit when backend allows

### 9. Intervention Notes

Teacher should be able to record intervention history with:

- attempt reference
- note text
- follow-up type

Follow-up types currently include:

- monitoring
- contacted
- force_submit_considered
- resolved

Purpose:

- operational audit trail
- teacher continuity

### 10. Accommodation Visibility In Monitoring

Monitoring should surface whether a learner has approved support.

Examples:

- extra time applied
- extra warning allowance
- simplified warning copy
- alternative instructions

This is important so live monitoring does not misread supported behavior as suspicious behavior.

## Empty And Error States

Teacher results must clearly separate:

- no exam selected
- no attempts yet
- no result summary yet
- monitor endpoint load issue
- analysis endpoint load issue

## Final UX Rules

Results page should optimize for:

- unmistakable lifecycle states
- low confusion during publication workflow
- operational confidence
- fast movement from exam selection to action

## Definition Of Done

Results and monitoring are complete when:

- teacher can generate, rank, and publish with confidence
- every result state is visually distinct
- monitoring clearly explains why an attempt needs attention
- intervention notes are usable
- result analytics and live monitoring stay truthful to backend data
