import { Session } from '@supabase/supabase-js';

/**
 * Makes an authenticated fetch request to the API using a provided session
 * @param url - The URL to fetch
 * @param session - The Supabase session object
 * @param options - Additional fetch options
 * @returns The fetch response
 */
export async function authenticatedFetch(
  url: string,
  session: Session | null,
  options: RequestInit = {}
): Promise<Response> {
  if (!session) {
    throw new Error('User not authenticated with Supabase. Please log in first.');
  }
  
  // Add the authorization header
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  
  // Make the request
  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Makes an authenticated fetch request and parses the JSON response
 * @param url - The URL to fetch
 * @param session - The Supabase session object
 * @param options - Additional fetch options
 * @returns The parsed JSON response
 */
export async function authenticatedFetchJson<T>(
  url: string,
  session: Session | null,
  options: RequestInit = {}
): Promise<T> {
  const response = await authenticatedFetch(url, session, options);
  return response.json() as Promise<T>;
}

/**
 * AUTHENTICATION SOLUTION DOCUMENTATION
 * 
 * The application uses a multi-layered approach to manage authentication:
 * 
 * 1. SupabaseAuthProvider (components/providers/supabase-auth-provider.tsx)
 *    - Provides global auth state via React Context
 *    - Tracks session status and user information
 *    - Listens for auth state changes
 * 
 * 2. Middleware (middleware.ts)
 *    - Protects dashboard routes from unauthenticated access
 *    - Redirects to login page when needed
 *    - Provides appropriate redirects for already authenticated users
 * 
 * 3. Component-level Auth (using useAuth hook)
 *    - Components that need auth info use the useAuth() hook
 *    - Session token is available for API calls
 *    - Proper error handling when no auth is available
 * 
 * 4. Server-side Auth (API routes)
 *    - API routes validate the token from Authorization header
 *    - Direct Supabase client usage without cookie dependencies
 *    - Clean error responses for invalid/missing auth
 */ 