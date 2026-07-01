# Nexora Gap Review And Phased Implementation Plan

## Purpose

This document translates the current architecture gap analysis into an implementation roadmap that matches the actual state of this repository.

It is intended to answer:

- what is already real in the platform
- what is only partially implemented
- what is still missing versus the broader Nexora vision
- what should be built first, next, and later

This plan is grounded in:

- [nexora_learn_architecture_design.md](/Users/ansh/Downloads/nexora_learn_architecture_design.md:1)
- [HYBRID_PLATFORM_STRATEGY.md](/Users/ansh/Documents/Eductech/docs/architecture-product/HYBRID_PLATFORM_STRATEGY.md:1)
- [ARCHITECTURE_NOTES.md](/Users/ansh/Documents/Eductech/docs/architecture-product/ARCHITECTURE_NOTES.md:1)
- [STUDENT_MODULE_NEXTJS_PLAN.md](/Users/ansh/Documents/Eductech/docs/frontend-mobile/STUDENT_MODULE_NEXTJS_PLAN.md:1)

## Executive Read

Nexora is currently strongest as:

- an institute-first assessment platform
- a backend-driven student exam and analytics portal
- a teacher operations MVP for exams and question bank workflows

Nexora is not yet a complete implementation of the broader product vision described in the architecture design document.

Today, the platform is closest to:

- `assessment core`: strong
- `teacher operational tooling`: medium
- `student success platform`: partial
- `parent and growth ecosystem`: early
- `consumer and prep platform`: early
- `mobile-first hybrid ecosystem`: not started for the new architecture

## Current State Summary

### Strongly Implemented

- Django backend with modular app structure
- role-aware authentication and scoped APIs
- academic setup around institute, academic year, program, cohort, subject, and topic
- teacher and student profiles
- question bank and exam builder foundations
- section-aware exam engine
- attempt creation, answer save, submit, scoring, and result generation
- student result, topic performance, and summary reporting
- student Next.js portal routes for dashboard, exams, attempts, results, analytics, weak areas, notifications, and settings
- teacher Next.js routes for dashboard, exams, question bank, exam builder, and results

### Partially Implemented

- student workflow polish and QA completion
- exam security and anti-cheat depth
- teacher monitoring maturity
- marketing site as a true acquisition layer
- deployment docs aligned to the active Next.js frontend, with a small amount of remaining server-layout cleanup
- parent role presence in backend without parent product surface
- leaderboard and reporting signals without full family or cohort experience

### Largely Missing

- direct public student signup
- direct parent signup and parent dashboard
- parent-child linking flows
- teacher-student invite and relationship flows
- teacher groups and join-code workflows
- consumer onboarding by board, class, subject
- chapter-aware taxonomy and chapter-wise practice flows
- LMS integrations
- accessibility accommodations
- subject tools such as equation editor, graphing, drawing, or code response tools
- practice engine outside formal assigned exams
- badges, streaks, milestone journeys, and referral mechanics
- React Native mobile app for the new architecture
- modernized deployment plan for `edutech_web`

## Gap Categories

## 1. Product Scope Gap

The architecture vision is for a multi-sided student success platform across:

- students
- parents
- teachers
- schools and institutes
- later consumer prep users

The current product is much narrower in practice:

- institute-admin seeded access
- teacher-driven assessments
- student exam and reporting workflows

This is not a failure. It means the repo currently represents the assessment backbone, not the full business model.

## 2. Domain Model Gap

The design vision expects school-first taxonomy:

- board
- class level
- subject
- chapter
- topic

The current backend is institute-first:

- institute
- academic year
- program
- cohort
- subject
- topic

This difference matters because it changes:

- onboarding flow
- catalog structure
- public consumer browse experience
- chapter-wise and board-wise practice
- parent and B2C product expansion

This is one of the most important architecture decisions still unresolved.

## 3. Relationship And Growth Gap

The product vision depends on networked relationships:

- parent-child linking
- teacher-student linking
- teacher groups
- invites and join requests
- referral or growth loops later

