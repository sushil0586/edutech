# Nexora Learn Deployment Guide

## Scope

This guide covers pilot deployment readiness for:

- `edutech_backend`
- `edutech_web`

It does not include ERP-style module rollout.

## Current Deployment Posture

The active web frontend for the current product is `edutech_web`, the Next.js application.

The older Flutter frontend may still exist in the repository for reference, but it is not the primary web deployment target for the current pilot-hardening phase.

## Recommended Shared-EC2 Topology

Since you already have another project on the same EC2 machine, the safest setup is:

- keep your existing project unchanged
- deploy Nexora Learn into its own folder, database, virtualenv, and systemd services
- use a separate `server_name` in Nginx such as `learn.yourdomain.com`
- run Django and Next.js on private localhost ports
- reverse proxy public traffic through Nginx

Recommended layout:

```text
/var/www/nexora-learn/
  edutech_backend/
  edutech_web/
  deployment/
```

Recommended private runtime ports:

- backend: `127.0.0.1:8010`
- web: `127.0.0.1:3001`

This avoids collisions with other apps on the machine and keeps public traffic on the Nginx entrypoint.

## Required API Routing Split

Production Nginx should route requests like this:

- `/` -> Next.js frontend
- `/api/v1/` -> Django backend
- `/api/` -> Next.js route handlers
- `/django-admin/` -> Django admin

Important:

Do not proxy all `/api/` traffic to Django.

The frontend uses internal Next route handlers under `edutech_web/src/app/api` for browser-side actions such as:

- `/api/exams/advanced-templates`
- `/api/exams/advanced-builder/create`
- `/api/admin/institutes`
- `/api/teacher/question-bank/preview-import`

If `/api/` is sent directly to Django, these routes fail with `404` in production even though the frontend code is correct.

## Backend Environment

Use [edutech_backend/.env.production.example](/Users/ansh/Documents/Eductech/edutech_backend/.env.production.example:1) as the production template.

Minimum production variables:

- `DJANGO_SETTINGS_MODULE=config.settings.prod`
- `DJANGO_SECRET_KEY`
- `DJANGO_ALLOWED_HOSTS`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`

Recommended values when frontend and backend share the same host:

- `DJANGO_ALLOWED_HOSTS=learn.yourdomain.com`
- `CORS_ALLOWED_ORIGINS=https://learn.yourdomain.com`
- `CSRF_TRUSTED_ORIGINS=https://learn.yourdomain.com`

## Backend Pre-Deploy Commands

Run from `edutech_backend/`:

```bash
./.venv/bin/python manage.py check
./.venv/bin/python manage.py check --settings=config.settings.prod
./.venv/bin/python manage.py test
./.venv/bin/python manage.py makemigrations --check --dry-run
./.venv/bin/python manage.py collectstatic --noinput
```

Install the runtime server in the backend virtualenv:

```bash
./.venv/bin/pip install gunicorn
```

## Backend Runtime Verification

Health endpoint:

```text
GET /api/v1/health/
```

Expected response includes:

- `status`
- `database`
- `version`
- `build`

## Frontend Environment

The Next.js app reads:

- `API_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`

Local development already uses [edutech_web/.env.local](/Users/ansh/Documents/Eductech/edutech_web/.env.local:1).

For production, create:

- `edutech_web/.env.production`

Recommended same-host values:

```env
API_BASE_URL=https://learn.yourdomain.com
NEXT_PUBLIC_API_BASE_URL=https://learn.yourdomain.com
```

Important:

- Do not append `/api/v1` to `API_BASE_URL` or `NEXT_PUBLIC_API_BASE_URL`.
- The web app already requests paths like `/api/v1/auth/login/`.
- If you include `/api/v1` in the base URL, requests will become invalid, for example `/api/v1/api/v1/auth/login/`.

## Frontend Pre-Deploy Commands

Run from `edutech_web/`:

```bash
npm install
npm run build
```

Optional local production verification:

```bash
npm run start
```

## Shared EC2 Deployment Steps

Example server workflow:

```bash
sudo mkdir -p /var/www/nexora-learn
sudo chown -R ubuntu:www-data /var/www/nexora-learn
cd /var/www/nexora-learn

git clone <your-repo-url> .

cd edutech_backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
cp .env.production.example .env.production
```

