import { makeGunbrokerRequest } from './utils';
import { GunbrokerAuthEndpoints } from './auth';

/**
 * Configuration options for the Gunbroker API client
 */
export interface GunbrokerAPIConfig {
  devKey: string;
  sandbox?: boolean;
  baseURL?: string;
}

/**
 * Main Gunbroker API client class
 * 
 * This class provides access to all Gunbroker API endpoints
 * through specialized endpoint handlers.
 */
export class GunbrokerAPI {
  private baseURL: string;
  private devKey: string;
  private accessToken?: string;
  public auth: GunbrokerAuthEndpoints;
  
  /**
   * Create a new GunbrokerAPI instance
   * @param config - Configuration options for the API client
   */
  constructor(config: GunbrokerAPIConfig) {
    // Determine the base URL based on sandbox mode
    this.baseURL = config.baseURL ||
      (config.sandbox 
        ? process.env.GUNBROKER_STAGING_URL || 'https://api.sandbox.gunbroker.com/v1'
        : process.env.GUNBROKER_PRODUCTION_URL || 'https://api.gunbroker.com/v1');
    
    this.devKey = config.devKey;
    
    // Create endpoint handlers
    this.auth = new GunbrokerAuthEndpoints(this.baseURL, this.devKey);
  }
  
  /**
   * Make an HTTP request to the Gunbroker API
   * @param endpoint - The API endpoint to call (without the base URL)
   * @param method - The HTTP method to use
   * @param data - Optional data to include in the request body
   * @param headers - Additional headers to include in the request
   */
  async request<T>(
    endpoint: string,
    method: string = 'GET',
    data?: any,
    headers: Record<string, string> = {}
  ): Promise<T> {
    return makeGunbrokerRequest<T>(
      this.baseURL,
      endpoint,
      this.devKey,
      method,
      data,
      headers,
      this.accessToken
    );
  }
  
  /**
   * Set the access token for authenticated requests
   * @param accessToken - The access token to use for authentication
   */
  setAccessToken(accessToken: string): void {
    this.accessToken = accessToken;
  }
  
  /**
   * Clear the access token (for logout)
   */
  clearAccessToken(): void {
    this.accessToken = undefined;
  }
} 