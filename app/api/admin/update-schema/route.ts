import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

// This is a one-time route to update the database schema
// It should be protected and only accessible to admins
export async function POST() {
  try {
    // Create a Supabase client using cookies
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll().map(cookie => ({
              name: cookie.name,
              value: cookie.value,
            }));
          },
          setAll(cookies) {
            cookies.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch (error) {
                console.error('Error setting cookie:', error);
              }
            });
          },
        },
      }
    );
    
    // Get the current user from the session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Execute the SQL to add the last_connected_at column
    const { error } = await supabase.rpc('execute_sql', {
      sql_query: `
        ALTER TABLE gunbroker_integrations 
        ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        COMMENT ON COLUMN gunbroker_integrations.last_connected_at IS 'Records when the integration was last used to connect to Gunbroker';
      `
    });
    
    if (error) {
      console.error('Error updating schema:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update schema' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Schema updated successfully' 
    });
  } catch (error: Error) {
    console.error('Error in update schema:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }, { status: 500 });
  }
}