import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// This is a one-time route to update the database schema
// It should be protected and only accessible to admins
export async function POST(request: NextRequest) {
  try {
    // Get the authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Create Supabase client
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
    
    // Verify the user is an admin
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
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
  } catch (error: any) {
    console.error('Error in update schema:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'An unexpected error occurred' 
    }, { status: 500 });
  }
} 