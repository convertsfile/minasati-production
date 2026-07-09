import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8000';

/**
 * Readiness probe — the process is up AND its critical dependency
 * (the Laravel API) is reachable. Used by orchestrators to decide
 * whether to send traffic to this instance.
 *
 * Pings `${API_URL}/api/health` with a 3-second timeout. If the
 * backend responds 2xx we return 200 ready; otherwise 503 not ready
 * with a structured error payload so the operator can see why.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const READINESS_TIMEOUT_MS = 3000;

interface BackendHealthPayload {
  status?: string;
  [key: string]: unknown;
}

async function probeBackend(): Promise<{ ok: boolean; status: number; body: BackendHealthPayload | null; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), READINESS_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}/api/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    let body: BackendHealthPayload | null = null;
    try {
      body = (await res.json()) as BackendHealthPayload;
    } catch {
      body = null;
    }

    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    clearTimeout(timeoutId);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, status: 0, body: null, error: message };
  }
}

export async function GET() {
  const probe = await probeBackend();

  if (probe.ok) {
    return NextResponse.json(
      {
        status: 'ok',
        service: 'minassati-frontend',
        check: 'readiness',
        upstream: {
          url: API_URL,
          reachable: true,
          status: probe.status,
        },
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }

  return NextResponse.json(
    {
      status: 'degraded',
      service: 'minassati-frontend',
      check: 'readiness',
      upstream: {
        url: API_URL,
        reachable: false,
        status: probe.status,
        error: probe.error,
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
  );
}
