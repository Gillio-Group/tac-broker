import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const GUNBROKER_DEV_KEY = process.env.GUNBROKER_DEV_KEY;
const GUNBROKER_SANDBOX_DEV_KEY = process.env.GUNBROKER_STAGING_DEV_KEY;
const GUNBROKER_PRODUCTION_DEV_KEY = process.env.GUNBROKER_PRODUCTION_DEV_KEY;
const GUNBROKER_API_URL = 'https://api.gunbroker.com';
const GUNBROKER_SANDBOX_API_URL = 'https://api.sandbox.gunbroker.com';

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

// Add this function after the imports
async function refreshGunbrokerToken(integration: any, supabase: any) {
  try {
    // Create form data for the request
    const formData = new URLSearchParams();
    formData.append('Username', integration.username);
    
    // Get the decrypted password
    const { data: decryptedPassword, error: decryptionError } = await supabase.rpc(
      'decrypt_password',
      { encrypted_password: integration.encrypted_password }
    );

    if (decryptionError) {
      console.error('Error decrypting password:', decryptionError);
      throw new Error('Failed to decrypt credentials');
    }

    formData.append('Password', decryptedPassword);

    // Determine which API URL to use
    const apiUrl = integration.is_sandbox ? GUNBROKER_SANDBOX_API_URL : GUNBROKER_API_URL;
    const devKey = integration.is_sandbox ? GUNBROKER_SANDBOX_DEV_KEY : GUNBROKER_PRODUCTION_DEV_KEY;

    // Get a new access token from Gunbroker
    const tokenResponse = await fetch(`${apiUrl}/v1/Users/AccessToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-DevKey': devKey || '', // Ensure devKey is never undefined
      } as HeadersInit,
      body: formData.toString(),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to refresh token: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const expirationDate = tokenData.expirationDate 
      ? new Date(tokenData.expirationDate) 
      : new Date(Date.now() + (tokenData.expiresIn || 3600) * 1000);

    // Update the stored integration with the new token
    const { error: updateError } = await supabase
      .from('gunbroker_integrations')
      .update({
        access_token: tokenData.accessToken,
        token_expires_at: expirationDate.toISOString(),
        last_connected_at: new Date().toISOString(),
      })
      .eq('id', integration.id);

    if (updateError) {
      throw new Error('Failed to update integration with new token');
    }

    return tokenData.accessToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  return withServerAuth(request, async (userId, supabase) => {
    try {
      // Get the search parameters from the URL
      const searchParams = request.nextUrl.searchParams;
      
      // Build query parameters for Gunbroker API
      const gbParams = new URLSearchParams();
      
      // Map search parameters to Gunbroker API parameters
      if (searchParams.has('searchText')) gbParams.append('Keywords', searchParams.get('searchText')!);
      if (searchParams.has('categoryId')) gbParams.append('Categories', searchParams.get('categoryId')!);
      if (searchParams.has('minPrice')) gbParams.append('MinPrice', searchParams.get('minPrice')!);
      if (searchParams.has('maxPrice')) gbParams.append('MaxPrice', searchParams.get('maxPrice')!);
      if (searchParams.has('condition')) {
        const condition = searchParams.get('condition');
        if (condition === 'New') gbParams.append('Condition', '1'); // New Items Only
        if (condition === 'Used') gbParams.append('Condition', '4'); // Used Items Only
      }
      
      // Sort parameters
      if (searchParams.has('sortBy')) {
        const sortBy = searchParams.get('sortBy');
        switch (sortBy) {
          case 'EndingSoonest':
            gbParams.append('Sort', '0'); // Shortest time left Asc
            break;
          case 'PriceHighToLow':
            gbParams.append('Sort', '5'); // Item price Desc
            break;
          case 'PriceLowToHigh':
            gbParams.append('Sort', '4'); // Item price Asc
            break;
          case 'NewestListed':
            gbParams.append('Sort', '7'); // Starting date Desc
            break;
          default:
            gbParams.append('Sort', '13'); // Featured and then Relevance (default)
        }
      }
      
      // Pagination
      const page = searchParams.has('page') ? parseInt(searchParams.get('page')!) : 1;
      const pageSize = searchParams.has('pageSize') ? parseInt(searchParams.get('pageSize')!) : 25;
      
      gbParams.append('PageSize', pageSize.toString());
      gbParams.append('PageIndex', page.toString()); // Gunbroker API uses 1-based indexing
      
      // Get the user's active Gunbroker integration
      const { data: integration, error: integrationError } = await supabase
        .from('gunbroker_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_connected_at', { ascending: false })
        .limit(1)
        .single();
      
      console.log('Integration found:', integration ? 'Yes' : 'No');
      if (integrationError) {
        console.error('Integration error:', integrationError);
        return NextResponse.json(
          { error: 'Failed to retrieve Gunbroker integration' }, 
          { status: 500 }
        );
      }
      
      if (!integration) {
        return NextResponse.json(
          { error: 'No active Gunbroker integration found. Please connect your Gunbroker account first.' }, 
          { status: 400 }
        );
      }
      
      // Log integration details (excluding sensitive data)
      console.log('Integration details:', {
        id: integration.id,
        username: integration.username,
        is_sandbox: integration.is_sandbox,
        token_expires_at: integration.token_expires_at,
        has_access_token: !!integration.access_token
      });

      // Check if access token is expired
      if (integration.token_expires_at && new Date(integration.token_expires_at) < new Date()) {
        console.error('Access token has expired');
        return NextResponse.json(
          { error: 'Gunbroker access token has expired. Please reconnect your account.' }, 
          { status: 401 }
        );
      }
      
      // Determine which API URL and dev key to use
      const apiUrl = integration.is_sandbox ? GUNBROKER_SANDBOX_API_URL : GUNBROKER_API_URL;
      const devKey = integration.is_sandbox ? GUNBROKER_SANDBOX_DEV_KEY : GUNBROKER_PRODUCTION_DEV_KEY;

      // Validate dev key
      if (!devKey) {
        console.error('Missing dev key for', integration.is_sandbox ? 'sandbox' : 'production');
        return NextResponse.json(
          { error: 'Server configuration error: Missing Gunbroker dev key' },
          { status: 500 }
        );
      }

      const searchUrl = `${apiUrl}/v1/Items?${gbParams.toString()}`;
      
      console.log('Making Gunbroker API request:', {
        url: searchUrl,
        params: Object.fromEntries(gbParams.entries()),
        isSandbox: integration.is_sandbox,
        hasDevKey: !!devKey
      });
      
      // Make the request to Gunbroker API
      let response = await fetch(searchUrl, {
        headers: {
          'Content-Type': 'application/json',
          'X-DevKey': devKey,
          'X-AccessToken': integration.access_token,
        },
      });
      
      console.log('Gunbroker API response status:', response.status);
      
      // If we get a 401, try refreshing the token once
      if (response.status === 401) {
        try {
          console.log('Attempting to refresh access token...');
          const newAccessToken = await refreshGunbrokerToken(integration, supabase);
          
          // Retry the request with the new token
          console.log('Retrying request with new access token...');
          response = await fetch(searchUrl, {
            headers: {
              'Content-Type': 'application/json',
              'X-DevKey': devKey,
              'X-AccessToken': newAccessToken,
            },
          });
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
          return NextResponse.json(
            { error: 'Failed to refresh Gunbroker access token. Please reconnect your account.' },
            { status: 401 }
          );
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gunbroker API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          headers: Object.fromEntries(response.headers.entries())
        });

        return NextResponse.json(
          { error: `Gunbroker API error: ${response.status} ${response.statusText}` },
          { status: response.status }
        );
      }

      // First get the raw response text
      const responseText = await response.text();
      console.log('Raw Gunbroker API response:', responseText);

      // Then parse it as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse Gunbroker API response:', e);
        return NextResponse.json(
          { error: 'Invalid response from Gunbroker API' },
          { status: 500 }
        );
      }

      // Log the full structure of the response
      console.log('Gunbroker API response structure:', {
        keys: Object.keys(data),
        hasItems: Array.isArray(data),
        firstItem: Array.isArray(data) ? data[0] : null,
        count: Array.isArray(data) ? data.length : 0
      });

      // The Gunbroker API returns a structured response with results field
      const items = data.results || [];
      const totalResults = data.count || 0;
      const currentPage = data.pageIndex || page;
      const actualPageSize = data.pageSize || pageSize;

      console.log('Mapped response data:', {
        itemCount: items.length,
        totalResults,
        currentPage,
        pageSize: actualPageSize,
        sampleItem: items[0]
      });

      return NextResponse.json({
        results: items,
        totalResults,
        currentPage,
        pageSize: actualPageSize,
        maxPages: Math.ceil(totalResults / actualPageSize)
      });
    } catch (error: any) {
      console.error('Error searching Gunbroker items:', error);
      return NextResponse.json(
        { error: error.message || 'An error occurred while searching items' }, 
        { status: 500 }
      );
    }
  });
} 