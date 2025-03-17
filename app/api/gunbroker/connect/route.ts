import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// Environment variables
const GUNBROKER_SANDBOX_DEV_KEY = process.env.GUNBROKER_STAGING_DEV_KEY;
const GUNBROKER_PRODUCTION_DEV_KEY = process.env.GUNBROKER_PRODUCTION_DEV_KEY;
const GUNBROKER_API_URL = process.env.GUNBROKER_PRODUCTION_URL;
const GUNBROKER_SANDBOX_API_URL = process.env.GUNBROKER_STAGING_URL;

// Validate environment variables
if (!GUNBROKER_API_URL || !GUNBROKER_SANDBOX_API_URL) {
  throw new Error('Gunbroker API URLs not configured in environment variables');
}

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
  
  try {
    // First verify the token is valid
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);
    
    if (getUserError || !user) {
      console.error('Auth error:', getUserError);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid or expired session' 
      }, { status: 401 });
    }
    
    // Set the session explicitly
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: ''  // We don't have refresh token in API routes
    });
    
    return handler(user.id, supabase);
  } catch (error: any) {
    console.error('Server auth error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Authentication failed' 
    }, { status: 401 });
  }
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
      const devKey = is_sandbox ? GUNBROKER_SANDBOX_DEV_KEY : GUNBROKER_PRODUCTION_DEV_KEY;
      if (!devKey) {
        console.error(`${is_sandbox ? 'GUNBROKER_STAGING_DEV_KEY' : 'GUNBROKER_PRODUCTION_DEV_KEY'} environment variable is not set`);
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
      console.log(`Using Gunbroker API in ${is_sandbox ? 'sandbox' : 'production'} mode`);
      console.log(`Dev key available: ${!!devKey}`);
      console.log('Full request details:', {
        url: `${baseUrl}/v1/Users/AccessToken`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-DevKey': devKey ? `${devKey.substring(0, 8)}...` : 'undefined',
        },
        formDataEntries: Object.fromEntries(formData.entries()),
        formDataString: formData.toString()
      });
      
      const tokenResponse = await fetch(`${baseUrl}/v1/Users/AccessToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-DevKey': devKey,
        },
        body: formData.toString(),
      });
      
      // Handle potential API errors with more detail
      if (!tokenResponse.ok) {
        console.error('Gunbroker API error:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          url: tokenResponse.url
        });

        let errorMessage = 'Failed to connect to Gunbroker';
        let errorStatus = tokenResponse.status;
        
        try {
          const errorData = await tokenResponse.json();
          errorMessage = errorData.message || errorMessage;
          
          // Handle specific error cases
          if (tokenResponse.status === 401) {
            errorMessage = 'Invalid Gunbroker credentials';
          } else if (tokenResponse.status === 429) {
            errorMessage = 'Too many requests to Gunbroker API. Please try again later.';
          }
        } catch (e) {
          console.error('Could not parse error response:', e);
        }
        
        return NextResponse.json(
          { 
            success: false,
            error: errorMessage 
          },
          { status: errorStatus }
        );
      }
      
      // Parse the token response
      const tokenData = await tokenResponse.json();
      
      // Validate the token response with more detail
      if (!tokenData.accessToken) {
        console.error('Invalid Gunbroker API response:', tokenData);
        return NextResponse.json(
          { 
            success: false,
            error: 'Invalid response from Gunbroker API - no access token received' 
          },
          { status: 502 }
        );
      }
      
      // Store the encrypted password and token in Supabase
      console.log('Starting password encryption...', {
        hasPassword: !!password,
        passwordLength: password?.length,
        passwordType: typeof password
      });

      const { data: encryptionResult, error: encryptionError } = await supabase.rpc(
        'encrypt_password',
        { password }
      );
      
      if (encryptionError) {
        console.error('Error encrypting password:', {
          error: encryptionError,
          message: encryptionError.message,
          details: encryptionError.details,
          hint: encryptionError.hint
        });
        return NextResponse.json(
          { 
            success: false,
            error: `Failed to securely store credentials: ${encryptionError.message}` 
          },
          { status: 500 }
        );
      }

      if (!encryptionResult) {
        console.error('No encryption result returned', {
          hasPassword: !!password,
          passwordLength: password?.length
        });
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to encrypt password - no result returned' 
          },
          { status: 500 }
        );
      }

      console.log('Password encryption successful:', {
        hasEncryptionResult: !!encryptionResult,
        encryptionResultLength: encryptionResult?.length
      });
      
      // Check for existing integration for this user
      console.log('Checking for existing integration...');
      const { data: existingIntegration } = await supabase
        .from('gunbroker_integrations')
        .select('id')
        .eq('user_id', userId)
        .eq('username', username)
        .eq('is_sandbox', is_sandbox)
        .eq('is_active', true)
        .maybeSingle();
      
      console.log('Existing integration:', existingIntegration);
      
      let result;
      
      // If integration exists, update it
      if (existingIntegration) {
        console.log('Updating existing integration:', {
          id: existingIntegration.id,
          hasEncryptedPassword: !!encryptionResult
        });

        result = await supabase
          .from('gunbroker_integrations')
          .update({
            access_token: tokenData.accessToken,
            encrypted_password: encryptionResult,
            last_connected_at: new Date().toISOString(),
          })
          .eq('id', existingIntegration.id)
          .select()
          .single();
      } else {
        console.log('Creating new integration with data:', {
          hasEncryptedPassword: !!encryptionResult,
          username,
          is_sandbox
        });

        // Otherwise, create a new integration
        result = await supabase
          .from('gunbroker_integrations')
          .insert({
            user_id: userId,
            username,
            encrypted_password: encryptionResult,
            access_token: tokenData.accessToken,
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

      console.log('Integration stored successfully:', {
        id: result.data.id,
        hasEncryptedPassword: !!result.data.encrypted_password,
        encryptedPasswordLength: result.data.encrypted_password?.length
      });

      // Return success response
      return NextResponse.json({
        success: true,
        message: 'Successfully connected to Gunbroker',
        integration: {
          id: result.data.id,
          username: result.data.username,
          is_sandbox: result.data.is_sandbox,
          last_connected_at: result.data.last_connected_at,
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