# Webcam Proctoring Architecture Note

## Purpose

This document explains how webcam-based monitoring would fit into Nexora later without confusing it with the current browser-monitoring work.

Current status:

- webcam monitoring is not part of the live product
- Phase 3 browser integrity work does not capture camera or microphone media
- current monitoring is limited to browser and session signals such as:
  - fullscreen exits
  - tab visibility changes
  - focus loss
  - connection interruptions

## Why This Is Separate

Webcam proctoring is a different class of system from browser-integrity monitoring.

It introduces:

- user permission handling
- media capture and storage
- privacy and consent workflows
- retention policies
- possible legal or institute compliance obligations
- teacher review tooling for media evidence

Because of that, webcam support should be treated as a later controlled phase, not as a hidden implication of `proctored` mode.

## What `Proctored` Means Today

In the current product, `proctored` means:

- enhanced browser-event monitoring
- stronger teacher-side visibility
- stricter warning and escalation rules

It does not yet mean:

- webcam streaming
- microphone recording
- photo snapshots
- face detection
- identity verification
- third-party remote invigilation

## Recommended Future Phase

If webcam support is approved, it should be implemented as a dedicated later phase.

Suggested phase name:

- `Phase 4. Media-Based Proctoring`

## Recommended Architecture

### 1. Consent And Session Readiness

Before attempt start:

- request explicit camera permission
- explain what is captured and why
- explain storage and retention
- record consent outcome
- block webcam-required attempts if permission is denied

### 2. Proctoring Session Layer

Create a proctoring session record tied to:

- attempt
- student
- exam
- security policy
- device and browser metadata

Suggested records:

- `ProctoringSession`
- `ProctoringMediaArtifact`
- `ProctoringIncident`

### 3. Capture Strategy

Possible supported capture modes:

- periodic still-image snapshots
- short rolling video clips
- low-rate livestream to a review service

Suggested first implementation:

- still-image snapshots at controlled intervals
- capture only while attempt is active
- store timestamps and session references with each artifact

This is operationally much simpler than continuous video.

### 4. Incident Model

Media capture alone is not useful without a review model.

Future incident types could include:

- no face visible
- multiple faces detected
- camera blocked
- low-light / unreadable feed
- identity mismatch

Important:

These should be treated as reviewable signals, not unquestioned truth.

## Teacher Experience

Teacher-facing media monitoring should include:

- attempt roster with live proctoring state
- last media heartbeat
- consent status
- incident count
- per-attempt incident timeline
- artifact review panel

Teacher controls may later include:

- flag attempt
- annotate incident
- request manual review
- force submit

## Privacy And Governance Requirements

Before webcam support is enabled, Nexora should define:

- institute-level opt-in
- retention duration
- deletion policy
- who can review artifacts
- export rules
- student disclosure text
- admin audit logging

## Implementation Guidance

Do not mix webcam logic into the current browser-integrity event model.

Instead:

- keep browser events in the attempt-integrity event layer
- add a separate media-proctoring subsystem later
- let teacher dashboards combine both sources at the presentation layer

This keeps the current Phase 3 work honest, maintainable, and privacy-aware.
