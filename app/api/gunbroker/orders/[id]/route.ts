import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GunBrokerApiError, handleAPIError } from '@/lib/exceptions';
import { refreshGunbrokerToken } from '@/lib/gunbroker/token';
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
    // The correct way to handle dynamic route params in Next.js 13+
    const { id } = params;
    console.log(`Fetching order details for ID: ${id}`);

    // Create a Supabase client using cookies - similar to the search implementation
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

    // Get the user's session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('Authentication error:', userError);
      throw new GunBrokerApiError('Unauthorized', 401);
    }

    console.log(`User authenticated: ${user.id}`);

    // Get user's active Gunbroker integration
    const { data: integration, error: integrationError } = await supabase
      .from('gunbroker_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (integrationError) {
      console.log('Integration error:', integrationError);
    }

    if (!integration) {
      console.log('No active integration found for user:', user.id);
      throw new GunBrokerApiError('No active Gunbroker integration found', 404);
    }

    console.log(`Integration found: ${integration.id}, Sandbox: ${integration.is_sandbox}`);

    // Use sandbox URL if integration is in sandbox mode, otherwise use production
    const baseUrl = integration.is_sandbox 
      ? process.env.GUNBROKER_STAGING_URL 
      : process.env.GUNBROKER_PRODUCTION_URL;

    // Use the corresponding dev key based on sandbox mode
    const devKey = integration.is_sandbox
      ? process.env.GUNBROKER_STAGING_DEV_KEY
      : process.env.GUNBROKER_PRODUCTION_DEV_KEY;
    
    if (!devKey) {
      throw new GunBrokerApiError('Dev key not configured', 500);
    }

    // Define a reusable function to make the API request
    async function makeRequest(token: string) {
      console.log(`Making request to ${baseUrl}/v1/Orders/${id}`);
      const apiUrl = new URL(`/v1/Orders/${id}`, baseUrl);
      
      // Properly type the headers as HeadersInit
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
          'Error fetching order from GunBroker',
          response.status,
          errorText
        );
      }
      
      return response;
    }

    // Make initial request with current token
    let response;
    try {
      response = await makeRequest(integration.access_token);
    } catch (error) {
      // If we get a 401, try refreshing the token and retry
      if (error instanceof GunBrokerApiError && error.status === 401) {
        console.log('Token expired, refreshing...');
        const newToken = await refreshGunbrokerToken(integration, supabase);
        response = await makeRequest(newToken);
      } else {
        throw error; // Re-throw if not a token issue
      }
    }

    const data = await response.json();
    
    // Check if data contains orderItemsCollection and add thumbnail URL to items if needed
    if (data.orderItemsCollection) {
      console.log(`Order items count: ${data.orderItemsCollection.length}`);
      
      // Log thumbnails for debugging
      data.orderItemsCollection.forEach((item: any, index: number) => {
        console.log(`Item ${index} thumbnail:`, item.thumbnail || 'none');
      });
    }
    
    return NextResponse.json({
      ...data,
      isSandbox: integration.is_sandbox
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    const { error: message, status, details } = handleAPIError(error);
    return NextResponse.json({ error: message, details }, { status });
  }
} 