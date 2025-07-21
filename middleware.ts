import { createClient } from '@/utils/supabase/middleware';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);

  // Refresh session if expired - required for Server Components
  const { data: { session } } = await supabase.auth.getSession();

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/profile', '/settings'];
  
  // Auth routes that should redirect if already authenticated
  const authRoutes = ['/login', '/signup'];

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if the current path is an auth route
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  );

  // If user is not authenticated and trying to access protected route
  if (isProtectedRoute && !session) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // If user is authenticated and trying to access auth routes
  if (isAuthRoute && session) {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
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
