import { NextResponse } from 'next/server';
import { getDatabaseStatusReport } from '@/lib/db';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function GET(request: Request) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`db_status:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const report = await getDatabaseStatusReport();
  return NextResponse.json(report, {
    status: report.ok ? 200 : 503,
    headers: NO_STORE_HEADERS,
  });
}
