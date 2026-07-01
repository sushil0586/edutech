# Phase 3 Secure Assessment Plan

## Purpose

This document defines the first major architecture-build phase after current student and teacher hardening:

- `Phase 3. Secure Assessment Layer`

Reference:

- [HYBRID_PLATFORM_STRATEGY.md](/Users/ansh/Documents/Eductech/docs/architecture-product/HYBRID_PLATFORM_STRATEGY.md:1)
- [NEXORA_GAP_IMPLEMENTATION_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/NEXORA_GAP_IMPLEMENTATION_PLAN.md:318)
- [ARCHITECTURE_NOTES.md](/Users/ansh/Documents/Eductech/docs/architecture-product/ARCHITECTURE_NOTES.md:1)
- [WEBCAM_PROCTORING_ARCHITECTURE_NOTE.md](/Users/ansh/Documents/Eductech/docs/architecture-product/WEBCAM_PROCTORING_ARCHITECTURE_NOTE.md:1)

## Phase Objective

Raise the trust level of the exam engine so Nexora is credible as a serious assessment platform for schools, institutes, and coaching centers.

This phase is not about adding content depth or parent growth loops.

This phase is about:

- exam integrity
- simpler and safer exam access
- stronger teacher confidence during live exams
- better resilience when student sessions are unstable

## Why This Phase Matters

The current product already has a strong assessment backbone:

- exam builder
- section-aware runtime
- attempt lifecycle
- results
- teacher monitoring endpoints
- audit logs

But the secure-assessment layer is still fragmented.

Right now the repo has pieces of the answer, not the full answer:

- security mode values exist
- attempt delivery snapshots exist
- force-submit exists
- live monitor exists
- audit logging exists

What is still missing is a coordinated product layer that makes those capabilities visible, reliable, and enforceable in the student and teacher experience.

## Current Baseline

## Already Present

### Backend Foundations

- exam `security_mode` model field
- exam lifecycle actions such as mark-live and mark-completed
- delivery snapshot logic for stable question and option order
- attempt start, save-answer, section switch, submit, and resume behavior
- attempt monitor alerts for:
  - stalled activity
  - no progress
  - low progress
  - auto-submitted attempts
- teacher force-submit actions
- audit logging across key actions
- live exam monitor endpoint

Primary references:

- [apps/exams/models.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/models.py:1)
- [apps/attempts/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/attempts/services.py:207)
- [apps/results/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/results/services.py:15)
- [apps/results/views/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/results/views/__init__.py:268)

### Web Foundations

- student attempt runtime with timer, progress, and submit flow
- teacher results workspace with live monitor and force-submit capabilities
- teacher exam builder with security mode configuration exposed

Primary references:

- [student attempt page](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/[attemptId]/page.tsx:1)
- [teacher results page](/Users/ansh/Documents/Eductech/edutech_web/src/app/(teacher)/teacher/results/page.tsx:1)
- [teacher exam options](/Users/ansh/Documents/Eductech/edutech_web/src/lib/teacher/exam-options.ts:1)

## Missing Or Weak Today

- accessibility accommodations are not modeled as first-class runtime rules
- teacher live monitoring still needs deeper drilldown and intervention workflows beyond the current first-pass console
- LMS launch and sync are not started

## Current Implementation Status

Phase 3 is no longer only a plan. A substantial first implementation slice is now in place.

### Implemented

- `3A Security Model Normalization`
  - resolved `security_policy` contract
  - student exam detail and attempt detail policy exposure
  - safer teacher-side wording for browser monitoring modes
- `3B Exam Access And Entry Simplification`
  - institute-scoped exam access keys
  - signed-in student key resolution endpoint
  - dedicated student exam-key entry page
  - teacher visibility and management of keys
- `3C Runtime Integrity Events`
  - structured attempt integrity event model
  - browser-event ingest endpoint
  - warning aggregation and threshold handling
  - auto-submit on threshold for supported policies
- `3E Teacher Live Operations Console`
  - attempt-level integrity summaries in teacher monitoring
  - warning count visibility
  - latest integrity signal visibility
  - live auto-refresh in the teacher results monitor
  - teacher-facing attempt health classification
  - intervention queue for highest-risk attempts
  - clearer critical / watch / stable monitor grouping
  - recommended next-action guidance
  - selected-attempt decision-support panel
  - recent integrity-event timeline in the drilldown
  - teacher intervention-note and intervention-history workflow

