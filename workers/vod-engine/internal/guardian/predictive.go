package guardian

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"sync"
	"sync/atomic"
	"time"

	"github.com/a_ashraf_tech/vod-engine/internal/config"
	"github.com/a_ashraf_tech/vod-engine/internal/metrics"
	"github.com/a_ashraf_tech/vod-engine/internal/monitor"
)

// ResourceSample represents a single resource measurement stored in the ring buffer.
type ResourceSample struct {
	Timestamp      time.Time
	CPULoad1m      float64
	RAMAvailableMB int64
	DiskIOPct      float64
	NetworkOutMbps float64
	DiskFreeGB     int64
}

// ringBuffer is a fixed-size circular buffer for resource samples (PRED-01).
type ringBuffer struct {
	samples  []ResourceSample
	head     int
	count    int
	capacity int
	mu       sync.RWMutex
}

// newRingBuffer creates a ring buffer with the given capacity.
func newRingBuffer(capacity int) *ringBuffer {
	return &ringBuffer{
		samples:  make([]ResourceSample, capacity),
		capacity: capacity,
	}
}

// Push adds a sample, evicting the oldest if full.
func (rb *ringBuffer) Push(s ResourceSample) {
	rb.mu.Lock()
	defer rb.mu.Unlock()

	rb.samples[rb.head] = s
	rb.head = (rb.head + 1) % rb.capacity
	if rb.count < rb.capacity {
		rb.count++
	}
}

// Get returns the last n samples (or fewer if not enough exist).
// Returns them in chronological order (oldest first).
func (rb *ringBuffer) Get(n int) []ResourceSample {
	rb.mu.RLock()
	defer rb.mu.RUnlock()

	if n > rb.count {
		n = rb.count
	}
	if n <= 0 {
		return nil
	}

	result := make([]ResourceSample, n)
	start := (rb.head - rb.count + rb.capacity) % rb.capacity
	for i := 0; i < n; i++ {
		idx := (start + i) % rb.capacity
		result[i] = rb.samples[idx]
	}
	return result
}

// Count returns the number of samples currently stored.
func (rb *ringBuffer) Count() int {
	rb.mu.RLock()
	defer rb.mu.RUnlock()
	return rb.count
}

// PredictiveGuardian wraps the existing Guardian with trend-based resource prediction
// (PRED-01 through PRED-06).
type PredictiveGuardian struct {
	Inner  *Guardian
	cfg    *config.Config

	// Ring buffers per resource type
	cpuHistory    *ringBuffer
	ramHistory    *ringBuffer
	diskIOHistory *ringBuffer
	netHistory    *ringBuffer
	diskFreeHist  *ringBuffer

	// Current block state (for hysteresis)
	blocked      map[string]bool
	blockedSince map[string]time.Time

	mu          sync.RWMutex
	sampleCh    chan *monitor.ResourceSnapshot
	mc          atomic.Value // stores *metrics.MetricsCollector; OBS-02: guardian resume counter
}

// NewPredictiveGuardian creates a new PredictiveGuardian wrapping the given Guardian.
func NewPredictiveGuardian(inner *Guardian, cfg *config.Config) *PredictiveGuardian {
	return &PredictiveGuardian{
		Inner:         inner,
		cfg:           cfg,
		cpuHistory:    newRingBuffer(cfg.PredictiveHistorySize),
		ramHistory:    newRingBuffer(cfg.PredictiveHistorySize),
		diskIOHistory: newRingBuffer(cfg.PredictiveHistorySize),
		netHistory:    newRingBuffer(cfg.PredictiveHistorySize),
		diskFreeHist:  newRingBuffer(cfg.PredictiveHistorySize),
		blocked:       make(map[string]bool),
		blockedSince:  make(map[string]time.Time),
		sampleCh:      make(chan *monitor.ResourceSnapshot, 100),
	}
}

// SampleCh returns the channel for receiving resource snapshots.
// The monitor sends snapshots here.
func (pg *PredictiveGuardian) SampleCh() chan<- *monitor.ResourceSnapshot {
	return pg.sampleCh
}

