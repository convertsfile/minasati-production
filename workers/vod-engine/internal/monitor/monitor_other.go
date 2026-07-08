//go:build !linux

package monitor

// readDiskUsagePlatform is a fallback for non-Linux platforms.
// On these platforms, disk usage stats are not available.
func readDiskUsagePlatform(workDir string, snap *ResourceSnapshot) {
	// Not supported on this platform — leave disk values at zero.
	_ = workDir
	_ = snap
}
