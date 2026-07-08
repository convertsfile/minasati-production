package monitor

import (
	"bufio"
	"log/slog"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

// ResourceSnapshot holds the latest system resource measurements.
type ResourceSnapshot struct {
	CPULoad1m       float64
	CPULoad5m       float64
	CPULoad15m      float64
	RAMTotalMB      int64
	RAMAvailableMB  int64
	RAMUsedMB       int64
	RAMUsedPct      float64
	SwapTotalMB     int64
	SwapFreeMB      int64
	DiskTotalGB     int64
	DiskFreeGB      int64
	DiskUsedGB      int64
	DiskUsedPct     float64
	DiskIOPct       float64
	NetworkOutMbps  float64
	NetworkInMbps   float64
	ActiveFFmpegPIDs int
	Temperature     float64 // Celsius, 0 if unavailable

	// NVMe health (OPS-07, OPS-22)
	NVMePercentageUsed float64 // from nvme smart-log or Node Exporter
	NVMeMediaErrors    int64
	NVMeTemperatureCelsius float64

	// File descriptor usage (OPS-13)
	OpenFileDescriptors int

	SampledAt time.Time
}

// Monitor continuously samples system resources.
type Monitor struct {
	interval     time.Duration
	workDir      string
	mu           sync.RWMutex
	latest       ResourceSnapshot
	reconfigCh   chan time.Duration // OPS-18: hot-reload interval

	// For delta-based I/O and network calculation
	prevDiskStats   map[string]diskStats
	prevNetStats    map[string]netStats
	prevSampleTime  time.Time

	// NVMe throttling (OPS-PERF-05)
	nvmeLastCheck    time.Time
	nvmeCheckInterval time.Duration

	// FD limit (from sysctl or config)
	fdLimit int

	// Daily-warning tracking for NVMe wear (OPS-22)
	nvmeWarnDate string // YYYY-MM-DD when last warned

	// Predictive guardian notification channel
	predictiveCh chan<- *ResourceSnapshot
}

type diskStats struct {
	readCompleted  uint64
	writeCompleted uint64
	timeInIO       uint64 // ms
}

type netStats struct {
	rxBytes uint64
	txBytes uint64
}

// New creates a Monitor.
func New(interval time.Duration, workDir string) *Monitor {
	return &Monitor{
		interval:          interval,
		workDir:           workDir,
		reconfigCh:        make(chan time.Duration, 1), // OPS-18: buffered for non-blocking send
		prevDiskStats:     make(map[string]diskStats),
		prevNetStats:      make(map[string]netStats),
		prevSampleTime:    time.Now(),
		nvmeCheckInterval: 5 * time.Minute, // OPS-PERF-05 (default, may be overridden via SetNVMeCheckInterval)
		fdLimit:           65536,
	}
}

// Start begins the monitoring loop in a goroutine.
// It returns immediately. Stop by closing stopCh.
func (m *Monitor) Start(stopCh <-chan struct{}) {
	slog.Info("Monitor starting", "interval_seconds", m.interval.Seconds())

	// Take an initial sample to establish baselines
	m.sample()

	ticker := time.NewTicker(m.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			m.sample()
			// Notify predictive guardian (non-blocking send)
			if m.predictiveCh != nil {
				select {
				case m.predictiveCh <- m.SnapshotPointer():
				default:
					// Channel full, skip this sample
				}
			}
		case newInterval := <-m.reconfigCh:
			// OPS-18: hot-reload monitor interval on SIGHUP
			ticker.Stop()
			m.interval = newInterval
			ticker = time.NewTicker(newInterval)
			slog.Info("Monitor interval reconfigured via SIGHUP",
				"new_interval_seconds", newInterval.Seconds(),
			)
		case <-stopCh:
			slog.Info("Monitor stopped")
			return
		}
	}
}

// Reconfigure hot-reloads the monitor sampling interval (OPS-18).
// Called from the SIGHUP handler; non-blocking send to avoid deadlock.
func (m *Monitor) Reconfigure(interval time.Duration) {
	select {
	case m.reconfigCh <- interval:
	default:
		// Previous reconfigure still pending, channel buffer full.
		slog.Warn("Monitor reconfiguration channel full, dropping stale interval",
			"stale_interval_seconds", interval.Seconds(),
		)
	}
}

