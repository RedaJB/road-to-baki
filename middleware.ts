import { NextResponse, type NextRequest } from 'next/server';

/** Les outils internes (/dev-3d, /dev-ads, /dev-portraits) ne sont pas publiés en production */
export function middleware(_req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEV_PAGES !== '1') {
    return new NextResponse('Page introuvable', { status: 404 });
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dev-3d/:path*', '/dev-ads/:path*', '/dev-portraits/:path*'] };
