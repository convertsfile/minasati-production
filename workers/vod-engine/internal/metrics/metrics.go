package metrics

import (
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

// MetricType indicates the kind of metric.
type MetricType int

const (
	MetricGauge MetricType = iota
	MetricCounter
	MetricHistogram
)

// Metric describes a single Prometheus metric.
type Metric struct {
	Type   MetricType
	Name   string
	Help   string
	Value  float64
	Labels map[string]string
	// For histograms
	Buckets []float64
	Counts  []uint64
	Sum     float64
}

// histogramData holds the state for an individual histogram.
type histogramData struct {
	buckets []float64
	counts  []uint64
	sum     float64
	count   uint64
}

// MetricsCollector aggregates counters, gauges, and histograms
// and renders them as Prometheus text format.
type MetricsCollector struct {
	mu           sync.RWMutex
	gauges       map[string]float64
	gaugeHelps   map[string]string
	counters     map[string]uint64
	counterHelps map[string]string
	histograms   map[string]*histogramData
	histoHelps   map[string]string
	histoLabels  map[string]map[string]string // name → label set
}

// NewMetricsCollector creates a new metrics collector.
func NewMetricsCollector() *MetricsCollector {
	return &MetricsCollector{
		gauges:       make(map[string]float64),
		gaugeHelps:   make(map[string]string),
		counters:     make(map[string]uint64),
		counterHelps: make(map[string]string),
		histograms:   make(map[string]*histogramData),
		histoHelps:   make(map[string]string),
		histoLabels:  make(map[string]map[string]string),
	}
}

// --- Gauges ---

// GaugeRegister registers a gauge metric with a help string.
func (mc *MetricsCollector) GaugeRegister(name, help string) {
	mc.mu.Lock()
	defer mc.mu.Unlock()
	mc.gaugeHelps[name] = help
	if _, ok := mc.gauges[name]; !ok {
		mc.gauges[name] = 0
	}
}

// GaugeSet sets a gauge to a specific value.
func (mc *MetricsCollector) GaugeSet(name string, value float64) {
	mc.mu.Lock()
	defer mc.mu.Unlock()
	mc.gauges[name] = value
}

// GaugeAdd adds a delta to a gauge.
func (mc *MetricsCollector) GaugeAdd(name string, delta float64) {
	mc.mu.Lock()
	defer mc.mu.Unlock()
	mc.gauges[name] += delta
}

// GaugeGet returns the current value of a gauge.
func (mc *MetricsCollector) GaugeGet(name string) float64 {
	mc.mu.RLock()
	defer mc.mu.RUnlock()
	return mc.gauges[name]
}

// --- Counters ---

// CounterRegister registers a counter metric with a help string.
func (mc *MetricsCollector) CounterRegister(name, help string) {
	mc.mu.Lock()
	defer mc.mu.Unlock()
	mc.counterHelps[name] = help
	if _, ok := mc.counters[name]; !ok {
		mc.counters[name] = 0
	}
}

// CounterInc increments a counter by 1.
func (mc *MetricsCollector) CounterInc(name string) {
	mc.mu.Lock()
	defer mc.mu.Unlock()
	mc.counters[name]++
}

// CounterAdd increments a counter by a delta.
func (mc *MetricsCollector) CounterAdd(name string, delta uint64) {
	mc.mu.Lock()
	defer mc.mu.Unlock()
	mc.counters[name] += delta
}

// CounterGet returns the current value of a counter.
func (mc *MetricsCollector) CounterGet(name string) uint64 {
	mc.mu.RLock()
	defer mc.mu.RUnlock()
	return mc.counters[name]
}

// --- Histograms ---

// HistogramRegister registers a histogram metric with a help string, label set, and bucket boundaries.
func (mc *MetricsCollector) HistogramRegister(name, help string, labels map[string]string, buckets []float64) {
	if len(buckets) == 0 {
		buckets = []float64{60, 300, 600, math.Inf(1)}
	}
	// Sort buckets and remove duplicates
	sort.Float64s(buckets)
	unique := make([]float64, 0, len(buckets))
	for i, b := range buckets {
		if i == 0 || b != buckets[i-1] {
			unique = append(unique, b)
		}
	}
	// Ensure +Inf is last
	if len(unique) == 0 || unique[len(unique)-1] != math.Inf(1) {
		unique = append(unique, math.Inf(1))
	}

	mc.mu.Lock()
	defer mc.mu.Unlock()
	mc.histoHelps[name] = help
	mc.histoLabels[name] = labels
	if _, ok := mc.histograms[name]; !ok {
		mc.histograms[name] = &histogramData{
			buckets: unique,
			counts:  make([]uint64, len(unique)),
		}
	}
}

// HistogramObserve records an observation in the histogram.
func (mc *MetricsCollector) HistogramObserve(name string, value float64) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	h, ok := mc.histograms[name]
	if !ok {
		return
	}
	h.sum += value
	h.count++
	for i, bucket := range h.buckets {
		if value <= bucket {
			h.counts[i]++
		}
	}
}

