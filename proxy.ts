import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('lang');
  const lang = raw === 'en' ? 'en' : raw === 'tr' ? 'tr' : null;
  const requestHeaders = new Headers(request.headers);
  if (lang) requestHeaders.set('x-scrolly-lang', lang);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (lang) response.headers.set('Content-Language', lang);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|api|.*\\..*).*)'],
};
