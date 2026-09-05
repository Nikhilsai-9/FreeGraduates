# Multi-stage Dockerfile for the FreeGraduates React (Vite) frontend.
#
# Stage 1: build the static bundle with Node.
# Stage 2: serve the bundle with a hardened nginx config.

# ---------- Stage 1: build ----------
FROM node:20-alpine AS build

WORKDIR /app

# Install deps with a clean layer for better caching.
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Build-time env (e.g. VITE_API_URL) must be supplied via `args`.
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

COPY . .

# Vite outputs to ./dist
RUN npm run build

# ---------- Stage 2: serve ----------
FROM nginx:1.27-alpine AS runtime

# Replace the default nginx site with our SPA + reverse-proxy config.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static assets.
COPY --from=build /app/dist /usr/share/nginx/html

# nginx ships with a non-root-friendly config but we keep root for
# simplicity; the base image runs as the built-in `nginx` user only when
# the config is updated to use unprivileged ports. We expose 80 -> 8080.
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
