import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';
import { 
  GunbrokerAccountInfo, 
  GunbrokerAuthResponse, 
  GunbrokerListingResponse, 
  GunbrokerOrderResponse,
  GunbrokerSearchParams
} from './types';

// Environment variables
const GUNBROKER_SANDBOX_DEV_KEY = process.env.GUNBROKER_STAGING_DEV_KEY;
const GUNBROKER_PRODUCTION_DEV_KEY = process.env.GUNBROKER_PRODUCTION_DEV_KEY;
const GUNBROKER_API_URL = process.env.GUNBROKER_PRODUCTION_URL;
const GUNBROKER_SANDBOX_API_URL = process.env.GUNBROKER_STAGING_URL;

// Validate environment variables
if (!GUNBROKER_API_URL || !GUNBROKER_SANDBOX_API_URL) {
  throw new Error('Gunbroker API URLs not configured in environment variables');
}

/**
 * GunbrokerClient - A class for interacting with the Gunbroker API
 * 
 * This client handles:
 * - Retrieving and refreshing access tokens
 * - Making authenticated API requests
 * - Managing user integrations
 */
export class GunbrokerClient {
  private supabase;
  private userId: string;
  private integration: any;
  private baseUrl: string;
  private authToken?: string;

  /**
   * Create a new GunbrokerClient instance
   * @param userId - The ID of the user whose Gunbroker integration to use
   * @param integrationId - Optional specific integration ID to use
   * @param authToken - Optional Supabase auth token (from localStorage in client components)
   */
  constructor(userId: string, integrationId?: string, authToken?: string) {
    this.userId = userId;
    this.authToken = authToken;
    
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        auth: {
          persistSession: false,
        },
      }
    );
    
    // If a token was provided, set it on the client
    if (authToken) {
      this.supabase.auth.setSession({
        access_token: authToken,
        refresh_token: ''
      });
    }
    
    this.baseUrl = ''; // Will be set when integration is loaded
  }

  /**
   * Initialize the client by loading the user's Gunbroker integration
   * @param integrationId - Optional specific integration ID to use
   */
  async initialize(integrationId?: string): Promise<boolean> {
    try {
      let query = this.supabase
        .from('gunbroker_integrations')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_active', true);

      // If a specific integration ID is provided, use that one
      if (integrationId) {
        query = query.eq('id', integrationId);
      } else {
        // Otherwise, get the most recently used integration
        query = query.order('last_connected_at', { ascending: false });
      }

      const { data, error } = await query.limit(1).single();

      if (error || !data) {
        console.error('Error loading Gunbroker integration:', error);
        return false;
      }

      this.integration = data;
      this.baseUrl = this.integration.is_sandbox 
        ? GUNBROKER_SANDBOX_API_URL! 
        : GUNBROKER_API_URL!;

      return true;
    } catch (error) {
      console.error('Error initializing Gunbroker client:', error);
      return false;
    }
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    if (!this.integration) {
      throw new Error('Gunbroker client not initialized');
    }

    // Check if the current token is expired
    const tokenExpiry = new Date(this.integration.token_expires_at);
    const now = new Date();
    
    // If the token expires within the next 5 minutes, refresh it
    const tokenNeedsRefresh = tokenExpiry.getTime() - now.getTime() < 5 * 60 * 1000;

    if (tokenNeedsRefresh) {
      await this.refreshTokenIfNeeded();
    }

    return this.integration.access_token;
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    if (!this.integration.access_token) {
      throw new Error('No access token available');
    }

    // Always refresh the token to ensure it's fresh
    await this.refreshToken();
  }

  private async refreshToken(): Promise<void> {
    if (!this.integration.encrypted_password) {
      throw new Error('No password available for token refresh');
    }

    const { data: decryptedPassword, error: decryptionError } = await this.supabase.rpc(
      'decrypt_password',
      { encrypted_password: this.integration.encrypted_password }
    );

    if (decryptionError || !decryptedPassword) {
      throw new Error('Failed to decrypt password for token refresh');
    }

    const formData = new URLSearchParams();
    formData.append('Username', this.integration.username);
    formData.append('Password', decryptedPassword);

    const devKey = this.integration.is_sandbox ? GUNBROKER_SANDBOX_DEV_KEY : GUNBROKER_PRODUCTION_DEV_KEY;
    if (!devKey) {
      throw new Error('Dev key not available for token refresh');
    }

    const response = await fetch(`${this.baseUrl}/v1/Users/AccessToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded' as const,
        'X-DevKey': devKey,
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
    }

    const { accessToken } = await response.json();

    // Update the integration with the new token
    const { error: updateError } = await this.supabase
      .from('gunbroker_integrations')
      .update({
        access_token: accessToken,
        last_connected_at: new Date().toISOString(),
      })
      .eq('id', this.integration.id);

    if (updateError) {
      throw new Error('Failed to update access token');
    }

    this.integration.access_token = accessToken;
    this.integration.last_connected_at = new Date().toISOString();
  }

  /**
   * Make an authenticated request to the Gunbroker API
   * @param endpoint - The API endpoint to call (without the base URL)
   * @param method - The HTTP method to use
   * @param data - Optional data to include in the request body
   */
  async request<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<T> {
    const devKey = this.integration.is_sandbox ? GUNBROKER_SANDBOX_DEV_KEY : GUNBROKER_PRODUCTION_DEV_KEY;
    if (!devKey) {
      throw new Error(`${this.integration.is_sandbox ? 'GUNBROKER_STAGING_DEV_KEY' : 'GUNBROKER_PRODUCTION_DEV_KEY'} environment variable is not set`);
    }

    const accessToken = await this.getAccessToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-DevKey': devKey,
      'X-AccessToken': accessToken,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, options);

    if (!response.ok) {
      // Handle rate limiting
      if (response.status === 429) {
        throw new Error('Gunbroker API rate limit exceeded. Please try again later.');
      }
      
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        // Try to refresh the token once
        await this.refreshTokenIfNeeded();
        return this.request(endpoint, method, data);
      }
      
      // Handle other errors
      let errorMessage = `Gunbroker API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If we can't parse the error response, use the default message
      }
      
      throw new Error(errorMessage);
    }

    return await response.json() as T;
  }

  /**
   * Get the user's account information from Gunbroker
   */
  async getAccountInfo(): Promise<GunbrokerAccountInfo> {
    return this.request<GunbrokerAccountInfo>('/Users/AccountInfo');
  }

  /**
   * Get the user's active listings from Gunbroker
   * @param page - The page number to retrieve
   * @param pageSize - The number of items per page
   */
  async getListings(page = 1, pageSize = 25): Promise<GunbrokerListingResponse> {
    return this.request<GunbrokerListingResponse>(`/ItemsSelling?pageSize=${pageSize}&pageIndex=${page}`);
  }

  /**
   * Get the user's sold orders from Gunbroker
   * @param page - The page number to retrieve
   * @param pageSize - The number of items per page
   */
  async getSoldOrders(page = 1, pageSize = 25): Promise<GunbrokerOrderResponse> {
    return this.request<GunbrokerOrderResponse>(`/OrdersSold?pageSize=${pageSize}&pageIndex=${page - 1}`);
  }

  /**
   * Search for items on Gunbroker
   * @param params - Search parameters
   */
  async searchItems(params: GunbrokerSearchParams): Promise<GunbrokerListingResponse> {
    // Build query string from params
    const queryParams = new URLSearchParams();
    
    // Add all non-undefined parameters to the query string
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    // Make the request
    return this.request<GunbrokerListingResponse>(`/Items?${queryParams.toString()}`);
  }
} 