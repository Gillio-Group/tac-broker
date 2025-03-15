import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// Helper function for server-side authentication
async function withServerAuth(request: NextRequest, handler: (userId: string, supabase: any) => Promise<NextResponse>) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ 
      success: false, 
      error: 'Authentication required' 
    }, { status: 401 });
  }
  
  const token = authHeader.split(' ')[1];
  
  // Create a direct Supabase client without cookie dependencies
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );
  
  // Use the token to get the user
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return NextResponse.json({ 
      success: false, 
      error: 'Authentication required' 
    }, { status: 401 });
  }
  
  return handler(user.id, supabase);
}

export async function GET(request: NextRequest) {
  return withServerAuth(request, async (userId, supabase) => {
    try {
      // Get all integrations for this user
      const { data: integrations, error } = await supabase
        .from('gunbroker_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching integrations:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to fetch Gunbroker integrations' 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true,
        integrations
      });
    } catch (error: any) {
      console.error('Error in Gunbroker integrations:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }, { status: 500 });
    }
  });
} 