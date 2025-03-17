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
    // Get parameters from the URL
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Parse parameters with defaults
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const timeFrame = searchParams.get('timeFrame') || '0'; // Default to "ViewCurrent"
    const sort = searchParams.get('sort') || '0'; // Default to "Item ID Ascending"
    const keywords = searchParams.get('keywords') || '';
    const buyNowOnly = searchParams.get('buyNowOnly') === 'true';
    const fixedPriceOnly = searchParams.get('fixedPriceOnly') === 'true';
    const canOffer = searchParams.get('canOffer') === 'true';
    
    console.log('Received listings request with params:', {
      page,
      pageSize,
      timeFrame,
      sort,
      keywords
    });
    
    // Build GunBroker API query parameters
    const gbParams = new URLSearchParams();
    gbParams.append('PageIndex', page.toString());
    gbParams.append('PageSize', pageSize.toString());
    gbParams.append('TimeFrame', timeFrame);
    gbParams.append('Sort', sort);
    
    if (keywords) {
      gbParams.append('Keywords', keywords);
    }
    
    if (buyNowOnly) {
      gbParams.append('BuyNowOnly', 'true');
    }
    
    if (fixedPriceOnly) {
      gbParams.append('FixedPriceOnly', 'true');
    }
    
    if (canOffer !== null) {
      gbParams.append('CanOffer', canOffer.toString());
    }

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

    // Create the API URL for listings
    const apiUrl = new URL('/v1/ItemsSelling', baseUrl);
    
    // Add query parameters
    gbParams.forEach((value, key) => {
      apiUrl.searchParams.set(key, value);
    });
    
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
          'Error fetching listings from GunBroker',
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
    
    // Log the structure for debugging
    console.log('GunBroker API listings response structure:', {
      hasResults: !!data.results,
      resultCount: data.results?.length || 0,
      hasCount: 'count' in data,
      count: data.count,
      pageIndex: data.pageIndex,
      pageSize: data.pageSize
    });
    
    // Transform the response to match the frontend's expected structure
    const transformedResults = data.results?.map((listing: any) => {
      return {
        itemID: listing.itemID,
        title: listing.title,
        currentBid: listing.currentBid,
        buyNowPrice: listing.buyNowPrice,
        fixedPrice: listing.fixedPrice,
        isFixedPrice: listing.isFixedPrice,
        bidCount: listing.bidCount,
        thumbnailURL: listing.thumbnailURL,
        endingDateTimeUTC: listing.endingDateTimeUTC,
        isFFLRequired: listing.isFFLRequired,
        hasReserve: listing.hasReserve,
        hasReserveBeenMet: listing.hasReserveBeenMet,
        canOffer: listing.canOffer,
        autoAcceptPrice: listing.autoAcceptPrice,
        autoRejectPrice: listing.autoRejectPrice,
        watchersCount: listing.watchersCount,
        highestBidderUserName: listing.highestBidderUserName,
        highestBidderID: listing.highestBidderID,
        serialNumber: listing.serialNumber,
        sku: listing.SKU,
        quantity: listing.quantity
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
    console.error('Error fetching listings:', error);
    
    if (error instanceof GunBrokerApiError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.status }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch listings', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 