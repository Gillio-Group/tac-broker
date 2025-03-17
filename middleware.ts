import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Create a response object that we can modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Log the request path for debugging
  console.log('Middleware processing path:', request.nextUrl.pathname);
  
  // Log cookies for debugging
  console.log('Request cookies:', Array.from(request.cookies.getAll()).map(c => c.name));

  // Create a Supabase client for auth
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name);
          console.log(`Getting cookie ${name}:`, !!cookie);
          return cookie?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          console.log(`Setting cookie ${name}`);
          // Set cookie on the request
          request.cookies.set({
            name,
            value,
            ...options,
          });
          
          // Set cookie on the response
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          console.log(`Removing cookie ${name}`);
          // Remove cookie from the request
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          
          // Remove cookie from the response
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Get the user's session
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Session in middleware:', !!session);

  // If no session and trying to access protected route, redirect to login
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    console.log('No session, redirecting to login');
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If session exists and trying to access auth routes, redirect to dashboard
  if (session && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    console.log('Session exists, redirecting to dashboard');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // For API routes, ensure the auth header is set if we have a session
  if (session && request.nextUrl.pathname.startsWith('/api/')) {
    console.log('Setting auth header for API route');
    // Clone the headers
    const requestHeaders = new Headers(request.headers);
    // Add the session token as a header
    requestHeaders.set('x-supabase-auth', session.access_token);
    
    // Create a new request with the updated headers
    const newRequest = new Request(request.url, {
      headers: requestHeaders,
      method: request.method,
      body: request.body,
      redirect: request.redirect,
      signal: request.signal,
    });
    
    // Return a new response with the updated request
    return NextResponse.next({
      request: newRequest,
    });
  }

  return response;
}

// Only run middleware on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};