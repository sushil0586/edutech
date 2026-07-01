# Phase 3A Security Model Normalization Spec

## Purpose

This document is the implementation-ready technical spec for:

- `Phase 3A. Security Model Normalization`

Reference:

- [PHASE_3_SECURE_ASSESSMENT_PLAN.md](/Users/ansh/Documents/Eductech/docs/implementation-plans/PHASE_3_SECURE_ASSESSMENT_PLAN.md:118)
- [HYBRID_PLATFORM_STRATEGY.md](/Users/ansh/Documents/Eductech/docs/architecture-product/HYBRID_PLATFORM_STRATEGY.md:1)
- [ARCHITECTURE_NOTES.md](/Users/ansh/Documents/Eductech/docs/architecture-product/ARCHITECTURE_NOTES.md:1)

## Objective

Make exam security modes meaningful, explicit, and consistently enforced across:

- backend rules
- student-facing exam detail and attempt runtime
- teacher-facing exam configuration and live operations

This phase does not implement hard anti-cheat guarantees by itself.

It defines:

- what each mode means
- what the platform promises
- what runtime behavior is expected
- what must be visible to teachers and students

## Current Problem

The backend already stores `security_mode`, and the teacher builder already exposes it.

Current supported values:

- `normal`
- `focus`
- `fullscreen`
- `violation_limited`
- `proctored`

But today those modes are mostly labels, not a normalized product contract.

That creates three problems:

1. teachers can configure a mode without a clear expectation of what it changes
2. students are not told what will happen during the attempt
3. future integrity-event work has no stable policy layer to attach to

## Design Goal

After this phase, every `security_mode` value should answer:

- what student behavior is expected
- what runtime restrictions or warnings apply
- what events are logged
- how teachers see issues
- what the platform does automatically

## Non-Goals

This phase does not include:

- full exam-key access flow
- real LMS launch integration
- deep browser lockdown technology
- external safe-browser integration
- webcam proctoring
- payments, parent features, or practice flows

## Proposed Policy Model

Normalize the current five modes into one resolved policy contract.

## Canonical Security Modes

### 1. `normal`

Use when:

- standard online assessments are acceptable
- no stricter runtime expectations are needed

Behavior:

- no forced fullscreen
- no violation threshold
- passive event logging only
- normal student guidance

### 2. `focus`

Use when:

- teachers want a low-friction integrity layer
- student attention changes should be visible

Behavior:

- no forced fullscreen
- focus-loss and visibility-change events logged
- warning banners may appear when the student leaves the exam context
- teacher can see light integrity signals

### 3. `fullscreen`

Use when:

- the exam should be taken in fullscreen
- fullscreen exit should be tracked

Behavior:

- student is prompted to enter fullscreen before continuing
- fullscreen exit events are logged
- student sees re-entry guidance after fullscreen exit
- teacher sees fullscreen-related integrity events

### 4. `violation_limited`

Use when:

- teachers want warnings plus an escalation threshold

Behavior:

- same event tracking as fullscreen or focus, depending on actual runtime support
- violation counter is active
- student sees remaining warning allowance
- after threshold breach, the platform can:
  - lock submission temporarily, or
  - auto-submit, based on exam policy

This spec recommends:

- default action: `auto-submit after threshold`

### 5. `proctored`

Use when:

- the exam requires the highest internal monitoring visibility currently supported by the platform

Behavior:

- all supported integrity events are tracked
- strongest teacher-side visibility and alerting
- teacher monitoring screens prioritize these attempts
- runtime messaging clearly warns the student that the attempt is under enhanced monitoring

Important:

`proctored` in the current browser-based product means:

- enhanced internal event logging and monitoring

It does not yet mean:

- webcam proctoring
- secure browser enforcement
- third-party proctoring integration

## Resolved Security Policy Object

Add a resolved policy object derived from `security_mode`.

This should be serialized into:

