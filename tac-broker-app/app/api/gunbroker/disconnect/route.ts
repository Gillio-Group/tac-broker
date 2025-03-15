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

export async function POST(request: NextRequest) {
  return withServerAuth(request, async (userId, supabase) => {
    try {
      // Get request body
      const requestBody = await request.json();
      const integrationId = requestBody.integrationId;
      const sandbox = requestBody.sandbox !== undefined 
        ? requestBody.sandbox 
        : requestBody.is_sandbox || false;
      
      // If integrationId is provided, delete that specific integration
      if (integrationId) {
        const { error } = await supabase
          .from('gunbroker_integrations')
          .delete()
          .eq('id', integrationId)
          .eq('user_id', userId);
        
        if (error) {
          console.error('Error deleting integration by ID:', error);
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to disconnect Gunbroker integration' 
          }, { status: 500 });
        }
      } else {
        // Otherwise, delete based on user_id and sandbox flag
        const { error } = await supabase
          .from('gunbroker_integrations')
          .delete()
          .eq('user_id', userId)
          .eq('is_sandbox', sandbox);
        
        if (error) {
          console.error('Error deleting integration by user_id and sandbox:', error);
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to disconnect Gunbroker integration' 
          }, { status: 500 });
        }
      }
      
      return NextResponse.json({ 
        success: true,
        message: `Successfully disconnected from Gunbroker in ${sandbox ? 'sandbox' : 'production'} mode`
      });
    } catch (error: any) {
      console.error('Error in Gunbroker disconnect:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }, { status: 500 });
    }
  });
}

// Also handle DELETE requests
export { POST as DELETE }; 