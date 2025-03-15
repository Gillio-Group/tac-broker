import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// For client-side auth, we don't need complex middleware
export function middleware(req: NextRequest) {
  // Create a response that just passes through
  const res = NextResponse.next();
  
  // Return the response unmodified
  return res;
}

// Only run middleware on specific paths where needed
export const config = {
  matcher: [
    // Only on public API routes that need protection
    '/api/gunbroker/:path*'
  ],
}; 