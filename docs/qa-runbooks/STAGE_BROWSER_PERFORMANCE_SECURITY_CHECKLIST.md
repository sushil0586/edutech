# Stage Browser, Performance, And Security Checklist

Last updated: 2026-07-06

## Purpose

Use this checklist during one complete stage validation wave:

- Playwright release smoke
- Playwright timing probes
- `k6` performance runs
- first penetration sweep

Related documents:

- [PLAYWRIGHT_PERFORMANCE_PENETRATION_EXECUTION_PACK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/PLAYWRIGHT_PERFORMANCE_PENETRATION_EXECUTION_PACK.md)
- [STAGE_PERFORMANCE_TEST_COMMANDS.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_PERFORMANCE_TEST_COMMANDS.md)
- [STAGE_SCALE_UP_VALIDATION_RUNBOOK.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/STAGE_SCALE_UP_VALIDATION_RUNBOOK.md)
- [LOCAL_DEV_PENETRATION_BASELINE_2026-07-06.md](/Users/ansh/Documents/Eductech/docs/qa-runbooks/LOCAL_DEV_PENETRATION_BASELINE_2026-07-06.md)

---

## 1. Pre-Run Checks

- [ ] stage URL is confirmed
- [ ] stage deployment matches intended commit
- [ ] backend stage env has `CORS_ALLOW_ALL_ORIGINS=False`
- [ ] backend stage env `CORS_ALLOWED_ORIGINS` matches only the real stage frontend host
- [ ] backend stage env `CSRF_TRUSTED_ORIGINS` matches only the real stage frontend/backend host pair
- [ ] frontend stage build includes the new browser security headers from `next.config.ts`
- [ ] required demo or seeded role accounts are valid
- [ ] one startable student exam exists
- [ ] one teacher results dataset exists
- [ ] one institute question-bank dataset exists
- [ ] admin economy seed data is present enough for route coverage
- [ ] host monitoring terminal is ready
- [ ] DB monitoring terminal is ready if available
- [ ] artifact folder for this run is decided

Recommended environment:

```bash
export PLAYWRIGHT_BASE_URL=https://learn.accerio.in
export K6_BASE_URL=https://learn.accerio.in
```

Recommended stage security probes before Playwright starts:

```bash
curl -I -s https://learn.accerio.in/login
curl -I -s https://learn.accerio.in/admin
curl -s -D - -o /dev/null \
  -X OPTIONS https://learn.accerio.in/api/v1/auth/login/ \
  -H 'Origin: http://evil.example' \
  -H 'Access-Control-Request-Method: POST'
```

---

## 2. Playwright Release Smoke

- [ ] run `npm run test:e2e:release-smoke`
- [ ] run `npm run test:e2e:operator-mobile-pack`
- [ ] if the stage machine is temporarily resized enough, run `npm run test:e2e:operator-mobile-pack:cross-browser-repeat`
- [ ] confirm no auth failures
- [ ] confirm no route crashes
- [ ] confirm failures are classified immediately:
  - test issue
  - seed/data issue
  - product issue

Artifacts to save:

- [ ] Playwright HTML report or output log
- [ ] traces for retried failures
- [ ] screenshots for failures

Compact operator mobile pack commands:

```bash
cd edutech_web
npm run test:e2e:operator-mobile-pack
```

```bash
cd edutech_web
npm run test:e2e:operator-mobile-pack:repeat
```

```bash
cd edutech_web
npm run test:e2e:operator-mobile-pack:cross-browser-repeat
```

Recommended use:

- use `test:e2e:operator-mobile-pack` on every stage validation wave
- use `test:e2e:operator-mobile-pack:repeat` when Chromium stage stability matters more than speed
- use `test:e2e:operator-mobile-pack:cross-browser-repeat` only on a temporarily resized stage machine or a stronger validation host

---

## 3. Playwright Stage Performance

