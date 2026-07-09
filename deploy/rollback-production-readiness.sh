#!/bin/bash
# Rollback script for vod-encoding-production-readiness feature
# Reverts to the pre-production binary and systemd unit.
#
# Usage:
#   deploy/rollback-production-readiness.sh [--dry-run]
#
# The pre-production binary and unit are produced by
# deploy/deploy-vod-engine.sh, which is the matching forward-deploy
# script. Before this fix the script silently no-op'd because the
# pre-prod files were never created.
set -euo pipefail

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=1
    echo "[dry-run] enabled — no system changes will be made"
fi

run() {
    if [[ "$DRY_RUN" == "1" ]]; then
        echo "[dry-run] $*"
    else
        eval "$@"
    fi
}

BACKUP_DIR="/var/backups/vod-engine/$(date +%Y%m%d_%H%M%S)"
echo "Creating backup at $BACKUP_DIR"
run mkdir -p "$BACKUP_DIR"

# Backup current binary
if [ -f /usr/local/bin/vod-engine ]; then
    run cp /usr/local/bin/vod-engine "$BACKUP_DIR/vod-engine.bak"
fi

# Restore pre-production binary if it exists
if [ -f /usr/local/bin/vod-engine.pre-prod ]; then
    echo "Restoring pre-production binary..."
    run cp /usr/local/bin/vod-engine.pre-prod /usr/local/bin/vod-engine
else
    echo "WARNING: No pre-production binary found at /usr/local/bin/vod-engine.pre-prod"
    echo "Skipping binary rollback."
    echo "(Pre-production backups are created by deploy/deploy-vod-engine.sh.)"
fi

# Revert systemd unit
if [ -f deploy/systemd/vod-engine.service.pre-prod ]; then
    echo "Restoring pre-production systemd unit..."
    run cp deploy/systemd/vod-engine.service.pre-prod /etc/systemd/system/vod-engine.service
    run systemctl daemon-reload
else
    echo "No pre-production systemd unit found at deploy/systemd/vod-engine.service.pre-prod"
    echo "Skipping systemd rollback."
    echo "(Pre-production backups are created by deploy/deploy-vod-engine.sh.)"
fi

echo "Rollback complete. Restarting VOD Engine..."
run systemctl restart vod-engine
echo "VOD Engine restarted with pre-production configuration."
