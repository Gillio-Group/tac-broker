import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

// Helper function for server-side authentication
async function withServerAuth(request: NextRequest, handler: (userId: string, supabase: any) => Promise<NextResponse>) {
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
    
    return handler(user.id, supabase);
  } catch (error: any) {
    console.error('Error in authentication:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'An unexpected error occurred' 
    }, { status: 500 });
  }
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