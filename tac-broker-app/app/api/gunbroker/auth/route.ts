import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';
import { GunbrokerAPI } from '@/lib/gunbroker/api';

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
      const username = requestBody.username;
      const password = requestBody.password;
      
      // Support both sandbox and is_sandbox for backward compatibility
      const sandbox = requestBody.sandbox !== undefined 
        ? requestBody.sandbox 
        : requestBody.is_sandbox || false;
      
      // Validate input
      if (!username || !password) {
        return NextResponse.json({ 
          success: false, 
          error: 'Username and password are required' 
        }, { status: 400 });
      }
      
      // Select the appropriate dev key based on sandbox mode
      const devKey = sandbox 
        ? process.env.GUNBROKER_STAGING_DEV_KEY || process.env.GUNBROKER_DEV_KEY
        : process.env.GUNBROKER_PRODUCTION_DEV_KEY || process.env.GUNBROKER_DEV_KEY;
      
      console.log(`Using Gunbroker API in ${sandbox ? 'sandbox' : 'production'} mode`);
      console.log(`Dev key available: ${!!devKey}`);
      
      if (!devKey) {
        return NextResponse.json({ 
          success: false, 
          error: `${sandbox ? 'Sandbox' : 'Production'} dev key not configured` 
        }, { status: 500 });
      }
      
      // Initialize Gunbroker API
      const api = new GunbrokerAPI({
        devKey,
        sandbox,
        // Explicitly set the base URL to ensure we're using the correct one
        baseURL: sandbox
          ? 'https://api.sandbox.gunbroker.com/v1'
          : 'https://api.gunbroker.com/v1'
      });
      
      // Authenticate with Gunbroker
      const authResult = await api.auth.authenticate({
        username,
        password
      });
      
      if (!authResult || !authResult.accessToken) {
        return NextResponse.json({ 
          success: false, 
          error: 'Authentication failed' 
        }, { status: 401 });
      }
      
      // Set the access token in the API client for future requests
      api.setAccessToken(authResult.accessToken);
      
      // Calculate expiration date
      // Use the auth-provided expirationDate or default to 24 hours
      const expirationDate = authResult.expirationDate 
        ? new Date(authResult.expirationDate) 
        : new Date(Date.now() + (authResult.expiresIn || 24 * 60 * 60) * 1000);
      
      // Store the encrypted password and token in Supabase
      const { data: encryptionResult, error: encryptionError } = await supabase.rpc(
        'encrypt_password',
        { password }
      );
      
      if (encryptionError) {
        console.error('Error encrypting password:', encryptionError);
        return NextResponse.json(
          { success: false, error: 'Failed to securely store credentials' },
          { status: 500 }
        );
      }
      
      // First, delete any existing integration for this user with the same sandbox setting
      // This ensures we don't hit the unique constraint
      const { error: deleteError } = await supabase
        .from('gunbroker_integrations')
        .delete()
        .eq('user_id', userId)
        .eq('is_sandbox', sandbox);
      
      if (deleteError) {
        console.error('Error removing existing integration:', deleteError);
        // Continue anyway, as the error might just be that no record existed
      }
      
      // Now create a new integration
      const result = await supabase
        .from('gunbroker_integrations')
        .insert({
          user_id: userId,
          username,
          encrypted_password: encryptionResult,
          access_token: authResult.accessToken,
          token_expires_at: expirationDate.toISOString(),
          is_sandbox: sandbox,
          is_active: true,
          last_connected_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (result.error) {
        console.error('Error storing integration:', result.error);
        return NextResponse.json(
          { success: false, error: 'Failed to store Gunbroker integration' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ 
        success: true,
        message: `Successfully connected to Gunbroker in ${sandbox ? 'sandbox' : 'production'} mode`,
        integration: {
          id: result.data.id,
          username: result.data.username,
          is_sandbox: result.data.is_sandbox,
          expires_at: result.data.token_expires_at,
        }
      });
    } catch (error: any) {
      console.error('Error in Gunbroker authentication:', error);
      
      // Handle specific error types
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        return NextResponse.json({ 
          success: false, 
          error: error.response.data?.message || 'Authentication failed' 
        }, { status: error.response.status || 500 });
      } else if (error.request) {
        // The request was made but no response was received
        return NextResponse.json({ 
          success: false, 
          error: 'No response from Gunbroker API' 
        }, { status: 503 });
      } else {
        // Something happened in setting up the request that triggered an Error
        return NextResponse.json({ 
          success: false, 
          error: error.message || 'An unexpected error occurred' 
        }, { status: 500 });
      }
    }
  });
} 