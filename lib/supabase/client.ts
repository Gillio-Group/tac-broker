import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const STORAGE_KEY = 'sb-localhost-auth-token';

// Client-side Supabase client with properly configured storage
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: STORAGE_KEY,
      storage: {
        getItem: (key) => {
          try {
            if (typeof window === 'undefined') return null;
            
            const value = window.localStorage.getItem(key);
            if (!value) {
              console.log('No session found in storage for key:', key);
              return null;
            }

            // Parse and validate the session data
            const parsed = JSON.parse(value);
            if (!parsed?.access_token || !parsed?.refresh_token) {
              console.log('Invalid session data in storage:', parsed);
              window.localStorage.removeItem(key);
              return null;
            }

            console.log('Found valid session in storage');
            return value;
          } catch (error) {
            console.error('Error reading from storage:', error);
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            if (typeof window === 'undefined') return;
            
            // Validate the session data before saving
            const parsed = JSON.parse(value);
            if (!parsed?.access_token) {
              console.error('Attempted to save invalid session data:', parsed);
              return;
            }

            console.log('Saving session to storage');
            window.localStorage.setItem(key, value);
          } catch (error) {
            console.error('Error saving to storage:', error);
          }
        },
        removeItem: (key) => {
          try {
            if (typeof window === 'undefined') return;
            console.log('Removing session from storage');
            window.localStorage.removeItem(key);
          } catch (error) {
            console.error('Error removing from storage:', error);
          }
        },
      },
      // Enable debug mode for development
      debug: process.env.NODE_ENV === 'development',
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    global: {
      headers: {
        'x-client-info': '@supabase/auth-helpers-nextjs'
      }
    }
  }
);