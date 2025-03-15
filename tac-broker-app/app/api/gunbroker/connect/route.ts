import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// Environment variables
const GUNBROKER_DEV_KEY = process.env.GUNBROKER_DEV_KEY;
const GUNBROKER_API_URL = 'https://api.gunbroker.com';
const GUNBROKER_SANDBOX_API_URL = 'https://api.sandbox.gunbroker.com';

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
      // Get connection parameters from request body
      const requestBody = await request.json();
      const username = requestBody.username;
      const password = requestBody.password;
      const is_sandbox = requestBody.is_sandbox;
      
      // Validate required fields
      if (!username || !password) {
        return NextResponse.json(
          { error: 'Username and password are required' },
          { status: 400 }
        );
      }
      
      // Validate environment variables
      if (!GUNBROKER_DEV_KEY) {
        console.error('GUNBROKER_DEV_KEY environment variable is not set');
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }
      
      // Create the Gunbroker API client
      const baseUrl = is_sandbox ? GUNBROKER_SANDBOX_API_URL : GUNBROKER_API_URL;
      
      // Create form data for the request
      const formData = new URLSearchParams();
      formData.append('Username', username);
      formData.append('Password', password);
      
      // Get Gunbroker access token
      const tokenResponse = await fetch(`${baseUrl}/Users/AccessToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-DevKey': GUNBROKER_DEV_KEY,
        },
        body: formData.toString(),
      });
      
      // Handle potential API errors
      if (!tokenResponse.ok) {
        let errorMessage = 'Failed to connect to Gunbroker';
        
        try {
          const errorData = await tokenResponse.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If we can't parse the error response, use the default message
        }
        
        return NextResponse.json(
          { error: errorMessage },
          { status: tokenResponse.status }
        );
      }
      
      // Parse the token response
      const tokenData = await tokenResponse.json();
      
      // Validate the token response
      if (!tokenData.accessToken) {
        return NextResponse.json(
          { error: 'Invalid response from Gunbroker API' },
          { status: 502 }
        );
      }
      
      // Convert expiration date from Gunbroker's format to ISO format
      const expirationDate = new Date(tokenData.expirationDate);
      
      // Store the encrypted password and token in Supabase
      const { data: encryptionResult, error: encryptionError } = await supabase.rpc(
        'encrypt_password',
        { password }
      );
      
      if (encryptionError) {
        console.error('Error encrypting password:', encryptionError);
        return NextResponse.json(
          { error: 'Failed to securely store credentials' },
          { status: 500 }
        );
      }
      
      // Check for existing integration for this user
      const { data: existingIntegration } = await supabase
        .from('gunbroker_integrations')
        .select('id')
        .eq('user_id', userId)
        .eq('username', username)
        .eq('is_sandbox', is_sandbox)
        .eq('is_active', true)
        .maybeSingle();
      
      let result;
      
      // If integration exists, update it
      if (existingIntegration) {
        result = await supabase
          .from('gunbroker_integrations')
          .update({
            access_token: tokenData.accessToken,
            token_expires_at: expirationDate.toISOString(),
            encrypted_password: encryptionResult,
            last_connected_at: new Date().toISOString(),
          })
          .eq('id', existingIntegration.id)
          .select()
          .single();
      } else {
        // Otherwise, create a new integration
        result = await supabase
          .from('gunbroker_integrations')
          .insert({
            user_id: userId,
            username,
            encrypted_password: encryptionResult,
            access_token: tokenData.accessToken,
            token_expires_at: expirationDate.toISOString(),
            is_sandbox,
            is_active: true,
            last_connected_at: new Date().toISOString(),
          })
          .select()
          .single();
      }
      
      if (result.error) {
        console.error('Error storing integration:', result.error);
        return NextResponse.json(
          { error: 'Failed to store Gunbroker integration' },
          { status: 500 }
        );
      }
      
      // Return success response
      return NextResponse.json({
        success: true,
        message: 'Successfully connected to Gunbroker',
        integration: {
          id: result.data.id,
          username: result.data.username,
          is_sandbox: result.data.is_sandbox,
          expires_at: result.data.token_expires_at,
        },
      });
    } catch (error: any) {
      console.error('Unexpected error in Gunbroker connect:', error);
      return NextResponse.json(
        { error: error.message || 'An unexpected error occurred' },
        { status: 500 }
      );
    }
  });
} 