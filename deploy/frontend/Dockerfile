# Next.js 16 frontend — production Dockerfile.
#
# Multi-stage build:
#   1. deps   — install npm packages
#   2. build  — run `next build` to produce the .next/ standalone bundle
#   3. runner — slim node:20-alpine image that serves the built artifact
#
# Run with:
#   docker build -f deploy/frontend/Dockerfile -t minassati-frontend:tag frontend/
#   docker run --env-file frontend/.env.local -p 3000:3000 minassati-frontend:tag
#
# RELIABILITY-MAJOR-04: the frontend had no deployable artifact at all
# (no vercel.json, no Dockerfile, no netlify.toml). This image gives it
# a self-hosted path that mirrors the VOD engine's and Laravel's.

# ============================================================================
# Stage 1: install dependencies
# ============================================================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy both lockfiles to maximise cache hit rate. We prefer package-lock.json
# (already in tree) and tolerate pnpm-lock.yaml being absent.
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Prefer npm ci for hermetic installs against the lockfile. If the lockfile
# is missing (e.g. an old commit), fall back to `npm install` so the build
# doesn't fail outright.
RUN if [ -f package-lock.json ]; then \
        npm ci --no-audit --no-fund --prefer-offline; \
    else \
        npm install --no-audit --no-fund --prefer-offline; \
    fi

# ============================================================================
# Stage 2: build
# ============================================================================
FROM node:20-alpine AS build

WORKDIR /app

# Bring in node_modules from the deps stage.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public env vars used at build time. Runtime secrets are injected at
# container start via the orchestrator.
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_REVERB_APP_KEY
ARG NEXT_PUBLIC_REVERB_HOST
ARG NEXT_PUBLIC_REVERB_PORT
ARG NEXT_PUBLIC_REVERB_SCHEME
ARG NEXT_PUBLIC_SENTRY_DSN

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_REVERB_APP_KEY=$NEXT_PUBLIC_REVERB_APP_KEY \
    NEXT_PUBLIC_REVERB_HOST=$NEXT_PUBLIC_REVERB_HOST \
    NEXT_PUBLIC_REVERB_PORT=$NEXT_PUBLIC_REVERB_PORT \
    NEXT_PUBLIC_REVERB_SCHEME=$NEXT_PUBLIC_REVERB_SCHEME \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN

# Build the production bundle. `next build` writes to .next/.
RUN npm run build

# ============================================================================
# Stage 3: runner
# ============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Create a non-root user.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs

# Pull the standalone server output (configured in next.config.ts via
# `output: 'standalone'`). If you don't use standalone, fall back to
# copying the full .next/ directory.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
