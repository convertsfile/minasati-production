import { NextResponse } from 'next/server';

/**
 * Prometheus text-format metrics endpoint. Exposes the standard
 * process / Node.js runtime metrics that Prometheus scrape jobs
 * expect (`# HELP` / `# TYPE` lines + samples).
 *
 * In production this would typically be wired to prom-client for
 * rich application metrics (HTTP request histograms, RUM, etc.).
 * For this Next.js App Router service the runtime + process
 * metrics are the minimum a scraper needs to chart basic health.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface GaugeSample {
  name: string;
  help: string;
  type: 'gauge' | 'counter';
  value: number;
}

function readProcessMetrics(): GaugeSample[] {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();
  const uptime = process.uptime();

  return [
    { name: 'process_resident_memory_bytes', help: 'Resident memory size in bytes', type: 'gauge', value: mem.rss },
    { name: 'process_heap_bytes', help: 'V8 heap used in bytes', type: 'gauge', value: mem.heapUsed },
    { name: 'process_heap_total_bytes', help: 'V8 heap total allocated in bytes', type: 'gauge', value: mem.heapTotal },
    { name: 'process_external_memory_bytes', help: 'External memory used in bytes', type: 'gauge', value: mem.external },
    { name: 'process_cpu_user_seconds_total', help: 'Total user CPU time spent in seconds', type: 'counter', value: cpu.user / 1_000_000 },
    { name: 'process_cpu_system_seconds_total', help: 'Total system CPU time spent in seconds', type: 'counter', value: cpu.system / 1_000_000 },
    { name: 'process_uptime_seconds', help: 'Process uptime in seconds', type: 'gauge', value: uptime },
  ];
}

function readRuntimeMetrics(): GaugeSample[] {
  const nodeVersion = process.versions.node ?? 'unknown';
  // Encode the node version in a label-friendly way: only emit a
  // 1-gauge for the major version to keep the exposition simple.
  const major = Number.parseInt(nodeVersion.split('.')[0] ?? '0', 10);

  return [
    { name: 'nodejs_version_info', help: 'Node.js major version (value is always 1, encoded in the label)', type: 'gauge', value: 1 },
    // Surface the major version as a sample on its own gauge so it
    // shows up on a chart even without label-aware tooling.
    { name: 'nodejs_major_version', help: 'Node.js major version number', type: 'gauge', value: Number.isFinite(major) ? major : 0 },
  ];
}

function formatPrometheus(samples: GaugeSample[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];

  for (const sample of samples) {
    if (!seen.has(sample.name)) {
      seen.add(sample.name);
      lines.push(`# HELP ${sample.name} ${sample.help}`);
      lines.push(`# TYPE ${sample.name} ${sample.type}`);
    }
    lines.push(`${sample.name} ${sample.value}`);
  }

  // Static service identifier so dashboards can group by service.
  lines.push('# HELP service_info Service identity');
  lines.push('# TYPE service_info gauge');
  lines.push('service_info{service="minassati-frontend",runtime="nodejs"} 1');

  return lines.join('\n') + '\n';
}

export async function GET() {
  const samples = [...readProcessMetrics(), ...readRuntimeMetrics()];
  const body = formatPrometheus(samples);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
