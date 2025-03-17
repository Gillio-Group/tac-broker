import { GunbrokerAuthResponse } from './types';
import { makeGunbrokerRequest } from './utils';

/**
 * Parameters for Gunbroker authentication
 */
export interface AuthParams {
  username: string;
  password: string;
}

/**
 * Result of successful authentication
 */
export interface AuthResult {
  accessToken: string;
  tokenType?: string;
  expiresIn?: number;
  expirationDate?: string;
  userId?: number;
}

/**
 * Class to handle Gunbroker authentication endpoints
 */
export class GunbrokerAuthEndpoints {
  private baseURL: string;
  private devKey: string;
  
  /**
   * Create a new GunbrokerAuthEndpoints instance
   * @param baseURL - The base URL for the Gunbroker API
   * @param devKey - The developer key for the Gunbroker API
   */
  constructor(baseURL: string, devKey: string) {
    this.baseURL = baseURL;
    this.devKey = devKey;
  }
  
  /**
   * Authenticate with Gunbroker to get an access token
   * @param params - The username and password for authentication
   * @returns Authentication result with the access token
   */
  async authenticate(params: AuthParams): Promise<AuthResult> {
    try {
      const formData = new URLSearchParams();
      formData.append('Username', params.username);
      formData.append('Password', params.password);
      
      const response = await makeGunbrokerRequest<GunbrokerAuthResponse>(
        this.baseURL,
        '/v1/Users/AccessToken',
        this.devKey,
        'POST',
        formData.toString(),
        {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      );
      
      // According to the API docs, only accessToken is returned
      // https://api.gunbroker.com/User/Help/AccessTokenPost
      return {
        accessToken: response.accessToken,
        // Set default values for other fields
        tokenType: response.tokenType || 'bearer',
        expiresIn: response.expiresIn || 86400, // Default to 24 hours
        expirationDate: response.expirationDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        userId: response.userId || 0
      };
    } catch (error) {
      console.error('Error authenticating with Gunbroker:', error);
      throw error;
    }
  }
} 