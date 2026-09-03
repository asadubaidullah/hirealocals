import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isThingsToDoEligible } from '@/lib/things-to-do';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.endsWith('/things-to-do')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 3 && parts[2] === 'things-to-do') {
      const citySlug = parts[1];
      if (!isThingsToDoEligible(citySlug)) {
        return NextResponse.rewrite(new URL('/_not-found', request.url), {
          status: 404,
        });
      }
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/:country/:city/things-to-do'],
};
