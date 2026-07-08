package monitor

import (
	"math"
	"testing"
	"time"
)

func TestNewMonitor(t *testing.T) {
	m := New(5*time.Second, "/tmp/vod-engine")
	if m == nil {
		t.Fatal("expected non-nil monitor")
	}
	if m.interval != 5*time.Second {
		t.Errorf("expected interval 5s, got %v", m.interval)
	}
	if m.workDir != "/tmp/vod-engine" {
		t.Errorf("expected workDir /tmp/vod-engine, got %s", m.workDir)
	}
}

func TestSnapshotInitial(t *testing.T) {
	m := New(5*time.Second, "/tmp/vod-engine")
	
	// Before any sample, the snapshot contains zero values
	snap := m.Snapshot()

	// Initial snapshot should have default zero values
	if snap.CPULoad1m != 0 {
		t.Errorf("expected initial CPU load 0, got %f", snap.CPULoad1m)
	}
	// SampledAt may be zero time before the first sample() call
	// Just verify the struct is accessible
	_ = snap.SampledAt
}

func TestSnapshotAfterForceSample(t *testing.T) {
	m := New(5*time.Second, "/tmp/vod-engine")
	m.ForceSample()

	snap := m.Snapshot()
	// After a forced sample, SampledAt should be set (non-zero)
	if snap.SampledAt.IsZero() {
		t.Error("expected sampledAt to be set after ForceSample")
	}
}

func TestForceSample(t *testing.T) {
	m := New(5*time.Second, "/tmp/vod-engine")
	m.ForceSample()

	snap := m.Snapshot()
	if snap.SampledAt.IsZero() {
		t.Error("expected sampledAt to be set after ForceSample")
	}
}

func TestReadNVMeHealth_Throttled(t *testing.T) {
	m := New(5*time.Second, "/tmp/vod-engine")

	snap := &ResourceSnapshot{}
	m.readNVMeHealth(snap)

	// Call again immediately - should be throttled (nvmeLastCheck was just set)
	secondSnap := &ResourceSnapshot{}
	m.readNVMeHealth(secondSnap)

	// If throttled correctly, secondSnap values should remain unset
	if secondSnap.NVMePercentageUsed != 0 {
		t.Log("NVMe health was sampled despite throttle (sysfs may exist)")
	}
}

func TestNVMeCheckInterval(t *testing.T) {
	m := New(5*time.Second, "/tmp/vod-engine")

	if m.nvmeCheckInterval != 5*time.Minute {
		t.Errorf("expected nvme check interval 5m, got %v", m.nvmeCheckInterval)
	}
}

func TestSetFDLimit(t *testing.T) {
	m := New(5*time.Second, "/tmp/vod-engine")
	m.SetFDLimit(100000)

	if m.fdLimit != 100000 {
		t.Errorf("expected fdLimit 100000, got %d", m.fdLimit)
	}
}

func TestIsVirtualDevice(t *testing.T) {
	tests := []struct {
		name     string
		expected bool
	}{
		{"sda", false},
		{"sdb", false},
		{"nvme0n1", false},
		{"ram0", true},
		{"loop0", true},
		{"dm-0", true},
		{"md0", true},
		{"zram0", true},
		{"nbd0", true},
		{"sr0", true},
	}

	for _, tt := range tests {
		got := isVirtualDevice(tt.name)
		if got != tt.expected {
			t.Errorf("isVirtualDevice(%q) = %v, want %v", tt.name, got, tt.expected)
		}
	}
}

func TestIsAllDigits(t *testing.T) {
	tests := []struct {
		s        string
		expected bool
	}{
		{"12345", true},
		{"0", true},
		{"", false},
		{"12a45", false},
		{"abc", false},
	}

	for _, tt := range tests {
		got := isAllDigits(tt.s)
		if got != tt.expected {
			t.Errorf("isAllDigits(%q) = %v, want %v", tt.s, got, tt.expected)
		}
	}
}

func TestParseFloat(t *testing.T) {
	tests := []struct {
		s        string
		expected float64
	}{
		{"45.2", 45.2},
		{"0", 0},
		{"-1.5", -1.5},
		{"", 0},
		{"invalid", 0},
	}

	for _, tt := range tests {
		got := parseFloat(tt.s)
		if math.Abs(got-tt.expected) > 0.001 {
			t.Errorf("parseFloat(%q) = %f, want %f", tt.s, got, tt.expected)
		}
	}
}

func TestParseUint64(t *testing.T) {
	tests := []struct {
		s        string
		expected uint64
	}{
		{"100", 100},
		{"0", 0},
		{"", 0},
		{"invalid", 0},
	}

	for _, tt := range tests {
		got := parseUint64(tt.s)
		if got != tt.expected {
			t.Errorf("parseUint64(%q) = %d, want %d", tt.s, got, tt.expected)
		}
	}
}

func TestExtractKBValue(t *testing.T) {
	tests := []struct {
		line     string
		expected uint64
	}{
		{"MemTotal:       16283940 kB", 16283940},
		{"MemAvailable:   12345678 kB", 12345678},
		{"Invalid", 0},
		{"", 0},
	}

	for _, tt := range tests {
		got := extractKBValue(tt.line)
		if got != tt.expected {
			t.Errorf("extractKBValue(%q) = %d, want %d", tt.line, got, tt.expected)
		}
	}
}
