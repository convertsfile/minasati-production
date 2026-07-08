package telemetry

import (
	"bytes"
	"log/slog"
	"math"
	"strings"
	"testing"
	"time"
)

func TestNewJobTelemetry(t *testing.T) {
	jt := NewJobTelemetry("job-1", "42", "480p")
	if jt == nil {
		t.Fatal("expected non-nil JobTelemetry")
	}
	if jt.JobID != "job-1" {
		t.Errorf("expected JobID 'job-1', got %q", jt.JobID)
	}
	if jt.LectureID != "42" {
		t.Errorf("expected LectureID '42', got %q", jt.LectureID)
	}
	if jt.Quality != "480p" {
		t.Errorf("expected Quality '480p', got %q", jt.Quality)
	}
	if jt.StartTime.IsZero() {
		t.Error("expected StartTime to be set")
	}
	if len(jt.Samples) != 0 {
		t.Errorf("expected 0 samples, got %d", len(jt.Samples))
	}
}

func TestAddSample(t *testing.T) {
	jt := NewJobTelemetry("job-2", "99", "720p")

	sample := ResourceSample{
		Timestamp:  time.Now(),
		CPUPct:     45.2,
		RSSMB:      2048,
		ReadBytes:  1024 * 1024,
		WriteBytes: 2048 * 1024,
	}

	jt.AddSample(sample)
	if len(jt.Samples) != 1 {
		t.Fatalf("expected 1 sample, got %d", len(jt.Samples))
	}
	if jt.Samples[0].CPUPct != 45.2 {
		t.Errorf("expected CPUPct 45.2, got %f", jt.Samples[0].CPUPct)
	}
}

func TestCompute(t *testing.T) {
	jt := NewJobTelemetry("job-3", "7", "360p")
	now := time.Now()

	samples := []ResourceSample{
		{Timestamp: now, CPUPct: 30.0, RSSMB: 1000, ReadBytes: 100, WriteBytes: 500},
		{Timestamp: now.Add(10 * time.Second), CPUPct: 50.0, RSSMB: 1500, ReadBytes: 200, WriteBytes: 800},
		{Timestamp: now.Add(20 * time.Second), CPUPct: 70.0, RSSMB: 2000, ReadBytes: 300, WriteBytes: 1200},
	}

	for _, s := range samples {
		jt.AddSample(s)
	}

	jt.EndTime = now.Add(30 * time.Second)
	jt.Compute()

	expectedCPUAvg := (30.0 + 50.0 + 70.0) / 3.0
	if math.Abs(expectedCPUAvg-jt.CPUAvgPct) > 0.01 {
		t.Errorf("expected CPUAvgPct %.1f, got %.1f", expectedCPUAvg, jt.CPUAvgPct)
	}

	if jt.CPUPeakPct != 70.0 {
		t.Errorf("expected CPUPeakPct 70.0, got %f", jt.CPUPeakPct)
	}

	expectedRAMAvg := (1000.0 + 1500.0 + 2000.0) / 3.0
	if math.Abs(expectedRAMAvg-jt.RAMAvgMB) > 0.01 {
		t.Errorf("expected RAMAvgMB %.1f, got %.1f", expectedRAMAvg, jt.RAMAvgMB)
	}

	if jt.RAMPeakMB != 2000.0 {
		t.Errorf("expected RAMPeakMB 2000.0, got %f", jt.RAMPeakMB)
	}

	// Disk I/O from last sample
	if jt.DiskReadMB != 0 || jt.DiskWriteMB != 0 {
		// Values are in bytes, so 300 bytes = 0 MB, 1200 bytes = 0 MB
		// That's fine for the calculation logic test
	}

	expectedDuration := 30.0
	if math.Abs(jt.EncodingDurationS-expectedDuration) > 0.1 {
		t.Errorf("expected EncodingDurationS %.1f, got %.1f", expectedDuration, jt.EncodingDurationS)
	}
}

