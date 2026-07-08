package telemetry

import (
	"bufio"
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const (
	// DefaultSamplingInterval is the default interval between resource samples.
	DefaultSamplingInterval = 10 * time.Second

	// maxProcReadDuration is the warning threshold for slow /proc reads (OPS-PERF-03).
	maxProcReadDuration = 100 * time.Millisecond
)

// Sampler reads FFmpeg PID resource usage from /proc/<pid>/ every N seconds.
type Sampler struct {
	pid       int
	telemetry *JobTelemetry
	interval  time.Duration
	stopCh    chan struct{}
	doneCh    chan struct{}

	// Previous sample values for delta-based CPU calculation (OPS-04, M-02 fix)
	prevCPUTime    float64
	prevSampleTime time.Time
	firstSample    bool
}

// NewSampler creates a new resource sampler for the given FFmpeg PID.
// interval may be 0 to use the default (10s).
func NewSampler(pid int, telemetry *JobTelemetry, interval time.Duration) *Sampler {
	if interval <= 0 {
		interval = DefaultSamplingInterval
	}
	return &Sampler{
		pid:       pid,
		telemetry: telemetry,
		interval:  interval,
		stopCh:    make(chan struct{}),
		doneCh:    make(chan struct{}),
	}
}

// Start begins the sampling goroutine. It blocks until the context is cancelled
// or Stop() is called. Intended to be launched as a goroutine.
func (s *Sampler) Start(ctx context.Context) {
	defer close(s.doneCh)

	// Brief delay to let FFmpeg settle before first sample
	select {
	case <-time.After(2 * time.Second):
	case <-ctx.Done():
		return
	case <-s.stopCh:
		return
	}

	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	// Read initial CPU time baseline for delta calculation
	s.prevCPUTime = s.readProcessCPUTime()
	s.prevSampleTime = time.Now()
	s.firstSample = true

	for {
		select {
		case <-ticker.C:
			s.collect(ctx)

		case <-ctx.Done():
			// Final sample before stopping
			s.collect(ctx)
			return

		case <-s.stopCh:
			// Final sample before stopping
			s.collect(ctx)
			return
		}
	}
}

// Stop signals the sampler to stop. It blocks until the sampler goroutine exits.
func (s *Sampler) Stop() {
	select {
	case <-s.stopCh:
		// Already closing
	default:
		close(s.stopCh)
	}
	<-s.doneCh
}

// collect performs one sampling iteration with delta-based CPU calculation (M-02 fix).
// CPU% is computed as delta between consecutive /proc/<pid>/stat reads, not a cumulative average.
// This correctly detects short-duration CPU spikes.
func (s *Sampler) collect(ctx context.Context) {
	sample := ResourceSample{
		Timestamp: time.Now(),
	}

	start := time.Now()

	// Read RSS from /proc/<pid>/status
	if rss := s.readRSSBytes(); rss >= 0 {
		sample.RSSMB = rss / (1024 * 1024)
	}

	// Read I/O from /proc/<pid>/io
	readBytes, writeBytes := s.readIOBytes()
	sample.ReadBytes = readBytes
	sample.WriteBytes = writeBytes

	// Read current CPU time from /proc/<pid>/stat
	cpuTime := s.readProcessCPUTime()

	// Calculate CPU % as delta between consecutive samples (M-02 fix).
	// On the first sample, we just store the baseline and report 0%.
	if !s.firstSample {
		cpuDelta := cpuTime - s.prevCPUTime
		timeDelta := sample.Timestamp.Sub(s.prevSampleTime).Seconds()
		if timeDelta > 0 {
			sample.CPUPct = cpuDelta / timeDelta * 100.0
		}
	} else {
		s.firstSample = false
	}

	// Store for next delta calculation
	s.prevCPUTime = cpuTime
	s.prevSampleTime = sample.Timestamp

	if s.telemetry != nil {
		s.telemetry.AddSample(sample)
	}

	// Warn if proc read is slow (OPS-PERF-03)
	if elapsed := time.Since(start); elapsed > maxProcReadDuration {
		slog.Warn("Slow /proc read in telemetry sampler",
			"pid", s.pid,
			"elapsed_ms", elapsed.Milliseconds(),
			"max_ms", maxProcReadDuration.Milliseconds(),
		)
	}
}

// readProcessCPUTime returns the total CPU time (utime+stime in seconds) for the FFmpeg process.
// Reads from /proc/<pid>/stat fields 13 (utime) and 14 (stime).
func (s *Sampler) readProcessCPUTime() float64 {
	data, err := os.ReadFile(fmt.Sprintf("/proc/%d/stat", s.pid))
	if err != nil {
		return 0
	}

	// Find the closing ')' after comm field to handle spaces in comm
	content := string(data)
	closeParen := strings.LastIndex(content, ")")
	if closeParen < 0 {
		return 0
	}

	// Fields after the ')' are space-separated
	fields := strings.Fields(content[closeParen+1:])
	// fields[11] = utime (index 11 in 0-based from after ")")
	// fields[12] = stime
	if len(fields) < 15 {
		return 0
	}

	utimeStr := fields[11]
	stimeStr := fields[12]

	utime, _ := strconv.ParseFloat(utimeStr, 64)
	stime, _ := strconv.ParseFloat(stimeStr, 64)

	// Convert from clock ticks to seconds (CLK_TCK = 100 on most Linux)
	const clkTck = 100.0
	return (utime + stime) / clkTck
}

// readRSSBytes returns the VmRSS value in bytes from /proc/<pid>/status.
func (s *Sampler) readRSSBytes() int64 {
	file, err := os.Open(fmt.Sprintf("/proc/%d/status", s.pid))
	if err != nil {
		return -1
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "VmRSS:") {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				val, parseErr := strconv.ParseInt(fields[1], 10, 64)
				if parseErr != nil {
					return -1
				}
				// Value is in kB, convert to bytes
				return val * 1024
			}
		}
	}
	return -1
}

// readIOBytes returns the cumulative read_bytes and write_bytes from /proc/<pid>/io.
func (s *Sampler) readIOBytes() (readBytes, writeBytes int64) {
	file, err := os.Open(fmt.Sprintf("/proc/%d/io", s.pid))
	if err != nil {
		return 0, 0
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		switch {
		case strings.HasPrefix(line, "read_bytes:"):
			val := strings.TrimSpace(strings.TrimPrefix(line, "read_bytes:"))
			readBytes, _ = strconv.ParseInt(val, 10, 64)
		case strings.HasPrefix(line, "write_bytes:"):
			val := strings.TrimSpace(strings.TrimPrefix(line, "write_bytes:"))
			writeBytes, _ = strconv.ParseInt(val, 10, 64)
		}
	}
	return readBytes, writeBytes
}

// PID returns the monitored PID.
func (s *Sampler) PID() int {
	return s.pid
}

// IsProcessRunning checks whether the monitored process is still alive.
func (s *Sampler) IsProcessRunning() bool {
	commPath := filepath.Join("/proc", strconv.Itoa(s.pid), "comm")
	comm, err := os.ReadFile(commPath)
	if err != nil {
		return false
	}
	return strings.TrimSpace(string(comm)) != ""
}
