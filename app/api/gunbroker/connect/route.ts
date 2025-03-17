import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
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

export async function POST(request: NextRequest) {
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
      const errorStatus = tokenResponse.status;
      
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
          error: 'Failed to securely store credentials' 
        },
        { status: 500 }
      );
    }
    
    // Check if the user already has an integration for this username
    const { data: existingIntegration, error: lookupError } = await supabase
      .from('gunbroker_integrations')
      .select('id')
      .eq('user_id', user.id)
      .eq('username', username)
      .eq('is_sandbox', is_sandbox)
      .maybeSingle();
    
    if (lookupError) {
      console.error('Error checking for existing integration:', lookupError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to check for existing integration' 
        },
        { status: 500 }
      );
    }
    
    // Prepare the integration data
    const integrationData = {
      user_id: user.id,
      username,
      encrypted_password: encryptionResult,
      access_token: tokenData.accessToken,
      is_sandbox,
      is_active: true,
      last_connected_at: new Date().toISOString(),
    };
    
    // Insert or update the integration
    let result;
    if (existingIntegration) {
      // Update existing integration
      result = await supabase
        .from('gunbroker_integrations')
        .update(integrationData)
        .eq('id', existingIntegration.id)
        .select('id, username, is_sandbox')
        .single();
    } else {
      // Insert new integration
      result = await supabase
        .from('gunbroker_integrations')
        .insert(integrationData)
        .select('id, username, is_sandbox')
        .single();
    }
    
    if (result.error) {
      console.error('Error saving integration:', result.error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to save integration' 
        },
        { status: 500 }
      );
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully connected to Gunbroker as ${username} in ${is_sandbox ? 'sandbox' : 'production'} mode`,
      integration: result.data
    });
  } catch (error: unknown) {
    console.error('Error in Gunbroker connect:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      },
      { status: 500 }
    );
  }
}