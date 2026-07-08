package guardian

import (
	"context"
	"math"
	"testing"
	"time"

	"github.com/a_ashraf_tech/vod-engine/internal/config"
	"github.com/a_ashraf_tech/vod-engine/internal/monitor"
)

// ---------------------------------------------------------------------------
// Ring Buffer Tests (PRED-01)
// ---------------------------------------------------------------------------

func TestRingBufferNew(t *testing.T) {
	rb := newRingBuffer(10)
	if rb == nil {
		t.Fatal("expected non-nil ring buffer")
	}
	if rb.Count() != 0 {
		t.Errorf("expected Count=0 for new ring buffer, got %d", rb.Count())
	}
	if rb.capacity != 10 {
		t.Errorf("expected capacity=10, got %d", rb.capacity)
	}
}

func TestRingBufferPushAndCount(t *testing.T) {
	rb := newRingBuffer(5)

	// Push 3 samples
	for i := 0; i < 3; i++ {
		rb.Push(ResourceSample{CPULoad1m: float64(i)})
	}

	if rb.Count() != 3 {
		t.Errorf("expected Count=3, got %d", rb.Count())
	}

	// Push to fill exactly
	for i := 3; i < 5; i++ {
		rb.Push(ResourceSample{CPULoad1m: float64(i)})
	}

	if rb.Count() != 5 {
		t.Errorf("expected Count=5, got %d", rb.Count())
	}
}

func TestRingBufferGetReturnsCorrectOrder(t *testing.T) {
	rb := newRingBuffer(10)

	// Push values 0..4
	for i := 0; i < 5; i++ {
		rb.Push(ResourceSample{CPULoad1m: float64(i * 10)})
	}

	samples := rb.Get(5)
	if len(samples) != 5 {
		t.Fatalf("expected 5 samples, got %d", len(samples))
	}

	// Verify order: oldest first (0, 10, 20, 30, 40)
	expected := []float64{0, 10, 20, 30, 40}
	for i, s := range samples {
		if s.CPULoad1m != expected[i] {
			t.Errorf("sample[%d].CPULoad1m = %f, want %f", i, s.CPULoad1m, expected[i])
		}
	}
}

func TestRingBufferGetPartial(t *testing.T) {
	rb := newRingBuffer(10)

	// Push 3 samples
	for i := 0; i < 3; i++ {
		rb.Push(ResourceSample{CPULoad1m: float64(i)})
	}

	// Request 10, should only get 3
	samples := rb.Get(10)
	if len(samples) != 3 {
		t.Errorf("expected 3 samples (asked for 10 when only 3 exist), got %d", len(samples))
	}
}

func TestRingBufferGetEmpty(t *testing.T) {
	rb := newRingBuffer(5)
	samples := rb.Get(1)
	if samples != nil {
		t.Errorf("expected nil for empty buffer, got %v", samples)
	}
}

func TestRingBufferGetNegative(t *testing.T) {
	rb := newRingBuffer(5)
	samples := rb.Get(-1)
	if samples != nil {
		t.Errorf("expected nil for negative request, got %v", samples)
	}
}

func TestRingBufferWraparound(t *testing.T) {
	rb := newRingBuffer(3)

	// Push 6 samples — ring buffer wraps around twice
	for i := 0; i < 6; i++ {
		rb.Push(ResourceSample{CPULoad1m: float64(i * 10)})
	}

	// Count should be 3 (capacity)
	if rb.Count() != 3 {
		t.Errorf("expected Count=3 after wraparound, got %d", rb.Count())
	}

	// Should return the latest 3 values: 30, 40, 50
	samples := rb.Get(3)
	if len(samples) != 3 {
		t.Fatalf("expected 3 samples after wraparound, got %d", len(samples))
	}

	expected := []float64{30, 40, 50}
	for i, s := range samples {
		if s.CPULoad1m != expected[i] {
			t.Errorf("sample[%d].CPULoad1m = %f, want %f", i, s.CPULoad1m, expected[i])
		}
	}
}

