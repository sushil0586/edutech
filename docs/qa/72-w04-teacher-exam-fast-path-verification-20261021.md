# W04 teacher exam fast-path verification

21 October 2026. This checkpoint implements and verifies the first W04.03 simplification slice for the assisted teacher pilot.

## Outcome

The teacher guided form now supports a short draft-creation route:

1. choose academic audience and exam identity;
2. set schedule, duration and marks;
3. select **Create Draft & Add Questions**;
4. continue in the existing builder, which defaults a questionless draft to the Linked Questions workspace.

Teachers no longer see access policy, star cost, entitlement code or policy priority in the guided pilot form. Their default values are still submitted so the saved exam contract remains compatible. Runtime, security, review, ranking and learner-experience controls remain reachable through **Review Advanced Settings**, and the separate Advanced Builder remains available from the page header.

## Compatibility

- No backend API, schema, authorization, scoring, saved-answer or result-history contract changed.
- The existing teacher create action and builder handoff are unchanged.
- Admin and institute instances of the shared wizard retain their existing commercial controls and four-step behavior.
- The teacher fast path uses the same preset-derived runtime values as the full guided route.

## Candidate and verification

- Product candidate: `8d0a239362433e8d9b85e6b29a0d3b5da0c5050e`
- Test configuration follow-up: `3284432`
- Docker image: `edutech-w04-exam-fast-path-web:8d0a2393`
- Source archive SHA-256: `b1b573f9c740bcb4863ec0fdc80e2137a2f032c5cc220556ac16541a7f80fe1b`
- Docker project: `edutech-w02-docker`
- TLS entry point: `https://localhost:39123/` returned HTTP 200

Verification results:

- Next.js typecheck: passed.
- Next.js production build: passed locally and inside the immutable Docker build.
- Teacher guided creation focus, validation, draft preservation and desktop/390px fast-path visibility: 1/1 passed.
- Admin guided wizard regression: 1/1 passed.
- Teacher advanced-builder validation regression: 1/1 passed.
- Mutation-only advanced-builder browser scenario: skipped because its explicit mutable-lane flag was not enabled.
- PostgreSQL, Redis, backend, web, expiry worker and nginx: healthy after deployment.

## Remaining W04.03 work

W04.03 remains **In progress**. The next slice must prove an actual disposable teacher draft through question selection, scheduling, preview and publication, then compare the saved configuration and student runtime with the advanced route. Pilot preset choices and publish blockers also need final simplification and mobile verification.

## Evidence

- `docs/qa/evidence/w04-exam-fast-path-20261021/teacher-create-1440.png`
- `docs/qa/evidence/w04-exam-fast-path-20261021/teacher-create-390.png`
- `docs/qa/evidence/w04-exam-fast-path-20261021/release-manifest.json`
- `docs/qa/evidence/w04-exam-fast-path-20261021/SHA256SUMS`

