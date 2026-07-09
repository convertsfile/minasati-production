<?php

namespace App\Services\Metrics;

use RuntimeException;

/**
 * In-process metrics registry emitting the Prometheus text exposition
 * format. Designed to be API-compatible with the metrics operators
 * expect (counter, gauge, histogram) but kept dependency-free so it
 * works without a Composer network install.
 *
 * RELIABILITY-MAJOR-02: a metrics endpoint was missing entirely from
 * the Laravel app. Operators had no way to see request rate, p95, DB
 * pool, queue backlog, failed jobs, or webhook callouts. This
 * registry is the foundation of the new /metrics endpoint.
 *
 * Storage: per-process. For multi-process deployments (PHP-FPM with
 * N workers) each worker has its own registry; aggregators should
 * treat the scrape as one of N. That's the standard pattern for
 * in-process exporters (the Go VOD engine does the same).
 */
class MetricsRegistry
{
    /** @var array<string, array{help: string, type: string, samples: array<int, array{labels: array<string,string>, value: float}>}> */
    private array $counters = [];

    /** @var array<string, array{help: string, type: string, samples: array<int, array{labels: array<string,string>, value: float}>}> */
    private array $gauges = [];

    /** @var array<string, array{help: string, type: string, buckets: array<int,float>, sums: array<int, array{labels: array<string,string>, value: float}>, counts: array<int, array{labels: array<string,string>, value: int}>, observations: array<int, array{labels: array<string,string>, value: float, bucket: float}>}> */
    private array $histograms = [];

    public function counterInc(string $name, array $labels = [], float $value = 1.0, string $help = ''): void
    {
        $this->ensureValidName($name);
        if (!isset($this->counters[$name])) {
            $this->counters[$name] = ['help' => $help, 'type' => 'counter', 'samples' => []];
        }
        $this->counters[$name]['samples'][] = [
            'labels' => $this->normalizeLabels($labels),
            'value' => $value,
        ];
    }

    public function gaugeSet(string $name, float $value, array $labels = [], string $help = ''): void
    {
        $this->ensureValidName($name);
        if (!isset($this->gauges[$name])) {
            $this->gauges[$name] = ['help' => $help, 'type' => 'gauge', 'samples' => []];
        }
        // Overwrite by label-set so the gauge always reflects the
        // latest value for that label combination.
        $key = $this->labelKey($labels);
        $existingIdx = null;
        foreach ($this->gauges[$name]['samples'] as $i => $sample) {
            if ($this->labelKey($sample['labels']) === $key) {
                $existingIdx = $i;
                break;
            }
        }
        $entry = [
            'labels' => $this->normalizeLabels($labels),
            'value' => $value,
        ];
        if ($existingIdx === null) {
            $this->gauges[$name]['samples'][] = $entry;
        } else {
            $this->gauges[$name]['samples'][$existingIdx] = $entry;
        }
    }

    /**
     * @param  array<int, float>  $buckets  Bucket upper bounds in seconds (or whatever unit you want).
     */
    public function histogramObserve(string $name, float $value, array $buckets, array $labels = [], string $help = ''): void
    {
        $this->ensureValidName($name);
        if (!isset($this->histograms[$name])) {
            sort($buckets);
            $this->histograms[$name] = [
                'help' => $help,
                'type' => 'histogram',
                'buckets' => $buckets,
                'sums' => [],
                'counts' => [],
                'observations' => [],
            ];
        }

        $key = $this->labelKey($labels);
        $existingIdx = null;
        foreach ($this->histograms[$name]['sums'] as $i => $sum) {
            if ($this->labelKey($sum['labels']) === $key) {
                $existingIdx = $i;
                break;
            }
        }
        if ($existingIdx === null) {
            $existingIdx = count($this->histograms[$name]['sums']);
            $this->histograms[$name]['sums'][] = ['labels' => $this->normalizeLabels($labels), 'value' => 0.0];
            $this->histograms[$name]['counts'][] = ['labels' => $this->normalizeLabels($labels), 'value' => 0];
        }
        $this->histograms[$name]['sums'][$existingIdx]['value'] += $value;
        $this->histograms[$name]['counts'][$existingIdx]['value']++;
        $this->histograms[$name]['observations'][] = [
            'labels' => $this->normalizeLabels($labels),
            'value' => $value,
        ];
    }