func TestRingBufferWraparoundExact(t *testing.T) {
	rb := newRingBuffer(3)

	// Push exactly 3 to fill
	for i := 0; i < 3; i++ {
		rb.Push(ResourceSample{CPULoad1m: float64(i)})
	}

	// Push 3 more to wrap around
	for i := 3; i < 6; i++ {
		rb.Push(ResourceSample{CPULoad1m: float64(i)})
	}

	// The 3 latest should be 3, 4, 5
	samples := rb.Get(3)
	expected := []float64{3, 4, 5}
	for i, s := range samples {
		if s.CPULoad1m != expected[i] {
			t.Errorf("wraparound exact: sample[%d] = %f, want %f", i, s.CPULoad1m, expected[i])
		}
	}
}

func TestRingBufferConcurrencySafe(t *testing.T) {
	rb := newRingBuffer(100)

	// Concurrent pushes (simulates real usage from monitor goroutine)
	done := make(chan struct{})
	go func() {
		for i := 0; i < 100; i++ {
			rb.Push(ResourceSample{CPULoad1m: float64(i)})
		}
		close(done)
	}()

	// Concurrent reads
	for i := 0; i < 50; i++ {
		_ = rb.Get(10)
		_ = rb.Count()
	}

	<-done

	// Should not be empty
	if rb.Count() == 0 {
		t.Error("expected non-empty ring buffer after concurrent operations")
	}
}

// ---------------------------------------------------------------------------
// Linear Regression Slope Tests (PRED-02, PRED-03)
// ---------------------------------------------------------------------------

func TestLinearRegressionSlope_Positive(t *testing.T) {
	// Perfectly increasing series: y = 2x + 1
	samples := make([]ResourceSample, 5)
	for i := 0; i < 5; i++ {
		samples[i] = ResourceSample{CPULoad1m: float64(2*i + 1)}
	}

	slope, err := linearRegressionSlope(samples, func(s ResourceSample) float64 { return s.CPULoad1m })
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Slope should be approximately 2.0
	if math.Abs(slope-2.0) > 0.001 {
		t.Errorf("expected slope ~2.0, got %f", slope)
	}
}

func TestLinearRegressionSlope_Negative(t *testing.T) {
	// Decreasing series: y = -3x + 10
	samples := make([]ResourceSample, 5)
	for i := 0; i < 5; i++ {
		samples[i] = ResourceSample{CPULoad1m: float64(-3*i + 10)}
	}

	slope, err := linearRegressionSlope(samples, func(s ResourceSample) float64 { return s.CPULoad1m })
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Slope should be approximately -3.0
	if math.Abs(slope+3.0) > 0.001 {
		t.Errorf("expected slope ~-3.0, got %f", slope)
	}
}

func TestLinearRegressionSlope_Flat(t *testing.T) {
	// Flat series: y = 5 (constant)
	samples := make([]ResourceSample, 5)
	for i := 0; i < 5; i++ {
		samples[i] = ResourceSample{CPULoad1m: 5.0}
	}

	slope, err := linearRegressionSlope(samples, func(s ResourceSample) float64 { return s.CPULoad1m })
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Slope should be approximately 0.0
	if math.Abs(slope) > 0.001 {
		t.Errorf("expected slope ~0.0, got %f", slope)
	}
}

func TestLinearRegressionSlope_InsufficientSamples(t *testing.T) {
	samples := make([]ResourceSample, 1)
	samples[0] = ResourceSample{CPULoad1m: 1.0}

	_, err := linearRegressionSlope(samples, func(s ResourceSample) float64 { return s.CPULoad1m })
	if err == nil {
		t.Error("expected error for insufficient samples (n<2), got nil")
	}
}

func TestLinearRegressionSlope_Empty(t *testing.T) {
	_, err := linearRegressionSlope(nil, func(s ResourceSample) float64 { return s.CPULoad1m })
	if err == nil {
		t.Error("expected error for empty samples, got nil")
	}
}

