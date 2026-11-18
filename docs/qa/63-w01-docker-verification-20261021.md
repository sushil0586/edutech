# W01 Docker verification — 21 October 2026

The local Docker browser release gate passed after correcting two deployment issues. This is verification of the selected web/API release candidate, with synthetic data. Public staging certification and the broader market-readiness workstreams remain open.

## Candidate and topology

- Branch: `integration/w01-release-20261021` in `Eductech-w01-release`.
- Application commit: `9bd1f564b6cb5935054ae92f253caa5945bd37b2`.
- Source archive SHA256: `965d0fc93fed85e729865ebe7b798a0fc5730a24d57857e053bac11f288353d6`.
- Local `linux/arm64` images were built from the prepared archive, using the committed multi-stage Dockerfiles and lockfiles. No host API or host Next.js server served these checks.
- Docker services: PostgreSQL 16, Redis 7.4, one-shot migrations/static collection, Gunicorn/Django, standalone Next.js and Nginx.
- Project: `edutech-w01-docker`. Network/volumes use `edutech_w01_docker_20261021`. Only the localhost edge port is published; PostgreSQL and Redis have no host ports.
- The API runs production settings with `SECURE_SSL_REDIRECT=True`. Web/API run as non-root users with read-only root filesystems and dropped capabilities.

## Issues fixed

1. The web Docker build did not pass the archive digest into the Next.js builder stage. As a result, the built web response omitted `X-Nexora-Artifact`. The builder now receives it, and the final response matches the API and image labels.
2. The Compose default sent server API requests directly to `http://backend:8000`. Django redirected those requests to HTTPS on the plain internal port. Server API requests now use `http://nginx:8080`; the existing trusted API proxy supplies the HTTPS scheme. This covers shared API clients and Next.js API routes. Production redirects remain enabled. No application access checks were loosened.

## Validation

| Check | Result |
| --- | --- |
| Clean source archive and Docker web/API builds | Passed |
| Web image, API image, web headers and API release identity | Exact commit/archive match |
| All five running services healthy; migration job exited successfully | Passed |
| Django production deployment check and no pending migrations | Passed |
| Deployment regression checks | 31 passed |
| Backend config, account access and assessment regressions in Docker | 79 passed in 142.102 seconds |
| Web TypeScript check; container production build | Passed; 153 pages generated |
| Real UI sign-in: platform admin, institute, teacher, student | 4 passed |
| Session cookies | Secure, HttpOnly, SameSite=Lax |
| Browser role/access checks | 8 passed |
| Teacher dashboard → exams → question bank → reviews → results smoke | Passed |
| Fresh institute provisioning → login holders → student attempt → published result | Passed |
| Browser suite total | 10 passed in 1.7 minutes |

The fresh lifecycle retained score `2.00`, percentage `40.00`, and a published result. Duplicate submission returned 400. Draft, unassigned, inactive-assignment, future-window and expired-window cases were blocked. Another student's exam/attempt and an unauthorized teacher's exam returned 404; result lists remained scoped to the requesting student. Anonymous attempt access returned 401. Synthetic time-window mutations ran through `docker exec` against this stack's database; the browser assertions were unchanged.

All 79 selected backend regression tests passed in the container. These tests use a separate test database and development HTTP-client settings in a separate process; the serving API retains production settings and SSL redirects.

## Local review and operations

The stack is left running at **http://localhost:39121/login**. Synthetic accounts are `demo-platform-admin`, `demo-institute-admin`, `demo-teacher`, and `demo-student`; their local demo password is `Demo@12345`.

The extracted source, environment file, build logs, screenshots and raw browser evidence are outside the repository in `/Users/ansh/Documents/Eductech-w01-artifacts-20261021/docker-verification`. That directory also holds the test-only management-command wrapper that forwards fixture changes into Docker. It is not release source.

From that directory, inspect or stop only this stack:

```sh
docker compose --project-name edutech-w01-docker --env-file stack.env -f source/deployment/performance/compose.phase3b1.yml ps
docker compose --project-name edutech-w01-docker --env-file stack.env -f source/deployment/performance/compose.phase3b1.yml down
```

Stopping with `down` retains the synthetic named volumes. Other projects and their resources were not modified.

## Remaining gates

The local edge uses HTTP on localhost. Secure-cookie behavior was verified under the browser's localhost exception; this run does not certify a public HTTPS endpoint. Public TLS, live staging provenance, shared database comparison and cloud promotion remain pending because the documented staging endpoint is unreachable. Earlier local TLS/recovery evidence remains in the W01 foundation report.

Target-host architecture still requires verification. This selected suite does not certify every UI/UX surface, payment provider, production capacity, media recovery, or signed mobile application. Android/iOS scope remains student-only, with physical-device and store-release checks still required. W01 stays incomplete until its live gates pass.

- [Sanitized execution summary](evidence/w01-docker-20261021/summary.json)
- [Runtime/image identity](evidence/w01-docker-20261021/runtime-summary.json)
- [UI login and cookie evidence](evidence/w01-docker-20261021/ui-login-summary.json)
- [W01 foundation and live staging blocker](62-w01-release-foundation-20261021.md)
