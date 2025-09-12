// Main middleware to integrate rate limiting with Next.js
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from './rateLimit';

export function middleware(request: NextRequest) {
  // Apply rate limiting only to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const rateLimitResponse = rateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
