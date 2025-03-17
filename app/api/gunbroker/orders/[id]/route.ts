import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GunBrokerApiError, handleAPIError } from '@/lib/exceptions';
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
    const { id } = params;

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
      throw new GunBrokerApiError('Unauthorized', 401);
    }

    // Get user's active Gunbroker integration
    const { data: integration, error: integrationError } = await supabase
      .from('gunbroker_integrations')
      .select('access_token, dev_key, is_sandbox')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      throw new GunBrokerApiError('No active Gunbroker integration found', 404);
    }

    // Use sandbox URL if integration is in sandbox mode, otherwise use production
    const baseUrl = integration.is_sandbox 
      ? process.env.GUNBROKER_STAGING_URL 
      : process.env.GUNBROKER_PRODUCTION_URL;

    // Use the corresponding dev key based on sandbox mode
    const devKey = integration.is_sandbox
      ? process.env.GUNBROKER_STAGING_DEV_KEY
      : process.env.GUNBROKER_PRODUCTION_DEV_KEY;
    
    // Fetch order from Gunbroker API
    const apiUrl = new URL(`/v1/Orders/${id}`, baseUrl);
    const response = await fetch(apiUrl.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'X-DevKey': devKey || '',
        'X-AccessToken': integration.access_token,
      },
    });

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

    const data = await response.json();
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