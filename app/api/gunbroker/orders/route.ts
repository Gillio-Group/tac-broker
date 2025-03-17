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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const timeFrame = searchParams.get('timeFrame') || '8'; // Default to "All Time"
    const sort = searchParams.get('sort') || '0';
    const sortOrder = searchParams.get('sortOrder') || '1';
    const fetchAll = searchParams.get('fetchAll') === 'true';

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

    // Construct API URL using environment variable and v1 path
    const apiUrl = new URL('/v1/OrdersSold', baseUrl);
    apiUrl.searchParams.set('TimeFrame', timeFrame);
    apiUrl.searchParams.set('Sort', sort);
    apiUrl.searchParams.set('SortOrder', sortOrder);
    
    if (!fetchAll) {
      apiUrl.searchParams.set('PageSize', pageSize.toString());
      apiUrl.searchParams.set('PageIndex', page.toString());
    }

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
        'X-DevKey': devKey as string,
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
          'Error fetching orders from GunBroker',
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
    console.log('GunBroker API response structure:', {
      hasResults: !!data.results,
      resultCount: data.results?.length || 0,
      hasCount: 'count' in data,
      count: data.count,
      pageIndex: data.pageIndex,
      pageSize: data.pageSize
    });
    
    // Transform the response to match the frontend's expected structure
    // Make sure dates are in the right format and all required fields are present
    const transformedResults = data.results?.map(order => {
      // Log thumbnail URLs for debugging
      console.log(`Order ${order.orderID} item thumbnails:`, 
        order.orderItemsCollection?.map(item => item.thumbnail || 'no-thumbnail')
      );
      
      return {
        orderID: order.orderID,
        orderDate: order.orderDateUTC || order.orderDate,
        totalPrice: order.totalPrice,
        orderCancelled: !!order.orderCancelled,
        orderReturned: !!order.orderReturned,
        orderComplete: !!order.orderComplete,
        itemShipped: !!order.itemShipped,
        fflReceived: !!order.fflReceived,
        paymentReceived: !!order.paymentReceived,
        buyerConfirmed: !!order.buyerConfirmed,
        orderItemsCollection: order.orderItemsCollection?.map(item => ({
          itemID: item.itemID,
          title: item.title,
          quantity: item.quantity,
          isFFLRequired: !!item.isFFLRequired,
          thumbnail: item.thumbnail || null,
          itemPrice: item.itemPrice,
          itemCondition: item.itemCondition
        })) || [],
        buyer: {
          username: order.buyer?.username || 'Unknown',
          userID: order.buyer?.userID
        },
        billToName: order.billToName || '',
        shipDateUTC: order.shipDateUTC,
        paymentMethod: order.paymentMethod || {},
        fflNumber: order.fflNumber
      };
    }) || [];
    
    // Make sure the response matches the expected structure for the UI
    return NextResponse.json({
      results: transformedResults,
      count: data.count || 0,
      pageIndex: data.pageIndex || page,
      pageSize: data.pageSize || pageSize,
      isSandbox: integration.is_sandbox
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    
    if (error instanceof GunBrokerApiError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.status }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 