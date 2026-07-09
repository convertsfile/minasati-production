#!/usr/bin/env bash
# Rollback the Next.js frontend container to a previously tagged image.
#
# Usage:
#   deploy/frontend/rollback-frontend.sh [TARGET_TAG]
#
# Mirror of deploy/laravel/rollback-laravel.sh. Reads the backup
# log to find the most recent previous deploy, or accepts an
# explicit target tag.
#
# RELIABILITY-MAJOR-04: gives the frontend a symmetric deploy +
# rollback story so a bad release can be reverted in under a
# minute.

set -euo pipefail

BACKUP_LOG="${BACKUP_LOG:-/var/backups/minassati/frontend-deploys.log}"
CONTAINER_NAME="${CONTAINER_NAME:-minassati-frontend}"
IMAGE_REPO="${IMAGE_REPO:-minassati-frontend}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-60}"

log() { printf '[rollback] %s\n' "$*" >&2; }
die() { printf '[rollback][FATAL] %s\n' "$*" >&2; exit 1; }

if [[ $# -ge 1 ]]; then
    TARGET_TAG="$1"
else
    [[ -f "$BACKUP_LOG" ]] || die "No backup log at $BACKUP_LOG and no target tag supplied."
    PREVIOUS="$(tail -n 2 "$BACKUP_LOG" | head -n 1 | awk '{print $1}')"
    [[ -n "$PREVIOUS" ]] || die "Could not find a previous deploy in $BACKUP_LOG."
    TARGET_TAG="$PREVIOUS"
fi

CURRENT_TAG="$(docker inspect --format='{{index .Config.Image}}' "$CONTAINER_NAME" 2>/dev/null | sed "s|.*:||")"
log "Current container tag: ${CURRENT_TAG:-<unknown>}"
log "Rolling back to:       $TARGET_TAG"

docker image inspect "${IMAGE_REPO}:${TARGET_TAG}" >/dev/null 2>&1 \
    || die "Target image ${IMAGE_REPO}:${TARGET_TAG} is not present locally. Pull it first."

docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER_NAME" --restart unless-stopped \
    -p 3000:3000 \
    --env-file frontend/.env.local \
    "${IMAGE_REPO}:${TARGET_TAG}"

# Health check.
log "Waiting for ${HEALTH_URL} to return 200 (timeout ${HEALTH_TIMEOUT}s)..."
elapsed=0
while (( elapsed < HEALTH_TIMEOUT )); do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
        log "Rollback succeeded. Container is serving traffic on tag $TARGET_TAG."
        printf '%s rollback-from=%s\n' "$TARGET_TAG" "$CURRENT_TAG" >> "$BACKUP_LOG"
        exit 0
    fi
    sleep 2
    elapsed=$(( elapsed + 2 ))
done

die "Rollback did not become healthy within ${HEALTH_TIMEOUT}s. Investigate manually."
