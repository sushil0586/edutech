FROM python:3.14-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_SETTINGS_MODULE=config.settings.prod

RUN groupadd --system --gid 10001 nexora \
    && useradd --system --uid 10001 --gid nexora --home-dir /app nexora

WORKDIR /app

COPY edutech_backend/requirements.txt /tmp/requirements.txt
RUN pip install --requirement /tmp/requirements.txt \
    && pip install gunicorn==23.0.0

COPY --chown=nexora:nexora edutech_backend/ /app/
RUN mkdir -p /app/staticfiles /app/media \
    && chown -R nexora:nexora /app/staticfiles /app/media

USER nexora

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import json,urllib.request; request=urllib.request.Request('http://127.0.0.1:8000/api/v1/health/', headers={'X-Forwarded-Proto':'https'}); data=json.load(urllib.request.urlopen(request, timeout=3)); assert data['status']=='ok'" || exit 1

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "--graceful-timeout", "30", "--access-logfile", "-", "--error-logfile", "-"]
