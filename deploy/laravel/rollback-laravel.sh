#!/usr/bin/env bash
# Rollback the Laravel container to a previously tagged image.
#
# Usage:
#   deploy/laravel/rollback-laravel.sh [TARGET_TAG]
#
# If TARGET_TAG is omitted, the script reads the most recent entry
# from /var/backups/minassati/laravel-deploys.log and rolls back to
# the tag on the line above the current one.
#
# RELIABILITY-MAJOR-04: gives operators a one-command way back from
# a bad deploy. The deployment script (deploy-laravel.sh) appends
# one line per deploy to the log; rollback reads the previous line.

set -euo pipefail

BACKUP_LOG="${BACKUP_LOG:-/var/backups/minassati/laravel-deploys.log}"
CONTAINER_NAME="${CONTAINER_NAME:-minassati-laravel-app}"
IMAGE_REPO="${IMAGE_REPO:-minassati-laravel}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8080/api/health/live}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-60}"

log() { printf '[rollback] %s\n' "$*" >&2; }

die() { printf '[rollback][FATAL] %s\n' "$*" >&2; exit 1; }

# Determine target tag.
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

# Sanity check: does the target image actually exist locally?
docker image inspect "${IMAGE_REPO}:${TARGET_TAG}" >/dev/null 2>&1 \
    || die "Target image ${IMAGE_REPO}:${TARGET_TAG} is not present locally. Pull it first."

# Stop the current container, start the previous one.
docker compose -f deploy/laravel/docker-compose.yml stop app queue scheduler reverb
docker tag "${IMAGE_REPO}:${TARGET_TAG}" "${IMAGE_REPO}:rollback-candidate"
docker compose -f deploy/laravel/docker-compose.yml up -d app queue scheduler reverb
docker rmi "${IMAGE_REPO}:rollback-candidate" >/dev/null 2>&1 || true

# Health check — wait for /api/health/live to come back.
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
