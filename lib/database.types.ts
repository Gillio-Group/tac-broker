export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      gunbroker_integrations: {
        Row: {
          id: string;
          user_id: string;
          username: string;
          encrypted_password: string;
          access_token: string;
          is_sandbox: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          last_connected_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          username: string;
          encrypted_password: string;
          access_token: string;
          is_sandbox?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_connected_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          username?: string;
          encrypted_password?: string;
          access_token?: string;
          is_sandbox?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_connected_at?: string | null;
        };
      };
      listings: {
        Row: {
          id: string;
          user_id: string;
          gunbroker_id: number;
          title: string;
          description: string | null;
          price: number | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          gunbroker_id: number;
          title: string;
          description?: string | null;
          price?: number | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          gunbroker_id?: number;
          title?: string;
          description?: string | null;
          price?: number | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          listing_id: string;
          gunbroker_order_id: number;
          buyer_username: string | null;
          amount: number | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          listing_id: string;
          gunbroker_order_id: number;
          buyer_username?: string | null;
          amount?: number | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          listing_id?: string;
          gunbroker_order_id?: number;
          buyer_username?: string | null;
          amount?: number | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          company_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          company_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          company_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      decrypt_password: {
        Args: {
          encrypted_password: string;
        };
        Returns: string;
      };
      encrypt_password: {
        Args: {
          password: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
} 