import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/api/auth'];

  // Check if the current path is public
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check for session cookie to determine authentication
  const sessionCookie = req.cookies.get('authjs.session-token') || req.cookies.get('__Secure-authjs.session-token');

  // Redirect unauthenticated users to sign-in
  if (!sessionCookie) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Allow authenticated users to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
