import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_ROUTES = ['/admin', '/customer', '/technician', '/sub-admin'];
const PUBLIC_ROUTES = ['/login', '/select-role'];
const SESSION_COOKIE = '__session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login/select-role to their dashboard
  if (isPublic && sessionToken) {
    // Don't redirect from select-role — user may need to pick a role
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/select-role', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/customer/:path*',
    '/technician/:path*',
    '/sub-admin/:path*',
    '/login',
    '/select-role',
  ],
};