### Partially Implemented

- `3D Resilience, Autosave, And Recovery`
  - student attempt workspace now shows:
    - pending save / switch / submit states
    - last confirmed backend response
    - last saved answer timestamp
    - reconnect and interrupted-action recovery messaging
  - connection loss / restore events are logged for enhanced monitoring
  - the current loop is still explicit-save based, not background autosave
  - degraded-mode semantics can still be extended later with heartbeat or draft-sync depth
- `3E Teacher Live Operations Console`
  - current console is useful, but not yet a full invigilation board with escalation-state management and broader follow-up tooling
- `3F Accessibility And Accommodation Rules`
  - student accommodation profiles now exist
  - accommodation values are snapshotted into attempts at start time
  - extra time support affects attempt expiry
  - simplified warning copy is supported
  - controlled additional warning allowance is supported for approved cases
  - student runtime surfaces active accommodation support
  - teacher monitoring and exam-builder surfaces show accommodation-aware attempts
  - deeper override strategy and broader accommodation types are still open

### Not Started

- LMS launch and sync
- non-browser media proctoring

## Design Principle For This Phase

Do not treat secure assessment as one giant “anti-cheat feature.”

Instead, break it into five coordinated layers:

1. access control
2. runtime integrity
3. resilience and recovery
4. teacher live operations
5. auditability and accommodations

## Scope Clarification

Phase 3 secure assessment is browser-based.

It includes:

- exam-session rules
- fullscreen expectations
- focus and visibility monitoring
- warning escalation
- teacher-side integrity visibility

It does not include webcam or microphone capture.

If webcam support is later approved, it should be implemented as a separate media-proctoring phase using:

- [WEBCAM_PROCTORING_ARCHITECTURE_NOTE.md](/Users/ansh/Documents/Eductech/docs/architecture-product/WEBCAM_PROCTORING_ARCHITECTURE_NOTE.md:1)

## Phase 3 Sub-Phases

This phase should be implemented in six sub-phases.

## Phase 3A. Security Model Normalization

### Objective

Make security modes meaningful and explicit across backend and frontend.

### Current issue

The model already supports:

- `normal`
- `focus`
- `fullscreen`
- `violation_limited`
- `proctored`

But these values are not yet translated into a clear runtime contract.

### Deliverables

- define security-mode behavior matrix
- document what each mode means for:
  - student runtime
  - teacher monitoring
  - allowed actions
  - violation handling
- expose resolved security behavior in student exam detail and attempt payloads
- ensure teacher exam builder wording is consistent with actual behavior

### Recommended mode mapping

- `normal`
  - standard exam behavior
  - no integrity enforcement beyond normal session handling
- `focus`
  - integrity guidance and visible warnings
  - track focus-loss and suspicious behavior events
- `fullscreen`
  - require fullscreen entry and re-entry prompts
  - log fullscreen exits
- `violation_limited`
  - track violations and lock or auto-submit after limit
- `proctored`
  - highest visibility for teacher monitoring
  - support enhanced event telemetry and audit trail

### Backend work

- add resolved security-policy helpers in `apps/exams/services.py`
- add security policy serialization to student attempt detail and exam detail
- add validation so runtime expectations are coherent per mode

### Frontend work

- update teacher builder help text
- show security expectations on exam detail
- show attempt-runtime warnings and status messaging by security mode

### Status

- implemented
- detailed reference: [PHASE_3A_SECURITY_MODEL_SPEC.md](/Users/ansh/Documents/Eductech/docs/architecture-product/PHASE_3A_SECURITY_MODEL_SPEC.md:1)

## Phase 3B. Exam Access And Entry Simplification

### Objective

Support easier exam launch without removing governed student access.

### Deliverables

- exam key based access flow
- backend exam-entry validation service
- student entry route for exam-key launch
- audit logging for exam-key usage

### Design notes

This should not replace account login.

It should add a second controlled path:

- account-based student portal access
- exam-key based quick exam entry

### Backend work

- add exam key model or exam access token strategy
- add validation for:
  - active exam window
  - assignment eligibility
  - remaining attempts
  - one active attempt at a time
