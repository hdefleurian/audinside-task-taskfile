# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Enable corepack so the packageManager field in package.json pins pnpm
RUN corepack enable

ARG API_URL=/api
ARG KEYCLOAK_URL=http://localhost:8080
ARG APP_URL=http://localhost:4200

COPY .npmrc package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Substitute placeholder vars in environment.prod.ts before compilation
RUN apk add --no-cache gettext && \
    KEYCLOAK_AUTHORITY="${KEYCLOAK_URL}/realms/taskapp" \
    APP_URL="${APP_URL}" \
    envsubst '${KEYCLOAK_AUTHORITY} ${APP_URL}' \
    < src/environments/environment.prod.ts \
    > /tmp/environment.prod.ts && \
    mv /tmp/environment.prod.ts src/environments/environment.prod.ts

RUN pnpm run build:prod

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM nginx:alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/taskapp-frontend/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ || exit 1