func TestLinearRegressionSlope_RAMValues(t *testing.T) {
	// Decreasing RAM (downward trend): available RAM dropping
	samples := make([]ResourceSample, 6)
	values := []float64{4000, 3500, 3000, 2500, 2000, 1500} // MB
	for i := 0; i < 6; i++ {
		samples[i] = ResourceSample{RAMAvailableMB: int64(values[i])}
	}

	slope, err := linearRegressionSlope(samples, func(s ResourceSample) float64 { return float64(s.RAMAvailableMB) })
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Slope should be negative (about -500 per sample)
	if slope >= 0 {
		t.Errorf("expected negative slope for decreasing RAM, got %f", slope)
	}
}

func TestLinearRegressionSlope_NoisyData(t *testing.T) {
	// Noisy upward trend: y = 0.5x + noise
	samples := make([]ResourceSample, 10)
	for i := 0; i < 10; i++ {
		samples[i] = ResourceSample{CPULoad1m: float64(i)*0.5 + float64(i%3)*0.1}
	}

	slope, err := linearRegressionSlope(samples, func(s ResourceSample) float64 { return s.CPULoad1m })
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Slope should be positive and close to 0.5
	if slope < 0.4 || slope > 0.6 {
		t.Errorf("expected slope ~0.5 (noisy), got %f", slope)
	}
}

// ---------------------------------------------------------------------------
// PredictiveGuardian Trend Detection Tests (PRED-02, PRED-03)
// ---------------------------------------------------------------------------

// newTestPredictiveGuardian creates a PredictiveGuardian with test configuration.
// Static thresholds are set so that the inner guardian never blocks in predictive-only
// tests (no live /proc data). Predictive thresholds are realistic to exercise the
// trend-detection and lookahead logic.
func newTestPredictiveGuardian() *PredictiveGuardian {
	cfg := &config.Config{
		PredictiveHistorySize:       60,
		PredictiveMinSamples:        3,
		PredictiveTrendWindowCount:  3,
		PredictiveCPUSlopeThreshold: 0.5,
		PredictiveLookaheadS:        60,
		PredictiveRecoveryFactor:    3,

		// Static guardian thresholds: permissive so inner guardian never blocks in tests
		// (without real /proc, snapshot values default to 0 which would trigger blocks).
		MaxCPULoadAvg:      6.0, // CPU trend tests predict hitting this within lookahead
		RecoveryHysteresis: 1.0,
		MinFreeRAMMB:       0,     // disabled — never blocks on RAM
		MinFreeSwapMB:      0,     // disabled
		MinFreeDiskGB:      0,     // disabled
		MaxDiskIOPct:       100.0, // permissive
		MaxNetworkMbps:     10000.0, // permissive
		MaxWorkDirUsageGB:  999999, // unlimited
		MonitorIntervalS:   5,     // each sample = 5s interval for time-to-threshold calc
	}

	inner := New(cfg, monitor.New(5, "/tmp"))
	pg := NewPredictiveGuardian(inner, cfg)
	return pg
}

// addSamplesToCPU adds n samples with the given CPU load pattern to the ring buffer.
func addSamplesToCPU(pg *PredictiveGuardian, loads []float64) {
	for _, load := range loads {
		pg.AddSample(&monitor.ResourceSnapshot{
			CPULoad1m: load,
			SampledAt: time.Now(),
		})
	}
}

// addSamplesToRAM adds n samples with the given RAM pattern.
func addSamplesToRAM(pg *PredictiveGuardian, ramMBs []int64) {
	for _, ram := range ramMBs {
		pg.AddSample(&monitor.ResourceSnapshot{
			RAMAvailableMB: ram,
			SampledAt:      time.Now(),
		})
	}
}