- add audit events for exam-key entry attempts

### Frontend work

- create exam-key entry route
- create student handoff from key entry to active attempt or readiness page
- clearly explain blocked states such as:
  - invalid key
  - exam not live
  - no attempts left
  - student not eligible

### Current implementation note

The current implementation is the governed version of exam-key entry:

- the student must already be signed in
- the key accelerates exam lookup and routing
- the key does not replace authentication

### Status

- implemented as signed-in quick entry
- future optional extension: anonymous or semi-public launch model, if product direction changes

## Phase 3C. Runtime Integrity Events

### Objective

Move from passive runtime to event-aware runtime.

### Deliverables

- client-side integrity event capture
- backend event ingestion endpoint
- violation aggregation
- teacher-visible integrity summaries

### Candidate integrity events

- fullscreen exited
- tab hidden
- window blurred
- repeated leave-and-return behavior
- long stalled activity
- connection lost
- reconnect completed
- manual submit
- auto-submit

### Backend work

- create attempt integrity event model or event log structure
- add service layer for ingesting and summarizing events
- connect events to attempt monitor severity
- define event retention and aggregation rules

### Frontend work

- instrument student attempt runtime to emit supported integrity events
- show student-facing warnings where appropriate
- avoid fake “proctoring” claims unless actual enforcement exists

### Important constraint

This phase should focus on:

- trustworthy logging
- consistent warnings
- actionable teacher visibility

It should not overclaim hard anti-cheat guarantees that the product cannot really enforce in a browser.

### Status

- implemented for the first browser-monitoring slice
- current covered events include:
  - focus loss
  - tab hidden
  - fullscreen exited
  - fullscreen restored
  - connection lost
  - connection restored
  - threshold reached
- future expansion can add richer event patterns and retention controls

## Phase 3D. Resilience, Autosave, And Recovery

### Objective

Make exam-taking feel safe even when the browser or network is unstable.

### Deliverables

- explicit autosave state messaging
- reconnect and recovery banners
- clearer resume language
- submit safeguards during transient failures

### Current baseline

- answer save exists
- attempt resume exists
- question delivery snapshot exists

### Missing product layer

- no explicit student confidence loop around save state
- no reconnect status model
- no degraded-mode UX when backend calls fail mid-attempt

### Backend work

- ensure attempt detail exposes enough metadata for save/recovery state
- add lightweight attempt heartbeat or last-activity timestamp if needed
- standardize save-answer response payload for better client messaging

### Frontend work

- show explicit last-saved feedback
- add reconnect / retry state banners
- distinguish:
  - save failed
  - save pending retry
  - saved successfully
- improve submit fallback messaging when the final submit request is interrupted

### Status

- partially implemented with a strong first production slice
- currently delivered:
  - explicit pending action states for save, section switch, and submit
  - backend-confirmed save and action timestamps
  - reconnect / interrupted-action recovery guidance
  - clearer submit fallback messaging
- still remaining if the product needs deeper resilience later:
  - heartbeat-based confidence signals
  - richer degraded-mode draft recovery
  - true background autosave if product direction requires it

## Phase 3E. Teacher Live Operations Console

### Objective

Upgrade teacher monitoring from endpoint availability to a real live-ops workflow.

### Deliverables

- teacher live monitor dashboard improvements
- clearer alert grouping and attempt triage
- attempt-level integrity summary
- force-submit decision support

### Current baseline

- live monitor endpoint exists
- force-submit exists
- attempt alerts exist

### Missing product layer

- no richer alert grouping
- no action-oriented attempt triage flow
- no clearer distinction between:
  - harmless delay
  - low progress
  - suspicious runtime pattern

### Backend work

- extend live monitor payload with integrity-event rollups
- add attempt alert categories and severity normalization
- include stronger recent-activity signals

### Frontend work

- reorganize teacher results/live-monitor screen into:
  - exam overview
  - high-alert attempts
  - in-progress attempts
  - force-submit review lane
- highlight why an attempt is flagged, not just that it is flagged

### Status

- partially implemented
- current delivered capabilities:
  - live refresh
  - warning counts
  - threshold-reached visibility
  - latest integrity signal visibility
  - attempt health classification:
    - intervene now
    - watch closely
    - stable
  - intervention queue for highest-priority attempts
  - decision-support recommendations for flagged attempts
  - selected-attempt integrity timeline
  - teacher intervention notes and intervention history
