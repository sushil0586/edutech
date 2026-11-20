# Shared Lightsail Deployment Bundle

This bundle prepares Nexora Learn for the existing multi-project host. It does not authorize transfer, migration, Caddy reload, DNS changes, or public traffic.

## Boundaries

- Project root: `/srv/saas/projects/learning-portal`
- Private network: `learning-portal-private`
- Edge network: `saas-edge`
- Protected secrets: `/srv/saas/secrets/learning-portal`
- Proposed hostname: `learn.accerio.in`
- Database: dedicated `learning_portal` database and application role on shared PostgreSQL

The backend is private-only. The web service and credential-free API gateway join `saas-edge`; the API gateway also joins `learning-portal-private` and forwards HTTP only to Django. Shared Caddy must not join `learning-portal-private`, and PostgreSQL must never join `saas-edge`.

Django static assets are served by WhiteNoise after the explicit `collectstatic` step. User media is intentionally not exposed as a generic public Caddy file route; protected application download endpoints or an approved private object-storage design must govern media access.

## Build Inputs

Build from the repository root and pass frozen release metadata:

```bash
docker build --platform linux/amd64 -f deployment/lightsail-shared/backend.Dockerfile -t "$BACKEND_IMAGE" .
docker build --platform linux/amd64 -f deployment/lightsail-shared/web.Dockerfile \
  --build-arg APP_BUILD="$APP_BUILD" \
  --build-arg APP_BUILD_TIMESTAMP="$APP_BUILD_TIMESTAMP" \
  --build-arg APP_ENVIRONMENT=staging \
  --build-arg APP_ARTIFACT_SHA256="$APP_ARTIFACT_SHA256" \
  --build-arg API_BASE_URL=http://learning-portal-backend-1:8000 \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://learn.accerio.in \
  -t "$WEB_IMAGE" .
```

Use immutable image digests in `release.env`; mutable tags are insufficient for activation.

## Admission Order

1. Validate this bundle and freeze source/image digests.
2. Create exact release, data, and protected-secret paths.
   The media and static directories must be owned by container UID/GID `10001:10001`
   with no access granted to unrelated project identities.
3. Back up the target database before migration.
4. Load images and verify architecture/digests.
5. Run `activate-release.sh` for private admission.
6. Verify health, authentication, roles, tenant isolation, uploads, and browser workflows.
7. Validate the complete Caddyfile in a disposable copy.
8. Add the route and DNS only after separate approval.

`rollback-release.sh` rolls application containers back to an earlier image set. Database rollback is a separate owner-approved operation because reverse migrations may destroy data.

After building task-owned local images, run `qualify-images.sh` to verify AMD64 metadata, non-root users, migrations, health, headers, PostgreSQL connectivity, and exact cleanup on an isolated Docker network.

## Single-Administrator Operations

Install the versioned `learning-portal-ops`, backup and monitoring files with root ownership. The operator entry point provides:

```bash
sudo learning-portal-ops status
sudo learning-portal-ops logs 30m
sudo learning-portal-ops backup
sudo learning-portal-ops releases
sudo learning-portal-ops certificate
```

`learning-portal-monitor.timer` checks the three application containers, public HTTPS, backup freshness, certificate lifetime, disk and available memory every five minutes. A failed check writes a root-only alert under `/srv/saas/projects/learning-portal/alerts` and emits a `daemon.alert` journal event. External notification delivery is deliberately not embedded in repository scripts; Phase 12 evidence must state whether an external receiver is configured.
