import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/database.types';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const requestBody = await request.json();
    const integrationId = requestBody.integrationId;
    const sandbox = requestBody.sandbox !== undefined 
      ? requestBody.sandbox 
      : requestBody.is_sandbox || false;
    
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
    
    // If integrationId is provided, delete that specific integration
    if (integrationId) {
      const { error } = await supabase
        .from('gunbroker_integrations')
        .delete()
        .eq('id', integrationId)
        .eq('user_id', user.id);
      
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
        .eq('user_id', user.id)
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
}

// Also handle DELETE requests
export { POST as DELETE };