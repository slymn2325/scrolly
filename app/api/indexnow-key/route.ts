import { NextResponse } from 'next/server';
import { getConfiguredIndexNowKey } from '@/lib/indexNow';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const configuredKey = getConfiguredIndexNowKey();
  if (!configuredKey) {
    return new NextResponse('IndexNow key not configured', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }

  const url = new URL(request.url);
  const requestedKey = url.searchParams.get('requestedKey');
  if (requestedKey && requestedKey !== configuredKey) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }

  return new NextResponse(configuredKey, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