// AddSample stores a resource snapshot in the ring buffers (PRED-01).
func (pg *PredictiveGuardian) AddSample(snap *monitor.ResourceSnapshot) {
	if snap == nil {
		return
	}

	sample := ResourceSample{
		Timestamp:      snap.SampledAt,
		CPULoad1m:      snap.CPULoad1m,
		RAMAvailableMB: snap.RAMAvailableMB,
		DiskIOPct:      snap.DiskIOPct,
		NetworkOutMbps: snap.NetworkOutMbps,
		DiskFreeGB:     snap.DiskFreeGB,
	}

	pg.cpuHistory.Push(sample)
	pg.ramHistory.Push(sample)
	pg.diskIOHistory.Push(sample)
	pg.netHistory.Push(sample)
	pg.diskFreeHist.Push(sample)
}

// ProcessSamples is a goroutine that receives resource snapshots from the monitor
// and stores them in the ring buffers (PRED-01). Must be launched as a goroutine.
func (pg *PredictiveGuardian) ProcessSamples(ctx context.Context) {
	for {
		select {
		case snap := <-pg.sampleCh:
			pg.AddSample(snap)
		case <-ctx.Done():
			return
		}
	}
}

// CanStart checks resource thresholds including predictive trends (PRED-02, PRED-03).
// Returns nil if OK, or a Result describing the block.
func (pg *PredictiveGuardian) CanStart() *Result {
	// First, check static thresholds via the inner guardian
	innerResult := pg.Inner.CanStart()
	if innerResult != nil {
		return innerResult
	}

	// If insufficient data, fall back to static thresholds only (PRED-05)
	if pg.cpuHistory.Count() < pg.cfg.PredictiveMinSamples {
		slog.Debug("PREDICTIVE_GUARDIAN: Insufficient history — using static thresholds",
			"count", pg.cpuHistory.Count(),
			"min", pg.cfg.PredictiveMinSamples,
		)
		return nil
	}

	pg.mu.Lock()
	defer pg.mu.Unlock()

	// Check predictive CPU trend (PRED-02)
	if cpuResult := pg.checkCPUTrend(); cpuResult != nil {
		return cpuResult
	}

	// Check predictive RAM trend (PRED-03)
	if ramResult := pg.checkRAMTrend(); ramResult != nil {
		return ramResult
	}

	return nil
}

// checkCPUTrend checks for upward CPU trend (PRED-02).
func (pg *PredictiveGuardian) checkCPUTrend() *Result {
	samples := pg.cpuHistory.Get(pg.cfg.PredictiveTrendWindowCount)
	if len(samples) < pg.cfg.PredictiveTrendWindowCount {
		return nil
	}

	slope, err := linearRegressionSlope(samples, func(s ResourceSample) float64 { return s.CPULoad1m })
	if err != nil || slope <= pg.cfg.PredictiveCPUSlopeThreshold {
		// Check if we should unblock a previously blocked CPU trend (PRED-04)
		pg.checkUnblock("cpu_trend", slope, 0)
		return nil
	}

	// Predict time to reach MaxCPULoadAvg
	lastSample := samples[len(samples)-1]
	pg.cfg.RLock()
	maxLoad := pg.cfg.MaxCPULoadAvg
	lookahead := time.Duration(pg.cfg.PredictiveLookaheadS) * time.Second
	pg.cfg.RUnlock()

	// time_to_threshold = (threshold - current) / slope (per sample)
	// Each sample = MonitorIntervalS apart
	monitorInterval := time.Duration(pg.cfg.MonitorIntervalS) * time.Second
	samplesToThreshold := (maxLoad - lastSample.CPULoad1m) / slope
	// Compute as float first to avoid truncation when samplesToThreshold < 1 (fix M-03)
	timeToThreshold := time.Duration(samplesToThreshold * float64(monitorInterval))

	if timeToThreshold > 0 && timeToThreshold < lookahead {
		pg.blocked["cpu_trend"] = true
		if _, ok := pg.blockedSince["cpu_trend"]; !ok {
			pg.blockedSince["cpu_trend"] = time.Now()
		}

		slog.Warn("guardian.resource_block",
			slog.String("resource", "cpu_trend"),
			slog.Float64("current_load", lastSample.CPULoad1m),
			slog.Float64("slope", slope),
			slog.Float64("time_to_threshold_s", timeToThreshold.Seconds()),
			slog.Float64("threshold", maxLoad),
		)

		return &Result{
			Blocked:     true,
			Resource:    "cpu_trend",
			Current:     fmt.Sprintf("%.2f load (trending up %.3f/sample)", lastSample.CPULoad1m, slope),
			Threshold:   fmt.Sprintf("%.1f load (predicted in %.0fs)", maxLoad, timeToThreshold.Seconds()),
			Description: fmt.Sprintf("CPU trend predicted to exceed %.1f in %.0fs (slope=%.3f)", maxLoad, timeToThreshold.Seconds(), slope),
		}
	}

	// Check unblock with current trend slope and time-to-threshold
	pg.checkUnblock("cpu_trend", slope, timeToThreshold)
	return nil
}