The current platform is mostly assignment-based and admin-managed.

That is enough for pilots, but it is not enough for the hybrid strategy.

## 4. Student Success Gap

The student module is real, but it is still largely:

- exam-centered
- assigned-workflow-centered
- policy-driven

It is not yet a full daily-use student success system with:

- self-practice
- onboarding completion
- study planning
- targeted practice loops
- achievement loops
- family support surface

## 5. Secure Assessment Gap

The hybrid strategy explicitly wants Exam.net-like trust:

- simple exam access
- stronger integrity signals
- teacher confidence during live exams
- resilience during unstable connections

Current exam runtime is functionally strong, but the security layer is still early.

## 6. Prep And Content Gap

The architecture and hybrid strategy want Olympiad-style prep depth:

- exam catalogs
- free mocks
- public content pages
- practice sets
- prep journeys
- performance-driven recommendations

Current marketing and portal experiences reference this direction, but the repo has not built the real product layer yet.

## 7. Documentation And Deployment Gap

The active web frontend is now `edutech_web`, and the main deployment and demo docs mostly reflect that.

The remaining gap is narrower:

- some historical notes still reference Flutter for porting or archival context
- a few deployment documents still need server-layout consistency

This is now a documentation cleanup problem, not a product-direction problem.

## Implementation Principles

The roadmap below follows these rules:

- protect the current working backend and student flows
- do not rebuild the platform around speculative features too early
- prefer hardening and extension over parallel rewrites
- separate pilot-hardening from long-range product expansion
- avoid major domain-model replacement until the school-vs-institute strategy is explicitly chosen
- finish core trust and practice loops before payments, referral, or AI-heavy ideas

## Recommended Phase Order

The implementation should happen in nine phases.

## Phase 0. Alignment And Cleanup

### Objective

Align documentation, architecture decisions, and delivery targets before adding more product breadth.

### Why this phase exists

Right now there is a mismatch between:

- the architecture vision
- the hybrid strategy
- the active codebase
- the deployment and demo docs

That mismatch will slow every future phase if we do not normalize it first.

### Deliverables

- confirm the current product posture:
  - institute-first assessment platform now
  - hybrid student success platform later
- decide whether school taxonomy is:
  - an immediate migration goal
  - or a compatibility layer added later
- update deployment and demo docs to use `edutech_web` as the primary web frontend
- align deployment runbooks on one server checkout layout: `/var/www/nexora-learn/edutech`
- define a single source of truth for:
  - current MVP scope
  - next-phase scope
  - later strategic scope

### Dependencies

- none

### Completion signal

- the team can answer “what are we building right now?” in one sentence
- the docs no longer imply Flutter web is the active primary frontend
- deployment runbooks no longer disagree on the expected server checkout path

## Phase 1. Student Portal Completion

### Objective

Finish the student Next.js module as a production-ready assessment and analytics portal.

### Why this phase comes first

This is the closest area to completion and delivers immediate user-facing value without risky domain changes.

### Major work

- complete end-to-end QA for all student routes
- close remaining workflow inconsistencies across:
  - attempts
  - summary
  - results
  - review
- strengthen empty, blocked, and policy-delayed states
- validate the dashboard, weak areas, and analytics as a coherent next-action system
- verify live backend-state coverage using [STUDENT_MODULE_QA_CHECKLIST.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STUDENT_MODULE_QA_CHECKLIST.md:1)

### Deliverables

- student portal sign-off
- resolved blocker bugs found during QA
- updated completion status for the student module

### Dependencies

- backend exam lifecycle must be stable

### Completion signal

- student flow passes login -> exam -> attempt -> submit -> summary -> results -> review
- policy-driven states remain understandable
- no blocker-grade student issue remains open

## Phase 2. Teacher And Pilot Operations Hardening

### Objective

Make the teacher and institute workflow operationally reliable for pilot rollout.

### Major work