    /**
     * Emit the Prometheus text exposition format. Each metric family
     * gets one HELP and one TYPE line, followed by one line per
     * sample (or per bucket for histograms).
     */
    public function render(): string
    {
        $out = '';

        // Counters
        foreach ($this->counters as $name => $def) {
            $out .= "# HELP {$name} {$def['help']}\n";
            $out .= "# TYPE {$name} {$def['type']}\n";
            foreach ($def['samples'] as $sample) {
                $out .= $name . $this->renderLabels($sample['labels']) . ' ' . $this->formatValue($sample['value']) . "\n";
            }
        }

        // Gauges
        foreach ($this->gauges as $name => $def) {
            $out .= "# HELP {$name} {$def['help']}\n";
            $out .= "# TYPE {$name} {$def['type']}\n";
            foreach ($def['samples'] as $sample) {
                $out .= $name . $this->renderLabels($sample['labels']) . ' ' . $this->formatValue($sample['value']) . "\n";
            }
        }

        // Histograms (Prometheus convention: bucket=le, _count, _sum).
        foreach ($this->histograms as $name => $def) {
            $out .= "# HELP {$name} {$def['help']}\n";
            $out .= "# TYPE {$name} {$def['type']}\n";
            // Group observations by label set
            $byLabels = [];
            foreach ($def['observations'] as $obs) {
                $key = $this->labelKey($obs['labels']);
                $byLabels[$key][] = $obs['value'];
            }
            foreach ($def['sums'] as $i => $sum) {
                $key = $this->labelKey($sum['labels']);
                $observations = $byLabels[$key] ?? [];
                $count = count($observations);
                foreach ($def['buckets'] as $bucket) {
                    $bucketCount = 0;
                    foreach ($observations as $v) {
                        if ($v <= $bucket) {
                            $bucketCount++;
                        }
                    }
                    $bucketLabels = $sum['labels'] + ['le' => (string) $bucket];
                    $out .= $name . '_bucket' . $this->renderLabels($bucketLabels) . ' ' . $bucketCount . "\n";
                }
                // +Inf bucket
                $infLabels = $sum['labels'] + ['le' => '+Inf'];
                $out .= $name . '_bucket' . $this->renderLabels($infLabels) . ' ' . $count . "\n";
                // _sum and _count
                $out .= $name . '_sum' . $this->renderLabels($sum['labels']) . ' ' . $this->formatValue($sum['value']) . "\n";
                $out .= $name . '_count' . $this->renderLabels($sum['labels']) . ' ' . $def['counts'][$i]['value'] . "\n";
            }
        }

        return $out;
    }

    /**
     * Reset all metrics. Used by tests.
     */
    public function reset(): void
    {
        $this->counters = [];
        $this->gauges = [];
        $this->histograms = [];
    }

    /**
     * Validate a metric name conforms to Prometheus conventions:
     * [a-zA-Z_:][a-zA-Z0-9_:]*
     */
    private function ensureValidName(string $name): void
    {
        if (!preg_match('/^[a-zA-Z_:][a-zA-Z0-9_:]*$/', $name)) {
            throw new RuntimeException("Invalid metric name: {$name}");
        }
    }

    private function normalizeLabels(array $labels): array
    {
        // Sort by key for stable rendering / matching.
        ksort($labels);
        return $labels;
    }

    private function labelKey(array $labels): string
    {
        ksort($labels);
        $parts = [];
        foreach ($labels as $k => $v) {
            $parts[] = $k . '=' . $v;
        }
        return implode('&', $parts);
    }

    private function renderLabels(array $labels): string
    {
        if (empty($labels)) {
            return '';
        }
        $parts = [];
        foreach ($labels as $k => $v) {
            $escaped = str_replace(['\\', '"', "\n"], ['\\\\', '\\"', '\\n'], (string) $v);
            $parts[] = $k . '="' . $escaped . '"';
        }
        return '{' . implode(',', $parts) . '}';
    }

    private function formatValue(float $value): string
    {
        // Match Prometheus's "1" / "1.5" / "1.5e3" style.
        if ((float) (int) $value === $value && abs($value) < 1e15) {
            return (string) (int) $value;
        }
        return rtrim(rtrim(sprintf('%.6f', $value), '0'), '.');
    }
}