func TestPredictiveCanStart_ReturnsNilWhenInsufficientHistory(t *testing.T) {
	pg := newTestPredictiveGuardian()

	// With only 1 sample (< PredictiveMinSamples=3), should fall back to static
	// and return nil (no block from static guardian in test).
	pg.AddSample(&monitor.ResourceSnapshot{
		CPULoad1m: 4.0,
		SampledAt: time.Now(),
	})

	result := pg.CanStart()
	if result != nil {
		t.Errorf("expected nil (insufficient history fallback), got %+v", result)
	}
}

func TestPredictiveCanStart_BlocksOnUpwardCPUTrend(t *testing.T) {
	pg := newTestPredictiveGuardian()

	// Populate 3 samples with an upward CPU trend: 3.0, 5.0, 5.8
	// slope ≈ 1.4 per sample (rising toward MaxCPULoadAvg=6.0)
	// PredictiveCPUSlopeThreshold = 0.5, so 1.4 > 0.5 => passes slope gate
	// MaxCPULoadAvg = 6.0, last sample = 5.8
	// samplesToThreshold = (6.0-5.8)/1.4 = 0.143 samples
	// timeToThreshold = 0.143 * 5s = 0.71s < 60s => BLOCKS
	addSamplesToCPU(pg, []float64{3.0, 5.0, 5.8})

	result := pg.CanStart()
	if result == nil {
		t.Fatal("expected non-nil result (CPU trend should block), got nil")
	}
	if !result.Blocked {
		t.Errorf("expected Blocked=true, got Blocked=%v", result.Blocked)
	}
	if result.Resource != "cpu_trend" {
		t.Errorf("expected Resource=cpu_trend, got %q", result.Resource)
	}
}

func TestPredictiveCanStart_AllowsWhenCPUTrendBelowThreshold(t *testing.T) {
	pg := newTestPredictiveGuardian()

	// Shallow upward trend: 1.0, 1.2, 1.3
	// slope ~0.15 < 0.5 threshold => should NOT block
	addSamplesToCPU(pg, []float64{1.0, 1.2, 1.3})

	result := pg.CanStart()
	if result != nil {
		t.Errorf("expected nil (CPU slope below threshold), got %+v", result)
	}
}

func TestPredictiveCanStart_AllowsOnFlatCPUTrend(t *testing.T) {
	pg := newTestPredictiveGuardian()

	// Flat trend: 3.0, 3.0, 3.0
	// slope ~0.0 < 0.5 => should NOT block
	addSamplesToCPU(pg, []float64{3.0, 3.0, 3.0})

	result := pg.CanStart()
	if result != nil {
		t.Errorf("expected nil (flat CPU trend), got %+v", result)
	}
}

func TestPredictiveCanStart_BlocksOnDownwardRAMTrend(t *testing.T) {
	pg := newTestPredictiveGuardian()

	// Decreasing RAM trend with values that will hit the recovery threshold locally.
	// MinFreeRAMMB is 0 (disabled), so the RAM trend check uses a locally calculated
	// threshold based on the last sample * recovery factor.
	// Let's use values: 2000, 1500, 1000
	// slope = -500 per sample (negative = decreasing)
	// At slope=-500 and last=1000, the prediction depends on checkRAMTrend logic.
	// With PredictivceLookaheadS=60 and MonitorIntervalS=5, we check if
	// RAM will fall below 0 within 60s. At slope=-500/sample * each 5s=
	// -2500/s (flat wrong, let me just compute).
	// samplesToThreshold = (0-1000)/(-500) = 2 samples
	// timeToThreshold = 2 * 5s = 10s < 60s => BLOCKS
	addSamplesToRAM(pg, []int64{2000, 1500, 1000})

	result := pg.CanStart()
	if result == nil {
		t.Fatal("expected non-nil result (RAM trend should block), got nil")
	}
	if !result.Blocked {
		t.Errorf("expected Blocked=true for downward RAM, got Blocked=%v", result.Blocked)
	}
	if result.Resource != "ram_trend" {
		t.Errorf("expected Resource=ram_trend, got %q", result.Resource)
	}
}

