//go:build linux

package monitor

import (
	"syscall"
)

func readDiskUsagePlatform(workDir string, snap *ResourceSnapshot) {
	var stat syscall.Statfs_t
	if err := syscall.Statfs(workDir, &stat); err != nil {
		return
	}

	totalBytes := stat.Blocks * uint64(stat.Bsize)
	freeBytes := stat.Bavail * uint64(stat.Bsize)
	usedBytes := totalBytes - freeBytes

	snap.DiskTotalGB = int64(totalBytes / (1024 * 1024 * 1024))
	snap.DiskFreeGB = int64(freeBytes / (1024 * 1024 * 1024))
	snap.DiskUsedGB = int64(usedBytes / (1024 * 1024 * 1024))

	if totalBytes > 0 {
		snap.DiskUsedPct = float64(usedBytes) / float64(totalBytes) * 100.0
	}
}