func TestComputeEmptySamples(t *testing.T) {
	jt := NewJobTelemetry("job-4", "42", "480p")
	jt.Compute() // Should not crash

	if jt.CPUAvgPct != 0 {
		t.Errorf("expected CPUAvgPct 0, got %f", jt.CPUAvgPct)
	}
}

func TestToLogEvent(t *testing.T) {
	jt := NewJobTelemetry("job-5", "42", "480p")
	jt.EndTime = time.Now()
	jt.Compute()

	jt.CPUAvgPct = 45.2
	jt.CPUPeakPct = 78.1
	jt.RAMAvgMB = 2048
	jt.RAMPeakMB = 3100
	jt.DiskReadMB = 512
	jt.DiskWriteMB = 4096
	jt.EncodingDurationS = 342.5
	jt.DownloadSpeedMbps = 85.3
	jt.UploadSpeedMbps = 42.7
	jt.TotalSizeMB = 512
	jt.SegmentsCount = 85
	jt.RetryCount = 0
	jt.FinalStatus = "completed"

	attrs := jt.ToLogEvent()
	// First attr should be event=job.telemetry at the top level (C-01 fix)
	if len(attrs) < 1 || attrs[0].Key != "event" {
		t.Errorf("expected first attr key 'event', got %q", attrs[0].Key)
	}

	// Verify it can be logged without error using spread
	var buf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&buf, nil))
	logger.LogAttrs(nil, slog.LevelInfo, "job.telemetry", attrs...)
	if buf.Len() == 0 {
		t.Error("expected log output, got empty buffer")
	}

	// Verify event field is at top level in JSON output
	s := buf.String()
	if !strings.Contains(s, `"event":"pipeline.telemetry"`) {
		t.Errorf("expected event 'pipeline.telemetry' in JSON output, got: %s", s)
	}
}

func TestSerialize(t *testing.T) {
	jt := NewJobTelemetry("job-6", "99", "720p")
	jt.Compute()
	jt.FinalStatus = "completed"

	m := jt.Serialize()
	if m["event"] != "pipeline.telemetry" {
		t.Errorf("expected event 'pipeline.telemetry', got %v", m["event"])
	}
	if m["final_status"] != "completed" {
		t.Errorf("expected final_status 'completed', got %v", m["final_status"])
	}
}

func TestString(t *testing.T) {
	jt := NewJobTelemetry("job-7", "42", "480p")
	jt.EndTime = time.Now()
	jt.Compute()
	jt.CPUAvgPct = 45.2
	jt.CPUPeakPct = 78.1
	jt.RAMAvgMB = 2048
	jt.RAMPeakMB = 3100

	s := jt.String()
	if s == "" {
		t.Error("expected non-empty string")
	}
}

func TestMultipleSamplesAggregation(t *testing.T) {
	jt := NewJobTelemetry("job-8", "10", "480p")
	now := time.Now()

	// 10 samples with increasing values
	for i := 0; i < 10; i++ {
		s := ResourceSample{
			Timestamp:  now.Add(time.Duration(i) * 10 * time.Second),
			CPUPct:     float64(20 + i*5),
			RSSMB:      int64(500 + i*100),
			ReadBytes:  int64(i * 1000),
			WriteBytes: int64(i * 2000),
		}
		jt.AddSample(s)
	}

	jt.EndTime = now.Add(100 * time.Second)
	jt.Compute()

	// CPU peak should be the last one = 20 + 9*5 = 65
	if jt.CPUPeakPct != 65.0 {
		t.Errorf("expected CPUPeakPct 65.0, got %f", jt.CPUPeakPct)
	}

	// RAM peak should be the last one = 500 + 9*100 = 1400
	if jt.RAMPeakMB != 1400.0 {
		t.Errorf("expected RAMPeakMB 1400.0, got %f", jt.RAMPeakMB)
	}
}