func TestPredictiveCanStart_AllowsWhenRAMStable(t *testing.T) {
	pg := newTestPredictiveGuardian()

	// Stable RAM: 3000, 3000, 3000
	addSamplesToRAM(pg, []int64{3000, 3000, 3000})

	result := pg.CanStart()
	if result != nil {
		t.Errorf("expected nil (stable RAM), got %+v", result)
	}
}

func TestPredictiveCanStart_AllowsWhenRAMIncreasing(t *testing.T) {
	pg := newTestPredictiveGuardian()

	// Increasing RAM (good): 1000, 2000, 3000
	addSamplesToRAM(pg, []int64{1000, 2000, 3000})

	result := pg.CanStart()
	if result != nil {
		t.Errorf("expected nil (increasing RAM), got %+v", result)
	}
}

// ---------------------------------------------------------------------------
// Hysteresis / Unblock Tests (PRED-04)
// ---------------------------------------------------------------------------

func TestCheckUnblock_DoesNotUnblockBeforeRecoveryTime(t *testing.T) {
	pg := newTestPredictiveGuardian()

	// Manually set blocked state
	pg.blocked["cpu_trend"] = true
	pg.blockedSince["cpu_trend"] = time.Now()

	// Check unblock immediately — should NOT unblock because not enough time
	// has passed (RecoveryFactor=3, LookaheadS=60 => recovery threshold = 180s)
	pg.checkUnblock("cpu_trend", -1.0, 200*time.Second)

	if !pg.blocked["cpu_trend"] {
		t.Error("expected cpu_trend to remain blocked (too early for unblock)")
	}
}

func TestCheckUnblock_CPUUnblockWhenTrendReversed(t *testing.T) {
	pg := newTestPredictiveGuardian()

	// Set blocked state with enough time elapsed
	recoveryThreshold := time.Duration(pg.cfg.PredictiveRecoveryFactor) *
		time.Duration(pg.cfg.PredictiveLookaheadS) * time.Second

	pg.blocked["cpu_trend"] = true
	pg.blockedSince["cpu_trend"] = time.Now().Add(-recoveryThreshold - time.Second)

	// Slope is negative (CPU decreasing) — trend reversed
	pg.checkUnblock("cpu_trend", -0.1, 0)

	if pg.blocked["cpu_trend"] {
		t.Error("expected cpu_trend to be unblocked when slope reversed and time elapsed")
	}
}

func TestCheckUnblock_RAMUnblockWhenTrendReversed(t *testing.T) {
	pg := newTestPredictiveGuardian()

	recoveryThreshold := time.Duration(pg.cfg.PredictiveRecoveryFactor) *
		time.Duration(pg.cfg.PredictiveLookaheadS) * time.Second

	pg.blocked["ram_trend"] = true
	pg.blockedSince["ram_trend"] = time.Now().Add(-recoveryThreshold - time.Second)

	// Slope is positive (RAM increasing) — trend reversed
	pg.checkUnblock("ram_trend", 0.5, 0)

	if pg.blocked["ram_trend"] {
		t.Error("expected ram_trend to be unblocked when slope reversed and time elapsed")
	}
}

func TestCheckUnblock_CPUStaysBlockedWhenTrendContinues(t *testing.T) {
	pg := newTestPredictiveGuardian()

	recoveryThreshold := time.Duration(pg.cfg.PredictiveRecoveryFactor) *
		time.Duration(pg.cfg.PredictiveLookaheadS) * time.Second

	pg.blocked["cpu_trend"] = true
	pg.blockedSince["cpu_trend"] = time.Now().Add(-recoveryThreshold - time.Second)

	// Slope is still positive (CPU still trending up) — should not unblock
	pg.checkUnblock("cpu_trend", 1.0, 10*time.Second)

	if !pg.blocked["cpu_trend"] {
		t.Error("expected cpu_trend to stay blocked when trend still rising")
	}
}

