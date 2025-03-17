import { Session } from '@supabase/supabase-js';

// Use the correct storage key format for Supabase
const STORAGE_KEY = 'sb-localhost-auth-token';

/**
 * Utility functions for handling authentication with localStorage
 * For Next.js 15 compatibility (avoids cookie parsing issues)
 */

/**
 * Get the Supabase session from localStorage
 */
export function getSessionFromLocalStorage(): Session | null {
  try {
    if (typeof window === 'undefined') return null;
    
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) {
      console.log('No session found in localStorage');
      return null;
    }

    // Parse and validate the session data
    const parsed = JSON.parse(value);
    if (!parsed?.access_token || !parsed?.refresh_token) {
      console.log('Invalid session data in localStorage:', parsed);
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    console.log('Found valid session in localStorage');
    return parsed;
  } catch (error) {
    console.error('Error reading session from localStorage:', error);
    return null;
  }
}

/**
 * Save the Supabase session to localStorage
 */
export function saveSessionToLocalStorage(session: Session | null): void {
  try {
    if (typeof window === 'undefined') return;
    
    if (!session?.access_token || !session?.refresh_token) {
      console.error('Attempted to save invalid session:', session);
      return;
    }

    const serialized = JSON.stringify(session);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    console.log('Session saved to localStorage');
  } catch (error) {
    console.error('Error saving session to localStorage:', error);
  }
}

/**
 * Clear the session from localStorage
 */
export function clearSessionFromLocalStorage(): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEY);
    console.log('Session cleared from localStorage');
  } catch (error) {
    console.error('Error clearing session from localStorage:', error);
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
 * Get the access token from localStorage
 */
export function getAccessTokenFromLocalStorage(): string | null {
  const session = getSessionFromLocalStorage();
  return session?.access_token || null;
}

/**
 * Check if the user is authenticated based on localStorage
 */
export function isAuthenticated(): boolean {
  return !!getSessionFromLocalStorage();
}