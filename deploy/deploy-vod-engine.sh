#!/usr/bin/env bash
# Deploy the VOD engine binary + systemd unit.
#
# Usage:
#   deploy/deploy-vod-engine.sh [BINARY_PATH]
#
# Steps:
#   1. Stop the current service.
#   2. Copy the running binary to /usr/local/bin/vod-engine.pre-prod so
#      the rollback script has a target.
#   3. Install the new binary at /usr/local/bin/vod-engine.
#   4. Copy the current systemd unit to deploy/systemd/vod-engine.service.pre-prod
#      so the rollback script can restore it.
#   5. Install the new unit and reload systemd.
#   6. Start the service and wait for /health?probe=ready to return 200.
#
# RELIABILITY-MINOR-01: this deploy script is the missing pair to
# deploy/rollback-production-readiness.sh, which used to look for
# .pre-prod files that nothing created. The two together now form
# a working deploy + rollback story for the VOD engine.

set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-vod-engine}"
BINARY_SRC="${1:-workers/vod-engine/bin/vod-engine}"
BINARY_DST="${BINARY_DST:-/usr/local/bin/${SERVICE_NAME}}"
BACKUP_BINARY="${BACKUP_BINARY:-/usr/local/bin/${SERVICE_NAME}.pre-prod}"
UNIT_SRC="${UNIT_SRC:-deploy/systemd/${SERVICE_NAME}.service}"
UNIT_DST="${UNIT_DST:-/etc/systemd/system/${SERVICE_NAME}.service}"
UNIT_BACKUP="${UNIT_BACKUP:-deploy/systemd/${SERVICE_NAME}.service.pre-prod}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8080/health?probe=ready}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-30}"
DRY_RUN="${DRY_RUN:-0}"

log() { printf '[deploy] %s\n' "$*" >&2; }
die() { printf '[deploy][FATAL] %s\n' "$*" >&2; exit 1; }
run() {
    if [[ "$DRY_RUN" == "1" ]]; then
        printf '[dry-run] %s\n' "$*"
    else
        eval "$@"
    fi
}

[[ -f "$BINARY_SRC" ]] || die "Binary $BINARY_SRC not found. Run 'go build' first."
[[ -f "$UNIT_SRC" ]] || die "Unit file $UNIT_SRC not found."

log "Stopping ${SERVICE_NAME}..."
run systemctl stop "${SERVICE_NAME}.service" || true

# Snapshot the current binary BEFORE we overwrite it.
if [[ -f "$BINARY_DST" ]]; then
    log "Backing up current binary to ${BACKUP_BINARY}"
    run cp -a "$BINARY_DST" "$BACKUP_BINARY"
fi

log "Installing new binary to ${BINARY_DST}..."
run install -m 0755 "$BINARY_SRC" "$BINARY_DST"

# Snapshot the current unit before we overwrite it.
if [[ -f "$UNIT_DST" ]]; then
    mkdir -p "$(dirname "$UNIT_BACKUP")"
    log "Backing up current unit to ${UNIT_BACKUP}"
    run cp -a "$UNIT_DST" "$UNIT_BACKUP"
fi

log "Installing new unit to ${UNIT_DST}..."
run install -m 0644 "$UNIT_SRC" "$UNIT_DST"
run systemctl daemon-reload

log "Starting ${SERVICE_NAME}..."
run systemctl start "${SERVICE_NAME}.service"

log "Waiting for ${HEALTH_URL} to return 200 (timeout ${HEALTH_TIMEOUT}s)..."
elapsed=0
while (( elapsed < HEALTH_TIMEOUT )); do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
        log "Deploy succeeded."
        exit 0
    fi
    sleep 1
    elapsed=$(( elapsed + 1 ))
done

die "Deploy did not become healthy within ${HEALTH_TIMEOUT}s. Run deploy/rollback-production-readiness.sh."