func TestCheckUnblock_RAMStaysBlockedWhenTrendContinues(t *testing.T) {
	pg := newTestPredictiveGuardian()

	recoveryThreshold := time.Duration(pg.cfg.PredictiveRecoveryFactor) *
		time.Duration(pg.cfg.PredictiveLookaheadS) * time.Second

	pg.blocked["ram_trend"] = true
	pg.blockedSince["ram_trend"] = time.Now().Add(-recoveryThreshold - time.Second)

	// Slope is still negative (RAM still decreasing) — should not unblock
	pg.checkUnblock("ram_trend", -1.0, 10*time.Second)

	if !pg.blocked["ram_trend"] {
		t.Error("expected ram_trend to stay blocked when trend still falling")
	}
}

// ---------------------------------------------------------------------------
// processSamples Goroutine Test (PRED-01 fix)
// ---------------------------------------------------------------------------

func TestProcessSamples_PopulatesRingBuffer(t *testing.T) {
	pg := newTestPredictiveGuardian()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Launch the processSamples goroutine (this was the bug C-01)
	go pg.ProcessSamples(ctx)

	// Send some snapshots via the channel
	for i := 0; i < 5; i++ {
		pg.sampleCh <- &monitor.ResourceSnapshot{
			CPULoad1m:     float64(i) * 2.0,
			RAMAvailableMB: int64(4000 - int64(i)*500),
			SampledAt:      time.Now(),
		}
	}

	// Give the goroutine time to process
	time.Sleep(100 * time.Millisecond)

	// Verify the ring buffers received the samples
	count := pg.cpuHistory.Count()
	if count != 5 {
		t.Errorf("expected cpuHistory.Count()=5 after 5 samples, got %d", count)
	}

	samples := pg.cpuHistory.Get(5)
	if len(samples) != 5 {
		t.Fatalf("expected 5 cpu samples, got %d", len(samples))
	}

	// Verify values
	for i, s := range samples {
		expectedLoad := float64(i) * 2.0
		if s.CPULoad1m != expectedLoad {
			t.Errorf("sample[%d].CPULoad1m = %f, want %f", i, s.CPULoad1m, expectedLoad)
		}
	}

	// RAM buffer should also be populated
	if pg.ramHistory.Count() != 5 {
		t.Errorf("expected ramHistory.Count()=5, got %d", pg.ramHistory.Count())
	}
}

func TestProcessSamples_ExitsOnContextCancel(t *testing.T) {
	pg := newTestPredictiveGuardian()

	ctx, cancel := context.WithCancel(context.Background())

	done := make(chan struct{})
	go func() {
		pg.ProcessSamples(ctx)
		close(done)
	}()

	// Cancel the context
	cancel()

	// Should exit quickly
	select {
	case <-done:
		// OK — goroutine exited
	case <-time.After(time.Second):
		t.Fatal("processSamples did not exit within 1s after context cancel")
	}
}

func TestProcessSamples_DoesNotBlockOnFullChannel(t *testing.T) {
	pg := newTestPredictiveGuardian()

	// Don't start processSamples — just fill the channel buffer.
	// Channel has capacity 100 (set in NewPredictiveGuardian).
	for i := 0; i < 200; i++ {
		select {
		case pg.sampleCh <- &monitor.ResourceSnapshot{
			CPULoad1m: float64(i),
			SampledAt: time.Now(),
		}:
		default:
			// Channel full — acceptable (non-blocking send in monitor)
		}
	}

	// Now start processSamples and verify it drains
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go pg.ProcessSamples(ctx)

	time.Sleep(100 * time.Millisecond)

	// Should have drained at least some samples
	if pg.cpuHistory.Count() == 0 {
		t.Error("expected some samples to be drained after starting processSamples")
	}
}

// ---------------------------------------------------------------------------
// AddSample Nil Safety
// ---------------------------------------------------------------------------

func TestAddSample_NilDoesNotPanic(t *testing.T) {
	pg := newTestPredictiveGuardian()

	// Should not panic
	pg.AddSample(nil)

	if pg.cpuHistory.Count() != 0 {
		t.Errorf("expected Count=0 after nil sample, got %d", pg.cpuHistory.Count())
	}
}

