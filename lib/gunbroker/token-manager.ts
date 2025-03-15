import { createServerClient } from '../supabase/server';

/**
 * Interface for a Gunbroker token in the database
 */
export interface GunbrokerToken {
  access_token: string;
  username: string;
  expires_at: Date;
  is_sandbox: boolean;
}

/**
 * Class for managing Gunbroker access tokens in the database
 */
export class TokenManager {
  private userId: string;
  private supabase: any;
  private authToken?: string;

  /**
   * Create a new TokenManager instance
   * @param userId - The ID of the user whose tokens to manage
   * @param authToken - Optional auth token for the user (from localStorage in client components)
   */
  constructor(userId: string, authToken?: string) {
    this.userId = userId;
    this.authToken = authToken;
    // Pass the auth token to createServerClient if provided
    this.supabase = createServerClient(authToken);
  }

  /**
   * Store a new Gunbroker token in the database
   * @param token - The token information to store
   */
  async storeToken(token: GunbrokerToken): Promise<void> {
    // Check if a token already exists for this user and environment
    const { data: existingToken } = await this.supabase
      .from('gunbroker_integrations')
      .select('id')
      .eq('user_id', this.userId)
      .eq('username', token.username)
      .eq('is_sandbox', token.is_sandbox)
      .eq('is_active', true)
      .maybeSingle();

    if (existingToken) {
      // Update existing token
      const { error } = await this.supabase
        .from('gunbroker_integrations')
        .update({
          access_token: token.access_token,
          token_expires_at: token.expires_at.toISOString(),
          last_connected_at: new Date().toISOString(),
        })
        .eq('id', existingToken.id);

      if (error) {
        console.error('Error updating token:', error);
        throw new Error('Failed to update token');
      }
    } else {
      // Create a new token record
      const { error } = await this.supabase
        .from('gunbroker_integrations')
        .insert({
          user_id: this.userId,
          username: token.username,
          access_token: token.access_token,
          token_expires_at: token.expires_at.toISOString(),
          is_sandbox: token.is_sandbox,
          is_active: true,
          last_connected_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error storing token:', error);
        throw new Error('Failed to store token');
      }
    }
  }

  /**
   * Get the latest active token for the user
   * @param sandbox - Whether to get a token for sandbox or production
   */
  async getLatestToken(sandbox: boolean = false): Promise<GunbrokerToken | null> {
    const { data, error } = await this.supabase
      .from('gunbroker_integrations')
      .select('*')
      .eq('user_id', this.userId)
      .eq('is_sandbox', sandbox)
      .eq('is_active', true)
      .order('last_connected_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      access_token: data.access_token,
      username: data.username,
      expires_at: new Date(data.token_expires_at),
      is_sandbox: data.is_sandbox,
    };
  }

  /**
   * Delete a token (for logout)
   * @param username - The username whose token to delete
   * @param sandbox - Whether it's a sandbox or production token
   */
  async deleteToken(username: string, sandbox: boolean = false): Promise<void> {
    const { error } = await this.supabase
      .from('gunbroker_integrations')
      .update({ is_active: false })
      .eq('user_id', this.userId)
      .eq('username', username)
      .eq('is_sandbox', sandbox);

    if (error) {
      console.error('Error deleting token:', error);
      throw new Error('Failed to delete token');
    }
  }
} 