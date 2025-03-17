import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { refreshGunbrokerToken } from '@/lib/gunbroker/token';

const GUNBROKER_API_URL = process.env.GUNBROKER_PRODUCTION_URL || 'https://api.gunbroker.com';
const GUNBROKER_SANDBOX_API_URL = process.env.GUNBROKER_STAGING_URL || 'https://api.sandbox.gunbroker.com';
const GUNBROKER_PRODUCTION_DEV_KEY = process.env.GUNBROKER_PRODUCTION_DEV_KEY;
const GUNBROKER_SANDBOX_DEV_KEY = process.env.GUNBROKER_STAGING_DEV_KEY;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure params.id is awaited
    const { id } = await Promise.resolve(params);

    // Create Supabase client
    const supabase = await createClient();

    // Check if user is authenticated using getUser instead of getSession
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's active Gunbroker integration
    const { data: integration, error: integrationError } = await supabase
      .from('gunbroker_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      console.error('Integration error:', integrationError);
      return NextResponse.json(
        { error: 'No active Gunbroker integration found' },
        { status: 404 }
      );
    }

    // Determine which API URL and dev key to use
    const apiUrl = integration.is_sandbox ? GUNBROKER_SANDBOX_API_URL : GUNBROKER_API_URL;
    const devKey = integration.is_sandbox ? GUNBROKER_SANDBOX_DEV_KEY : GUNBROKER_PRODUCTION_DEV_KEY;

    // Log request details for debugging
    console.log('Fetching item details:', {
      itemId: id,
      isSandbox: integration.is_sandbox,
      apiUrl: apiUrl
    });

    async function makeRequest(token: string) {
      return fetch(`${apiUrl}/v1/Items/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-DevKey': devKey || '',
          'X-AccessToken': token,
        },
      });
    }

    // Make initial request with current token
    let response = await makeRequest(integration.access_token);

    // If token is expired, refresh and retry
    if (response.status === 401) {
      console.log('Token expired, refreshing...');
      const newToken = await refreshGunbrokerToken(integration, supabase);
      response = await makeRequest(newToken);
    }

    // Handle response
    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    if (!response.ok) {
      console.error('Gunbroker API error:', response.statusText);
      return NextResponse.json(
        { error: `Error fetching item details: ${response.statusText}` },
        { status: response.status }
      );
    }

    const itemData = await response.json();
    console.log('Successfully fetched item details:', {
      itemId: id,
      status: response.status
    });

    return NextResponse.json(itemData);

  } catch (error) {
    console.error('Error in item details route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 