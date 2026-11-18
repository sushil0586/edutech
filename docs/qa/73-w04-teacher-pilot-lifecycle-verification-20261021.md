# W04 teacher pilot lifecycle verification

21 October 2026. This checkpoint certifies a disposable objective mock exam through the deployed teacher fast path and student runtime on the local TLS Docker stack.

## Outcome

The end-to-end mutable browser scenario passed in 27.4 seconds:

1. teacher created a draft through **Create Draft & Add Questions** without opening commercial or runtime settings;
2. the builder opened the question-first workspace;
3. teacher selected an objective mock, saved schedule/marks, created a section and linked an objective question;
4. teacher assigned the deterministic pilot learner `STU001`, configured a slot and accommodation, and kept access free;
5. publish readiness, score synchronization, publish and live transitions completed;
6. `demo-student` discovered the assigned exam, opened its detail page and saw the saved 60-minute duration;
7. the test soft-deleted the disposable exam in `finally`, then operator cleanup hard-deleted that isolated record and its cascaded lifecycle records.

Final residue checks returned zero `PW-TL-*` exams and zero related publish logs.

## Candidate and environment

- Deployed product candidate: `8d0a239362433e8d9b85e6b29a0d3b5da0c5050e`
- Lifecycle regression commit: `8cbe8da`
- Web image: `edutech-w04-exam-fast-path-web:8d0a2393`
- Product source archive SHA-256: `b1b573f9c740bcb4863ec0fdc80e2137a2f032c5cc220556ac16541a7f80fe1b`
- Docker project: `edutech-w02-docker`
- TLS entry point: `https://localhost:39123/` returned HTTP 200
- PostgreSQL, Redis, backend, web, expiry worker and nginx were healthy after the run.

## Regression improvements

The lifecycle regression now:

- uses the teacher pilot fast-path control instead of traversing all advanced steps;
- asserts commercial controls are absent from the guided route;
- selects `mock_exam` explicitly for the student mock-test surface;
- assigns `STU001` deterministically instead of relying on roster order;
- uses an open schedule window for runtime discovery;
- verifies the assigned exam from a separate authenticated student browser context;
- uses bounded 15-second element waits so stale UI labels fail quickly;
- matches current delivery, refresh and score-sync labels.

## W04.03 disposition

The acceptance criterion that a teacher can create the pilot exam without navigating advanced commercial or runtime concepts is now verified. W04.03 remains **In progress** because the desired high-level sequence still needs product-level reconciliation: shell creation currently captures schedule before the question workspace. A direct comparison against an advanced-builder-created exam and final preset/publish-blocker simplification also remain open.

## Changed file

- `edutech_web/tests/e2e/workflow/teacher-exam-lifecycle-browser-buttons.mutable.spec.ts`

