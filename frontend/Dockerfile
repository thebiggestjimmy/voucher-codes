# syntax=docker/dockerfile:1

# ── Build stage ─────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Optional analytics config, baked in at build time (Vite inlines VITE_* env).
# Leave empty to ship without any analytics snippet.
ARG VITE_UMAMI_SRC=
ARG VITE_UMAMI_WEBSITE_ID=
ENV VITE_UMAMI_SRC=$VITE_UMAMI_SRC \
    VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID

COPY package*.json ./
RUN npm ci

COPY . ./
RUN npm run build

# ── Runtime stage (static SPA + /api reverse proxy) ─────────
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