- student exam detail
- student attempt detail
- teacher live monitor detail where useful

## Proposed Shape

```json
{
  "security_policy": {
    "mode": "fullscreen",
    "student_label": "Fullscreen required",
    "teacher_label": "Fullscreen monitoring",
    "requires_fullscreen": true,
    "tracks_focus_loss": true,
    "tracks_visibility_change": true,
    "tracks_fullscreen_exit": true,
    "violation_limit_enabled": false,
    "violation_limit": null,
    "violation_action": "none",
    "enhanced_monitoring": true,
    "student_warning_copy": "Stay in fullscreen during the attempt. Exits may be logged.",
    "teacher_monitoring_copy": "Track fullscreen exits and focus changes during the exam."
  }
}
```

## Required Backend Rules

Create a single backend resolver for security behavior.

## New Service Helper

Add to:

- `edutech_backend/apps/exams/services.py`

Recommended function:

```python
def resolve_security_policy(exam) -> dict:
    ...
```

This function should be the single source of truth for:

- labels
- flags
- default violation limits
- monitoring expectations

## Recommended Policy Mapping

### `normal`

```text
requires_fullscreen = false
tracks_focus_loss = false
tracks_visibility_change = false
tracks_fullscreen_exit = false
violation_limit_enabled = false
violation_limit = null
violation_action = none
enhanced_monitoring = false
```

### `focus`

```text
requires_fullscreen = false
tracks_focus_loss = true
tracks_visibility_change = true
tracks_fullscreen_exit = false
violation_limit_enabled = false
violation_limit = null
violation_action = none
enhanced_monitoring = false
```

### `fullscreen`

```text
requires_fullscreen = true
tracks_focus_loss = true
tracks_visibility_change = true
tracks_fullscreen_exit = true
violation_limit_enabled = false
violation_limit = null
violation_action = none
enhanced_monitoring = true
```

### `violation_limited`

```text
requires_fullscreen = true
tracks_focus_loss = true
tracks_visibility_change = true
tracks_fullscreen_exit = true
violation_limit_enabled = true
violation_limit = 3
violation_action = auto_submit
enhanced_monitoring = true
```

### `proctored`

```text
requires_fullscreen = true
tracks_focus_loss = true
tracks_visibility_change = true
tracks_fullscreen_exit = true
violation_limit_enabled = true
violation_limit = 2
violation_action = auto_submit
enhanced_monitoring = true
```

## Serializer Changes

## Backend

Extend these serializers:

- [StudentExamAvailabilitySerializer](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py:299)
- [StudentExamReadinessSerializer](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py:484)
- [AttemptDetailSerializer](/Users/ansh/Documents/Eductech/edutech_backend/apps/attempts/serializers/__init__.py:91)

Add:

- `security_mode`
- `security_policy`

Teacher-side live monitor or attempt detail payloads can later include summarized security-policy data, but that is not required to finish this sub-phase.

## Frontend Type Changes

Extend:

- [StudentExamDetail](/Users/ansh/Documents/Eductech/edutech_web/src/features/dashboard/types.ts:245)
- [StudentAttemptDetail](/Users/ansh/Documents/Eductech/edutech_web/src/features/dashboard/types.ts:298)

Add a shared type:

```ts
export type StudentSecurityPolicy = {
  mode: string;
  student_label: string;
  teacher_label: string;
  requires_fullscreen: boolean;
  tracks_focus_loss: boolean;
  tracks_visibility_change: boolean;
  tracks_fullscreen_exit: boolean;
  violation_limit_enabled: boolean;
  violation_limit: number | null;
  violation_action: "none" | "warn" | "auto_submit";
  enhanced_monitoring: boolean;
  student_warning_copy: string;
  teacher_monitoring_copy: string;
};
```

## Student UX Requirements

## Exam Detail Page

Update the student exam detail page to show:

- security label
- what the student is expected to do
- what is tracked
- whether fullscreen is required

