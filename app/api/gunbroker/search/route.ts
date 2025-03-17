import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const GUNBROKER_DEV_KEY = process.env.GUNBROKER_DEV_KEY;
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
    console.error('No authorization header found');
    return NextResponse.json({ 
      success: false, 
      error: 'Authentication required' 
    }, { status: 401 });
  }
  
  const token = authHeader.split(' ')[1];
  
  // Create a direct Supabase client without cookie dependencies
  const supabase = createClient<Database>(
    supabaseUrl,
    supabaseKey,
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
  
  if (error) {
    console.error('Error getting user:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid authentication token' 
    }, { status: 401 });
  }
  
  if (!user) {
    console.error('No user found for token');
    return NextResponse.json({ 
      success: false, 
      error: 'User not found' 
    }, { status: 401 });
  }
  
  return handler(user.id, supabase);
}

// Function to refresh the token
async function refreshGunbrokerToken(integration: any, supabase: any) {
  try {
    console.log('Starting token refresh for integration:', {
      id: integration.id,
      username: integration.username,
      is_sandbox: integration.is_sandbox,
      hasEncryptedPassword: !!integration.encrypted_password,
      encryptedPasswordLength: integration.encrypted_password?.length
    });

    // Create form data for the request
    const formData = new URLSearchParams();
    formData.append('Username', integration.username);
    
    // Get the decrypted password
    console.log('Attempting to decrypt password...');
    const { data: decryptedPassword, error: decryptionError } = await supabase.rpc(
      'decrypt_password',
      { encrypted_password: integration.encrypted_password }
    );

    if (decryptionError) {
      console.error('Error decrypting password:', decryptionError);
      throw new Error('Failed to decrypt credentials');
    }

    if (!decryptedPassword) {
      console.error('No password returned from decryption');
      throw new Error('Failed to decrypt password - no password returned');
    }

    console.log('Password decryption successful:', {
      hasPassword: !!decryptedPassword,
      passwordLength: decryptedPassword.length
    });

    formData.append('Password', decryptedPassword);

    // Log form data (safely)
    console.log('Form data prepared:', {
      formDataKeys: Array.from(formData.keys()),
      username: integration.username,
      hasPassword: formData.has('Password'),
      passwordLength: formData.get('Password')?.length
    });

    // Determine which API URL to use
    const baseUrl = integration.is_sandbox ? GUNBROKER_SANDBOX_API_URL : GUNBROKER_API_URL;
    const devKey = integration.is_sandbox ? GUNBROKER_SANDBOX_DEV_KEY : GUNBROKER_PRODUCTION_DEV_KEY;

    console.log('Making token refresh request to Gunbroker:', {
      url: `${baseUrl}/v1/Users/AccessToken`,
      method: 'POST',
      contentType: 'application/x-www-form-urlencoded',
      hasDevKey: !!devKey,
      formDataKeys: Array.from(formData.keys())
    });

    // Get a new access token from Gunbroker
    const tokenResponse = await fetch(`${baseUrl}/v1/Users/AccessToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-DevKey': devKey || '',
      },
      body: formData.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token refresh error response:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        responseBody: errorText,
        headers: Object.fromEntries(tokenResponse.headers.entries())
      });
      throw new Error(`Failed to refresh token: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token refresh successful:', {
      hasAccessToken: !!tokenData.accessToken
    });

    // Update the stored integration with the new token
    const { error: updateError } = await supabase
      .from('gunbroker_integrations')
      .update({
        access_token: tokenData.accessToken,
        last_connected_at: new Date().toISOString(),
      })
      .eq('id', integration.id);

    if (updateError) {
      console.error('Error updating integration:', updateError);
      throw new Error('Failed to update integration with new token');
    }

    console.log('Integration updated successfully with new token');
    return tokenData.accessToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

// Function to make a search request
async function makeSearchRequest(query: string, accessToken: string, baseUrl: string, devKey: string) {
  console.log('Making search request:', {
    url: `${baseUrl}/v1/Items`,
    query,
    hasAccessToken: !!accessToken,
    hasDevKey: !!devKey
  });

  const response = await fetch(
    `${baseUrl}/v1/Items?Keywords=${encodeURIComponent(query)}`,
    {
      headers: {
        'X-DevKey': devKey || '',
        'X-AccessToken': accessToken,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Search error:', {
      status: response.status,
      body: errorText
    });
    throw new Error(`Search request failed: ${response.statusText}`);
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  return withServerAuth(request, async (userId, supabase) => {
    try {
      const { searchParams } = new URL(request.url);
      const searchText = searchParams.get('searchText');

      if (!searchText) {
        return NextResponse.json(
          { error: 'Search query is required' },
          { status: 400 }
        );
      }

      // Get the user's active Gunbroker integration
      const { data: integration, error: integrationError } = await supabase
        .from('gunbroker_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (integrationError || !integration) {
        console.error('Error fetching integration:', integrationError);
        return NextResponse.json(
          { error: 'No active Gunbroker integration found' },
          { status: 404 }
        );
      }

      // Determine which API URL to use
      const baseUrl = integration.is_sandbox ? GUNBROKER_SANDBOX_API_URL : GUNBROKER_API_URL;
      const devKey = integration.is_sandbox ? GUNBROKER_SANDBOX_DEV_KEY : GUNBROKER_PRODUCTION_DEV_KEY;

      try {
        // Always refresh the token before making a search request
        console.log('Refreshing token before search...');
        const newToken = await refreshGunbrokerToken(integration, supabase);
        
        // Make the search request with the new token
        console.log('Making search request with fresh token...');
        const results = await makeSearchRequest(searchText, newToken, baseUrl, devKey);
        
        return NextResponse.json(results);
      } catch (error: any) {
        console.error('Error during search:', error);
        
        // If we get a 401 during token refresh, the credentials are invalid
        if (error.message.includes('401')) {
          // Deactivate the integration
          await supabase
            .from('gunbroker_integrations')
            .update({ is_active: false })
            .eq('id', integration.id);
          
          return NextResponse.json(
            { error: 'CREDENTIALS_INVALID' },
            { status: 401 }
          );
        }
        
        throw error;
      }
    } catch (error: any) {
      console.error('Search error:', error);
      return NextResponse.json(
        { error: error.message || 'An unexpected error occurred' },
        { status: 500 }
      );
    }
  });
} 