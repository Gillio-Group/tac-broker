import { Session } from '@supabase/supabase-js';

const STORAGE_KEY = 'supabase.auth.token';

/**
 * Utility functions for handling authentication with localStorage
 * For Next.js 15 compatibility (avoids cookie parsing issues)
 */

/**
 * Save the Supabase session to localStorage
 */
export function saveSessionToLocalStorage(session: Session | null): void {
  if (!session) {
    clearSessionFromLocalStorage();
    return;
  }
  
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentSession: session,
        expiresAt: Math.floor(Date.now() / 1000) + 3600
      }));
    }
  } catch (e) {
    console.error('Error saving session to localStorage:', e);
  }
}

/**
 * Get the Supabase session from localStorage
 */
export function getSessionFromLocalStorage(): Session | null {
  try {
    if (typeof window === 'undefined') {
      return null;
    }
    
    const storedValue = localStorage.getItem(STORAGE_KEY);
    if (!storedValue) return null;
    
    const { currentSession, expiresAt } = JSON.parse(storedValue);
    
    // Check if token is expired
    if (expiresAt && expiresAt < Math.floor(Date.now() / 1000)) {
      clearSessionFromLocalStorage();
      return null;
    }
    
    return currentSession;
  } catch (e) {
    console.error('Error retrieving session from localStorage:', e);
    return null;
  }
}

/**
 * Get the access token from localStorage
 */
export function getAccessTokenFromLocalStorage(): string | null {
  const session = getSessionFromLocalStorage();
  return session?.access_token || null;
}

/**
 * Clear the Supabase session from localStorage
 */
export function clearSessionFromLocalStorage(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.error('Error clearing session from localStorage:', e);
  }
}

/**
 * Check if the user is authenticated based on localStorage
 */
export function isAuthenticated(): boolean {
  return !!getSessionFromLocalStorage();
} 