// Snapshot returns the latest resource snapshot (thread-safe).
func (m *Monitor) Snapshot() ResourceSnapshot {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.latest
}

// ForceSample triggers an immediate sample.
func (m *Monitor) ForceSample() {
	m.sample()
}

// SetPredictiveChannel sets the channel for notifying the predictive guardian
// about new resource snapshots. Must be called before Start().
func (m *Monitor) SetPredictiveChannel(ch chan<- *ResourceSnapshot) {
	m.predictiveCh = ch
}

// SnapshotPointer returns a pointer to the latest resource snapshot (thread-safe).
func (m *Monitor) SnapshotPointer() *ResourceSnapshot {
	snap := m.Snapshot()
	return &snap
}

func (m *Monitor) sample() {
	snap := ResourceSnapshot{
		SampledAt: time.Now(),
	}

	m.readCPULoad(&snap)
	m.readMemory(&snap)
	m.readDiskUsage(&snap)
	m.readDiskIO(&snap)
	m.readNetwork(&snap)
	m.readFFmpegPIDs(&snap)
	m.readTemperature(&snap)
	m.readNVMeHealth(&snap)
	m.readFDUsage(&snap)

	m.mu.Lock()
	m.latest = snap
	m.mu.Unlock()
}

func (m *Monitor) readCPULoad(snap *ResourceSnapshot) {
	data, err := os.ReadFile("/proc/loadavg")
	if err != nil {
		return
	}
	parts := strings.Fields(string(data))
	if len(parts) >= 3 {
		snap.CPULoad1m = parseFloat(parts[0])
		snap.CPULoad5m = parseFloat(parts[1])
		snap.CPULoad15m = parseFloat(parts[2])
	}
}

func (m *Monitor) readMemory(snap *ResourceSnapshot) {
	file, err := os.Open("/proc/meminfo")
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		switch {
		case strings.HasPrefix(line, "MemTotal:"):
			snap.RAMTotalMB = int64(extractKBValue(line) / 1024)
		case strings.HasPrefix(line, "MemAvailable:"):
			snap.RAMAvailableMB = int64(extractKBValue(line) / 1024)
		case strings.HasPrefix(line, "SwapTotal:"):
			snap.SwapTotalMB = int64(extractKBValue(line) / 1024)
		case strings.HasPrefix(line, "SwapFree:"):
			snap.SwapFreeMB = int64(extractKBValue(line) / 1024)
		}
	}

	snap.RAMUsedMB = snap.RAMTotalMB - snap.RAMAvailableMB
	if snap.RAMTotalMB > 0 {
		snap.RAMUsedPct = float64(snap.RAMUsedMB) / float64(snap.RAMTotalMB) * 100.0
	}
}

func (m *Monitor) readDiskUsage(snap *ResourceSnapshot) {
	readDiskUsagePlatform(m.workDir, snap)
}

func (m *Monitor) readDiskIO(snap *ResourceSnapshot) {
	file, err := os.Open("/proc/diskstats")
	if err != nil {
		return
	}
	defer file.Close()

	now := time.Now()
	elapsed := now.Sub(m.prevSampleTime).Seconds()
	if elapsed <= 0 {
		return
	}

	var totalIOPS uint64
	var totalTimeInIO uint64
	var deviceCount int

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) < 13 {
			continue
		}

		devName := fields[2]

		// Skip partitions, only consider whole devices (no digits at end)
		// Also skip RAM devices, loop, etc.
		if isVirtualDevice(devName) {
			continue
		}

		readCompl := parseUint64(fields[3])
		writeCompl := parseUint64(fields[7])
		timeIO := parseUint64(fields[12]) // field 12 = time_in_queue (ms) for some kernels

		// Try field 13 for io_time if available (Linux 5+)
		if len(fields) > 13 {
			timeIO = parseUint64(fields[13])
		}

		totalIOPS += readCompl + writeCompl
		totalTimeInIO += timeIO
		deviceCount++

		// Store for next delta
		key := devName
		if _, exists := m.prevDiskStats[key]; !exists {
			m.prevDiskStats[key] = diskStats{}
		}
		m.prevDiskStats[key] = diskStats{
			readCompleted:  readCompl,
			writeCompleted: writeCompl,
			timeInIO:       timeIO,
		}
	}

	// Calculate utilization: time_in_queue / (sample_duration * num_devices)
	// timeIO is in milliseconds, convert to seconds
	if deviceCount > 0 && elapsed > 0 {
		utilization := (float64(totalTimeInIO) / 1000.0) / (elapsed * float64(deviceCount)) * 100.0
		snap.DiskIOPct = math.Min(utilization, 100.0)
	}

	m.prevSampleTime = now
}

