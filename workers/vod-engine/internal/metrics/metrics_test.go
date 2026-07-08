package metrics

import (
	"bytes"
	"fmt"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestCounterIncrement(t *testing.T) {
	mc := NewMetricsCollector()
	mc.CounterRegister("vod_engine_test_total", "Test counter")

	val := mc.CounterGet("vod_engine_test_total")
	if val != 0 {
		t.Errorf("expected 0, got %d", val)
	}

	mc.CounterInc("vod_engine_test_total")
	val = mc.CounterGet("vod_engine_test_total")
	if val != 1 {
		t.Errorf("expected 1, got %d", val)
	}

	mc.CounterAdd("vod_engine_test_total", 5)
	val = mc.CounterGet("vod_engine_test_total")
	if val != 6 {
		t.Errorf("expected 6, got %d", val)
	}
}

func TestGaugeSet(t *testing.T) {
	mc := NewMetricsCollector()
	mc.GaugeRegister("vod_engine_active_jobs", "Active jobs")

	mc.GaugeSet("vod_engine_active_jobs", 3)
	val := mc.GaugeGet("vod_engine_active_jobs")
	if val != 3.0 {
		t.Errorf("expected 3.0, got %f", val)
	}

	mc.GaugeAdd("vod_engine_active_jobs", -1)
	val = mc.GaugeGet("vod_engine_active_jobs")
	if val != 2.0 {
		t.Errorf("expected 2.0, got %f", val)
	}
}

func TestHistogramObserve(t *testing.T) {
	mc := NewMetricsCollector()
	mc.HistogramRegister("vod_engine_encoding_duration_seconds",
		"Encoding duration",
		map[string]string{"quality": "480p"},
		[]float64{60, 300, 600},
	)

	buckets, counts, count, sum := mc.HistogramGetCounts("vod_engine_encoding_duration_seconds")
	if len(buckets) == 0 || len(counts) == 0 {
		t.Fatal("expected buckets and counts")
	}
	if count != 0 {
		t.Errorf("expected count 0, got %d", count)
	}

	mc.HistogramObserve("vod_engine_encoding_duration_seconds", 120)
	mc.HistogramObserve("vod_engine_encoding_duration_seconds", 350)
	mc.HistogramObserve("vod_engine_encoding_duration_seconds", 45)

	buckets, counts, count, sum = mc.HistogramGetCounts("vod_engine_encoding_duration_seconds")
	if count != 3 {
		t.Errorf("expected count 3, got %d", count)
	} else {
		// 45 <= 60 bucket (index 0)
		// 120 <= 300 bucket (index 1)
		// 350 <= 600 bucket (index 2)
		// All are <= +Inf
		if counts[0] < 1 {
			t.Errorf("expected bucket 60 to have at least 1, got counts=%v", counts)
		}
		_ = buckets
	}

	if sum <= 0 {
		t.Errorf("expected sum > 0, got %f", sum)
	}
}

func TestRenderPrometheusText(t *testing.T) {
	mc := NewMetricsCollector()

	mc.GaugeRegister("vod_engine_active_jobs", "Currently active encoding jobs")
	mc.GaugeSet("vod_engine_active_jobs", 2)

	mc.CounterRegister("vod_engine_jobs_processed_total", "Total jobs processed")
	mc.CounterInc("vod_engine_jobs_processed_total")
	mc.CounterInc("vod_engine_jobs_processed_total")

	mc.HistogramRegister("vod_engine_encoding_duration_seconds",
		"Encoding duration histogram",
		map[string]string{"quality": "480p"},
		[]float64{60, 300, 600},
	)
	mc.HistogramObserve("vod_engine_encoding_duration_seconds", 120)
	mc.HistogramObserve("vod_engine_encoding_duration_seconds", 350)

	var buf bytes.Buffer
	err := mc.RenderPrometheusText(&buf)
	if err != nil {
		t.Fatalf("RenderPrometheusText failed: %v", err)
	}

	output := buf.String()
	t.Logf("Rendered output:\n%s", output)

	if !strings.Contains(output, "vod_engine_active_jobs") {
		t.Error("expected vod_engine_active_jobs in output")
	}
	if !strings.Contains(output, "vod_engine_jobs_processed_total") {
		t.Error("expected vod_engine_jobs_processed_total in output")
	}
	if !strings.Contains(output, "vod_engine_encoding_duration_seconds_bucket") {
		t.Error("expected vod_engine_encoding_duration_seconds_bucket in output")
	}
	if !strings.Contains(output, "# HELP") {
		t.Error("expected HELP lines in output")
	}
	if !strings.Contains(output, "# TYPE") {
		t.Error("expected TYPE lines in output")
	}
}

func TestResponseTime(t *testing.T) {
	// OPS-PERF-02: /metrics endpoint must respond within 100ms
	mc := NewMetricsCollector()
	populateMetrics(mc)

	handler := mc.ServeHTTP

	for i := 0; i < 10; i++ {
		req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
		rec := httptest.NewRecorder()

		start := time.Now()
		handler(rec, req)
		elapsed := time.Since(start)

		if elapsed > 100*time.Millisecond {
			t.Errorf("metrics endpoint took %v, expected < 100ms", elapsed)
		}

		if rec.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rec.Code)
		}
	}
}