- [ ] run `npm run test:e2e:stage-performance`
- [ ] record timing JSON attachments
- [ ] compare stage timings against latest local baseline
- [ ] flag routes that regress materially

Watch especially:

- [ ] student result routes
- [ ] teacher results and question bank
- [ ] institute results, shell, and question bank
- [ ] admin economy
- [ ] admin security/settings if unexpectedly slow

---

## 4. Deep Workflow Confidence

- [ ] run `npm run test:e2e:deep-workflow`
- [ ] run `npm run test:e2e:advanced-builder-confidence`
- [ ] confirm failures are not hidden by flaky waits or seed drift

Priority workflows to verify manually if needed:

- [ ] exam creation to publish to student attempt
- [ ] teacher and institute results continuity
- [ ] admin economy propagation
- [ ] mixed onboarding continuity

---

## 5. Performance Wave

## 5.1 Login And Discovery

- [ ] run `k6 run performance/k6/student-login-and-exam-discovery.js`
- [ ] record p50, p95, p99, error rate
- [ ] record host CPU and DB pressure

## 5.2 Session-Reuse Discovery

- [ ] run `k6 run performance/k6/student-session-and-exam-discovery.js`
- [ ] record p50, p95, p99, error rate
- [ ] record host CPU and DB pressure

## 5.3 Runtime Save Pressure

- [ ] run `k6 run performance/k6/student-exam-runtime.js` with save-heavy settings
- [ ] record save latency
- [ ] record attempt detail latency
- [ ] record DB and app pressure

## 5.4 Submission Spike

- [ ] run `k6 run performance/k6/student-exam-runtime.js` with submit-focused settings
- [ ] record submit latency
- [ ] record error rate
- [ ] record any timeouts

---

## 6. Penetration Sweep

## 6.1 Unauthenticated

- [ ] public routes reviewed for unintended data exposure
- [ ] forced browsing attempts checked
- [ ] security headers reviewed
- [ ] CORS reviewed
- [ ] confirm no `access-control-allow-origin: *` on sampled auth and authenticated API responses
- [ ] confirm frontend HTML includes:
  - [ ] `X-Frame-Options`
  - [ ] `X-Content-Type-Options`
  - [ ] `Referrer-Policy`
  - [ ] `Content-Security-Policy`

## 6.2 Auth And Session

- [ ] brute-force and rate-limit behavior checked
- [ ] logout and stale-token handling checked
- [ ] `/auth/me/` role leakage checked

## 6.3 Authorization And IDOR

- [ ] student cross-record access checks
- [ ] teacher cross-record access checks
- [ ] institute cross-institute access checks
- [ ] admin-only route protection checks

## 6.4 Upload And Import

- [ ] image upload abuse checks
- [ ] import abuse checks
- [ ] malformed payload handling checked

## 6.5 XSS And Input Tampering

- [ ] stored XSS probe set executed
- [ ] reflected XSS probe set executed
- [ ] enum and hidden-field tampering checked

## 6.6 Economy And Business Logic

- [ ] package and entitlement tampering checked
- [ ] wallet/admin grant abuse checked
- [ ] publish/review lifecycle abuse checked

---

## 7. End-Of-Run Summary

- [ ] release smoke status recorded
- [ ] timing probe status recorded
- [ ] `k6` metrics recorded
- [ ] security findings recorded
- [ ] infra bottlenecks vs code bottlenecks identified
- [ ] confidence impact summarized
- [ ] next action list assigned

---

## 8. Confidence Update Rule

Do not raise confidence only because local runs are green.

Raise confidence only if:

- [ ] stage Playwright subset is green
- [ ] stage timing evidence is captured
- [ ] load results are captured
- [ ] no critical unresolved security finding exists

Security note:

- local penetration findings `PEN-001` and `PEN-002` were fixed and retested locally on `2026-07-06`
- do not mark the same findings closed for stage until the exact stage probes confirm parity