func (m *Monitor) readNetwork(snap *ResourceSnapshot) {
	file, err := os.Open("/proc/net/dev")
	if err != nil {
		return
	}
	defer file.Close()

	now := time.Now()
	elapsed := now.Sub(m.prevSampleTime).Seconds()
	if elapsed <= 0 {
		return
	}

	var totalRx, totalTx uint64

	scanner := bufio.NewScanner(file)
	// Skip first two header lines
	scanner.Scan()
	scanner.Scan()

	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.Split(line, ":")
		if len(parts) < 2 {
			continue
		}

		iface := strings.TrimSpace(parts[0])
		// Skip loopback
		if iface == "lo" {
			continue
		}

		fields := strings.Fields(parts[1])
		if len(fields) < 10 {
			continue
		}

		rx := parseUint64(fields[0])
		tx := parseUint64(fields[8])

		totalRx += rx
		totalTx += tx
	}

	// Calculate delta in Mbps (bytes -> bits -> megabits -> per second)
	if m.prevSampleTime.Unix() > 0 && elapsed > 0 {
		if prev, ok := m.prevNetStats["_total"]; ok {
			rxDelta := totalRx - prev.rxBytes
			txDelta := totalTx - prev.txBytes
			snap.NetworkInMbps = (float64(rxDelta) * 8.0) / (elapsed * 1_000_000.0)
			snap.NetworkOutMbps = (float64(txDelta) * 8.0) / (elapsed * 1_000_000.0)
		}
	}

	m.prevNetStats["_total"] = netStats{rxBytes: totalRx, txBytes: totalTx}
}

func (m *Monitor) readFFmpegPIDs(snap *ResourceSnapshot) {
	// Read /proc to find FFmpeg processes
	entries, err := os.ReadDir("/proc")
	if err != nil {
		return
	}

	count := 0
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		pid := entry.Name()
		if !isAllDigits(pid) {
			continue
		}

		commPath := filepath.Join("/proc", pid, "comm")
		comm, err := os.ReadFile(commPath)
		if err != nil {
			continue
		}
		if strings.TrimSpace(string(comm)) == "ffmpeg" {
			count++
		}
	}

	snap.ActiveFFmpegPIDs = count
}

func (m *Monitor) readTemperature(snap *ResourceSnapshot) {
	// Try thermal zone 0 (most common on Linux)
	thermalPath := "/sys/class/thermal/thermal_zone0/temp"
	data, err := os.ReadFile(thermalPath)
	if err != nil {
		return
	}
	tempMilli := parseFloat(strings.TrimSpace(string(data)))
	if tempMilli > 0 {
		snap.Temperature = tempMilli / 1000.0
	}
}