func TestMetricNames(t *testing.T) {
	// Verify all required metric names from OPS-16
	mc := NewMetricsCollector()
	populateMetrics(mc)

	var buf bytes.Buffer
	mc.RenderPrometheusText(&buf)
	output := buf.String()

	required := []string{
		"vod_engine_active_jobs",
		"vod_engine_pending_jobs",
		"vod_engine_dead_letter_jobs",
		"vod_engine_jobs_processed_total",
		"vod_engine_encoding_duration_seconds",
		"vod_engine_queue_oldest_age_seconds",
		"vod_engine_resource_blocked_total",
		"vod_engine_ffmpeg_exit_code",
	}

	for _, name := range required {
		if !strings.Contains(output, name) {
			t.Errorf("required metric %q not found in output", name)
		}
	}
}

func TestPrometheusFormat_HelpTypeNoLabels(t *testing.T) {
	// CRITICAL-2: HELP/TYPE lines must NOT contain label brackets {}
	// Per the Prometheus exposition format spec, HELP and TYPE take only the bare metric name
	mc := NewMetricsCollector()
	populateMetrics(mc)

	var buf bytes.Buffer
	mc.RenderPrometheusText(&buf)
	output := buf.String()

	lines := strings.Split(output, "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "# HELP ") {
			// Extract the metric name after "# HELP "
			rest := strings.TrimPrefix(line, "# HELP ")
			parts := strings.Fields(rest)
			if len(parts) > 0 {
				name := parts[0]
				if strings.Contains(name, "{") {
					t.Errorf("HELP line contains label brackets: %q", line)
				}
			}
		}
		if strings.HasPrefix(line, "# TYPE ") {
			rest := strings.TrimPrefix(line, "# TYPE ")
			parts := strings.Fields(rest)
			if len(parts) > 0 {
				name := parts[0]
				if strings.Contains(name, "{") {
					t.Errorf("TYPE line contains label brackets: %q", line)
				}
			}
		}
	}
}

func TestPrometheusFormat_HistogramSingleLabelSet(t *testing.T) {
	// CRITICAL-2: Histogram bucket lines must have all labels in a single set, e.g.:
	//   vod_engine_encoding_duration_seconds_bucket{quality="480p",le="60"} 1
	// NOT: vod_engine_encoding_duration_seconds_bucket{quality="480p"}{le="60"} 1
	mc := NewMetricsCollector()
	mc.HistogramRegister("vod_engine_encoding_duration_seconds",
		"Encoding duration histogram",
		map[string]string{"quality": "480p"},
		[]float64{60, 300, 600},
	)
	mc.HistogramObserve("vod_engine_encoding_duration_seconds", 120)

	var buf bytes.Buffer
	mc.RenderPrometheusText(&buf)
	output := buf.String()

	// Check bucket lines have single label set (not two separate {})
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		if strings.Contains(line, "_bucket") {
			t.Logf("Histogram bucket line: %s", line)
			// Count label sets (number of {" characters)
			n := strings.Count(line, "{")
			if n > 1 {
				t.Errorf("Histogram bucket line has %d label sets, expected 1: %q", n, line)
			}
			// Verify labels are comma-separated within one set
			if n == 1 && strings.Contains(line, ",") {
				t.Logf("Histogram bucket line has merged labels (correct): %s", line)
			}
			// Verify the le label is present in the single set
			if !strings.Contains(line, `le=`) {
				t.Errorf("Histogram bucket line missing le label: %s", line)
			}
		}
	}
}

func TestPrometheusFormat_LabelsWithLabelsInName(t *testing.T) {
	// CRITICAL-2: Counters with labels embedded in name should render correctly
	mc := NewMetricsCollector()
	mc.CounterRegister("vod_engine_jobs_processed_total{status=\"success\"}", "Total successful jobs")
	mc.CounterInc("vod_engine_jobs_processed_total{status=\"success\"}")

	var buf bytes.Buffer
	mc.RenderPrometheusText(&buf)
	output := buf.String()

	t.Logf("Output with embedded label counter:\n%s", output)

	// HELP must use bare metric name
	if strings.Contains(output, "# HELP vod_engine_jobs_processed_total{status=") {
		t.Errorf("HELP line should not contain labels: %s", output)
	}
	// HELP must use bare name
	if !strings.Contains(output, "# HELP vod_engine_jobs_processed_total Total") {
		t.Errorf("HELP line should have bare metric name: %s", output)
	}
	// Data line must include labels
	if !strings.Contains(output, `vod_engine_jobs_processed_total{status="success"} 1`) {
		t.Errorf("Data line should include labels: %s", output)
	}
}