- harden teacher exam builder and question bank flows
- improve teacher results summaries and monitoring clarity
- run route-level QA for teacher-facing surfaces
- verify import, preview, publish, assignment, and result workflows
- tighten role boundaries for:
  - platform admin
  - institute admin
  - teacher
  - student

### Deliverables

- teacher QA checklist
- reduced operational friction for exam creation and assignment
- stronger pilot readiness for institute setups

### Dependencies

- Phase 1 should be substantially complete

### Completion signal

- one teacher can create, publish, assign, monitor, and evaluate an exam without support hand-holding

## Phase 3. Secure Assessment Layer

### Objective

Raise the trust level of the exam engine so Nexora is credible as a serious assessment platform.

### Current status

This phase is now substantially underway, not just planned.

Already implemented in the current codebase:

- normalized security-policy exposure across student runtime payloads
- governed signed-in exam-key quick entry
- client-to-backend browser integrity event logging
- warning aggregation and threshold handling
- attempt-level resilience messaging and recovery cues in the student attempt workspace
- teacher live-monitor refresh, integrity summaries, and first-pass attempt health triage
- teacher intervention workflow support including:
  - decision-support guidance
  - intervention notes
  - attempt-specific intervention history
- first-pass accommodation support including:
  - student accommodation profiles
  - attempt-time accommodation snapshotting
  - extra-time runtime support
  - teacher-side accommodation editing
  - controlled warning-threshold allowance support

Still incomplete inside this phase:

- deeper accommodation and accessibility rules
- deeper teacher intervention workflows and drilldowns
- LMS-connected launch or sync
- media proctoring such as webcam or microphone
- stronger long-term autosave / heartbeat semantics beyond the current save-confirmation loop

### Major work

- complete the remaining secure-runtime and operations gaps after the first implementation wave
- deepen autosave, reconnect, and recovery semantics where needed
- improve teacher monitoring signals, grouping, and intervention tooling
- preserve exam-key based governed access alongside account login
- add accessibility accommodations such as:
  - extra time support
  - student-level exam accommodations
  - clearer assistive-runtime handling

### Deliverables

- trusted exam access model with account login plus governed exam-key flow
- richer integrity telemetry and teacher-visible warning summaries
- stronger runtime resilience under unstable network conditions
- first-class accommodation support for timed and policy-aware attempts
- documented boundary that browser monitoring is implemented but webcam proctoring is not

### Dependencies

- teacher and student baseline flows must already be stable

### Completion signal

- teachers trust the runtime for high-value exams
- student access is simpler without weakening governance
- remaining secure-assessment work is clearly limited to deeper live ops, deeper accommodation policy depth, and optional future proctoring layers

## Phase 4. Practice And Readiness Core

### Objective

Expand from “take assigned exams” into “return regularly to improve.”

### Major work

- add practice mode outside formal assigned exams
- define practice-oriented test types cleanly in product UX
- support instant-feedback practice flows where appropriate
- create targeted follow-up actions from:
  - weak areas
  - analytics
  - results
- add lightweight recommendation loops using existing performance data
- start chapter-aware practice design where possible, even before a full taxonomy shift

### Deliverables

- student self-practice entry points
- post-result improvement loops
- more repeatable weekly usage outside teacher-assigned exams

### Dependencies

- secure runtime and student portal must be stable

### Completion signal

- a student can log in without a new assigned exam and still have meaningful next actions

## Phase 5. Relationship Layer

### Objective

Build the connection model that supports parents, teacher communities, and growth loops.

### Major work

- implement parent-child linking model and flows
- implement teacher-student linking model
- implement teacher groups
- add group join policy support
- add invite and join-request workflows
- add notifications for relationship events

### Deliverables

- usable parent-child relationship backbone
- teacher group foundation
- student join and approval flows

### Dependencies

- should begin only after the core student and teacher flows are stable

### Completion signal

- a student can connect to a teacher or parent through product workflows, not only through admin-created accounts

## Phase 6. Parent Product MVP

### Objective

Turn the parent role from a backend placeholder into a real product surface.

### Major work

