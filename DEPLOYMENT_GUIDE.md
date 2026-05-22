# Nexora Learn Deployment Guide

## Scope

This guide covers pilot deployment readiness for:

- `edutech_backend`
- `edutech_frontend`

It does not include ERP-style module rollout.

## Recommended Shared-EC2 Topology

Since you already have another project on the same EC2 machine, the safest setup is:

- keep your existing project unchanged
- deploy Nexora Learn into its own folder, database, virtualenv, and systemd service
- use a separate `server_name` in Nginx such as `learn.yourdomain.com`
- serve Flutter web statically from Nginx
- reverse proxy `/api/` and `/admin/` to Django on a private localhost port

Recommended layout:

```text
/var/www/nexora-learn/
  edutech_backend/
  edutech_frontend/
```

Recommended backend bind:

- `127.0.0.1:8010`

This avoids port collisions with the other project and keeps public traffic on the existing Nginx entrypoint.

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

Production web config lives in [edutech_frontend/env/prod.json](/Users/ansh/Documents/Eductech/edutech_frontend/env/prod.json:1).

For a same-host deployment, set:

```json
{
  "API_BASE_URL": "https://learn.yourdomain.com/api/v1"
}
```

Update `API_BASE_URL` before rollout.

## Frontend Pre-Deploy Commands

Run from `edutech_frontend/`:

```bash
flutter analyze
flutter test
flutter build web --release --dart-define-from-file=env/prod.json
```

Optional Android build when the Android SDK is available:

```bash
flutter build apk --release --dart-define-from-file=env/prod.json
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

Prepare the database:

```bash
cd /var/www/nexora-learn/edutech_backend
source .venv/bin/activate
export DJANGO_SETTINGS_MODULE=config.settings.prod
./manage.py migrate
./manage.py collectstatic --noinput
```

Build the frontend:

```bash
cd /var/www/nexora-learn/edutech_frontend
flutter pub get
flutter build web --release --dart-define-from-file=env/prod.json
```

## Nginx And systemd

Sample deployment files are included here:

- [deployment/nexora-learn-backend.service](/Users/ansh/Documents/Eductech/deployment/nexora-learn-backend.service:1)
- [deployment/nexora-learn.nginx.conf](/Users/ansh/Documents/Eductech/deployment/nexora-learn.nginx.conf:1)

Suggested install flow on EC2:

```bash
sudo cp /var/www/nexora-learn/deployment/nexora-learn-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable nexora-learn-backend
sudo systemctl start nexora-learn-backend
sudo systemctl status nexora-learn-backend

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
- do not reuse its database
- do not replace its Nginx server block
- add a new `server_name` instead of changing the old one
- keep secrets and environment files separate

## Post-Deploy Smoke Test

After deployment:

1. Open `https://learn.yourdomain.com`.
2. Confirm the web app loads.
3. Check `https://learn.yourdomain.com/api/v1/health/`.
4. Sign in as an admin.
5. Create one teacher login and one student login.
6. Confirm both users can sign in.
7. Verify `/admin/` loads only for authorized users.

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
4. Build the frontend web release with `env/prod.json`.
5. Deploy backend and frontend.
6. Verify `/api/v1/health/`.
7. Create pilot teacher/student logins for the first institute admins and staff.
8. Perform a live sign-in smoke test for one admin, one teacher, and one student.
