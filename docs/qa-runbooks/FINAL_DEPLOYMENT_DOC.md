# Nexora Learn Deployment Runbook

## Purpose

This document is the single operator runbook for:

- first-time deployment on a new server
- daily or incremental updates on an existing server

It reflects the working stage deployment pattern used for:

- `edutech_backend`
- `edutech_web`
- domain: `learn.accerio.in`

## Live Topology

Current recommended topology:

- frontend: Next.js
- backend: Django + Gunicorn
- reverse proxy: Nginx
- database: PostgreSQL
- TLS: Certbot

Private runtime ports:

- backend: `127.0.0.1:8010`
- frontend: `127.0.0.1:3001`

Important path split:

- platform admin frontend: `/admin`
- Django admin: `/django-admin/`
- Django REST API: `/api/v1/`
- Next internal route handlers: `/api/...` except `/api/v1/...`

This avoids the routing conflict between Django admin and the Next.js platform admin UI.

## Server Layout

Repository root on server:

```text
/var/www/nexora-learn/edutech/
```

Important subfolders:

```text
/var/www/nexora-learn/edutech/edutech_backend
/var/www/nexora-learn/edutech/edutech_web
/var/www/nexora-learn/edutech/deployment
```

## Services

Systemd services:

- `nexora-learn-backend`
- `nexora-learn-web`
- `nginx`

## Environment Files

Backend:

```text
/var/www/nexora-learn/edutech/edutech_backend/.env.production
```

Frontend:

```text
/var/www/nexora-learn/edutech/edutech_web/.env.production
```

## First-Time Deployment On A New Server

Use this only for a fresh EC2 or a fresh Linux host.

### 1. Provision the server

Recommended baseline:

- Ubuntu 24.04 LTS
- `t3.small` minimum
- `20 GB` or larger root disk

Security group inbound rules:

- `22` from your IP
- `80` from `0.0.0.0/0`
- `443` from `0.0.0.0/0`

### 2. Install packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx python3 python3-venv python3-pip postgresql postgresql-contrib libpq-dev build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Optional TLS package:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 3. Prepare the deploy directory

```bash
sudo mkdir -p /var/www/nexora-learn
sudo chown -R ubuntu:www-data /var/www/nexora-learn
cd /var/www/nexora-learn
```

### 4. Get the code

If cloning from git:

```bash
git clone <your-repo-url> edutech
```

Expected root after clone:

```bash
/var/www/nexora-learn/edutech
```

### 5. Create PostgreSQL database and user

```bash
sudo -u postgres psql
```

Run:

```sql
CREATE DATABASE nexora_learn_prod;
CREATE USER nexora_user WITH PASSWORD 'replace-with-strong-password';
ALTER DATABASE nexora_learn_prod OWNER TO nexora_user;
GRANT ALL PRIVILEGES ON DATABASE nexora_learn_prod TO nexora_user;
\c nexora_learn_prod
GRANT ALL ON SCHEMA public TO nexora_user;
GRANT CREATE, USAGE ON SCHEMA public TO nexora_user;
ALTER SCHEMA public OWNER TO nexora_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nexora_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO nexora_user;
\q
```

### 6. Configure backend environment

Create:

```text
/var/www/nexora-learn/edutech/edutech_backend/.env.production
```

Recommended values:

```env
DJANGO_SETTINGS_MODULE=config.settings.prod
DJANGO_SECRET_KEY=<strong-random-secret>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=learn.accerio.in,127.0.0.1,localhost,3.106.125.117

DB_NAME=nexora_learn_prod
DB_USER=nexora_user
DB_PASSWORD=<db-password>
DB_HOST=127.0.0.1
DB_PORT=5432

CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://learn.accerio.in
CSRF_TRUSTED_ORIGINS=https://learn.accerio.in
```

### 7. Set up the backend

```bash
cd /var/www/nexora-learn/edutech/edutech_backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
cp .env.production .env
python manage.py check --settings=config.settings.prod
python manage.py migrate
python manage.py collectstatic --noinput --settings=config.settings.prod
```

### 8. Configure the backend service

Create:

```text
/etc/systemd/system/nexora-learn-backend.service
```

Contents:

```ini
[Unit]
Description=Nexora Learn Django backend
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/var/www/nexora-learn/edutech/edutech_backend
EnvironmentFile=/var/www/nexora-learn/edutech/edutech_backend/.env.production
ExecStart=/var/www/nexora-learn/edutech/edutech_backend/.venv/bin/gunicorn config.wsgi:application --bind 127.0.0.1:8010 --workers 3 --timeout 120
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable nexora-learn-backend
sudo systemctl restart nexora-learn-backend
sudo systemctl status nexora-learn-backend --no-pager
curl -I http://127.0.0.1:8010/admin/login/
```

### 9. Configure frontend environment

Create:

```text
/var/www/nexora-learn/edutech/edutech_web/.env.production
```

Recommended values:

```env
NODE_ENV=production
PORT=3001
API_BASE_URL=https://learn.accerio.in
NEXT_PUBLIC_API_BASE_URL=https://learn.accerio.in
```

Important:

- do not append `/api/v1`

### 10. Set up the frontend

```bash
cd /var/www/nexora-learn/edutech/edutech_web
npm install
npm run build
```

### 11. Configure the frontend service

Create:

```text
/etc/systemd/system/nexora-learn-web.service
```

Contents:

```ini
[Unit]
Description=Nexora Learn Next.js frontend
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/var/www/nexora-learn/edutech/edutech_web
EnvironmentFile=/var/www/nexora-learn/edutech/edutech_web/.env.production
ExecStart=/usr/bin/npm run start -- --hostname 127.0.0.1 --port 3001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable nexora-learn-web
sudo systemctl restart nexora-learn-web
sudo systemctl status nexora-learn-web --no-pager
curl -I http://127.0.0.1:3001
```

### 12. Move Django admin off `/admin`

Edit:

```text
/var/www/nexora-learn/edutech/edutech_backend/config/urls.py
```

Change:

```python
path("admin/", admin.site.urls),
```

to:

```python
path("django-admin/", admin.site.urls),
```

Then restart the backend:

```bash
sudo systemctl restart nexora-learn-backend
```

### 13. Configure Nginx

Create or update:

```text
/etc/nginx/sites-available/nexora-learn
```

Contents:

```nginx
server {
    listen 80;
    server_name learn.accerio.in;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /api/v1/ {
        proxy_pass http://127.0.0.1:8010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /django-admin/ {
        proxy_pass http://127.0.0.1:8010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /var/www/nexora-learn/edutech/edutech_backend/staticfiles/;
    }

    location /media/ {
        alias /var/www/nexora-learn/edutech/edutech_backend/media/;
    }
}
```

Enable and reload:

```bash
sudo ln -sf /etc/nginx/sites-available/nexora-learn /etc/nginx/sites-enabled/nexora-learn
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 14. Point DNS

Update the `A` record:

```text
Type: A
Host: learn
Value: <new-server-public-ip>
TTL: 300
```

### 15. Provision HTTPS

After DNS resolves to the new server:

```bash
sudo certbot --nginx -d learn.accerio.in
```

### 16. Final smoke test

```bash
curl -I http://127.0.0.1:8010/django-admin/login/
curl -I http://127.0.0.1:3001
curl -I https://learn.accerio.in
curl -I https://learn.accerio.in/django-admin/login/
curl -I https://learn.accerio.in/api/v1/health/
```

Expected:

- `/` serves Next.js
- `/django-admin/` serves Django admin
- `/api/v1/` serves Django API
- `/api/` serves Next.js route handlers

Why this split matters:

- the frontend uses browser requests like `/api/exams/advanced-templates`
- those requests are implemented by Next.js route handlers in `edutech_web/src/app/api`
- if Nginx forwards all `/api/` traffic to Django, these endpoints return `404`

## Stage Seed Order

Use this on stage after deployment when you need initial data.

```bash
cd /var/www/nexora-learn/edutech/edutech_backend
source .venv/bin/activate
cp .env.production .env
python manage.py migrate
python manage.py seed_default_geography
python manage.py seed_option_catalog
python manage.py seed_institute_bootstrap DLI001 --name "Demo Learning Institute" --seed-academics
python manage.py seed_master_economy DLI001
python manage.py seed_showcase_questions
python manage.py seed_showcase_exams
```

Optional richer demo data:

```bash
python manage.py seed_demo_academic_data
```

## Daily Or Incremental Update Runbook

Use this for normal code updates on the existing server.

### Backend update

```bash
cd /var/www/nexora-learn/edutech
git pull
cd /var/www/nexora-learn/edutech/edutech_backend
source .venv/bin/activate
pip install -r requirements.txt
pip install gunicorn
cp .env.production .env
python manage.py migrate
python manage.py collectstatic --noinput --settings=config.settings.prod
sudo systemctl restart nexora-learn-backend
sudo systemctl status nexora-learn-backend --no-pager
```

### Frontend update

```bash
cd /var/www/nexora-learn/edutech/edutech_web
npm install
npm run build
sudo systemctl restart nexora-learn-web
sudo systemctl status nexora-learn-web --no-pager
```

### Nginx reload when config changes

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Daily verification

```bash
curl -I https://learn.accerio.in
curl -I https://learn.accerio.in/api/v1/health/
curl -I https://learn.accerio.in/django-admin/login/
sudo systemctl status nexora-learn-backend --no-pager
sudo systemctl status nexora-learn-web --no-pager
sudo systemctl status nginx --no-pager
```

## Troubleshooting

Backend logs:

```bash
journalctl -u nexora-learn-backend -n 100 --no-pager
```

Frontend logs:

```bash
journalctl -u nexora-learn-web -n 100 --no-pager
```

Nginx logs:

```bash
journalctl -u nginx -n 100 --no-pager
```

Port checks:

```bash
sudo ss -tulpn | grep ':8010'
sudo ss -tulpn | grep ':3001'
sudo ss -tulpn | grep ':80'
sudo ss -tulpn | grep ':443'
```

DNS check:

```bash
dig +short learn.accerio.in
```

### Known Failure Pattern: `/api/teacher/...` returns 404 while `/api/v1/...` works

Symptoms:

- `curl -I https://learn.accerio.in/api/v1/academics/cohorts/` returns `401 Unauthorized`
- `curl -I https://learn.accerio.in/api/teacher/academics/cohorts` returns `404 Not Found`
- direct local check to Next may return `401 {"detail":"Portal session is not available."}`

What this means:

- Django is healthy and nginx is correctly reaching the backend for `/api/v1/...`
- the failing route is a Next.js route handler under `/api/teacher/...`
- if the public domain still returns `404`, nginx is almost certainly routing `/api/` to Django instead of Next

Root cause from the June 17, 2026 incident:

- the live nginx site had `location /api/ { proxy_pass http://127.0.0.1:8010; }`
- that sent all `/api/teacher/...` requests to Django
- Django does not own `/api/teacher/...`, so the request returned `404`
- in parallel, the frontend needed a fresh production build so the current route handlers were definitely present in `.next`

Correct routing split:

```nginx
location /api/v1/ {
    proxy_pass http://127.0.0.1:8010;
}

location /api/ {
    proxy_pass http://127.0.0.1:3001;
}
```

Recovery checklist:

```bash
cd /var/www/nexora-learn/edutech/edutech_web
npm install
npm run build
sudo systemctl restart nexora-learn-web

sudo nginx -t
sudo systemctl reload nginx
```

Verification checklist:

```bash
curl -i http://127.0.0.1:3001/api/teacher/academics/cohorts
curl -I https://learn.accerio.in/api/teacher/academics/cohorts
curl -I https://learn.accerio.in/api/v1/academics/cohorts/
```

Expected results:

- local Next route returns `401` JSON without a logged-in session
- public `/api/teacher/...` returns `401` JSON, not `404`
- public `/api/v1/...` returns backend-auth `401`

## Operational Notes

- Do not reuse the Mac-created `.venv` on Linux
- Do not point Django admin and platform admin to the same `/admin` path
- Do not append `/api/v1` to frontend API base URLs
- Keep `DJANGO_DEBUG=False` in production
- Keep SSH restricted to your IP after initial setup

## Quick Daily Commands

Most common update flow:

```bash
cd /var/www/nexora-learn/edutech
git pull
cd edutech_backend
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput --settings=config.settings.prod
sudo systemctl restart nexora-learn-backend
cd ../edutech_web
npm install
npm run build
sudo systemctl restart nexora-learn-web
sudo nginx -t
sudo systemctl reload nginx
```