// readNVMeHealth reads NVMe drive health metrics (OPS-07, OPS-22).
// Throttled to at most once per nvmeCheckInterval (default 5 minutes) per OPS-PERF-05.
func (m *Monitor) readNVMeHealth(snap *ResourceSnapshot) {
	// Thread-safe read of NVMe throttle state (OPS-PERF-05, guards M-01 race)
	m.mu.RLock()
	lastCheck := m.nvmeLastCheck
	interval := m.nvmeCheckInterval
	warnDate := m.nvmeWarnDate
	m.mu.RUnlock()

	now := time.Now()
	if now.Sub(lastCheck) < interval {
		return
	}

	// Try /sys/class/nvme/nvme0/ first (kernel 5.x+ exposes health here)
	nvmeDir := "/sys/class/nvme/nvme0"

	// Percentage used
	if data, err := os.ReadFile(nvmeDir + "/device/percentage_used"); err == nil {
		snap.NVMePercentageUsed = parseFloat(strings.TrimSpace(string(data)))
	}

	// Media errors
	if data, err := os.ReadFile(nvmeDir + "/device/media_errors"); err == nil {
		snap.NVMeMediaErrors = int64(parseUint64(strings.TrimSpace(string(data))))
	}

	// Temperature (in Kelvin from sysfs, convert to Celsius)
	if data, err := os.ReadFile(nvmeDir + "/device/temp"); err == nil {
		tempK := parseUint64(strings.TrimSpace(string(data)))
		if tempK > 0 {
			snap.NVMeTemperatureCelsius = float64(tempK) / 1000.0 - 273.15
		}
	}

	// Log wear warnings if thresholds exceeded (OPS-22)
	today := now.Format("2006-01-02")
	if snap.NVMePercentageUsed > 0 {
		if snap.NVMePercentageUsed >= 80 && warnDate != today {
			if snap.NVMePercentageUsed >= 95 {
				slog.Error("NVME_WEAR_CRITICAL",
					"device", "nvme0n1",
					"percentage_used", snap.NVMePercentageUsed,
					"message", "Immediate replacement required.")
			} else {
				slog.Warn("NVME_WEAR",
					"device", "nvme0n1",
					"percentage_used", snap.NVMePercentageUsed,
					"message", "Replace planned.")
			}
		}
	}

	// Thread-safe write of updated NVMe throttle state
	m.mu.Lock()
	m.nvmeLastCheck = now
	if snap.NVMePercentageUsed >= 80 && warnDate != today {
		m.nvmeWarnDate = today
	}
	m.mu.Unlock()
}

// readFDUsage checks file descriptor usage (OPS-13).
// Logs a warning if FD count exceeds 80% of the limit.
func (m *Monitor) readFDUsage(snap *ResourceSnapshot) {
	entries, err := os.ReadDir("/proc/self/fd")
	if err != nil {
		return
	}

	count := len(entries)
	snap.OpenFileDescriptors = count

	// Log warning if > 80% of limit
	if m.fdLimit > 0 && count > int(float64(m.fdLimit)*0.8) {
		slog.Warn("High FD usage",
			"open_fds", count,
			"limit", m.fdLimit,
			"usage_pct", float64(count)/float64(m.fdLimit)*100.0,
		)
	}
}

// SetFDLimit sets the expected file descriptor limit for threshold warnings.
func (m *Monitor) SetFDLimit(limit int) {
	if limit > 0 {
		m.fdLimit = limit
	}
}

// SetNVMeCheckInterval sets the minimum interval between NVMe health checks (OPS-PERF-05, M-02).
// This allows the SIGHUP handler to tune the check frequency at runtime.
func (m *Monitor) SetNVMeCheckInterval(d time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if d <= 0 {
		d = 5 * time.Minute
	}
	m.nvmeCheckInterval = d
	slog.Debug("NVMe check interval updated", "interval_minutes", d.Minutes())
}

// Utility functions

func parseFloat(s string) float64 {
	v, _ := strconv.ParseFloat(strings.TrimSpace(s), 64)
	return v
}

func parseUint64(s string) uint64 {
	v, _ := strconv.ParseUint(strings.TrimSpace(s), 10, 64)
	return v
}

func extractKBValue(line string) uint64 {
	fields := strings.Fields(line)
	if len(fields) >= 2 {
		v, _ := strconv.ParseUint(fields[1], 10, 64)
		return v
	}
	return 0
}

func isAllDigits(s string) bool {
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return len(s) > 0
}

func isVirtualDevice(name string) bool {
	// Skip ram, loop, dm-, md, zram, nbd, etc.
	prefixes := []string{"ram", "loop", "dm-", "md", "zram", "nbd", "sr"}
	for _, p := range prefixes {
		if strings.HasPrefix(name, p) {
			return true
		}
	}
	return false
}
