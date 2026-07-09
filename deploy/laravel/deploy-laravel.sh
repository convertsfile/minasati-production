#!/usr/bin/env bash
# Deploy the Laravel backend.
#
# Usage:
#   deploy/laravel/deploy-laravel.sh [TAG]
#
# Steps:
#   1. Build the production image with the supplied TAG.
#   2. Record the current running tag in /var/backups/minassati/laravel-deploys.log
#      so rollback-laravel.sh can find it later.
#   3. Restart the docker-compose stack with the new image.
#   4. Wait for /api/health/live to come back.
#
# RELIABILITY-MAJOR-04: ship a working forward-deploy path alongside
# the rollback path. Without both, "we can roll back" is theoretical.

set -euo pipefail

BACKUP_LOG="${BACKUP_LOG:-/var/backups/minassati/laravel-deploys.log}"
IMAGE_REPO="${IMAGE_REPO:-minassati-laravel}"
CONTAINER_NAME="${CONTAINER_NAME:-minassati-laravel-app}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8080/api/health/live}"
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
docker build -f deploy/laravel/Dockerfile -t "${IMAGE_REPO}:${TAG}" .

# Record the previous tag in the backup log so rollback can find it.
printf '%s deployed=%s\n' "${CURRENT_TAG:-initial}" "$TAG" >> "$BACKUP_LOG"

# Restart the stack.
docker compose -f deploy/laravel/docker-compose.yml up -d app queue scheduler reverb

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

die "Deploy did not become healthy within ${HEALTH_TIMEOUT}s. Run rollback-laravel.sh."