- add parent login and protected parent routes
- create parent dashboard for linked children
- show:
  - readiness
  - weak subjects
  - recent test outcomes
  - activity and alert summaries
- support alerting for:
  - score drops
  - inactivity
  - improvement milestones

### Deliverables

- parent-facing web MVP
- child performance visibility
- basic monitoring and alert usefulness

### Dependencies

- Phase 5 relationship layer must exist

### Completion signal

- a parent can sign in and understand a child’s exam readiness without needing teacher/admin interpretation

## Phase 7. Taxonomy And Catalog Expansion

### Objective

Resolve the biggest long-range model gap between institute-first operations and school or consumer-first preparation journeys.

### Major work

- decide architecture strategy:
  - migrate toward board/class/chapter
  - or add a compatibility catalog layer on top of existing program/cohort structures
- add missing catalog entities needed for:
  - board
  - class level
  - chapter
  - exam catalog
- map current academic entities to future catalog entities
- avoid breaking current institute pilots while extending the model

### Deliverables

- approved domain transition strategy
- first version of school and consumer-ready catalog models
- migration plan for data and UI exposure

### Dependencies

- should not happen as an impulsive refactor before earlier phases

### Completion signal

- the product can support both institute workflows and class/board/chapter-oriented discovery without conceptual conflict

## Phase 8. Prep Catalog, Public Growth, And SEO

### Objective

Build the Olympiad/prep side of the hybrid strategy.

### Major work

- launch public exam-prep landing pages
- create class, subject, and exam-prep catalogs
- add free mock tests and lead capture workflows
- add sample papers and prep journeys
- connect practice and catalog experiences

### Deliverables

- real acquisition-oriented marketing to product funnel
- public preparation surfaces tied to actual product data
- stronger B2C discovery engine

### Dependencies

- catalog and practice layers should exist first

### Completion signal

- the public site becomes a genuine product entry path, not only a branded shell

## Phase 9. Mobile And Monetization Expansion

### Objective

Extend the platform into a durable hybrid business after the core assessment and prep ecosystem is credible.

### Major work

- build the React Native app
- bring key student practice and parent monitoring flows to mobile
- add subscription and paid pack support when product fit is validated
- add milestone journeys, streaks, and engagement loops where they support retention
- expand family and learner lifecycle features gradually

### Deliverables

- React Native mobile MVP
- subscription-ready expansion path
- retained learner experience across web and mobile

### Dependencies

- all earlier platform layers should be sufficiently mature

### Completion signal

- mobile is a meaningful extension of the product, not a second unfinished frontend

## Recommended Milestone Buckets

For practical execution, these phases should be grouped into three milestone buckets.

### Milestone A. Pilot-Ready Platform

Includes:

- Phase 0
- Phase 1
- Phase 2
- Phase 3

Result:

- Nexora is a trustworthy institute assessment platform with polished student and teacher workflows

### Milestone B. Student Success Platform

Includes:

- Phase 4
- Phase 5
- Phase 6

Result:

- Nexora evolves from an exam portal into a connected readiness platform for students, teachers, and parents

### Milestone C. Hybrid Growth Platform

Includes:

- Phase 7
- Phase 8
- Phase 9

Result:

- Nexora can support school, prep, and consumer expansion without losing its institutional backbone

## Recommended Immediate Backlog

The next execution order should be:

1. Update deployment and demo docs for `edutech_web`.
2. Finish student module QA and final fixes.
3. Run teacher workflow hardening and QA.
4. Define the secure assessment feature spec.
5. Decide taxonomy direction before building parent and catalog-heavy modules.

## What Should Not Happen Yet

Avoid these until earlier phases are complete:

- large-scale payments work
- referral engines
- AI tutoring and study planning
- broad React Native implementation
- aggressive domain-model rewrite without a transition strategy
- full ERP module expansion

## Success Definition

This roadmap is working if:

- the current pilot product becomes operationally reliable first
- every new phase builds on a stable base instead of replacing it
- the platform expands from assessment to readiness in a controlled way
- parent, prep, and consumer growth features are added after the trust layer is strong