// HistogramGetCounts returns the bucket counts for a histogram.
func (mc *MetricsCollector) HistogramGetCounts(name string) ([]float64, []uint64, uint64, float64) {
	mc.mu.RLock()
	defer mc.mu.RUnlock()
	h, ok := mc.histograms[name]
	if !ok {
		return nil, nil, 0, 0
	}
	return h.buckets, h.counts, h.count, h.sum
}

// --- Prometheus Helpers ---

// metricBaseName returns the bare metric name without any label portion.
// Examples:
//
//	"vod_engine_jobs_processed_total{status=\"success\"}" -> "vod_engine_jobs_processed_total"
//	"vod_engine_active_jobs" -> "vod_engine_active_jobs"
func metricBaseName(name string) string {
	if idx := strings.IndexByte(name, '{'); idx >= 0 {
		return name[:idx]
	}
	return name
}

// FormatLabels formats a label map as a Prometheus label set.
// Returns "" for empty labels, or "{key1=\"val1\",key2=\"val2\"}" otherwise.
// Keys are sorted for deterministic output.
func FormatLabels(labels map[string]string) string {
	if len(labels) == 0 {
		return ""
	}
	keys := make([]string, 0, len(labels))
	for k := range labels {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	pairs := make([]string, 0, len(keys))
	for _, k := range keys {
		pairs = append(pairs, fmt.Sprintf("%s=%q", k, labels[k]))
	}
	return "{" + strings.Join(pairs, ",") + "}"
}

// --- Rendering ---

// renderMetrics writes all collected metrics in valid Prometheus exposition format.
// The common rendering logic used by both ServeHTTP and RenderPrometheusText.
func (mc *MetricsCollector) renderMetrics(w io.Writer) {
	// Render gauges (deduplicate HELP/TYPE per base metric name — OPS-16)
	gaugeHelpEmitted := make(map[string]bool)
	for name, value := range mc.gauges {
		baseName := metricBaseName(name)
		if !gaugeHelpEmitted[baseName] {
			if help, ok := mc.gaugeHelps[baseName]; ok && help != "" {
				fmt.Fprintf(w, "# HELP %s %s\n", baseName, help)
				fmt.Fprintf(w, "# TYPE %s gauge\n", baseName)
				gaugeHelpEmitted[baseName] = true
			}
		}
		fmt.Fprintf(w, "%s %v\n", name, value)
	}

	// Render counters (deduplicate HELP/TYPE per base metric name — OPS-16)
	counterHelpEmitted := make(map[string]bool)
	for name, value := range mc.counters {
		baseName := metricBaseName(name)
		if !counterHelpEmitted[baseName] {
			if help, ok := mc.counterHelps[name]; ok && help != "" {
				fmt.Fprintf(w, "# HELP %s %s\n", baseName, help)
				fmt.Fprintf(w, "# TYPE %s counter\n", baseName)
				counterHelpEmitted[baseName] = true
			}
		}
		fmt.Fprintf(w, "%s %d\n", name, value)
	}

	// Render histograms
	for name, h := range mc.histograms {
		baseName := metricBaseName(name)

		if help, ok := mc.histoHelps[name]; ok && help != "" {
			fmt.Fprintf(w, "# HELP %s %s\n", baseName, help)
			fmt.Fprintf(w, "# TYPE %s histogram\n", baseName)
		}

		labels := mc.histoLabels[name]

		for i, bucket := range h.buckets {
			le := fmt.Sprintf("%.0f", bucket)
			if math.IsInf(bucket, 1) {
				le = "+Inf"
			}

			// Merge histogram's fixed labels with the le label into a single set
			merged := make(map[string]string, len(labels)+1)
			for k, v := range labels {
				merged[k] = v
			}
			merged["le"] = le

			fmt.Fprintf(w, "%s_bucket%s %d\n", baseName, FormatLabels(merged), h.counts[i])
		}

		fmt.Fprintf(w, "%s_sum%s %f\n", baseName, FormatLabels(labels), h.sum)
		fmt.Fprintf(w, "%s_count%s %d\n", baseName, FormatLabels(labels), h.count)
	}
}

// ServeHTTP implements http.Handler for the /metrics endpoint.
func (mc *MetricsCollector) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	start := time.Now()

	mc.mu.RLock()
	defer mc.mu.RUnlock()

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")

	mc.renderMetrics(w)

	elapsed := time.Since(start)
	if elapsed > 100*time.Millisecond {
		slog.Warn("Metrics endpoint slow response", "elapsed_ms", elapsed.Milliseconds())
	}
}

// RenderPrometheusText renders all metrics as valid Prometheus text format to the given writer.
// Can be used as an alternative to ServeHTTP for manual rendering.
func (mc *MetricsCollector) RenderPrometheusText(w io.Writer) error {
	mc.mu.RLock()
	defer mc.mu.RUnlock()

	mc.renderMetrics(w)

	return nil
}
