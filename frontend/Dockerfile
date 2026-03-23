# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Enable corepack so the packageManager field in package.json pins pnpm
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build:prod

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM nginx:alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/taskapp-frontend/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1
