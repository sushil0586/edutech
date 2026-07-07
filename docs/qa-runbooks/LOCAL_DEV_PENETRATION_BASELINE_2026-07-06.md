# Local Dev Penetration Baseline

Last updated: 2026-07-06

## Scope

Safe, non-destructive checks were run against the local dev stack:

- frontend: `http://localhost:3200`
- backend: `http://127.0.0.1:9001`

Roles used:

- `demo-platform-admin`
- `demo-teacher`
- `demo-student`

This pass intentionally excluded:

- denial-of-service behavior
- destructive mutations
- bulk data tampering
- network scanning outside the web application surface

## What Was Tested

- unauthenticated route handling
- sampled role-based access control on backend APIs
- CORS posture on auth and authenticated API endpoints
- basic login failure behavior
- frontend security-header posture
- obvious metadata / security-contact artifacts

## Commands Used

Representative checks:

```bash
curl -I http://localhost:3200/login
curl -I http://localhost:3200/admin
curl -I http://localhost:3200/app/dashboard

curl -X OPTIONS http://127.0.0.1:9001/api/v1/auth/login/ \
  -H 'Origin: http://evil.example' \
  -H 'Access-Control-Request-Method: POST' -D -

curl http://127.0.0.1:9001/api/v1/student/results/ \
  -H "Authorization: Bearer <student-token>" \
  -H 'Origin: http://evil.example' -D -
```

## Positive Signals

The following controls behaved correctly in this pass:

- unauthenticated frontend access to `/admin` and `/app/dashboard` returned `307` redirects to `/login`
- unauthenticated backend access to `/api/v1/economy/admin/catalog-overview/` returned `401`
- student and teacher tokens against sampled admin API returned `403`
- admin token against sampled student API returned `403`
- frontend session cookies are configured as:
  - `HttpOnly`
  - `SameSite=Lax`
  - `Secure` in production

Cookie configuration evidence is in:

- [session.ts](/Users/ansh/Documents/Eductech/edutech_web/src/lib/auth/session.ts:252)
- [session.ts](/Users/ansh/Documents/Eductech/edutech_web/src/lib/auth/session.ts:260)
- [session.ts](/Users/ansh/Documents/Eductech/edutech_web/src/lib/auth/session.ts:452)

## Findings

### PEN-001. Overly permissive CORS on auth and authenticated API endpoints

- Severity: `medium`
- Environment: `local`
- Date found: `2026-07-06`
- Tester: Codex
- Area: CORS / API hardening
- Affected role: all authenticated roles
- Affected route or endpoint:
  - `OPTIONS /api/v1/auth/login/`
  - `GET /api/v1/student/results/`
- CWE or category if known:
  - CWE-942: Permissive Cross-domain Policy with Untrusted Domains

#### Reproduction steps

1. Send an `OPTIONS` preflight request to `/api/v1/auth/login/` with `Origin: http://evil.example`.
2. Observe that the backend responds with `access-control-allow-origin: *`.
3. Send an authenticated `GET` request to `/api/v1/student/results/` with the same origin header.
4. Observe that the backend again responds with `access-control-allow-origin: *`.

#### Actual result

- wildcard CORS is allowed on both auth and authenticated API surfaces
- the backend also allows `authorization` in allowed headers

#### Expected result

- local dev may be permissive by design, but stage and production-aligned environments should restrict origins to known frontend hosts only
- authenticated read APIs should not default to `*` unless there is a deliberate public cross-origin API strategy

#### Business impact

- this expands the attack surface unnecessarily
- if a future frontend change stores tokens in JS-readable storage, permissive CORS immediately becomes much more dangerous
- it also increases configuration-drift risk between dev, stage, and production

#### Evidence

- auth preflight response included:
  - `access-control-allow-origin: *`
  - `access-control-allow-headers: accept, authorization, content-type, user-agent, x-csrftoken, x-requested-with`
- authenticated student-results response included:
  - `access-control-allow-origin: *`

#### Remediation recommendation

- ensure `CORS_ALLOW_ALL_ORIGINS=False` outside temporary sandbox use
- restrict `CORS_ALLOWED_ORIGINS` to known frontend origins
- verify stage and production values match deployment docs
- add a deployment or CI config check so permissive CORS cannot drift into higher environments unnoticed

#### Owner

- backend / platform ops

#### Status

- fixed locally

#### Retest notes

- re-ran the same `OPTIONS` and authenticated `GET` probes after tightening
- `access-control-allow-origin: *` is no longer present on the sampled local responses
- local dev now relies on explicit origin allowlisting in:
  - [dev.py](/Users/ansh/Documents/Eductech/edutech_backend/config/settings/dev.py:4)
  - [.env.example](/Users/ansh/Documents/Eductech/edutech_backend/.env.example:12)

### PEN-002. Frontend HTML responses are missing anti-clickjacking and broader browser hardening headers

- Severity: `low`
- Environment: `local`
- Date found: `2026-07-06`
- Tester: Codex
- Area: frontend security headers
- Affected role: all roles
- Affected route or endpoint:
  - `GET /login`
  - sampled protected frontend pages

#### Reproduction steps

1. Request `HEAD /login` on the frontend.
2. Review the returned headers.
3. Compare with backend responses, which already include headers such as `X-Frame-Options` and `X-Content-Type-Options`.

#### Actual result

- frontend pages did not include:
  - `X-Frame-Options`
  - `Content-Security-Policy`
  - `X-Content-Type-Options`

#### Expected result

- browser-facing HTML should include either:
  - `X-Frame-Options: DENY` or `SAMEORIGIN`, or
  - CSP `frame-ancestors 'none'` or a deliberate equivalent
- MIME sniffing hardening should be explicitly set on browser-facing responses

#### Business impact

- this leaves room for clickjacking-style abuse against login or operator pages
- while not a confirmed exploit by itself, it is unnecessary exposure for privileged admin and institute surfaces

#### Evidence

- `HEAD /login` response included cache and content headers, but no anti-framing header
- backend responses did include stronger defaults such as `X-Frame-Options: DENY`

#### Remediation recommendation

- add security headers at the Next.js layer or reverse proxy layer
- at minimum:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy`
  - a deliberate `Content-Security-Policy` with `frame-ancestors`

#### Owner

- frontend / infra

#### Status

- fixed locally

#### Retest notes

- retested with `curl -I` against `/login` and `/admin` on a fresh production-style local frontend server
- the sampled HTML responses now include:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self';`
- the hardened frontend also passed the local release smoke pack after rebuild and restart

## Low-Priority Observations

- `/robots.txt` is not currently implemented cleanly in local dev and returns an application error shell instead of a simple static robots response
- `/.well-known/security.txt` is absent

These are lower priority than CORS and browser-header tightening, but they should still be cleaned up before wider external exposure.

## Recommended Next Security Steps

1. Tighten and verify CORS config in local, stage, and production-aligned env files.
2. Add explicit frontend/browser security headers at the app or proxy layer.
3. Run the same pass on stage after deploy to confirm higher-environment posture.
4. Expand to authenticated workflow abuse checks:
   - IDOR on cross-tenant records
   - upload validation
   - CSV import abuse paths
   - mutable admin/institute economy actions
