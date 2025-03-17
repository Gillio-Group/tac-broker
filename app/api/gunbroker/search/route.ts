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

// Function to refresh the token
async function refreshGunbrokerToken(integration: any, supabase: any) {
  try {
    console.log('Starting token refresh for integration:', {
      id: integration.id,
      username: integration.username,
      is_sandbox: integration.is_sandbox,
      hasEncryptedPassword: !!integration.encrypted_password
    });

    // Create form data for the request
    const formData = new URLSearchParams();
    formData.append('Username', integration.username);
    
    // Get the decrypted password
    const { data: decryptedPassword, error: decryptionError } = await supabase.rpc(
      'decrypt_password',
      { encrypted_password: integration.encrypted_password }
    );

    if (decryptionError || !decryptedPassword) {
      console.error('Error decrypting password:', decryptionError);
      throw new Error('Failed to decrypt credentials');
    }

    formData.append('Password', decryptedPassword);

    // Determine which API URL to use
    const baseUrl = integration.is_sandbox ? GUNBROKER_SANDBOX_API_URL : GUNBROKER_API_URL;
    const devKey = integration.is_sandbox ? GUNBROKER_SANDBOX_DEV_KEY : GUNBROKER_PRODUCTION_DEV_KEY;

    if (!devKey) {
      throw new Error('Dev key not configured');
    }

    // Get a new access token from Gunbroker
    const tokenResponse = await fetch(`${baseUrl}/v1/Users/AccessToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-DevKey': devKey,
      },
      body: formData.toString(),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to refresh token: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();

    // Update the stored integration with the new token
    const { error: updateError } = await supabase
      .from('gunbroker_integrations')
      .update({
        access_token: tokenData.accessToken,
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
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get search text from URL
    const searchText = request.nextUrl.searchParams.get('searchText');
    if (!searchText) {
      return NextResponse.json({ error: 'Search text is required' }, { status: 400 });
    }

    // Get the user's active Gunbroker integration
    const { data: integration, error: integrationError } = await supabase
      .from('gunbroker_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json({ error: 'Gunbroker integration not found' }, { status: 404 });
    }

    // Set up the API URL and dev key
    const baseUrl = integration.is_sandbox ? GUNBROKER_SANDBOX_API_URL : GUNBROKER_API_URL;
    const devKey = integration.is_sandbox ? GUNBROKER_SANDBOX_DEV_KEY : GUNBROKER_PRODUCTION_DEV_KEY;

    if (!devKey) {
      return NextResponse.json({ error: 'Dev key not configured' }, { status: 500 });
    }

    // Get fresh token
    const accessToken = await refreshGunbrokerToken(integration, supabase);

    // Build the search URL with all parameters
    const searchParams = new URLSearchParams();
    
    // Add Keywords parameter
    if (searchText) {
      searchParams.append('Keywords', searchText);
    }
    
    // Add other parameters from the request
    const categoryId = request.nextUrl.searchParams.get('categoryId');
    if (categoryId) {
      searchParams.append('CategoryID', categoryId);
    }
    
    const minPrice = request.nextUrl.searchParams.get('minPrice');
    if (minPrice) {
      searchParams.append('MinPrice', minPrice);
    }
    
    const maxPrice = request.nextUrl.searchParams.get('maxPrice');
    if (maxPrice) {
      searchParams.append('MaxPrice', maxPrice);
    }
    
    const condition = request.nextUrl.searchParams.get('condition');
    if (condition && condition !== '0') {
      searchParams.append('Condition', condition);
    }
    
    // Add Sort parameter - transform sortBy to Sort
    const sortBy = request.nextUrl.searchParams.get('sortBy');
    if (sortBy) {
      searchParams.append('Sort', sortBy);
      console.log('Added Sort parameter:', sortBy);
    } else {
      // Default to Featured and Relevance (13)
      searchParams.append('Sort', '13');
      console.log('Using default Sort parameter: 13');
    }
    
    // Handle Auctions Only filter
    const auctionsOnly = request.nextUrl.searchParams.get('auctionsOnly');
    if (auctionsOnly === 'true') {
      searchParams.append('MinStartingBid', '0.01');
    }
    
    // Add pagination parameters
    const pageIndex = request.nextUrl.searchParams.get('pageIndex') || '1';
    searchParams.append('PageIndex', pageIndex);
    
    const pageSize = request.nextUrl.searchParams.get('pageSize') || '25';
    searchParams.append('PageSize', pageSize);
    
    console.log('Making search request with params:', searchParams.toString());

    const response = await fetch(`${baseUrl}/v1/Items?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'X-DevKey': devKey,
        'X-AccessToken': accessToken,
      },
    });

    if (!response.ok) {
      console.error('Gunbroker API error:', {
        status: response.status,
        statusText: response.statusText
      });
      return NextResponse.json({ error: response.statusText }, { status: response.status });
    }

    const searchResults = await response.json();
    return NextResponse.json(searchResults);

  } catch (error: any) {
    console.error('Error in Gunbroker search:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}