func TestAddSample_PopulatesAllBuffers(t *testing.T) {
	pg := newTestPredictiveGuardian()

	snap := &monitor.ResourceSnapshot{
		CPULoad1m:      3.5,
		RAMAvailableMB: 2048,
		DiskIOPct:      25.0,
		NetworkOutMbps: 50.0,
		DiskFreeGB:     100,
		SampledAt:      time.Now(),
	}

	pg.AddSample(snap)

	if pg.cpuHistory.Count() != 1 {
		t.Errorf("cpuHistory.Count()=1, got %d", pg.cpuHistory.Count())
	}
	if pg.ramHistory.Count() != 1 {
		t.Errorf("ramHistory.Count()=1, got %d", pg.ramHistory.Count())
	}
	if pg.diskIOHistory.Count() != 1 {
		t.Errorf("diskIOHistory.Count()=1, got %d", pg.diskIOHistory.Count())
	}
	if pg.netHistory.Count() != 1 {
		t.Errorf("netHistory.Count()=1, got %d", pg.netHistory.Count())
	}
	if pg.diskFreeHist.Count() != 1 {
		t.Errorf("diskFreeHist.Count()=1, got %d", pg.diskFreeHist.Count())
	}
}

// ---------------------------------------------------------------------------
// Predictive Guardian CanStart Integration with Static Guardian (PRED-05)
// ---------------------------------------------------------------------------

func TestPredictiveCanStart_CanStartWithZeroSamples(t *testing.T) {
	// When there are no samples at all, CanStart should fall back to static
	// thresholds (PRED-05) and return nil if static thresholds are OK.
	pg := newTestPredictiveGuardian()

	// No samples added — history count is 0 < PredictiveMinSamples (3)
	result := pg.CanStart()
	if result != nil {
		t.Errorf("expected nil (fallback to static thresholds), got %+v", result)
	}
}

func TestPredictiveCanStart_AddSampleAfterNew(t *testing.T) {
	// Verify that after creating a PredictiveGuardian, adding a sample
	// and running CanStart works correctly.
	pg := newTestPredictiveGuardian()

	// Initially 0 count
	if pg.cpuHistory.Count() != 0 {
		t.Errorf("expected 0 initial samples, got %d", pg.cpuHistory.Count())
	}

	// Add one sample
	pg.AddSample(&monitor.ResourceSnapshot{
		CPULoad1m: 2.0,
		SampledAt: time.Now(),
	})

	if pg.cpuHistory.Count() != 1 {
		t.Errorf("expected 1 sample after AddSample, got %d", pg.cpuHistory.Count())
	}

	// CanStart should return nil (insufficient history, falls back to static)
	result := pg.CanStart()
	if result != nil {
		t.Errorf("expected nil (fallback), got %+v", result)
	}
}

// ---------------------------------------------------------------------------
// Regression: Ensure processSamples does not deadlock on channel close (C-01 edge)
// ---------------------------------------------------------------------------

func TestProcessSamples_ChannelNotClosedUnexpectedly(t *testing.T) {
	// The monitor uses non-blocking send, so the channel is never closed.
	// Verify processSamples handles the case where ctx is cancelled while
	// waiting on the channel.
	pg := newTestPredictiveGuardian()

	ctx, cancel := context.WithCancel(context.Background())

	done := make(chan struct{})
	go func() {
		pg.ProcessSamples(ctx)
		close(done)
	}()

	// Send a sample first
	pg.sampleCh <- &monitor.ResourceSnapshot{
		CPULoad1m: 1.0,
		SampledAt: time.Now(),
	}

	// Wait a tiny bit for processing
	time.Sleep(50 * time.Millisecond)

	// Cancel to exit
	cancel()

	select {
	case <-done:
		// Clean exit
	case <-time.After(time.Second):
		t.Fatal("processSamples did not exit cleanly after context cancel with data in channel")
	}
}
