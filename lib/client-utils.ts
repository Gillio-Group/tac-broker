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
  if (!session?.access_token) {
    throw new Error('No valid session found. Please log in first.');
  }
  
  // Add the authorization header
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  
  // Make the request
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle authentication errors
  if (response.status === 401) {
    throw new Error('Your session has expired. Please log in again.');
  }

  return response;
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
  
  // Parse the JSON response
  const data = await response.json();
  
  // If the response is not ok, throw an error with the error message from the API
  if (!response.ok) {
    throw new Error(data.error || 'An error occurred while making the request');
  }
  
  return data as T;
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