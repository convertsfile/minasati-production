#!/usr/bin/env bash
# Deploy the Next.js frontend.
#
# Usage:
#   deploy/frontend/deploy-frontend.sh [TAG]
#
# Steps:
#   1. Build the production image with the supplied TAG.
#   2. Record the current running tag in the backup log so
#      rollback-frontend.sh can find it.
#   3. Stop and remove the current container, start the new one.
#   4. Wait for the home page to return 200.
#
# RELIABILITY-MAJOR-04: ship a working forward-deploy path
# alongside the rollback path. Without both, "we can roll back"
# is theoretical.

set -euo pipefail

BACKUP_LOG="${BACKUP_LOG:-/var/backups/minassati/frontend-deploys.log}"
IMAGE_REPO="${IMAGE_REPO:-minassati-frontend}"
CONTAINER_NAME="${CONTAINER_NAME:-minassati-frontend}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-90}"

log() { printf '[deploy] %s\n' "$*" >&2; }
die() { printf '[deploy][FATAL] %s\n' "$*" >&2; exit 1; }

TAG="${1:-$(date +%Y%m%d-%H%M%S)}"
[[ -n "$TAG" ]] || die "TAG is required."

mkdir -p "$(dirname "$BACKUP_LOG")"

CURRENT_TAG="$(docker inspect --format='{{index .Config.Image}}' "$CONTAINER_NAME" 2>/dev/null | sed "s|.*:||")"
log "Current running tag: ${CURRENT_TAG:-<none>}"
log "Deploying tag:       $TAG"

# Build.
log "Building ${IMAGE_REPO}:${TAG}..."
docker build -f deploy/frontend/Dockerfile -t "${IMAGE_REPO}:${TAG}" frontend/

# Record previous tag for rollback.
printf '%s deployed=%s\n' "${CURRENT_TAG:-initial}" "$TAG" >> "$BACKUP_LOG"

# Restart.
docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER_NAME" --restart unless-stopped \
    -p 3000:3000 \
    --env-file frontend/.env.local \
    "${IMAGE_REPO}:${TAG}"

# Health check.
log "Waiting for ${HEALTH_URL} to return 200 (timeout ${HEALTH_TIMEOUT}s)..."
elapsed=0
while (( elapsed < HEALTH_TIMEOUT )); do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
        log "Deploy succeeded. Image ${IMAGE_REPO}:${TAG} is serving traffic."
        exit 0
    fi
    sleep 2
    elapsed=$(( elapsed + 2 ))
done

die "Deploy did not become healthy within ${HEALTH_TIMEOUT}s. Run rollback-frontend.sh."
