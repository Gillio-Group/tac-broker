import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get the user session from Supabase
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies }
    );
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get the user's GunBroker integration
    const { data: integrations, error: integrationError } = await supabase
      .from('gunbroker_integrations')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();
    
    if (integrationError || !integrations) {
      console.error('No active GunBroker integration found:', integrationError);
      return NextResponse.json(
        { error: 'No active GunBroker integration found. Please connect your GunBroker account first.' },
        { status: 400 }
      );
    }
    
    // Get a fresh access token
    const accessToken = await getAccessToken(integrations.dev_key, integrations.username, integrations.password);
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to authenticate with GunBroker API' },
        { status: 401 }
      );
    }
    
    // Clone the request to handle FormData
    const formData = await request.formData();
    
    // Get the JSON data part
    const dataString = formData.get('data');
    
    if (!dataString || typeof dataString !== 'string') {
      return NextResponse.json(
        { error: 'Missing data in request' },
        { status: 400 }
      );
    }
    
    const listingData = JSON.parse(dataString);
    
    // Create new FormData for the GunBroker API request
    const gunbrokerFormData = new FormData();
    
    // Add the data part
    gunbrokerFormData.append('data', dataString);
    
    // Add thumbnail if it exists
    const thumbnail = formData.get('thumbnail');
    if (thumbnail && thumbnail instanceof Blob) {
      // Get the filename from the form data if available
      const thumbnailFilename = thumbnail.name || 'thumbnail.jpg';
      gunbrokerFormData.append('thumbnail', thumbnail, thumbnailFilename);
    }
    
    // Add pictures if they exist
    for (const [key, value] of formData.entries()) {
      if (key === 'picture' && value instanceof Blob) {
        // Get the filename from the form data if available
        const pictureFilename = value.name || 'picture.jpg';
        gunbrokerFormData.append('picture', value, pictureFilename);
      }
    }
    
    // Make the request to GunBroker API
    const gunbrokerResponse = await fetch('https://api.gunbroker.com/v1/Items', {
      method: 'POST',
      headers: {
        'X-DevKey': integrations.dev_key,
        'X-AccessToken': accessToken,
        // Don't set Content-Type as it will be set automatically with the boundary
      },
      body: gunbrokerFormData,
    });
    
    // Log the response status
    console.log('GunBroker API response status:', gunbrokerResponse.status);
    
    // Handle response
    if (!gunbrokerResponse.ok) {
      const errorData = await gunbrokerResponse.text();
      console.error('GunBroker API error:', errorData);
      
      return NextResponse.json(
        { error: `Error from GunBroker API: ${errorData}` },
        { status: gunbrokerResponse.status }
      );
    }
    
    // Parse the response
    const responseData = await gunbrokerResponse.json();
    
    // Log successful listing
    console.log('Successfully created listing:', responseData);
    
    // Store the listing in the database for reference
    await supabase
      .from('gunbroker_listings')
      .insert({
        user_id: session.user.id,
        gunbroker_item_id: responseData.itemID,
        title: listingData.title,
        description: listingData.description,
        category_id: listingData.categoryID,
        created_at: new Date().toISOString(),
        is_fixed_price: listingData.isFixedPrice,
        price: listingData.isFixedPrice ? listingData.fixedPrice : listingData.startingBid,
        status: 'active',
      });
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Error creating listing:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Get a fresh access token from GunBroker API
 */
async function getAccessToken(devKey: string, username: string, password: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.gunbroker.com/v1/Users/AccessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DevKey': devKey,
      },
      body: JSON.stringify({
        Username: username,
        Password: password,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error getting access token:', errorText);
      return null;
    }
    
    const data = await response.json();
    return data.accessToken;
  } catch (error) {
    console.error('Failed to fetch access token:', error);
    return null;
  }
} 