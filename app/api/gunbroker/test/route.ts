import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { GunbrokerClient } from '@/lib/gunbroker/client';

// Helper function for server-side authentication
async function withServerAuth(request: NextRequest, handler: (userId: string) => Promise<NextResponse>) {
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
    
    return handler(user.id);
  } catch (error: any) {
    console.error('Error authenticating user:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return withServerAuth(request, async (userId) => {
    try {
      // Initialize the Gunbroker client
      const gunbrokerClient = new GunbrokerClient(userId);
      const initialized = await gunbrokerClient.initialize();
      
      if (!initialized) {
        return NextResponse.json(
          { error: 'No active Gunbroker integration found' },
          { status: 404 }
        );
      }
      
      // Test the client by getting account information
      const accountInfo = await gunbrokerClient.getAccountInfo();
      
      // Return the account information
      return NextResponse.json({
        success: true,
        accountInfo,
      });
    } catch (error: any) {
      console.error('Error testing Gunbroker integration:', error);
      return NextResponse.json(
        { error: error.message || 'An unexpected error occurred' },
        { status: 500 }
      );
    }
  });
}