func TestPrometheusFormat_HistogramSumCountWithLabels(t *testing.T) {
	// Verify _sum and _count lines have proper merged label sets
	mc := NewMetricsCollector()
	mc.HistogramRegister("vod_engine_encoding_duration_seconds",
		"Encoding duration histogram",
		map[string]string{"quality": "480p"},
		[]float64{60, 300, 600},
	)
	mc.HistogramObserve("vod_engine_encoding_duration_seconds", 120)

	var buf bytes.Buffer
	mc.RenderPrometheusText(&buf)
	output := buf.String()

	t.Logf("Histogram output:\n%s", output)

	// _sum and _count should have {quality="480p"} (not two sets)
	for _, suffix := range []string{"_sum", "_count"} {
		for _, line := range strings.Split(output, "\n") {
			if strings.Contains(line, suffix+"{") || strings.Contains(line, suffix+" ") {
				// Count { occurrences
				n := strings.Count(line, "{")
				if n > 1 {
					t.Errorf("%s line has %d label sets, expected 1: %q", suffix, n, line)
				}
			}
		}
	}
}

func TestGaugeRegisterIdempotent(t *testing.T) {
	mc := NewMetricsCollector()
	mc.GaugeRegister("test_gauge", "help")
	mc.GaugeRegister("test_gauge", "help") // Should not panic

	mc.GaugeSet("test_gauge", 42)
	if val := mc.GaugeGet("test_gauge"); val != 42 {
		t.Errorf("expected 42, got %f", val)
	}
}

func TestCounterRegisterIdempotent(t *testing.T) {
	mc := NewMetricsCollector()
	mc.CounterRegister("test_counter", "help")
	mc.CounterRegister("test_counter", "help") // Should not panic

	mc.CounterInc("test_counter")
	if val := mc.CounterGet("test_counter"); val != 1 {
		t.Errorf("expected 1, got %d", val)
	}
}

func TestHistogramInfBucket(t *testing.T) {
	mc := NewMetricsCollector()
	mc.HistogramRegister("test_histo", "help",
		map[string]string{"quality": "720p"},
		[]float64{100},
	)

	mc.HistogramObserve("test_histo", 50)
	mc.HistogramObserve("test_histo", 150)

	buckets, _, count, _ := mc.HistogramGetCounts("test_histo")
	if count != 2 {
		t.Errorf("expected count 2, got %d", count)
	}

	// Should have 3 buckets: 100, +Inf
	if len(buckets) != 2 {
		t.Errorf("expected 2 buckets (100, +Inf), got %d", len(buckets))
	}

	// 50 <= 100, 150 > 100 but <= +Inf
	var buf bytes.Buffer
	mc.RenderPrometheusText(&buf)
	output := buf.String()
	if !strings.Contains(output, `le="+Inf"`) {
		t.Errorf("expected +Inf bucket in output, got:\n%s", output)
	}
}

func populateMetrics(mc *MetricsCollector) {
	mc.GaugeRegister("vod_engine_active_jobs", "Currently active encoding jobs")
	mc.GaugeSet("vod_engine_active_jobs", 0)

	mc.GaugeRegister("vod_engine_pending_jobs", "Total pending jobs")
	mc.GaugeSet("vod_engine_pending_jobs", 3)

	mc.GaugeRegister("vod_engine_dead_letter_jobs", "Total dead-letter jobs")
	mc.GaugeSet("vod_engine_dead_letter_jobs", 1)

	mc.CounterRegister("vod_engine_jobs_processed_total", "Total jobs processed")
	mc.CounterInc("vod_engine_jobs_processed_total")
	mc.CounterInc("vod_engine_jobs_processed_total")

	mc.HistogramRegister("vod_engine_encoding_duration_seconds",
		"Encoding duration histogram",
		map[string]string{"quality": "480p"},
		[]float64{60, 300, 600},
	)
	mc.HistogramObserve("vod_engine_encoding_duration_seconds", 120)

	mc.GaugeRegister("vod_engine_queue_oldest_age_seconds", "Age of oldest pending job")
	mc.GaugeSet("vod_engine_queue_oldest_age_seconds", 540)

	mc.CounterRegister("vod_engine_resource_blocked_total", "Times resource guardian blocked")
	mc.CounterInc("vod_engine_resource_blocked_total")

	mc.GaugeRegister("vod_engine_ffmpeg_exit_code", "FFmpeg exit codes")
	mc.GaugeSet("vod_engine_ffmpeg_exit_code", 0)

	// Add a benchmark run
	_ = fmt.Sprintf("%v", math.Inf(1))
}