// checkRAMTrend checks for downward RAM trend (PRED-03).
func (pg *PredictiveGuardian) checkRAMTrend() *Result {
	samples := pg.ramHistory.Get(pg.cfg.PredictiveTrendWindowCount)
	if len(samples) < pg.cfg.PredictiveTrendWindowCount {
		return nil
	}

	// For RAM, we want samples reversed (oldest first) for the regression
	// and check for downward trend (negative slope)
	slope, err := linearRegressionSlope(samples, func(s ResourceSample) float64 { return float64(s.RAMAvailableMB) })
	if err != nil || slope >= 0 {
		pg.checkUnblock("ram_trend", slope, 0)
		return nil
	}

	lastSample := samples[len(samples)-1]
	pg.cfg.RLock()
	minRAM := pg.cfg.MinFreeRAMMB
	lookahead := time.Duration(pg.cfg.PredictiveLookaheadS) * time.Second
	pg.cfg.RUnlock()

	// Slope is negative (downward trend). Predict when RAM hits min.
	monitorInterval := time.Duration(pg.cfg.MonitorIntervalS) * time.Second
	// samples_to_threshold = (threshold - current) / slope (slope is negative)
	samplesToThreshold := (float64(minRAM) - float64(lastSample.RAMAvailableMB)) / slope
	// Compute as float first to avoid truncation when samplesToThreshold < 1 (fix M-03)
	timeToThreshold := time.Duration(samplesToThreshold * float64(monitorInterval))

	if timeToThreshold > 0 && timeToThreshold < lookahead {
		pg.blocked["ram_trend"] = true
		if _, ok := pg.blockedSince["ram_trend"]; !ok {
			pg.blockedSince["ram_trend"] = time.Now()
		}

		slog.Warn("guardian.resource_block",
			slog.String("resource", "ram_trend"),
			slog.Int64("current_ram_mb", lastSample.RAMAvailableMB),
			slog.Float64("slope", slope),
			slog.Float64("time_to_threshold_s", timeToThreshold.Seconds()),
			slog.Int64("threshold_mb", minRAM),
		)

		return &Result{
			Blocked:     true,
			Resource:    "ram_trend",
			Current:     fmt.Sprintf("%d MB (trending down %.1f MB/sample)", lastSample.RAMAvailableMB, -slope),
			Threshold:   fmt.Sprintf("%d MB (predicted in %.0fs)", minRAM, timeToThreshold.Seconds()),
			Description: fmt.Sprintf("RAM predicted to fall below %d MB in %.0fs (slope=%.1f)", minRAM, timeToThreshold.Seconds(), slope),
		}
	}

	pg.checkUnblock("ram_trend", slope, timeToThreshold)
	return nil
}

// SetMetricsCollector attaches the metrics collector to the PredictiveGuardian (OBS-02).
// Thread-safe via atomic.Value (M-02 fix).
func (pg *PredictiveGuardian) SetMetricsCollector(mc *metrics.MetricsCollector) {
	pg.mc.Store(mc)
}

// getMC safely returns the metrics collector or nil if not set.
func (pg *PredictiveGuardian) getMC() *metrics.MetricsCollector {
	if v := pg.mc.Load(); v != nil {
		return v.(*metrics.MetricsCollector)
	}
	return nil
}

