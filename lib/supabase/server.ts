import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// Server-side Supabase client without cookie dependencies
export function createServerClient(token?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Create client without relying on cookies
  const supabase = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
  
  // If a token is provided, we can set the auth state manually
  if (token) {
    // This is async but we're not awaiting here to maintain function signature
    supabase.auth.setSession({
      access_token: token,
      refresh_token: ''
    });
  }
  
  return supabase;
} 