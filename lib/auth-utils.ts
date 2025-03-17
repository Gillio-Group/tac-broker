import { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

/**
 * Utility functions for handling authentication with Supabase SSR
 * For Next.js 15 compatibility using cookie-based auth
 */

/**
 * Get the Supabase session using the client
 */
export async function getSession(): Promise<Session | null> {
  try {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    
    if (!session) {
      console.log('No session found');
      return null;
    }

    console.log('Found valid session');
    return session;
  } catch (error) {
    console.error('Error retrieving session:', error);
    return null;
  }
}

/**
 * Check if the session is valid
 */
export function isValidSession(session: any): session is Session {
  return (
    session &&
    typeof session === 'object' &&
    typeof session.access_token === 'string' &&
    typeof session.refresh_token === 'string' &&
    typeof session.expires_at === 'number' &&
    session.user &&
    typeof session.user.id === 'string' &&
    typeof session.user.email === 'string'
  );
}

/**
 * Get the access token from the session
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token || null;
}

/**
 * Check if the user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

// Legacy functions for backward compatibility - these will use the new methods internally
// but maintain the same function signatures for easier migration

/**
 * @deprecated Use getSession() instead
 */
export function getSessionFromLocalStorage(): Session | null {
  console.warn('getSessionFromLocalStorage is deprecated. Use getSession() instead');
  // Return null synchronously - callers should migrate to the async version
  return null;
}

/**
 * @deprecated No longer needed with cookie-based auth
 */
export function saveSessionToLocalStorage(session: Session | null): void {
  console.warn('saveSessionToLocalStorage is deprecated. Sessions are now managed via cookies');
}

/**
 * @deprecated No longer needed with cookie-based auth
 */
export function clearSessionFromLocalStorage(): void {
  console.warn('clearSessionFromLocalStorage is deprecated. Use supabase.auth.signOut() instead');
}

/**
 * @deprecated Use getAccessToken() instead
 */
export function getAccessTokenFromLocalStorage(): string | null {
  console.warn('getAccessTokenFromLocalStorage is deprecated. Use getAccessToken() instead');
  // Return null synchronously - callers should migrate to the async version
  return null;
}