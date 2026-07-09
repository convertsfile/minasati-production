import { NextResponse } from 'next/server';

/**
 * Liveness probe — the process is up and the Next.js runtime is
 * serving traffic. Intentionally lightweight: no external calls,
 * no DB. Used by Kubernetes/load-balancers to decide when to
 * restart a hung instance.
 *
 * Returns 200 with `{ status: "ok" }` JSON.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'minassati-frontend',
      check: 'liveness',
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
