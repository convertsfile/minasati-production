#!/bin/bash
# Rollback script for vod-encoding-production-readiness feature
# Reverts to the pre-production binary and systemd unit.
set -euo pipefail

BACKUP_DIR="/var/backups/vod-engine/$(date +%Y%m%d_%H%M%S)"
echo "Creating backup at $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Backup current binary
if [ -f /usr/local/bin/vod-engine ]; then
    cp /usr/local/bin/vod-engine "$BACKUP_DIR/vod-engine.bak"
fi

# Restore pre-production binary if it exists
if [ -f /usr/local/bin/vod-engine.pre-prod ]; then
    echo "Restoring pre-production binary..."
    cp /usr/local/bin/vod-engine.pre-prod /usr/local/bin/vod-engine
else
    echo "WARNING: No pre-production binary found at /usr/local/bin/vod-engine.pre-prod"
    echo "Skipping binary rollback."
fi

# Revert systemd unit
if [ -f deploy/systemd/vod-engine.service.pre-prod ]; then
    echo "Restoring pre-production systemd unit..."
    cp deploy/systemd/vod-engine.service.pre-prod /etc/systemd/system/vod-engine.service
    systemctl daemon-reload
else
    echo "No pre-production systemd unit found at deploy/systemd/vod-engine.service.pre-prod"
    echo "Skipping systemd rollback."
fi

echo "Rollback complete. Restarting VOD Engine..."
systemctl restart vod-engine
echo "VOD Engine restarted with pre-production configuration."
