import { createClient } from '../supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

/**
 * Interface for a Gunbroker token in the database
 */
export interface GunbrokerToken {
  access_token: string;
  username: string;
  expires_at: Date;
  is_sandbox: boolean;
}

export interface TokenData {
  access_token: string;
  last_connected_at: string;
}

/**
 * Class for managing Gunbroker access tokens in the database
 */
export class TokenManager {
  private userId: string;
  private supabase: Promise<SupabaseClient<Database>>;

  /**
   * Create a new TokenManager instance
   * @param userId - The ID of the user whose tokens to manage
   */
  constructor(userId: string) {
    this.userId = userId;
    // Use the new createClient function which handles cookies
    this.supabase = createClient();
  }

  /**
   * Store a new Gunbroker token in the database
   * @param userId - The ID of the user
   * @param username - The username of the token
   * @param token - The token information to store
   * @param is_sandbox - Whether it's a sandbox or production token
   */
  async storeToken(userId: string, username: string, token: TokenData, is_sandbox: boolean): Promise<void> {
    const supabaseClient = await this.supabase;
    const { error } = await supabaseClient
      .from('gunbroker_integrations')
      .upsert({
        user_id: userId,
        username,
        access_token: token.access_token,
        is_sandbox,
        is_active: true,
        last_connected_at: token.last_connected_at,
      })
      .eq('user_id', userId)
      .eq('username', username)
      .eq('is_sandbox', is_sandbox);

    if (error) {
      throw new Error(`Failed to store token: ${error.message}`);
    }
  }

  /**
   * Get the latest active token for the user
   * @param sandbox - Whether to get a token for sandbox or production
   */
  async getLatestToken(sandbox: boolean = false): Promise<GunbrokerToken | null> {
    const supabaseClient = await this.supabase;
    const { data, error } = await supabaseClient
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
    const supabaseClient = await this.supabase;
    const { error } = await supabaseClient
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

  async getToken(userId: string, username: string, is_sandbox: boolean): Promise<TokenData | null> {
    const supabaseClient = await this.supabase;
    const { data, error } = await supabaseClient
      .from('gunbroker_integrations')
      .select('access_token, last_connected_at')
      .eq('user_id', userId)
      .eq('username', username)
      .eq('is_sandbox', is_sandbox)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      access_token: data.access_token || '',
      last_connected_at: data.last_connected_at || new Date().toISOString(),
    };
  }
}