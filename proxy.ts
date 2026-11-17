import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function languageForRequest(request: NextRequest): 'en' | 'tr' | null {
  const { pathname } = request.nextUrl;
  if (pathname === '/en' || pathname.startsWith('/en/')) return 'en';
  const raw = request.nextUrl.searchParams.get('lang');
  if (raw === 'en' || raw === 'tr') return raw;
  return null;
}

export function proxy(request: NextRequest) {
  const lang = languageForRequest(request);
  const requestHeaders = new Headers(request.headers);
  if (lang) requestHeaders.set('x-scrolly-lang', lang);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (lang) response.headers.set('Content-Language', lang);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|api|.*\\..*).*)'],
};
