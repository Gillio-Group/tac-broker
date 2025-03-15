import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';
import { GunbrokerClient } from '@/lib/gunbroker/client';

// Helper function for server-side authentication
async function withServerAuth(request: NextRequest, handler: (userId: string) => Promise<NextResponse>) {
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
  
  return handler(user.id);
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