// checkUnblock checks if a previously blocked resource can be unblocked (PRED-04).
// It re-evaluates the current trend slope and predicted time-to-threshold to
// implement proper hysteresis: only unblock when the trend has reversed AND
// the predicted time-to-threshold exceeds PREDICTIVE_RECOVERY_FACTOR × PREDICTIVE_LOOKAHEAD_S.
// slope is the current regression slope; timeToThreshold is the predicted
// duration until the resource hits its threshold (0 if not computable).
func (pg *PredictiveGuardian) checkUnblock(resource string, slope float64, timeToThreshold time.Duration) {
	if !pg.blocked[resource] {
		return
	}

	blockedSince, ok := pg.blockedSince[resource]
	if !ok {
		return
	}

	recoveryThreshold := time.Duration(pg.cfg.PredictiveRecoveryFactor) * time.Duration(pg.cfg.PredictiveLookaheadS) * time.Second

	// Determine if the trend has reversed and if the predicted time-to-threshold is safe.
	// Per spec PRED-04: unblock only when the current trend reverses AND the
	// predicted time-to-threshold exceeds the recovery threshold.
	canUnblock := false

	switch resource {
	case "cpu_trend":
		// CPU trend reverses when slope drops below or equal to the threshold
		// (no longer trending up significantly). If slope is negative, CPU load is decreasing.
		trendReversed := slope <= pg.cfg.PredictiveCPUSlopeThreshold
		if trendReversed {
			// If slope is negative, time-to-threshold is infinite (never reaches threshold).
			// If slope is positive but below threshold, ensure predicted time is safe.
			if slope <= 0 || timeToThreshold > recoveryThreshold {
				canUnblock = true
			}
		}

	case "ram_trend":
		// RAM trend reverses when slope becomes >= 0 (no longer trending down).
		trendReversed := slope >= 0
		if trendReversed {
			// If slope is positive, RAM is increasing (safe).
			// If slope is zero, RAM is stable.
			if slope >= 0 || timeToThreshold > recoveryThreshold {
				canUnblock = true
			}
		}
	}

	if canUnblock {
		// Also enforce a minimum wall-clock time as a safety net against flapping.
		if time.Since(blockedSince) >= recoveryThreshold {
			delete(pg.blocked, resource)
			delete(pg.blockedSince, resource)

			slog.Info("guardian.resource_unblock",
				slog.String("resource", resource),
				slog.Float64("current_slope", slope),
				slog.Float64("time_to_threshold_s", timeToThreshold.Seconds()),
				slog.String("message", "Trend reversed, resuming job scheduling"),
			)

			// OBS-02: Increment guardian resume metric
			if mc := pg.getMC(); mc != nil {
				mc.CounterInc("vod_engine_guardian_resumes_total{resource=\"" + resource + "\"}")
			}
		}
	}
}

// LogBlock logs a blocked predictive resource situation (LOG-04).
func (pg *PredictiveGuardian) LogBlock(r *Result) {
	slog.Warn("guardian.resource_block",
		slog.String("resource", r.Resource),
		slog.String("current", r.Current),
		slog.String("threshold", r.Threshold),
		slog.String("description", r.Description),
	)
}

// LogUnblock logs when a previously blocked predictive resource recovers (LOG-04).
func (pg *PredictiveGuardian) LogUnblock(r *Result) {
	slog.Info("guardian.resource_unblock",
		slog.String("resource", r.Resource),
		slog.String("description", fmt.Sprintf("%s now within safe range", r.Resource)),
	)
}

// sampleValueFn extracts a numeric value from a ResourceSample for regression.
type sampleValueFn func(s ResourceSample) float64

// linearRegressionSlope computes the slope (b) of a simple linear regression
// y = a + bx over the given samples, using the sample index as x.
// The valueFn parameter extracts the dependent variable from each sample,
// enabling independent trend detection per resource type (PRED-02, PRED-03).
func linearRegressionSlope(samples []ResourceSample, valueFn sampleValueFn) (float64, error) {
	n := float64(len(samples))
	if n < 2 {
		return 0, fmt.Errorf("insufficient samples for regression: %.0f", n)
	}

	var sumX, sumY, sumXY, sumX2 float64

	for i, s := range samples {
		x := float64(i)
		y := valueFn(s)
		sumX += x
		sumY += y
		sumXY += x * y
		sumX2 += x * x
	}

	denom := n*sumX2 - sumX*sumX
	if math.Abs(denom) < 1e-10 {
		return 0, fmt.Errorf("denominator too small: %f", denom)
	}

	slope := (n*sumXY - sumX*sumY) / denom
	return slope, nil
}
