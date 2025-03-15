import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// Server actions can't access localStorage directly, use this approach
export async function createAuthenticatedServerActionClient(token?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  // Create a new client without cookie dependencies
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  
  // If a token is provided, we can set the auth state manually
  if (token) {
    // Use the token to set the session
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: ''
    });
  }
  
  return supabase;
} 