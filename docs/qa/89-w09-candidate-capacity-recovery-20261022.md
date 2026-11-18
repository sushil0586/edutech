# W09 candidate capacity and recovery checkpoint — 2026-10-22

## Decision

Candidate `8b5f6329c9e1` is **ready for authorized stage confirmation**, not yet approved for market rollout. Local production-style Docker proves the application path, integrity checks, restore procedure and incident delivery contract. It cannot establish shared-stage networking, infrastructure cost, a staffed real webhook, public TLS behavior or pilot-duration sessions.

Candidate images are `edutech-w09-backend:8b5f6329c9e1` and `edutech-w09-web:8b5f6329c9e1`. The candidate used 3.5 CPU/2 GiB for Django, 3.5 CPU/1.5 GiB for PostgreSQL, Redis, nginx, an independent expiry worker and read-only application containers.

## Capacity result

The provisional operating cap is **60 simultaneously active objective-exam students**, with an admission/start schedule that keeps starts and submissions below the measured 100-user burst. The clean 100-user run supplies 1.67× local headroom for that cap.

| Measure | Result | Proposed target |
|---|---:|---:|
| Requests | 1,700 | — |
| Checks | 1,800/1,800 passed | 100% critical checks |
| Unexpected request errors | 0% | <1% |
| Overall p95 | 1.08s | <2s |
| Start p95 | 1.04s | <2s |
| Save p95 | 1.05s | <2s |
| Submit p95 | 1.13s | <2s |
| Persisted state | 100 attempts, 1,000 answers, 100 results | exact reconciliation |
| Score/result defects | 0 mismatches, 0 duplicate results | zero |

An earlier final-SHA execution recorded several 15-minute request durations while the workstation paused; all 100 application iterations actually completed in about 18 seconds and integrity passed. Its log and summary are retained as `host-pause` evidence. The awake-host rerun above is the clean measurement. Stage confirmation must remain awake and monitored and must not inherit the local result by assumption.

## Recovery result

- Database backup: 0.20s.
- Isolated PostgreSQL restore: 0.87s.
- Source/restored counts matched for users, profiles, exams, attempts, answers, results and audit logs.
- Restored `P3B1-RUNTIME-100`: 100 submitted attempts, 1,000 answers and 100 results.
- The objective-only fixture contained zero media files; media recovery with actual uploaded assets remains outside this fixture.
- An in-progress attempt retained ten acknowledged answers across a backend restart and then submitted with one result.
- The health monitor delivered a structured critical event to the configured `pilot-on-call` receiver; a healthy probe produced no incident.

Provisional pilot objectives are alert within two minutes, acknowledgement within fifteen minutes during announced exam windows, application recovery within four hours and a 24-hour recovery point until backup frequency is increased. The real webhook and named roster must be configured and tested on stage.

## Regression result

- Backend recovery/activation set: 22/22 passed; Django system check reported zero issues.
- Chromium core role journeys: 4/4 passed.
- WebKit core role journeys: 4/4 passed.
- Firefox combined core run: 3/4 passed; institute navigation stalled during one click. The isolated unchanged rerun passed 1/1. This intermittent is retained and must be watched on stage.
- A student-detail test race issued fallback navigation while a link navigation was committing. The helper now waits before fallback; Firefox and WebKit affected reruns passed 2/2.
- Accessibility pack: 8 passed; one active-attempt live-region fixture was skipped because no active attempt was present after the capacity run. Keyboard, serious/critical axe, 320px reflow and visible-focus checks passed.

## Remaining release gates

1. Repeat the 60-user target and 100-user headroom runs on the authorized public TLS stage while collecting application, database and host metrics and cost.
2. Configure the real incident webhook and named responder, then acknowledge one synthetic stage incident.
3. Run the actual maximum pilot-duration session through token refresh, interruption and scheduled expiry.
4. Run the complete frozen release matrix, accessibility checks and unfamiliar-user sessions against the same promoted digest.
5. Record the production backup schedule and demonstrate media restore with representative uploaded assets if uploads enter the pilot.

Evidence is under [`evidence/w09-candidate-20261021`](evidence/w09-candidate-20261021/). No credential file or database dump is retained in repository evidence.
