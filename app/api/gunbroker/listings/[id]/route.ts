import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { refreshGunbrokerToken } from '@/lib/gunbroker/token';
import { GunBrokerApiError } from '@/lib/exceptions';
import { Database } from '@/lib/database.types';

// Check for required environment variables
if (!process.env.GUNBROKER_STAGING_URL || !process.env.GUNBROKER_PRODUCTION_URL) {
  throw new Error('GunBroker API URL environment variables are not set');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = params.id;
    
    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }
    
    console.log(`Fetching listing details for item ID: ${itemId}`);
    
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

    // Get user's active Gunbroker integration
    const { data: integration, error: integrationError } = await supabase
      .from('gunbroker_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json({ error: 'Gunbroker integration not found' }, { status: 404 });
    }

    // Use sandbox URL if integration is in sandbox mode, otherwise use production
    const baseUrl = integration.is_sandbox 
      ? process.env.GUNBROKER_STAGING_URL 
      : process.env.GUNBROKER_PRODUCTION_URL;

    // Create the API URL for the specific listing
    const apiUrl = new URL(`/v1/Items/${itemId}`, baseUrl);
    
    console.log(`Making request to: ${apiUrl.toString()}`);
    
    // Use the corresponding dev key based on sandbox mode
    const devKey = integration.is_sandbox
      ? process.env.GUNBROKER_STAGING_DEV_KEY
      : process.env.GUNBROKER_PRODUCTION_DEV_KEY;

    if (!devKey) {
      throw new GunBrokerApiError('Dev key not configured', 500);
    }

    async function makeRequest(token: string) {
      // Assert devKey is string since we checked above
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'X-DevKey': devKey || '',
        'X-AccessToken': token,
      };

      const response = await fetch(apiUrl.toString(), { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('GunBroker API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: apiUrl.toString(),
          isSandbox: integration.is_sandbox
        });
        
        throw new GunBrokerApiError(
          'Error fetching listing details from GunBroker',
          response.status,
          errorText
        );
      }
      
      return response;
    }

    // Make initial request with current token
    let response = await makeRequest(integration.access_token);

    // If token is expired, refresh and retry
    if (response.status === 401) {
      console.log('Token expired, refreshing...');
      const newToken = await refreshGunbrokerToken(integration, supabase);
      response = await makeRequest(newToken);
    }

    const data = await response.json();
    
    // Log the structure for debugging
    console.log('GunBroker API listing details response:', {
      itemID: data.itemID,
      title: data.title,
    });
    
    // Log the complete JSON response for debugging
    console.log('Complete GunBroker item response JSON:', JSON.stringify(data, null, 2));
    
    // Return the listing data with minimal transformation
    // This preserves the original data structure for use in the UI
    return NextResponse.json({
      ...data,
      isSandbox: integration.is_sandbox
    });
  } catch (error) {
    console.error('Error fetching listing details:', error);
    
    if (error instanceof GunBrokerApiError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.status }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch listing details', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 