- remaining work:
  - richer escalation-state management
  - broader follow-up filtering and review workflows
  - more advanced teacher operations views across multiple attempts at once

## Phase 3F. Accessibility And Accommodation Rules

### Objective

Add first-class student accommodations to the secure-assessment layer.

### Deliverables

- extra-time support
- student- or attempt-level accommodations
- clear teacher-side accommodation visibility
- runtime-safe accommodation behavior

### Candidate accommodations

- extra time
- alternative instructions
- simplified warning copy
- reduced violation strictness only where policy allows

### Backend work

- define accommodation model strategy:
  - student-level defaults
  - exam-assignment overrides
  - attempt runtime snapshot
- ensure accommodations are captured at attempt start

### Frontend work

- show accommodations clearly in student runtime where relevant
- show teacher visibility into active accommodations during monitoring

### Status

- partially implemented
- current delivered capabilities:
  - student-profile accommodation support
  - attempt-start accommodation snapshot behavior
  - extra-time runtime support
  - simplified warning copy
  - controlled additional warning allowance for violation-limited exams
  - teacher-side editing flow in the exam-builder workspace
  - student and teacher visibility for accommodation-aware attempts
- still remaining:
  - assignment-level override strategy
  - broader accommodation types beyond the current first set
  - more policy-aware teacher drilldowns for accommodation decisions

## Updated Recommended Order

Given the current implementation state, the best next sequence is now:

1. move to `Phase 4 Practice And Readiness Core`
2. optional second-pass `3F Accessibility And Accommodation Rules` policy-depth work
3. optional second-pass `3E Teacher Live Operations Console` escalation-state depth
4. optional second-pass `3D Resilience, Autosave, And Recovery` depth work
5. optional second-pass `3C Runtime Integrity Events` expansion

## Why This Updated Order

- security normalization is already done
- the first browser-monitoring loop is already working
- exam-key quick entry already exists in the governed signed-in form
- the first resilience and teacher-triage slice is now already working
- the first accommodation slice is now also working
- the current Phase 3 baseline is now strong enough to stop treating secure assessment as the immediate main branch
- the best next product expansion is regular student value outside assigned exams
- Phase 3 can now continue as targeted second-pass hardening instead of the primary roadmap track

## API And Data Model Additions

These are the most likely new backend additions required.

### Likely New Models

- `AttemptIntegrityEvent`
- `StudentAccommodationProfile` or equivalent
- optional `ExamAccommodationOverride`

Already implemented:

- exam access key fields directly on `Exam`

### Likely Extended Payloads

- student exam detail
- student attempt detail
- teacher live monitor
- teacher attempt detail

### Likely New Endpoints

Already implemented:

- exam key validation / entry
- attempt integrity event ingest

Still likely:

- live monitor detail drilldown improvements
- accommodation management endpoints

## Frontend Surface Areas Affected

### Student Web

- exam detail
- attempt runtime
- summary messaging
- blocked-state handling
- possible new exam-key entry route

### Teacher Web

- exam builder copy and security configuration clarity
- live monitor / results workspace
- attempt drilldown

## What This Phase Explicitly Does Not Include

Do not mix these into Phase 3:

- public consumer onboarding
- parent dashboard
- teacher groups
- chapter-practice engine
- payments
- AI tutoring
- deep mobile rollout

Those belong to later phases.

## Success Metrics

Phase 3 should be considered successful if:

- teachers can distinguish low-risk and high-risk live attempt issues
- students have clearer confidence in save/recovery behavior
- security modes map to real runtime behavior
- the platform offers a simpler exam entry path without weakening governance
- integrity events are logged and surfaced meaningfully
- accessibility accommodations can be handled without custom manual workarounds

## Recommended Immediate Next Step

The best immediate next implementation target is:

- move to `Phase 4 Practice And Readiness Core`

That should focus on:

- student self-practice entry points
- post-result improvement loops
- meaningful next actions when no new assigned exam exists
- using existing weak-area and analytics signals to drive repeat usage

That is now the highest-value next roadmap step, while remaining Phase 3 work can continue as focused hardening passes.
