#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# Rollback Script — VOD Encoding Operational Hardening
# ══════════════════════════════════════════════════════════════
# Removes all changes made by the ops-hardening deployment.
# Run as root: sudo bash deploy/rollback-ops-hardening.sh
# ══════════════════════════════════════════════════════════════

set -euo pipefail

echo "=== Rolling back VOD Encoding Operational Hardening ==="

# 1. Remove systemd unit and reload
echo "[1/7] Removing systemd unit..."
if [ -f /etc/systemd/system/vod-engine.service ]; then
    systemctl stop vod-engine 2>/dev/null || true
    rm -f /etc/systemd/system/vod-engine.service
    systemctl daemon-reload
    echo "  systemd unit removed"
else
    echo "  systemd unit not found, skipping"
fi

# 2. Restore old binary if backup exists
echo "[2/7] Restoring backup binary..."
if [ -f /usr/local/bin/vod-engine.bak ]; then
    mv /usr/local/bin/vod-engine.bak /usr/local/bin/vod-engine
    chmod 755 /usr/local/bin/vod-engine
    echo "  binary restored from backup"
else
    echo "  no backup binary found, skipping"
fi

# 3. Remove sysctl config and apply defaults
echo "[3/7] Removing sysctl config..."
if [ -f /etc/sysctl.d/99-vod-engine.conf ]; then
    rm -f /etc/sysctl.d/99-vod-engine.conf
    sysctl --system
    echo "  sysctl config removed, defaults applied"
else
    echo "  sysctl config not found, skipping"
fi

# 4. Remove logrotate config
echo "[4/7] Removing logrotate config..."
if [ -f /etc/logrotate.d/vod-engine ]; then
    rm -f /etc/logrotate.d/vod-engine
    echo "  logrotate config removed"
else
    echo "  logrotate config not found, skipping"
fi

# 5. Remove tmpfiles.d config
echo "[5/7] Removing tmpfiles.d config..."
if [ -f /etc/tmpfiles.d/vod-engine.conf ]; then
    rm -f /etc/tmpfiles.d/vod-engine.conf
    systemd-tmpfiles --clean 2>/dev/null || true
    echo "  tmpfiles.d config removed"
else
    echo "  tmpfiles.d config not found, skipping"
fi

# 6. Remove udev rule
echo "[6/7] Removing udev rule..."
if [ -f /etc/udev/rules.d/60-iosched.rules ]; then
    rm -f /etc/udev/rules.d/60-iosched.rules
    udevadm control --reload 2>/dev/null || true
    echo "  udev rule removed"
else
    echo "  udev rule not found, skipping"
fi

# 7. Remove Prometheus alerts and Grafana dashboard (if files exist)
echo "[7/7] Removing monitoring configs..."
if [ -f /etc/prometheus/rules/vod-engine-alerts.yml ]; then
    rm -f /etc/prometheus/rules/vod-engine-alerts.yml
    echo "  Prometheus alerts removed (reload Prometheus to apply)"
fi
if [ -f /var/lib/grafana/dashboards/vod-encoding-dashboard.json ]; then
    rm -f /var/lib/grafana/dashboards/vod-encoding-dashboard.json
    echo "  Grafana dashboard removed (restart Grafana to apply)"
fi

# Restart VOD Engine with old binary
echo "=== Restarting VOD Engine with old binary ==="
if [ -f /usr/local/bin/vod-engine ]; then
    systemctl start vod-engine 2>/dev/null || \
        /usr/local/bin/vod-engine &>/dev/null &
    echo "  VOD Engine started"
fi

echo ""
echo "=== Rollback complete. ==="
echo "Note: Node Exporter (if newly installed) is NOT removed."
echo "To remove Node Exporter: sudo systemctl stop node_exporter && sudo apt-get remove prometheus-node-exporter"
echo "To remove nvme-cli: sudo apt-get remove nvme-cli"
