const GUNBROKER_SANDBOX_DEV_KEY = process.env.GUNBROKER_STAGING_DEV_KEY;
const GUNBROKER_PRODUCTION_DEV_KEY = process.env.GUNBROKER_PRODUCTION_DEV_KEY;
const GUNBROKER_API_URL = process.env.GUNBROKER_PRODUCTION_URL;
const GUNBROKER_SANDBOX_API_URL = process.env.GUNBROKER_STAGING_URL;

export async function refreshGunbrokerToken(integration: any, supabase: any) {
  try {
    // Create form data for the request
    const formData = new URLSearchParams();
    formData.append('Username', integration.username);
    
    // Get the decrypted password
    const { data: decryptedPassword, error: decryptionError } = await supabase.rpc(
      'decrypt_password',
      { encrypted_password: integration.encrypted_password }
    );

    if (decryptionError || !decryptedPassword) {
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