FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY edutech_web/package.json edutech_web/package-lock.json ./
RUN npm ci

FROM dependencies AS builder
ARG APP_BUILD
ARG APP_BUILD_TIMESTAMP
ARG APP_ENVIRONMENT=staging
ARG APP_ARTIFACT_SHA256
ARG API_BASE_URL
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1 \
    APP_BUILD=${APP_BUILD} \
    APP_BUILD_TIMESTAMP=${APP_BUILD_TIMESTAMP} \
    APP_ENVIRONMENT=${APP_ENVIRONMENT} \
    APP_ARTIFACT_SHA256=${APP_ARTIFACT_SHA256} \
    API_BASE_URL=${API_BASE_URL} \
    NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
COPY edutech_web/ ./
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN groupadd --system --gid 10001 nexora \
    && useradd --system --uid 10001 --gid nexora --home-dir /app nexora
WORKDIR /app
COPY --from=builder --chown=nexora:nexora /app/.next/standalone ./
COPY --from=builder --chown=nexora:nexora /app/.next/static ./.next/static
COPY --from=builder --chown=nexora:nexora /app/public ./public
USER nexora
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
