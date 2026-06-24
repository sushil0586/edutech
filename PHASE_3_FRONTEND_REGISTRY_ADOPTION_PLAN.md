# Phase 3 Frontend Registry Adoption Plan

## Purpose

This document narrows the next Phase 3 implementation slice to the frontend surfaces that still carry the most question-type branching.

It is a companion to:

- [FUTURE_PROOF_ASSESSMENT_PLATFORM_EXECUTION_BLUEPRINT.md](./FUTURE_PROOF_ASSESSMENT_PLATFORM_EXECUTION_BLUEPRINT.md)
- [NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md](./NEXT_IMPLEMENTATION_EXECUTION_TRACKER.md)
- [NEXT_IMPLEMENTATION_ROADMAP.md](./NEXT_IMPLEMENTATION_ROADMAP.md)

---

## Why this slice now

Backend registry work is already strong enough for the current onboarding target.

What still slows expansion is frontend behavior that is expressed through repeated `if questionType X` branches across:

- teacher authoring
- question bank preview
- student attempt rendering
- results and review labels

That branching is not yet catastrophic, but it is the main place where every new type still feels expensive.

---

## Immediate goal

Move frontend question-type behavior toward shared presentation profiles instead of repeating per-screen condition clusters.

The first slice should not attempt a full renderer rewrite.

It should:

1. centralize text, labels, placeholders, and structured-behavior hints
2. reduce duplicated type-specific decisions in teacher authoring
3. reuse the same profile in at least one student delivery surface

---

## Recommended first implementation slice

Create a shared helper under:

- `edutech_web/src/lib/assessment/question-type-presentation.ts`

This helper should derive a stable presentation profile from the existing question-type definition and capability helpers.

Suggested first consumers:

- `edutech_web/src/components/ui/teacher-question-editor.tsx`
- `edutech_web/src/app/(student)/app/attempts/[attemptId]/page.tsx`

---

## Scope for slice 1

### Centralize these authoring decisions

- question text label
- question text placeholder
- whether the prompt is structured and hidden
- accepted answer label
- accepted answer placeholder
- accepted answer helper copy
- review guidance helper copy
- whether rubric criteria should appear
- whether option text is locked
- whether add/remove option controls should appear

### Centralize these delivery decisions

- text-response placeholder
- text-response helper copy
- text-response row count

---

## Not in slice 1

Do not include:

- full component schema rendering
- dynamic form layout registries
- new question types
- attempt-side component factories
- analytics preset switching

This slice is about reducing branching safely, not redesigning the whole UI layer in one pass.

---

## Success criteria

This slice is successful when:

- teacher question editor no longer owns most per-type placeholder and helper strings inline
- student attempt page reuses the same shared presentation profile for text-response hints
- future type additions can update one shared helper instead of hunting multiple UI files for wording and behavior switches

---

## Next slice after this

After slice 1, the next frontend registry adoption target should be:

- question preview and question bank workspace behavior

Then:

- student attempt option/text renderer partitioning
- results and review display label normalization