Recommended copy examples:

- `Normal`: Standard online exam rules apply.
- `Focus`: Stay on the exam screen. Focus changes may be logged.
- `Fullscreen`: Enter and remain in fullscreen while attempting.
- `Violation Limited`: Fullscreen and integrity events are enforced. Too many violations may end the attempt.
- `Proctored`: Enhanced integrity monitoring is active for this attempt.

## Attempt Runtime

At the start of the attempt workspace:

- show a security mode banner
- show fullscreen requirement where relevant
- show violation policy when enabled

During the attempt:

- show warning states only when backed by actual runtime detection
- do not display fake counters unless the backend and event model support them

## Teacher UX Requirements

## Teacher Exam Builder

Update mode labels or helper text so teachers understand:

- what each mode really does today
- what it does not do yet

Example:

- `Proctored` should not imply webcam proctoring if that does not exist

## Teacher Live Operations

Even before full event ingestion is added, teacher-facing views should understand:

- which exams are under stricter monitoring expectation
- which attempts belong to stricter modes

This allows better prioritization in live monitoring later.

## Validation Rules

Add backend validation for security coherence.

Examples:

- if `security_mode` requires fullscreen, that expectation must be reflected in the resolved policy
- if `security_mode` enables a violation limit, `violation_limit` and `violation_action` must be non-null in the resolved policy
- if future exam defaults are stored at the institute level, they must validate against supported mode values

## Logging Expectations

This phase does not create the full integrity-event model yet, but it must define what later phases will log.

Minimum expected future event compatibility:

- focus loss
- tab hidden
- fullscreen exited
- reconnect
- manual submit
- auto-submit

The policy object should make it obvious which events matter per mode.

## Suggested File-Level Implementation

## Backend

- [apps/exams/services.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/services.py:1)
  - add `resolve_security_policy()`
- [apps/exams/serializers/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/exams/serializers/__init__.py:299)
  - expose `security_policy` on student-facing exam serializers
- [apps/attempts/serializers/__init__.py](/Users/ansh/Documents/Eductech/edutech_backend/apps/attempts/serializers/__init__.py:91)
  - expose `security_policy` on attempt detail
- optional tests:
  - `apps.accounts.tests.test_auth_access`
  - `apps.attempts.tests.test_attempt_workspace_api`

## Frontend

- [src/features/dashboard/types.ts](/Users/ansh/Documents/Eductech/edutech_web/src/features/dashboard/types.ts:245)
  - add `StudentSecurityPolicy`
- [src/app/(student)/app/exams/[examId]/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/exams/[examId]/page.tsx:1)
  - show security policy guidance
- [src/app/(student)/app/attempts/[attemptId]/page.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/app/(student)/app/attempts/[attemptId]/page.tsx:1)
  - show runtime security banner
- [src/lib/teacher/exam-options.ts](/Users/ansh/Documents/Eductech/edutech_web/src/lib/teacher/exam-options.ts:1)
  - verify teacher-facing labels
- [src/components/ui/create-exam-wizard.tsx](/Users/ansh/Documents/Eductech/edutech_web/src/components/ui/create-exam-wizard.tsx:362)
  - improve help text for security mode choice

## Suggested Delivery Sequence

1. add backend `resolve_security_policy()`
2. expose `security_policy` in student serializers
3. extend frontend types
4. surface policy on exam detail
5. surface policy on attempt runtime
6. update teacher builder copy
7. add tests for policy serialization

## Acceptance Criteria

This sub-phase is done when:

- every security mode maps to an explicit resolved policy
- student exam detail explains the active security expectation
- student attempt runtime shows the active security expectation
- teacher configuration labels match actual behavior
- no mode implies unsupported enforcement
- future integrity-event work has a stable policy layer to build on

## Recommended Next Step After This Spec

Implement backend policy resolution first.

That will unlock the frontend work without guesswork and will keep later integrity-event work aligned with one source of truth.