Then edit `.env.production` with the real database and domain values.

Prepare the backend:

```bash
cd /var/www/nexora-learn/edutech_backend
source .venv/bin/activate
export DJANGO_SETTINGS_MODULE=config.settings.prod
./manage.py migrate
./manage.py collectstatic --noinput
```

Prepare the Next.js web app:

```bash
cd /var/www/nexora-learn/edutech_web
npm install
cp .env.example .env.production
npm run build
```

Then update `.env.production` with real production values before starting the service.

Recommended `edutech_web/.env.production`:

```env
API_BASE_URL=https://learn.yourdomain.com
NEXT_PUBLIC_API_BASE_URL=https://learn.yourdomain.com
PUBLIC_IP_GEO_ENDPOINT=
PUBLIC_IP_GEO_AUTH_HEADER=
PUBLIC_IP_GEO_AUTH_VALUE=
PUBLIC_IP_GEO_FIELD_MAP_JSON=
```

## Nginx And systemd

Sample deployment files are included here:

- [deployment/nexora-learn-backend.service](/Users/ansh/Documents/Eductech/deployment/nexora-learn-backend.service:1)
- [deployment/nexora-learn-web.service](/Users/ansh/Documents/Eductech/deployment/nexora-learn-web.service:1)
- [deployment/nexora-learn.nginx.conf](/Users/ansh/Documents/Eductech/deployment/nexora-learn.nginx.conf:1)

Suggested install flow on EC2:

```bash
sudo cp /var/www/nexora-learn/deployment/nexora-learn-backend.service /etc/systemd/system/
sudo cp /var/www/nexora-learn/deployment/nexora-learn-web.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable nexora-learn-backend
sudo systemctl enable nexora-learn-web
sudo systemctl start nexora-learn-backend
sudo systemctl start nexora-learn-web
sudo systemctl status nexora-learn-backend
sudo systemctl status nexora-learn-web

sudo cp /var/www/nexora-learn/deployment/nexora-learn.nginx.conf /etc/nginx/sites-available/nexora-learn
sudo ln -s /etc/nginx/sites-available/nexora-learn /etc/nginx/sites-enabled/nexora-learn
sudo nginx -t
sudo systemctl reload nginx
```

If you use Certbot on the same machine:

```bash
sudo certbot --nginx -d learn.yourdomain.com
```

## Coexisting With Another Project

To avoid breaking the existing app on the same EC2:

- do not reuse its systemd service
- do not reuse its Gunicorn port
- do not reuse its web app port
- do not reuse its database
- do not replace its Nginx server block
- add a new `server_name` instead of changing the old one
- keep secrets and environment files separate

## Post-Deploy Smoke Test

After deployment:

1. Open `https://learn.yourdomain.com`.
2. Confirm the Next.js web app loads.
3. Check `https://learn.yourdomain.com/api/v1/health/`.
4. Sign in as an admin.
5. Create one teacher login and one student login.
6. Confirm both users can sign in.
7. Verify `/admin/` loads only for authorized users.
8. Log in as a teacher and open `/teacher/dashboard`.
9. Log in as a student and open `/app/dashboard`.

## Credential Management

Pilot admins create credentials from:

- `Academic Setup -> Students`
- `Academic Setup -> Teachers`

Available actions:

- `Create Login`
- `Reset Password`
- `Disable Login`
- `Enable Login`

Rules:

- only `platform_admin` and `institute_admin` may manage credentials
- passwords are never stored in plain text
- generated passwords are returned only once
- disabling a login does not deactivate the academic profile

## Secure Credential Sharing

When creating or resetting a password:

- copy credentials immediately from the success dialog
- share them over a secure channel
- avoid posting credentials in group chats or permanent shared docs
- ask the user to change the password after first sign-in if your pilot policy requires it

## Release Sequence

1. Prepare production backend environment variables.
2. Run backend checks, tests, and `collectstatic`.
3. Apply migrations.
4. Prepare `edutech_web/.env.production`.
5. Build the Next.js web release with `npm run build`.
6. Deploy backend and web services.
7. Verify `/api/v1/health/`.
8. Create pilot teacher and student logins for the first institute admins and staff.
9. Perform a live sign-in smoke test for one admin, one teacher, and one student.
