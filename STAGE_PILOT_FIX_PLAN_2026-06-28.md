# Stage Pilot Fix Plan - 2026-06-28

This note converts the latest stage validation into a short fix and rollout plan for the next 2-3 institute pilot wave.

## Confirmed Fix Applied

- Student exam list CTA priority was corrected so `Open review` now wins over `Open summary` when review is actually available.
- Student exam guidance copy was aligned with the real behavior so the page no longer tells learners to open summary first in cases where review may be the direct next step.

## What Was Verified On Stage

- Three institutes were created through the frontend.
- Institute admins, teachers, and 10 students per institute were created through product flows.
- Platform-owned exams were created and published for those institutes.
- Students could see assigned exams and start live attempts.
- Attempt save feedback was present in the runtime, including backend-confirmed save language.

## Pilot Risks Still To Watch

- Content-pack readiness is still uneven. Some topic lanes have full 50-question approved coverage, while others still look partial.
- Institute-side advanced builder usage still depends on the correct entitlement/package setup.
- Real pilot execution should still manually verify:
  - start exam
  - resume exam
  - submit exam
  - summary visibility
  - review visibility
  - result visibility

## Recommended Pilot-Safe Scope

- Keep the first institute rollout on known-good platform-seeded question lanes.
- Prefer platform-created exams for the first UAT cycle.
- Enable institute or teacher authoring only after entitlement/package checks are confirmed for that tenant.
- Use one dry-run per institute before letting the full student batch start.

## Immediate Next Fixes

1. Re-run focused student regression on exam list, exam detail, attempt start, resume, save, submit, summary, and review.
2. Validate institute-authoring entitlement behavior tenant by tenant.
3. Mark canonical pilot-ready question lanes explicitly in the content docs.
4. Keep a short bug log during first external institute UAT instead of expanding product scope immediately.
