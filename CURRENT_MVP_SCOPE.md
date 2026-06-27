# Current MVP Scope

## Purpose

This document defines the current product scope for the active Nexora pilot-hardening phase.

It is the answer to:

`What are we building right now?`

## Current Product Statement

Nexora is currently being built as:

`an institute-first assessment and exam-readiness platform with teacher operations, student exam workflows, and backend-driven analytics.`

## In Scope Right Now

### Backend Platform

- institute-scoped academic setup
- role-aware authentication
- teacher and student profile management
- question bank
- exam creation and publishing
- attempt lifecycle
- result generation
- analytics and notifications

### Student Web

- login and protected session flow
- dashboard
- exams list and exam detail
- active attempt workspace
- attempt history
- summary
- review
- results
- analytics
- weak areas
- notifications
- settings

### Teacher Web

- login and protected session flow
- dashboard
- exams list and exam detail
- exam builder
- question bank
- question import
- results summary

### Pilot Operations

- admin-managed credentials
- seeded demo accounts
- EC2-style deployment path
- real backend policy-driven student visibility

## Partially In Scope

These are active near-term hardening areas, not brand-new product bets:

- student workflow QA and final fixes
- teacher workflow QA and hardening
- deployment docs aligned to `edutech_web`
- stronger exam trust and operational reliability

## Explicitly Out Of Scope For The Current MVP

### Not Yet Primary Product Areas

- public student self-signup
- public parent self-signup
- parent dashboard
- parent-child linking flows
- teacher groups
- teacher-student invite workflows
- consumer onboarding by board/class/subject
- chapter-wise practice engine
- subscriptions and payments
- referral systems
- live classes
- recorded courses
- AI tutoring
- student bookmarks or saved-question workflows
- student revision-plan builders
- new recommendation engines beyond the current backend-driven next-step heuristics
- fake preference surfaces that imply personalization without real backend support
- large-scale mobile rollout for the new architecture

### Not Part Of The Current Architecture Phase

- ERP modules
- fees
- transport
- hostel
- payroll

## Why This Boundary Exists

The current repository is strongest in the assessment backbone.

The immediate goal is to make that backbone:

- operationally reliable
- demo-ready
- pilot-ready
- extensible for future student-success and hybrid-platform layers

The goal is not to pretend the broader vision is already complete.

## What Comes Next

The next major expansion path is defined in:

- [NEXORA_GAP_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/NEXORA_GAP_IMPLEMENTATION_PLAN.md:1)

Immediate execution priority:

1. finalize student portal QA
2. harden teacher and pilot operations
3. modernize deployment flow around `edutech_web`
4. define the secure assessment layer
5. decide taxonomy direction before broader consumer expansion
