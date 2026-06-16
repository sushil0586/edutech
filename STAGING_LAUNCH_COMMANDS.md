# Staging Launch Commands

## Assumptions

- Target host is Ubuntu-like with `systemd` and `nginx`
- Repo will live at `/var/www/nexora-learn`
- Staging hostname is `learn.yourdomain.com`
- Django runs on `127.0.0.1:8010`
- Next.js runs on `127.0.0.1:3001`

## 1. Create App Folder

```bash
sudo mkdir -p /var/www/nexora-learn
sudo chown -R ubuntu:www-data /var/www/nexora-learn
cd /var/www/nexora-learn
```

## 2. Clone Repo

```bash
git clone <your-repo-url> .
```

## 3. Backend Setup

```bash
cd /var/www/nexora-learn/edutech_backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
cp .env.production.example .env.production
```

Edit `edutech_backend/.env.production` with real values.

Recommended same-host values:

```env
DJANGO_SETTINGS_MODULE=config.settings.prod
DJANGO_SECRET_KEY=<strong-random-secret>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=learn.yourdomain.com

APP_VERSION=1.0.0
APP_BUILD=staging

DB_NAME=<staging_db_name>
DB_USER=<staging_db_user>
DB_PASSWORD=<staging_db_password>
DB_HOST=127.0.0.1
DB_PORT=5432

CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://learn.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://learn.yourdomain.com
```

## 4. Backend Validation And Prepare

```bash
cd /var/www/nexora-learn/edutech_backend
source .venv/bin/activate
export DJANGO_SETTINGS_MODULE=config.settings.prod
./manage.py check
./manage.py test --keepdb
./manage.py makemigrations --check --dry-run
./manage.py migrate
./manage.py collectstatic --noinput
```

## 5. Frontend Setup

```bash
cd /var/www/nexora-learn/edutech_web
npm install
cp .env.production.example .env.production
```

Edit `edutech_web/.env.production` with real values.

```env
API_BASE_URL=https://learn.yourdomain.com
NEXT_PUBLIC_API_BASE_URL=https://learn.yourdomain.com
PUBLIC_IP_GEO_ENDPOINT=
PUBLIC_IP_GEO_AUTH_HEADER=
PUBLIC_IP_GEO_AUTH_VALUE=
PUBLIC_IP_GEO_FIELD_MAP_JSON=
```

Important:

- Do not append `/api/v1` to `API_BASE_URL`
- The app already calls `/api/v1/...` internally

## 6. Frontend Validation And Build

```bash
cd /var/www/nexora-learn/edutech_web
npm run lint
npm run build
```

## 7. Install systemd Services

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
```

## 8. Install Nginx Site

Update `deployment/nexora-learn.nginx.conf` first:

- replace `learn.example.com` with your real staging hostname

Then install it:

```bash
sudo cp /var/www/nexora-learn/deployment/nexora-learn.nginx.conf /etc/nginx/sites-available/nexora-learn
sudo ln -s /etc/nginx/sites-available/nexora-learn /etc/nginx/sites-enabled/nexora-learn
sudo nginx -t
sudo systemctl reload nginx
```

## 9. Enable HTTPS

```bash
sudo certbot --nginx -d learn.yourdomain.com
```

## 10. Smoke Test

```bash
curl -i https://learn.yourdomain.com/api/v1/health/
```

Then verify manually:

1. Open `https://learn.yourdomain.com`
2. Confirm the web app loads
3. Confirm `/api/v1/health/` returns `200`
4. Log in as admin
5. Open `/teacher/dashboard`
6. Open `/app/dashboard`
7. Preview an exam
8. Assign students to an exam
9. Toggle and regenerate an exam access key

## 11. Useful Logs

```bash
sudo journalctl -u nexora-learn-backend -n 200 --no-pager
sudo journalctl -u nexora-learn-web -n 200 --no-pager
sudo nginx -t
```
