package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/a_ashraf_tech/vod-engine/internal/b2"
	"github.com/a_ashraf_tech/vod-engine/internal/config"
	"github.com/a_ashraf_tech/vod-engine/internal/monitor"
	"github.com/a_ashraf_tech/vod-engine/internal/queue"
	"github.com/a_ashraf_tech/vod-engine/internal/worker"
)

func newTestHealthHandler() *HealthHandler {
	cfg := &config.Config{
		Port:             "8080",
		MaxCPULoadAvg:    4.5,
		MinFreeRAMMB:     1536,
		MinFreeDiskGB:    15,
		MaxConcurrentJobs: 1,
		FFmpegPreset:     "medium",
		FFmpegThreads:    2,
		FFmpegNice:       15,
		MaxRetries:       3,
	}
	mon := monitor.New(5*time.Second, "/tmp/vod-engine")
	pq := queue.NewPriorityQueue()
	b2Client := &b2.Client{}
	persist, _ := queue.NewPersistence("/tmp/vod-engine-test/queue")
	s := worker.NewPool(cfg, b2Client, pq, persist)

	h := NewHealthHandler(cfg, s, mon)
	h.SetRecoveryComplete() // m-02: mark queue recovery as done so ready probe passes
	return h
}

func TestHealthLiveProbe(t *testing.T) {
	h := newTestHealthHandler()

	req := httptest.NewRequest(http.MethodGet, "/health?probe=live", nil)
	rec := httptest.NewRecorder()

	h.HandleHealth(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}

	var resp map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp["status"] != "alive" {
		t.Errorf("expected status 'alive', got %q", resp["status"])
	}
}

func TestHealthReadyProbe(t *testing.T) {
	h := newTestHealthHandler()

	req := httptest.NewRequest(http.MethodGet, "/health?probe=ready", nil)
	rec := httptest.NewRecorder()

	h.HandleHealth(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}

	var resp map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp["status"] != "ready" {
		t.Errorf("expected status 'ready', got %q", resp["status"])
	}
}

func TestHealthStartupProbe(t *testing.T) {
	h := newTestHealthHandler()

	req := httptest.NewRequest(http.MethodGet, "/health?probe=startup", nil)
	rec := httptest.NewRecorder()

	h.HandleHealth(rec, req)

	// Startup may return 503 if uptime < 10 seconds, or 200 if > 10 seconds
	// Both are acceptable — just verify we get a valid response
	if rec.Code != http.StatusOK && rec.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 200 or 503, got %d", rec.Code)
	}

	var resp map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp["status"] != "started" && resp["status"] != "starting" {
		t.Errorf("expected status 'started' or 'starting', got %q", resp["status"])
	}
}

func TestHealthDefault(t *testing.T) {
	h := newTestHealthHandler()

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	h.HandleHealth(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp["status"] == nil {
		t.Error("expected status field in response")
	}
	if resp["version"] != "2.0.0" {
		t.Errorf("expected version '2.0.0', got %v", resp["version"])
	}
	if resp["uptime_seconds"] == nil {
		t.Error("expected uptime_seconds field in response")
	}
	if resp["active_jobs"] == nil {
		t.Error("expected active_jobs field in response")
	}
	if resp["resources"] == nil {
		t.Error("expected resources field in response")
	}
}

func TestHealthDefaultResponseContainsResources(t *testing.T) {
	h := newTestHealthHandler()

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	h.HandleHealth(rec, req)

	var resp map[string]interface{}
	json.NewDecoder(rec.Body).Decode(&resp)

	resources, ok := resp["resources"].(map[string]interface{})
	if !ok {
		t.Fatal("expected resources to be a map")
	}

	// Check OPS-07 fields
	if _, ok := resources["nvme_temp_celsius"]; !ok {
		t.Error("expected nvme_temp_celsius in resources")
	}

	// Check OPS-13 fields
	if _, ok := resources["open_file_descriptors"]; !ok {
		t.Error("expected open_file_descriptors in resources")
	}
}

func TestHealthProbeInvalid(t *testing.T) {
	h := newTestHealthHandler()

	req := httptest.NewRequest(http.MethodGet, "/health?probe=invalid", nil)
	rec := httptest.NewRecorder()

	h.HandleHealth(rec, req)

	// Invalid probe should fall through to default health response
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}
